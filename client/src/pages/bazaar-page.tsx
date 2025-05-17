import React from "react";
import MainLayout from "@/components/layouts/MainLayout";
import { Helmet } from "react-helmet";
import { Card, CardContent } from "@/components/ui/card";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function BazaarPage() {
  return (
    <MainLayout title="Torn Bazaar">
      <Helmet>
        <title>Torn Bazaar | Byte-Core Vault</title>
        <meta name="description" content="Browse the Torn RPG Bazaar to find the best deals on items with Byte-Core Vault." />
      </Helmet>
      
      <Card className="border-gray-700 bg-game-dark shadow-game">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <Store className="h-16 w-16 text-primary mb-6" />
          <h1 className="text-3xl font-semibold mb-4">Torn Bazaar</h1>
          <p className="text-gray-300 text-xl mb-8 max-w-2xl">
            Browse various Bazaar with items listed by players
          </p>
          
          <Link href="/bazaar/categories">
            <Button size="lg" className="font-medium text-lg px-8 py-6">
              Explore Bazaars
            </Button>
          </Link>
        </CardContent>
      </Card>
    </MainLayout>
  );
}