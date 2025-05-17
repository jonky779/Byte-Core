import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth";
import MainLayout from "@/components/layouts/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Users, Trophy, Globe, Shield, Activity, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FactionDetailedData {
  id: number;
  name: string;
  tag: string;
  leader: {
    id: number;
    name: string;
  };
  co_leader?: {
    id: number;
    name: string;
  };
  age_days: number;
  respect: number;
  capacity: {
    current: number;
    maximum: number;
  };
  peace: boolean;
  territories: {
    count: number;
    list: string[];
  };
  members: {
    [key: string]: {
      id: number;
      name: string;
      level: number;
      days_in_faction: number;
      last_action: {
        status: string;
        timestamp: number;
        relative: string;
      };
      position: string;
      status: {
        description: string;
        details: string;
        state: string;
      };
    };
  };
  chain: {
    current: number;
    max: number;
    timeout: number;
    cooldown: boolean;
  };
  stats: {
    medicalitemsused: number;
    criminaloffences: number;
    organisedcrimerespect: number;
    organisedcrimemoney: number;
    organisedcrimesuccess: number;
    organisedcrimefailed: number;
    attackswon: number;
    attackslost: number;
    attacksleave: number;
    attacksmug: number;
    attackshosp: number;
    bestchain: number;
    busts: number;
    revives: number;
    jails: number;
    hosps: number;
    rankedwarswon: number;
    rankedwarslost: number;
    rankedpoints: number;
    raidswon: number;
    raidslost: number;
    territoryrespect: number;
  };
  last_updated: string;
}

