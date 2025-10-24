import { Button } from "@/components/ui/button";
import { Building2, Menu, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { toast } from "sonner";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleAuth = () => {
    if (user) {
      handleSignOut();
    } else {
      navigate("/auth");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Du er nå logget ut");
      navigate("/");
    } catch (error) {
      toast.error("Feil ved utlogging");
    }
  };

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Lovable Meta-Platform
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                Dashboard
              </Link>
              <Link to="/modules" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                Modules
              </Link>
              <Link to="/tenants" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
                Tenants
              </Link>
            </>
          )}
          
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
            )}
            <Button variant="hero" size="sm" onClick={handleAuth}>
              {user ? (
                <>
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        </nav>
        
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
