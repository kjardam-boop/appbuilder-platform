import { Button } from "@/components/ui/button";
import { Building2, Menu } from "lucide-react";
import { Link } from "react-router-dom";

export const Header = () => {
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
          <Link to="/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Dashboard
          </Link>
          <Link to="/modules" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Modules
          </Link>
          <Link to="/tenants" className="text-sm font-medium text-foreground/80 hover:text-foreground transition-smooth">
            Tenants
          </Link>
          <Button variant="hero" size="sm">Get Started</Button>
        </nav>
        
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
