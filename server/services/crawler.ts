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
    player_id_start: 0, // We will ONLY use player IDs from relationships, not sequential scanning
    player_id_end: 0,   // We will ONLY use player IDs from relationships, not sequential scanning
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
    // Initialize in a simpler mode that won't start automatically
    try {
      this.config.enabled = false;
      this.status.status = "idle";
      this.abortCrawl = false;
      
      // Reset all counters
      this.status.indexedPlayers = 0;
      this.status.totalPlayers = 0;
      this.status.crawlSpeed = 0;
      
      // Clear all data structures
      this.playerQueue.clear();
      this.processedPlayers.clear();
      this.discoveredFactions.clear();
      this.discoveredCompanies.clear();
      
      // Set next scheduled run to never (user must start manually)
      this.status.nextScheduledRun = 0;
      
      // Initialize with empty state
      this.currentPosition = 0;
      
      console.log("Crawler initialized in clean state");
      this.addLog("Initialization", "Crawler initialized and ready - waiting for user login", true);
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
  /**
   * Auto-start the crawler with a specific user's API key and Torn ID
   * This immediately begins processing player relationships
   */
  public async autoStart(apiKey: string, tornPlayerId: number): Promise<void> {
    if (this.status.status === "running") {
      // Already running - don't restart
      return;
    }
    
    if (!apiKey) {
      throw new Error("No API key provided for crawler");
    }
    
    // Setup crawler for intelligent relationship discovery
    this.config.enabled = true;
    this.status.status = "running";
    this.abortCrawl = false;
    this.currentPosition = 0; // Completely reset the sequential scan position
    
    // Reset tracking data
    this.status.indexedPlayers = 0;
    this.status.totalPlayers = 1; // Start with just your ID, will increase as we discover relationships
    this.status.crawlSpeed = 0;
    this.currentApiKey = apiKey;
    
    // Clear previous data
    this.playerQueue.clear();
    this.processedPlayers.clear();
    this.discoveredFactions.clear();
    this.discoveredCompanies.clear();
    
    // Override the config to disable sequential scanning
    this.config.player_id_start = 0;
    this.config.player_id_end = 0;
        
    // Add the specified Torn player ID as our ONLY starting point
    this.queuePlayer(tornPlayerId);
    
    this.addLog("Control", `Crawler auto-started with YOUR player ID ${tornPlayerId}`, true);
    
    // Begin processing immediately in the background
    setImmediate(async () => {
      try {
        // First, let's get the player's data directly to ensure we have company/faction info
        const userData = await this.tornAPI.getPlayerStats(apiKey, tornPlayerId);
        
        if (userData) {
          this.addLog("Process", `Starting with ${userData.name} (ID: ${tornPlayerId})`, true);
          
          // Process company relationships if available
          if (userData.company && userData.company.id) {
            const companyId = userData.company.id;
            this.addLog("Discover", `Found your company: ${userData.company.name} (ID: ${companyId})`, true);
            
            try {
              // Get the company detailed data with real employee list
              const companyData = await this.tornAPI.getCompanyDetailedData(apiKey);
              const employees = companyData?.employees || {};
              
              // Queue all real company employees (not sequential IDs)
              const employeeIds = Object.keys(employees);
              this.addLog("Process", `Processing ${employeeIds.length} real company employees`, true);
              
              for (const empId of employeeIds) {
                const realEmployeeId = parseInt(empId, 10);
                if (!isNaN(realEmployeeId) && realEmployeeId > 0) {
                  this.queuePlayer(realEmployeeId);
                  this.addLog("Queue", `Added real employee ID ${realEmployeeId} (${employees[empId].name})`, true);
                }
              }
            } catch (compErr) {
              this.addLog("Warning", `Error getting company data: ${compErr}`, false);
            }
          }
          
          // Process faction relationships if available
          if (userData.faction && userData.faction.id) {
            const factionId = userData.faction.id;
            this.addLog("Discover", `Found your faction: ${userData.faction.name} (ID: ${factionId})`, true);
            
            try {
              // Get faction data with real member list
              const factionData = await this.tornAPI.getFactionDetailedData(apiKey);
              if (factionData?.members) {
                const memberIds = Object.keys(factionData.members);
                this.addLog("Process", `Processing ${memberIds.length} real faction members`, true);
                
                for (const memId of memberIds) {
                  const realMemberId = parseInt(memId, 10);
                  if (!isNaN(realMemberId) && realMemberId > 0) {
                    this.queuePlayer(realMemberId);
                    this.addLog("Queue", `Added real faction member ID ${realMemberId} (${factionData.members[memId].name})`, true);
                  }
                }
              }
            } catch (factionErr) {
              this.addLog("Warning", `Error getting faction data: ${factionErr}`, false);
            }
          }
        }
        
        // Now process the queue with real player IDs
        await this.processPlayerQueue();
      } catch (error) {
        console.error("Crawler processing error:", error);
        this.status.status = "error";
        this.status.error = error instanceof Error ? error.message : "Unknown error during crawl";
        this.addLog("Error", `Crawler error: ${this.status.error}`, false);
      }
    });
    
    return Promise.resolve();
  }
  
  // Real API key to use for all crawler operations - set during start()
  private currentApiKey: string = "";

  private async processSinglePlayer(playerId: number): Promise<void> {
    try {
      // Use the API key set during autoStart()
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
        
        // Update the total players count as we discover relationships
        this.status.totalPlayers = this.processedPlayers.size + this.playerQueue.size;
        
        // Extract and queue faction relationships if the player has a faction
        if (playerData.faction && typeof playerData.faction === 'object' && playerData.faction !== null) {
          const factionId = playerData.faction.id;
          if (factionId && !this.discoveredFactions.has(factionId)) {
            this.addLog("Discover", `Found new faction: ${playerData.faction.name} (ID: ${factionId})`, true);
            this.discoveredFactions.add(factionId);
            
            // Try to get the faction's member list
            try {
              // Use the FactionData endpoint to get members
              const factionData = await this.tornAPI.getFactionData(apiKey, false);
              
              // Extract faction members (need to handle different API response formats)
              const members = factionData.members || {};
              
              // Queue all faction members for processing
              const memberCount = Object.keys(members).length;
              this.addLog("Process", `Adding ${memberCount} faction members to queue`, true);
              
              for (const memberId in members) {
                const memberIdNum = parseInt(memberId, 10);
                if (!isNaN(memberIdNum) && memberIdNum > 0) {
                  this.queuePlayer(memberIdNum);
                }
              }
            } catch (factionError) {
              // Just log the error and continue - don't stop the entire crawler for one faction
              this.addLog("Warning", `Couldn't process faction ${factionId}: ${factionError}`, false);
            }
          }
        }
        
        // Extract and queue company relationships if the player has a company
        if (playerData.company && typeof playerData.company === 'object' && playerData.company !== null) {
          const companyId = playerData.company.id;
          if (companyId && !this.discoveredCompanies.has(companyId)) {
            this.addLog("Discover", `Found new company: ${playerData.company.name} (ID: ${companyId})`, true);
            this.discoveredCompanies.add(companyId);
            
            // Try to get the company's employee list
            try {
              // Use the CompanyData endpoint to get employees
              const companyData = await this.tornAPI.getCompanyData(apiKey);
              
              // Extract company employees
              const employees = companyData.employees || {};
              
              // Queue all employees for processing
              const employeeCount = Object.keys(employees).length;
              this.addLog("Process", `Adding ${employeeCount} company employees to queue`, true);
              
              for (const employeeId in employees) {
                const employeeIdNum = parseInt(employeeId, 10);
                if (!isNaN(employeeIdNum) && employeeIdNum > 0) {
                  this.queuePlayer(employeeIdNum);
                }
              }
            } catch (companyError) {
              // Just log the error and continue - don't stop the entire crawler
              this.addLog("Warning", `Couldn't process company ${companyId}: ${companyError}`, false);
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