import { Badge } from "@/components/ui/badge";
import { UserRole, USER_ROLES } from "../types/user.types";
import { Shield, User, Crown } from "lucide-react";

interface UserRoleBadgeProps {
  role: UserRole;
  size?: "sm" | "md" | "lg";
}

export function UserRoleBadge({ role, size = "md" }: UserRoleBadgeProps) {
  const getIcon = () => {
    switch (role) {
      case 'admin':
        return <Crown className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      case 'moderator':
        return <Shield className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
      default:
        return <User className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />;
    }
  };

  const getVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'admin':
        return "destructive";
      case 'moderator':
        return "default";
      default:
        return "secondary";
    }
  };

  return (
    <Badge variant={getVariant()} className="gap-1">
      {getIcon()}
      <span>{USER_ROLES[role]}</span>
    </Badge>
  );
}
