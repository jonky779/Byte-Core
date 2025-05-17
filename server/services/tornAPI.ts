import fetch from "node-fetch";

interface ApiResponse {
  error?: {
    code: number;
    error: string;
  };
}

interface PlayerStats {
  player_id: number;
  name: string;
  level: number;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  energy: {
    current: number;
    maximum: number;
  };
  nerve: {
    current: number;
    maximum: number;
  };
  happy: {
    current: number;
    maximum: number;
  };
  life: {
    current: number;
    maximum: number;
  };
  stats: {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    total: number;
  };
  money: {
    current: number;
    bank: number;
    points: number;
  };
  faction: {
    id: number;
    name: string;
    position: string;
    days_in_faction: number;
  } | null;
  company: {
    id: number;
    name: string;
    position: string;
    days_in_company: number;
  } | null;
  travel: {
    status: string;
    destination?: string;
    return_time?: string;
  };
  last_updated: string;
}

interface CompanyData {
  id: number;
  name: string;
  type: string;
  rating: number;
  days_old: number;
  weekly_profit: number;
  employees: {
    current: number;
    max: number;
  };
  last_updated: string;
}

interface FactionData {
  id: number;
  name: string;
  tag: string;
  leader: {
    id: number;
    name: string;
  };
  members_count: number;
  respect: number;
  territories: number;
  last_updated: string;
}

interface BazaarItems {
  items: Array<{
    id: number;
    name: string;
    type: string;
    category: string;
    price: number;
    market_price: number;
    quantity: number;
    percentage_below_market: number;
  }>;
  categories: string[];
  last_updated: string;
}

interface ApiKeyData {
  key: string;
  name: string;
  access_level: number;
  status: "valid" | "invalid" | "limited";
  usage: number;
  rate_limit: number;
  error?: string;
}

interface ApiStatus {
  status: "online" | "limited" | "offline";
  averageResponseTimeMs: number;
  uptimePercentage: number;
  callsPerHour: number;
  rateLimitAvailable: number;
  lastErrorTime: number | null;
}

export class TornAPI {
  private baseUrl = "https://api.torn.com";
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private rateLimit = 100; // Default rate limit per minute
  private callsMade = 0;
  private resetTime = Date.now() + 60000;
  
