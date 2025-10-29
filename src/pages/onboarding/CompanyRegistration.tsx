import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/core/user";

export default function CompanyRegistration() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isBrregSearching, setIsBrregSearching] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    org_number: "",
    website: "",
    description: "",
  });

  const handleBrregSearch = async () => {
    if (!formData.org_number || formData.org_number.length !== 9) {
      toast({
        title: "Ugyldig organisasjonsnummer",
        description: "Organisasjonsnummer må være 9 siffer",
        variant: "destructive",
      });
      return;
    }

    setIsBrregSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('brreg-lookup', {
        body: { orgNumber: formData.org_number },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        setFormData({
          ...formData,
          name: data.data.navn || formData.name,
          website: data.data.hjemmeside || formData.website,
        });
        toast({
          title: "Bedrift funnet",
          description: "Informasjon hentet fra Brønnøysundregistrene",
        });
      }
    } catch (error) {
      console.error('Brreg search error:', error);
      toast({
        title: "Kunne ikke hente bedriftsinformasjon",
        description: "Fortsett med manuell registrering",
        variant: "destructive",
      });
    } finally {
      setIsBrregSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast({
        title: "Ingen bruker funnet",
        description: "Du må være logget inn",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          org_number: formData.org_number || null,
          website: formData.website || null,
          industry_description: formData.description || null,
          source: 'onboarding',
        })
        .select()
        .single();

      if (companyError) throw companyError;

      console.log('Company created:', company);

      // 2. Update profile with company_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: company.id,
          onboarding_step: 'tenant_creation',
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // 3. Call edge function to create tenant
      const { data: tenantData, error: tenantError } = await supabase.functions.invoke(
        'create-tenant-onboarding',
        {
          body: {
            user_id: user.id,
            email: user.email,
            company_name: formData.name,
            company_id: company.id,
          },
        }
      );

      if (tenantError) throw tenantError;

      console.log('Tenant created:', tenantData);

      // 4. Update onboarding step to project_creation
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_step: 'project_creation',
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Bedrift registrert!",
        description: "Ditt firma er nå opprettet. La oss opprette ditt første prosjekt.",
      });

      // 5. Redirect to project creation
      navigate('/onboarding/project');
    } catch (error) {
      console.error('Company registration error:', error);
      toast({
        title: "Feil ved registrering",
        description: error.message || "Kunne ikke registrere bedrift. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Registrer din bedrift</CardTitle>
          <CardDescription>
            Steg 1 av 2 - Fortell oss om din bedrift
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Org Number with Brreg Search */}
            <div className="space-y-2">
              <Label htmlFor="org_number">Organisasjonsnummer (valgfritt)</Label>
              <div className="flex gap-2">
                <Input
                  id="org_number"
                  placeholder="123456789"
                  value={formData.org_number}
                  onChange={(e) => setFormData({ ...formData, org_number: e.target.value })}
                  maxLength={9}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBrregSearch}
                  disabled={isBrregSearching || !formData.org_number}
                >
                  {isBrregSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Bedriftsnavn *</Label>
              <Input
                id="name"
                placeholder="Min Bedrift AS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Nettside (valgfritt)</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://minbedrift.no"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
              <Textarea
                id="description"
                placeholder="Kort beskrivelse av din bedrift..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrerer...
                </>
              ) : (
                "Fortsett til prosjektoppretting"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
