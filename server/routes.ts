import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { TornAPI } from "./services/tornAPI";
import { Crawler } from "./services/crawler";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is an admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
    return next();
  }
  return res.status(403).json({ message: "Forbidden - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Initialize crawler with its own dedicated API instance
  const crawlerAPI = new TornAPI();
  const crawler = new Crawler(crawlerAPI, storage);
  
  // Initialize the crawler with demo mode - we'll activate real mode for administrators
  await crawler.initialize();

  // Before initializing the crawler, let's make sure we setup the initialization later
  // This will only be accessible to admin users
  
  // API Routes
  
  // Player Stats - Requires authentication and API key
  app.get("/api/player/stats", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      // Create a fresh instance of TornAPI for each request to avoid sharing data
      const userAPI = new TornAPI();
      const playerStats = await userAPI.getPlayerStats(user.apiKey);
      
      // If the username from API doesn't match our stored username, update it
      if (playerStats.name !== user.username) {
        console.log(`Username mismatch detected: API shows ${playerStats.name}, user logged in as ${user.username}`);
        
        try {
          // Update the username in storage
          await storage.updateUsername(user.id, playerStats.name);
          
          // Update the session user object with the new username
          user.username = playerStats.name;
          
          // Force update session
          req.login(user, (err) => {
            if (err) {
              console.error("Error updating session after username change:", err);
            }
          });
        } catch (err) {
          console.error("Failed to update username:", err);
        }
      }
      
      res.json(playerStats);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch player stats",
      });
    }
  });

  // Company Tracking - Requires authentication and API key
  app.get("/api/company", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      // Create a fresh instance of TornAPI for each request to avoid sharing data
      const userAPI = new TornAPI();
      const companyData = await userAPI.getCompanyData(user.apiKey);
      res.json(companyData);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch company data",
      });
    }
  });

  app.get("/api/company/detail", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      // Create a fresh instance of TornAPI for each request to avoid data leakage
      const userAPI = new TornAPI();
      const companyDetails = await userAPI.getCompanyDetailedData(user.apiKey);
      res.json(companyDetails);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch company details",
      });
    }
  });

  // Faction Tracking - Requires authentication and API key
  app.get("/api/faction", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      // Create a fresh instance of TornAPI for each request
      const userAPI = new TornAPI();
      const factionData = await userAPI.getFactionData(user.apiKey);
      res.json(factionData);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch faction data",
      });
    }
  });

  app.get("/api/faction/detail", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      // Create a fresh instance of TornAPI for each request
      const userAPI = new TornAPI();
      const factionDetails = await userAPI.getFactionDetailedData(user.apiKey);
      res.json(factionDetails);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch faction details",
      });
    }
  });

  // Bazaar - Requires authentication and API key
  app.get("/api/bazaar", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      const category = req.query.category as string || 'all';
      // Create a fresh instance of TornAPI for each request to prevent data leakage
      const userAPI = new TornAPI();
      const bazaarItems = await userAPI.getBazaarItems(user.apiKey, category);
      res.json(bazaarItems);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch bazaar data",
      });
    }
  });

  // Employees Search - Requires authentication and API key
  app.get("/api/employees/search", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const companyType = req.query.companyType as string || 'all';
      const minLevel = parseInt(req.query.minLevel as string) || 1;
      const maxLevel = parseInt(req.query.maxLevel as string) || 100;
      const minIntelligence = parseInt(req.query.minIntelligence as string) || 0;
      const minEndurance = parseInt(req.query.minEndurance as string) || 0;
      const minManualLabor = parseInt(req.query.minManualLabor as string) || 0;
      const sortBy = req.query.sortBy as string || 'level-desc';
      const searchQuery = req.query.searchQuery as string || '';
      
      const searchResults = await storage.searchEmployeeCandidates({
        page,
        companyType,
        minLevel,
        maxLevel,
        minIntelligence,
        minEndurance,
        minManualLabor,
        sortBy,
        searchQuery
      });
      
      const crawlStatus = await crawler.getStatus();
      
      res.json({
        ...searchResults,
        crawl_status: {
          total_indexed: crawlStatus.indexedPlayers,
          last_indexed: new Date(crawlStatus.lastUpdated).toLocaleString(),
          crawl_complete_percentage: Math.floor((crawlStatus.indexedPlayers / crawlStatus.totalPlayers) * 100)
        }
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search for employees",
      });
    }
  });

  // Faction Search - Requires authentication and API key
  app.get("/api/faction/search", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      const page = parseInt(req.query.page as string) || 1;
      const minLevel = parseInt(req.query.minLevel as string) || 1;
      const maxLevel = parseInt(req.query.maxLevel as string) || 100;
      const minStats = parseInt(req.query.minStats as string) || 0;
      const activeOnly = req.query.activeOnly === 'true';
      const excludeInFaction = req.query.excludeInFaction === 'true';
      const excludeTraveling = req.query.excludeTraveling === 'true';
      const sortBy = req.query.sortBy as string || 'level-desc';
      const searchQuery = req.query.searchQuery as string || '';
      
      const searchResults = await storage.searchFactionCandidates({
        page,
        minLevel,
        maxLevel,
        minStats,
        activeOnly,
        excludeInFaction,
        excludeTraveling,
        sortBy,
        searchQuery
      });
      
      const crawlStatus = await crawler.getStatus();
      
      res.json({
        ...searchResults,
        crawl_status: {
          total_indexed: crawlStatus.indexedPlayers,
          last_indexed: new Date(crawlStatus.lastUpdated).toLocaleString(),
          crawl_complete_percentage: Math.floor((crawlStatus.indexedPlayers / crawlStatus.totalPlayers) * 100)
        }
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search for faction members",
      });
    }
  });

  // Items Database - Requires authentication
  app.get("/api/items", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const category = req.query.category as string || 'all';
      const type = req.query.type as string || 'all';
      const sortBy = req.query.sortBy as string || 'id-asc';
      const searchQuery = req.query.searchQuery as string || '';
      
      const itemData = await storage.getItems({
        page,
        category,
        type,
        sortBy,
        searchQuery
      });
      
      res.json(itemData);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch items",
      });
    }
  });

  // System Status - Requires admin privileges
  app.get("/api/system/status", isAdmin, async (req, res) => {
    try {
      const user = req.user as any;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured. Please add your Torn API key in settings." });
      }
      
      const crawlStatus = await crawler.getStatus();
      const systemStats = await storage.getSystemStats();
      
      // Create a fresh instance of TornAPI for each request
      const userAPI = new TornAPI();
      const apiStatus = await userAPI.checkApiStatus(user.apiKey);
      
      res.json({
        crawler: {
          status: crawlStatus.status,
          indexed_players: crawlStatus.indexedPlayers,
          total_players: crawlStatus.totalPlayers,
          crawl_speed: crawlStatus.crawlSpeed,
          next_scan: new Date(crawlStatus.nextScheduledRun).toLocaleString()
        },
        database: {
          status: "healthy",
          player_count: systemStats.playerCount,
          item_count: systemStats.itemCount,
          data_size: systemStats.dataSize,
          queries_today: systemStats.queriesToday
        },
        api: {
          status: apiStatus.status,
          avg_response_time: apiStatus.averageResponseTimeMs,
          uptime_percentage: apiStatus.uptimePercentage,
          calls_per_hour: apiStatus.callsPerHour,
          rate_limit_available: apiStatus.rateLimitAvailable,
          last_error_time: apiStatus.lastErrorTime ? new Date(apiStatus.lastErrorTime).toLocaleString() : "N/A"
        },
        last_updated: new Date().toLocaleString()
      });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch system status",
      });
    }
  });

  // Crawler Management - Requires admin privileges
  app.get("/api/system/crawler", isAdmin, async (req, res) => {
    try {
      const detailedStatus = await crawler.getDetailedStatus();
      res.json(detailedStatus);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch crawler status",
      });
    }
  });

  app.post("/api/system/crawler/start", isAdmin, async (req, res) => {
    try {
      await crawler.start();
      res.json({ success: true, message: "Crawler started successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to start crawler",
      });
    }
  });

  app.post("/api/system/crawler/pause", isAdmin, async (req, res) => {
    try {
      await crawler.pause();
      res.json({ success: true, message: "Crawler paused successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to pause crawler",
      });
    }
  });

  app.post("/api/system/crawler/config", isAdmin, async (req, res) => {
    try {
      await crawler.updateConfig(req.body);
      res.json({ success: true, message: "Crawler configuration updated" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update crawler configuration",
      });
    }
  });

  // User Settings - Requires authentication
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const settings = await storage.getUserSettings(user.id);
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch user settings",
      });
    }
  });

  app.post("/api/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const updatedSettings = await storage.updateUserSettings(user.id, req.body);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update user settings",
      });
    }
  });

  // API Key Management - Requires authentication
  app.get("/api/settings/apikey", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      // Create a fresh instance of TornAPI for each request to ensure data isolation
      const userAPI = new TornAPI();
      const apiKeyData = await userAPI.checkApiKey(user.apiKey || "");
      res.json(apiKeyData);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to fetch API key data",
      });
    }
  });

  app.post("/api/settings/apikey", isAuthenticated, async (req, res) => {
    try {
      const { key } = req.body;
      const user = req.user as any;
      
      // Validate the API key with a fresh TornAPI instance
      const testAPI = new TornAPI();
      const keyData = await testAPI.checkApiKey(key);
      if (keyData.status === "invalid") {
        return res.status(400).json({
          message: "Invalid API key",
          details: keyData.error || "The API key could not be validated"
        });
      }

      const playerName = keyData.name;
      
      // Update user's username to match their Torn account name
      if (playerName && playerName !== user.username) {
        console.log(`User login mismatch - updating from ${user.username} to ${playerName}`);
        try {
          await storage.updateUsername(user.id, playerName);
          user.username = playerName; // Update the session object
        } catch (err) {
          console.error("Failed to update username:", err);
        }
      }
      
      // Update user's API key
      await storage.updateUserApiKey(user.id, key);
      
      // Force update session to ensure it has correct data
      req.login(user, (err) => {
        if (err) {
          console.error("Error refreshing session:", err);
        }
      });
      
      res.json({ success: true, message: "API key saved successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to save API key",
      });
    }
  });

  app.delete("/api/settings/apikey", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      await storage.updateUserApiKey(req.user!.id, "");
      res.json({ success: true, message: "API key removed successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to remove API key",
      });
    }
  });

  app.post("/api/settings/test-apikey", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { key } = req.body;
      // Create a fresh TornAPI instance to test the key
      const testAPI = new TornAPI();
      const keyData = await testAPI.checkApiKey(key);
      res.json(keyData);
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to test API key",
      });
    }
  });

  // Password Update
  app.post("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Validate current password
      const isValid = await storage.validateUserPassword(req.user!.id, currentPassword);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update password
      await storage.updateUserPassword(req.user!.id, newPassword);
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update password",
      });
    }
  });

  // Data Sync
  app.post("/api/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    
    try {
      const user = req.user!;
      if (!user.apiKey) {
        return res.status(400).json({ message: "API key not configured" });
      }
      
      // Trigger sync for user data
      // Create a fresh instance of TornAPI for each request to ensure data isolation
      const userAPI = new TornAPI();
      await userAPI.syncUserData(user.apiKey, user.id);
      
      res.json({ success: true, message: "Data sync triggered successfully" });
    } catch (error) {
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to sync data",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
