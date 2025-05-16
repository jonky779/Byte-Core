import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";

export default function PlayerStats() {
  const { user } = useAuth();
  
  const { data: playerStats, error, isLoading, isError } = useQuery({
    queryKey: ["/api/player/stats"],
    enabled: !!user?.apiKey
  });

  const [lastUpdated, setLastUpdated] = useState("Now");

  useEffect(() => {
    if (playerStats) {
      setLastUpdated("Just now");
      
      const interval = setInterval(() => {
        setLastUpdated("Just now");
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [playerStats]);

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Player Stats</h3>
            <Skeleton className="w-16 h-6 rounded" />
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg p-4 border border-gray-700 bg-game-panel">
                <div className="flex justify-between items-center mb-3">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-6 h-6 rounded-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="w-full h-16" />
                  <Skeleton className="w-full h-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !playerStats) {
    const errorMessage = user?.apiKey 
      ? "Failed to load player stats. Please check your API key or try again later."
      : "Please add your Torn API key in settings to view your player stats.";
    
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Player Stats</h3>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Data Unavailable</h3>
          <p className="text-gray-400 max-w-md">
            {errorMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-rajdhani font-bold text-lg">Player Stats</h3>
          <Badge variant="secondary">Level {playerStats.level}</Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Basic Info */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">IDENTITY</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                <rect x="3" y="4" width="18" height="16" rx="2"></rect>
                <path d="M16 2v4"></path>
                <path d="M8 2v4"></path>
                <path d="M3 10h18"></path>
                <path d="M8 14h.01"></path>
                <path d="M12 14h.01"></path>
                <path d="M16 14h.01"></path>
                <path d="M8 18h.01"></path>
                <path d="M12 18h.01"></path>
                <path d="M16 18h.01"></path>
              </svg>
            </div>
            
            <div className="flex mb-3">
              {/* Use actual image URL from Torn API */}
              <img 
                src={`https://www.torn.com/images/v2/portraits/${playerStats.player_id}.jpg`}
                alt={playerStats.name || "Player"}
                className="w-14 h-14 rounded-lg mr-3 object-cover bg-primary bg-opacity-20"
                onError={(e) => {
                  // Fallback to initial if the image fails to load
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.style.display = 'flex';
                  target.style.alignItems = 'center';
                  target.style.justifyContent = 'center';
                  target.style.fontSize = '1.5rem';
                  target.style.fontWeight = 'bold';
                  target.style.color = 'var(--primary)';
                  target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
                  target.parentElement?.insertAdjacentHTML('beforeend', 
                    `<div class="absolute inset-0 flex items-center justify-center text-2xl font-bold text-primary">
                      ${playerStats.name ? playerStats.name.charAt(0) : "?"}
                    </div>`
                  );
                }}
              />
              <div>
                <h4 className="font-rajdhani font-semibold">{playerStats.name}</h4>
                <div className="text-xs text-gray-400 mt-1">Player #{playerStats.player_id}</div>
                <div className="text-xs font-medium text-secondary mt-1">
                  {playerStats.job?.position || playerStats.faction?.position || "Civilian"}
                </div>
              </div>
            </div>
            
            <div className="mt-auto grid grid-cols-2 gap-2 text-sm">
              <div className="bg-game-black bg-opacity-50 rounded p-2">
                <div className="text-xs text-gray-400">RANK</div>
                <div className="font-medium">
                  {/* Determine rank based on player level */}
                  {playerStats.level ? 
                    (playerStats.level < 10 ? "Noob" : 
                     playerStats.level < 25 ? "Experienced" : 
                     playerStats.level < 50 ? "Advanced" : 
                     "Elite") 
                    : "Unknown"}
                </div>
              </div>
              <div className="bg-game-black bg-opacity-50 rounded p-2">
                <div className="text-xs text-gray-400">STATUS</div>
                <div className={`font-medium ${
                  playerStats.status === "Online" ? "text-green-400" :
                  playerStats.status === "Idle" ? "text-yellow-400" :
                  playerStats.status === "Hospital" ? "text-red-400" :
                  playerStats.status === "Okay" ? "text-blue-400" :
                  "text-gray-400"
                }`}>
                  {playerStats.status === "Okay" ? "Online" : (playerStats.status || "Unknown")}
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">ATTRIBUTES</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                <path d="M18 20V10"></path>
                <path d="M12 20V4"></path>
                <path d="M6 20v-6"></path>
              </svg>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Strength</span>
                  <span className="font-mono">
                    {playerStats.stats?.strength 
                      ? formatNumber(playerStats.stats.strength) 
                      : 'Hidden'}
                  </span>
                </div>
                <Progress 
                  value={playerStats.stats?.strength 
                    ? ((playerStats.stats.strength / (playerStats.stats.total || 1)) * 100) 
                    : 0} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-primary" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Defense</span>
                  <span className="font-mono">
                    {playerStats.stats?.defense 
                      ? formatNumber(playerStats.stats.defense) 
                      : 'Hidden'}
                  </span>
                </div>
                <Progress 
                  value={playerStats.stats?.defense 
                    ? ((playerStats.stats.defense / (playerStats.stats.total || 1)) * 100) 
                    : 0} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-secondary" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Speed</span>
                  <span className="font-mono">
                    {playerStats.stats?.speed 
                      ? formatNumber(playerStats.stats.speed) 
                      : 'Hidden'}
                  </span>
                </div>
                <Progress 
                  value={playerStats.stats?.speed 
                    ? ((playerStats.stats.speed / (playerStats.stats.total || 1)) * 100) 
                    : 0} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-accent" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Dexterity</span>
                  <span className="font-mono">
                    {playerStats.stats?.dexterity 
                      ? formatNumber(playerStats.stats.dexterity) 
                      : 'Hidden'}
                  </span>
                </div>
                <Progress 
                  value={playerStats.stats?.dexterity 
                    ? ((playerStats.stats.dexterity / (playerStats.stats.total || 1)) * 100) 
                    : 0} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-blue-500" 
                />
              </div>
            </div>
          </div>
          
          {/* Status */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">STATUS</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Health</span>
                  <span>{formatNumber(playerStats.life.current)} / {formatNumber(playerStats.life.maximum)}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-600 to-green-400" 
                    style={{ width: `${(playerStats.life.current / playerStats.life.maximum) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Energy</span>
                  <span>{playerStats.energy.current} / {playerStats.energy.maximum}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400" 
                    style={{ width: `${(playerStats.energy.current / playerStats.energy.maximum) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Nerve</span>
                  <span>{playerStats.nerve.current} / {playerStats.nerve.maximum}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-400" 
                    style={{ width: `${(playerStats.nerve.current / playerStats.nerve.maximum) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Happy</span>
                  <span>{formatNumber(playerStats.happy.current)} / {formatNumber(playerStats.happy.maximum)}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400" 
                    style={{ width: `${(playerStats.happy.current / playerStats.happy.maximum) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Finances */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-gray-400">FINANCES</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                <path d="M12 1v22"></path>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1.5 border-b border-gray-700">
                <span className="text-sm">Money</span>
                <span className="font-mono font-medium text-green-400">${formatNumber(playerStats.money_onhand)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b border-gray-700">
                <span className="text-sm">Points</span>
                <span className="font-mono font-medium text-purple-400">{formatNumber(playerStats.points)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1.5 border-b border-gray-700">
                <span className="text-sm">Networth</span>
                <span className="font-mono font-medium text-blue-400">${formatNumber(playerStats.networth)}</span>
              </div>
              
              <div className="flex justify-between items-center py-1.5">
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
