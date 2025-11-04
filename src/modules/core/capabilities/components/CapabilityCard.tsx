/**
 * Capability Card Component
 * Displays a single capability in the catalog
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Capability } from "../types/capability.types";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { Building2 } from "lucide-react";

interface CapabilityCardProps {
  capability: Capability;
  onSelect?: (capability: Capability) => void;
  isSelected?: boolean;
  showPrice?: boolean;
  onClick?: () => void;
}

export function CapabilityCard({
  capability,
  onSelect,
  isSelected,
  showPrice = true,
  onClick,
}: CapabilityCardProps) {
  const Icon = (capability.icon_name && Icons[capability.icon_name as keyof typeof Icons]) as LucideIcon || Icons.Box;

  return (
    <Card 
      className={`${isSelected ? "border-primary" : ""} ${onClick ? "cursor-pointer hover:border-primary/50 transition-colors" : ""}`}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{capability.name}</CardTitle>
              <CardDescription className="text-xs mt-1">
                v{capability.current_version}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <Badge variant="secondary">{capability.category}</Badge>
            {capability.scope === "app-specific" && (
              <Badge variant="outline" className="text-xs">App-Specific</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {capability.description || "No description available"}
        </p>

        {/* Usage count for platform capabilities */}
        {capability.scope === "platform" && capability.usage_count !== undefined && capability.usage_count > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>Used by {capability.usage_count} app(s)</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1">
          {capability.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {capability.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{capability.tags.length - 3}
            </Badge>
          )}
        </div>

        {showPrice && capability.price_per_month !== null && (
          <div className="flex items-baseline gap-1 text-sm">
            <span className="text-lg font-semibold">{capability.price_per_month} NOK</span>
            <span className="text-muted-foreground">/ måned</span>
          </div>
        )}

        {capability.estimated_dev_hours !== null && capability.estimated_dev_hours > 0 && (
          <p className="text-xs text-muted-foreground">
            Estimert utvikling: {capability.estimated_dev_hours} timer
          </p>
        )}

        {onSelect && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(capability);
            }}
            variant={isSelected ? "secondary" : "default"}
            className="w-full"
            size="sm"
          >
            {isSelected ? "Valgt" : "Velg"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
