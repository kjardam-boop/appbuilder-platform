import { useState } from "react";
import { useExternalSystems, APP_TYPES } from "@/modules/core/applications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Database, Search, Server, Building2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ApplicationsPage() {
  const [query, setQuery] = useState("");
  const [appType, setAppType] = useState<string>("all");
  const [status, setStatus] = useState<string>("Active");
  
  const { data, isLoading } = useExternalSystems({ 
    query, 
    appType: appType === "all" ? undefined : appType,
    status 
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Applikasjoner
          </h1>
          <p className="text-muted-foreground">
            Oversikt over forretningssystemer og applikasjoner
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/applications/new">
            <Plus className="mr-2 h-4 w-4" />
            Legg til ny applikasjon
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Søk og filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Søk etter navn, leverandør eller modul..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={appType} onValueChange={setAppType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Applikasjonstype" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle typer</SelectItem>
                {Object.entries(APP_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Aktiv</SelectItem>
                <SelectItem value="Legacy">Legacy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Laster applikasjoner...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((product) => (
            <Link key={product.id} to={`/external-systems/${product.id}`}>
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
                  {product.app_types && product.app_types.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.app_types.map((type) => (
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

                  {/* NEW: Capabilities */}
                  {product.capabilities && product.capabilities.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Capabilities</p>
                      <div className="flex flex-wrap gap-1">
                        {product.capabilities.map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NEW: MCP Reference */}
                  {product.mcp_reference && (
                    <div className="text-xs">
                      <span className="font-medium">MCP:</span>{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">{product.mcp_reference}</code>
                    </div>
                  )}

                  {/* NEW: Integration Providers */}
                  {product.integration_providers && Object.keys(product.integration_providers).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Integration Support</p>
                      <div className="flex gap-2">
                        {product.integration_providers.n8n && <Badge variant="secondary" className="text-xs">n8n</Badge>}
                        {product.integration_providers.pipedream && <Badge variant="secondary" className="text-xs">Pipedream</Badge>}
                        {product.integration_providers.zapier && <Badge variant="secondary" className="text-xs">Zapier</Badge>}
                      </div>
                    </div>
                  )}

                  {/* NEW: Use Cases */}
                  {product.use_cases && product.use_cases.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Use Cases</p>
                      <ul className="text-xs space-y-1">
                        {product.use_cases.slice(0, 2).map((uc) => (
                          <li key={uc.key}>• {uc.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ingen applikasjoner funnet
          </CardContent>
        </Card>
      )}
    </div>
  );
}
