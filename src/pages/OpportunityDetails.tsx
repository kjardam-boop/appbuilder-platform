// @ts-nocheck
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { OpportunityService } from "@/modules/core/opportunity";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { OpportunityStageBadge } from "@/modules/core/opportunity";
import { OpportunityDialog } from "@/modules/core/opportunity";
import { useToast } from "@/hooks/use-toast";
import type { OpportunityWithDetails } from "@/modules/opportunity";
import {
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function OpportunityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [opportunity, setOpportunity] = useState<OpportunityWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadOpportunity();
  }, [id]);

  const loadOpportunity = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await OpportunityService.getOpportunity(id);
      setOpportunity(data);
    } catch (error) {
      console.error('Error loading opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste mulighet',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await OpportunityService.deleteOpportunity(id);
      toast({
        title: 'Suksess',
        description: 'Mulighet slettet',
      });
      navigate('/opportunities');
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette mulighet',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <AppBreadcrumbs levels={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Opportunities", href: "/opportunities" },
          { label: "Details" }
        ]} />
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Mulighet ikke funnet</p>
            <Button className="mt-4" onClick={() => navigate('/opportunities')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake til muligheter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weightedValue = ((opportunity.estimated_value || 0) * opportunity.probability / 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/opportunities')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tilbake
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Rediger
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Slett
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-3xl">{opportunity.title}</CardTitle>
                {opportunity.company && (
                  <CardDescription className="text-lg">
                    {opportunity.company.name}
                  </CardDescription>
                )}
              </div>
              <OpportunityStageBadge stage={opportunity.stage} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {opportunity.description && (
              <div>
                <h3 className="font-semibold mb-2">Beskrivelse</h3>
                <p className="text-muted-foreground">{opportunity.description}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Estimert verdi</h3>
                <p className="text-2xl font-bold">
                  {(opportunity.estimated_value || 0).toLocaleString('nb-NO')} kr
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Sannsynlighet</h3>
                <p className="text-2xl font-bold">{opportunity.probability}%</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Vektet verdi</h3>
                <p className="text-2xl font-bold">
                  {weightedValue.toLocaleString('nb-NO')} kr
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Forventet lukkedato</h3>
                <p className="text-lg">
                  {opportunity.expected_close_date 
                    ? new Date(opportunity.expected_close_date).toLocaleDateString('nb-NO')
                    : 'Ikke satt'}
                </p>
              </div>
            </div>

            {opportunity.next_step && (
              <div>
                <h3 className="font-semibold mb-2">Neste steg</h3>
                <p className="text-muted-foreground">{opportunity.next_step}</p>
              </div>
            )}

            {opportunity.tags && opportunity.tags.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {opportunity.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OpportunityDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        opportunity={opportunity}
        ownerId={opportunity.owner_id}
        onSuccess={loadOpportunity}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette vil permanent slette muligheten. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
