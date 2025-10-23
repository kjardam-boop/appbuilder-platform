import { useState } from "react";
import { useErpSystems } from "@/modules/erpsystem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Database, Search, Server, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ERPSystemsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("Active");
  
  const { data, isLoading } = useErpSystems({ query, status });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            ERP-systemer
          </h1>
          <p className="text-muted-foreground">
            Oversikt over tilgjengelige ERP-systemer i markedet
          </p>
        </div>
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
          Laster ERP-systemer...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.data.map((system) => (
            <Link key={system.id} to={`/erp-systems/${system.id}`}>
              <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        {system.name}
                      </CardTitle>
                      {system.short_name && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {system.short_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={system.status === "Active" ? "default" : "secondary"}>
                      {system.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {system.vendor && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{system.vendor.name}</span>
                    </div>
                  )}
                  
                  {system.deployment_model && system.deployment_model.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {system.deployment_model.map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {system.market_segment && system.market_segment.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {system.market_segment.map((segment) => (
                        <Badge key={segment} variant="secondary" className="text-xs">
                          {segment}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {system.localizations && system.localizations.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Lokaliseringer: {system.localizations.slice(0, 3).join(", ")}
                      {system.localizations.length > 3 && ` +${system.localizations.length - 3}`}
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
            Ingen ERP-systemer funnet
          </CardContent>
        </Card>
      )}
    </div>
  );
}