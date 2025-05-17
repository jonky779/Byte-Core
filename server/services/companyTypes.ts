/**
 * This service is responsible for getting and caching the company types from the Torn API.
 * It ensures we display accurate company type data based on the API rather than hardcoded values.
 */

import { TornAPI } from "./tornAPI";

interface CompanyTypeData {
  id: number;
  name: string; 
  cost: number;
  default_employees: number;
}

export class CompanyTypesService {
  private static instance: CompanyTypesService;
  private tornAPI: TornAPI;
  private companyTypesCache: Record<number, CompanyTypeData> = {};
  private lastCacheUpdate: number = 0;
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  private constructor(tornAPI: TornAPI) {
    this.tornAPI = tornAPI;
  }
  
  public static getInstance(tornAPI: TornAPI): CompanyTypesService {
    if (!CompanyTypesService.instance) {
      CompanyTypesService.instance = new CompanyTypesService(tornAPI);
    }
    return CompanyTypesService.instance;
  }
  
  /**
   * Get company type data from cache or fetch from API if needed
   */
  public async getCompanyType(typeId: number, apiKey: string): Promise<CompanyTypeData | null> {
    await this.ensureCacheIsFresh(apiKey);
    return this.companyTypesCache[typeId] || null;
  }
  
  /**
   * Get company type name only
   */
  public async getCompanyTypeName(typeId: number, apiKey: string): Promise<string> {
    const companyType = await this.getCompanyType(typeId, apiKey);
    return companyType ? companyType.name : "Unknown";
  }
  
  /**
   * Get all company types data
   */
  public async getAllCompanyTypes(apiKey: string): Promise<Record<number, CompanyTypeData>> {
    await this.ensureCacheIsFresh(apiKey);
    return this.companyTypesCache;
  }
  
  /**
   * Make sure the cache is fresh, fetching from API if needed
   */
  private async ensureCacheIsFresh(apiKey: string): Promise<void> {
    const now = Date.now();
    
    // If cache is empty or expired, refresh it
    if (
      Object.keys(this.companyTypesCache).length === 0 || 
      now - this.lastCacheUpdate > this.CACHE_EXPIRY_MS
    ) {
      await this.fetchCompanyTypes(apiKey);
    }
  }
  
  /**
   * Fetch company types from the Torn API and update the cache
   */
  private async fetchCompanyTypes(apiKey: string): Promise<void> {
    try {
      console.log("Fetching company types from Torn API");
      const response = await this.tornAPI.makeRequest("v2/torn?selections=companies", apiKey);
      
      if (response?.companies) {
        // Refresh the cache
        this.companyTypesCache = {};
        
        Object.entries(response.companies).forEach(([id, data]: [string, any]) => {
          const typeId = parseInt(id);
          this.companyTypesCache[typeId] = {
            id: typeId,
            name: data.name,
            cost: data.cost || 0,
            default_employees: data.default_employees || 0
          };
        });
        
        this.lastCacheUpdate = Date.now();
        console.log(`Updated company types cache with ${Object.keys(this.companyTypesCache).length} types`);
      } else {
        console.error("Failed to fetch company types - invalid response format");
      }
    } catch (error) {
      console.error("Error fetching company types:", error);
      throw error;
    }
  }
}