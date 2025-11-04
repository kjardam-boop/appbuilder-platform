/**
 * App Registry Hooks
 * React hooks for interacting with the app registry
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppRegistryService } from "../services/appRegistryService";
import { TenantAppsService } from "../services/tenantAppsService";
import { CompatibilityService } from "../services/compatibilityService";
import { DeploymentService } from "../services/deploymentService";
import { toast } from "sonner";
import type { AppConfig, AppOverrides } from "../types/appRegistry.types";

export function useAppDefinitions(filters?: { app_type?: string }) {
  return useQuery({
    queryKey: ['app-definitions', filters],
    queryFn: () => AppRegistryService.listDefinitions(filters),
  });
}

export function useAppDefinition(appKey: string) {
  return useQuery({
    queryKey: ['app-definition', appKey],
    queryFn: () => AppRegistryService.getDefinitionByKey(appKey),
    enabled: !!appKey,
  });
}

export function useAppVersions(appKey: string) {
  return useQuery({
    queryKey: ['app-versions', appKey],
    queryFn: () => AppRegistryService.listVersions(appKey),
    enabled: !!appKey,
  });
}

export function useInstallApp(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { 
      appKey: string; 
      version?: string; 
      channel?: 'stable' | 'canary';
      config?: AppConfig;
    }) =>
      TenantAppsService.install(tenantId, params.appKey, {
        version: params.version,
        channel: params.channel,
        config: params.config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-applications', tenantId] });
      toast.success('App installert');
    },
    onError: (error: Error) => {
      toast.error(`Installasjonen feilet: ${error.message}`);
    },
  });
}

export function useUpdateApp(tenantId: string, appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { version: string; userId?: string }) =>
      TenantAppsService.update(tenantId, appKey, params.version, params.userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-application', tenantId, appKey] });
      queryClient.invalidateQueries({ queryKey: ['tenant-applications', tenantId] });
      toast.success('App oppdatert');
    },
    onError: (error: Error) => {
      toast.error(`Oppdateringen feilet: ${error.message}`);
    },
  });
}

export function useUpdateAppConfig(tenantId: string, appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: AppConfig) => 
      TenantAppsService.setConfig(tenantId, appKey, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-application', tenantId, appKey] });
      toast.success('Konfigurasjon oppdatert');
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere konfigurasjon: ${error.message}`);
    },
  });
}

export function useUpdateAppOverrides(tenantId: string, appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (overrides: AppOverrides) =>
      TenantAppsService.setOverrides(tenantId, appKey, overrides),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-application', tenantId, appKey] });
      toast.success('Overrides oppdatert');
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke oppdatere overrides: ${error.message}`);
    },
  });
}

export function useChangeAppChannel(tenantId: string, appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channel: 'stable' | 'canary' | 'pinned') =>
      TenantAppsService.setChannel(tenantId, appKey, channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-application', tenantId, appKey] });
      toast.success('Channel endret');
    },
    onError: (error: Error) => {
      toast.error(`Kunne ikke endre channel: ${error.message}`);
    },
  });
}

export function useUninstallApp(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (appKey: string) =>
      TenantAppsService.uninstall(tenantId, appKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-applications', tenantId] });
      toast.success('App avinstallert');
    },
    onError: (error: Error) => {
      toast.error(`Avinstallering feilet: ${error.message}`);
    },
  });
}

export function useCompatibilityCheck(tenantId: string, appKey: string, version: string) {
  return useQuery({
    queryKey: ['compatibility-check', tenantId, appKey, version],
    queryFn: () => CompatibilityService.preflight(tenantId, appKey, version),
    enabled: !!tenantId && !!appKey && !!version,
  });
}

export function useDeploymentStatus(appKey: string) {
  return useQuery({
    queryKey: ['deployment-status', appKey],
    queryFn: () => DeploymentService.getDeploymentStatus(appKey),
    enabled: !!appKey,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function usePromoteToStable(appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (version: string) =>
      DeploymentService.promoteToStable(appKey, version),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deployment-status', appKey] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Promotion feilet: ${error.message}`);
    },
  });
}

export function useRollback(appKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { 
      version: string; 
      channel?: 'stable' | 'canary';
      tenantIds?: string[];
    }) =>
      DeploymentService.rollback(appKey, params.version, {
        channel: params.channel,
        tenantIds: params.tenantIds,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['deployment-status', appKey] });
      toast.success(result.message);
    },
    onError: (error: Error) => {
      toast.error(`Rollback feilet: ${error.message}`);
    },
  });
}
