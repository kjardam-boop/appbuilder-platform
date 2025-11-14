import { Badge } from "@/components/ui/badge";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Building2, Link as LinkIcon, Database, Cookie, Hash } from "lucide-react";
import { useEffect, useState } from "react";

interface TenantSource {
  source: string;
  icon: React.ElementType;
  color: string;
}

const getSourceInfo = (): TenantSource => {
  // Check path parameter first
  const pathMatch = window.location.pathname.match(/^\/admin\/tenants\/([^\/]+)/);
  if (pathMatch) {
    return { source: "Path Parameter", icon: LinkIcon, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
  }

  // Check query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tenant')) {
    return { source: "Query Parameter", icon: LinkIcon, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" };
  }

  // Check hash
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hashParams.get('tenant')) {
    return { source: "Hash Parameter", icon: Hash, color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" };
  }

  // Check localStorage
  if (localStorage.getItem('tenantOverride')) {
    return { source: "LocalStorage", icon: Database, color: "bg-green-500/10 text-green-500 border-green-500/20" };
  }

  // Check sessionStorage
  if (sessionStorage.getItem('tenantOverride')) {
    return { source: "SessionStorage", icon: Database, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
  }

  // Check cookie
  const cookieMatch = document.cookie.match(/tenantOverride=([^;]+)/);
  if (cookieMatch) {
    return { source: "Cookie", icon: Cookie, color: "bg-orange-500/10 text-orange-500 border-orange-500/20" };
  }

  // Default/hostname resolution
  return { source: "Hostname", icon: Building2, color: "bg-muted text-muted-foreground border-border" };
};

export function TenantContextIndicator() {
  const context = useTenantContext();
  const [sourceInfo, setSourceInfo] = useState<TenantSource>(getSourceInfo());

  useEffect(() => {
    // Update source info when location changes
    setSourceInfo(getSourceInfo());
  }, [window.location.pathname, window.location.search, window.location.hash]);

  if (!context) {
    return null;
  }

  const SourceIcon = sourceInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1.5 px-2.5 py-1 cursor-help ${sourceInfo.color}`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="font-medium">{context.tenant.name}</span>
            <span className="opacity-60">•</span>
            <SourceIcon className="h-3 w-3 opacity-70" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1.5 text-xs">
            <div className="font-semibold border-b pb-1 mb-1.5">Tenant Context</div>
            <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{context.tenant.name}</span>
              
              <span className="text-muted-foreground">Slug:</span>
              <span className="font-mono text-xs">{context.tenant.slug}</span>
              
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono text-xs">{context.tenant_id}</span>
              
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-primary">{sourceInfo.source}</span>
              
              {context.user_role && (
                <>
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium">{context.user_role}</span>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
