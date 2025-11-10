import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink, Plug } from "lucide-react";
import type { IntegrationDefinitionWithRelations } from "@/modules/core/integrations/types/integrationDefinition.types";

interface InstallIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: IntegrationDefinitionWithRelations;
  onInstall: () => void;
  isLoading?: boolean;
}

export function InstallIntegrationDialog({
  open,
  onOpenChange,
  definition,
  onInstall,
  isLoading = false,
}: InstallIntegrationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Plug className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Installer {definition.name}</DialogTitle>
              {definition.vendor_name && (
                <p className="text-sm text-muted-foreground">av {definition.vendor_name}</p>
              )}
            </div>
          </div>
          <DialogDescription>
            {definition.description || "Denne integrasjonen vil bli tilgjengelig for dette selskapet."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Category */}
          {definition.category_name && (
            <div>
              <h4 className="text-sm font-medium mb-2">Kategori</h4>
              <Badge variant="outline">{definition.category_name}</Badge>
            </div>
          )}

          {/* Delivery Methods */}
          {definition.supported_delivery_methods && definition.supported_delivery_methods.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Leveringsmetoder</h4>
              <div className="flex flex-wrap gap-2">
                {definition.supported_delivery_methods.map((method) => (
                  <Badge key={method} variant="secondary" className="text-xs">
                    {method}
                    {method === definition.default_delivery_method && (
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {definition.default_delivery_method && (
                <p className="text-xs text-muted-foreground mt-2">
                  Standard: {definition.default_delivery_method}
                </p>
              )}
            </div>
          )}

          {/* Requires Credentials */}
          {definition.requires_credentials && (
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">
                ⚠️ Denne integrasjonen krever credentials. Du må konfigurere API-nøkler etter installasjon.
              </p>
            </div>
          )}

          {/* Tags */}
          {definition.tags && definition.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {definition.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Documentation */}
          {(definition.documentation_url || definition.setup_guide_url) && (
            <div>
              <h4 className="text-sm font-medium mb-2">Dokumentasjon</h4>
              <div className="flex flex-col gap-2">
                {definition.documentation_url && (
                  <a
                    href={definition.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    API Dokumentasjon
                  </a>
                )}
                {definition.setup_guide_url && (
                  <a
                    href={definition.setup_guide_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Setup Guide
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Avbryt
          </Button>
          <Button onClick={onInstall} disabled={isLoading}>
            {isLoading ? "Installerer..." : "Installer nå"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
