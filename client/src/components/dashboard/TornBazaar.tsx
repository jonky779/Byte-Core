import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface BazaarItem {
  id: number;
  name: string;
  type: string;
  category: string;
  price: number;
  market_price: number;
  seller: {
    id: number;
    name: string;
  };
  percentage_below_market: number;
  image_url?: string;
}

export default function TornBazaar() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data, isLoading, isError } = useQuery<{items: BazaarItem[]}>({
    queryKey: ["/api/bazaar", selectedCategory],
    enabled: !!user?.apiKey
  });
  
  // Get bazaar items from the response and safely handle the structure
  const bazaarItems = data?.items || [];
  
  // Filter based on search query
  const filteredItems = bazaarItems.filter(item => 
    (item?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item?.seller?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="bg-game-dark border-gray-700 shadow-game h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Torn Bazaar</h3>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-32 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
        
        <CardContent className="p-4">
          <Skeleton className="w-full h-10 mb-4" />
          
          <div className="space-y-3 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-20 rounded" />
            ))}
          </div>
          
          <Skeleton className="w-full h-10 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !bazaarItems) {
    const errorMessage = user?.apiKey 
      ? "Failed to load bazaar data. Please check your API key or try again later."
      : "Please add your Torn API key in settings to view bazaar listings.";
    
    return (
      <Card className="bg-game-dark border-gray-700 shadow-game h-full">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="font-rajdhani font-bold text-lg">Torn Bazaar</h3>
          </div>
        </div>
        
        <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
          <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Bazaar Data</h3>
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

  return (
    <Card className="bg-game-dark border-gray-700 shadow-game h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-rajdhani font-bold text-lg">Torn Bazaar</h3>
          <div className="flex items-center space-x-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="bg-game-panel border border-gray-700 rounded text-xs py-1 px-2 h-8 w-[140px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="weapons">Weapons</SelectItem>
                <SelectItem value="armor">Armor</SelectItem>
                <SelectItem value="drugs">Drugs</SelectItem>
                <SelectItem value="boosters">Boosters</SelectItem>
                <SelectItem value="artifacts">Artifacts</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="ghost" size="icon" onClick={() => window.location.reload()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-white">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Input 
            type="text" 
            placeholder="Search items..." 
            className="w-full bg-game-panel border border-gray-700 rounded py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 h-4 w-4" />
        </div>
        
        {/* Deals List */}
        <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
          {filteredItems && filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <div key={item.id} className="bg-game-panel rounded p-3 border border-gray-700 hover:border-primary transition-colors duration-300">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded bg-gray-800 p-1 mr-3 flex items-center justify-center">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="max-w-full max-h-full" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.type} - {item.category}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="font-mono font-medium text-green-400">${item.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">Market: ${item.market_price.toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Seller: {item.seller.name}</span>
                  <span className="text-accent">{item.percentage_below_market}% below market</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-400">
              {searchQuery ? "No items match your search." : "No items available in this category."}
            </div>
          )}
        </div>
        
        {/* View All Button */}
        <Link href="/bazaar">
          <Button variant="outline" className="w-full">
            Browse All Bazaar Items
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
