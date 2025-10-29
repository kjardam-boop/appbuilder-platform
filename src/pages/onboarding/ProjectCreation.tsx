import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/modules/core/user";

export default function ProjectCreation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

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
      // Get user's profile to find company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.company_id) {
        throw new Error('Ingen bedrift funnet. Vennligst fullfør bedriftsregistrering først.');
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: formData.name,
          description: formData.description || null,
          company_id: profile.company_id,
          owner_id: user.id,
          current_phase: 'as_is',
          status: 'active',
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Update onboarding completion
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Prosjekt opprettet!",
        description: "Velkommen til din plattform. Du er nå klar til å starte.",
      });

      // Redirect to projects overview
      navigate('/projects');
    } catch (error) {
      console.error('Project creation error:', error);
      toast({
        title: "Feil ved opprettelse",
        description: error.message || "Kunne ikke opprette prosjekt. Prøv igjen.",
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
            <FolderKanban className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Opprett ditt første prosjekt</CardTitle>
          <CardDescription>
            Steg 2 av 2 - La oss komme i gang med et prosjekt
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Prosjektnavn *</Label>
              <Input
                id="name"
                placeholder="ERP-evaluering 2025"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
              <Textarea
                id="description"
                placeholder="Kort beskrivelse av prosjektet..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oppretter...
                </>
              ) : (
                "Opprett prosjekt og fullfør onboarding"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
