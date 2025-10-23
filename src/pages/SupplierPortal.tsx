import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, LogOut } from "lucide-react";
import { EvaluationService } from "@/modules/supplier/services/evaluationService";
import { SupplierQuestionnaireDialog } from "@/components/Supplier/SupplierQuestionnaireDialog";
import { SUPPLIER_EVALUATION_CATEGORIES } from "@/modules/supplier";
import type { SupplierPortalInvitation } from "@/modules/supplier";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SupplierPortal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  
  const [invitation, setInvitation] = useState<SupplierPortalInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<{ key: string; label: string } | null>(null);
  const [completedCategories, setCompletedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuthentication();
  }, [token]);

  const checkAuthentication = async () => {
    if (!token) {
      setError('Ingen gyldig invitasjonslenke');
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not authenticated, redirect to auth page
        navigate(`/supplier-auth?token=${token}`);
        return;
      }

      setIsAuthenticated(true);
      setUserEmail(session.user.email || '');
      
      // Load invitation and set up supplier user association
      const invitation = await EvaluationService.getInvitationByToken(token);
      if (!invitation) {
        setError('Invitasjonen er ugyldig eller utløpt');
        setIsLoading(false);
        return;
      }

      if (invitation.completed_at) {
        setError('Denne evalueringen er allerede fullført');
        setIsLoading(false);
        return;
      }

      // Set up supplier user association - now handled by database trigger on signup
      // Role assignment is automatic via trigger, but we still need to check for existing users
      try {
        const { SupplierUserService } = await import('@/services/supplierUserService');
        // Only create association if needed (for existing users who signed up before)
        await SupplierUserService.createSupplierUserAssociation(
          session.user.id,
          invitation.supplier_id
        );
      } catch (err) {
        console.error('Error setting up supplier user:', err);
        // Continue even if this fails
      }

      setInvitation(invitation);
      setIsLoading(false);
    } catch (err) {
      console.error('Auth check error:', err);
      navigate(`/supplier-auth?token=${token}`);
    }
  };

  const loadInvitation = async () => {
    // loadInvitation is now handled in checkAuthentication
    return;
  };

  const handleCategoryComplete = (categoryKey: string) => {
    setCompletedCategories(prev => new Set(prev).add(categoryKey));
    setActiveCategory(null);
  };

  const handleSubmitAll = async () => {
    if (!token) return;
    await EvaluationService.markInvitationCompleted(token);
    toast.success('Evaluering sendt inn!');
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/supplier-auth?token=${token}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-6 w-6" />
              {error || 'Feil'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Vennligst kontakt oppdragsgiver for en ny invitasjon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">Leverandørevaluering</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Vennligst fyll ut spørsmålene for hver kategori nedenfor. Dette vil hjelpe oppdragsgiver med å evaluere din løsning.
                </p>
                {userEmail && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Innlogget som: <span className="font-medium">{userEmail}</span>
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logg ut
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {SUPPLIER_EVALUATION_CATEGORIES.map((category) => {
            const isCompleted = completedCategories.has(category.key);
            
            return (
              <Card key={category.key} className={isCompleted ? 'border-green-500' : ''}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{category.label}</span>
                    {isCompleted && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    variant={isCompleted ? "outline" : "default"}
                    onClick={() => setActiveCategory({ key: category.key, label: category.label })}
                  >
                    {isCompleted ? 'Rediger svar' : 'Start evaluering'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {completedCategories.size === SUPPLIER_EVALUATION_CATEGORIES.length && (
          <Card className="border-green-500">
            <CardContent className="py-6">
              <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
                <p className="text-center font-medium">
                  Alle kategorier er fullført! Klikk send for å sende inn evalueringen.
                </p>
                <Button size="lg" onClick={handleSubmitAll}>
                  Send inn evaluering
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {activeCategory && invitation && (
        <SupplierQuestionnaireDialog
          open={!!activeCategory}
          onOpenChange={(open) => {
            if (!open) {
              handleCategoryComplete(activeCategory.key);
            }
          }}
          projectId={invitation.project_id}
          supplierId={invitation.supplier_id}
          fieldKey={activeCategory.key}
          categoryLabel={activeCategory.label}
          supplierName="Din bedrift"
          showScoring={false}
        />
      )}
    </div>
  );
};

export default SupplierPortal;
