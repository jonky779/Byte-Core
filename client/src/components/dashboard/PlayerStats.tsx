import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { PlayerStats as PlayerStatsType } from "@/types/torn";

export default function PlayerStats() {
  const { data: playerStats, isLoading, error } = useQuery<PlayerStatsType>({
    queryKey: ['/api/player/stats'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Helper function to safely access nested properties
  const safeValue = (value: any, defaultValue: any = 0) => {
    return value !== undefined ? value : defaultValue;
  };
  
  // Helper function to safely access nested objects
  const safeObj = (obj: any, path: string, defaultValue: any = undefined) => {
    if (!obj) return defaultValue;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === undefined || current === null) return defaultValue;
      current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
  };
  if (isLoading) {
    return (
      <Card className="shadow-md col-span-1 h-full">
        <CardContent className="p-4">
          <h3 className="font-semibold font-game-title text-xl mb-4">Player Stats</h3>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full rounded-md" />
            <Skeleton className="h-[200px] w-full rounded-md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md col-span-1 h-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-500">
            <AlertCircle size={18} />
            <h3 className="font-semibold">Error Loading Player Stats</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load player data"}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Ensure we have playerStats data with default fallbacks
  const stats = playerStats || {} as PlayerStatsType;
  const energy = stats.energy || { current: 0, maximum: 100 };
  const nerve = stats.nerve || { current: 0, maximum: 100 };
  const happy = stats.happy || { current: 0, maximum: 100 };
  const life = stats.life || { current: 0, maximum: 100 };
  const playerStatus = stats.status || "Unknown";
  const lastAction = stats.last_action || "Unknown";

  return (
    <Card className="shadow-md col-span-1 h-full">
      <CardContent className="p-0">
        <div className="p-4 pb-2 flex items-center justify-between">
          <h3 className="font-semibold font-game-title text-xl">Player Stats</h3>
          <div className="text-xs font-medium bg-accent/20 px-2 py-1 rounded-full text-foreground">
            Level {stats.level || 0}
          </div>
        </div>
        
        <div className="px-4 py-2">
          <div className="bg-card rounded-lg p-4 pb-3">
            <div className="flex justify-between items-center text-sm mb-1">
              <div className="font-medium uppercase text-muted-foreground">IDENTITY</div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M16 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M8 3V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M4 11H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M11 15H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 15V18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            
            <div className="flex mb-3">
              {/* Player avatar with fallback */}
              <div className="w-14 h-14 mr-3">
                {playerStats?.profile_image ? (
                  <img 
                    src={playerStats.profile_image}
                    alt={playerStats.name || "Player"}
                    className="w-14 h-14 rounded-lg object-cover"
                    onError={(e) => {
                      // If image fails to load, use a letter avatar
                      const div = document.createElement('div');
                      div.className = "w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl";
                      div.innerHTML = `<span>${safeObj(playerStats, 'name', '?')[0]?.toUpperCase() || '?'}</span>`;
                      e.currentTarget.parentElement?.appendChild(div);
                      e.currentTarget.remove();
                    }}
                  />
                ) : (
                  // Default avatar - colored initial
                  <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    <span>{safeObj(playerStats, 'name', '?')[0]?.toUpperCase() || '?'}</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-rajdhani font-semibold">{safeObj(playerStats, 'name', 'Player')}</h4>
                <div className="text-xs text-muted-foreground mt-1">Player #{safeObj(playerStats, 'player_id', '-')}</div>
                <div className="text-xs font-medium bg-accent/20 px-2 py-0.5 rounded text-foreground mt-1 max-w-full truncate">
                  {safeObj(playerStats, 'faction.position') === "None" ? "Not in a faction" : 
                   safeObj(playerStats, 'faction.position', "Civilian")}
                </div>
              </div>
            </div>
            
            <div className="mt-auto grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted rounded p-2">
                <div className="text-xs text-muted-foreground">RANK</div>
                <div className="font-medium text-primary-focus">{safeObj(playerStats, 'rank', "Unknown")}</div>
              </div>
              
              <div className="bg-muted rounded p-2">
                <div className="text-xs text-muted-foreground">STATUS</div>
                <div 
                  className={`font-medium ${
                    safeObj(playerStats, 'status') === "Okay" ? "text-green-400" :
                    safeObj(playerStats, 'status') === "Hospital" ? "text-red-400" :
                    safeObj(playerStats, 'status') === "Traveling" ? "text-blue-400" :
                    "text-yellow-400"
                  }`}
                >
                  {safeObj(playerStats, 'status', "Unknown")}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-card rounded-lg p-4 pb-3">
            <div className="flex justify-between items-center text-sm mb-3">
              <div className="font-medium uppercase text-muted-foreground">ATTRIBUTES</div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L4 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 12L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 18L4 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="17" cy="6" r="2" fill="currentColor" fillOpacity="0.3"/>
                <circle cx="7" cy="12" r="2" fill="currentColor" fillOpacity="0.3"/>
                <circle cx="17" cy="18" r="2" fill="currentColor" fillOpacity="0.3"/>
              </svg>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <div className="flex flex-col text-sm mb-2">
                  <span className="font-medium">Strength</span>
                  <span className="font-mono text-right">{formatNumber(safeObj(playerStats, 'stats.strength', 0))}</span>
                </div>
                <div className="relative">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full"
                      style={{ 
                        width: `${Math.min(100, safeObj(playerStats, 'stats.strength', 0) / Math.max(1, safeObj(playerStats, 'stats.total', 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex flex-col text-sm mb-2">
                  <span className="font-medium">Defense</span>
                  <span className="font-mono text-right">{formatNumber(safeObj(playerStats, 'stats.defense', 0))}</span>
                </div>
                <div className="relative">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gray-300 rounded-full"
                      style={{ 
                        width: `${Math.min(100, safeObj(playerStats, 'stats.defense', 0) / Math.max(1, safeObj(playerStats, 'stats.total', 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex flex-col text-sm mb-2">
                  <span className="font-medium">Speed</span>
                  <span className="font-mono text-right">{formatNumber(safeObj(playerStats, 'stats.speed', 0))}</span>
                </div>
                <div className="relative">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-500 rounded-full"
                      style={{ 
                        width: `${Math.min(100, safeObj(playerStats, 'stats.speed', 0) / Math.max(1, safeObj(playerStats, 'stats.total', 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex flex-col text-sm mb-2">
                  <span className="font-medium">Dexterity</span>
                  <span className="font-mono text-right">{formatNumber(safeObj(playerStats, 'stats.dexterity', 0))}</span>
                </div>
                <div className="relative">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ 
                        width: `${Math.min(100, safeObj(playerStats, 'stats.dexterity', 0) / Math.max(1, safeObj(playerStats, 'stats.total', 1)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-card rounded-lg p-4 pb-3">
            <div className="flex justify-between items-center text-sm mb-3">
              <div className="font-medium uppercase text-muted-foreground">STATUS</div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12H3M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12M21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12M12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12C17 14.7614 14.7614 17 12 17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Health</span>
                    <span>{playerStats.life?.current} / {playerStats.life?.maximum}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(playerStats.life?.current || 0) / (playerStats.life?.maximum || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Energy</span>
                    <span>{playerStats.energy?.current} / {playerStats.energy?.maximum}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${(playerStats.energy?.current || 0) / (playerStats.energy?.maximum || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Nerve</span>
                    <span>{playerStats.nerve?.current} / {playerStats.nerve?.maximum}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full" 
                      style={{ width: `${(playerStats.nerve?.current || 0) / (playerStats.nerve?.maximum || 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-full">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Happiness</span>
                    <span>{playerStats.happy?.current} / {playerStats.happy?.maximum}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-yellow-400 rounded-full" 
                      style={{ width: `${Math.min(100, (playerStats.happy?.current || 0) / (playerStats.happy?.maximum || 1) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 mb-1 bg-card rounded-lg p-4 pb-3">
            <div className="flex justify-between items-center text-sm mb-1">
              <div className="font-medium uppercase text-muted-foreground">FINANCES</div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 14C6.10457 14 7 13.1046 7 12C7 10.8954 6.10457 10 5 10C3.89543 10 3 10.8954 3 12C3 13.1046 3.89543 14 5 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 7C13.1046 7 14 6.10457 14 5C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5C10 6.10457 10.8954 7 12 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M19 14C20.1046 14 21 13.1046 21 12C21 10.8954 20.1046 10 19 10C17.8954 10 17 10.8954 17 12C17 13.1046 17.8954 14 19 14Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M5 14V17.5C5 18.8807 8.13401 20 12 20C15.866 20 19 18.8807 19 17.5V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7V20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm">Cash</span>
                <span className="font-mono font-medium text-green-400">${formatNumber(playerStats.money_onhand || 0)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm">Points</span>
                <span className="font-mono font-medium text-yellow-400">{formatNumber(playerStats.points || 0)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm">Net Worth</span>
                <span className="font-mono font-medium text-green-400">${formatNumber(playerStats.networth || 0)}</span>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-700">
                <span className="text-sm">Vault</span>
                <span className="font-mono font-medium text-yellow-400">${formatNumber(playerStats.vault || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}