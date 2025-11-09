import { useEffect, useState } from "react";
import { RoleService } from "../services/roleService";
import { AppRole, RoleScope, ROLE_LABELS, SCOPE_LABELS } from "../types/role.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Plus, X, Shield, Building2, Users, FolderKanban, Briefcase } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TenantSelector } from "@/components/Admin/TenantSelector";
import { CompanySelector } from "@/components/Admin/CompanySelector";
import { ProjectSelector } from "@/components/Admin/ProjectSelector";
import { AppSelector } from "@/components/Admin/AppSelector";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  id: string;
  user_id: string; // CRITICAL: This is the auth.users ID
  email: string;
  full_name: string;
}

interface ScopeNameCache {
  tenants: Record<string, string>;
  companies: Record<string, string>;
  projects: Record<string, string>;
  apps: Record<string, string>;
}

const ROLES_BY_SCOPE: Record<RoleScope, AppRole[]> = {
  platform: ['platform_owner', 'platform_support', 'platform_auditor'],
  tenant: ['tenant_owner', 'tenant_admin', 'security_admin', 'data_protection'],
  company: ['integration_service', 'supplier_user'],
  project: ['project_owner', 'analyst', 'contributor', 'approver', 'viewer', 'external_reviewer'],
  app: ['app_admin', 'app_user'],
};

