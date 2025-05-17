import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, AlertCircle, Users, RefreshCw, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function FactionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("members");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [warPage, setWarPage] = useState(1);
  const WARS_PER_PAGE = 10;
  
  // Fetch faction data from the API
  const { 
    data: faction, 
    isLoading, 
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["/api/faction", { fullWarHistory: true }],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/faction?fullWarHistory=true");
      // Parse the JSON response
      return await response.json();
    },
    enabled: !!user?.apiKey,
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Function to format age in years, months, and days
  const formatFactionAge = (totalDays: number): string => {
    if (totalDays <= 0) return "Age: Unknown";
    
    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;
    
    let result = "Age: ";
    if (years > 0) result += `${years} ${years === 1 ? 'year' : 'years'}, `;
    if (months > 0) result += `${months} ${months === 1 ? 'month' : 'months'}, `;
    if (days > 0 || (years === 0 && months === 0)) result += `${days} ${days === 1 ? 'day' : 'days'}`;
    
    return result;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Online": 
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Online</Badge>;
      case "Idle": 
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Idle</Badge>;
      case "Offline": 
        return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Offline</Badge>;
      case "Hospital": 
        return <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">Hospital</Badge>;
      default: 
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <MainLayout title="Faction Tracking">
        <Helmet>
          <title>Faction Tracking | Byte-Core Vault</title>
          <meta name="description" content="Track your Torn RPG faction members and performance with Byte-Core Vault." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading faction data...</span>
        </div>
      </MainLayout>
    );
  }
  
  // Show error state if loading failed
  if (error || !faction) {
    return (
      <MainLayout title="Faction Tracking">
        <Helmet>
          <title>Faction Tracking | Byte-Core Vault</title>
          <meta name="description" content="Track your Torn RPG faction members and performance with Byte-Core Vault." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Faction Data Unavailable</h3>
            <p className="text-gray-400 max-w-md mb-4">
              Failed to load faction data. You might not be in a faction or there was an API error.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  // Extract member status from faction data
  const memberStatus = faction.member_status || {};
  const onlineCount = memberStatus.online || 0;
  const idleCount = memberStatus.idle || 0;
  const offlineCount = memberStatus.offline || 0;
  const hospitalCount = memberStatus.hospital || 0;
  
  // Calculate totals
  const totalMembers = (onlineCount + idleCount + offlineCount + hospitalCount) || 1;
  const onlinePercentage = (onlineCount / totalMembers) * 100;
  const idlePercentage = (idleCount / totalMembers) * 100;
  const offlinePercentage = (offlineCount / totalMembers) * 100;
  const hospitalPercentage = (hospitalCount / totalMembers) * 100;
  
  return (
    <MainLayout title="Faction Tracking">
      <Helmet>
        <title>Faction Tracking | Byte-Core Vault</title>
        <meta name="description" content="Track your Torn RPG faction members and performance with Byte-Core Vault." />
      </Helmet>
      
      {/* Faction Overview Card */}
      <div className="mb-6">
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded mr-3 bg-primary bg-opacity-20 flex items-center justify-center">
                  <Users className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-rajdhani font-bold text-xl">{faction.name} [{faction.tag}]</h2>
                  <p className="text-sm text-gray-400">ID: #{faction.id}</p>
                  <p className="text-sm text-gray-400">{formatFactionAge(faction.days_old || 0)}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {faction.is_enlisted ? (
                      <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Enlisted</Badge>
                    ) : (
                      <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">Not Enlisted</Badge>
                    )}
                    {faction.rank && (
                      <Badge className="bg-purple-500/20 text-purple-500 hover:bg-purple-500/30">
                        {faction.rank.name} {faction.rank.level} (#{faction.rank.position})
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh Data
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">MEMBERS</div>
                <div className="text-xl font-rajdhani font-bold">
                  {(faction.members_count || 0).toLocaleString()} / {(faction.capacity?.maximum || 100).toLocaleString()}
                </div>
                <Progress 
                  value={((faction.members_count || 0) / (faction.capacity?.maximum || 100)) * 100} 
                  className="h-1.5 mt-1 bg-gray-700" 
                />
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">RESPECT</div>
                <div className="text-xl font-rajdhani font-bold">
                  {((faction.respect || 0) / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Best Chain: {(faction.best_chain || 0).toLocaleString()} hits
                </div>
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">TERRITORIES</div>
                <div className="text-xl font-rajdhani font-bold">
                  {faction.territories || 0}
                </div>
                {/* Territory value removed per user request */}
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">WAR STATUS</div>
                <div className="text-xl font-rajdhani font-bold text-yellow-400 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {faction.war_status === "WAR" ? "At War" : "Peaceful"}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Active wars: {faction.active_wars || 0}
                </div>
              </div>
            </div>
            
            {/* Member Status */}
            <div className="mb-3">
              <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Member Status</div>
              <div className="bg-game-panel rounded overflow-hidden">
                <div className="h-8 flex">
                  <div className="h-full bg-green-500" style={{ width: `${onlinePercentage}%` }}></div>
                  <div className="h-full bg-yellow-500" style={{ width: `${idlePercentage}%` }}></div>
                  <div className="h-full bg-red-500" style={{ width: `${offlinePercentage}%` }}></div>
                  <div className="h-full bg-gray-600" style={{ width: `${hospitalPercentage}%` }}></div>
                </div>
                <div className="grid grid-cols-4 text-center text-xs py-1">
                  <div className="text-green-400">{onlineCount} Online</div>
                  <div className="text-yellow-400">{idleCount} Idle</div>
                  <div className="text-red-400">{offlineCount} Offline</div>
                  <div className="text-gray-400">{hospitalCount} Hospital</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Faction Details Card with Tabs */}
      <Card className="border-gray-700 bg-game-dark shadow-game">
        <CardHeader>
          <h3 className="font-bold text-lg">Faction Details</h3>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-game-panel mb-4">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="territories">Territories</TabsTrigger>
              <TabsTrigger value="wars">Wars</TabsTrigger>
            </TabsList>
            
            {/* Members Tab */}
            <TabsContent value="members">
              <div className="flex flex-col md:flex-row justify-between space-y-2 md:space-y-0 md:space-x-2 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name or position..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-game-panel border-gray-700"
                  />
                </div>
                
                <div className="flex space-x-2">
                  {/* Custom-styled Status filter */}
                  <div className="w-[150px] relative">
                    <div 
                      className="w-full p-2 bg-game-panel border border-gray-700 rounded-md flex items-center justify-between text-sm cursor-pointer hover:bg-gray-800"
                      onClick={() => {
                        const dropdown = document.getElementById("status-dropdown");
                        if (dropdown) {
                          dropdown.classList.toggle("hidden");
                        }
                      }}
                    >
                      <span>
                        {statusFilter === "all" ? "All Statuses" : 
                         statusFilter === "Online" ? "Online" :
                         statusFilter === "Idle" ? "Idle" :
                         statusFilter === "Hospital" ? "Hospital" : "Offline"}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                    
                    <div id="status-dropdown" className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg hidden">
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setStatusFilter("all");
                          document.getElementById("status-dropdown")?.classList.add("hidden");
                        }}
                      >
                        All Statuses
                      </div>
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setStatusFilter("Online");
                          document.getElementById("status-dropdown")?.classList.add("hidden");
                        }}
                      >
                        Online
                      </div>
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setStatusFilter("Idle");
                          document.getElementById("status-dropdown")?.classList.add("hidden");
                        }}
                      >
                        Idle
                      </div>
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setStatusFilter("Offline");
                          document.getElementById("status-dropdown")?.classList.add("hidden");
                        }}
                      >
                        Offline
                      </div>
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setStatusFilter("Hospital");
                          document.getElementById("status-dropdown")?.classList.add("hidden");
                        }}
                      >
                        Hospital
                      </div>
                    </div>
                  </div>
                  
                  {/* Custom-styled Position filter with dynamic options */}
                  <div className="w-[150px] relative">
                    <div 
                      className="w-full p-2 bg-game-panel border border-gray-700 rounded-md flex items-center justify-between text-sm cursor-pointer hover:bg-gray-800"
                      onClick={() => {
                        const dropdown = document.getElementById("position-dropdown");
                        if (dropdown) {
                          dropdown.classList.toggle("hidden");
                          
                          // Generate position options dynamically when opening dropdown
                          if (!dropdown.classList.contains("hidden") && faction.members) {
                            try {
                              // Clear existing options
                              dropdown.innerHTML = '<div class="p-2 hover:bg-gray-800 cursor-pointer position-option" data-value="all">All Positions</div>';
                              
                              // Extract unique positions
                              const positions = new Set<string>();
                              Object.values(faction.members).forEach((member: any) => {
                                if (member && member.position) {
                                  positions.add(member.position);
                                }
                              });
                              
                              // Add position options
                              Array.from(positions).sort().forEach(position => {
                                const div = document.createElement("div");
                                div.className = "p-2 hover:bg-gray-800 cursor-pointer position-option";
                                div.setAttribute("data-value", position);
                                div.textContent = position;
                                div.onclick = () => {
                                  setPositionFilter(position);
                                  dropdown.classList.add("hidden");
                                };
                                dropdown.appendChild(div);
                              });
                              
                              // Add click handler to "All Positions" option
                              const allOption = dropdown.querySelector('[data-value="all"]');
                              if (allOption) {
                                allOption.addEventListener("click", () => {
                                  setPositionFilter("all");
                                  dropdown.classList.add("hidden");
                                });
                              }
                            } catch (error) {
                              console.error("Error generating position options:", error);
                            }
                          }
                        }
                      }}
                    >
                      <span>{positionFilter === "all" ? "All Positions" : positionFilter}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                    
                    <div id="position-dropdown" className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg hidden max-h-60 overflow-y-auto">
                      <div 
                        className="p-2 hover:bg-gray-800 cursor-pointer position-option"
                        data-value="all"
                      >
                        All Positions
                      </div>
                      {/* Position options will be populated dynamically */}
                    </div>
                  </div>
                </div>
              </div>
              
              {faction.members && Object.keys(faction.members).length > 0 ? (
                <Table className="border-gray-700">
                  <TableHeader className="bg-game-panel">
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Revive Setting</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead className="text-right">Days in Faction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      try {
                        // First filter the members
                        const filteredMembers = Object.values(faction.members || {}).filter((member: any) => {
                          if (!member) return false;
                          
                          try {
                            const memberStatus = member.last_action?.status || "Offline";
                            const inHospital = member.status?.state === "Hospital";
                            const displayStatus = inHospital ? "Hospital" : memberStatus;
                            
                            if (statusFilter !== 'all' && displayStatus !== statusFilter) return false;
                            if (positionFilter !== 'all' && member.position !== positionFilter) return false;
                            if (searchQuery && !member.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                            return true;
                          } catch (err) {
                            console.error("Error filtering member:", err);
                            return false;
                          }
                        });
                        
                        // Then map to table rows
                        return filteredMembers.map((member: any) => {
                          if (!member) return null;
                          
                          const memberStatus = member.last_action?.status || "Offline";
                          const inHospital = member.status?.state === "Hospital";
                          const displayStatus = inHospital ? "Hospital" : memberStatus;
                          
                          return (
                            <TableRow key={member.id || Math.random()} className="border-gray-700">
                              <TableCell className="font-medium">{member.name || "Unknown"}</TableCell>
                              <TableCell>{member.position || "Unknown"}</TableCell>
                              <TableCell>
                                <Badge className={
                                  displayStatus === 'Online' ? 'bg-green-500/20 text-green-500' :
                                  displayStatus === 'Idle' ? 'bg-yellow-500/20 text-yellow-500' :
                                  displayStatus === 'Hospital' ? 'bg-blue-500/20 text-blue-500' :
                                  'bg-red-500/20 text-red-500'
                                }>
                                  {displayStatus}
                                </Badge>
                              </TableCell>
                              <TableCell>{member.status?.description || "Unknown"}</TableCell>
                              <TableCell>{member.revive_setting || "Unknown"}</TableCell>
                              <TableCell>
                                {member.is_in_oc ? 
                                  <Badge className="bg-green-500/20 text-green-500">Yes</Badge> : 
                                  <Badge className="bg-gray-500/20 text-gray-400">No</Badge>
                                }
                              </TableCell>
                              <TableCell className="text-right">{member.days_in_faction || 0}</TableCell>
                            </TableRow>
                          );
                        });
                      } catch (error) {
                        console.error("Error rendering member table:", error);
                        return (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-4 text-gray-400">
                              Error loading faction members. Please refresh the page.
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })()}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col justify-center items-center py-16 text-gray-400 border border-gray-700 rounded-md">
                  <AlertCircle className="h-12 w-12 mb-4 opacity-40" />
                  <p>No member data available. Please refresh.</p>
                </div>
              )}
            </TabsContent>
            
            {/* Territories Tab */}
            <TabsContent value="territories">
              {faction && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Territories: <span className="text-primary">{faction.territories || 0}</span>
                    </h3>
                    <Badge variant="outline" className="bg-gray-800/50">
                      No Active Territory Wars
                    </Badge>
                  </div>
                  
                  {faction.territory && Array.isArray(faction.territory) && faction.territory.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {faction.territory.map((territory, i) => (
                        <Card key={territory.id || i} className="bg-game-panel border-gray-700">
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-lg text-foreground">{territory.id || `Territory ${i+1}`}</h4>
                                <p className="text-sm text-foreground/80">Sector: {territory.sector}</p>
                              </div>
                              <Badge className={territory.racket ? 'bg-green-500/20 text-green-500 font-medium' : 'bg-gray-500/20 text-foreground/80 font-medium'}>
                                {territory.racket ? 'Racket Active' : 'No Racket'}
                              </Badge>
                            </div>
                            
                            {territory.racket && (
                              <div className="mt-2 p-2 bg-gray-800/50 rounded-md">
                                <p className="text-sm font-semibold text-foreground">{territory.racket.name}</p>
                                <p className="text-xs text-foreground/90 font-medium">
                                  {territory.racket.description || 
                                   (territory.racket.reward?.type === 'Money' ? 
                                     `$${territory.racket.reward.quantity.toLocaleString()} daily` : 
                                     `${territory.racket.reward?.quantity}x ${territory.racket.reward?.type} daily`)}
                                </p>
                              </div>
                            )}
                            
                            <div className="flex justify-between items-center mt-4">
                              <span className="text-sm">
                                <Badge variant="outline" className="bg-gray-800/50 text-foreground">
                                  {territory.respect} respect
                                </Badge>
                              </span>
                              <span className="text-xs text-foreground/80 font-medium">
                                {territory.acquired_at ? 
                                  `Acquired ${new Date(territory.acquired_at * 1000).toLocaleDateString()}` : 
                                  'Recently acquired'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-gray-700">
                      <div className="flex flex-col justify-center items-center py-16 text-gray-400">
                        <AlertCircle className="h-12 w-12 mb-4 opacity-40" />
                        <p>No territory data available.</p>
                        <p className="text-sm">Your faction may not control any territories.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            {/* Wars Tab */}
            <TabsContent value="wars">
              {faction.recent_wars && faction.recent_wars.length > 0 ? (
                <>
                  {/* Active Wars Section */}
                  {(() => {
                    // Get current timestamp for comparison
                    const currentTime = Math.floor(Date.now() / 1000);
                    
                    // Identify active wars (those without an end date or end date is in the future)
                    const activeWars = faction.recent_wars.filter((war: any) => !war.end || (war.end && war.end > currentTime));
                    
                    if (activeWars.length > 0) {
                      return (
                        <div className="mb-6">
                          <h3 className="text-lg font-medium mb-3 text-foreground">Active Wars ({activeWars.length})</h3>
                          <div className="rounded-md border border-gray-700 overflow-hidden mb-4">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-800 hover:bg-gray-800">
                                  <TableHead className="text-gray-300">War ID</TableHead>
                                  <TableHead className="text-gray-300">Opponent</TableHead>
                                  <TableHead className="text-gray-300">Start Date</TableHead>
                                  <TableHead className="text-gray-300">End Date</TableHead>
                                  <TableHead className="text-gray-300">Status</TableHead>
                                  <TableHead className="text-gray-300">Score</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {activeWars.map((war: any, index: number) => {
                                  const startDate = new Date(war.start * 1000);
                                  const ourFaction = war.factions.find((f: any) => f.id === faction.id);
                                  const opposingFaction = war.factions.find((f: any) => f.id !== faction.id);
                                  const ourScore = ourFaction ? ourFaction.score : 0;
                                  const theirScore = opposingFaction ? opposingFaction.score : 0;
                                  const isWinning = ourScore > theirScore;
                                  const isLosing = ourScore < theirScore;
                                  
                                  return (
                                    <TableRow key={`active-${index}`} className="hover:bg-blue-900/20">
                                      <TableCell className="font-medium">#{war.id}</TableCell>
                                      <TableCell>
                                        {opposingFaction ? (
                                          <a 
                                            href={`https://www.torn.com/factions.php?step=profile&ID=${opposingFaction.id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:underline"
                                          >
                                            {opposingFaction.name}
                                          </a>
                                        ) : (
                                          <span className="text-gray-400">Unknown</span>
                                        )}
                                      </TableCell>
                                      <TableCell>{startDate.toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        <span className="text-yellow-400">In Progress</span>
                                      </TableCell>
                                      <TableCell>
                                        {isWinning ? (
                                          <Badge className="bg-green-500/20 text-green-400">Winning</Badge>
                                        ) : isLosing ? (
                                          <Badge className="bg-red-500/20 text-red-400">Losing</Badge>
                                        ) : (
                                          <Badge className="bg-yellow-500/20 text-yellow-400">Tied</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="font-bold">
                                          <span className={isWinning ? "text-green-400" : "text-foreground"}>{ourScore.toLocaleString()}</span>
                                          <span className="text-gray-400 mx-1">vs</span>
                                          <span className={isLosing ? "text-red-400" : "text-foreground"}>{theirScore.toLocaleString()}</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Completed Wars Section */}
                  {(() => {
                    // Get current timestamp for comparison
                    const currentTime = Math.floor(Date.now() / 1000);
                    
                    // Filter completed wars (those with an end date in the past)
                    const completedWars = faction.recent_wars.filter((war: any) => war.end && war.end <= currentTime);
                    
                    // Calculate total pages
                    const totalPages = Math.ceil(completedWars.length / WARS_PER_PAGE);
                    
                    // Get wars for current page
                    const startIndex = (warPage - 1) * WARS_PER_PAGE;
                    const paginatedWars = completedWars.slice(startIndex, startIndex + WARS_PER_PAGE);
                    
                    return (
                      <div>
                        <h3 className="text-lg font-medium mb-3 text-foreground">
                          War History ({completedWars.length})
                        </h3>
                        <div className="rounded-md border border-gray-700 overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-800 hover:bg-gray-800">
                                <TableHead className="text-gray-300">War ID</TableHead>
                                <TableHead className="text-gray-300">Opponent</TableHead>
                                <TableHead className="text-gray-300">Start Date</TableHead>
                                <TableHead className="text-gray-300">End Date</TableHead>
                                <TableHead className="text-gray-300">Outcome</TableHead>
                                <TableHead className="text-gray-300">Score</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {paginatedWars.length > 0 ? (
                                paginatedWars.map((war: any, index: number) => {
                                  const startDate = new Date(war.start * 1000);
                                  const endDate = war.end ? new Date(war.end * 1000) : null;
                                  const isWinner = war.winner === faction.id;
                                  const ourFaction = war.factions.find((f: any) => f.id === faction.id);
                                  const opposingFaction = war.factions.find((f: any) => f.id !== faction.id);
                                  
                                  return (
                                    <TableRow key={`completed-${index}`} className="hover:bg-game-panel/40">
                                      <TableCell className="font-medium">#{war.id}</TableCell>
                                      <TableCell>
                                        {opposingFaction ? (
                                          <a 
                                            href={`https://www.torn.com/factions.php?step=profile&ID=${opposingFaction.id}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline"
                                          >
                                            {opposingFaction.name}
                                          </a>
                                        ) : (
                                          <span className="text-gray-400">Unknown</span>
                                        )}
                                      </TableCell>
                                      <TableCell>{startDate.toLocaleDateString()}</TableCell>
                                      <TableCell>
                                        {endDate ? endDate.toLocaleDateString() : "Ongoing"}
                                      </TableCell>
                                      <TableCell>
                                        {isWinner ? (
                                          <Badge className="bg-green-500/20 text-green-500">Victory</Badge>
                                        ) : (
                                          <Badge className="bg-red-500/20 text-red-500">Defeat</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="font-bold">
                                          {ourFaction ? ourFaction.score.toLocaleString() : "0"} 
                                          <span className="text-gray-400 mx-1">vs</span> 
                                          {opposingFaction ? opposingFaction.score.toLocaleString() : "0"}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-6 text-gray-400">
                                    No completed wars found.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex justify-between items-center p-4 bg-gray-800/50 mt-4 rounded-md">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setWarPage(p => Math.max(1, p - 1))}
                              disabled={warPage === 1}
                              className="border-blue-700 hover:bg-blue-900/20"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                            <span className="px-4 py-2 bg-gray-800 rounded-md text-sm font-medium">
                              Page {warPage} of {totalPages}
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setWarPage(p => Math.min(totalPages, p + 1))}
                              disabled={warPage === totalPages}
                              className="border-blue-700 hover:bg-blue-900/20"
                            >
                              Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              ) : (
                <div className="rounded-md border border-gray-700 bg-game-dark p-6">
                  <div className="flex flex-col justify-center items-center py-8 text-gray-400">
                    <Shield className="h-12 w-12 mb-4 opacity-40" />
                    <p className="text-lg font-medium mb-1">No Recent Wars</p>
                    <p className="text-sm text-gray-500">
                      {faction.last_war ? (
                        `Last war ended ${faction.last_war} ago`
                      ) : (
                        "This faction has not participated in any recent wars"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}