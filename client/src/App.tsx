import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { DataRefreshProvider } from "@/hooks/use-data-refresh";
import { ThemeProvider } from "next-themes";

import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import CompanyPage from "@/pages/company-page";
import FactionPage from "@/pages/faction-page";
import BazaarPage from "@/pages/bazaar-page";
import EmployeesSearchPage from "@/pages/employees-search-page";
import FactionSearchPage from "@/pages/faction-search-page";
import CrawlerStatusPage from "@/pages/crawler-status-page";
import ItemDatabasePage from "@/pages/item-database-page";
import SettingsPage from "@/pages/settings-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/company" component={CompanyPage} />
      <ProtectedRoute path="/faction" component={FactionPage} />
      <ProtectedRoute path="/bazaar" component={BazaarPage} />
      <ProtectedRoute path="/employees-search" component={EmployeesSearchPage} />
      <ProtectedRoute path="/faction-search" component={FactionSearchPage} />
      <ProtectedRoute path="/crawler-status" component={CrawlerStatusPage} />
      <ProtectedRoute path="/item-database" component={ItemDatabasePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark">
        <AuthProvider>
          <DataRefreshProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </DataRefreshProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
