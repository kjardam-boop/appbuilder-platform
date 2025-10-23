// @ts-nocheck
import { useCurrentUser } from "@/modules/core/user";
import { UserList } from "@/modules/core/user";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";
import Header from "@/components/Dashboard/Header";

const UserManagement = () => {
  const { currentUser, loading, isAdmin } = useCurrentUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <Header />
        <div className="w-full px-4 lg:px-6 xl:px-8 py-8">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Du har ikke tilgang til denne siden. Kun administratorer kan administrere brukere.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <Header />
      
      <div className="w-full px-4 lg:px-6 xl:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Brukeradministrasjon</h1>
          <p className="text-muted-foreground">
            Administrer brukere, roller og tilganger i systemet
          </p>
        </div>

        <UserList />
      </div>
    </div>
  );
};

export default UserManagement;
