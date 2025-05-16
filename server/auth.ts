import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { TornAPI } from "./services/tornAPI";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email?: string | null;
      apiKey?: string | null;
      role?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "byte-core-vault-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
    store: storage.sessionStore,
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          return done(null, false, { message: "Incorrect password" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, apiKey } = req.body;
      
      // Validate input
      if (!username || !apiKey) {
        return res.status(400).json({ message: "Username and API key are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Verify the API key with Torn API
      const tornAPI = new TornAPI();
      try {
        const apiKeyData = await tornAPI.checkApiKey(apiKey);
        
        if (apiKeyData.status === "invalid") {
          return res.status(401).json({ message: "Invalid Torn API key" });
        }
      } catch (error) {
        return res.status(401).json({ message: "Invalid Torn API key or API service unavailable" });
      }
      
      // Create user with random password (as we're using API key auth)
      const randomPassword = await hashPassword(randomBytes(16).toString('hex'));
      
      const user = await storage.createUser({
        username,
        password: randomPassword,
        apiKey,
      });
      
      // Log user in
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login after registration" });
        }
        return res.status(201).json({
          id: user.id,
          username: user.username,
          apiKey: true,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // API key login
  app.post("/api/login", async (req, res) => {
    try {
      const { apiKey, rememberMe = false } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // FIRST: Make a direct request to the Torn API to verify the API key and get user data
      // This ensures we're operating with fresh data directly from the source
      const response = await fetch(`https://api.torn.com/user/?selections=basic&key=${apiKey}`);
      const userData = await response.json() as any;
      
      // API returned an error
      if (userData.error) {
        return res.status(401).json({ 
          message: "Invalid API key", 
          details: userData.error.error || "The API key could not be validated" 
        });
      }
      
      // Get the player name directly from the API response
      const playerName = userData.name;
      const playerId = userData.player_id;
      
      if (!playerName || !playerId) {
        return res.status(401).json({ message: "Could not retrieve player details from Torn API" });
      }
      
      console.log(`Verified Torn API key belongs to: ${playerName} (ID: ${playerId})`);
      
      // Clear any existing session completely
      await new Promise<void>((resolve) => {
        if (req.session) {
          req.session.destroy((err) => {
            if (err) console.error("Error destroying session:", err);
            resolve();
          });
        } else {
          resolve();
        }
      });
      
      // Create a completely new session
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) {
            console.error("Error regenerating session:", err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      // Look for existing user with this API key or create a new one
      let user = await storage.getUserByApiKey(apiKey);
      
      if (user) {
        // Update the username to match latest from API
        if (user.username !== playerName) {
          console.log(`Updating username from ${user.username} to ${playerName} for user ID ${user.id}`);
          await storage.updateUsername(user.id, playerName);
          user.username = playerName;
        }
      } else {
        // Create a new user with this API key
        console.log(`Creating new user for ${playerName} with API key ${apiKey.substring(0, 8)}...`);
        user = await storage.createUser({
          username: playerName,
          password: randomBytes(16).toString('hex'), // Generate random password 
          apiKey: apiKey
        });
      }
      
      // Set session cookie expiration based on Remember Me option
      if (rememberMe) {
        // Extended session (30 days)
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      } else {
        // Default session (expires when browser closes)
        req.session.cookie.maxAge = null;
      }
      
      // Complete the login process
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login" });
        }
        
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          apiKey: true, // Don't send the actual API key
          role: user.role || "user"
        });
      });
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          apiKey: true,
          role: user.role || "user",
          rememberMe: rememberMe
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to authenticate with API key" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = req.user as Express.User;
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      apiKey: user.apiKey ? true : false,
      role: user.role || "user"
    });
  });
  
  // Admin endpoint - check if current user is an admin
  app.get("/api/user/is-admin", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as Express.User;
    const isAdmin = user.role === "admin";
    
    res.json({ isAdmin });
  });
}