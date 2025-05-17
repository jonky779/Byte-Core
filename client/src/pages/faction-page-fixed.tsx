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

export default function FactionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("members");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Fetch faction data from the API
  const { 
    data: faction, 
    isLoading, 
    error,
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ["/api/faction"],
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
                  
                  <div className="relative w-[150px]">
                    <Select value={positionFilter} onValueChange={setPositionFilter}>
                      <SelectTrigger className="w-full bg-game-panel border-gray-700">
                        <SelectValue placeholder="Filter by position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {faction.members ? (
                          (() => {
                            try {
                              // Extract and sort unique positions from actual data
                              const positions = new Set<string>();
                              Object.values(faction.members).forEach((member: any) => {
                                if (member && member.position) {
                                  positions.add(member.position);
                                }
                              });
                              
                              // Convert to array, sort, and return as SelectItems
                              return Array.from(positions).sort().map(position => (
                                <SelectItem key={position} value={position}>
                                  {position}
                                </SelectItem>
                              ));
                            } catch (error) {
                              console.error("Error extracting positions:", error);
                              return null;
                            }
                          })()
                        ) : null}
                      </SelectContent>
                    </Select>
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
              <div className="rounded-md border border-gray-700">
                <div className="flex flex-col justify-center items-center py-16 text-gray-400">
                  <AlertCircle className="h-12 w-12 mb-4 opacity-40" />
                  <p>Territory data is not yet available from the API.</p>
                  <p className="text-sm">This feature will be coming soon.</p>
                </div>
              </div>
            </TabsContent>
            
            {/* Wars Tab */}
            <TabsContent value="wars">
              <div className="rounded-md border border-gray-700">
                <div className="flex flex-col justify-center items-center py-16 text-gray-400">
                  <AlertCircle className="h-12 w-12 mb-4 opacity-40" />
                  <p>War history is not yet available from the API.</p>
                  <p className="text-sm">This feature will be coming soon.</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}