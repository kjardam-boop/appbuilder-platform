import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, Trash2, Calendar, Bot, Loader2 } from 'lucide-react';

interface TenantApplication {
  id: string;
  app_definition_id: string | null;
  app_type: string;
  subdomain: string | null;
  deployed_at: string | null;
  is_active: boolean;
  installed_at: string;
  app_definitions: {
    name: string;
    key: string;
    icon_name: string;
  } | null;
}

interface InstalledAppCardProps {
  app: TenantApplication;
  tenantId: string;
  onAppUpdated: () => void;
}

const iconMap: Record<string, any> = {
  Calendar,
  Bot,
};

export function InstalledAppCard({ app, tenantId, onAppUpdated }: InstalledAppCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const Icon = iconMap[app.app_definitions?.icon_name || ''] || Calendar;

  const handleDeactivate = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('applications')
        .update({ is_active: false, status: 'inactive' })
        .eq('id', app.id);

      if (error) throw error;

      toast.success('Applikasjon deaktivert', {
        description: 'Appen er ikke lenger tilgjengelig for brukere'
      });

      onAppUpdated();
    } catch (error) {
      console.error('Failed to deactivate app:', error);
      toast.error('Kunne ikke deaktivere applikasjonen', {
        description: error instanceof Error ? error.message : 'Ukjent feil'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{app.app_definitions?.name || 'Ukjent app'}</CardTitle>
                <CardDescription>
                  Installert {new Date(app.installed_at).toLocaleDateString('nb-NO')}
                </CardDescription>
              </div>
            </div>
            <Badge variant="default">Aktiv</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link 
                to={`/apps/${app.app_definitions?.key || app.id}`} 
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Åpne app
              </Link>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deaktiver
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deaktiver applikasjon?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil deaktivere <strong>{app.app_definitions?.name}</strong>? 
              Appen vil ikke lenger være tilgjengelig for brukere, men data blir beholdt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deaktiverer...
                </>
              ) : (
                'Deaktiver'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
