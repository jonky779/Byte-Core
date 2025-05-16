import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Building } from "lucide-react";

type EmployeeStatus = "Online" | "Offline" | "Idle";

interface Employee {
  id: number;
  name: string;
  position: string;
  status: string;
  last_action: string;
  days_in_company?: number;
  effectiveness?: number;
}

interface CompanyData {
  id: number;
  name: string;
  type: string;
  employees: {
    current: number;
    max: number;
    list: Employee[];
  };
  rating: number;
}

export default function CompanyTracking() {
  const { user } = useAuth();
  
  const { data: companyData, isLoading, isError } = useQuery<CompanyData | undefined>({
    queryKey: ["/api/company"],
    enabled: !!user?.apiKey
  });
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "online": 
      case "okay": 
        return "text-green-400";
      case "idle": 
        return "text-yellow-400";
      case "offline": 
        return "text-gray-400";
      case "hospital": 
        return "text-red-400";
      case "traveling": 
        return "text-blue-400";
      case "federal": 
      case "jail": 
        return "text-orange-400";
      default: 
        return "text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-game-dark border-gray-700 shadow-game h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Company Tracking</h3>
            <Skeleton className="w-6 h-6 rounded-full" />
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="mb-4 flex items-center">
            <Skeleton className="w-12 h-12 rounded mr-3" />
            <div className="flex-1">
              <Skeleton className="w-3/4 h-5 mb-2" />
              <Skeleton className="w-1/2 h-4" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Skeleton className="h-16 rounded" />
            <Skeleton className="h-16 rounded" />
          </div>
          
          <div className="mb-3">
            <Skeleton className="w-1/3 h-4 mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-14 rounded" />
              ))}
            </div>
          </div>
          
          <Skeleton className="w-full h-10 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !companyData) {
    const errorMessage = user?.apiKey 
      ? "Failed to load company data. You might not be in a company or there was an API error."
      : "Please add your Torn API key in settings to view your company data.";
    
    return (
      <Card className="bg-game-dark border-gray-700 shadow-game h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Company Tracking</h3>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
          <Building className="h-10 w-10 text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Company Data</h3>
          <p className="text-gray-400 text-sm mb-4">
            {errorMessage}
          </p>
          <Link href="/settings">
            <Button size="sm" variant="outline">
              Manage API Key
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  // If the user isn't in a company (id is 0), show a nicer message
  if (companyData.id === 0 || companyData.name.includes("No Company")) {
    return (
      <Card className="bg-game-dark border-gray-700 shadow-game h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Company Tracking</h3>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
          <Building className="h-10 w-10 text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Not in a Company</h3>
          <p className="text-gray-400 text-sm mb-4">
            You are currently not a member of any company.
          </p>
          <Link href="/settings">
            <Button size="sm" variant="outline">
              Manage API Key
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  
  // Initialize employees list if it doesn't exist
  const employees = companyData.employees || { current: 0, max: 0, list: [] };
  if (!employees.list) {
    employees.list = [];
  }

  return (
    <Card className="bg-game-dark border-gray-700 shadow-game h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-rajdhani font-bold text-lg">Company Tracking</h3>
          <Button variant="ghost" size="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-white">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="mb-4 flex items-center">
          <div className="w-12 h-12 rounded mr-3 bg-primary bg-opacity-20 flex items-center justify-center">
            <Building className="text-primary h-6 w-6" />
          </div>
          <div>
            <h4 className="font-medium">{companyData.name}</h4>
            <div className="text-xs text-gray-400">ID: #{companyData.id} • {companyData.type}</div>
          </div>
        </div>
        
        {/* Company Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-game-panel rounded p-2 text-center">
            <div className="text-2xl font-rajdhani font-bold">
              {companyData.employees.list ? companyData.employees.list.length : 0}<span className="text-xs text-gray-400">/{companyData.employees.max}</span>
            </div>
            <div className="text-xs text-gray-400">EMPLOYEES</div>
          </div>
          <div className="bg-game-panel rounded p-2 text-center">
            <div className="text-2xl font-rajdhani font-bold">{companyData.rating || 0}</div>
            <div className="text-xs text-gray-400">STARS</div>
          </div>
        </div>
        
        {/* Employee List */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 uppercase font-semibold mb-2">Top Employees</div>
          <div className="space-y-2">
            {/* Sort by effectiveness and take top 3 */}
            {[...companyData.employees.list]
              .sort((a, b) => (b.effectiveness || 0) - (a.effectiveness || 0))
              .slice(0, 3)
              .map((employee) => (
              <div key={employee.id} className="bg-game-panel rounded p-2 flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary bg-opacity-30 flex items-center justify-center mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-light">
                    {employee.position.toLowerCase().includes("director") || employee.position.toLowerCase().includes("manager") ? (
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    ) : (
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    )}
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-sm font-medium truncate">{employee.name}</div>
                  <div className="text-xs text-gray-400">{employee.position}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-medium ${getStatusColor(employee.status)}`}>{employee.status}</div>
                  <div className="text-xs text-gray-400">{employee.last_action || 'N/A'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* View All Button */}
        <Link href="/company">
          <Button variant="outline" className="w-full">
            View All Employees
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
