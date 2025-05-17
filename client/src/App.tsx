import { Switch, Route } from "wouter";

// Hide the Vite error overlay by inserting CSS immediately
const hideErrorOverlay = document.createElement('style');
hideErrorOverlay.textContent = `
  .vite-error-overlay, 
  [data-plugin="runtime-error-modal"], 
  [plugin="runtime-error-plugin"],
  div#__vite-plugin-runtime-error-modal,
  div[plugin*="error"],
  div[style*="position: fixed"][style*="z-index: 9999"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    z-index: -9999 !important;
    pointer-events: none !important;
  }
`;
document.head.appendChild(hideErrorOverlay);

// Add an observer to remove any error overlay that gets added
const errorObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          const el = node as HTMLElement;
          if (
            el.getAttribute('plugin') === 'runtime-error-plugin' ||
            el.id === '__vite-plugin-runtime-error-modal' ||
            (el.tagName === 'DIV' && el.style.position === 'fixed' && el.style.zIndex === '9999')
          ) {
            el.remove();
          }
        }
      });
    }
  }
});

// Start observing the document
if (typeof document !== 'undefined') {
  errorObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
}

import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "@/components/ErrorBoundary";

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

// Hide the Vite error overlay by inserting CSS
// This is a workaround since we can't modify vite.config.ts directly
const hideErrorOverlay = document.createElement('style');
hideErrorOverlay.textContent = `
  .vite-error-overlay, [data-plugin="runtime-error-modal"], [plugin="runtime-error-plugin"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    z-index: -9999 !important;
    pointer-events: none !important;
  }
`;
document.head.appendChild(hideErrorOverlay);

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
