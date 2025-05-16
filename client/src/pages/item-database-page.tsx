import { useState } from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertCircle, Database, Search, Filter, Tag } from "lucide-react";
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
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { TornItem } from "@/types/torn";

interface ItemDatabaseResponse {
  items: TornItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    categories: string[];
    types: string[];
  };
}

export default function ItemDatabasePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("id-asc");
  
  const { data, isLoading, isError, refetch } = useQuery<ItemDatabaseResponse>({
    queryKey: ["/api/items", page, category, type, sortBy, searchQuery],
    enabled: !!user?.apiKey
  });
  
  // Reset filters
  const resetFilters = () => {
    setSearchQuery("");
    setCategory("all");
    setType("all");
    setSortBy("id-asc");
    setPage(1);
  };
  
  if (isLoading) {
    return (
      <MainLayout title="Item Database">
        <Helmet>
          <title>Item Database | Byte-Core Vault</title>
          <meta name="description" content="Browse and search the complete Torn RPG item database with Byte-Core Vault." />
        </Helmet>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading item database...</span>
        </div>
      </MainLayout>
    );
  }
  
  if (isError || !data) {
    const errorMessage = user?.apiKey 
      ? "Failed to load item database. Please check your API key or try again later."
      : "Please add your Torn API key in settings to browse the item database.";
    
    return (
      <MainLayout title="Item Database">
        <Helmet>
          <title>Item Database | Byte-Core Vault</title>
          <meta name="description" content="Browse and search the complete Torn RPG item database with Byte-Core Vault." />
        </Helmet>
        <Card className="border-gray-700 bg-game-dark shadow-game">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Item Database Unavailable</h3>
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
    <MainLayout title="Item Database">
      <Helmet>
        <title>Item Database | Byte-Core Vault</title>
        <meta name="description" content="Browse and search the complete Torn RPG item database with Byte-Core Vault." />
      </Helmet>
      
      <Card className="border-gray-700 bg-game-dark shadow-game mb-6">
        <CardHeader>
          <div className="flex items-center">
            <Database className="h-5 w-5 mr-2" />
            <CardTitle>Torn RPG Item Database</CardTitle>
          </div>
          <CardDescription>Search and browse all items available in Torn</CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
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
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={category} onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}>
                <SelectTrigger className="bg-game-panel border-gray-700 w-full sm:w-[180px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {data.meta.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={type} onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}>
                <SelectTrigger className="bg-game-panel border-gray-700 w-full sm:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {data.meta.types.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={(value) => {
                setSortBy(value);
                setPage(1);
              }}>
                <SelectTrigger className="bg-game-panel border-gray-700 w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id-asc">ID (Ascending)</SelectItem>
                  <SelectItem value="id-desc">ID (Descending)</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="value-desc">Value (High to Low)</SelectItem>
                  <SelectItem value="value-asc">Value (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetFilters}
              className="flex items-center"
            >
              <Filter className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
          </div>
          
          <div className="text-sm text-gray-400 mb-2">
            Found {data.meta.total.toLocaleString()} items
            {searchQuery && ` matching "${searchQuery}"`}
            {category !== 'all' && ` in category "${category}"`}
            {type !== 'all' && ` of type "${type}"`}
          </div>
          
          <div className="rounded-md border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-gray-700">
                  <TableHead className="w-[70px]">ID</TableHead>
                  <TableHead className="w-[300px]">Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">Circulation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.length > 0 ? (
                  data.items.map((item) => (
                    <TableRow key={item.id} className="border-gray-700">
                      <TableCell className="font-mono">
                        {item.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded bg-gray-800 p-1 mr-2 flex items-center justify-center">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="max-w-full max-h-full" />
                            ) : (
                              <Tag className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[230px]">{item.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-800/50">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.category}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${item.market_value.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.circulation ? item.circulation.toLocaleString() : 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                      {searchQuery || category !== 'all' || type !== 'all' 
                        ? "No items match your filters."
                        : "No items found in the database."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {data.meta.total_pages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setPage(p => Math.max(1, p - 1))} 
                      disabled={page === 1}
                      className={page === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {/* First page */}
                  {page > 3 && (
                    <PaginationItem>
                      <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>
                    </PaginationItem>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {page > 4 && (
                    <PaginationItem>
                      <span className="px-4">...</span>
                    </PaginationItem>
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
                      <PaginationLink onClick={() => setPage(data.meta.total_pages)}>
                        {data.meta.total_pages}
                      </PaginationLink>
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
