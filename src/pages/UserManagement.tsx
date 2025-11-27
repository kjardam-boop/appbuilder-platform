import { useCurrentUser } from "@/modules/core/user";
import { UserList } from "@/modules/core/user";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";

const UserManagement = () => {
  const { currentUser, loading, isAdmin } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Du har ikke tilgang til denne siden. Kun administratorer kan administrere brukere.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <AppBreadcrumbs levels={[
        { label: "Admin", href: "/admin" },
        { label: "Brukeradministrasjon" }
      ]} />
      
      <div>
        <h1 className="text-3xl font-bold mb-2">Brukeradministrasjon</h1>
        <p className="text-muted-foreground">
          Administrer brukere, roller og tilganger i systemet
        </p>
      </div>

      <UserList />
    </div>
  );
};

export default UserManagement;
