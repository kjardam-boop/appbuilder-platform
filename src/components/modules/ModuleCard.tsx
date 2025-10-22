import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  category: "Core" | "Addon" | "Custom";
  status: "Active" | "Available" | "Coming Soon";
}

export const ModuleCard = ({ title, description, icon: Icon, category, status }: ModuleCardProps) => {
  const categoryColors = {
    Core: "bg-primary/10 text-primary border-primary/20",
    Addon: "bg-accent/10 text-accent border-accent/20",
    Custom: "bg-secondary text-secondary-foreground border-border",
  };

  const statusColors = {
    Active: "bg-primary text-primary-foreground",
    Available: "bg-muted text-muted-foreground",
    "Coming Soon": "bg-accent/20 text-accent-foreground",
  };

  return (
    <Card className="shadow-card hover:shadow-elevated transition-all group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-all">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <Badge variant="outline" className={categoryColors[category]}>
            {category}
          </Badge>
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge className={statusColors[status]}>{status}</Badge>
          <Button variant="ghost" size="sm">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
