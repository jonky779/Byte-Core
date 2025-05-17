import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store, Package, Sword, Shield, Pill, Zap, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function BazaarCategoriesPage() {
  // Predefined categories with icons
  const categories = [
    { id: "weapons", name: "Weapons", icon: <Sword className="h-10 w-10" />, color: "bg-red-900/20" },
    { id: "armor", name: "Armor", icon: <Shield className="h-10 w-10" />, color: "bg-blue-900/20" },
    { id: "drugs", name: "Drugs", icon: <Pill className="h-10 w-10" />, color: "bg-green-900/20" },
    { id: "boosters", name: "Boosters", icon: <Zap className="h-10 w-10" />, color: "bg-yellow-900/20" },
    { id: "artifacts", name: "Artifacts", icon: <Sparkles className="h-10 w-10" />, color: "bg-purple-900/20" },
    { id: "all", name: "All Items", icon: <Package className="h-10 w-10" />, color: "bg-gray-900/30" },
  ];

  return (
    <MainLayout title="Bazaar Categories">
      <Helmet>
        <title>Bazaar Categories | Byte-Core Vault</title>
        <meta name="description" content="Browse Torn RPG Bazaar items by category with Byte-Core Vault." />
      </Helmet>
      
      <Card className="border-gray-700 bg-game-dark shadow-game mb-6">
        <CardHeader className="flex flex-row items-center gap-2">
          <Store className="h-6 w-6" />
          <CardTitle>Bazaar Categories</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Link key={category.id} href={`/bazaar/items/${category.id}`}>
                <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-transparent ${category.color} h-full`}>
                  <CardContent className="flex flex-col items-center justify-center text-center p-6">
                    <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center mb-4">
                      {category.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-400">
                      Browse {category.name.toLowerCase()} items in the Torn bazaar
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}