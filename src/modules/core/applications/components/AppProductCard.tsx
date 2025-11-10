import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ExternalSystem } from "../types/application.types";
import { APP_TYPES } from "../types/application.types";

interface AppProductCardProps {
  product: ExternalSystem & { vendor?: { name: string } };
}

export const AppProductCard = ({ product }: AppProductCardProps) => {
  return (
    <Link to={`/applications/${product.id}`}>
      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5" />
                {product.name}
              </CardTitle>
              {product.short_name && (
                <p className="text-sm text-muted-foreground mt-1">
                  {product.short_name}
                </p>
              )}
            </div>
            <Badge variant={product.status === "Active" ? "default" : "secondary"}>
              {product.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {(product.system_types || product.app_types) && (product.system_types || product.app_types)!.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(product.system_types || product.app_types)!.map((type) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {APP_TYPES[type as any] || type}
                </Badge>
              ))}
            </div>
          )}
          
          {product.vendor && (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{product.vendor.name}</span>
            </div>
          )}
          
          {product.deployment_models && product.deployment_models.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.deployment_models.map((model) => (
                <Badge key={model} variant="outline" className="text-xs">
                  {model}
                </Badge>
              ))}
            </div>
          )}

          {product.market_segments && product.market_segments.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.market_segments.map((segment) => (
                <Badge key={segment} variant="secondary" className="text-xs">
                  {segment}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};
