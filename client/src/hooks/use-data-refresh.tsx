import { createContext, ReactNode, useContext, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type DataRefreshContextType = {
  isRefreshing: boolean;
  refreshAllData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshFaction: () => Promise<void>;
  refreshCompany: () => Promise<void>;
  refreshBazaar: () => Promise<void>;
  lastRefreshTime: Date | null;
};

export const DataRefreshContext = createContext<DataRefreshContextType | null>(null);

export function DataRefreshProvider({ children }: { children: ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Create mutations for each data type
  const statsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/refresh/stats");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player/stats"] });
    }
  });

  const factionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/refresh/faction");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/faction"] });
    }
  });

  const companyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/refresh/company");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
    }
  });

  const bazaarMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/refresh/bazaar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bazaar"] });
    }
  });

  // Individual refresh functions
  const refreshStats = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await statsMutation.mutateAsync();
      toast({
        title: "Stats Refreshed",
        description: "Your player stats have been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh stats",
        variant: "destructive",
      });
    }
  };

  const refreshFaction = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await factionMutation.mutateAsync();
      toast({
        title: "Faction Data Refreshed",
        description: "Your faction data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh faction data",
        variant: "destructive",
      });
    }
  };

  const refreshCompany = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await companyMutation.mutateAsync();
      toast({
        title: "Company Data Refreshed",
        description: "Your company data has been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh company data",
        variant: "destructive",
      });
    }
  };

  const refreshBazaar = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await bazaarMutation.mutateAsync();
      toast({
        title: "Bazaar Data Refreshed",
        description: "Bazaar listings have been updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Failed to refresh bazaar data",
        variant: "destructive",
      });
    }
  };

  // Main refresh function to refresh all data at once
  const refreshAllData = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      // Refresh all data sequentially to avoid API rate limits
      await statsMutation.mutateAsync();
      await factionMutation.mutateAsync();
      await companyMutation.mutateAsync();
      await bazaarMutation.mutateAsync();
      
      // Update last refresh time
      setLastRefreshTime(new Date());
      
      toast({
        title: "All Data Refreshed",
        description: "Your data has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "An error occurred while refreshing data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <DataRefreshContext.Provider
      value={{
        isRefreshing,
        refreshAllData,
        refreshStats,
        refreshFaction, 
        refreshCompany,
        refreshBazaar,
        lastRefreshTime
      }}
    >
      {children}
    </DataRefreshContext.Provider>
  );
}

export function useDataRefresh() {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error("useDataRefresh must be used within a DataRefreshProvider");
  }
  return context;
}