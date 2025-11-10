import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserPermissions } from "@/modules/core/permissions/hooks/useUserPermissions";
import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PermissionProtectedRouteProps {
  children: ReactNode;
  resource?: string;
  action?: string;
}

/**
 * Route protection component based on permissions
 * 
 * Checks if user has required permission (resource + action).
 * If no resource/action specified, allows access to any user with admin panel access.
 */
export const PermissionProtectedRoute = ({ 
  children, 
  resource, 
  action 
}: PermissionProtectedRouteProps) => {
  const { data: permissions, isLoading } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If no resource required, allow access (dashboard page)
  if (!resource) {
    return <>{children}</>;
  }

  // Check if user has required permission
  const hasAccess = permissions?.some(
    p => p.resource_key === resource &&
         (p.action_key === action || p.action_key === 'admin')
  ) ?? false;

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Du har ikke tilgang til denne siden. Mangler tillatelse: {resource}:{action}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};
