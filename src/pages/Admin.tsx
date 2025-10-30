import { Outlet } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import Header from "@/components/Dashboard/Header";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";


// admin navigation items moved to AppAdminSidebar component

// Sidebar component extracted to src/components/admin/AppAdminSidebar.tsx

export default function Admin() {
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();
  const { user } = useAuth();

  console.log('Admin page - isPlatformAdmin:', isPlatformAdmin, 'isLoading:', isLoading, 'user:', user?.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. You need platform administrator privileges to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        userEmail={user?.email}
      />
      <div className="container mx-auto p-6 space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
