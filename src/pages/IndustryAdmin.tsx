import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Search } from "lucide-react";
import { IndustryManager } from "@/modules/core/industry/components/IndustryManager";
import { Header } from "@/components/layout/Header";

export default function IndustryAdmin() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Bransjer & NACE-klassifisering</h1>
          <p className="text-muted-foreground">
            Administrer bransjer med NACE-koder for autoklassifisering av selskaper
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bransjeadministrasjon</CardTitle>
                <CardDescription>
                  Konfigurer bransjer og tilknyttede NACE-koder
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Søk bransjer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <IndustryManager searchQuery={searchQuery} />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Om NACE-klassifisering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              NACE er EUs standard for næringsgrupperinger. Når et selskap opprettes eller oppdateres 
              med en næringskode fra Brønnøysundregistrene, vil systemet automatisk:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Matche næringskoden mot definerte NACE-prefikser</li>
              <li>Tilordne relevante bransjenøkler til selskapet</li>
              <li>Emitte en <code className="bg-muted px-1 py-0.5 rounded">CompanyClassified</code> event</li>
              <li>Aktivere eventuelle standardmoduler for bransjen (valgfritt)</li>
            </ol>
            <p className="text-xs">
              <strong>Eksempel:</strong> NACE-kode "41.20" (bygging av bygninger) matcher prefiks "41" → 
              bransjenøkkel "bygg_anlegg"
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
