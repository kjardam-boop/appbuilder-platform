import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Lock, Users } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">IT-Anskaffelse</CardTitle>
          <CardDescription className="text-lg">
            Bedriftsintern anskaffelsesstyring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <p>Invitasjonsbasert plattform</p>
            </div>
            
            <p className="text-muted-foreground max-w-lg mx-auto">
              Denne plattformen er kun tilgjengelig for inviterte brukere. 
              Kontakt en administrator for å få tilgang.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-muted/50">
              <CardHeader>
                <Users className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Har du mottatt en invitasjon?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Sjekk e-posten din for en invitasjonslenke. Klikk på lenken for å registrere deg.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader>
                <Lock className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">Allerede registrert?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Hvis du allerede har en konto, kan du logge inn her.
                </p>
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Logg inn
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="pt-6 border-t">
            <h3 className="font-semibold text-center mb-4">Hva får du tilgang til?</h3>
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <p className="text-muted-foreground">
                  Komplett anskaffelsesstyring for IT-systemer
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <p className="text-muted-foreground">
                  Samarbeid med teamet på prosjekter og evalueringer
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-xs">✓</span>
                </div>
                <p className="text-muted-foreground">
                  Tilgang til skreddersydde applikasjoner for din bedrift
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
