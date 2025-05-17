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
    player_id_start: 100000, // Start with a more reasonable ID range
    player_id_end: 2500000,
    request_delay_ms: 2000, // Slow down requests to respect API limits
    batch_size: 20, // Process smaller batches for stability
    max_concurrent_requests: 1 // Process sequentially to avoid overwhelming the API
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
  
  // Queue of player IDs to process (starts with the logged-in user)
  private playerQueue: Set<number> = new Set();
  private processedPlayers: Set<number> = new Set();
  private discoveredFactions: Set<number> = new Set();
  private discoveredCompanies: Set<number> = new Set();
  
  // Add a player to the processing queue if not already processed
  private queuePlayer(playerId: number): void {
    if (!this.processedPlayers.has(playerId) && !this.playerQueue.has(playerId)) {
      this.playerQueue.add(playerId);
      this.addLog("Queue", `Added player ID ${playerId} to the queue`, true);
    }
  }

  public async start(userApiKey?: string, userId?: number): Promise<void> {
    if (this.status.status === "running") {
      throw new Error("Crawler is already running");
    }
    
    this.config.enabled = true;
    this.status.status = "running";
    this.abortCrawl = false;
    
    // Reset tracking data
    this.status.indexedPlayers = 0;
    this.status.totalPlayers = 100; // Start with smaller estimate, will grow as we discover
    this.status.crawlSpeed = 0;
    this.playerQueue.clear();
    this.processedPlayers.clear();
    this.discoveredFactions.clear();
    this.discoveredCompanies.clear();
    
    // Use the user's API key if provided, otherwise fallback to admin key
    const apiKey = userApiKey || "fvgfbmJ3IT7ksiMm";
    
    // Store the API key for all crawler operations
    this.currentApiKey = apiKey;
    
    this.addLog("Control", `Crawler started in smart mode - will discover relationships from the API`, true);
    
    // Launch the crawler in the background to avoid blocking the API response
    setTimeout(async () => {
      try {
        // Start by getting the admin user's data which we know exists
        this.addLog("Process", "Starting crawl with the admin user's profile", true);
        
        // First, get the admin's own data to seed the crawler
        try {
          const adminData = await this.tornAPI.getPlayerStats(apiKey);
          this.addLog("Process", `Starting with admin user: ${adminData.name} (ID: ${adminData.player_id})`, true);
          
          // Queue the admin ID as our starting point
          this.queuePlayer(adminData.player_id);
          
          // If admin is in a faction, queue all faction members
          if (adminData.faction) {
            this.addLog("Process", `Admin is in faction: ${adminData.faction.name} (ID: ${adminData.faction.id})`, true);
            this.discoveredFactions.add(adminData.faction.id);
            
            // Get faction data including members
            try {
              const factionData = await this.tornAPI.getFactionData(apiKey, false);
              this.addLog("Process", `Got faction data with ${Object.keys(factionData.members || {}).length} members`, true);
              
              // Queue all faction members
              if (factionData.members) {
                for (const memberId in factionData.members) {
                  this.queuePlayer(parseInt(memberId, 10));
                }
              }
            } catch (factionError) {
              this.addLog("Warning", `Error getting faction data: ${factionError}`, false);
            }
          }
          
          // If admin is in a company, queue all employees
          if (adminData.company) {
            this.addLog("Process", `Admin is in company: ${adminData.company.name} (ID: ${adminData.company.id})`, true);
            this.discoveredCompanies.add(adminData.company.id);
            
            // Get company data including employees
            try {
              const companyData = await this.tornAPI.getCompanyDetailedData(apiKey);
              this.addLog("Process", `Got company data with employees`, true);
              
              // Queue all employees (their IDs are found in the API response)
              if (companyData && companyData.employees) {
                for (const employeeId in companyData.employees) {
                  this.queuePlayer(parseInt(employeeId, 10));
                }
              }
            } catch (companyError) {
              this.addLog("Warning", `Error getting company data: ${companyError}`, false);
            }
          }
          
          // Begin processing the queue
          await this.processPlayerQueue();
          
        } catch (adminError) {
          this.addLog("Error", `Failed to get admin data: ${adminError}`, false);
          this.status.status = "error";
        }
      } catch (error: any) {
        this.status.status = "error";
        this.status.error = error?.message || "Failed to start crawler";
        this.addLog("Error", `Crawler start failed: ${this.status.error}`, false);
      }
    }, 100);
    
    return Promise.resolve();
  }
  
  // Process the queue of player IDs
  private async processPlayerQueue(): Promise<void> {
    this.addLog("Process", `Starting to process player queue with ${this.playerQueue.size} players`, true);
    
    try {
      // Process players from the queue
      while (this.playerQueue.size > 0 && this.status.status === "running" && !this.abortCrawl) {
        // Get the next player from the queue
        const playerId = this.playerQueue.values().next().value;
        this.playerQueue.delete(playerId);
        
        // Skip if already processed
        if (this.processedPlayers.has(playerId)) {
          continue;
        }
        
        try {
          // Process this player and discover relationships
          await this.processSinglePlayer(playerId);
          
          // Mark as processed
          this.processedPlayers.add(playerId);
          
          // Update statistics
          this.status.indexedPlayers = this.processedPlayers.size;
          this.status.lastUpdated = Date.now();
          
          // Calculate crawl speed (players per minute)
          const elapsedSeconds = (Date.now() - this.status.lastUpdated) / 1000 || 1;
          this.status.crawlSpeed = Math.round(60 / elapsedSeconds); // per minute
          
          // Add a delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, this.config.request_delay_ms));
        } catch (error: any) {
          this.addLog("Warning", `Error processing player ${playerId}: ${error?.message}`, false);
          // Continue with next player even if this one fails
        }
      }
      
      // Finished processing or was stopped
      if (this.status.status === "running") {
        this.status.status = "idle";
      }
      
      const totalEntities = this.processedPlayers.size + this.discoveredFactions.size + this.discoveredCompanies.size;
      this.addLog("Process", `Crawl complete. Processed ${this.processedPlayers.size} players, ${this.discoveredFactions.size} factions, ${this.discoveredCompanies.size} companies`, true);
      
      // Schedule next run
      this.status.nextScheduledRun = Date.now() + (this.config.crawl_interval_minutes * 60 * 1000);
      this.scheduleCrawl();
    } catch (error: any) {
      this.status.status = "error";
      this.status.error = error?.message || "Unknown error";
      this.addLog("Error", `Processing failed: ${this.status.error}`, false);
    }
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
  
  // Method for updating user data when an admin logs in
  public async updateUserData(userId: number, apiKey: string): Promise<void> {
    if (!apiKey) {
      return;
    }
    
    try {
      // Get the user's data to add to our discovery queue
      const userData = await this.tornAPI.getPlayerStats(apiKey);
      
      if (userData && userData.player_id) {
        // Add user to our processing queue
        this.queuePlayer(userData.player_id);
        
        // Add faction and company relationships if available
        if (userData.faction && userData.faction.id) {
          this.discoveredFactions.add(userData.faction.id);
        }
        
        if (userData.company && userData.company.id) {
          this.discoveredCompanies.add(userData.company.id);
        }
        
        this.addLog("Update", `Added user ${userData.name} (ID: ${userData.player_id}) to discovery queue`, true);
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  }
  
  // Real API key to use for all crawler operations - set during start()
  private currentApiKey: string = "";

  private async processSinglePlayer(playerId: number): Promise<void> {
    try {
      // Use the API key set during start()
      const apiKey = this.currentApiKey;
      
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
        this.addLog("Process", `Processed player ${playerId}: ${playerData.name} (Level ${playerData.level})`, true);
        
        // Extract and queue faction relationships
        if (playerData.faction && typeof playerData.faction === 'object' && playerData.faction !== null) {
          const factionId = playerData.faction.id;
          if (factionId && !this.discoveredFactions.has(factionId)) {
            this.addLog("Discover", `Found new faction: ${playerData.faction.name} (ID: ${factionId})`, true);
            this.discoveredFactions.add(factionId);
            
            // Try to get the faction members, but don't stop if it fails
            try {
              // Get faction members data from a separate endpoint
              const factionData = await this.tornAPI.getFactionData(apiKey, false);
              if (factionData && factionData.members) {
                this.addLog("Process", `Processing ${Object.keys(factionData.members).length} faction members`, true);
                
                // Queue all faction members for processing
                for (const memberId in factionData.members) {
                  const memberIdNum = parseInt(memberId, 10);
                  if (!isNaN(memberIdNum) && memberIdNum > 0) {
                    this.queuePlayer(memberIdNum);
                  }
                }
              }
            } catch (factionError) {
              // Just log the error and continue
              this.addLog("Warning", `Couldn't get faction members: ${factionError}`, false);
            }
          }
        }
        
        // Extract and queue company relationships
        if (playerData.company && typeof playerData.company === 'object' && playerData.company !== null) {
          const companyId = playerData.company.id;
          if (companyId && !this.discoveredCompanies.has(companyId)) {
            this.addLog("Discover", `Found new company: ${playerData.company.name} (ID: ${companyId})`, true);
            this.discoveredCompanies.add(companyId);
            
            // Try to get the company employees, but don't stop if it fails
            try {
              // Get company data from a separate endpoint
              const companyData = await this.tornAPI.getCompanyData(apiKey);
              if (companyData && companyData.employees) {
                this.addLog("Process", `Processing company employees`, true);
                
                // Queue all company employees for processing
                for (const employeeId in companyData.employees) {
                  const employeeIdNum = parseInt(employeeId, 10);
                  if (!isNaN(employeeIdNum) && employeeIdNum > 0) {
                    this.queuePlayer(employeeIdNum);
                  }
                }
              }
            } catch (companyError) {
              // Just log the error and continue
              this.addLog("Warning", `Couldn't get company employees: ${companyError}`, false);
            }
          }
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