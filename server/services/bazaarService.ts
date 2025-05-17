/**
 * Service for handling Torn bazaar listings
 * This service fetches player bazaar data and integrates with item data
 */

import { TornAPI } from "./tornAPI";
import fs from "fs";
import path from "path";

interface BazaarItem {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  market_price: number;
  quantity: number;
  percentage_below_market: number;
  seller: {
    id: number;
    name: string;
  };
  description?: string;
  image?: string;
}

interface ItemsData {
  [id: string]: {
    name: string;
    type: string;
    category: string;
    description: string;
    market_value: number;
    image: string;
  }
}

export class BazaarService {
  private static instance: BazaarService;
  private tornAPI: TornAPI;
  private itemsCache: ItemsData = {};
  private lastItemsFetch: number = 0;
  private readonly ITEMS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly ERROR_LOG_PATH = path.join(process.cwd(), "data", "errors.log");
  private readonly ITEMS_CACHE_PATH = path.join(process.cwd(), "data", "items_cache.json");
  private readonly API_DELAY_MS = 600; // Delay 600ms between API calls
  
  private constructor(tornAPI: TornAPI) {
    this.tornAPI = tornAPI;
    this.ensureDataDirectory();
    this.loadItemsCache();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(tornAPI: TornAPI): BazaarService {
    if (!BazaarService.instance) {
      BazaarService.instance = new BazaarService(tornAPI);
    }
    return BazaarService.instance;
  }
  
  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }
  
  /**
   * Log error to file
   */
  private logError(message: string): void {
    try {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      fs.appendFileSync(this.ERROR_LOG_PATH, logMessage);
    } catch (err) {
      console.error("Error writing to log file:", err);
    }
  }
  
  /**
   * Load items cache from disk
   */
  private loadItemsCache(): void {
    try {
      if (fs.existsSync(this.ITEMS_CACHE_PATH)) {
        const data = JSON.parse(fs.readFileSync(this.ITEMS_CACHE_PATH, 'utf8'));
        this.itemsCache = data.items || {};
        this.lastItemsFetch = data.timestamp || 0;
        console.log(`Loaded ${Object.keys(this.itemsCache).length} items from cache`);
      }
    } catch (error) {
      this.logError(`Error loading items cache: ${error}`);
      console.error("Error loading items cache:", error);
    }
  }
  
  /**
   * Save items cache to disk
   */
  private saveItemsCache(): void {
    try {
      const data = {
        items: this.itemsCache,
        timestamp: this.lastItemsFetch
      };
      fs.writeFileSync(this.ITEMS_CACHE_PATH, JSON.stringify(data, null, 2));
      console.log(`Saved ${Object.keys(this.itemsCache).length} items to cache`);
    } catch (error) {
      this.logError(`Error saving items cache: ${error}`);
      console.error("Error saving items cache:", error);
    }
  }
  
  /**
   * Fetch all Torn items from API
   */
  public async fetchAllItems(apiKey: string): Promise<ItemsData> {
    try {
      // Check if cache is still valid
      const now = Date.now();
      if (
        Object.keys(this.itemsCache).length > 0 && 
        now - this.lastItemsFetch < this.ITEMS_CACHE_DURATION
      ) {
        return this.itemsCache;
      }
      
      console.log("Fetching all items data from Torn API");
      const response = await this.tornAPI.makeRequest("torn/?selections=items", apiKey);
      
      if (!response || !response.items) {
        throw new Error("Invalid response from Torn API");
      }
      
      // Process items data
      const items: ItemsData = {};
      Object.entries(response.items).forEach(([id, data]: [string, any]) => {
        items[id] = {
          name: data.name || "Unknown Item",
          type: data.type || "Miscellaneous",
          category: this.normalizeCategory(data.type || "Miscellaneous"),
          description: data.description || "",
          market_value: data.market_value || 0,
          image: data.image || ""
        };
      });
      
      console.log(`Fetched ${Object.keys(items).length} items from Torn API`);
      
      // Update cache
      this.itemsCache = items;
      this.lastItemsFetch = now;
      this.saveItemsCache();
      
      return items;
    } catch (error) {
      this.logError(`Error fetching all items: ${error}`);
      console.error("Error fetching all items:", error);
      
      // Return current cache if available, otherwise empty object
      return this.itemsCache;
    }
  }
  
