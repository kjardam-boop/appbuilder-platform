/**
 * App Preview Page
 * 
 * Preview a generated application with its selected capabilities.
 * Used from the App Wizard (Step 6) or App Projects list.
 * 
 * URL: /admin/apps/preview/:appId
 */

import { useParams, useNavigate } from "react-router-dom";
import { useTenantContext } from "@/hooks/useTenantContext";
import { AppShell } from "@/modules/core/capabilities/runtime";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Rocket } from "lucide-react";
import { toast } from "sonner";

export default function AppPreview() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const tenantContext = useTenantContext();

  if (!appId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">No App ID Provided</h2>
          <p className="text-muted-foreground">
            Please select an app to preview from the App Projects list.
          </p>
          <Button onClick={() => navigate("/admin/apps/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!tenantContext?.tenant_id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">
            Resolving tenant context...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Preview toolbar */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/admin/apps/projects")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Exit Preview
            </Button>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              Preview Mode
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </Button>
            <Button 
              size="sm"
              onClick={() => {
                toast.success("App deployed to preview environment!");
              }}
            >
              <Rocket className="mr-2 h-4 w-4" />
              Deploy
            </Button>
          </div>
        </div>
      </div>

      {/* App Shell */}
      <div className="flex-1">
        <AppShell
          appId={appId}
          tenantId={tenantContext.tenant_id}
          userId={tenantContext.user_id || undefined}
          locale="nb-NO"
          onAction={(capKey, action, payload) => {
            console.log(`[Preview] Action from ${capKey}:`, action, payload);
            toast.info(`Action: ${action} from ${capKey}`);
          }}
          onError={(capKey, error) => {
            console.error(`[Preview] Error in ${capKey}:`, error);
            toast.error(`Error in ${capKey}: ${error.message}`);
          }}
          onAppLoaded={(config) => {
            console.log("[Preview] App loaded:", config);
          }}
        />
      </div>
    </div>
  );
}

