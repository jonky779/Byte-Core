import { useState, useEffect } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, Store, RefreshCw, Search, FilterX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Using custom dropdown implementation instead of Radix UI Select
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Using custom pagination implementation instead of Radix UI

interface BazaarItem {
  id: number;
  name: string;
  type: string;
  category: string;
  sub_category: string;
  price: number;
  market_price: number;
  quantity: number;
  percentage_below_market: number;
  seller: {
    id: number;
    name: string;
  };
  image_url?: string;
}

interface BazaarResponse {
  items: BazaarItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    categories: string[];
    types: string[];
    sub_categories: Record<string, string[]>;
  };
}

export default function BazaarPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [subCategory, setSubCategory] = useState("all");
  const [maxPricePercentage, setMaxPricePercentage] = useState(100);
  const [page, setPage] = useState(1);
  const [availableSubCategories, setAvailableSubCategories] = useState<string[]>([]);
  
  const { data, isLoading, isError, refetch, isFetching } = useQuery<BazaarResponse>({
    queryKey: ["/api/bazaar", page, category, type, subCategory, maxPricePercentage, searchQuery],
    enabled: !!user?.apiKey
  });
  
  // Update available subcategories when category changes
  useEffect(() => {
    if (data?.meta?.sub_categories) {
      if (category !== 'all' && data.meta.sub_categories[category]) {
        setAvailableSubCategories(data.meta.sub_categories[category]);
        if (subCategory !== 'all' && !data.meta.sub_categories[category].includes(subCategory)) {
          setSubCategory('all');
        }
      } else {
        setAvailableSubCategories([]);
        setSubCategory('all');
      }
    }
  }, [category, data?.meta?.sub_categories]);
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setCategory("all");
    setType("all");
    setSubCategory("all");
    setMaxPricePercentage(100);
    setPage(1);
  };
  
  if (isLoading) {
    return (
      <MainLayout title="Torn Bazaar">
        <Helmet>
          <title>Torn Bazaar | Byte-Core Vault</title>
          <meta name="description" content="Browse the Torn RPG Bazaar to find the best deals on items with Byte-Core Vault." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading bazaar data...</span>
        </div>
      </MainLayout>
    );
  }
  
  if (isError || !data) {
    const errorMessage = user?.apiKey 
      ? "Failed to load bazaar data. Please check your API key or try again later."
      : "Please add your Torn API key in settings to view bazaar listings.";
    
    return (
      <MainLayout title="Torn Bazaar">
        <Helmet>
          <title>Torn Bazaar | Byte-Core Vault</title>
          <meta name="description" content="Browse the Torn RPG Bazaar to find the best deals on items with Byte-Core Vault." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Bazaar Data Unavailable</h3>
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
    <MainLayout title="Torn Bazaar">
      <Helmet>
        <title>Torn Bazaar | Byte-Core Vault</title>
        <meta name="description" content="Browse the Torn RPG Bazaar to find the best deals on items with Byte-Core Vault." />
      </Helmet>
      
      <Card className="border-gray-700 bg-game-dark shadow-game mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Store className="h-5 w-5 mr-2" />
              Bazaar Search
            </CardTitle>
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
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="pl-10 bg-game-panel border-gray-700"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Category</label>
                <div className="relative">
                  <div 
                    className="w-full p-2 bg-game-panel border border-gray-700 rounded-md flex items-center justify-between text-sm cursor-pointer hover:bg-gray-800"
                    onClick={() => {
                      const dropdown = document.getElementById("category-dropdown");
                      if (dropdown) {
                        dropdown.classList.toggle("hidden");
                        document.getElementById("type-dropdown")?.classList.add("hidden");
                        document.getElementById("subcategory-dropdown")?.classList.add("hidden");
                      }
                    }}
                  >
                    <span>{category === "all" ? "All Categories" : category}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  
                  <div id="category-dropdown" className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg hidden max-h-60 overflow-y-auto">
                    <div 
                      className="p-2 hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        setCategory("all");
                        setPage(1);
                        document.getElementById("category-dropdown")?.classList.add("hidden");
                      }}
                    >
                      All Categories
                    </div>
                    {data?.meta?.categories?.map((cat) => (
                      <div 
                        key={cat}
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setCategory(cat);
                          setPage(1);
                          document.getElementById("category-dropdown")?.classList.add("hidden");
                        }}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Type</label>
                <div className="relative">
                  <div 
                    className="w-full p-2 bg-game-panel border border-gray-700 rounded-md flex items-center justify-between text-sm cursor-pointer hover:bg-gray-800"
                    onClick={() => {
                      const dropdown = document.getElementById("type-dropdown");
                      if (dropdown) {
                        dropdown.classList.toggle("hidden");
                        document.getElementById("category-dropdown")?.classList.add("hidden");
                        document.getElementById("subcategory-dropdown")?.classList.add("hidden");
                      }
                    }}
                  >
                    <span>{type === "all" ? "All Types" : type}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  
                  <div id="type-dropdown" className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg hidden max-h-60 overflow-y-auto">
                    <div 
                      className="p-2 hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        setType("all");
                        setPage(1);
                        document.getElementById("type-dropdown")?.classList.add("hidden");
                      }}
                    >
                      All Types
                    </div>
                    {data?.meta?.types?.map((t) => (
                      <div 
                        key={t}
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setType(t);
                          setPage(1);
                          document.getElementById("type-dropdown")?.classList.add("hidden");
                        }}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Sub-Category</label>
                <div className="relative">
                  <div 
                    className={`w-full p-2 border rounded-md flex items-center justify-between text-sm ${
                      category === 'all' || availableSubCategories.length === 0
                        ? 'bg-game-panel/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
                        : 'bg-game-panel border-gray-700 cursor-pointer hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      if (category !== 'all' && availableSubCategories.length > 0) {
                        const dropdown = document.getElementById("subcategory-dropdown");
                        if (dropdown) {
                          dropdown.classList.toggle("hidden");
                          document.getElementById("category-dropdown")?.classList.add("hidden");
                          document.getElementById("type-dropdown")?.classList.add("hidden");
                        }
                      }
                    }}
                  >
                    <span>{subCategory === "all" ? "All Sub-Categories" : subCategory}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                  
                  <div id="subcategory-dropdown" className="absolute z-10 w-full mt-1 bg-gray-900 border border-gray-700 rounded-md shadow-lg hidden max-h-60 overflow-y-auto">
                    <div 
                      className="p-2 hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        setSubCategory("all");
                        setPage(1);
                        document.getElementById("subcategory-dropdown")?.classList.add("hidden");
                      }}
                    >
                      All Sub-Categories
                    </div>
                    {availableSubCategories.map((sub) => (
                      <div 
                        key={sub}
                        className="p-2 hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setSubCategory(sub);
                          setPage(1);
                          document.getElementById("subcategory-dropdown")?.classList.add("hidden");
                        }}
                      >
                        {sub}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm text-gray-400">Maximum Price (% of Market Value)</label>
                <span className="text-sm font-medium">{maxPricePercentage}%</span>
              </div>
              <Slider 
                value={[maxPricePercentage]}
                min={10}
                max={150}
                step={5}
                onValueChange={(values) => {
                  setMaxPricePercentage(values[0]);
                  setPage(1);
                }}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>10% (Deals)</span>
                <span>100% (Market Value)</span>
                <span>150% (High Price)</span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                className="text-gray-400"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-gray-700 bg-game-dark shadow-game">
        <CardHeader>
          <Tabs defaultValue="grid">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Bazaar Listings</CardTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Found {data.meta.total} items {searchQuery && `matching "${searchQuery}"`}
                </p>
              </div>
              <TabsList className="bg-game-panel">
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          <TabsContent value="grid" className="mt-0">
            {data.items.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.items.map((item) => (
                  <div 
                    key={`${item.id}-${item.seller.id}`} 
                    className="bg-game-panel rounded-lg p-4 border border-gray-700 hover:border-primary transition-colors duration-300"
                  >
                    <div className="flex items-start mb-3">
                      <div className="w-12 h-12 rounded bg-gray-800 p-1 mr-3 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="max-w-full max-h-full" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{item.name}</h3>
                        <div className="text-xs text-gray-400">{item.type} - {item.category}</div>
                        {item.sub_category && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {item.sub_category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm">
                        <div className="font-medium text-white">Price</div>
                        <div className="text-green-400 font-mono font-semibold">${item.price.toLocaleString()}</div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-medium text-white">Market Value</div>
                        <div className="text-gray-400 font-mono">${item.market_price.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-xs border-t border-gray-700 pt-2">
                      <span className="text-gray-400">
                        Seller: {item.seller.name}
                      </span>
                      <span className={`${
                        item.percentage_below_market < 0 ? 'text-red-400' : 'text-accent'
                      }`}>
                        {item.percentage_below_market > 0 
                          ? `${item.percentage_below_market}% below market` 
                          : `${Math.abs(item.percentage_below_market)}% above market`}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-2">
                      Quantity: {item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Store className="h-12 w-12 text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Items Found</h3>
                <p className="text-gray-400 max-w-md mb-4">
                  No bazaar items match your current filters. Try adjusting your search criteria.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="mt-0">
            {data.items.length > 0 ? (
              <div className="rounded-md border border-gray-700">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-sm">Item</th>
                      <th className="text-center py-3 px-4 font-medium text-sm">Category</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Price</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Market Value</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Difference</th>
                      <th className="text-right py-3 px-4 font-medium text-sm">Seller</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item) => (
                      <tr key={`${item.id}-${item.seller.id}`} className="border-b border-gray-700 hover:bg-game-panel/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded bg-gray-800 p-1 mr-2 flex items-center justify-center">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="max-w-full max-h-full" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-gray-400">Qty: {item.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div>{item.category}</div>
                          {item.sub_category && (
                            <div className="text-xs text-gray-400">{item.sub_category}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-green-400">
                          ${item.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-gray-400">
                          ${item.market_price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`${
                            item.percentage_below_market < 0 ? 'text-red-400' : 'text-accent'
                          }`}>
                            {item.percentage_below_market > 0 
                              ? `${item.percentage_below_market}% below` 
                              : `${Math.abs(item.percentage_below_market)}% above`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-sm">{item.seller.name}</div>
                          <div className="text-xs text-gray-400">#{item.seller.id}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Store className="h-12 w-12 text-gray-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No Items Found</h3>
                <p className="text-gray-400 max-w-md mb-4">
                  No bazaar items match your current filters. Try adjusting your search criteria.
                </p>
                <Button variant="outline" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>
          
          {data?.meta?.total_pages > 1 && (
            <div className="mt-6">
              <div className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page === 1}
                  className={page === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                >
                  Previous
                </Button>
                
                {/* First page */}
                {page > 3 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                  >
                    1
                  </Button>
                )}
                
                {/* Ellipsis if needed */}
                {page > 4 && (
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled
                    className="pointer-events-none"
                  >
                    ...
                  </Button>
                )}
                  
                  {/* Page before current if not first page */}
                  {page > 1 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPage(page - 1)}>
                        {page - 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Current page */}
                  <PaginationItem>
                    <PaginationLink isActive>{page}</PaginationLink>
                  </PaginationItem>
                  
                  {/* Page after current if not last page */}
                  {page < data.meta.total_pages && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPage(page + 1)}>
                        {page + 1}
                      </PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {page < data.meta.total_pages - 3 && (
                    <PaginationItem>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  )}
                  
                  {/* Last page if not close to current */}
                  {page < data.meta.total_pages - 2 && (
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(data?.meta?.total_pages || 1)}
                      >
                        {data?.meta?.total_pages}
                      </Button>
                    </PaginationItem>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setPage(p => Math.min(data.meta.total_pages, p + 1))} 
                      disabled={page === data.meta.total_pages}
                      className={page === data.meta.total_pages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
              
              <div className="text-center text-xs text-gray-400 mt-2">
                Page {page} of {data.meta.total_pages} • Showing {data.items.length} of {data.meta.total} items
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