  /**
   * Get a player's bazaar listings
   */
  public async getPlayerBazaar(playerId: number, apiKey: string): Promise<BazaarItem[]> {
    try {
      const playerData = await this.tornAPI.makeRequest(`user/${playerId}?selections=bazaar`, apiKey);
      
      if (!playerData || !playerData.bazaar) {
        return [];
      }
      
      // Get all items data for enriching bazaar listings
      const itemsData = await this.fetchAllItems(apiKey);
      
      // Format bazaar items
      const bazaarItems: BazaarItem[] = [];
      
      Object.entries(playerData.bazaar).forEach(([itemId, data]: [string, any]) => {
        const id = parseInt(itemId);
        const itemDetails = itemsData[itemId] || {};
        
        bazaarItems.push({
          id,
          name: data.name || itemDetails.name || "Unknown Item",
          type: data.type || itemDetails.type || "Unknown",
          category: data.category || itemDetails.category || "Miscellaneous",
          price: data.price || 0,
          market_price: data.market_value || itemDetails.market_value || 0,
          quantity: data.quantity || 1,
          percentage_below_market: (data.market_value || itemDetails.market_value) > 0 
            ? (((data.market_value || itemDetails.market_value) - data.price) / (data.market_value || itemDetails.market_value)) * 100 
            : 0,
          seller: {
            id: playerId,
            name: playerData.name || `Player ${playerId}`
          },
          description: itemDetails.description || "",
          image: itemDetails.image || ""
        });
      });
      
      return bazaarItems;
    } catch (error) {
      this.logError(`Error fetching bazaar for player ${playerId}: ${error}`);
      console.error(`Error fetching bazaar for player ${playerId}:`, error);
      return [];
    }
  }
  
  /**
   * Delay function with specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get bazaar listings from multiple players with proper delay
   */
  public async getBazaarListings(playerIds: number[], category: string, apiKey: string): Promise<{
    items: BazaarItem[];
    categories: string[];
  }> {
    const allBazaarItems: BazaarItem[] = [];
    const categories = new Set<string>();
    
    console.log(`Fetching bazaar data from ${playerIds.length} players`);
    
    // Fetch each player's bazaar with proper delay
    for (const playerId of playerIds) {
      try {
        const playerBazaar = await this.getPlayerBazaar(playerId, apiKey);
        allBazaarItems.push(...playerBazaar);
        
        // Add categories to set
        playerBazaar.forEach(item => {
          if (item.category) {
            categories.add(item.category);
          }
        });
        
        // Apply requested delay between API calls
        await this.delay(this.API_DELAY_MS);
      } catch (error) {
        this.logError(`Error processing player ${playerId}: ${error}`);
        console.error(`Error processing player ${playerId}:`, error);
        // Continue with next player if one fails
      }
    }
    
    // Filter by category if specified
    const filteredItems = category === 'all' 
      ? allBazaarItems 
      : allBazaarItems.filter(item => 
          item.category.toLowerCase() === category.toLowerCase()
        );
    
    return {
      items: filteredItems,
      categories: Array.from(categories)
    };
  }
  
  /**
   * Normalize category names
   */
  private normalizeCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'Melee': 'Weapons',
      'Primary': 'Weapons',
      'Secondary': 'Weapons',
      'Defensive': 'Armor',
      'Enhancer': 'Medical',
      'Drug': 'Drugs',
      'Energy Drink': 'Consumables',
      'Alcohol': 'Consumables',
      'Candy': 'Consumables',
      'Temporary': 'Boosters',
      'Car': 'Vehicles',
      'Flower': 'Flowers',
      'Plushie': 'Plushies',
      'Supply Pack': 'Supplies',
      'Electronic': 'Electronics'
    };
    
    return categoryMap[category] || category;
  }
}