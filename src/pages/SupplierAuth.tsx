import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { authSchema } from "@/lib/validation";
import { z } from "zod";

const SupplierAuth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && token) {
      // Already logged in, redirect to portal
      navigate(`/supplier-portal?token=${token}`);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
      });

      // Fetch invitation to get supplier_id
      const { data: invitation } = await supabase
        .from('supplier_portal_invitations')
        .select('supplier_id')
        .eq('token', token)
        .single();

      const redirectUrl = `${window.location.origin}/supplier-portal?token=${token}`;
      
      const { error } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validatedData.fullName,
            invitation_type: 'supplier',
            supplier_id: invitation?.supplier_id,
          },
        },
      });

      if (error) throw error;

      setVerificationSent(true);
      toast.success('Verifiseringsepost sendt! Sjekk innboksen din.');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('Kunne ikke opprette konto. Vennligst prøv igjen.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate input
      const validatedData = authSchema.parse({
        email: email.trim(),
        password,
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) throw error;

      // Redirect to supplier portal with token
      navigate(`/supplier-portal?token=${token}`);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.issues[0].message);
      } else {
        toast.error('Kunne ikke logge inn. Vennligst sjekk e-post og passord.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Ugyldig invitasjon</CardTitle>
            <CardDescription>
              Denne lenken er ugyldig. Vennligst kontakt oppdragsgiver for en ny invitasjon.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-primary" />
              Verifiser e-postadressen din
            </CardTitle>
            <CardDescription>
              Vi har sendt en verifiseringslenke til {email}. Klikk på lenken i e-posten for å aktivere kontoen din og få tilgang til evalueringen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sjekk også spam-mappen hvis du ikke finner e-posten.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Leverandørportal</CardTitle>
          <CardDescription>
            {mode === 'signup' 
              ? 'Opprett en konto for å få tilgang til evalueringen'
              : 'Logg inn for å fortsette evalueringen'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === 'signup' ? handleSignUp : handleSignIn} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Fullt navn</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Ola Nordmann"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">E-postadresse</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="deg@leverandor.no"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Passord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  Minimum 6 tegn
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Behandler...
                </>
              ) : mode === 'signup' ? (
                'Opprett konto'
              ) : (
                'Logg inn'
              )}
            </Button>

            <div className="text-center text-sm">
              {mode === 'signup' ? (
                <>
                  Har du allerede en konto?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setMode('signin')}
                  >
                    Logg inn her
                  </Button>
                </>
              ) : (
                <>
                  Har du ikke en konto?{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setMode('signup')}
                  >
                    Registrer deg her
                  </Button>
                </>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierAuth;
