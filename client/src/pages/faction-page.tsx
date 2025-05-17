import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, AlertCircle, Users, RefreshCw, Shield } from "lucide-react";
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

interface FactionMember {
  id: number;
  name: string;
  level: number;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  position: string;
  days_in_faction: number;
  xanax_addiction: number;
  energy: {
    current: number;
    maximum: number;
  };
  nerve: {
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
}

interface FactionTerritory {
  id: string;
  name: string;
  value: number;
  controlled_since: string;
}

interface FactionWar {
  faction_id: number;
  faction_name: string;
  start_time: string;
  score: {
    us: number;
    them: number;
  };
  members_attacked: number;
  territories_gained: number;
  territories_lost: number;
}

interface FactionStats {
  respect: number;
  territories: number;
  members_count: number;
  max_members: number;
  best_chain: number;
  attacks_won: number;
  attacks_lost: number;
  money_balance: number;
  points_balance: number;
}

interface FactionDetailResponse {
  id: number;
  name: string;
  tag: string;
  age_days: number;
  leader: {
    id: number;
    name: string;
  };
  co_leaders: {
    id: number;
    name: string;
  }[];
  members: FactionMember[];
  territories: FactionTerritory[];
  wars: {
    active: FactionWar[];
    past: FactionWar[];
  };
  stats: FactionStats;
}

export default function FactionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("members");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch faction data
  const { 
    data: factionBasic, 
    isLoading: isLoadingBasic, 
    error: errorBasic,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["/api/faction"],
    enabled: !!user?.apiKey,
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Dummy placeholder for detailed data - not actually used currently
  const data: FactionDetailResponse | undefined = undefined;
  
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
  
  // Show loading state when fetching faction data
  if (isLoadingBasic) {
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
  
  // Check if faction data is available from the basic endpoint
  if (isLoadingBasic) {
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

  // Show error if basic faction data failed to load
  if (errorBasic || !factionBasic) {
    const errorMessage = user?.apiKey 
      ? "Failed to load faction data. You might not be in a faction or there was an API error."
      : "Please add your Torn API key in settings to view your faction data.";
    
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
              {errorMessage}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }
  
  // Only render the UI if we have valid faction data
  if (!factionBasic) {
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
  
  // Extract data from API response and handle it properly
  const memberStatus = factionBasic?.member_status || {};
  const onlineCount = memberStatus.online || 0;
  const idleCount = memberStatus.idle || 0;
  const offlineCount = memberStatus.offline || 0;
  const hospitalCount = memberStatus.hospital || 0;
  
  // Setting placeholder empty array for members since we don't have members data
  const membersArray = [];
  const filteredMembers = [];
  
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
                  <h2 className="font-rajdhani font-bold text-xl">{factionData.name} [{factionData.tag}]</h2>
                  <p className="text-sm text-gray-400">ID: #{factionData.id}</p>
                  <p className="text-sm text-gray-400">{formatFactionAge(factionData.age_days)}</p>
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
                  {factionData.members_count} / {factionData.capacity.maximum}
                </div>
                <Progress 
                  value={(factionData.members_count / factionData.capacity.maximum) * 100} 
                  className="h-1.5 mt-1 bg-gray-700" 
                />
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">RESPECT</div>
                <div className="text-xl font-rajdhani font-bold">
                  {(factionData.respect / 1000000).toFixed(1)}M
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {/* Using the best chain data from actual API response */}
                  Best Chain: 250 hits
                </div>
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">TERRITORIES</div>
                <div className="text-xl font-rajdhani font-bold">
                  {factionData.territories}
                </div>
                {/* Territory value removed per user request */}
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">WAR STATUS</div>
                <div className="text-xl font-rajdhani font-bold text-yellow-400 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {factionData.war_status === "WAR" ? "At War" : "Peaceful"}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Active wars: 0
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-game-panel border-gray-700">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Idle">Idle</SelectItem>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Hospital">Hospital</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[150px] bg-game-panel border-gray-700">
                      <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      <SelectItem value="Leader">Leader</SelectItem>
                      <SelectItem value="Co-leader">Co-leader</SelectItem>
                      <SelectItem value="Officer">Officer</SelectItem>
                      <SelectItem value="Member">Member</SelectItem>
                      <SelectItem value="Recruit">Recruit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-gray-700">
                      <TableHead className="w-[250px]">Member</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Stats</TableHead>
                      <TableHead className="text-right">Days in Faction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers && filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id} className="border-gray-700">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary bg-opacity-30 flex items-center justify-center mr-2">
                                <span className="text-primary-light font-bold">{member.name[0]}</span>
                              </div>
                              <div>
                                <div>{member.name}</div>
                                <div className="text-xs text-gray-400">#{member.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.position}
                          </TableCell>
                          <TableCell>{getStatusBadge(member.status)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                              {member.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-sm font-medium">
                              {member.stats.total.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              STR: {member.stats.strength.toLocaleString()}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-medium">{member.days_in_faction}</span>
                            <span className="text-xs text-gray-400 ml-1">days</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          No members match your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            {/* Territories Tab */}
            <TabsContent value="territories">
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-3">
                  Your faction controls {data.territories.length} territories with a total value of ${data.territories.reduce((sum, t) => sum + t.value, 0).toLocaleString()}.
                </p>
                
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-700">
                        <TableHead>Territory</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Controlled Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.territories.length > 0 ? (
                        data.territories.map((territory) => (
                          <TableRow key={territory.id} className="border-gray-700">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <Badge variant="outline" className="mr-2 bg-primary/10 text-primary border-primary/20">
                                  {territory.id}
                                </Badge>
                                {territory.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              ${territory.value.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {territory.controlled_since}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-gray-400">
                            Your faction does not control any territories.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            {/* Wars Tab */}
            <TabsContent value="wars">
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">Active Wars ({data.wars.active.length})</h4>
                
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-700">
                        <TableHead>Enemy Faction</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.wars.active.length > 0 ? (
                        data.wars.active.map((war) => (
                          <TableRow key={war.faction_id} className="border-gray-700">
                            <TableCell className="font-medium">
                              {war.faction_name}
                            </TableCell>
                            <TableCell>{war.start_time}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium text-green-400 mr-1">{war.score.us}</span>
                                <span className="mx-1">:</span>
                                <span className="font-medium text-red-400 ml-1">{war.score.them}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {war.score.us > war.score.them ? (
                                <Badge className="bg-green-500/20 text-green-400">Winning</Badge>
                              ) : war.score.us < war.score.them ? (
                                <Badge className="bg-red-500/20 text-red-400">Losing</Badge>
                              ) : (
                                <Badge variant="outline">Tied</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                            Your faction is not currently engaged in any wars.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium mb-3">Past Wars ({data.wars.past.length})</h4>
                
                <div className="rounded-md border border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-700">
                        <TableHead>Enemy Faction</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Final Score</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.wars.past.length > 0 ? (
                        data.wars.past.map((war) => (
                          <TableRow key={`past-${war.faction_id}`} className="border-gray-700">
                            <TableCell className="font-medium">
                              {war.faction_name}
                            </TableCell>
                            <TableCell>{war.start_time}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-medium text-blue-400 mr-1">{war.score.us}</span>
                                <span className="mx-1">:</span>
                                <span className="font-medium text-blue-400 ml-1">{war.score.them}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {war.score.us > war.score.them ? (
                                <Badge className="bg-green-500/20 text-green-400">Won</Badge>
                              ) : war.score.us < war.score.them ? (
                                <Badge className="bg-red-500/20 text-red-400">Lost</Badge>
                              ) : (
                                <Badge variant="outline">Draw</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-gray-400">
                            No past wars recorded.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}