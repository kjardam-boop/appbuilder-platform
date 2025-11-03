import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  rolesByScope: Record<RoleScope, UserRoleRecord[]>;
}

interface ScopeNameCache {
  tenants: Record<string, string>;
  companies: Record<string, string>;
  projects: Record<string, string>;
  apps: Record<string, string>;
}

const RoleManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<RoleScope | 'all'>('all');
  const [scopeNames, setScopeNames] = useState<ScopeNameCache>({
    tenants: {},
    companies: {},
    projects: {},
    apps: {}
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('[RoleManagement] Starting to load users...');
      setLoading(true);
      setError(null);
      
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name')
        .order('full_name');

      console.log('[RoleManagement] Profiles loaded:', profiles?.length, 'profiles');

      if (profilesError) {
        console.error('[RoleManagement] Error loading profiles:', profilesError);
        throw profilesError;
      }

      // Get roles for each user grouped by scope
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          console.log('[RoleManagement] Loading roles for user:', profile.email);
          
          try {
            const rolesByScope = await RoleService.getUserRolesByScope(profile.user_id);
            console.log('[RoleManagement] Roles loaded for', profile.email, ':', 
              Object.entries(rolesByScope).map(([scope, roles]) => `${scope}: ${roles.length}`).join(', ')
            );
            
            return {
              id: profile.user_id,
              email: profile.email,
              full_name: profile.full_name || 'Ukjent navn',
              rolesByScope,
            };
          } catch (err) {
            console.error('[RoleManagement] Error loading roles for', profile.email, ':', err);
            // Return user with empty roles on error
            return {
              id: profile.user_id,
              email: profile.email,
              full_name: profile.full_name || 'Ukjent navn',
              rolesByScope: {
                platform: [],
                tenant: [],
                company: [],
                project: [],
                app: [],
              },
            };
          }
        })
      );

      console.log('[RoleManagement] Total users with roles:', usersWithRoles.length);
      setUsers(usersWithRoles);
      
      // Load scope names for all scope_ids
      await loadScopeNames(usersWithRoles);
    } catch (error) {
      console.error('[RoleManagement] Error loading users:', error);
      setError(error instanceof Error ? error.message : 'Kunne ikke laste brukere');
    } finally {
      setLoading(false);
    }
  };

  const loadScopeNames = async (usersWithRoles: UserWithRoles[]) => {
    try {
      const tenantIds = new Set<string>();
      const companyIds = new Set<string>();
      const projectIds = new Set<string>();
      const appIds = new Set<string>();

      // Collect all unique scope_ids
      usersWithRoles.forEach(user => {
        user.rolesByScope.tenant.forEach(role => role.scope_id && tenantIds.add(role.scope_id));
        user.rolesByScope.company.forEach(role => role.scope_id && companyIds.add(role.scope_id));
        user.rolesByScope.project.forEach(role => role.scope_id && projectIds.add(role.scope_id));
        user.rolesByScope.app.forEach(role => role.scope_id && appIds.add(role.scope_id));
      });

      console.log('[RoleManagement] Loading scope names...', {
        tenants: tenantIds.size,
        companies: companyIds.size,
        projects: projectIds.size,
        apps: appIds.size
      });

      const newScopeNames: ScopeNameCache = {
        tenants: {},
        companies: {},
        projects: {},
        apps: {}
      };

      // Load company names
      if (companyIds.size > 0) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', Array.from(companyIds));
        
        companies?.forEach(c => {
          newScopeNames.companies[c.id] = c.name;
        });
      }

      // Load project names
      if (projectIds.size > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', Array.from(projectIds));
        
        projects?.forEach(p => {
          newScopeNames.projects[p.id] = p.name;
        });
      }

      // Load app names
      if (appIds.size > 0) {
        const { data: apps } = await supabase
          .from('applications')
          .select('id, name')
          .in('id', Array.from(appIds));
        
        apps?.forEach(a => {
          newScopeNames.apps[a.id] = a.name;
        });
      }

      // For tenants, we'll just use the ID as there's no tenants table visible
      tenantIds.forEach(id => {
        newScopeNames.tenants[id] = `Tenant ${id.substring(0, 8)}`;
      });

      console.log('[RoleManagement] Scope names loaded:', newScopeNames);
      setScopeNames(newScopeNames);
    } catch (error) {
      console.error('[RoleManagement] Error loading scope names:', error);
    }
  };


  const getScopeIcon = (scope: RoleScope) => {
    switch (scope) {
      case 'platform': return <Shield className="h-4 w-4" />;
      case 'tenant': return <Users className="h-4 w-4" />;
      case 'company': return <Building2 className="h-4 w-4" />;
      case 'project': return <FolderKanban className="h-4 w-4" />;
      case 'app': return <Briefcase className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    if (role.includes('owner')) return 'default';
    if (role.includes('admin')) return 'secondary';
    return 'outline';
  };

  const filterUsersByScope = (user: UserWithRoles) => {
    if (selectedScope === 'all') return true;
    return user.rolesByScope[selectedScope].length > 0;
  };

  const getScopeName = (scope: RoleScope, scopeId: string | null): string | null => {
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

  if (loading) {
    return (
      <div className="space-y-4 p-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const filteredUsers = users.filter(filterUsersByScope);

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Rolleoversikt</h1>
        <p className="text-muted-foreground">
          Kun lesbar oversikt over roller i systemet. For å endre roller, bruk brukeradministrasjonssiden.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Feil ved lasting av brukere: {error}
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Dette er en oversiktsside. For å legge til eller fjerne roller, gå til <a href="/admin/users" className="underline">Brukeradministrasjon</a>.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        <Select value={selectedScope} onValueChange={(v) => setSelectedScope(v as RoleScope | 'all')}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle scopes</SelectItem>
            {Object.entries(SCOPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filteredUsers.length} brukere</Badge>
      </div>

      <div className="space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {user.full_name}
                  </CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="platform" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="platform">
                    <Shield className="h-4 w-4 mr-2" />
                    Plattform
                  </TabsTrigger>
                  <TabsTrigger value="tenant">
                    <Users className="h-4 w-4 mr-2" />
                    Tenant
                  </TabsTrigger>
                  <TabsTrigger value="company">
                    <Building2 className="h-4 w-4 mr-2" />
                    Selskap
                  </TabsTrigger>
                  <TabsTrigger value="project">
                    <FolderKanban className="h-4 w-4 mr-2" />
                    Prosjekt
                  </TabsTrigger>
                  <TabsTrigger value="app">
                    <Briefcase className="h-4 w-4 mr-2" />
                    App
                  </TabsTrigger>
                </TabsList>

                {(['platform', 'tenant', 'company', 'project', 'app'] as RoleScope[]).map((scope) => (
                  <TabsContent key={scope} value={scope} className="space-y-4 mt-4">
                    {user.rolesByScope[scope].length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Ingen roller i {SCOPE_LABELS[scope].toLowerCase()}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {user.rolesByScope[scope].map((roleRecord) => {
                          const scopeName = getScopeName(scope, roleRecord.scope_id);
                          
                          return (
                            <div
                              key={roleRecord.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                {getScopeIcon(scope)}
                                <div>
                                  <Badge variant={getRoleBadgeVariant(roleRecord.role)}>
                                    {ROLE_LABELS[roleRecord.role]}
                                  </Badge>
                                  {scopeName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {scopeName}
                                    </p>
                                  )}
                                  {roleRecord.scope_id && !scopeName && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      ID: {roleRecord.scope_id.substring(0, 8)}...
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoleManagement;
