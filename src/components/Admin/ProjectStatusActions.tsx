import { Button } from "@/components/ui/button";
import { Globe, Eye, CheckCircle, Loader2 } from "lucide-react";
import { useUpdateProjectStatus } from "@/hooks/useCustomerAppProjects";

interface ProjectStatusActionsProps {
  projectId: string;
  projectName: string;
  currentStatus: string;
  subdomain: string | null;
  tenantId: string;
  deployedToPreviewAt: string | null;
  deployedToProductionAt: string | null;
  onStatusChange?: () => void;
}

export const ProjectStatusActions = ({
  projectId,
  projectName,
  currentStatus,
  subdomain,
  tenantId,
  deployedToPreviewAt,
  deployedToProductionAt,
  onStatusChange,
}: ProjectStatusActionsProps) => {
  const updateStatus = useUpdateProjectStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (!subdomain && (newStatus === 'preview' || newStatus === 'production')) {
      return; // Subdomain required
    }

    await updateStatus.mutateAsync({
      projectId,
      newStatus,
      tenantId,
    });

    onStatusChange?.();
  };

  // Draft → Preview
  if (currentStatus === 'draft' && !deployedToPreviewAt) {
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => handleStatusChange('preview')}
        disabled={!subdomain || updateStatus.isPending}
      >
        {updateStatus.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Eye className="h-4 w-4 mr-2" />
        )}
        Deploy til Preview
      </Button>
    );
  }

  // Preview → Production
  if ((currentStatus === 'preview' || deployedToPreviewAt) && !deployedToProductionAt) {
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => handleStatusChange('production')}
        disabled={!subdomain || updateStatus.isPending}
      >
        {updateStatus.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Globe className="h-4 w-4 mr-2" />
        )}
        Deploy til Production
      </Button>
    );
  }

  // Production → Deployed (migrates to applications)
  if (currentStatus === 'production' && deployedToProductionAt) {
    return (
      <Button
        size="sm"
        variant="default"
        onClick={() => handleStatusChange('production')}
        disabled={updateStatus.isPending}
      >
        {updateStatus.isPending ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <CheckCircle className="h-4 w-4 mr-2" />
        )}
        Aktiver App
      </Button>
    );
  }

  return null;
};
