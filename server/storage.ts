import { users, type User, type InsertUser } from "@shared/schema";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import createMemoryStore from "memorystore";
import session from "express-session";

const scryptAsync = promisify(scrypt);

// User settings interface
interface UserSettings {
  theme: "light" | "dark" | "system";
  default_refresh_rate: number;
  auto_sync: boolean;
  notifications: {
    enabled: boolean;
    faction_attacks: boolean;
    bazaar_deals: boolean;
    company_events: boolean;
  };
  display: {
    compact_mode: boolean;
    show_ids: boolean;
    format_numbers: boolean;
  };
}

// Crawler config interface
interface CrawlerConfig {
  enabled: boolean;
  crawl_interval_minutes: number;
  player_id_start: number;
  player_id_end: number;
  request_delay_ms: number;
  batch_size: number;
  max_concurrent_requests: number;
}

// System stats interface
interface SystemStats {
  playerCount: number;
  itemCount: number;
  dataSize: string;
  queriesToday: number;
}

// Player search interface
interface PlayerSearchParams {
  page: number;
  minLevel: number;
  maxLevel: number;
  sortBy: string;
  searchQuery: string;
}

// Employee search interface
interface EmployeeSearchParams extends PlayerSearchParams {
  companyType: string;
  minIntelligence: number;
  minEndurance: number;
  minManualLabor: number;
}

// Faction search interface
interface FactionSearchParams extends PlayerSearchParams {
  minStats: number;
  activeOnly: boolean;
  excludeInFaction: boolean;
  excludeTraveling: boolean;
}