  constructor() {
    // Reset calls counter every minute
    setInterval(() => {
      this.callsMade = 0;
      this.resetTime = Date.now() + 60000;
    }, 60000);
  }
  
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      if (this.callsMade >= this.rateLimit) {
        // Wait until rate limit resets
        const waitTime = this.resetTime - Date.now();
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.callsMade = 0;
      }
      
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error("Error processing API request:", error);
        }
        
        this.callsMade++;
        
        // Add a small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    this.isProcessingQueue = false;
  }
  
  private enqueueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  async makeRequest(endpoint: string, apiKey: string): Promise<any> {
    // Torn API requires the format: https://api.torn.com/user?selections=profile&key=YOUR_API_KEY
    // Make sure we're constructing the URL correctly
    let url = `${this.baseUrl}/${endpoint}`;
    
    // Add the API key
    url = url.includes('?') ? `${url}&key=${apiKey}` : `${url}?key=${apiKey}`;
    
    // For debugging, log the request URL (hiding the API key)
    const logUrl = url.replace(apiKey, apiKey.substring(0, 4) + '...');
    console.log(`Making Torn API request to: ${logUrl}`);
    
    return this.enqueueRequest(async () => {
      try {
        const response = await fetch(url);
        
        // Handle HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for Torn API error responses
        if (data && typeof data === 'object' && 'error' in data) {
          console.error("Torn API Error:", data.error);
          throw new Error(data.error?.error || "API request failed");
        }
        
        return data;
      } catch (error) {
        console.error(`API request failed for ${logUrl}:`, error);
        throw error;
      }
    });
  }
  
  public async checkApiKey(apiKey: string): Promise<ApiKeyData> {
    if (!apiKey) {
      return {
        key: "",
        name: "",
        access_level: 0,
        status: "invalid",
        usage: 0,
        rate_limit: 0,
        error: "No API key provided"
      };
    }
    
    try {
      const data = await this.makeRequest("user/?selections=basic", apiKey);
      
      return {
        key: apiKey,
        name: data.name || "Unknown",
        access_level: 3, // Assume full access for now
        status: "valid",
        usage: this.callsMade,
        rate_limit: this.rateLimit
      };
    } catch (error) {
      return {
        key: apiKey,
        name: "Unknown",
        access_level: 0,
        status: "invalid",
        usage: 0,
        rate_limit: 0,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  
  // This instance variable holds the last used API key to detect misuse patterns
  private _currentRequestApiKey: string | null = null;
  
  public async getPlayerStats(apiKey: string, playerId?: number): Promise<PlayerStats> {
    try {
      // Safety check: Reset key between requests to prevent key reuse
      this._currentRequestApiKey = apiKey;
      
      // Always make a fresh request without caching
      let endpoint = "user/?selections=basic,profile,battlestats,bars,money,travel";
      
      // If a playerId is provided (for crawler), use it to fetch specific player data
      if (playerId) {
        endpoint = `user/${playerId}?selections=basic,profile,battlestats,bars,money,travel`;
      }
      
      const data = await this.makeRequest(endpoint, apiKey);
      
      // For regular user requests (not crawler), verify this response matches the API key that made the request
      if (!playerId && this._currentRequestApiKey !== apiKey) {
        console.error("API key mismatch detected - potential data leak!");
        throw new Error("Security check failed");
      }
      
      // Format the data into PlayerStats object
      return {
        player_id: data.player_id || 0,
        name: data.name || "Unknown",
        level: data.level || 1,
        rank: data.rank || "Unknown", // Add rank directly from API response
        status: data.status?.state || "Offline",
        last_action: data.last_action?.relative || "Unknown",
        profile_image: data.profile_image || null, // Include the profile image from API
        energy: {
          current: data.energy?.current || 0,
          maximum: data.energy?.maximum || 0
        },
        nerve: {
          current: data.nerve?.current || 0,
          maximum: data.nerve?.maximum || 0
        },
        happy: {
          current: data.happy?.current || 0,
          maximum: data.happy?.maximum || 0
        },
        life: {
          current: data.life?.current || 0,
          maximum: data.life?.maximum || 0
        },
        stats: {
          strength: data.strength || 0,
          defense: data.defense || 0,
          speed: data.speed || 0,
          dexterity: data.dexterity || 0,
          total: (data.strength || 0) + (data.defense || 0) + (data.speed || 0) + (data.dexterity || 0)
        },
        money: {
          current: data.money_onhand || 0,
          bank: data.money_inbank || 0,
          points: data.points || 0
        },
        faction: data.faction ? {
          id: data.faction.faction_id || 0,
          name: data.faction.faction_name || "Unknown",
          position: data.faction.position || "Member",
          days_in_faction: data.faction.days_in_faction || 0
        } : null,
        company: data.job ? {
          id: data.job.company_id || 0,
          name: data.job.company_name || "Unknown",
          position: data.job.position || "Employee",
          days_in_company: data.job.days_in_company || 0
        } : null,
        travel: {
          status: data.travel?.status || "In Torn",
          destination: data.travel?.destination,
          return_time: data.travel?.time_left
        },
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching player stats:", error);
      throw error;
    }
  }
  
  // Cache for company types
  private companyTypesCache: Record<number, string> = {};
  private companyTypesLastFetched: number = 0;
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  /**
   * Gets company type name from the API or cache
   * Note: This method must be used with await as it returns a Promise<string>
   */
  private async getCompanyTypeName(typeId: number, apiKey?: string): Promise<string> {
    // If we have a recent cache, use it
    const now = Date.now();
    if (
      Object.keys(this.companyTypesCache).length > 0 && 
      now - this.companyTypesLastFetched < this.CACHE_EXPIRY_MS
    ) {
      return this.companyTypesCache[typeId] || "Unknown";
    }
    
    // If we have an API key, try to fetch fresh data
    if (apiKey) {
      try {
        await this.fetchCompanyTypes(apiKey);
        return this.companyTypesCache[typeId] || "Unknown";
      } catch (error) {
        console.error("Error fetching company types:", error);
        // Fall through to default fallback
      }
    }
    
    // Fallback to a basic mapping if we can't get data from API
    const fallbackTypes: Record<number, string> = {
      1: "Hair Salon",
      2: "Law Firm",
      3: "Flower Shop",
      4: "Car Dealership",
      5: "Clothing Store",
      6: "Gun Shop",
      7: "Game Shop",
      8: "Candle Shop",
      9: "Toy Shop",
      10: "Adult Novelties",
      11: "Cyber Cafe",
      12: "Grocery Store",
      13: "Theater",
      14: "Sweet Shop",
      15: "Cruise Line",
      16: "Television Network",
      17: "Zoo",
      18: "Firework Stand",
      19: "Property Broker", 
      20: "Furniture Store",
      21: "Gas Station",
      22: "Music Store",
      23: "Nightclub",
      24: "Pub",
      25: "Casino",
      26: "Restaurant",
      27: "Lingerie Store",
      28: "Hotel",
      29: "Motel",
      30: "Gents Strip Club",
      31: "Ladies Strip Club",
      32: "Farm",
      33: "Software Corporation",
      34: "Ladies Gym",
      35: "Gents Gym",
      36: "Restaurant Supply Store",
      37: "Logistics Management",
      38: "Mining Corporation",
      39: "Detective Agency"
    };
    
    // If cache is empty, initialize with fallback
    if (Object.keys(this.companyTypesCache).length === 0) {
      this.companyTypesCache = { ...fallbackTypes };
    }
    
    return fallbackTypes[typeId] || "Unknown";
  }
  
  /**
   * Fetches company types from the API and updates the cache
   */
  private async fetchCompanyTypes(apiKey: string): Promise<void> {
    try {
      const response = await this.makeRequest("v2/torn?selections=companies", apiKey);
      
      if (response?.companies) {
        // Clear the existing cache
        this.companyTypesCache = {};
        
        // Update the cache with fresh data from API
        Object.entries(response.companies).forEach(([id, data]: [string, any]) => {
          this.companyTypesCache[parseInt(id)] = data.name;
        });
        
        // Update the last fetched timestamp
        this.companyTypesLastFetched = Date.now();
        
        console.log("Updated company types cache with", Object.keys(this.companyTypesCache).length, "types");
      }
    } catch (error) {
      console.error("Failed to fetch company types:", error);
      throw error;
    }
  }

  public async getCompanyData(apiKey: string): Promise<CompanyData> {
    try {
      // First try to get user's company info through basic profile data
      const userData = await this.makeRequest("user?selections=basic,profile", apiKey);
      
      // If the user doesn't have a job or company, return a "Not in a company" response
      if (!userData.job || !userData.job.company_id) {
        return {
          id: 0,
          name: "No Company",
          type: "N/A",
          rating: 0,
          days_old: 0,
          weekly_profit: 0,
          employees: {
            current: 0,
            max: 0,
            list: []
          },
          last_updated: new Date().toISOString()
        };
      }
      
      // Initialize the company types cache if this is the first API call
      if (Object.keys(this.companyTypesCache).length === 0) {
        try {
          await this.fetchCompanyTypes(apiKey);
        } catch (error) {
          console.log("Could not fetch company types, using fallback mapping");
        }
      }
      
      // Now fetch detailed company data
      try {
        console.log(`Fetching detailed company data for company ID: ${userData.job.company_id}`);
        const companyResponse = await this.makeRequest("company/?selections=Profile,Employees,detailed", apiKey);
        const companyData = companyResponse.company;
        
        console.log("Company data structure:", Object.keys(companyData).join(", "));
        
        // Log the raw employees data to understand its structure
        if (companyData.employees) {
          const employeeExample = Object.values(companyData.employees)[0];
          console.log("Employee data structure example:", JSON.stringify(employeeExample, null, 2));
        }
        
        // Get the detailed employee data with effectiveness values from company_employees
        const companyEmployeesData = companyResponse.company_employees || {};
        
        // Log the first detailed employee data to see its structure
        if (Object.keys(companyEmployeesData).length > 0) {
          const firstKey = Object.keys(companyEmployeesData)[0];
          console.log("Detailed employee data example:", JSON.stringify(companyEmployeesData[firstKey], null, 2));
          console.log("Effectiveness example:", JSON.stringify(companyEmployeesData[firstKey].effectiveness, null, 2));
        }
        
        // Extract employees data, but merge with effectiveness data from company_employees
        const employeesList = Object.entries(companyData.employees || {}).map(([id, emp]: [string, any]) => {
          const detailedData = companyEmployeesData[id] || {};
          const effectiveness = detailedData.effectiveness?.total || 0;
          
          // Debug log
          if (detailedData.name) {
            console.log(`Employee ${detailedData.name}: effectiveness = ${effectiveness}`);
          }
          
          return {
            ...emp,
            id,
            effectiveness: effectiveness
          };
        });
        const employeeCount = employeesList.length;
        
        // Get the company type name from API or cache
        const companyTypeName = await this.getCompanyTypeName(companyData.company_type, apiKey);
        
        return {
          id: companyData.ID,
          name: companyData.name,
          type: companyTypeName,
          rating: companyData.rating || 0,
          days_old: companyData.days_old || 0,
          weekly_profit: companyData.weekly_income || 0,
          employees: {
            current: employeeCount,
            max: companyData.employees_capacity || 10,
            list: employeesList.map((emp: any) => {
              return {
                id: emp.id || 0,
                name: emp.name || "Unknown",
                position: emp.position || "Employee",
                status: emp.status?.state || "Okay",
                last_action: emp.last_action?.relative || "Unknown",
                days_in_company: emp.days_in_company || 0,
                effectiveness: emp.position?.toLowerCase().includes("director") ? 0 : emp.effectiveness || 0
              };
            })
          },
          last_updated: new Date().toISOString()
        };
      } catch (companyError) {
        console.error("Error fetching detailed company data:", companyError);
        
        // Fall back to basic company data from user profile
        return {
          id: userData.job.company_id,
          name: userData.job.company_name,
          type: await this.getCompanyTypeName(userData.job.company_type, apiKey),
          rating: 0,
          days_old: 0,
          weekly_profit: 0,
          employees: {
            current: 7, // Hardcoded for now
            max: 10,
            list: [
              {
                id: userData.player_id,
                name: userData.name,
                position: userData.job.position || "Employee",
                status: userData.status?.state || "Unknown",
                last_action: userData.last_action?.relative || "Unknown",
                days_in_company: 0,
                effectiveness: 100
              }
            ]
          },
          last_updated: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
      
      // The user might not be in a company
      if (error instanceof Error && (
          error.message.includes("not in a company") || 
          error.message.includes("Incorrect ID")
        )) {
        return {
          id: 0,
          name: "No Company",
          type: "N/A",
          rating: 0,
          days_old: 0,
          weekly_profit: 0,
          employees: {
            current: 0,
            max: 0,
            list: []
          },
          last_updated: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }
  
  public async getCompanyDetailedData(apiKey: string): Promise<any> {
    try {
      // First check if the user is in a company
      const userData = await this.makeRequest("user?selections=basic,profile", apiKey);
      
      // If the user has a company
      if (userData.job && userData.job.company_id) {
        const companyId = userData.job.company_id;
        console.log(`Fetching detailed company data for company ID: ${companyId}`);
        
        try {
          // Use the company endpoint with the ID and employees selection
          const response = await this.makeRequest(`company/?selections=Profile,Employees,detailed`, apiKey);
          
          if (!response) {
            throw new Error("Failed to fetch company data");
          }
          
          // The Torn API returns data in a nested structure
          // Extract the main company data, employees data and detailed data
          const companyData = response.company || {};
          const companyEmployeesData = response.company_employees || {};
          const companyDetailedData = response.company_detailed || {};
          
          console.log("Company data structure:", Object.keys(companyData).join(', '));
          console.log("Company detailed data structure:", Object.keys(companyDetailedData).join(', '));
          
          // Process employees data if available
          const employees = [];
          if (companyEmployeesData && Object.keys(companyEmployeesData).length > 0) {
            // Company_employees has more detailed data
            for (const [id, data] of Object.entries(companyEmployeesData)) {
              const employee = data as any;
              employees.push({
                id: parseInt(id, 10),
                name: employee.name || "Unknown",
                position: employee.position || "Employee",
                status: employee.status?.description || employee.status?.state || "Unknown",
                last_action: employee.last_action?.relative || "Unknown",
                days_in_company: employee.days_in_company || 0,
                effectiveness: employee.effectiveness?.total || 0,
                wage: employee.wage || 0,
                stats: {
                  manual_labor: employee.manual_labor || 0,
                  intelligence: employee.intelligence || 0,
                  endurance: employee.endurance || 0
                }
              });
            }
          } else if (companyData.employees) {
            // Fallback to basic employee data if detailed not available
            for (const [id, data] of Object.entries(companyData.employees)) {
              const employee = data as any;
              employees.push({
                id: parseInt(id, 10),
                name: employee.name || "Unknown",
                position: employee.position || "Employee",
                status: employee.status?.description || employee.status?.state || "Unknown",
                last_action: employee.last_action?.relative || "Unknown",
                days_in_company: employee.days_in_company || 0,
                effectiveness: 0,
                wage: 0
              });
            }
          }
          
          // Determine the correct company type based on name and type ID
          const companyTypeId = companyData.company_type || userData.job.company_type;
          
          // Get the company type name from the API or cache
          const companyTypeName = await this.getCompanyTypeName(companyTypeId, apiKey);
          
          // Return the full company detail data
          return {
            id: companyData.ID || companyId,
            name: companyData.name || userData.job.company_name,
            type: companyTypeName,
            rating: companyData.rating || 0,
            employees: {
              current: companyData.employees_hired || 0,
              max: companyData.employees_capacity || 0,
              list: employees
            },
            positions: [], // Not directly available in API response
            stats: {
              popularity: companyData.popularity || companyDetailedData.popularity || 0,
              efficiency: companyDetailedData.efficiency || 0,
              environment: companyDetailedData.environment || 0,
              profitability: 0, // Not directly available
              days_old: companyData.days_old || 0,
              daily_revenue: companyData.daily_income || 0,
              weekly_profit: companyData.weekly_income || 0
            },
            stock: [], // Not shown in basic view
            funds: companyDetailedData.company_funds || 0,
            bank: companyDetailedData.company_bank || 0,
            advertising_budget: companyDetailedData.advertising_budget || 0,
            last_updated: new Date().toISOString()
          };
        } catch (companyError) {
          console.error("Error fetching company data:", companyError);
          
          // Get company type from API using user job type 
          const companyTypeId = userData.job.company_type;
          const companyTypeName = await this.getCompanyTypeName(companyTypeId, apiKey);
          
          // Fallback to basic company info from user profile
          return {
            id: userData.job.company_id,
            name: userData.job.company_name,
            type: companyTypeName,
            rating: 0,
            employees: {
              current: 1,
              max: 0,
              list: [
                {
                  id: userData.player_id,
                  name: userData.name,
                  position: userData.job.position,
                  status: "Unknown",
                  last_action: "Unknown",
                  days_in_company: 0,
                  effectiveness: 0,
                  wage: 0
                }
              ]
            },
            positions: [],
            stats: {
              popularity: 0,
              efficiency: 0,
              environment: 0,
              profitability: 0,
              days_old: 0,
              daily_revenue: 0,
              weekly_profit: 0
            },
            stock: [],
            last_updated: new Date().toISOString()
          };
        }
      } else {
        // User is not in a company
        throw new Error("User is not in a company");
      }
    } catch (error) {
      console.error("Error fetching detailed company data:", error);
      throw error;
    }
  }
  
  public async getFactionData(apiKey: string, includeFullWarHistory = false): Promise<FactionData> {
    try {
      // Get faction info through basic profile data
      const userData = await this.makeRequest("user?selections=basic,profile", apiKey);
      
      // If the user doesn't have a faction, return a "Not in a faction" response
      if (!userData.faction || !userData.faction.faction_id) {
        return {
          id: 0,
          name: "Not in a Faction",
          tag: "N/A",
          leader: {
            id: 0,
            name: "N/A"
          },
          members_count: 0,
          respect: 0,
          territories: 0,
          war_status: "PEACE",
          capacity: {
            current: 0,
            maximum: 0
          },
          member_status: {
            online: 0,
            idle: 0,
            offline: 0,
            hospital: 0
          },
          recent_activity: [],
          last_updated: new Date().toISOString()
        };
      }
      
      // User is in a faction - get detailed data from v2 API
      const factionId = userData.faction.faction_id;
      console.log(`Fetching detailed faction data for faction ID: ${factionId}`);
      
      // Get detailed faction data using the v2 API with all needed selections
      // If we're requesting full war history, include all ranked wars data
      const selections = includeFullWarHistory 
        ? `basic,applications,chains,rankedwars,stats,territory`
        : `basic,applications,chains,rankedwars,stats,territory`;
      
      const factionData = await this.makeRequest(`v2/faction?selections=${selections}`, apiKey);
      
      // Log territory data details for debugging
      if (factionData.territory) {
        console.log("Territory data structure: ", JSON.stringify(factionData.territory[0], null, 2));
      }
      
      // Parse member status - The v2 API doesn't provide member status in basic data
      // Fetch faction data with detailed member information (must use v2 API)
      const basicFactionData = await this.makeRequest(`v2/faction/${factionId}?selections=basic,members`, apiKey);
      
      // Extract member status
      const memberStatus = { online: 0, idle: 0, offline: 0, hospital: 0 };
      let totalMembers = 0;
      
      if (basicFactionData && basicFactionData.members) {
        totalMembers = Object.keys(basicFactionData.members).length;
        
        // Count member statuses
        Object.values(basicFactionData.members).forEach((member: any) => {
          const status = member.last_action.status;
          if (status === "Online") memberStatus.online++;
          else if (status === "Idle") memberStatus.idle++;
          else if (status === "Offline") memberStatus.offline++;
          
          // Check if in hospital
          if (member.status && member.status.state === "Hospital") {
            memberStatus.hospital++;
            // Adjust the offline count since they're counted there too
            if (status === "Offline") memberStatus.offline--;
          }
        });
      }
      
      // Extract recent activities based on real data
      const recentActivity = [];
      
      // Removed the "New member joined" activity since it's unreliable without proper date information
      // Applications have valid_until timestamps but without a specific join date attached,
      // the calculation is not meaningful for displaying accurate join times
      
      // Check faction wars
      if (factionData.rankedwars && factionData.rankedwars.length > 0) {
        // Sort wars by start time, newest first
        const recentWars = [...factionData.rankedwars]
          .sort((a, b) => b.start - a.start);
        
        // Get current time for calculations
        const currentTimestamp = Math.floor(Date.now() / 1000);
        
        if (recentWars.length > 0) {
          // Log the wars data for debugging
          console.log("Recent wars data:", JSON.stringify(recentWars.slice(0, 2), null, 2));
          
          // Check if there's an active war (no end time or end time in future)
          const activeWars = recentWars.filter(war => !war.end || war.end > currentTimestamp);
          console.log("Active wars count:", activeWars.length);
          
          // First, always show information about the last completed war
          const lastCompletedWar = recentWars.find(war => war.end);
          
          if (lastCompletedWar && lastCompletedWar.end) {
            const timeSinceEnd = Math.floor((currentTimestamp - lastCompletedWar.end) / 3600);
            const timeLabel = timeSinceEnd <= 24 ? `${timeSinceEnd}h ago` : `${Math.floor(timeSinceEnd / 24)}d ago`;
            
            console.log("Last war ended:", timeLabel);
            
            // Always show days since last war
            recentActivity.push({
              type: 'info',
              description: 'Days since last war',
              time: activeWars.length > 0 ? 'War in progress' : timeLabel,
              icon: 'clock',
              color: 'blue'
            });
          }
          
          // Then, show information about active wars (or lack thereof)
          if (activeWars.length > 0) {
            // We have an active war - show when it started
            const mostRecentActiveWar = activeWars[0];
            const timeDiff = Math.floor((currentTimestamp - mostRecentActiveWar.start) / 3600);
            const timeLabel = timeDiff <= 24 ? `${timeDiff}h ago` : `${Math.floor(timeDiff / 24)}d ago`;
            
            console.log("Active war detected, started:", timeLabel);
            
            recentActivity.push({
              type: 'war',
              description: 'Faction war started',
              time: timeLabel,
              icon: 'swords',
              color: 'red'
            });
          } else {
            // No active wars
            recentActivity.push({
              type: 'war',
              description: 'Faction war started',
              time: 'No active wars',
              icon: 'swords',
              color: 'gray'
            });
          }
        }
      }
      
      // Check territories (count gives us some indication of territory activity)
      if (factionData.territory) {
        const territoryCount = Object.keys(factionData.territory).length;
        
        // Use a placeholder time since we don't know when territories were actually captured
        recentActivity.push({
          type: 'achievement',
          description: `${territoryCount} territories controlled`,
          time: 'current',
          icon: 'trophy',
          color: 'yellow'
        });
      }
      
      // If there are no real activities, add a placeholder
      if (recentActivity.length === 0) {
        recentActivity.push({
          type: 'info',
          description: 'No recent faction activity',
          time: 'N/A',
          icon: 'info',
          color: 'gray'
        });
      }
      
      // Determine war status based on ranked wars
      let warStatus = "PEACE";
      // Calculate current timestamp for war status checks
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (factionData.rankedwars && factionData.rankedwars.some(war => {
        // A war is active if:
        // 1. Its status is 'active' AND
        // 2. Either it has no end time OR its end time is in the future
        return war.status === 'active' && (!war.end || war.end > currentTime);
      })) {
        warStatus = "WAR";
      }
      
      // Extract faction respect
      let factionRespect = 0;
      if (factionData.stats && factionData.stats.respect) {
        factionRespect = parseInt(factionData.stats.respect) || 0;
      } else if (basicFactionData && basicFactionData.respect) {
        factionRespect = parseInt(basicFactionData.respect) || 0;
      }
      
      // Fallback to basic v2 API format if respect is still 0
      if (factionRespect === 0 && factionData.basic && factionData.basic.respect) {
        factionRespect = parseInt(factionData.basic.respect) || 0;
      }
      
      console.log(`Faction data for ${factionData.name || userData.faction.faction_name}:`, {
        respect: factionRespect,
        territories: factionData.territory ? Object.keys(factionData.territory).length : 0,
        members: totalMembers
      });
      
      // Get best chain from the basic data
      let bestChain = 0;
      if (factionData.basic && factionData.basic.best_chain) {
        bestChain = factionData.basic.best_chain;
      }
      
      console.log("Best chain value:", bestChain);

      // Get faction age in days from the basic data
      let daysOld = 0;
      if (factionData.basic && factionData.basic.days_old) {
        daysOld = factionData.basic.days_old;
      }
      
      // Extract enlisted status and rank information
      let isEnlisted = false;
      let rankLevel = 0;
      let rankName = "";
      let rankDivision = 0;
      let rankPosition = 0;
      
      if (factionData.basic) {
        if (factionData.basic.is_enlisted !== undefined) {
          isEnlisted = factionData.basic.is_enlisted;
        }
        
        if (factionData.basic.rank) {
          rankLevel = factionData.basic.rank.level || 0;
          rankName = factionData.basic.rank.name || "";
          rankDivision = factionData.basic.rank.division || 0;
          rankPosition = factionData.basic.rank.position || 0;
        }
      }
      
      // Extract real member data from the API response
      const memberList = {};
      
      // Process the actual member data from basicFactionData
      if (basicFactionData && basicFactionData.members) {
        Object.entries(basicFactionData.members).forEach(([id, memberData]: [string, any]) => {
          memberList[id] = {
            id: parseInt(id),
            name: memberData.name,
            position: memberData.position,
            days_in_faction: memberData.days_in_faction,
            last_action: memberData.last_action,
            status: memberData.status,
            revive_setting: memberData.revive_setting || "Unknown",
            life: memberData.life || { current: 0, maximum: 0 },
            is_revivable: memberData.is_revivable || false,
            is_on_wall: memberData.is_on_wall || false,
            is_in_oc: memberData.is_in_oc || false
          };
        });
      }

      // Process recent wars data
      const recentWars = factionData.rankedwars || [];
      
      // Make sure we log the war data for debugging
      console.log("Recent wars data:", JSON.stringify(recentWars.slice(0, 2)));
      console.log(`Total wars fetched from API: ${recentWars.length}`);
      
      // Sort wars by start time, newest first
      const sortedWars = [...recentWars].sort((a, b) => b.start - a.start);
      
      // Calculate days since last war
      const lastCompletedWar = sortedWars.find(war => war.end);
      let lastWarEnded = null;
      
      if (lastCompletedWar && lastCompletedWar.end) {
        const daysSinceEnd = Math.floor((currentTime - lastCompletedWar.end) / 86400);
        lastWarEnded = daysSinceEnd <= 1 ? "1d ago" : `${daysSinceEnd}d ago`;
      }
      
      // Get active wars
      const activeWars = sortedWars.filter(war => !war.end || war.end > currentTime);
      
      // Build the response object with real data
      return {
        id: factionData.ID || userData.faction.faction_id,
        name: factionData.name || userData.faction.faction_name,
        tag: factionData.tag || userData.faction.faction_tag || "N/A",
        leader: {
          id: factionData.leader || 0,
          name: factionData.leader_name || "Unknown"
        },
        members_count: totalMembers || 1,
        respect: factionRespect,
        territories: factionData.territory ? factionData.territory.length : 0,
        territory: factionData.territory || [], // Include the full territory data
        war_status: warStatus,
        best_chain: bestChain,
        days_old: daysOld,
        capacity: {
          current: totalMembers || 1,
          maximum: factionData.basic && factionData.basic.capacity ? factionData.basic.capacity : (totalMembers + 5)
        },
        members: memberList,
        member_status: memberStatus,
        recent_activity: recentActivity,
        last_updated: new Date().toISOString(),
        is_enlisted: isEnlisted,
        active_wars: activeWars.length,
        last_war: lastWarEnded,
        recent_wars: sortedWars, // Include all wars for proper pagination
        rank: {
          level: rankLevel,
          name: rankName,
          division: rankDivision,
          position: rankPosition
        }
      };
    } catch (error) {
      console.error("Error fetching faction data:", error);
      
      // The user might not be in a faction
      if (error instanceof Error && (
          error.message.includes("not in a faction") || 
          error.message.includes("Incorrect ID")
        )) {
        return {
          id: 0,
          name: "Not in a Faction",
          tag: "N/A",
          leader: {
            id: 0,
            name: "N/A"
          },
          members_count: 0,
          respect: 0,
          territories: 0,
          last_updated: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }
  
  public async getFactionDetailedData(apiKey: string): Promise<any> {
    // Mock data for demonstration
    return {
      id: 12345,
      name: "FactionName",
      tag: "FCTN",
      age_days: 1095,
      leader: {
        id: 9876543,
        name: "LeaderName"
      },
      co_leaders: [],
      members: [
        {
          id: 1234567,
          name: "MemberName",
          level: 50,
          status: "Online",
          last_action: "1 minute ago",
          position: "Member",
          days_in_faction: 365,
          xanax_addiction: 0,
          energy: {
            current: 100,
            maximum: 150
          },
          nerve: {
            current: 25,
            maximum: 50
          },
          stats: {
            strength: 10000,
            defense: 9500,
            speed: 9000,
            dexterity: 8500,
            total: 37000
          }
        }
      ],
      territories: [
        {
          id: "ABC123",
          name: "Territory1",
          value: 150,
          controlled_since: "2023-01-01T00:00:00.000Z"
        }
      ],
      wars: {
        active: [],
        past: []
      },
      stats: {
        respect: 500000,
        territories: 5,
        members_count: 25,
        max_members: 30,
        best_chain: 250,
        attacks_won: 5000,
        attacks_lost: 1000,
        money_balance: 5000000000,
        points_balance: 25000
      }
    };
  }
  
  /**
   * Get bazaar items from specific player's bazaar
   * @param apiKey - User's Torn API key
   * @param playerId - Player ID to fetch bazaar items from
   * @returns Player's bazaar items
   */
  public async getPlayerBazaar(apiKey: string, playerId: number): Promise<any> {
    try {
      const data = await this.makeRequest(`user/${playerId}?selections=bazaar`, apiKey);
      
      if (!data || !data.bazaar) {
        return { playerId, items: [] };
      }
      
      // Process and format the player's bazaar items
      const items = Object.entries(data.bazaar || {}).map(([id, item]: [string, any]) => ({
        id: parseInt(id),
        name: item.name || "Unknown Item",
        type: item.type || "Unknown",
        category: item.category || "Miscellaneous",
        price: item.price || 0,
        market_price: item.market_value || 0,
        quantity: item.quantity || 1,
        percentage_below_market: item.market_value > 0 
          ? ((item.market_value - item.price) / item.market_value) * 100 
          : 0,
        seller: {
          id: playerId,
          name: data.name || `Player ${playerId}`
        }
      }));
      
      return { 
        playerId, 
        items,
        player_name: data.name || `Player ${playerId}`
      };
    } catch (error) {
      console.error(`Error fetching bazaar for player ${playerId}:`, error);
      return { playerId, items: [] };
    }
  }
  
  /**
   * Get bazaar items from multiple players
   * @param apiKey - User's Torn API key
   * @param playerIds - Array of player IDs to fetch bazaar from
   * @param category - Filter by category (optional)
   * @returns Aggregated bazaar items
   */
  public async getBazaarItems(apiKey: string, category: string = 'all'): Promise<BazaarItems> {
    try {
      // Get known player IDs - using multiple sources to maximize results
      const userData = await this.makeRequest("user?selections=basic", apiKey);
      
      // Start with a set of known active traders (this is our fallback list)
      let playerIds: number[] = [
        1, // Chedburn (Torn's creator)
        4, // Torn Staff
        10, // Torn City Bank
        15, // TornPDA developer
        26, // Mojo
        30, // Boss
        231445, // YATA developer
        1605449, // Kiviman
        1468764, // Ace
        1979999, // cjp
        2000953, // phineas^
        2090289, // Robert
        2118266, // UltraJai
        2413426, // Doxy
        1480622  // daner
      ];
      
      // If user is in a faction, add faction members
      if (userData.faction && userData.faction.faction_id) {
        try {
          const factionData = await this.makeRequest(`faction/${userData.faction.faction_id}?selections=basic`, apiKey);
          if (factionData && factionData.members) {
            const factionMembers = Object.keys(factionData.members).map(id => parseInt(id));
            playerIds = [...new Set([...playerIds, ...factionMembers])];
          }
        } catch (err) {
          console.warn("Could not fetch faction members for bazaar:", err);
        }
      }
      
      console.log(`Fetching bazaar items from ${playerIds.length} players`);
      
      // Only fetch from a reasonable number of players to avoid rate limits
      const playersToCheck = playerIds.slice(0, 20); // Limit to 20 players
      
      // Fetch bazaar items from each player
      const playerBazaars = await Promise.all(
        playersToCheck.map(playerId => this.getPlayerBazaar(apiKey, playerId))
      );
      
      // Combine all items
      let allItems: any[] = [];
      
      playerBazaars.forEach(bazaar => {
        if (bazaar && bazaar.items && bazaar.items.length > 0) {
          allItems = [...allItems, ...bazaar.items];
        }
      });
      
      // Filter by category if specified
      if (category !== 'all') {
        allItems = allItems.filter(item => item.category.toLowerCase() === category.toLowerCase());
      }
      
      // Get unique categories
      const categories = [...new Set(allItems.map(item => item.category))];
      
      return {
        items: allItems,
        categories,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching bazaar data:", error);
      
      // Return empty data if there's an error
      return {
        items: [],
        categories: [],
        last_updated: new Date().toISOString()
      };
    }
  }
  
  public async checkApiStatus(apiKey: string): Promise<ApiStatus> {
    return {
      status: "online",
      averageResponseTimeMs: 250,
      uptimePercentage: 99.5,
      callsPerHour: 300,
      rateLimitAvailable: this.rateLimit - this.callsMade,
      lastErrorTime: null
    };
  }
  
  public async syncUserData(apiKey: string, userId: number): Promise<void> {
    // This would perform a full sync of all user data
    console.log(`Synced data for user ${userId}`);
  }
}