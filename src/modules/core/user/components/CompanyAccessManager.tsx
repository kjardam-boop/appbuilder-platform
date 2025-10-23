// @ts-nocheck
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, X, Building2 } from 'lucide-react';
import { CompanyUserService } from '@/modules/core/company/services/companyUserService';
import { CompanyMembership, CompanyRole, COMPANY_ROLES } from '@/modules/core/company/types/companyUser.types';
import { supabase } from '@/integrations/supabase/client';

interface CompanyAccessManagerProps {
  userId: string;
}

interface Company {
  id: string;
  name: string;
  org_number: string;
}

export function CompanyAccessManager({ userId }: CompanyAccessManagerProps) {
  const [memberships, setMemberships] = useState<CompanyMembership[]>([]);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CompanyRole>('member');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMemberships();
    loadAllCompanies();
  }, [userId]);

  const loadMemberships = async () => {
    try {
      const data = await CompanyUserService.getUserCompanies(userId);
      setMemberships(data);
    } catch (error) {
      console.error('Error loading memberships:', error);
      toast.error('Kunne ikke laste selskapstilknytninger');
    }
  };

  const loadAllCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, org_number')
        .order('name');
      
      if (error) throw error;
      setAllCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleAddCompany = async () => {
    if (!selectedCompanyId) {
      toast.error('Vennligst velg et selskap');
      return;
    }

    setLoading(true);
    try {
      await CompanyUserService.addUserToCompany(selectedCompanyId, userId, selectedRole);
      toast.success('Bruker lagt til i selskap');
      setSelectedCompanyId('');
      setSelectedRole('member');
      await loadMemberships();
    } catch (error: any) {
      console.error('Error adding user to company:', error);
      if (error.code === '23505') {
        toast.error('Brukeren er allerede medlem av dette selskapet');
      } else {
        toast.error('Kunne ikke legge til bruker i selskap');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCompany = async (companyId: string) => {
    setLoading(true);
    try {
      await CompanyUserService.removeUserFromCompany(companyId, userId);
      toast.success('Bruker fjernet fra selskap');
      await loadMemberships();
    } catch (error) {
      console.error('Error removing user from company:', error);
      toast.error('Kunne ikke fjerne bruker fra selskap');
    } finally {
      setLoading(false);
    }
  };

  const availableCompanies = allCompanies.filter(
    company => !memberships.some(m => m.company_id === company.id)
  );

  const getRoleBadgeVariant = (role: CompanyRole) => {
    switch (role) {
      case 'owner': return 'default';
      case 'admin': return 'secondary';
      case 'member': return 'outline';
      case 'viewer': return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Selskapstilknytninger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new company access */}
        <div className="flex gap-2">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Velg selskap..." />
            </SelectTrigger>
            <SelectContent>
              {availableCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name} ({company.org_number})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as CompanyRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COMPANY_ROLES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={handleAddCompany}
            disabled={!selectedCompanyId || loading}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Legg til
          </Button>
        </div>

        {/* Current memberships */}
        <div className="space-y-2">
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brukeren har ingen selskapstilknytninger
            </p>
          ) : (
            memberships.map((membership) => (
              <div
                key={membership.company_id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{membership.company_name}</p>
                  <p className="text-sm text-muted-foreground">{membership.org_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getRoleBadgeVariant(membership.role)}>
                    {COMPANY_ROLES[membership.role]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCompany(membership.company_id)}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