// Item search interface
interface ItemSearchParams {
  page: number;
  category: string;
  type: string;
  sortBy: string;
  searchQuery: string;
}

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByApiKey(apiKey: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserPassword(userId: number, password: string): Promise<boolean>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  updateUserApiKey(userId: number, apiKey: string): Promise<void>;
  
  // Settings management
  getUserSettings(userId: number): Promise<UserSettings>;
  updateUserSettings(userId: number, settings: UserSettings): Promise<UserSettings>;
  
  // Crawler management
  getCrawlerConfig(): Promise<CrawlerConfig | null>;
  updateCrawlerConfig(config: CrawlerConfig): Promise<void>;
  getLastCrawlPosition(): Promise<number | null>;
  updateCrawlPosition(position: number): Promise<void>;
  getLastCrawlTime(): Promise<number | null>;
  updateLastCrawlTime(timestamp: number): Promise<void>;
  getIndexedPlayerCount(): Promise<number>;
  
  // Player search
  searchEmployeeCandidates(params: EmployeeSearchParams): Promise<any>;
  searchFactionCandidates(params: FactionSearchParams): Promise<any>;
  
  // Item management
  getItems(params: ItemSearchParams): Promise<any>;
  
  // System stats
  getSystemStats(): Promise<SystemStats>;
  
  // Session store for authentication
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private userSettings: Map<number, UserSettings>;
  private playerData: Map<number, any>;
  private itemData: Map<number, any>;
  private crawlerConfig: CrawlerConfig | null = null;
  private lastCrawlPosition: number | null = null;
  private lastCrawlTime: number | null = null;
  private apiRequests: number = 0;
  
  public sessionStore: session.SessionStore;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.userSettings = new Map();
    this.playerData = new Map();
    this.itemData = new Map();
    this.currentId = 1;
    
    // Create memory-based session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
    
    // Initialize with some sample items
    this.initializeSampleData();
  }
  
  private async initializeSampleData(): Promise<void> {
    // Add some sample items
    for (let i = 1; i <= 100; i++) {
      const categories = ["Weapon", "Armor", "Drug", "Booster", "Medical", "Enhancer", "Alcohol", "Candy", "Temporary", "Special"];
      const types = ["Primary", "Secondary", "Melee", "Defensive", "Consumable", "Energy", "Utility"];
      
      this.itemData.set(i, {
        id: i,
        name: `Item ${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        category: categories[Math.floor(Math.random() * categories.length)],
        market_value: Math.floor(Math.random() * 1000000) + 1000,
        circulation: Math.floor(Math.random() * 10000),
        description: `Description for item ${i}`
      });
    }
    
    // Add some sample player data for search functionality
    for (let i = 1; i <= 500; i++) {
      const inFaction = Math.random() > 0.3;
      const inCompany = Math.random() > 0.5;
      
      this.playerData.set(i, {
        id: i,
        name: `Player ${i}`,
        level: Math.floor(Math.random() * 100) + 1,
        status: ["Online", "Offline", "Idle", "Hospital"][Math.floor(Math.random() * 4)],
        last_action: "Recently",
        current_faction: inFaction ? {
          id: Math.floor(Math.random() * 1000) + 1,
          name: `Faction ${Math.floor(Math.random() * 100) + 1}`,
          position: "Member"
        } : null,
        current_company: inCompany ? {
          id: Math.floor(Math.random() * 1000) + 1,
          name: `Company ${Math.floor(Math.random() * 100) + 1}`,
          position: "Employee",
          type: ["Logistics", "Medical", "Casino", "Adult", "Law", "Computer", "Firework", "Flower"][Math.floor(Math.random() * 8)]
        } : null,
        days_since_last_faction: inFaction ? 0 : Math.floor(Math.random() * 500),
        stats: {
          strength: Math.floor(Math.random() * 50000),
          defense: Math.floor(Math.random() * 50000),
          speed: Math.floor(Math.random() * 50000),
          dexterity: Math.floor(Math.random() * 50000),
          total: 0
        },
        work_stats: {
          intelligence: Math.floor(Math.random() * 5000),
          endurance: Math.floor(Math.random() * 5000),
          manual_labor: Math.floor(Math.random() * 5000)
        },
        travel_state: {
          status: Math.random() > 0.9 ? "Traveling" : "In Torn",
          destination: Math.random() > 0.9 ? ["Mexico", "Cayman Islands", "Canada", "Hawaii", "UK", "Argentina", "Switzerland", "Japan", "China", "UAE", "South Africa"][Math.floor(Math.random() * 11)] : undefined,
          return_time: Math.random() > 0.9 ? new Date(Date.now() + Math.random() * 86400000).toISOString() : undefined
        },
        activity: {
          attacks_made: Math.floor(Math.random() * 1000),
          defends_made: Math.floor(Math.random() * 500),
          active_last_week: Math.random() > 0.2
        }
      });
      
      // Calculate total stats
      const player = this.playerData.get(i);
      player.stats.total = player.stats.strength + player.stats.defense + player.stats.speed + player.stats.dexterity;
      
      // Add suitability scores for employees
      if (player) {
        player.suitability_scores = {
          "Logistics": Math.floor(Math.random() * 100),
          "Medical": Math.floor(Math.random() * 100),
          "Casino": Math.floor(Math.random() * 100),
          "Adult": Math.floor(Math.random() * 100),
          "Law": Math.floor(Math.random() * 100),
          "Computer": Math.floor(Math.random() * 100),
          "Firework": Math.floor(Math.random() * 100),
          "Flower": Math.floor(Math.random() * 100)
        };
      }
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByApiKey(apiKey: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.apiKey === apiKey,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // If password is provided in plain text, hash it
    let userToInsert = { ...insertUser };
    if (!userToInsert.password.includes('.')) {
      userToInsert.password = await this.hashPassword(userToInsert.password);
    }
    
    const user: User = { ...userToInsert, id };
    this.users.set(id, user);
    
    // Create default settings for the new user
    this.userSettings.set(id, this.getDefaultSettings());
    
    return user;
  }
  
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${derivedKey.toString('hex')}.${salt}`;
  }
  
  private async comparePasswords(supplied: string, stored: string): Promise<boolean> {
    const [hashedPassword, salt] = stored.split('.');
    const hashedBuffer = Buffer.from(hashedPassword, 'hex');
    const suppliedBuffer = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuffer, suppliedBuffer);
  }
  
  async validateUserPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;
    
    return this.comparePasswords(password, user.password);
  }
  
  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    const hashedPassword = await this.hashPassword(newPassword);
    user.password = hashedPassword;
    this.users.set(userId, user);
  }
  
  async updateUserApiKey(userId: number, apiKey: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    
    // In a real implementation, we would store this securely
    user.apiKey = apiKey;
    this.users.set(userId, user);
  }
  
  private getDefaultSettings(): UserSettings {
    return {
      theme: "dark",
      default_refresh_rate: 60,
      auto_sync: true,
      notifications: {
        enabled: true,
        faction_attacks: true,
        bazaar_deals: true,
        company_events: true
      },
      display: {
        compact_mode: false,
        show_ids: true,
        format_numbers: true
      }
    };
  }
  
  async getUserSettings(userId: number): Promise<UserSettings> {
    let settings = this.userSettings.get(userId);
    
    if (!settings) {
      settings = this.getDefaultSettings();
      this.userSettings.set(userId, settings);
    }
    
    return settings;
  }
  
  async updateUserSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    this.userSettings.set(userId, settings);
    return settings;
  }
  
  async getCrawlerConfig(): Promise<CrawlerConfig | null> {
    return this.crawlerConfig;
  }
  
  async updateCrawlerConfig(config: CrawlerConfig): Promise<void> {
    this.crawlerConfig = config;
  }
  
  async getLastCrawlPosition(): Promise<number | null> {
    return this.lastCrawlPosition;
  }
  
  async updateCrawlPosition(position: number): Promise<void> {
    this.lastCrawlPosition = position;
  }
  
  async getLastCrawlTime(): Promise<number | null> {
    return this.lastCrawlTime;
  }
  
  async updateLastCrawlTime(timestamp: number): Promise<void> {
    this.lastCrawlTime = timestamp;
  }
  
  async getIndexedPlayerCount(): Promise<number> {
    return this.playerData.size;
  }
  
  async searchEmployeeCandidates(params: EmployeeSearchParams): Promise<any> {
    const { 
      page, 
      minLevel, 
      maxLevel, 
      companyType, 
      minIntelligence, 
      minEndurance, 
      minManualLabor, 
      sortBy, 
      searchQuery 
    } = params;
    
    const pageSize = 20;
    const startIndex = (page - 1) * pageSize;
    
    let candidates = Array.from(this.playerData.values()).filter(player => {
      // Level filter
      if (player.level < minLevel || player.level > maxLevel) return false;
      
      // Work stats filter
      if (player.work_stats.intelligence < minIntelligence) return false;
      if (player.work_stats.endurance < minEndurance) return false;
      if (player.work_stats.manual_labor < minManualLabor) return false;
      
      // Company type filter
      if (companyType !== 'all' && (!player.current_company || player.current_company.type !== companyType)) return false;
      
      // Search query filter
      if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
    
    // Sort candidates
    const [sortField, sortDirection] = sortBy.split('-');
    candidates.sort((a, b) => {
      let aValue, bValue;
      
      // Get sort values based on field
      switch (sortField) {
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'intelligence':
          aValue = a.work_stats.intelligence;
          bValue = b.work_stats.intelligence;
          break;
        case 'endurance':
          aValue = a.work_stats.endurance;
          bValue = b.work_stats.endurance;
          break;
        case 'manual':
          aValue = a.work_stats.manual_labor;
          bValue = b.work_stats.manual_labor;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        default:
          aValue = a.level;
          bValue = b.level;
      }
      
      // Apply sort direction
      if (sortDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
    
    // Get company types for filters
    const companyTypes = ["Logistics", "Medical", "Casino", "Adult", "Law", "Computer", "Firework", "Flower"];
    
    return {
      candidates: candidates.slice(startIndex, startIndex + pageSize),
      meta: {
        total: candidates.length,
        page,
        limit: pageSize,
        total_pages: Math.ceil(candidates.length / pageSize),
        company_types: companyTypes
      }
    };
  }
  
  async searchFactionCandidates(params: FactionSearchParams): Promise<any> {
    const { 
      page, 
      minLevel, 
      maxLevel, 
      minStats, 
      activeOnly, 
      excludeInFaction, 
      excludeTraveling, 
      sortBy, 
      searchQuery 
    } = params;
    
    const pageSize = 20;
    const startIndex = (page - 1) * pageSize;
    
    let candidates = Array.from(this.playerData.values()).filter(player => {
      // Level filter
      if (player.level < minLevel || player.level > maxLevel) return false;
      
      // Stats filter
      if (player.stats.total < minStats) return false;
      
      // Active only filter
      if (activeOnly && !player.activity.active_last_week) return false;
      
      // Exclude in faction filter
      if (excludeInFaction && player.current_faction) return false;
      
      // Exclude traveling filter
      if (excludeTraveling && player.travel_state.status === "Traveling") return false;
      
      // Search query filter
      if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
    
    // Sort candidates
    const [sortField, sortDirection] = sortBy.split('-');
    candidates.sort((a, b) => {
      let aValue, bValue;
      
      // Get sort values based on field
      switch (sortField) {
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'total_stats':
          aValue = a.stats.total;
          bValue = b.stats.total;
          break;
        case 'activity':
          aValue = a.activity.attacks_made + a.activity.defends_made;
          bValue = b.activity.attacks_made + b.activity.defends_made;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'days_since_faction':
          aValue = a.days_since_last_faction || 999999;
          bValue = b.days_since_last_faction || 999999;
          break;
        default:
          aValue = a.level;
          bValue = b.level;
      }
      
      // Apply sort direction
      if (sortDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
    
    return {
      candidates: candidates.slice(startIndex, startIndex + pageSize),
      meta: {
        total: candidates.length,
        page,
        limit: pageSize,
        total_pages: Math.ceil(candidates.length / pageSize)
      }
    };
  }
  
  async getItems(params: ItemSearchParams): Promise<any> {
    const { page, category, type, sortBy, searchQuery } = params;
    
    const pageSize = 20;
    const startIndex = (page - 1) * pageSize;
    
    let items = Array.from(this.itemData.values()).filter(item => {
      // Category filter
      if (category !== 'all' && item.category !== category) return false;
      
      // Type filter
      if (type !== 'all' && item.type !== type) return false;
      
      // Search query filter
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      return true;
    });
    
    // Sort items
    const [sortField, sortDirection] = sortBy.split('-');
    items.sort((a, b) => {
      let aValue, bValue;
      
      // Get sort values based on field
      switch (sortField) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'market_value':
          aValue = a.market_value;
          bValue = b.market_value;
          break;
        case 'circulation':
          aValue = a.circulation;
          bValue = b.circulation;
          break;
        default:
          aValue = a.id;
          bValue = b.id;
      }
      
      // Apply sort direction
      if (sortDirection === 'desc') {
        return bValue - aValue;
      } else {
        return aValue - bValue;
      }
    });
    
    // Get unique categories and types
    const categories = [...new Set(Array.from(this.itemData.values()).map(item => item.category))];
    const types = [...new Set(Array.from(this.itemData.values()).map(item => item.type))];
    
    return {
      items: items.slice(startIndex, startIndex + pageSize),
      meta: {
        total: items.length,
        page,
        limit: pageSize,
        total_pages: Math.ceil(items.length / pageSize),
        categories,
        types
      }
    };
  }
  
  async getSystemStats(): Promise<SystemStats> {
    // Generate sample system stats
    return {
      playerCount: this.playerData.size,
      itemCount: this.itemData.size,
      dataSize: `${(this.playerData.size * 2 + this.itemData.size) / 1000} MB`,
      queriesToday: this.apiRequests
    };
  }
}

export const storage = new MemStorage();
