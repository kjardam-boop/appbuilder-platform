/**
 * CapabilityTestSandbox
 * 
 * Test sandbox for capabilities with config editor and capability-specific testers.
 * Uses platform defaults from config_schema, allows temporary overrides for testing.
 */

import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { 
  FlaskConical, 
  Settings2, 
  ChevronDown, 
  Save,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Capability } from '../types/capability.types';
import { OCRCapabilityTester } from './testers/OCRCapabilityTester';

interface CapabilityTestSandboxProps {
  capability: Capability;
  onDefaultsSaved?: () => void;
}

interface ConfigSchema {
  type: string;
  properties: Record<string, ConfigProperty>;
}

interface ConfigProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: { type: string };
}

// Extract defaults from config_schema
function getDefaultsFromSchema(schema: ConfigSchema | null): Record<string, unknown> {
  if (!schema?.properties) return {};
  
  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.default !== undefined) {
      defaults[key] = prop.default;
    }
  }
  return defaults;
}

export function CapabilityTestSandbox({ capability, onDefaultsSaved }: CapabilityTestSandboxProps) {
  const schema = capability.config_schema as ConfigSchema | null;
  const defaultConfig = useMemo(() => getDefaultsFromSchema(schema), [schema]);
  
  const [testConfig, setTestConfig] = useState<Record<string, unknown>>(defaultConfig);
  const [configOpen, setConfigOpen] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(false);

  // Mutation to save new defaults
  const saveDefaultsMutation = useMutation({
    mutationFn: async (newDefaults: Record<string, unknown>) => {
      if (!schema) throw new Error('No config schema');
      
      // Update defaults in config_schema
      const updatedSchema = { ...schema };
      for (const [key, value] of Object.entries(newDefaults)) {
        if (updatedSchema.properties[key]) {
          updatedSchema.properties[key] = {
            ...updatedSchema.properties[key],
            default: value,
          };
        }
      }
      
      const { error } = await supabase
        .from('capabilities')
        .update({ config_schema: updatedSchema })
        .eq('id', capability.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Platform defaults oppdatert');
      onDefaultsSaved?.();
    },
    onError: (error) => {
      toast.error('Kunne ikke lagre defaults', { description: error.message });
    },
  });

  const handleConfigChange = (key: string, value: unknown) => {
    setTestConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setTestConfig(defaultConfig);
    toast.info('Konfigurasjon tilbakestilt til defaults');
  };

  const handleSaveDefaults = () => {
    saveDefaultsMutation.mutate(testConfig);
  };

  // Render config field based on schema type
  const renderConfigField = (key: string, prop: ConfigProperty) => {
    const value = testConfig[key];
    const id = `config-${key}`;

    // Enum/Select
    if (prop.enum) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={id}>{prop.title || key}</Label>
          <Select
            value={String(value || prop.default || '')}
            onValueChange={(v) => handleConfigChange(key, v)}
          >
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {prop.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {prop.description && (
            <p className="text-xs text-muted-foreground">{prop.description}</p>
          )}
        </div>
      );
    }

    // Boolean/Switch
    if (prop.type === 'boolean') {
      return (
        <div key={key} className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor={id}>{prop.title || key}</Label>
            {prop.description && (
              <p className="text-xs text-muted-foreground">{prop.description}</p>
            )}
          </div>
          <Switch
            id={id}
            checked={Boolean(value ?? prop.default)}
            onCheckedChange={(checked) => handleConfigChange(key, checked)}
          />
        </div>
      );
    }

    // Number
    if (prop.type === 'number') {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={id}>{prop.title || key}</Label>
          <Input
            id={id}
            type="number"
            value={Number(value ?? prop.default ?? 0)}
            min={prop.minimum}
            max={prop.maximum}
            onChange={(e) => handleConfigChange(key, Number(e.target.value))}
          />
          {prop.description && (
            <p className="text-xs text-muted-foreground">{prop.description}</p>
          )}
        </div>
      );
    }

    // Array (simplified as comma-separated)
    if (prop.type === 'array') {
      const arrayValue = Array.isArray(value) ? value : (prop.default as string[]) || [];
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={id}>{prop.title || key}</Label>
          <Input
            id={id}
            value={arrayValue.join(', ')}
            onChange={(e) => handleConfigChange(key, e.target.value.split(',').map(s => s.trim()))}
            placeholder="verdi1, verdi2, verdi3"
          />
          {prop.description && (
            <p className="text-xs text-muted-foreground">{prop.description}</p>
          )}
        </div>
      );
    }

    // Default: String input
    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={id}>{prop.title || key}</Label>
        <Input
          id={id}
          value={String(value ?? prop.default ?? '')}
          onChange={(e) => handleConfigChange(key, e.target.value)}
        />
        {prop.description && (
          <p className="text-xs text-muted-foreground">{prop.description}</p>
        )}
      </div>
    );
  };

  // Get capability-specific tester component
  const renderTester = () => {
    switch (capability.key) {
      case 'document-ocr':
        return <OCRCapabilityTester config={testConfig} capabilityId={capability.id} />;
      // Add more testers here as capabilities are added
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Ingen test-komponent tilgjengelig for denne capability.</p>
            <p className="text-sm mt-2">
              Capability key: <code className="bg-muted px-1 rounded">{capability.key}</code>
            </p>
          </div>
        );
    }
  };

  if (!schema?.properties || Object.keys(schema.properties).length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Test Capability
          </CardTitle>
          <CardDescription>
            Denne capability har ingen konfigurerbare innstillinger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderTester()}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5" />
          Test Capability
        </CardTitle>
        <CardDescription>
          Test med platform defaults eller juster midlertidig konfigurasjon.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Config Editor */}
        <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Konfigurasjon (Platform Defaults)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4 space-y-4">
            {Object.entries(schema.properties).map(([key, prop]) => 
              renderConfigField(key, prop as ConfigProperty)
            )}
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-defaults"
                  checked={saveAsDefault}
                  onCheckedChange={(checked) => setSaveAsDefault(Boolean(checked))}
                />
                <Label htmlFor="save-defaults" className="text-sm cursor-pointer">
                  Lagre som nye platform defaults
                </Label>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Tilbakestill
                </Button>
                {saveAsDefault && (
                  <Button 
                    size="sm" 
                    onClick={handleSaveDefaults}
                    disabled={saveDefaultsMutation.isPending}
                  >
                    {saveDefaultsMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1" />
                    )}
                    Lagre defaults
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Capability-specific tester */}
        <div className="border-t pt-6">
          {renderTester()}
        </div>
      </CardContent>
    </Card>
  );
}

