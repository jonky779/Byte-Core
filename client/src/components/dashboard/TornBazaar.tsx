import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Store } from "lucide-react";

export default function TornBazaar() {
  return (
    <Card className="bg-game-dark border-gray-700 shadow-game h-full">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-rajdhani font-bold text-lg">Torn Bazaar</h3>
      </div>
      
      <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
        <Store className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-xl font-semibold mb-3">Browse Torn Bazaars</h3>
        <p className="text-gray-400 text-base mb-6 max-w-md">
          Browse various Bazaar with items listed by players
        </p>
        
        <Link href="/bazaar">
          <Button size="lg" className="font-medium px-8">
            Explore Bazaars
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
