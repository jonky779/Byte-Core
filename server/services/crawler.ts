import { TornAPI } from "./tornAPI";
import { IStorage } from "../storage";

interface CrawlerConfig {
  enabled: boolean;
  crawl_interval_minutes: number;
  player_id_start: number;
  player_id_end: number;
  request_delay_ms: number;
  batch_size: number;
  max_concurrent_requests: number;
}

interface CrawlerStatus {
  status: "running" | "paused" | "idle" | "error";
  indexedPlayers: number;
  totalPlayers: number;
  lastUpdated: number;
  crawlSpeed: number;
  nextScheduledRun: number;
  error?: string;
}

export class Crawler {
  private config: CrawlerConfig = {
    enabled: false,
    crawl_interval_minutes: 60,
    player_id_start: 1,
    player_id_end: 3000000,
    request_delay_ms: 500,
    batch_size: 100,
    max_concurrent_requests: 5
  };
  
  private status: CrawlerStatus = {
    status: "idle",
    indexedPlayers: 0,
    totalPlayers: 0,
    lastUpdated: Date.now(),
    crawlSpeed: 0,
    nextScheduledRun: Date.now()
  };
  
  private crawlTimer: NodeJS.Timeout | null = null;
  private currentPosition: number = 0;
  private abortCrawl: boolean = false;
  private logs: Array<{
    id: number;
    timestamp: Date;
    action: string;
    details: string;
    success: boolean;
  }> = [];
  private lastLogId: number = 0;
  
  constructor(private tornAPI: TornAPI, private storage: IStorage) {
    // Initialize with default values
  }
  
  public async initialize(): Promise<void> {
    // We'll use a simplified initialization for now
    try {
      this.addLog("Initialization", "Crawler initialized in demo mode", true);
      this.status.totalPlayers = this.config.player_id_end - this.config.player_id_start;
      this.status.indexedPlayers = Math.floor(this.status.totalPlayers * 0.25); // Simulate 25% indexed
      this.currentPosition = this.config.player_id_start + this.status.indexedPlayers;
      
      // For demonstration, we'll set next scheduled run to 10 minutes from now
      this.status.nextScheduledRun = Date.now() + (10 * 60 * 1000);
      
      console.log("Crawler initialized in demo mode");
    } catch (error) {
      console.error("Failed to initialize crawler:", error);
      this.status.error = error instanceof Error ? error.message : "Unknown error during initialization";
      this.status.status = "error";
      
      this.addLog("Initialization", `Failed to initialize crawler: ${this.status.error}`, false);
    }
  }
  
  private addLog(action: string, details: string, success: boolean): void {
    this.lastLogId++;
    this.logs.unshift({
      id: this.lastLogId,
      timestamp: new Date(),
      action,
      details,
      success
    });
    
    // Keep only the last 100 logs
    if (this.logs.length > 100) {
      this.logs.pop();
    }
  }
  
  public async getStatus(): Promise<CrawlerStatus> {
    return { ...this.status };
  }
  
  public async getDetailedStatus(): Promise<any> {
    // Calculate estimated time remaining
    let estimatedTimeRemaining = "Unknown";
    if (this.status.crawlSpeed > 0) {
      const remainingPlayers = this.config.player_id_end - this.currentPosition;
      const remainingSeconds = remainingPlayers / this.status.crawlSpeed;
      
      if (remainingSeconds < 60) {
        estimatedTimeRemaining = `${Math.round(remainingSeconds)} seconds`;
      } else if (remainingSeconds < 3600) {
        estimatedTimeRemaining = `${Math.round(remainingSeconds / 60)} minutes`;
      } else if (remainingSeconds < 86400) {
        estimatedTimeRemaining = `${Math.round(remainingSeconds / 3600)} hours`;
      } else {
        estimatedTimeRemaining = `${Math.round(remainingSeconds / 86400)} days`;
      }
    }
    
    // Generate statistics for demo
    const stats = {
      players_with_faction: Math.floor(this.status.indexedPlayers * 0.7),
      players_without_faction: Math.floor(this.status.indexedPlayers * 0.3),
      players_with_company: Math.floor(this.status.indexedPlayers * 0.5),
      players_without_company: Math.floor(this.status.indexedPlayers * 0.5),
      players_traveling: Math.floor(this.status.indexedPlayers * 0.1),
      players_in_hospital: Math.floor(this.status.indexedPlayers * 0.05),
      total_items_indexed: Math.floor(this.status.indexedPlayers * 10)
    };
    
    return {
      config: { ...this.config },
      status: {
        state: this.status.status,
        current_position: this.currentPosition,
        indexed_players: this.status.indexedPlayers,
        total_players: this.status.totalPlayers,
        estimated_time_remaining: estimatedTimeRemaining,
        crawl_speed: this.status.crawlSpeed,
        next_scheduled_run: new Date(this.status.nextScheduledRun).toLocaleString(),
        last_completed_run: new Date(this.status.lastUpdated).toLocaleString(),
        error: this.status.error
      },
      logs: this.logs,
      stats
    };
  }
  
