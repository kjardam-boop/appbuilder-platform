import { useEffect, useState } from "react";
import { UserService } from "../services/userService";
import { AuthUser, UserRole, USER_ROLES } from "../types/user.types";
import { UserRoleBadge } from "./UserRoleBadge";
import { CompanyAccessManager } from "./CompanyAccessManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Plus, X, Shield, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserList() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UserService.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Kunne ikke laste brukere');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async (userId: string, role: UserRole) => {
    try {
      await UserService.addRole(userId, role);
      toast.success('Rolle lagt til');
      await loadUsers();
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Kunne ikke legge til rolle');
    }
  };

  const handleRemoveRole = async (userId: string, role: UserRole) => {
    try {
      await UserService.removeRole(userId, role);
      toast.success('Rolle fjernet');
      await loadUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Kunne ikke fjerne rolle');
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
        {users.map((user) => (
          <Card key={user.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {user.profile?.full_name || 'Ukjent navn'}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="roles" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="roles">
                    <Shield className="h-4 w-4 mr-2" />
                    Globale roller
                  </TabsTrigger>
                  <TabsTrigger value="companies">
                    <Building2 className="h-4 w-4 mr-2" />
                    Selskapstilgang
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="space-y-4 mt-4">
                  {/* Current Roles */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">Tildelte roller</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">Ingen roller</Badge>
                      ) : (
                        user.roles.map((role) => (
                          <div key={role} className="flex items-center gap-1">
                            <UserRoleBadge role={role} size="sm" />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleRemoveRole(user.id, role)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add New Role */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedUserId === user.id ? selectedRole : ""}
                      onValueChange={(value) => {
                        setSelectedUserId(user.id);
                        setSelectedRole(value as UserRole);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Velg rolle..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(USER_ROLES).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedRole && selectedUserId === user.id) {
                          handleAddRole(user.id, selectedRole);
                          setSelectedRole("");
                          setSelectedUserId("");
                        }
                      }}
                      disabled={!selectedRole || selectedUserId !== user.id}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Legg til rolle
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="companies" className="mt-4">
                  <CompanyAccessManager userId={user.id} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
