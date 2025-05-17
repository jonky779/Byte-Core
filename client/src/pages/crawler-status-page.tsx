import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, AlertCircle, Worm, RefreshCw, Database, Play, Pause, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CrawlerConfig {
  enabled: boolean;
  crawl_interval_minutes: number;
  player_id_start: number;
  player_id_end: number;
  request_delay_ms: number;
  batch_size: number;
  max_concurrent_requests: number;
}

interface CrawlLog {
  id: number;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
}

interface DetailedCrawlerStatus {
  config: CrawlerConfig;
  status: {
    state: "running" | "paused" | "idle" | "error";
    current_position: number;
    indexed_players: number;
    total_players: number;
    estimated_time_remaining: string;
    crawl_speed: number;
    next_scheduled_run: string;
    last_completed_run: string;
    error?: string;
  };
  logs: CrawlLog[];
  stats: {
    players_with_faction: number;
    players_without_faction: number;
    players_with_company: number;
    players_without_company: number;
    players_traveling: number;
    players_in_hospital: number;
    total_items_indexed: number;
  };
}

export default function CrawlerStatusPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [configValues, setConfigValues] = useState<CrawlerConfig | null>(null);
  
  const { data, isLoading, isError, refetch } = useQuery<DetailedCrawlerStatus>({
    queryKey: ["/api/system/crawler"],
    enabled: !!user?.apiKey,
  });
  
  const startCrawlerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system/crawler/start", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Crawler Started",
        description: "The web crawler has been started successfully.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/crawler"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Start Crawler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const pauseCrawlerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/system/crawler/pause", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Crawler Paused",
        description: "The web crawler has been paused.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/system/crawler"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Pause Crawler",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateConfigMutation = useMutation({
    mutationFn: async (config: CrawlerConfig) => {
      const res = await apiRequest("POST", "/api/system/crawler/config", config);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "The crawler configuration has been updated successfully.",
        variant: "default",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/system/crawler"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Initialize configValues when data is loaded
  if (data && !configValues && !isEditing) {
    setConfigValues(data.config);
  }
  
  const handleEditConfig = () => {
    setConfigValues(data?.config || null);
    setIsEditing(true);
  };
  
  const handleCancelEdit = () => {
    setConfigValues(data?.config || null);
    setIsEditing(false);
  };
  
  const handleSaveConfig = () => {
    if (configValues) {
      updateConfigMutation.mutate(configValues);
    }
  };
  
  const handleInputChange = (field: keyof CrawlerConfig, value: any) => {
    if (configValues) {
      setConfigValues({
        ...configValues,
        [field]: typeof data?.config[field] === 'number' ? parseInt(value) : value,
      });
    }
  };
  
  const getStatusColor = (state: string) => {
    switch (state) {
      case "running": return "text-green-500";
      case "paused": return "text-yellow-500";
      case "idle": return "text-blue-500";
      case "error": return "text-red-500";
      default: return "text-gray-400";
    }
  };
  
  if (isLoading) {
    return (
      <MainLayout title="Crawler Status">
        <Helmet>
          <title>Crawler Status | Byte-Core Vault</title>
          <meta name="description" content="Monitor and manage the Torn RPG data crawler system with Byte-Core Vault." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading crawler data...</span>
        </div>
      </MainLayout>
    );
  }
  
  if (isError || !data) {
    const errorMessage = user?.apiKey 
      ? "Failed to load crawler data. Please check your API key or try again later."
      : "Please add your Torn API key in settings to view crawler status.";
    
    return (
      <MainLayout title="Crawler Status">
        <Helmet>
          <title>Crawler Status | Byte-Core Vault</title>
          <meta name="description" content="Monitor and manage the Torn RPG data crawler system with Byte-Core Vault." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Crawler Data Unavailable</h3>
            <p className="text-gray-400 max-w-md mb-4">
              {errorMessage}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout title="Crawler Status">
      <Helmet>
        <title>Crawler Status | Byte-Core Vault</title>
        <meta name="description" content="Monitor and manage the Torn RPG data crawler system with Byte-Core Vault." />
      </Helmet>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-game-dark border-gray-700 shadow-game col-span-1 md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <Worm className="h-5 w-5 mr-2" />
                <CardTitle>Crawler Status</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
            <CardDescription>Current status and progress of the data crawler</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-full bg-gray-800 mr-3">
                <Worm className={`h-8 w-8 ${getStatusColor(data.status.state)}`} />
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  <span className={getStatusColor(data.status.state)}>
                    {data.status.state.charAt(0).toUpperCase() + data.status.state.slice(1)}
                  </span>
                </h3>
                <p className="text-sm text-gray-400">
                  {data.status.state === "running" ? (
                    <>Currently scanning player IDs ({data.status.current_position})</>
                  ) : data.status.state === "paused" ? (
                    <>Paused at player ID {data.status.current_position}</>
                  ) : data.status.state === "idle" ? (
                    <>Waiting for next scheduled run</>
                  ) : (
                    <>Error: {data.status.error}</>
                  )}
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                {data.status.state === "running" ? (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => pauseCrawlerMutation.mutate()}
                    disabled={pauseCrawlerMutation.isPending}
                  >
                    {pauseCrawlerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Pause className="mr-2 h-4 w-4" />
                    )}
                    Pause Crawler
                  </Button>
                ) : (
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => startCrawlerMutation.mutate()}
                    disabled={startCrawlerMutation.isPending}
                  >
                    {startCrawlerMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start Crawler
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">INDEXED PLAYERS</div>
                <div className="text-2xl font-rajdhani font-bold mb-2">
                  {data.status.indexed_players.toLocaleString()} / {data.status.total_players.toLocaleString()}
                </div>
                <Progress 
                  value={(data.status.indexed_players / data.status.total_players) * 100} 
                  className="h-2 bg-gray-700" 
                  indicatorClassName="bg-primary" 
                />
              </div>
              
              <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">CRAWL SPEED</div>
                <div className="text-2xl font-rajdhani font-bold">
                  {data.status.crawl_speed} <span className="text-lg">IDs/min</span>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Est. time remaining: <span className="text-white">{data.status.estimated_time_remaining}</span>
                </div>
              </div>
              
              <div className="bg-game-panel rounded-lg p-4 border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">SCHEDULE</div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-accent mr-2" />
                  <div className="text-sm">Next run: <span className="text-white">{data.status.next_scheduled_run}</span></div>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Last completed: <span className="text-white">{data.status.last_completed_run}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-game-panel rounded-lg p-4 border border-gray-700 mb-4">
              <h4 className="text-sm font-medium mb-3">Crawler Statistics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_with_faction.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">In Factions</div>
                </div>
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_without_faction.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Without Faction</div>
                </div>
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_with_company.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">In Companies</div>
                </div>
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_without_company.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Without Company</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center mt-4">
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_traveling.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Traveling</div>
                </div>
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.players_in_hospital.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">In Hospital</div>
                </div>
                <div>
                  <div className="text-xl font-rajdhani font-medium">{data.stats.total_items_indexed.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Items Indexed</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-game-dark border-gray-700 shadow-game">
          <CardHeader>
            <div className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              <CardTitle>Configuration</CardTitle>
            </div>
            <CardDescription>Crawler settings and parameters</CardDescription>
          </CardHeader>
          
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="crawler-enabled"
                      checked={configValues?.enabled || false}
                      onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                    />
                    <Label htmlFor="crawler-enabled">Enable Crawler</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crawl-interval">Crawl Interval (minutes)</Label>
                  <Input
                    id="crawl-interval"
                    type="number"
                    value={configValues?.crawl_interval_minutes || 60}
                    onChange={(e) => handleInputChange('crawl_interval_minutes', e.target.value)}
                    className="bg-game-panel border-gray-700"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="player-id-start">Start ID</Label>
                    <Input
                      id="player-id-start"
                      type="number"
                      value={configValues?.player_id_start || 1}
                      onChange={(e) => handleInputChange('player_id_start', e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="player-id-end">End ID</Label>
                    <Input
                      id="player-id-end"
                      type="number"
                      value={configValues?.player_id_end || 2500000}
                      onChange={(e) => handleInputChange('player_id_end', e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="request-delay">Request Delay (ms)</Label>
                  <Input
                    id="request-delay"
                    type="number"
                    value={configValues?.request_delay_ms || 1000}
                    onChange={(e) => handleInputChange('request_delay_ms', e.target.value)}
                    className="bg-game-panel border-gray-700"
                  />
                  <p className="text-xs text-gray-400">Time to wait between API requests</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="batch-size">Batch Size</Label>
                    <Input
                      id="batch-size"
                      type="number"
                      value={configValues?.batch_size || 100}
                      onChange={(e) => handleInputChange('batch_size', e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="concurrent-requests">Max Concurrent</Label>
                    <Input
                      id="concurrent-requests"
                      type="number"
                      value={configValues?.max_concurrent_requests || 5}
                      onChange={(e) => handleInputChange('max_concurrent_requests', e.target.value)}
                      className="bg-game-panel border-gray-700"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm">Crawler Enabled</span>
                  <span className={`text-sm font-medium ${data.config.enabled ? 'text-green-400' : 'text-red-400'}`}>
                    {data.config.enabled ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm">Crawl Interval</span>
                  <span className="text-sm font-medium">{data.config.crawl_interval_minutes} minutes</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm">Player ID Range</span>
                  <span className="text-sm font-medium">{data.config.player_id_start} - {data.config.player_id_end}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm">Request Delay</span>
                  <span className="text-sm font-medium">{data.config.request_delay_ms}ms</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm">Batch Size</span>
                  <span className="text-sm font-medium">{data.config.batch_size}</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">Max Concurrent Requests</span>
                  <span className="text-sm font-medium">{data.config.max_concurrent_requests}</span>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleEditConfig}>
                Edit Configuration
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <Card className="bg-game-dark border-gray-700 shadow-game">
        <CardHeader>
          <CardTitle>Recent Crawler Logs</CardTitle>
          <CardDescription>Most recent crawler activities and events</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-gray-700">
                  <TableHead className="w-[180px]">Timestamp</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.logs.length > 0 ? (
                  data.logs.map((log) => (
                    <TableRow key={log.id} className="border-gray-700">
                      <TableCell className="font-mono text-xs">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.action}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm truncate max-w-[400px]">
                                {log.details}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="w-[300px] break-words text-xs">{log.details}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.success ? (
                          <span className="text-green-400 text-sm">✓ Success</span>
                        ) : (
                          <span className="text-red-400 text-sm">✕ Failed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                      No crawler logs available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
