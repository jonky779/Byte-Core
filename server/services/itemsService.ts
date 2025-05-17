/**
 * Service for handling Torn items data
 * This service is responsible for fetching, storing, and retrieving items data from the Torn API
 */

import { TornAPI } from "./tornAPI";
import fs from "fs";
import path from "path";

interface TornItem {
  id: number;
  name: string;
  description: string;
  type: string;
  weapon_type: string;
  buy_price: number;
  sell_price: number;
  market_value: number;
  circulation: number;
  image: string;
  requirement: string;
  category: string;
  effect: string;
}

export class ItemsService {
  private static instance: ItemsService;
  private tornAPI: TornAPI;
  private itemsCache: Record<number, TornItem> = {};
  private categoriesCache: string[] = [];
  private lastCacheUpdate: number = 0;
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CACHE_FILE = path.join(process.cwd(), "data", "items_cache.json");
  private readonly ERROR_LOG = path.join(process.cwd(), "data", "errors.log");
  
  private constructor(tornAPI: TornAPI) {
    this.tornAPI = tornAPI;
    this.loadCacheFromDisk();
  }
  
  /**
   * Get the singleton instance of ItemsService
   */
  public static getInstance(tornAPI: TornAPI): ItemsService {
    if (!ItemsService.instance) {
      ItemsService.instance = new ItemsService(tornAPI);
    }
    return ItemsService.instance;
  }
  
  /**
   * Load the items cache from disk if it exists
   */
  private loadCacheFromDisk(): void {
    try {
      // Ensure the data directory exists
      if (!fs.existsSync(path.dirname(this.CACHE_FILE))) {
        fs.mkdirSync(path.dirname(this.CACHE_FILE), { recursive: true });
      }
      
      if (fs.existsSync(this.CACHE_FILE)) {
        const cacheData = JSON.parse(fs.readFileSync(this.CACHE_FILE, 'utf8'));
        this.itemsCache = cacheData.items || {};
        this.categoriesCache = cacheData.categories || [];
        this.lastCacheUpdate = cacheData.lastUpdate || 0;
        
        console.log(`Loaded ${Object.keys(this.itemsCache).length} items from cache.`);
      }
    } catch (error) {
      this.logError(`Error loading items cache: ${error}`);
      console.error("Error loading items cache:", error);
    }
  }
  
  /**
   * Save the items cache to disk
   */
  private saveCacheToDisk(): void {
    try {
      // Ensure the data directory exists
      if (!fs.existsSync(path.dirname(this.CACHE_FILE))) {
        fs.mkdirSync(path.dirname(this.CACHE_FILE), { recursive: true });
      }
      
      const cacheData = {
        items: this.itemsCache,
        categories: this.categoriesCache,
        lastUpdate: this.lastCacheUpdate
      };
      
      fs.writeFileSync(this.CACHE_FILE, JSON.stringify(cacheData, null, 2));
      console.log(`Saved ${Object.keys(this.itemsCache).length} items to cache.`);
    } catch (error) {
      this.logError(`Error saving items cache: ${error}`);
      console.error("Error saving items cache:", error);
    }
  }
  
