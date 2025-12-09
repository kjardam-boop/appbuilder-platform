/**
 * Step 5: Generate Application
 * 
 * AI-generates application configuration based on discovery and workshop results.
 * Uses BaseStepProps pattern for consistent state management.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wand2, Sparkles, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import type { BaseStepProps } from '../types/wizard.types';

export function Step5Generate({ state, onStateChange, tenantId }: BaseStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAppConfig = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-tenant-app', {
        body: {
          projectId: state.projectId,
          companyId: state.companyId,
          systems: state.systems,
          questionnaire: state.questionnaire,
          selectedCapabilities: state.selectedCapabilities,
          tenantId,
        },
      });

      if (error) throw error;

      onStateChange({ generatedConfig: data.config });
      toast.success('Application config generated!');
    } catch (error: any) {
      console.error('Failed to generate config:', error);
      toast.error('Failed to generate application configuration');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Generate Application
        </CardTitle>
        <CardDescription>
          AI will generate the application configuration based on discovery and workshop results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!state.generatedConfig ? (
          <div className="text-center py-12">
            <Wand2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Ready to Generate</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              We'll create a custom application configuration based on the company's systems, 
              discovery answers, and workshop insights.
            </p>
            <Button 
              size="lg"
              onClick={generateAppConfig}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Application
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Configuration Generated
              </h3>
              <Button variant="outline" onClick={generateAppConfig} disabled={isGenerating}>
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Regenerate
              </Button>
            </div>
            
            {/* Preview of generated config */}
            <div className="bg-muted rounded-lg p-4">
              <pre className="text-sm overflow-auto max-h-96">
                {JSON.stringify(state.generatedConfig, null, 2)}
              </pre>
            </div>
            
            <p className="text-sm text-muted-foreground">
              You can edit this configuration after deployment in the App Config Editor.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
