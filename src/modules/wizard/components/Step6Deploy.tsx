/**
 * Step 6: Deploy Application
 * 
 * Final deployment step to push the application to preview.
 * Uses BaseStepProps pattern for consistent state management.
 */

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Rocket, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import type { BaseStepProps } from '../types/wizard.types';

export function Step6Deploy({ state, onStateChange }: Omit<BaseStepProps, 'tenantId'>) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);

  const deployApp = async () => {
    setIsDeploying(true);
    try {
      // Save the config to the project
      if (state.projectId && state.generatedConfig) {
        const config = state.generatedConfig as any;
        await supabase
          .from('customer_app_projects')
          .update({
            status: 'deployed',
            branding: config.theme,
            deployed_to_preview_at: new Date().toISOString(),
          })
          .eq('id', state.projectId);
      }
      
      setIsDeployed(true);
      toast.success('Application deployed to preview!');
    } catch (error) {
      toast.error('Failed to deploy application');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Deploy Application
        </CardTitle>
        <CardDescription>
          Review and deploy your new application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Project</h4>
            <p className="font-medium">{state.projectName}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Systems</h4>
            <p className="font-medium">{state.systems.length} integrations</p>
          </div>
          {state.selectedCapabilities.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Capabilities</h4>
              <p className="font-medium">{state.selectedCapabilities.length} selected</p>
            </div>
          )}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Workshop</h4>
            <p className="font-medium capitalize">{state.workshopStatus.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-4">
          {state.miroUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={state.miroUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Miro Board
              </a>
            </Button>
          )}
          {state.notionUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Notion Docs
              </a>
            </Button>
          )}
        </div>

        {/* Deploy button */}
        {!isDeployed ? (
          <div className="text-center py-8">
            <Button 
              size="lg"
              onClick={deployApp}
              disabled={isDeploying || !state.generatedConfig}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-5 w-5" />
                  Deploy to Preview
                </>
              )}
            </Button>
            {!state.generatedConfig && (
              <p className="text-sm text-muted-foreground mt-2">
                Generate the application config in the previous step first.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Application Deployed!</h3>
            <p className="text-muted-foreground mb-4">
              Your application is now available in preview mode.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