  public async start(): Promise<void> {
    if (this.status.status === "running") {
      throw new Error("Crawler is already running");
    }
    
    this.config.enabled = true;
    this.status.status = "running";
    this.abortCrawl = false;
    this.addLog("Control", "Crawler manually started", true);
    
    try {
      // Get the config from storage to ensure we have the latest
      const storedConfig = await this.storage.getCrawlerConfig();
      if (storedConfig) {
        this.config = storedConfig;
      }
      
      // Get the current position (pick up where we left off)
      const lastPosition = await this.storage.getLastCrawlPosition();
      if (lastPosition !== null) {
        this.currentPosition = lastPosition;
      }
      
      // Main crawl loop
      await this.runCrawl();
      
      // Schedule next crawl
      if (this.config.enabled && !this.abortCrawl) {
        this.status.nextScheduledRun = Date.now() + (this.config.crawl_interval_minutes * 60 * 1000);
        this.scheduleCrawl();
      }
    } catch (error) {
      this.status.status = "error";
      this.status.error = error instanceof Error ? error.message : "Unknown error during crawl";
      this.addLog("Error", `Crawl failed: ${this.status.error}`, false);
    }
    
    return Promise.resolve();
  }
  
  public async pause(): Promise<void> {
    if (this.status.status !== "running") {
      throw new Error("Crawler is not running");
    }
    
    this.config.enabled = false;
    this.status.status = "paused";
    this.addLog("Control", "Crawler manually paused", true);
    
    return Promise.resolve();
  }
  
  public async updateConfig(newConfig: Partial<CrawlerConfig>): Promise<void> {
    // Update config with new values
    this.config = { ...this.config, ...newConfig };
    
    // Update total players count
    this.status.totalPlayers = this.config.player_id_end - this.config.player_id_start;
    
    // Save the updated config to storage
    await this.storage.updateCrawlerConfig(this.config);
    
    // Log configuration update
    this.addLog("Config", "Crawler configuration updated", true);
    
    return Promise.resolve();
  }
  
  private async runCrawl(): Promise<void> {
    const startTime = Date.now();
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    try {
      // Make sure we're not at the end
      if (this.currentPosition >= this.config.player_id_end) {
        this.currentPosition = this.config.player_id_start;
        this.addLog("Crawl", "Reached end of ID range, resetting to start", true);
      }
      
      // Calculate the batch end position
      const batchEndPosition = Math.min(
        this.currentPosition + this.config.batch_size, 
        this.config.player_id_end
      );
      
      this.addLog("Crawl", `Starting batch crawl from ID ${this.currentPosition} to ${batchEndPosition}`, true);
      
      // Set up the batch processing
      const batchSize = this.config.max_concurrent_requests;
      let currentId = this.currentPosition;
      
      while (currentId < batchEndPosition && this.status.status === "running" && !this.abortCrawl) {
        // Create a batch of promises
        const promises = [];
        const batchIds = [];
        
        for (let i = 0; i < batchSize && currentId < batchEndPosition; i++) {
          batchIds.push(currentId);
          
          // We'll use a special admin API key for crawling
          promises.push(this.processSinglePlayer(currentId));
          
          currentId++;
          await new Promise(resolve => setTimeout(resolve, this.config.request_delay_ms));
        }
        
        // Wait for all promises in the batch to complete
        const results = await Promise.allSettled(promises);
        
        // Process results
        for (let i = 0; i < results.length; i++) {
          processedCount++;
          const playerId = batchIds[i];
          const result = results[i];
          
          if (result.status === "fulfilled") {
            successCount++;
          } else {
            errorCount++;
            this.addLog("Error", `Failed to process player ID ${playerId}: ${result.reason}`, false);
          }
        }
        
        // Update the current position and save it
        this.currentPosition = currentId;
        await this.storage.updateCrawlPosition(this.currentPosition);
        
        // Update the status
        this.status.indexedPlayers += successCount;
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        this.status.crawlSpeed = elapsedSeconds > 0 ? Math.round(processedCount / elapsedSeconds) : 0;
      }
      
      // Complete the crawl
      this.status.lastUpdated = Date.now();
      if (this.status.status === "running") {
        this.status.status = "idle";
      }
      
      this.addLog(
        "Crawl", 
        `Completed batch crawl. Processed: ${processedCount}, Success: ${successCount}, Errors: ${errorCount}`, 
        true
      );
      
      // Update the storage with the final position
      await this.storage.updateCrawlPosition(this.currentPosition);
      await this.storage.updateLastCrawlTime(Date.now());
      
    } catch (error) {
      this.status.status = "error";
      this.status.error = error instanceof Error ? error.message : "Unknown error during crawl";
      this.addLog("Error", `Crawl failed: ${this.status.error}`, false);
      throw error;
    }
  }
  
