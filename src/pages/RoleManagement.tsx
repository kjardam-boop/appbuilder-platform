import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { 
  UserRoleRecord, 
  RoleScope, 
  AppRole,
  ROLE_LABELS,
  SCOPE_LABELS 
} from "@/modules/core/user/types/role.types";
import { Shield, Building2, Users, Briefcase, FolderKanban, Info } from "lucide-react";
import { SmartDataTable } from "@/components/DataTable/SmartDataTable";
import { ColumnDef } from "@/components/DataTable/types";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

interface RoleRowData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: AppRole;
  roleLabel: string;
  scopeType: RoleScope;
  scopeTypeLabel: string;
  scopeId: string | null;
  scopeName: string;
  grantedAt: string;
  grantedBy: string | null;
}

interface ScopeNameCache {
  tenants: Record<string, string>;
  companies: Record<string, string>;
  projects: Record<string, string>;
  apps: Record<string, string>;
}

const roleColumns: ColumnDef<RoleRowData>[] = [
  {
    key: 'userEmail',
    label: 'E-post',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 200,
  },
  {
    key: 'userName',
    label: 'Navn',
    type: 'text',
    sortable: true,
    filterable: true,
    width: 150,
  },
  {
    key: 'roleLabel',
    label: 'Rolle',
    type: 'select',
    sortable: true,
    filterable: true,
    multiSelect: true,
    filterOptions: Object.entries(ROLE_LABELS).map(([value, label]) => ({
      value: label,
      label,
    })),
    render: (value) => (
      <Badge variant="default" className="whitespace-nowrap">
        {value}
      </Badge>
    ),
  },
  {
    key: 'scopeTypeLabel',
    label: 'Scope Type',
    type: 'select',
    sortable: true,
    filterable: true,
    multiSelect: true,
    filterOptions: Object.entries(SCOPE_LABELS).map(([value, label]) => ({
      value: label,
      label,
    })),
    render: (value, row) => {
      const icons = {
        'Plattform': <Shield className="h-3 w-3 mr-1" />,
        'Tenant': <Users className="h-3 w-3 mr-1" />,
        'Selskap': <Building2 className="h-3 w-3 mr-1" />,
        'Prosjekt': <FolderKanban className="h-3 w-3 mr-1" />,
        'Applikasjon': <Briefcase className="h-3 w-3 mr-1" />,
      };
      return (
        <Badge variant="outline" className="whitespace-nowrap flex items-center w-fit">
          {icons[value as keyof typeof icons]}
          {value}
        </Badge>
      );
    },
  },
  {
    key: 'scopeName',
    label: 'Scope',
    type: 'text',
    sortable: true,
    filterable: true,
    render: (value) => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      return <span className="text-sm">{value}</span>;
    },
  },
  {
    key: 'grantedAt',
    label: 'Tildelt',
    type: 'date',
    sortable: true,
    filterable: true,
    width: 150,
    render: (value) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(value), "d. MMM yyyy HH:mm", { locale: nb })}
      </span>
    ),
  },
];

