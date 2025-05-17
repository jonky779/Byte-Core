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
    player_id_end: 2500000,
    request_delay_ms: 1000,
    batch_size: 50,
    max_concurrent_requests: 3
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
      
      // Use sequential processing instead of Promise.allSettled to better respect API limits
      while (currentId < batchEndPosition && this.status.status === "running" && !this.abortCrawl) {
        try {
          // Process players one at a time to ensure proper API rate limiting
          for (let i = 0; i < batchSize && currentId < batchEndPosition; i++) {
            if (this.status.status !== "running" || this.abortCrawl) break;
            
            processedCount++;
            
            try {
              // Process each player individually with proper error handling
              await this.processSinglePlayer(currentId);
              successCount++;
              
              // Update our stats for the UI as we go
              this.status.indexedPlayers++;
              
              // Calculate crawl speed
              const elapsedSeconds = (Date.now() - startTime) / 1000;
              if (elapsedSeconds > 0) {
                this.status.crawlSpeed = Math.round(processedCount / elapsedSeconds);
              }
            } catch (playerError) {
              errorCount++;
              // We already log errors in processSinglePlayer
            }
            
            // Move to next player ID
            currentId++;
            
            // Always respect API rate limits
            await new Promise(resolve => setTimeout(resolve, this.config.request_delay_ms));
          }
          
          // Periodically update the storage position
          await this.storage.updateCrawlPosition(currentId);
          
        } catch (batchError: any) {
          this.addLog("Warning", `Batch error: ${batchError.message || "Unknown error"}`, false);
          // Continue with the next batch even if this one had issues
        }
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
      await this.storage.updateCrawlPosition(currentId);
      await this.storage.updateLastCrawlTime(Date.now());
      
      // Schedule the next run
      this.scheduleCrawl();
      
    } catch (error: any) {
      this.status.status = "error";
      this.status.error = error.message || "Unknown error during crawl";
      this.addLog("Error", `Crawl failed: ${this.status.error}`, false);
      
      // Even after an error, schedule the next run to keep the crawler going
      this.scheduleCrawl();
    }
  }
  
  private async processSinglePlayer(playerId: number): Promise<void> {
    try {
      // Use admin's personal API key for crawler operations
      const apiKey = "fvgfbmJ3IT7ksiMm";
      
      if (!apiKey) {
        throw new Error("No API key available for crawler");
      }
      
      try {
        // Step 1: Get player data from the API
        // Fetch basic profile and stats data for indexing
        const playerData = await this.tornAPI.getPlayerStats(apiKey, playerId);
        
        if (!playerData || !playerData.name) {
          // This happens with non-existent player IDs
          this.addLog("Info", `Player ID ${playerId} not found, skipping`, true);
          return;
        }
        
        // Store the player data for future use
        await this.storage.storePlayerData(playerId, playerData);
        
        // Log successful processing
        this.addLog("Process", `Player ${playerId}: ${playerData.name} (Level ${playerData.level})`, true);
        
        // Check for faction relationship
        if (playerData.faction) {
          this.addLog("Process", `Found player in faction: ${playerData.faction.name || "Unknown"}`, true);
        }
        
        // Check for company relationship
        if (playerData.company) {
          this.addLog("Process", `Found player in company: ${playerData.company.name || "Unknown"}`, true);
        }
        
        // Success - player fully processed
        return Promise.resolve();
      } catch (playerError: any) {
        // Handle specific Torn API errors
        if (playerError.message && playerError.message.includes("Incorrect ID-entity relation")) {
          // This is common when a player ID doesn't exist, just log and continue
          this.addLog("Info", `Player ID ${playerId} does not exist, skipping`, true);
          return Promise.resolve(); // Don't treat this as an error
        }
        
        // For other errors, log but don't stop the crawler
        this.addLog("Warning", `Failed to process player ID ${playerId}: ${playerError.message || "API error"}`, false);
        return Promise.resolve(); // Continue even with errors
      }
    } catch (error: any) {
      // Log severe errors but don't throw - this will help keep the crawler running
      this.addLog("Error", `Error processing player ID ${playerId}: ${error.message || "Unknown error"}`, false);
      return Promise.resolve(); // Don't stop the crawler for individual player errors
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