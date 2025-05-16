import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Building, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

interface CompanyEmployee {
  id: number;
  name: string;
  position: string;
  status: string;
  last_action: string;
  days_in_company: number;
  effectiveness?: number; // From the company_employees data
  wage?: number; 
  stats?: {
    manual_labor: number;
    intelligence: number;
    endurance: number;
  };
}

interface CompanyPosition {
  id: number;
  name: string;
  description: string;
  required_stats: {
    intelligence: number;
    endurance: number;
    manual_labor: number;
  };
  employees_count: number;
  max_employees: number;
}

interface CompanyStats {
  popularity?: number;
  efficiency?: number;
  environment?: number;
  profitability?: number;
  days_old?: number;
  daily_revenue?: number;
  weekly_profit?: number;
  production_rate?: number;
}

interface CompanyDetailResponse {
  id: number;
  name: string;
  type: string;
  rating: number;
  employees: {
    current: number;
    max: number;
    list: CompanyEmployee[];
  };
  positions: CompanyPosition[];
  stats: CompanyStats;
}

export default function CompanyPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  const { data, isLoading, isError, refetch, isFetching } = useQuery<CompanyDetailResponse>({
    queryKey: ["/api/company/detail"],
    enabled: !!user?.apiKey
  });
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Online": return "text-green-500";
      case "Idle": return "text-yellow-500";
      case "Offline": return "text-red-500";
      case "Hospital": return "text-gray-500";
      default: return "text-gray-400";
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "online": 
      case "okay": 
        return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">Okay</Badge>;
      case "idle": 
        return <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">Idle</Badge>;
      case "offline": 
        return <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">Offline</Badge>;
      case "hospital": 
        return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30">Hospital</Badge>;
      case "traveling": 
        return <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30">Traveling</Badge>;
      case "jail":
      case "federal": 
        return <Badge className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30">Jail</Badge>;
      default: 
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const filteredEmployees = data?.employees.list.filter(employee => {
    return (statusFilter === "all" || employee.status === statusFilter) &&
           (positionFilter === "all" || employee.position === positionFilter) &&
           (searchQuery === "" || 
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.position.toLowerCase().includes(searchQuery.toLowerCase()));
  });
  
  if (isLoading) {
    return (
      <MainLayout title="Company Tracking">
        <Helmet>
          <title>Company Tracking | Byte-Core Vault</title>
          <meta name="description" content="Track your Torn RPG company employees and performance with Byte-Core Vault." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading company data...</span>
        </div>
      </MainLayout>
    );
  }
  
  if (isError || !data) {
    const errorMessage = user?.apiKey 
      ? "Failed to load company data. You might not be in a company or there was an API error."
      : "Please add your Torn API key in settings to view your company data.";
    
    return (
      <MainLayout title="Company Tracking">
        <Helmet>
          <title>Company Tracking | Byte-Core Vault</title>
          <meta name="description" content="Track your Torn RPG company employees and performance with Byte-Core Vault." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Company Data Unavailable</h3>
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
    <MainLayout title="Company Tracking">
      <Helmet>
        <title>Company Tracking | Byte-Core Vault</title>
        <meta name="description" content="Track your Torn RPG company employees and performance with Byte-Core Vault." />
      </Helmet>
      
      <div className="mb-6">
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded mr-3 bg-primary bg-opacity-20 flex items-center justify-center">
                  <Building className="text-primary h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-rajdhani font-bold text-xl">{data.name}</h2>
                  <p className="text-sm text-gray-400">ID: #{data.id} • {data.type} • {data.rating} Stars</p>
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
                <div className="text-xs text-gray-400 mb-1">EMPLOYEES</div>
                <div className="text-xl font-rajdhani font-bold">
                  {data.employees.current} / {data.employees.max}
                </div>
                <div className="h-1.5 mt-1 bg-gray-700 rounded-full relative overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full absolute top-0 left-0"
                    style={{ width: `${(data.employees.current / (data.employees.max || 1)) * 100}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">POPULARITY</div>
                <div className="text-xl font-rajdhani font-bold">
                  {(data.stats.popularity || 0).toFixed(1)}%
                </div>
                <div className="h-1.5 mt-1 bg-gray-700 rounded-full relative overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full absolute top-0 left-0"
                    style={{ width: `${data.stats.popularity || 0}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">EFFICIENCY</div>
                <div className="text-xl font-rajdhani font-bold">
                  {(data.stats.efficiency || 0).toFixed(1)}%
                </div>
                <div className="h-1.5 mt-1 bg-gray-700 rounded-full relative overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full absolute top-0 left-0"
                    style={{ width: `${data.stats.efficiency || 0}%` }}
                  />
                </div>
              </div>
              
              <div className="bg-game-panel rounded p-3 border border-gray-700">
                <div className="text-xs text-gray-400 mb-1">WEEKLY PROFIT</div>
                <div className="text-xl font-rajdhani font-bold text-green-400">
                  ${data.stats.weekly_profit.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Daily: ${data.stats.daily_revenue.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="border-gray-700 bg-game-dark shadow-game">
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
        </CardHeader>
        
        <CardContent>
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
                  {/* Extract unique positions from employees */}
                  {Array.from(
                    new Set(data.employees.list.map(emp => emp.position))
                  ).map(position => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="rounded-md border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-gray-700">
                  <TableHead className="w-[250px]">Employee</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Effectiveness</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Wage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees && filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id} className="border-gray-700">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary bg-opacity-30 flex items-center justify-center mr-2">
                            <span className="text-primary-light font-bold">{employee.name[0]}</span>
                          </div>
                          <div>
                            <div>{employee.name}</div>
                            <div className="text-xs text-gray-400">#{employee.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end">
                          <span className="mr-2">{employee.effectiveness || 0}%</span>
                          <div className="w-16 bg-gray-700 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                (employee.effectiveness || 0) > 120 ? "bg-green-500" : 
                                (employee.effectiveness || 0) > 90 ? "bg-blue-500" : 
                                (employee.effectiveness || 0) > 70 ? "bg-yellow-500" : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min((employee.effectiveness || 0), 140) / 1.4}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{employee.days_in_company}</TableCell>
                      <TableCell className="text-right">${(employee.wage || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      {searchQuery || statusFilter !== 'all' || positionFilter !== 'all' 
                        ? "No employees match your filters."
                        : "No employees found in your company."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="text-xs text-gray-400 mt-2 text-right">
            Showing {filteredEmployees?.length || 0} of {data.employees.list.length} employees
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
