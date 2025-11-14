import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Copy, Loader2, RefreshCw, Ban } from "lucide-react";
import { format } from "date-fns";
import { AppBreadcrumbs } from '@/components/ui/app-breadcrumbs';
import { generateAdminBreadcrumbs } from '@/helpers/breadcrumbHelper';

interface InvitationFormData {
  email: string;
  contactPersonName: string;
  intendedRole: string;
}

export default function PlatformInvitationsPage() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<InvitationFormData>({
    email: "",
    contactPersonName: "",
    intendedRole: "contributor",
  });

  // Fetch all invitations
  const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
    queryKey: ['platform-invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: formData.email,
          contactPersonName: formData.contactPersonName,
          intendedRole: formData.intendedRole,
        },
      });

      if (error) throw error;

      toast.success("Invitasjon sendt!", {
        description: `En invitasjon er sendt til ${formData.email}`,
      });

      // Copy invitation URL if provided
      if (data?.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        toast.success("Invitasjonslenke kopiert til utklippstavlen");
      }

      // Reset form
      setFormData({
        email: "",
        contactPersonName: "",
        intendedRole: "contributor",
      });

      // Refresh invitations list
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast.error("Kunne ikke sende invitasjon", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteUrl = async (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?token=${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Invitasjonslenke kopiert");
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', id);

      if (error) throw error;

      toast.success("Invitasjon tilbakekalt");
      queryClient.invalidateQueries({ queryKey: ['platform-invitations'] });
    } catch (error: any) {
      toast.error("Kunne ikke tilbakekalle invitasjon", {
        description: error.message,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Venter</Badge>;
      case 'accepted':
        return <Badge variant="default">Akseptert</Badge>;
      case 'expired':
        return <Badge variant="destructive">Utløpt</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleName = (role: string) => {
    const roleNames: Record<string, string> = {
      tenant_owner: 'Tenant Eier',
      tenant_admin: 'Tenant Admin',
      analyst: 'Analytiker',
      contributor: 'Bidragsyter',
      viewer: 'Betrakter',
    };
    return roleNames[role] || role;
  };

  return (
    <div 
    <AppBreadcrumbs levels={generateAdminBreadcrumbs({
  category: "Platform",
  currentPage: "Invitations"
})} />
    className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Plattform-invitasjoner</h1>
        <p className="text-muted-foreground">
          Send invitasjoner til nye brukere for å gi dem tilgang til plattformen
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send ny invitasjon</CardTitle>
          <CardDescription>
            Invitasjoner er gyldige i 7 dager og tildeler automatisk den valgte rollen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvitation} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-postadresse *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="bruker@firma.no"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ola Nordmann"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rolle *</Label>
              <Select
                value={formData.intendedRole}
                onValueChange={(value) => setFormData({ ...formData, intendedRole: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant_owner">Tenant Eier</SelectItem>
                  <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                  <SelectItem value="analyst">Analytiker</SelectItem>
                  <SelectItem value="contributor">Bidragsyter</SelectItem>
                  <SelectItem value="viewer">Betrakter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send invitasjon
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invitasjoner</CardTitle>
          <CardDescription>
            Oversikt over alle sendte invitasjoner
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingInvitations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invitations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Ingen invitasjoner funnet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>E-post</TableHead>
                    <TableHead>Navn</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sendt</TableHead>
                    <TableHead>Utløper</TableHead>
                    <TableHead>Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{invitation.contact_person_name || '-'}</TableCell>
                      <TableCell>
                        {invitation.intended_role ? getRoleName(invitation.intended_role) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                      <TableCell>
                        {format(new Date(invitation.created_at), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invitation.expires_at), 'dd.MM.yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {invitation.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyInviteUrl(invitation.token)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevokeInvitation(invitation.id)}
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