  /**
   * Log an error to the error log file
   */
  private logError(message: string): void {
    try {
      // Ensure the data directory exists
      if (!fs.existsSync(path.dirname(this.ERROR_LOG))) {
        fs.mkdirSync(path.dirname(this.ERROR_LOG), { recursive: true });
      }
      
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${message}\n`;
      
      fs.appendFileSync(this.ERROR_LOG, logMessage);
    } catch (error) {
      console.error("Error writing to error log:", error);
    }
  }
  
  /**
   * Get an item by ID
   */
  public async getItem(itemId: number, apiKey: string): Promise<TornItem | null> {
    // Ensure the cache is fresh
    await this.ensureCacheIsFresh(apiKey);
    
    return this.itemsCache[itemId] || null;
  }
  
  /**
   * Get all items
   */
  public async getAllItems(apiKey: string): Promise<TornItem[]> {
    // Ensure the cache is fresh
    await this.ensureCacheIsFresh(apiKey);
    
    return Object.values(this.itemsCache);
  }
  
  /**
   * Get all categories
   */
  public async getCategories(apiKey: string): Promise<string[]> {
    // Ensure the cache is fresh
    await this.ensureCacheIsFresh(apiKey);
    
    return this.categoriesCache;
  }
  
  /**
   * Get items by category
   */
  public async getItemsByCategory(category: string, apiKey: string): Promise<TornItem[]> {
    // Ensure the cache is fresh
    await this.ensureCacheIsFresh(apiKey);
    
    if (category === 'all') {
      return Object.values(this.itemsCache);
    }
    
    return Object.values(this.itemsCache).filter(item => 
      item.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  /**
   * Check if the cache is fresh, if not fetch new data
   */
  private async ensureCacheIsFresh(apiKey: string): Promise<void> {
    const now = Date.now();
    
    // If cache is empty or expired, refresh it
    if (
      Object.keys(this.itemsCache).length === 0 || 
      now - this.lastCacheUpdate > this.CACHE_EXPIRY_MS
    ) {
      await this.fetchAllItems(apiKey);
    }
  }
  
  /**
   * Fetch all items from the Torn API
   */
  public async fetchAllItems(apiKey: string): Promise<void> {
    try {
      console.log("Fetching all items from Torn API...");
      
      // Fetch items data from Torn API
      const response = await this.tornAPI.makeRequest("torn/?selections=items", apiKey);
      
      if (!response || !response.items) {
        throw new Error("Invalid response from Torn API");
      }
      
      // Process the items data
      this.itemsCache = {};
      const categories = new Set<string>();
      
      Object.entries(response.items).forEach(([id, itemData]: [string, any]) => {
        // Extract category from the item data - normalize to avoid duplicates
        const category = this.normalizeCategory(itemData.type || "Miscellaneous");
        categories.add(category);
        
        // Store the item in the cache
        const itemId = parseInt(id);
        this.itemsCache[itemId] = {
          id: itemId,
          name: itemData.name || "Unknown Item",
          description: itemData.description || "",
          type: itemData.type || "Unknown",
          weapon_type: itemData.weapon_type || "",
          buy_price: itemData.buy_price || 0,
          sell_price: itemData.sell_price || 0,
          market_value: itemData.market_value || 0,
          circulation: itemData.circulation || 0,
          image: itemData.image || "",
          requirement: itemData.requirement || "",
          category: category,
          effect: itemData.effect || ""
        };
      });
      
      // Update the categories cache
      this.categoriesCache = Array.from(categories);
      
      // Update the last cache update timestamp
      this.lastCacheUpdate = Date.now();
      
      console.log(`Fetched ${Object.keys(this.itemsCache).length} items from Torn API`);
      console.log(`Found ${this.categoriesCache.length} categories: ${this.categoriesCache.join(", ")}`);
      
      // Save the cache to disk
      this.saveCacheToDisk();
    } catch (error) {
      this.logError(`Error fetching items: ${error}`);
      console.error("Error fetching items:", error);
      throw error;
    }
  }
  
  /**
   * Normalize the category name to ensure consistency
   */
  private normalizeCategory(category: string): string {
    // Define common category mappings
    const categoryMappings: Record<string, string> = {
      "Primary": "Weapons",
      "Secondary": "Weapons",
      "Melee": "Weapons",
      "Temporary": "Weapons",
      "Defensive": "Armor",
      "Energy Drink": "Consumables",
      "Alcohol": "Consumables",
      "Drug": "Drugs",
      "Medical": "Medical",
      "Candy": "Consumables",
      "Flower": "Flowers",
      "Book": "Books",
      "Plushie": "Plushies",
      "Car": "Vehicles",
      "Defensive": "Armor",
      "Clothing": "Clothing",
      "Supply Pack": "Supply Packs",
      "Jewelry": "Jewelry",
    };
    
    // Return the mapped category or the original if no mapping exists
    return categoryMappings[category] || category;
  }
}