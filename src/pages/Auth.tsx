import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, Building2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [defaultTab, setDefaultTab] = useState<"login" | "signup">("login");
  const [invitationData, setInvitationData] = useState<any>(null);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Check for invitation token in URL
    const token = searchParams.get("token");
    if (token) {
      setInvitationToken(token);
      setDefaultTab("signup");
      
      // Fetch invitation details
      supabase
        .from('invitations')
        .select('email, contact_person_name, company_id, expires_at, status, intended_role')
        .eq('token', token)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error("Ugyldig eller utløpt invitasjon");
            return;
          }

          // Check if expired
          if (new Date(data.expires_at) < new Date()) {
            toast.error("Denne invitasjonen har utløpt");
            return;
          }

          // Check if already accepted
          if (data.status === 'accepted') {
            toast.error("Denne invitasjonen er allerede brukt");
            return;
          }

          // Pre-fill form fields
          setEmail(data.email);
          setFullName(data.contact_person_name || "");
          setCompanyId(data.company_id);
          setInvitationData(data);
        });
    }
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Velkommen tilbake!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Innlogging feilet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Block signup without invitation token
    if (!invitationToken) {
      toast.error("Registrering krever invitasjon. Kontakt administrator for tilgang.");
      return;
    }

    // Validate that email matches invitation
    if (invitationData && invitationData.email !== email) {
      toast.error("E-postadressen matcher ikke invitasjonen");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Mark invitation as accepted
        await supabase
          .from('invitations')
          .update({ 
            accepted_at: new Date().toISOString(),
            accepted_by: data.user.id,
            status: 'accepted'
          })
          .eq('token', invitationToken);

        // Role will be assigned automatically by trigger based on intended_role
        toast.success("Konto opprettet! Du har nå tilgang til plattformen.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Registrering feilet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">IT-Anskaffelse</CardTitle>
          <CardDescription>Bedriftsintern anskaffelsesstyring</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={defaultTab} onValueChange={(v) => setDefaultTab(v as "login" | "signup")} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Logg inn</TabsTrigger>
              <TabsTrigger value="signup" disabled={!invitationToken}>
                {invitationToken ? "Registrer" : "Kun invitasjon"}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-post</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="din.epost@firma.no"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Passord</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Logger inn..." : "Logg inn"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              {!invitationToken ? (
                <div className="p-6 text-center space-y-3">
                  <p className="text-muted-foreground">
                    Registrering er kun mulig med invitasjon.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Kontakt en administrator for å få tilgang til plattformen.
                  </p>
                </div>
              ) : invitationData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      Du registrerer deg med invitasjon
                      {invitationData.intended_role && (
                        <span className="font-medium text-foreground">
                          {' '}som {invitationData.intended_role}
                        </span>
                      )}
                    </p>
                  </div>
                  <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Fullt navn</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Ola Nordmann"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={!!invitationToken}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-post</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="din.epost@firma.no"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!invitationToken}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Passord</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 tegn</p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Oppretter konto..." : "Opprett konto"}
                </Button>
              </form>
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
