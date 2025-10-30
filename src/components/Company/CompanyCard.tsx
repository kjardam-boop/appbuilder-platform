// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAuth } from '@/modules/core/user/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CompanyService } from '@/modules/core/company/services/companyService';
import { useTenantContext } from '@/hooks/useTenantContext';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Building, Trash2, Archive, ExternalLink } from 'lucide-react';
import type { Company } from '@/modules/core/company/types/company.types';

interface CompanyCardProps {
  company: Company;
  onUpdate?: () => void;
}

export const CompanyCard = ({ company, onUpdate }: CompanyCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const context = useTenantContext();
  const { toast } = useToast();
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const { data: isAdmin } = await supabase.rpc('is_platform_admin', { _user_id: user.id });
      setIsPlatformOwner(!!isAdmin);
    };
    checkRole();
  }, [user]);

  const handleDelete = async () => {
    if (!user || !context) return;
    
    setIsDeleting(true);
    try {
      await CompanyService.deleteCompany(company.id, context.tenant_id, user.id);
      toast({
        title: isPlatformOwner ? 'Selskap permanent slettet' : 'Selskap fjernet fra din tenant',
        description: isPlatformOwner 
          ? 'Selskapet er permanent fjernet fra databasen' 
          : 'Selskapet er fjernet fra din tenant og kan legges til igjen senere',
      });
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke slette selskap',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleArchive = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      await CompanyService.archiveCompany(company.id, user.id);
      toast({
        title: 'Selskap arkivert',
        description: 'Selskapet er skjult fra alle tenants, men dataene er beholdt',
      });
      setShowDeleteDialog(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error archiving company:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke arkivere selskap',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-lg">{company.name}</CardTitle>
                {company.org_number && (
                  <p className="text-sm text-muted-foreground">Org.nr: {company.org_number}</p>
                )}
              </div>
            </div>
            {company.crm_status && (
              <Badge variant="secondary">{company.crm_status}</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {company.industry_description && (
            <p className="text-sm text-muted-foreground mb-2">
              {company.industry_description}
            </p>
          )}
          {company.website && (
            <a
              href={company.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              {company.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/company/${company.id}`)}
            className="flex-1"
          >
            Se detaljer
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPlatformOwner ? 'Slette eller arkivere selskap?' : 'Fjern selskap fra tenant?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isPlatformOwner ? (
                <>
                  <strong>Hard delete:</strong> Fjerner permanent fra databasen (kan ikke angres)
                  <br />
                  <strong>Arkiver:</strong> Skjuler fra alle tenants, men beholder data
                </>
              ) : (
                'Dette fjerner selskapet fra din tenant. Selskapet vil fortsatt være tilgjengelig for andre tenants og kan legges til igjen senere.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            {isPlatformOwner ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleArchive}
                  disabled={isDeleting}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arkiver
                </Button>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hard delete
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
              >
                Fjern fra tenant
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