  private async processSinglePlayer(playerId: number): Promise<void> {
    try {
      // Use admin's personal API key for crawler operations
      // Using your personal API key: fvgfbmJ3IT7ksiMm
      const apiKey = "fvgfbmJ3IT7ksiMm";
      
      if (!apiKey) {
        throw new Error("No API key available for crawler");
      }
      
      // Step 1: Get player data from the API
      const playerData = await this.tornAPI.getPlayerStats(apiKey, playerId);
      
      // Store the player data for future use
      await this.storage.storePlayerData(playerId, playerData);
      
      // Step 2: Check if player is in a faction, if yes, collect faction data
      if (playerData.faction && playerData.faction.faction_id) {
        try {
          // Get basic faction data including members list
          const factionData = await this.tornAPI.getFactionData(apiKey, false, playerData.faction.faction_id);
          this.addLog("Process", `Collected faction data for ID ${playerData.faction.faction_id}: ${factionData.name}`, true);
          
          // Step 3: Process faction members to get more player IDs
          if (factionData.members) {
            this.addLog("Process", `Found ${Object.keys(factionData.members).length} members in faction ${factionData.name}`, true);
            
            // We don't need to process them now, they will be picked up in the crawler's normal sequence
          }
        } catch (factionError) {
          this.addLog("Warning", `Failed to process faction ID ${playerData.faction.faction_id}: ${factionError.message}`, false);
        }
      }
      
      // Step 4: Check if player is in a company, if yes, collect company data
      if (playerData.job && playerData.job.company_id) {
        try {
          // Get company data including employees
          const companyData = await this.tornAPI.getCompanyDetailedData(apiKey, playerData.job.company_id);
          this.addLog("Process", `Collected company data for ID ${playerData.job.company_id}: ${companyData.name}`, true);
          
          // Process employees to get more player IDs
          if (companyData.employees) {
            this.addLog("Process", `Found ${Object.keys(companyData.employees).length} employees in company ${companyData.name}`, true);
            
            // We don't need to process them now, they will be picked up in the crawler's normal sequence
          }
        } catch (companyError) {
          this.addLog("Warning", `Failed to process company ID ${playerData.job.company_id}: ${companyError.message}`, false);
        }
      }
      
      this.addLog("Process", `Completed processing player ID ${playerId}: ${playerData.name} (Level ${playerData.level})`, true);
      return Promise.resolve();
    } catch (error) {
      this.addLog("Error", `Failed to process player ID ${playerId}: ${error instanceof Error ? error.message : "Unknown error"}`, false);
      throw error;
    }
  }
  
  private scheduleCrawl(): void {
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
    }
    
    const delayMs = this.status.nextScheduledRun - Date.now();
    
    if (delayMs <= 0) {
      // If the next scheduled time is in the past, run immediately
      this.start();
      return;
    }
    
    this.crawlTimer = setTimeout(() => {
      if (this.config.enabled) {
        this.start();
      }
    }, delayMs);
  }
}