export default function FactionDetailPage() {
  const { user } = useAuth();

  const { data: factionDetailedData, isLoading, isError } = useQuery<FactionDetailedData | undefined>({
    queryKey: ["/api/faction/detail"],
    enabled: !!user?.apiKey
  });

  if (isLoading) {
    return (
      <MainLayout title="Faction Details">
        <Helmet>
          <title>Faction Details | Loading... | Byte-Core Vault</title>
        </Helmet>
        <div className="container py-4">
          <div className="flex items-center mb-6">
            <Skeleton className="h-12 w-12 rounded-full mr-4" />
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          <Tabs defaultValue="overview">
            <Skeleton className="h-10 w-full max-w-md mb-6" />
            <Skeleton className="h-64 w-full rounded-md" />
          </Tabs>
        </div>
      </MainLayout>
    );
  }

  if (isError || !factionDetailedData) {
    return (
      <MainLayout title="Faction Details">
        <Helmet>
          <title>Faction Details | Error | Byte-Core Vault</title>
        </Helmet>
        <div className="container py-8">
          <Card className="border-red-500">
            <CardContent className="pt-6 flex flex-col items-center">
              <AlertCircle className="text-red-500 h-16 w-16 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Error Loading Faction Data</h2>
              <p className="text-gray-500 text-center mb-4">
                {user?.apiKey 
                  ? "There was an error loading your faction details. Please try again later."
                  : "Please add your Torn API key in settings to view your faction details."}
              </p>
              <Button onClick={() => window.location.href = '/'}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // If user is not in a faction
  if (factionDetailedData.id === 0) {
    return (
      <MainLayout title="Not in a Faction">
        <Helmet>
          <title>Not in a Faction | Byte-Core Vault</title>
        </Helmet>
        <div className="container py-8">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center">
              <Users className="text-gray-400 h-16 w-16 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Not in a Faction</h2>
              <p className="text-gray-500 text-center mb-4">
                You are currently not a member of any faction.
              </p>
              <Button onClick={() => window.location.href = '/'}>Return to Dashboard</Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Calculate member stats
  const totalMembers = factionDetailedData.capacity.current;
  const membersByStatus = {
    online: 0,
    idle: 0,
    offline: 0,
    hospital: 0,
    jail: 0,
    traveling: 0
  };

  // Process members if available
  if (factionDetailedData.members) {
    Object.values(factionDetailedData.members).forEach(member => {
      const status = member.last_action.status;
      if (status === "Online") membersByStatus.online++;
      else if (status === "Idle") membersByStatus.idle++;
      else if (status === "Offline") membersByStatus.offline++;
      
      if (member.status) {
        if (member.status.state === "Hospital") membersByStatus.hospital++;
        else if (member.status.state === "Jail") membersByStatus.jail++;
        else if (member.status.state === "Traveling") membersByStatus.traveling++;
      }
    });
  }

  // Member positions
  const positions: {
    [key: string]: Array<{
      id: number;
      name: string;
      level: number;
      days_in_faction: number;
      last_action: {
        status: string;
        timestamp: number;
        relative: string;
      };
      position: string;
      status: {
        description: string;
        details: string;
        state: string;
      };
    }>
  } = {
    'Leader': [],
    'Co-leader': [],
    'Officer': [],
    'Member': [],
    'New Member': []
  };

  if (factionDetailedData.members) {
    Object.values(factionDetailedData.members).forEach(member => {
      const position = member.position || 'Member';
      if (positions[position]) {
        positions[position].push(member);
      } else {
        positions['Member'].push(member);
      }
    });
  }

  return (
    <MainLayout title={`${factionDetailedData.name} - Faction Details`}>
      <Helmet>
        <title>{factionDetailedData.name} | Faction Details | Byte-Core Vault</title>
      </Helmet>
      <div className="container py-4">
        {/* Faction Header */}
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-blue-600 bg-opacity-20 rounded-full flex items-center justify-center mr-4">
            <Users className="text-blue-400 h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {factionDetailedData.name} 
              <Badge className="ml-2 bg-blue-600">{factionDetailedData.tag}</Badge>
            </h1>
            <p className="text-gray-500">ID: {factionDetailedData.id} • {factionDetailedData.age_days} days old</p>
          </div>
        </div>

        {/* Faction Tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="territory">Territory</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Member Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Online ({membersByStatus.online})</span>
                        <span className="text-sm">{Math.round((membersByStatus.online / totalMembers) * 100)}%</span>
                      </div>
                      <Progress value={(membersByStatus.online / totalMembers) * 100} className="h-2 bg-gray-700">
                        <div className="h-full bg-green-500" style={{ width: `${(membersByStatus.online / totalMembers) * 100}%` }}></div>
                      </Progress>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Idle ({membersByStatus.idle})</span>
                        <span className="text-sm">{Math.round((membersByStatus.idle / totalMembers) * 100)}%</span>
                      </div>
                      <Progress value={(membersByStatus.idle / totalMembers) * 100} className="h-2 bg-gray-700">
                        <div className="h-full bg-yellow-500" style={{ width: `${(membersByStatus.idle / totalMembers) * 100}%` }}></div>
                      </Progress>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Offline ({membersByStatus.offline})</span>
                        <span className="text-sm">{Math.round((membersByStatus.offline / totalMembers) * 100)}%</span>
                      </div>
                      <Progress value={(membersByStatus.offline / totalMembers) * 100} className="h-2 bg-gray-700">
                        <div className="h-full bg-red-500" style={{ width: `${(membersByStatus.offline / totalMembers) * 100}%` }}></div>
                      </Progress>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Hospital ({membersByStatus.hospital})</span>
                        <span className="text-sm">{Math.round((membersByStatus.hospital / totalMembers) * 100)}%</span>
                      </div>
                      <Progress value={(membersByStatus.hospital / totalMembers) * 100} className="h-2 bg-gray-700">
                        <div className="h-full bg-blue-500" style={{ width: `${(membersByStatus.hospital / totalMembers) * 100}%` }}></div>
                      </Progress>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Faction Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-game-panel p-3 rounded">
                      <div className="text-2xl font-rajdhani font-bold">
                        {factionDetailedData.respect >= 1000000 
                          ? `${(factionDetailedData.respect / 1000000).toFixed(1)}M` 
                          : factionDetailedData.respect.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">RESPECT</div>
                    </div>
                    <div className="bg-game-panel p-3 rounded">
                      <div className="text-2xl font-rajdhani font-bold">
                        {factionDetailedData.capacity.current}
                        <span className="text-xs text-gray-400">/{factionDetailedData.capacity.maximum || "?"}</span>
                      </div>
                      <div className="text-xs text-gray-400">MEMBERS</div>
                    </div>
                    <div className="bg-game-panel p-3 rounded">
                      <div className="text-2xl font-rajdhani font-bold">
                        {factionDetailedData.territories.count}
                      </div>
                      <div className="text-xs text-gray-400">TERRITORIES</div>
                    </div>
                    <div className="bg-game-panel p-3 rounded">
                      <div className="text-2xl font-rajdhani font-bold text-yellow-400">
                        {factionDetailedData.peace ? "PEACE" : "WAR"}
                      </div>
                      <div className="text-xs text-gray-400">STATUS</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Trophy className="h-5 w-5 mr-2" />
                  Key Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.attackswon || 0}
                    </div>
                    <div className="text-xs text-gray-400">ATTACKS WON</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.rankedwarswon || 0}
                    </div>
                    <div className="text-xs text-gray-400">WARS WON</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.bestchain || 0}
                    </div>
                    <div className="text-xs text-gray-400">BEST CHAIN</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.territoryrespect 
                        ? `${(factionDetailedData.stats.territoryrespect / 1000000).toFixed(1)}M` 
                        : "0"}
                    </div>
                    <div className="text-xs text-gray-400">TERRITORY RESPECT</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Leadership
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={`https://profileimages.torn.com/2b54d2f5-${factionDetailedData.leader.id}-9079037.png`} />
                        <AvatarFallback>L</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{factionDetailedData.leader.name}</p>
                        <p className="text-sm text-gray-500">Leader</p>
                      </div>
                    </div>
                  </div>
                  
                  {factionDetailedData.co_leader && (
                    <div className="flex items-center">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://profileimages.torn.com/2b54d2f5-${factionDetailedData.co_leader.id}-9079037.png`} />
                          <AvatarFallback>C</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{factionDetailedData.co_leader.name}</p>
                          <p className="text-sm text-gray-500">Co-Leader</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Members ({factionDetailedData.capacity.current})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(positions).map(([position, members]) => 
                    members.length > 0 && (
                      <div key={position}>
                        <h3 className="font-medium mb-2">{position} ({members.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {members.map(member => (
                            <div key={member.id} className="bg-game-panel rounded p-3 flex items-center">
                              <Avatar className="h-10 w-10 mr-3">
                                <AvatarImage src={`https://profileimages.torn.com/2b54d2f5-${member.id}-9079037.png`} />
                                <AvatarFallback>{member.name.substring(0, 1)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <div className="flex items-center text-xs text-gray-400">
                                  <span>Level {member.level}</span>
                                  <span className="mx-1">•</span>
                                  <span className={
                                    member.last_action.status === "Online" ? "text-green-400" : 
                                    member.last_action.status === "Idle" ? "text-yellow-400" : "text-red-400"
                                  }>
                                    {member.last_action.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}

                  {/* If no members are available */}
                  {Object.values(positions).every(members => members.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No member details available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Faction Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.attackswon || 0}
                    </div>
                    <div className="text-xs text-gray-400">ATTACKS WON</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.attackslost || 0}
                    </div>
                    <div className="text-xs text-gray-400">ATTACKS LOST</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.bestchain || 0}
                    </div>
                    <div className="text-xs text-gray-400">BEST CHAIN</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.rankedwarswon || 0}
                    </div>
                    <div className="text-xs text-gray-400">RANKED WARS WON</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.rankedwarslost || 0}
                    </div>
                    <div className="text-xs text-gray-400">RANKED WARS LOST</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.hosps || 0}
                    </div>
                    <div className="text-xs text-gray-400">HOSPITALIZATIONS</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.busts || 0}
                    </div>
                    <div className="text-xs text-gray-400">BUSTS</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.revives || 0}
                    </div>
                    <div className="text-xs text-gray-400">REVIVES</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.territoryrespect 
                        ? `${(factionDetailedData.stats.territoryrespect / 1000000).toFixed(1)}M` 
                        : "0"}
                    </div>
                    <div className="text-xs text-gray-400">TERRITORY RESPECT</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.raidswon || 0}
                    </div>
                    <div className="text-xs text-gray-400">RAIDS WON</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.stats?.raidslost || 0}
                    </div>
                    <div className="text-xs text-gray-400">RAIDS LOST</div>
                  </div>
                  <div className="bg-game-panel p-3 rounded">
                    <div className="text-lg font-rajdhani font-bold">
                      {factionDetailedData.chain?.current || 0}
                    </div>
                    <div className="text-xs text-gray-400">CURRENT CHAIN</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Territory Tab */}
          <TabsContent value="territory">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Territories ({factionDetailedData.territories.count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {factionDetailedData.territories.list && factionDetailedData.territories.list.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {factionDetailedData.territories.list.map(territory => (
                      <div key={territory} className="bg-game-panel p-3 rounded">
                        <div className="font-medium">{territory}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Globe className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-gray-500">No territories held</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}