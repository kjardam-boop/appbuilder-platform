import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Download, Upload } from "lucide-react";
import { AppRole, ROLE_LABELS } from "@/modules/core/user/types/role.types";
import { usePermissions, useRolePermissions, usePermissionImportExport } from "@/modules/core/permissions";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const ROLES_BY_SCOPE = {
  platform: ['platform_owner', 'platform_support', 'platform_auditor'] as AppRole[],
  tenant: ['tenant_owner', 'tenant_admin', 'security_admin', 'data_protection'] as AppRole[],
  company: ['integration_service'] as AppRole[],
  project: ['project_owner', 'analyst', 'contributor', 'approver', 'viewer', 'external_reviewer'] as AppRole[],
};

const RoleConfiguration = () => {
  const [selectedRole, setSelectedRole] = useState<AppRole>('platform_owner');
  const { resources, actions } = usePermissions();
  const { data: permissionMatrix, updatePermissions, isUpdating } = useRolePermissions(selectedRole);
  const { exportPermissions, importPermissions, isExporting, isImporting } = usePermissionImportExport();

  console.log('RoleConfiguration Debug:', {
    selectedRole,
    resourcesLoading: resources.isLoading,
    resourcesData: resources.data,
    actionsLoading: actions.isLoading,
    actionsData: actions.data,
    permissionMatrix,
  });

  const handleTogglePermission = (resourceKey: string, actionKey: string, currentValue: boolean) => {
    const currentActions = permissionMatrix?.permissions[resourceKey] || [];
    const newActions = currentValue
      ? currentActions.filter(a => a !== actionKey)
      : [...currentActions, actionKey];
    
    updatePermissions({ resourceKey, actionKeys: newActions });
  };

  const handleExport = () => {
    exportPermissions();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        importPermissions(data);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('Ugyldig JSON-fil');
      }
    };
    input.click();
  };

  if (resources.isLoading || actions.isLoading) {
    return <div className="p-8">Laster...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Rollekonfigurasjon</h1>
          <p className="text-muted-foreground">
            Definer hvilke tilganger hver rolle skal ha
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            Eksporter
          </Button>
        </div>
      </div>

      <Tabs defaultValue="platform" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="tenant">Tenant</TabsTrigger>
          <TabsTrigger value="company">Selskap</TabsTrigger>
          <TabsTrigger value="project">Prosjekt</TabsTrigger>
        </TabsList>

        {Object.entries(ROLES_BY_SCOPE).map(([scope, roles]) => (
          <TabsContent key={scope} value={scope} className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {roles.map(role => (
                <Button
                  key={role}
                  variant={selectedRole === role ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedRole(role)}
                >
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {ROLE_LABELS[selectedRole]}
                </CardTitle>
                <CardDescription>
                  Administrer tilganger for denne rollen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-[200px_1fr] gap-4 border-b pb-2">
                    <div className="font-semibold">Ressurs</div>
                    <div className="font-semibold">Tilganger</div>
                  </div>
                  {resources.data?.map(resource => (
                    <div key={resource.key} className="grid grid-cols-[200px_1fr] gap-4 items-center">
                      <div>
                        <div className="font-medium">{resource.name}</div>
                        <div className="text-xs text-muted-foreground">{resource.description}</div>
                      </div>
                      <div className="flex gap-4 flex-wrap">
                        {actions.data?.map(action => {
                          const hasPermission = permissionMatrix?.permissions[resource.key]?.includes(action.key) || false;
                          return (
                            <label key={action.key} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={() => handleTogglePermission(resource.key, action.key, hasPermission)}
                                disabled={isUpdating}
                              />
                              <span className="text-sm">{action.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default RoleConfiguration;