const RoleManagement = () => {
  const [roleRowData, setRoleRowData] = useState<RoleRowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRolesData();
  }, []);

  const loadRolesData = async () => {
    setIsLoading(true);
    try {
      console.log('[RoleManagement] Starting to load roles data...');
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      const allRoleRows: RoleRowData[] = [];
      
      // Collect all scope IDs for bulk fetching
      const scopeIds = {
        tenants: new Set<string>(),
        companies: new Set<string>(),
        projects: new Set<string>(),
        apps: new Set<string>(),
      };

      // First pass: collect all roles and scope IDs
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            const userId = (profile as any).user_id || (profile as any).id;
            const rolesByScope = await RoleService.getUserRolesByScope(userId);
            
            // Collect scope IDs
            Object.entries(rolesByScope).forEach(([scopeType, roles]) => {
              roles.forEach((role: UserRoleRecord) => {
                if (role.scope_id) {
                  if (scopeType === 'tenant') scopeIds.tenants.add(role.scope_id);
                  if (scopeType === 'company') scopeIds.companies.add(role.scope_id);
                  if (scopeType === 'project') scopeIds.projects.add(role.scope_id);
                  if (scopeType === 'app') scopeIds.apps.add(role.scope_id);
                }
              });
            });

            return {
              profile,
              rolesByScope,
            };
          } catch (err) {
            console.error('[RoleManagement] Error loading roles for', profile.email, ':', err);
            return null;
          }
        })
      );

      // Load all scope names in bulk
      const scopeNames = await loadScopeNames(scopeIds);

      // Second pass: transform to RoleRowData
      usersWithRoles.forEach((userWithRoles) => {
        if (!userWithRoles) return;

        const { profile, rolesByScope } = userWithRoles;

        Object.entries(rolesByScope).forEach(([scopeType, roles]) => {
          (roles as UserRoleRecord[]).forEach((role) => {
            const scopeName = getScopeName(scopeType as RoleScope, role.scope_id, scopeNames);
            
            allRoleRows.push({
              id: role.id,
              userId: role.user_id,
              userEmail: profile.email || 'N/A',
              userName: profile.full_name || 'N/A',
              role: role.role,
              roleLabel: ROLE_LABELS[role.role],
              scopeType: role.scope_type,
              scopeTypeLabel: SCOPE_LABELS[role.scope_type],
              scopeId: role.scope_id,
              scopeName: scopeName || (role.scope_id ? `ID: ${role.scope_id.substring(0, 8)}...` : '-'),
              grantedAt: role.granted_at,
              grantedBy: role.granted_by,
            });
          });
        });
      });

      console.log('[RoleManagement] Transformed', allRoleRows.length, 'role rows');
      setRoleRowData(allRoleRows);
    } catch (error) {
      console.error('[RoleManagement] Error loading roles:', error);
      toast.error('Kunne ikke laste roller');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScopeNames = async (scopeIds: {
    tenants: Set<string>;
    companies: Set<string>;
    projects: Set<string>;
    apps: Set<string>;
  }): Promise<ScopeNameCache> => {
    const newScopeNames: ScopeNameCache = {
      tenants: {},
      companies: {},
      projects: {},
      apps: {}
    };

    try {
      // Load tenant names
      if (scopeIds.tenants.size > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', Array.from(scopeIds.tenants));
        
        tenants?.forEach(t => {
          newScopeNames.tenants[t.id] = t.name;
        });
      }

      // Load company names
      if (scopeIds.companies.size > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', Array.from(scopeIds.companies));
        
        companies?.forEach(c => {
          newScopeNames.companies[c.id] = c.name;
        });
      }

      // Load project names
      if (scopeIds.projects.size > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', Array.from(scopeIds.projects));
        
        projects?.forEach(p => {
          newScopeNames.projects[p.id] = p.name;
        });
      }

      // Load app names via SECURITY DEFINER RPC to bypass RLS for admin views
      if (scopeIds.apps.size > 0) {
        const { data: appNames, error: rpcError } = await supabase.rpc('get_app_names', {
          p_app_ids: Array.from(scopeIds.apps),
        });
        if (rpcError) {
          console.error('[RoleManagement] Error loading app names via RPC:', rpcError);
        }
        
        (appNames || []).forEach((row: any) => {
          newScopeNames.apps[row.id] = row.tenant_name 
            ? `${row.name} (${row.tenant_name})`
            : row.name;
        });
      }

      return newScopeNames;
    } catch (error) {
      console.error('[RoleManagement] Error loading scope names:', error);
      return newScopeNames;
    }
  };

  const getScopeName = (scope: RoleScope, scopeId: string | null, scopeNames: ScopeNameCache): string | null => {
    if (!scopeId) return null;
    
    switch (scope) {
      case 'tenant':
        return scopeNames.tenants[scopeId] || null;
      case 'company':
        return scopeNames.companies[scopeId] || null;
      case 'project':
        return scopeNames.projects[scopeId] || null;
      case 'app':
        return scopeNames.apps[scopeId] || null;
      default:
        return null;
    }
  };

  // Calculate statistics
  const uniqueUsers = new Set(roleRowData.map(r => r.userId)).size;
  const platformRoles = roleRowData.filter(r => r.scopeType === 'platform').length;
  const tenantRoles = roleRowData.filter(r => r.scopeType === 'tenant').length;
  const companyRoles = roleRowData.filter(r => r.scopeType === 'company').length;
  const projectRoles = roleRowData.filter(r => r.scopeType === 'project').length;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rolleadministrasjon</h1>
          <p className="text-muted-foreground">
            Oversikt over brukerroller på tvers av plattform, tenants og prosjekter
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Dette er en kun-lesbar oversikt. For å endre roller, gå til{" "}
          <a href="/admin/users" className="underline font-medium">
            Brukeradministrasjon
          </a>
          .
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totalt roller</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleRowData.length}</div>
            <p className="text-xs text-muted-foreground">{uniqueUsers} unike brukere</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plattform</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenant</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selskap</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companyRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prosjekt</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectRoles}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : (
            <SmartDataTable
              columns={roleColumns}
              data={roleRowData}
              searchKey="userEmail"
              initialPageSize={25}
              emptyMessage="Ingen roller funnet"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;
