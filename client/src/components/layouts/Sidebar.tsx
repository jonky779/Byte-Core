import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import {
  ChartLine, 
  Building, 
  Users, 
  Store, 
  Briefcase, 
  ShieldX, 
  Worm, 
  Database, 
  Cog
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavItem({ href, icon, label, isActive }: NavItemProps) {
  return (
    <Link href={href} className={cn(
      "block px-4 py-3.5 text-sm font-medium flex items-center rounded-md mx-1",
      isActive 
        ? "text-white bg-primary bg-opacity-20 border-l-2 border-primary shadow" 
        : "text-gray-300 hover:bg-black/40 active:bg-black/60"
    )}>
      <div className="w-7 flex justify-center items-center mr-3 text-primary-light">{icon}</div> 
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // API key status indicator
  const hasApiKey = user?.apiKey && typeof user.apiKey === 'string' && user.apiKey.length > 0;

  return (
    <>
      {/* Mobile menu button - visible only on small screens */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 text-gray-300 hover:text-white bg-black/50 backdrop-blur-sm p-2 rounded-md"
        aria-label="Open Navigation Menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Mobile menu backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        ></div>
      )}

      <aside className={cn(
        "md:w-64 bg-black/95 backdrop-blur-sm md:min-h-screen border-r border-gray-700 flex flex-col",
        mobileOpen 
          ? "fixed top-0 left-0 w-4/5 max-w-xs h-full z-50 shadow-lg animate-slide-in" 
          : "hidden md:flex"
      )}>
        {/* Logo & App Title */}
        <div className="flex items-center justify-start p-4 border-b border-gray-700">
          <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary bg-opacity-30 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-primary-light">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
            </svg>
          </div>
          <div>
            <h1 className="font-rajdhani font-bold text-xl tracking-wide">BYTE-CORE VAULT</h1>
            <div className="text-xs text-gray-400 -mt-1">TORN RPG DASHBOARD</div>
          </div>

          {/* Close button for mobile menu */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto md:hidden text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* User API Profile */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-primary bg-opacity-20 rounded-full flex items-center justify-center mr-2">
              <span className="text-primary-light font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
            </div>
            <div className="truncate">
              <div className="text-sm font-medium">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-400">#{user?.id || '0000'}</div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-400">API Key Status</span>
              <span className={cn(
                "font-medium flex items-center",
                hasApiKey ? "text-secondary" : "text-red-400"
              )}>
                {hasApiKey ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg> Active
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg> Missing
                  </>
                )}
              </span>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                </svg> Manage API Key
              </Button>
            </Link>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow py-2 overflow-y-auto">
          <div className={cn(
            "px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider",
            mobileOpen && "sticky top-0 pt-3 pb-2 bg-black/80 backdrop-blur-sm z-10 shadow-md"
          )}>
            <span>Dashboard</span>
          </div>
          
          <div className="space-y-0.5 mb-2">
            <NavItem href="/" icon={<ChartLine size={18} />} label="User Stats" isActive={location === '/'} />
            <NavItem href="/company" icon={<Building size={18} />} label="Company Tracking" isActive={location === '/company'} />
            <NavItem href="/faction" icon={<Users size={18} />} label="Faction Tracking" isActive={location === '/faction'} />
            <NavItem href="/bazaar" icon={<Store size={18} />} label="Torn Bazaar" isActive={location === '/bazaar'} />
          </div>

          <div className={cn(
            "px-4 mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider",
            mobileOpen && "bg-black/50 py-2 sticky top-12 z-10"
          )}>
            Search Tools
          </div>
          <div className="space-y-0.5 mb-2">
            <NavItem href="/employees-search" icon={<Briefcase size={18} />} label="Employees Search" isActive={location === '/employees-search'} />
            <NavItem href="/faction-search" icon={<ShieldX size={18} />} label="Faction Members Search" isActive={location === '/faction-search'} />
          </div>

          <div className={cn(
            "px-4 mt-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider",
            mobileOpen && "bg-black/50 py-2 sticky top-12 z-10"
          )}>
            System
          </div>
          <div className="space-y-0.5">
            <NavItem href="/crawler-status" icon={<Worm size={18} />} label="Crawler Status" isActive={location === '/crawler-status'} />
            <NavItem href="/item-database" icon={<Database size={18} />} label="Item Database" isActive={location === '/item-database'} />
            <NavItem href="/settings" icon={<Cog size={18} />} label="Settings" isActive={location === '/settings'} />
          </div>
          
          <div className="px-4 py-2">
            <Button 
              variant="destructive" 
              size="sm" 
              className="w-full mt-4" 
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </nav>

        {/* System Status */}
        <div className="p-4 border-t border-gray-700 text-xs">
          <div className="flex justify-between mb-1">
            <span className="text-gray-400">System Status</span>
            <span className="text-secondary">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Sync</span>
            <span className="text-gray-300">
              <span id="last-sync-time">Just now</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
