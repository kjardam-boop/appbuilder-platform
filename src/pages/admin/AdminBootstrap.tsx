import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/core/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Dashboard/Header";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

const AdminBootstrap = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBootstrap = async () => {
    if (!session?.user?.id) {
      setError("Du må være innlogget for å kjøre bootstrap.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-platform-owner', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || "Bootstrap feilet");
      }

      setSuccess(true);
      toast.success("Du er nå Platform Owner!");
      
      setTimeout(() => {
        navigate('/admin');
      }, 2000);
    } catch (err: any) {
      console.error('Bootstrap error:', err);
      setError(err.message || "En feil oppstod under bootstrap.");
      toast.error("Bootstrap feilet");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header />
        <div className="w-full px-4 lg:px-6 xl:px-8 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Du må være innlogget for å bruke bootstrap. <a href="/auth" className="underline">Logg inn her</a>.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header />
      
      <div className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Bootstrap</h1>
            <p className="text-muted-foreground">
              Gi deg selv platform_owner-rollen for å få tilgang til admin-området
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Bootstrap Platform Owner</CardTitle>
              <CardDescription>
                Dette vil gi din bruker (ID: {session.user.id.substring(0, 8)}...) platform_owner-rollen på default tenant.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Suksess! Du er nå Platform Owner. Omdirigerer til Admin...
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleBootstrap}
                disabled={isLoading || success}
                size="lg"
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {success ? "Fullført!" : "Gjør meg til Platform Owner"}
              </Button>

              <p className="text-sm text-muted-foreground">
                Denne siden er kun ment for initial oppsett. Etter bootstrap kan du administrere roller via Admin-området.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBootstrap;
