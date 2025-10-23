import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { seedErpSystems } from "@/modules/core/erpsystem";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ERPSystemSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSeed = async () => {
    try {
      setIsSeeding(true);
      setSeedResult(null);
      
      await seedErpSystems();
      
      setSeedResult({
        success: true,
        message: "ERP-systemer og leverandører ble lastet inn!"
      });
      toast.success("ERP-systemer ble seeded");
    } catch (error) {
      console.error("Seed error:", error);
      setSeedResult({
        success: false,
        message: `Feil under seeding: ${error instanceof Error ? error.message : 'Ukjent feil'}`
      });
      toast.error("Kunne ikke seede ERP-systemer");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          ERP-systemer og Leverandører
        </CardTitle>
        <CardDescription>
          Last inn standard ERP-systemer og deres leverandører i databasen.
          Dette vil opprette selskaper som Microsoft, SAP, Oracle, Visma, Unit4, IFS, med videre,
          og knytte deres ERP-produkter til dem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {seedResult && (
          <Alert variant={seedResult.success ? "default" : "destructive"}>
            {seedResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{seedResult.message}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSeed}
            disabled={isSeeding}
            size="lg"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Laster inn data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Last inn ERP-systemer
              </>
            )}
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Inkluderer:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Microsoft (Dynamics 365)</li>
              <li>SAP (S/4HANA)</li>
              <li>Oracle (NetSuite)</li>
              <li>Visma, Unit4, IFS, Xledger, 24SevenOffice, RamBase</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
