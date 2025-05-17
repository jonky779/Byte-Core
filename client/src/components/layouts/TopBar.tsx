import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncData = async () => {
    if (!user?.apiKey) {
      toast({
        title: "API Key Required",
        description: "Please add your Torn API key in the settings page.",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    try {
      await apiRequest("POST", "/api/sync", { userId: user.id });
      
      toast({
        title: "Data Synced",
        description: "Your data has been successfully refreshed.",
        variant: "default",
      });
      
      // Update the last sync time display
      const lastSyncElement = document.getElementById("last-sync-time");
      if (lastSyncElement) {
        lastSyncElement.textContent = "Just now";
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="h-16 bg-background border-b border-border px-4 flex items-center justify-between">
      <div className="flex items-center">
        <h2 className="font-rajdhani font-semibold text-lg">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Sync Button */}
        <Button 
          size="sm"
          onClick={handleSyncData}
          disabled={isSyncing}
          className="text-sm bg-primary hover:bg-primary-dark text-white"
        >
          {isSyncing ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
            </svg>
          )}
          {isSyncing ? "Syncing..." : "Sync Data"}
        </Button>
        
        {/* User Menu - Custom Implementation */}
        <div className="relative">
          <Button 
            variant="ghost" 
            className="flex items-center text-gray-300 hover:text-white"
            onClick={() => document.getElementById('user-menu')?.classList.toggle('hidden')}
          >
            <span className="mr-1 hidden sm:inline">{user?.username}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </Button>
          
          <div 
            id="user-menu" 
            className="hidden absolute right-0 z-10 mt-2 w-56 rounded-md bg-card backdrop-blur-sm border border-border shadow-lg"
          >
            <div className="px-4 py-2 text-sm text-foreground font-semibold border-b border-border">
              My Account
            </div>
            
            <div className="p-2 border-b border-gray-700">
              <ThemeToggle />
            </div>
            
            <div className="py-1">
              <button 
                onClick={() => window.location.href = "/settings"}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-game-panel hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                Settings
              </button>
              
              <button 
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-game-panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
