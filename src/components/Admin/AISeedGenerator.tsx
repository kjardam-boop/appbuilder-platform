/**
 * AI-Powered Seed Data Generator Component
 * 
 * Allows users to generate seed data for external systems using AI.
 * Supports preview before insertion and filtering by category/region.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Database,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  AISeedService,
  AISeedResult,
  SEED_CATEGORIES,
  SEED_REGIONS,
  type SeedCategory,
  type SeedRegion,
} from "@/modules/core/applications/services/aiSeedService";
import { seedApplicationsFromData } from "@/modules/core/applications/services/seedApplications";

interface AISeedGeneratorProps {
  onSeedComplete?: () => void;
}

export function AISeedGenerator({ onSeedComplete }: AISeedGeneratorProps) {
  // Form state
  const [category, setCategory] = useState<SeedCategory>("ERP");
  const [region, setRegion] = useState<SeedRegion>("Nordic");
  const [count, setCount] = useState(10);
  const [includeNiche, setIncludeNiche] = useState(false);
  const [excludeExisting, setExcludeExisting] = useState(true);

  // Preview state
  const [previewData, setPreviewData] = useState<AISeedResult | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set());

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await AISeedService.generate({
        category,
        region,
        count,
        includeNiche,
        excludeExisting,
      });

      // Filter existing if requested
      if (excludeExisting) {
        const existingSlugs = await AISeedService.getExistingSlugs();
        return AISeedService.filterExisting(result, existingSlugs);
      }

      return result;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      // Select all by default
      setSelectedSystems(new Set(data.systems.map(s => s.slug)));
      toast.success(`Generated ${data.systems.length} systems!`);
    },
    onError: (error: Error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  // Insert mutation
  const insertMutation = useMutation({
    mutationFn: async () => {
      if (!previewData) throw new Error("No data to insert");

      // Filter to selected systems only
      const filteredResult = {
        ...previewData,
        systems: previewData.systems.filter(s => selectedSystems.has(s.slug)),
        vendors: previewData.vendors.filter(v => 
          previewData.systems
            .filter(s => selectedSystems.has(s.slug))
            .some(s => s.vendor_name === v.name)
        ),
      };

      const seedData = AISeedService.toSeedFormat(filteredResult);
      await seedApplicationsFromData(seedData);
      
      return filteredResult.systems.length;
    },
    onSuccess: (count) => {
      toast.success(`Inserted ${count} systems!`);
      setPreviewData(null);
      setSelectedSystems(new Set());
      onSeedComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Insert failed: ${error.message}`);
    },
  });

  const toggleSystem = (slug: string) => {
    setSelectedSystems(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (previewData) {
      setSelectedSystems(new Set(previewData.systems.map(s => s.slug)));
    }
  };

  const selectNone = () => {
    setSelectedSystems(new Set());
  };

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Seed Data with AI
        </CardTitle>
        <CardDescription>
          Use AI to research and generate real-world external system data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as SeedCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex flex-col">
                      <span>{cat.label}</span>
                      <span className="text-xs text-muted-foreground">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={region} onValueChange={(v) => setRegion(v as SeedRegion)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEED_REGIONS.map(reg => (
                  <SelectItem key={reg.value} value={reg.value}>
                    {reg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Systems</Label>
            <Input
              type="number"
              min={1}
              max={25}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
            />
          </div>

          <div className="space-y-3 pt-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeNiche"
                checked={includeNiche}
                onCheckedChange={(v) => setIncludeNiche(v === true)}
              />
              <Label htmlFor="includeNiche" className="text-sm">
                Include niche vendors
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="excludeExisting"
                checked={excludeExisting}
                onCheckedChange={(v) => setExcludeExisting(v === true)}
              />
              <Label htmlFor="excludeExisting" className="text-sm">
                Skip existing systems
              </Label>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="w-full"
          size="lg"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {count} {category} Systems
            </>
          )}
        </Button>

        {/* Preview Section */}
        {previewData && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Preview</span>
                <Badge variant="secondary">
                  {selectedSystems.size} / {previewData.systems.length} selected
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreviewData(null);
                    setSelectedSystems(new Set());
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Discard
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <Alert>
              <AlertDescription className="flex flex-wrap gap-4 text-sm">
                <span>Category: <strong>{previewData.metadata.category}</strong></span>
                <span>Region: <strong>{previewData.metadata.region}</strong></span>
                <span>Model: <strong>{previewData.metadata.ai_model}</strong></span>
                <span>Generated: <strong>{new Date(previewData.metadata.generated_at).toLocaleString()}</strong></span>
              </AlertDescription>
            </Alert>

            {/* Systems List */}
            <Accordion type="multiple" className="w-full">
              {previewData.systems.map((system) => (
                <AccordionItem key={system.slug} value={system.slug}>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSystems.has(system.slug)}
                      onCheckedChange={() => toggleSystem(system.slug)}
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{system.name}</span>
                        <Badge variant="outline">{system.vendor_name}</Badge>
                        {system.deployment_models.map(dm => (
                          <Badge key={dm} variant="secondary" className="text-xs">
                            {dm}
                          </Badge>
                        ))}
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent>
                    <div className="pl-8 space-y-2 text-sm">
                      <p className="text-muted-foreground">{system.description}</p>
                      <div className="flex flex-wrap gap-2">
                        <span><strong>Industries:</strong> {system.target_industries.join(", ")}</span>
                        <span><strong>Segments:</strong> {system.market_segments.join(", ")}</span>
                        <span><strong>Pricing:</strong> {system.pricing_model}</span>
                      </div>
                      {system.key_features && (
                        <div>
                          <strong>Key Features:</strong>
                          <ul className="list-disc list-inside ml-2">
                            {system.key_features.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {system.editions && system.editions.length > 0 && (
                        <div>
                          <strong>Editions:</strong> {system.editions.map(e => e.name).join(", ")}
                        </div>
                      )}
                      {system.website && (
                        <a
                          href={system.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary flex items-center gap-1 hover:underline"
                        >
                          {system.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Insert Button */}
            <Button
              onClick={() => insertMutation.mutate()}
              disabled={insertMutation.isPending || selectedSystems.size === 0}
              className="w-full"
              variant="default"
            >
              {insertMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inserting...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Insert {selectedSystems.size} Systems
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

