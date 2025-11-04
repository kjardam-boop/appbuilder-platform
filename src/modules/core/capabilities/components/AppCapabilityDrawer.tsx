/**
 * App Capability Drawer
 * Shows detailed information about a capability
 */

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Capability } from "../types/capability.types";
import { ExternalLink, Package, Tag } from "lucide-react";
import * as Icons from "lucide-react";
import { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppCapabilityService } from "../services/appCapabilityService";
import { Link } from "react-router-dom";

interface AppCapabilityDrawerProps {
  capability: Capability | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppCapabilityDrawer({
  capability,
  open,
  onOpenChange,
}: AppCapabilityDrawerProps) {
  const Icon = (capability?.icon_name && Icons[capability.icon_name as keyof typeof Icons]) as LucideIcon || Icons.Box;

  const { data: apps } = useQuery({
    queryKey: ["capability-apps", capability?.id],
    queryFn: () => capability ? AppCapabilityService.getAppsUsingCapability(capability.id) : Promise.resolve([]),
    enabled: !!capability && capability.scope === "platform",
  });

  if (!capability) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-2xl">{capability.name}</SheetTitle>
              <SheetDescription className="text-sm mt-1">
                v{capability.current_version} • {capability.key}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{capability.category}</Badge>
            <Badge variant={capability.scope === "platform" ? "default" : "outline"}>
              {capability.scope === "platform" ? "Platform" : "App-Specific"}
            </Badge>
            {!capability.is_active && (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </div>

          {/* Description */}
          {capability.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{capability.description}</p>
            </div>
          )}

          {/* Pricing */}
          {capability.price_per_month !== null && (
            <div>
              <h3 className="font-semibold mb-2">Pricing</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{capability.price_per_month} NOK</span>
                <span className="text-muted-foreground">per month</span>
              </div>
            </div>
          )}

          {/* Development Estimate */}
          {capability.estimated_dev_hours !== null && capability.estimated_dev_hours > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Development Estimate</h3>
              <p className="text-sm text-muted-foreground">
                {capability.estimated_dev_hours} hours
              </p>
            </div>
          )}

          {/* Tags */}
          {capability.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {capability.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {capability.dependencies.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Dependencies
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                {capability.dependencies.map((dep) => (
                  <li key={dep}>• {dep}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Usage */}
          {capability.scope === "platform" && apps && apps.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Used by {apps.length} app(s)</h3>
              <div className="space-y-2">
                {apps.map((app) => (
                  <Link
                    key={app.id}
                    to={`/admin/apps/${app.key}`}
                    className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.key}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex gap-2">
            {capability.documentation_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={capability.documentation_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Documentation
                </a>
              </Button>
            )}
            {capability.demo_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={capability.demo_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Demo
                </a>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/capabilities/${capability.id}`}>
                View Full Details
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
