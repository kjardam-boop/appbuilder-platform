/**
 * Step 3: Workshop (Miro Integration)
 * 
 * Prepares a Miro board with AI-generated elements and manages workshop execution.
 * Uses BaseStepProps pattern for consistent state management.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  Sparkles 
} from 'lucide-react';
import { WizardService } from '../services/WizardService';
import type { BaseStepProps, WorkshopStatus } from '../types/wizard.types';

export function Step3Workshop({ state, onStateChange, tenantId }: BaseStepProps) {
  const [isPreparingBoard, setIsPreparingBoard] = useState(false);
  const [isProcessingResults, setIsProcessingResults] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  const updateWorkshopStatus = useCallback((status: WorkshopStatus) => {
    onStateChange({ workshopStatus: status });
    
    if (state.projectId) {
      WizardService.updateWorkshopStatus(state.projectId, status);
    }
  }, [state.projectId, onStateChange]);

  const prepareWorkshopBoard = async () => {
    if (!state.projectId) {
      toast.error('Project must be saved first');
      return;
    }

    setIsPreparingBoard(true);
    try {
      // Step 1: Generate AI workshop elements based on project context
      setGenerationProgress('Genererer workshop-elementer med AI...');
      
      const { data: aiElements, error: aiError } = await supabase.functions.invoke('generate-workshop-elements', {
        body: {
          projectId: state.projectId,
          tenantId,
          elementType: 'all',
        },
      });

      if (aiError) {
        console.error('AI generation error:', aiError);
        toast.warning('AI-generering feilet. Oppretter tom tavle.');
      } else {
        console.log('[Workshop] AI generated elements:', aiElements?.elements?.length || 0);
      }

      // Step 2: Create Miro board with AI-generated elements
      setGenerationProgress('Oppretter Miro-tavle...');
      
      // Get company name for the workflow
      let companyName = 'Unknown Company';
      if (state.companyId) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', state.companyId)
          .single();
        if (companyData?.name) companyName = companyData.name;
      }

      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          workflowKey: 'prepare-miro-workshop',
          action: 'prepare',
          input: {
            project_id: state.projectId,
            project_name: state.projectName,
            company_id: state.companyId,
            company_name: companyName,
            systems: state.systems,
            questionnaire: state.questionnaire,
            ai_elements: aiElements?.elements || [],
            ai_summary: aiElements?.summary || '',
          },
          tenantId,
        },
      });

      if (error) throw error;

      if (data?.data?.board_url) {
        onStateChange({
          miroUrl: data.data.board_url,
          workshopStatus: 'board_ready',
        });
        
        // Update project in database
        await WizardService.updateProject({
          id: state.projectId,
          miro_board_url: data.data.board_url,
          miro_board_id: data.data.board_id,
          workshop_status: 'board_ready',
        } as any);

        const elementCount = aiElements?.elements?.length || 0;
        toast.success(`Workshop board opprettet med ${elementCount} AI-genererte elementer!`);
      }
    } catch (error: any) {
      console.error('Failed to create board:', error);
      toast.error('Failed to create workshop board. Make sure n8n workflow is configured.');
    } finally {
      setIsPreparingBoard(false);
      setGenerationProgress('');
    }
  };

  const processWorkshopResults = async () => {
    if (!state.projectId) return;

    setIsProcessingResults(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: {
          workflowKey: 'process-workshop-results',
          action: 'process',
          input: {
            project_id: state.projectId,
          },
          tenantId,
        },
      });

      if (error) throw error;

      const notionUrl = data?.data?.notion_page_url || data?.data?.notion_url || data?.notion_page_url;
      
      if (notionUrl || data?.success) {
        onStateChange({
          notionUrl: notionUrl || null,
          workshopStatus: 'processed',
        });

        // Update project in database
        await WizardService.updateProject({
          id: state.projectId,
          notion_page_url: notionUrl,
          workshop_status: 'processed',
        } as any);

        toast.success('Workshop results processed! View the summary in Notion.');
      }
    } catch (error: any) {
      console.error('Failed to process results:', error);
      toast.error('Failed to process workshop results. Make sure n8n workflow is configured.');
    } finally {
      setIsProcessingResults(false);
    }
  };

  const resetBoard = () => {
    onStateChange({
      miroUrl: null,
      workshopStatus: 'not_started',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discovery Workshop</CardTitle>
        <CardDescription>
          Run a collaborative workshop in Miro to map processes and define requirements.
          Workshop results will be automatically documented in Notion.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant={
            state.workshopStatus === 'complete' || state.workshopStatus === 'processed' 
              ? 'default' 
              : state.workshopStatus === 'board_ready' || state.workshopStatus === 'in_progress'
              ? 'secondary'
              : 'outline'
          }>
            {state.workshopStatus === 'not_started' && 'Not Started'}
            {state.workshopStatus === 'preparing' && 'Preparing Board...'}
            {state.workshopStatus === 'board_ready' && 'Board Ready'}
            {state.workshopStatus === 'in_progress' && 'Workshop In Progress'}
            {state.workshopStatus === 'complete' && 'Workshop Complete'}
            {state.workshopStatus === 'processed' && 'Results Processed'}
          </Badge>
        </div>

        {/* Step 1: Prepare Board */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus !== 'not_started' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                1. Prepare Miro Board
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                AI genererer workshop-elementer basert på prosjektbeskrivelse, discovery-svar og opplastede dokumenter.
                Elementene plasseres automatisk på en Miro-tavle.
              </p>
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'not_started' && (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Button 
                      onClick={prepareWorkshopBoard}
                      disabled={isPreparingBoard}
                    >
                      {isPreparingBoard && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generer med AI
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => updateWorkshopStatus('complete')}
                    >
                      Skip (Manual Workshop)
                    </Button>
                  </div>
                  {generationProgress && (
                    <span className="text-sm text-muted-foreground animate-pulse">
                      {generationProgress}
                    </span>
                  )}
                </div>
              )}
              
              {state.miroUrl && (
                <>
                  <Button variant="outline" asChild>
                    <a href={state.miroUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open in Miro
                    </a>
                  </Button>
                  <Button 
                    variant="ghost"
                    size="sm"
                    onClick={resetBoard}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Create New Board
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: Run Workshop */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus === 'complete' || state.workshopStatus === 'processed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                2. Run Workshop
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Facilitate the workshop with your customer in Miro
              </p>
              
              {/* Workshop agenda */}
              {state.miroUrl && state.workshopStatus !== 'processed' && (
                <div className="mt-3 text-sm space-y-1 bg-muted/50 p-3 rounded-md">
                  <p className="font-medium">Suggested Agenda (2-3 hours):</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Review current state & systems (15 min)</li>
                    <li>Process mapping exercise (45 min)</li>
                    <li>Pain point identification & voting (20 min)</li>
                    <li>Solution brainstorming (30 min)</li>
                    <li>MoSCoW prioritization (20 min)</li>
                    <li>UI sketching (30 min)</li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'board_ready' && (
                <Button 
                  variant="outline"
                  onClick={() => updateWorkshopStatus('in_progress')}
                >
                  Mark as Started
                </Button>
              )}
              
              {state.workshopStatus === 'in_progress' && (
                <Button 
                  onClick={() => updateWorkshopStatus('complete')}
                >
                  Mark as Complete
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Process Results */}
        <div className="border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium flex items-center gap-2">
                {state.workshopStatus === 'processed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
                3. Process Results
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Extract insights from Miro, create documentation in Notion, and prepare for app generation
              </p>
            </div>
            
            <div className="flex gap-2">
              {state.workshopStatus === 'complete' && (
                <Button 
                  onClick={processWorkshopResults}
                  disabled={isProcessingResults}
                >
                  {isProcessingResults && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Process Results
                </Button>
              )}
              
              {state.notionUrl && state.workshopStatus !== 'processed' && (
                <Button variant="outline" asChild>
                  <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View in Notion
                  </a>
                </Button>
              )}
            </div>
          </div>
          
          {/* Show Notion summary link prominently when processed */}
          {state.workshopStatus === 'processed' && state.notionUrl && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Workshop Summary Ready
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    AI-generated insights and recommendations are available in Notion
                  </p>
                </div>
                <Button asChild>
                  <a href={state.notionUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Notion Summary
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Skip workshop option */}
        {state.workshopStatus === 'not_started' && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Don't have time for a full workshop?
            </p>
            <Button 
              variant="ghost" 
              onClick={() => updateWorkshopStatus('processed')}
            >
              Skip workshop and generate from discovery answers
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
