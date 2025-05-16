import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CrawlerStatus {
  status: string;
  indexed_players: number;
  total_players: number;
  crawl_speed: number;
  next_scan: string;
}

interface DatabaseStatus {
  status: string;
  player_count: number;
  item_count: number;
  data_size: string;
  queries_today: number;
}

interface ApiStatus {
  status: string;
  avg_response_time: number;
  uptime_percentage: number;
  calls_per_hour: number;
  rate_limit_available: number;
  last_error_time: string;
}

interface SystemStatusData {
  crawler: CrawlerStatus;
  database: DatabaseStatus;
  api: ApiStatus;
  last_updated: string;
}

export default function SystemStatus() {
  const { user } = useAuth();
  
  const { data, isLoading, isError } = useQuery<SystemStatusData>({
    queryKey: ["/api/system/status"],
    enabled: !!user?.apiKey
  });

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">System Status</h3>
            <Skeleton className="w-40 h-4" />
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">System Status</h3>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Status Unavailable</h3>
          <p className="text-gray-400 max-w-md">
            {user?.apiKey ? 
              "Unable to fetch system status information. Please try again later." : 
              "Please add your API key in settings to view system status."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-game-dark border-gray-700 shadow-game">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-rajdhani font-bold text-lg">System Status</h3>
          <span className="text-xs text-gray-400">Last Updated: {data.last_updated}</span>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Crawler Status */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Web Crawler</span>
              <span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded">{data.crawler.status}</span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Player IDs Indexed</span>
                  <span>{data.crawler.indexed_players.toLocaleString()} / {data.crawler.total_players.toLocaleString()}</span>
                </div>
                <Progress 
                  value={(data.crawler.indexed_players / data.crawler.total_players) * 100} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-primary" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Crawl Speed</span>
                  <span>{data.crawler.crawl_speed} IDs/min</span>
                </div>
                <Progress 
                  value={85} // Fixed value as a percentage of maximum possible speed
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-accent" 
                />
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              Next scheduled full scan: <span className="text-white">{data.crawler.next_scan}</span>
            </div>
          </div>
          
          {/* Database Status */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">Database Status</span>
              <span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded">{data.database.status}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-game-black bg-opacity-50 rounded p-2">
                <div className="text-2xl font-rajdhani font-bold">{(data.database.player_count / 1000000).toFixed(1)}M</div>
                <div className="text-xs text-gray-400">PLAYERS</div>
              </div>
              <div className="bg-game-black bg-opacity-50 rounded p-2">
                <div className="text-2xl font-rajdhani font-bold">{(data.database.item_count / 1000).toFixed(1)}K</div>
                <div className="text-xs text-gray-400">ITEMS</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              Data size: <span className="text-white">{data.database.data_size}</span> • 
              Queries today: <span className="text-white">{data.database.queries_today.toLocaleString()}</span>
            </div>
          </div>
          
          {/* API Status */}
          <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium">API Status</span>
              <span className="text-xs px-2 py-0.5 bg-green-900 text-green-300 rounded">{data.api.status}</span>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-xl font-rajdhani font-bold">{data.api.avg_response_time}<span className="text-xs text-gray-400">ms</span></div>
                <div className="text-xs text-gray-400">AVG RESPONSE</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-rajdhani font-bold">{data.api.uptime_percentage}<span className="text-xs text-gray-400">%</span></div>
                <div className="text-xs text-gray-400">UPTIME</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-rajdhani font-bold">{data.api.calls_per_hour.toLocaleString()}</div>
                <div className="text-xs text-gray-400">CALLS/HR</div>
              </div>
            </div>
            
            <div className="text-xs text-gray-400">
              Rate limit: <span className="text-white">{data.api.rate_limit_available}% available</span> •
              Last error: <span className="text-white">{data.api.last_error_time}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
