import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Building2, Search, Bookmark, Settings, CheckSquare } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/modules/core/user";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useIsPlatformTenant } from "@/hooks/useIsPlatformTenant";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface HeaderProps {
  userName?: string;
  userEmail?: string;
}

const Header = ({ userName, userEmail }: HeaderProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useCurrentUser();
  const { isPlatformAdmin } = usePlatformAdmin();
  const { isPlatformTenant } = useIsPlatformTenant();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Du er nå logget ut");
    navigate("/auth");
  };

  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Global sidebar trigger shown only for platform admins */}
          {isPlatformAdmin && <SidebarTrigger className="mr-1" />}
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">IT-Anskaffelse</h1>
              {isPlatformTenant && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  Platform
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Anskaffelsesstyring</p>
          </div>
        </div>
        {isPlatformAdmin && (
          <Button variant="outline" className="mr-2 hidden sm:inline-flex" onClick={() => navigate("/admin")}>
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/dashboard")}>
              <Building2 className="mr-2 h-4 w-4" />
              <span>Prosjekter</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/company-search")}>
              <Search className="mr-2 h-4 w-4" />
              <span>Bedriftssøk</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/saved-companies")}>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>Lagrede bedrifter</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/tasks")}>
              <CheckSquare className="mr-2 h-4 w-4" />
              <span>Oppgaver</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            {isPlatformAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Admin Dashboard</span>
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/questions")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Administrer spørsmål</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/admin/users")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Brukeradministrasjon</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logg ut</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
