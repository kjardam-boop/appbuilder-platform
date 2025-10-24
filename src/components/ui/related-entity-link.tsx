import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelatedEntityLinkProps {
  entityType: "company" | "project" | "opportunity" | "supplier";
  entityId: string;
  entityName: string;
  className?: string;
}

export const RelatedEntityLink = ({
  entityType,
  entityId,
  entityName,
  className,
}: RelatedEntityLinkProps) => {
  const getEntityPath = () => {
    switch (entityType) {
      case "company":
        return `/companies/${entityId}`;
      case "project":
        return `/projects/${entityId}`;
      case "opportunity":
        return `/opportunities/${entityId}`;
      case "supplier":
        return `/suppliers/${entityId}`;
      default:
        return "#";
    }
  };

  return (
    <Link
      to={getEntityPath()}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline",
        className
      )}
    >
      {entityName}
      <ExternalLink className="h-3 w-3" />
    </Link>
  );
};