export function UserList() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<Record<string, Record<RoleScope, any[]>>>({});
  const [scopeNames, setScopeNames] = useState<ScopeNameCache>({
    tenants: {},
    companies: {},
    projects: {},
    apps: {}
  });
  
  // State for adding roles
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedScope, setSelectedScope] = useState<RoleScope>("platform");
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [selectedScopeId, setSelectedScopeId] = useState<string>("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Get all profiles with user_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name')
        .order('full_name');

      if (profilesError) throw profilesError;

      setUsers(profiles || []);

      // Load roles for each user (using user_id, not profile.id!)
      const rolesMap: Record<string, Record<RoleScope, any[]>> = {};
      for (const profile of profiles || []) {
        const rolesByScope = await RoleService.getUserRolesByScope(profile.user_id);
        rolesMap[profile.user_id] = rolesByScope;
      }
      setUserRoles(rolesMap);
      
      // Load scope names
      await loadScopeNames(rolesMap);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Kunne ikke laste brukere');
    } finally {
      setLoading(false);
    }
  };

  const loadScopeNames = async (rolesMap: Record<string, Record<RoleScope, any[]>>) => {
    try {
      const tenantIds = new Set<string>();
      const companyIds = new Set<string>();
      const projectIds = new Set<string>();
      const appIds = new Set<string>();

      // Collect all unique scope_ids from all users
      Object.values(rolesMap).forEach(rolesByScope => {
        rolesByScope.tenant?.forEach((role: any) => role.scope_id && tenantIds.add(role.scope_id));
        rolesByScope.company?.forEach((role: any) => role.scope_id && companyIds.add(role.scope_id));
        rolesByScope.project?.forEach((role: any) => role.scope_id && projectIds.add(role.scope_id));
        rolesByScope.app?.forEach((role: any) => role.scope_id && appIds.add(role.scope_id));
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

      // Load tenant names
      if (tenantIds.size > 0) {
        const { data: tenants } = await supabase
          .from('tenants')
          .select('id, name')
          .in('id', Array.from(tenantIds));
        
        tenants?.forEach(t => {
          newScopeNames.tenants[t.id] = t.name;
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

      // Load app names (join with app_definitions to get name)
      if (appIds.size > 0) {
        const { data: apps, error: appsError } = await supabase
          .from('applications')
          .select(`
            id,
            app_definitions!inner (
              name
            )
          `)
          .in('id', Array.from(appIds));
        
        if (appsError) {
          console.error('Error loading app names:', appsError);
        }
        
        apps?.forEach(a => {
          const appDef = a.app_definitions as any;
          newScopeNames.apps[a.id] = appDef?.name || 'Unknown App';
        });
      }

      setScopeNames(newScopeNames);
    } catch (error) {
      console.error('Error loading scope names:', error);
    }
  };

  const handleAddRole = async (userId: string, role: AppRole, scope: RoleScope, scopeId?: string) => {
    try {
      await RoleService.grantRole({
        userId,
        role,
        scopeType: scope,
        scopeId,
      });
      toast.success('Rolle lagt til');
      await loadUsers();
      
      // Reset selection
      setSelectedRole("");
      setSelectedScopeId("");
    } catch (error: any) {
      console.error('Error adding role:', error);
      toast.error(error.message || 'Kunne ikke legge til rolle');
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole, scope: RoleScope, scopeId?: string) => {
    try {
      await RoleService.revokeRole(userId, role, scope, scopeId);
      toast.success('Rolle fjernet');
      await loadUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Kunne ikke fjerne rolle');
    }
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    if (role.includes('owner')) return 'default';
    if (role.includes('admin')) return 'secondary';
    return 'outline';
  };

  const canAddRole = (userId: string, scope: RoleScope) => {
    if (selectedUserId !== userId) return false;
    if (!selectedRole) return false;
    if (scope === 'platform') return true; // Platform doesn't need scope ID
    return !!selectedScopeId; // Other scopes need a scope ID
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
      <div className="space-y-4">
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brukere</h2>
          <p className="text-muted-foreground">Administrer brukerroller og tilganger</p>
        </div>
        <Badge variant="secondary">{users.length} brukere</Badge>
      </div>

      <div className="space-y-3">
        {users.map((user) => {
          const roles = userRoles[user.user_id] || { platform: [], tenant: [], company: [], project: [] };
          
          return (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      {user.full_name || 'Ukjent navn'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="platform" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="platform">
                      <Shield className="h-4 w-4 mr-2" />
                      Platform
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
                      {/* Current Roles */}
                      <div>
                        <h3 className="text-sm font-medium mb-2">Tildelte {SCOPE_LABELS[scope].toLowerCase()}-roller</h3>
                        <div className="flex flex-wrap gap-2">
                          {roles[scope].length === 0 ? (
                            <Badge variant="outline">Ingen roller</Badge>
                          ) : (
                            roles[scope].map((roleRecord: any) => {
                              const scopeName = getScopeName(scope, roleRecord.scope_id);
                              
                              return (
                                <div key={roleRecord.id} className="flex items-center gap-1 border rounded-md p-2">
                                  <div className="flex flex-col gap-1">
                                    <Badge variant={getRoleBadgeVariant(roleRecord.role)}>
                                      {ROLE_LABELS[roleRecord.role]}
                                    </Badge>
                                    {scopeName && (
                                      <span className="text-xs text-muted-foreground">
                                        {scopeName}
                                      </span>
                                    )}
                                    {roleRecord.scope_id && !scopeName && (
                                      <span className="text-xs text-muted-foreground">
                                        ID: {roleRecord.scope_id.substring(0, 8)}...
                                      </span>
                                    )}
                                  </div>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 ml-2"
                                    onClick={() => handleRemoveRole(user.user_id, roleRecord.role, scope, roleRecord.scope_id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Add New Role */}
                      <div className="space-y-3 border-t pt-4">
                        <h3 className="text-sm font-medium">Legg til ny rolle</h3>
                        
                        {scope !== 'platform' && (
                          <div>
                            <label className="text-sm text-muted-foreground mb-1 block">
                              Velg {SCOPE_LABELS[scope].toLowerCase()}
                            </label>
                            {scope === 'tenant' && (
                              <TenantSelector
                                value={selectedUserId === user.user_id ? selectedScopeId : ""}
                                onValueChange={(value) => {
                                  setSelectedUserId(user.user_id);
                                  setSelectedScope(scope);
                                  setSelectedScopeId(value);
                                }}
                              />
                            )}
                            {scope === 'company' && (
                              <CompanySelector
                                value={selectedUserId === user.user_id ? selectedScopeId : ""}
                                onValueChange={(value) => {
                                  setSelectedUserId(user.user_id);
                                  setSelectedScope(scope);
                                  setSelectedScopeId(value);
                                }}
                              />
                            )}
                            {scope === 'project' && (
                              <ProjectSelector
                                value={selectedUserId === user.user_id ? selectedScopeId : ""}
                                onValueChange={(value) => {
                                  setSelectedUserId(user.user_id);
                                  setSelectedScope(scope);
                                  setSelectedScopeId(value);
                                }}
                              />
                            )}
                            {scope === 'app' && (
                              <AppSelector
                                value={selectedUserId === user.user_id ? selectedScopeId : ""}
                                onValueChange={(value) => {
                                  setSelectedUserId(user.user_id);
                                  setSelectedScope(scope);
                                  setSelectedScopeId(value);
                                }}
                              />
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedUserId === user.user_id && selectedScope === scope ? selectedRole : ""}
                            onValueChange={(value) => {
                              setSelectedUserId(user.user_id);
                              setSelectedScope(scope);
                              setSelectedRole(value as AppRole);
                            }}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Velg rolle..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES_BY_SCOPE[scope].map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (selectedRole && selectedUserId === user.user_id && selectedScope === scope) {
                                handleAddRole(
                                  user.user_id, 
                                  selectedRole, 
                                  scope, 
                                  scope === 'platform' ? undefined : selectedScopeId
                                );
                              }
                            }}
                            disabled={!canAddRole(user.user_id, scope) || selectedScope !== scope}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Legg til rolle
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
