/**
 * Create New App Definition
 * Form for registering a new Platform App from manifest
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Package } from "lucide-react";
import { ManifestLoader } from "@/modules/core/applications/services/manifestLoader";
import type { AppManifest } from "@/modules/core/applications/types/manifest.types";

export default function AppDefinitionCreate() {
  const navigate = useNavigate();
  const [manifest, setManifest] = useState<Partial<AppManifest>>({
    key: "",
    name: "",
    version: "1.0.0",
    domain_tables: [],
    shared_tables: [],
    hooks: [],
    ui_components: [],
    capabilities: [],
  });
  const [newTable, setNewTable] = useState("");
  const [newSharedTable, setNewSharedTable] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manifest.key || !manifest.name || !manifest.domain_tables?.length) {
      toast.error("Fyll ut alle påkrevde felter");
      return;
    }

    try {
      setLoading(true);
      await ManifestLoader.registerFromManifest(manifest as AppManifest);
      toast.success("App definition opprettet");
      navigate("/admin/apps");
    } catch (error: any) {
      console.error("Error creating app definition:", error);
      toast.error(error.message || "Kunne ikke opprette app definition");
    } finally {
      setLoading(false);
    }
  };

  const addTable = () => {
    if (newTable && !manifest.domain_tables?.includes(newTable)) {
      setManifest({
        ...manifest,
        domain_tables: [...(manifest.domain_tables || []), newTable],
      });
      setNewTable("");
    }
  };

  const removeTable = (table: string) => {
    setManifest({
      ...manifest,
      domain_tables: manifest.domain_tables?.filter(t => t !== table),
    });
  };

  const addSharedTable = () => {
    if (newSharedTable && !manifest.shared_tables?.includes(newSharedTable)) {
      setManifest({
        ...manifest,
        shared_tables: [...(manifest.shared_tables || []), newSharedTable],
      });
      setNewSharedTable("");
    }
  };

  const removeSharedTable = (table: string) => {
    setManifest({
      ...manifest,
      shared_tables: manifest.shared_tables?.filter(t => t !== table),
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/apps")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Registrer ny Platform App</h1>
          <p className="text-muted-foreground mt-1">
            Opprett app definition fra manifest
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grunnleggende informasjon</CardTitle>
            <CardDescription>App nøkkel, navn og versjon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="key">
                  App Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="key"
                  placeholder="jul25"
                  pattern="^[a-z0-9-]+$"
                  value={manifest.key}
                  onChange={(e) => setManifest({ ...manifest, key: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Kun små bokstaver, tall og bindestreker
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  App Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Julefest 2025"
                  value={manifest.name}
                  onChange={(e) => setManifest({ ...manifest, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">
                Version <span className="text-destructive">*</span>
              </Label>
              <Input
                id="version"
                placeholder="1.0.0"
                pattern="^\d+\.\d+\.\d+$"
                value={manifest.version}
                onChange={(e) => setManifest({ ...manifest, version: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Semantic versioning (major.minor.patch)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain Tables</CardTitle>
            <CardDescription>
              Tabeller som eies av denne appen <span className="text-destructive">*</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="jul25_families"
                value={newTable}
                onChange={(e) => setNewTable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTable();
                  }
                }}
              />
              <Button type="button" onClick={addTable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {manifest.domain_tables && manifest.domain_tables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manifest.domain_tables.map((table) => (
                  <Badge key={table} variant="default" className="gap-2">
                    <span className="font-mono">{table}</span>
                    <button
                      type="button"
                      onClick={() => removeTable(table)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shared Tables</CardTitle>
            <CardDescription>
              Tabeller som deles med andre apps (valgfritt)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="companies"
                value={newSharedTable}
                onChange={(e) => setNewSharedTable(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSharedTable();
                  }
                }}
              />
              <Button type="button" onClick={addSharedTable}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {manifest.shared_tables && manifest.shared_tables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manifest.shared_tables.map((table) => (
                  <Badge key={table} variant="secondary" className="gap-2">
                    <span className="font-mono">{table}</span>
                    <button
                      type="button"
                      onClick={() => removeSharedTable(table)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/admin/apps")}
          >
            Avbryt
          </Button>
          <Button type="submit" disabled={loading}>
            <Package className="mr-2 h-4 w-4" />
            {loading ? "Oppretter..." : "Opprett App"}
          </Button>
        </div>
      </form>
    </div>
  );
}
