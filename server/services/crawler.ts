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
    // Load configuration from storage if available
    try {
      const savedConfig = await this.storage.getCrawlerConfig();
      if (savedConfig) {
        this.config = { ...this.config, ...savedConfig };
      }
      
      // Update status
      this.status.totalPlayers = this.config.player_id_end - this.config.player_id_start;
      
      // Get indexed players count
      const indexedCount = await this.storage.getIndexedPlayerCount();
      this.status.indexedPlayers = indexedCount;
      
      // Load last crawl position
      const lastPosition = await this.storage.getLastCrawlPosition();
      this.currentPosition = lastPosition || this.config.player_id_start;
      
      // Calculate next scheduled run
      if (this.config.enabled) {
        const lastCrawlTime = await this.storage.getLastCrawlTime();
        if (lastCrawlTime) {
          this.status.nextScheduledRun = lastCrawlTime + (this.config.crawl_interval_minutes * 60 * 1000);
          
          // If it's time to run, schedule it
          if (Date.now() > this.status.nextScheduledRun) {
            this.scheduleNextCrawl(1000); // Start in 1 second
          } else {
            // Schedule for the future
            this.scheduleNextCrawl(this.status.nextScheduledRun - Date.now());
          }
        } else {
          // No last crawl time, schedule immediately
          this.scheduleNextCrawl(1000);
        }
      }
      
      // Add initialization log
      this.addLog("Initialization", "Crawler initialized successfully", true);
      
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
    
    // In a real implementation, we would also store logs in the database
  }
  
  private scheduleNextCrawl(delayMs: number): void {
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
    }
    
    if (this.config.enabled) {
      this.crawlTimer = setTimeout(() => this.startCrawl(), delayMs);
      this.status.nextScheduledRun = Date.now() + delayMs;
      
      this.addLog(
        "Schedule", 
        `Next crawl scheduled in ${Math.round(delayMs / 1000 / 60)} minutes`, 
        true
      );
    }
  }
  
  private async startCrawl(): Promise<void> {
    if (!this.config.enabled || this.status.status === "running") {
      return;
    }
    
    this.status.status = "running";
    this.abortCrawl = false;
    
    try {
      this.addLog("Crawl", "Starting player indexing process", true);
      
      const startTime = Date.now();
      let processedCount = 0;
      let successCount = 0;
      
      while (
        !this.abortCrawl && 
        this.currentPosition <= this.config.player_id_end && 
        processedCount < this.config.batch_size
      ) {
        try {
          // In a real implementation, this would call the Torn API to get player data
          // For now, we'll simulate success for every other player ID
          const success = this.currentPosition % 2 === 0;
          
          if (success) {
            // Simulate storing player data
            await this.simulateStorePlayerData(this.currentPosition);
            successCount++;
          }
          
          processedCount++;
          this.currentPosition++;
          
          // Update storage with current position
          await this.storage.updateCrawlPosition(this.currentPosition);
          
          // Respect delay setting
          if (this.config.request_delay_ms > 0 && !this.abortCrawl) {
            await new Promise(resolve => setTimeout(resolve, this.config.request_delay_ms));
          }
        } catch (error) {
          console.error(`Error processing player ID ${this.currentPosition}:`, error);
          this.addLog(
            "Error", 
            `Failed to process player ID ${this.currentPosition}: ${error instanceof Error ? error.message : "Unknown error"}`, 
            false
          );
          
          // Continue to next player
          this.currentPosition++;
        }
      }
      
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Update stats
      this.status.indexedPlayers += successCount;
      this.status.crawlSpeed = durationSeconds > 0 ? Math.round(processedCount / durationSeconds) : 0;
      this.status.lastUpdated = endTime;
      
      // Update last crawl time
      await this.storage.updateLastCrawlTime(endTime);
      
      // Log completion
      this.addLog(
        "Crawl", 
        `Completed batch: ${processedCount} players processed, ${successCount} indexed successfully`, 
        true
      );
      
      // Check if we've reached the end
      if (this.currentPosition > this.config.player_id_end) {
        this.addLog("Crawl", "Completed full player index range", true);
        this.currentPosition = this.config.player_id_start; // Reset for next cycle
      }
      
      // Schedule next run
      this.status.status = "idle";
      this.scheduleNextCrawl(this.config.crawl_interval_minutes * 60 * 1000);
      
    } catch (error) {
      console.error("Error during crawl process:", error);
      this.status.status = "error";
      this.status.error = error instanceof Error ? error.message : "Unknown error during crawl";
      
      this.addLog("Crawl", `Crawl process failed: ${this.status.error}`, false);
      
      // Schedule next run despite error
      this.scheduleNextCrawl(this.config.crawl_interval_minutes * 60 * 1000);
    }
  }
  
  // This is a simulation of storing player data
  private async simulateStorePlayerData(playerId: number): Promise<void> {
    // In a real implementation, this would store the player data in the database
    console.log(`Simulated storing data for player ${playerId}`);
    
    // Add a small delay to simulate storage operations
    await new Promise(resolve => setTimeout(resolve, 50));
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
    
    // Generate mock statistics
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
    this.config.enabled = true;
    await this.storage.updateCrawlerConfig(this.config);
    
    this.addLog("Control", "Crawler manually started", true);
    
    // Start immediately
    if (this.status.status !== "running") {
      this.startCrawl();
    }
  }
  
  public async pause(): Promise<void> {
    this.config.enabled = false;
    await this.storage.updateCrawlerConfig(this.config);
    
    // Flag to abort current crawl
    this.abortCrawl = true;
    
    // Clear scheduled crawl
    if (this.crawlTimer) {
      clearTimeout(this.crawlTimer);
      this.crawlTimer = null;
    }
    
    this.status.status = "paused";
    this.addLog("Control", "Crawler manually paused", true);
  }
  
  public async updateConfig(newConfig: Partial<CrawlerConfig>): Promise<void> {
    // Update config with new values
    this.config = { ...this.config, ...newConfig };
    
    // Save to storage
    await this.storage.updateCrawlerConfig(this.config);
    
    // Update total players count
    this.status.totalPlayers = this.config.player_id_end - this.config.player_id_start;
    
    // Log configuration update
    this.addLog("Config", "Crawler configuration updated", true);
    
    // If we're enabling the crawler and it's not already running, schedule a crawl
    if (this.config.enabled && this.status.status !== "running") {
      this.scheduleNextCrawl(5000); // Start in 5 seconds
    }
  }
}