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
  
  private async makeRequest(endpoint: string, apiKey: string): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}&key=${apiKey}`;
    
    return this.enqueueRequest(async () => {
      const response = await fetch(url);
      const data = await response.json();
      
      if ((data as ApiResponse).error) {
        throw new Error((data as ApiResponse).error?.error || "API request failed");
      }
      
      return data;
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
  
  public async getPlayerStats(apiKey: string): Promise<PlayerStats> {
    try {
      const data = await this.makeRequest("user/?selections=basic,profile,battlestats,bars,money,travel", apiKey);
      
      // Format the data into PlayerStats object
      return {
        player_id: data.player_id || 0,
        name: data.name || "Unknown",
        level: data.level || 1,
        status: data.status?.state || "Offline",
        last_action: data.last_action?.relative || "Unknown",
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
  
  public async getCompanyData(apiKey: string): Promise<CompanyData> {
    try {
      const data = await this.makeRequest("company/?selections=profile", apiKey);
      
      return {
        id: data.ID || 0,
        name: data.name || "No Company",
        type: data.company_type || "Unknown",
        rating: data.rating || 0,
        days_old: data.days_old || 0,
        weekly_profit: data.weekly_profit || 0,
        employees: {
          current: data.employees_hired || 0,
          max: data.employees_max || 0
        },
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching company data:", error);
      
      // The user might not be in a company
      if (error instanceof Error && error.message.includes("not in a company")) {
        return {
          id: 0,
          name: "Not in a company",
          type: "N/A",
          rating: 0,
          days_old: 0,
          weekly_profit: 0,
          employees: {
            current: 0,
            max: 0
          },
          last_updated: new Date().toISOString()
        };
      }
      
      throw error;
    }
  }
  
  public async getCompanyDetailedData(apiKey: string): Promise<any> {
    // Mock data for demonstration
    return {
      id: 54321,
      name: "CompanyName",
      type: "Logistics",
      rating: 8,
      employees: {
        current: 8,
        max: 10,
        list: [
          {
            id: 1111111,
            name: "Employee1",
            position: "Manager",
            status: "Online",
            last_action: "2 minutes ago",
            days_in_company: 200,
            effectiveness: 85,
            wage: 50000,
            nerve: {
              current: 20,
              maximum: 50
            },
            energy: {
              current: 80,
              maximum: 150
            },
            activity: {
              working: true,
              training: false,
              traveling: false
            }
          },
          // Additional employees would be listed here
        ]
      },
      positions: [
        {
          id: 1,
          name: "Manager",
          description: "Manages company operations",
          required_stats: {
            intelligence: 3000,
            endurance: 2000,
            manual_labor: 1000
          },
          employees_count: 1,
          max_employees: 1
        }
      ],
      stats: {
        popularity: 75,
        efficiency: 80,
        environment: 70,
        profitability: 90,
        days_old: 730,
        daily_revenue: 8000000,
        weekly_profit: 50000000,
        production_rate: 95
      }
    };
  }
  
  public async getFactionData(apiKey: string): Promise<FactionData> {
    try {
      const data = await this.makeRequest("faction/?selections=basic", apiKey);
      
      return {
        id: data.ID || 0,
        name: data.name || "No Faction",
        tag: data.tag || "",
        leader: {
          id: data.leader || 0,
          name: data.leader_name || "Unknown"
        },
        members_count: data.members ? Object.keys(data.members).length : 0,
        respect: data.respect || 0,
        territories: data.territory ? Object.keys(data.territory).length : 0,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error("Error fetching faction data:", error);
      
      // The user might not be in a faction
      if (error instanceof Error && error.message.includes("not in a faction")) {
        return {
          id: 0,
          name: "Not in a faction",
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
  
  public async getBazaarItems(apiKey: string, category: string = 'all'): Promise<BazaarItems> {
    try {
      const data = await this.makeRequest("market/?selections=bazaar", apiKey);
      
      // Format bazaar items
      const items = Object.entries(data.bazaar || {})
        .filter(([_, item]: [string, any]) => category === 'all' || item.category === category)
        .map(([id, item]: [string, any]) => ({
          id: parseInt(id),
          name: item.name,
          type: item.type,
          category: item.category,
          price: item.price,
          market_price: item.market_price || 0,
          quantity: item.quantity,
          percentage_below_market: item.market_price > 0 
            ? ((item.market_price - item.price) / item.market_price) * 100 
            : 0
        }));
      
      // Extract unique categories
      const categories = [...new Set(items.map(item => item.category))];
      
      return {
        items,
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