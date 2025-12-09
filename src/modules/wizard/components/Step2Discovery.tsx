/**
 * Step 2: Discovery Questions
 * 
 * AI-generated questions based on project context from Step 1.
 * Uses state from parent (single source of truth) via BaseStepProps pattern.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Sparkles, Loader2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardService } from '../services/WizardService';
import { useQuestionnaireMutation } from '../hooks/useWizardData';
import type { BaseStepProps, DiscoveryQuestion } from '../types/wizard.types';

export function Step2Discovery({ state, onStateChange, tenantId }: BaseStepProps) {
  // Local UI state only (not data state)
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [improvingQuestion, setImprovingQuestion] = useState<string | null>(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const hasInitialized = useRef(false);
  
  const questionnaireMutation = useQuestionnaireMutation();

  // Derived data from parent state (single source of truth)
  const questions = state.questions || [];
  const answers = state.questionnaire || {};

  // Load questions on mount if needed
  useEffect(() => {
    if (hasInitialized.current) return;
    if (!state.projectId) return;
    hasInitialized.current = true;

    const initialize = async () => {
      // If we already have questions with proper text, skip loading
      if (questions.length > 0 && !questions.some(q => /^q\d+$/.test(q.question))) {
        return;
      }

      setIsLoading(true);
      try {
        const { questions: loadedQuestions, answers: loadedAnswers } = 
          await WizardService.loadProjectQuestionnaire(state.projectId!);
        
        if (loadedQuestions.length > 0) {
          // Check if questions have legacy format (q0, q1, q2, etc.)
          const hasLegacyFormat = loadedQuestions.some(q => /^q\d+$/.test(q.question));
          
          if (hasLegacyFormat) {
            // Regenerate questions with AI, but preserve existing answers
            console.log('[Step2] Legacy format detected, regenerating questions while preserving answers');
            const existingAnswers = { ...answers, ...loadedAnswers };
            onStateChange({ questionnaire: existingAnswers });
            await generateQuestions();
          } else {
            // Normal loading - questions have proper text
            onStateChange({
              questions: loadedQuestions.map(q => ({
                ...q,
                suggestedAnswer: '',
                context: '',
              })),
              questionnaire: { ...answers, ...loadedAnswers },
            });
          }
        } else {
          // No existing questions - generate new ones
          await generateQuestions();
        }
      } catch (error) {
        console.error('Failed to load questions:', error);
        await generateQuestions();
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [state.projectId]);

  const generateQuestions = useCallback(async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-discovery-questions', {
        body: {
          projectId: state.projectId,
          companyId: state.companyId,
          tenantId,
          systems: state.systems,
          projectDescription: state.projectDescription,
          partners: state.partners,
        },
      });

      if (error) throw error;

      if (data?.questions && Array.isArray(data.questions)) {
        const newQuestions: DiscoveryQuestion[] = data.questions;
        
        // Merge with existing or set new
        const existingKeys = new Set(questions.map(q => q.key));
        const uniqueNew = newQuestions.filter(q => !existingKeys.has(q.key));
        
        onStateChange({
          questions: [...questions, ...uniqueNew],
        });
        
        // Save to database
        await saveQuestionMetadata(uniqueNew);
        
        if (questions.length > 0) {
          toast.success(`${uniqueNew.length} nye spørsmål generert`);
        }
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      toast.error('Kunne ikke generere spørsmål');
      
      // Fallback questions if none exist
      if (questions.length === 0) {
        onStateChange({
          questions: [
            { key: 'pain_points', question: 'Hva er de største utfordringene i dagens arbeidsflyt?', suggestedAnswer: '', context: 'Viktig for å forstå hvor applikasjonen kan gi mest verdi', category: 'pain_points' },
            { key: 'manual_tasks', question: 'Hvilke oppgaver gjøres manuelt som kunne vært automatisert?', suggestedAnswer: '', context: 'Identifiserer potensial for effektivisering', category: 'processes' },
            { key: 'integrations', question: 'Hvilke systemer må dele data med hverandre?', suggestedAnswer: '', context: 'Viktig for integrasjonsdesign', category: 'integrations' },
            { key: 'goals', question: 'Hva er hovedmålene med den nye løsningen?', suggestedAnswer: '', context: 'Definerer suksesskriterier', category: 'goals' },
            { key: 'users', question: 'Hvem er hovedbrukerne og hva er deres behov?', suggestedAnswer: '', context: 'Viktig for brukeropplevelse', category: 'users' },
          ],
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [state, tenantId, questions, onStateChange]);

  const saveQuestionMetadata = async (questionsToSave: DiscoveryQuestion[], updateExisting = false) => {
    if (!state.projectId) return;
    
    try {
      for (const q of questionsToSave) {
        const { data: existing } = await supabase
          .from('project_questionnaire_responses')
          .select('question_key, question_text, answer')
          .eq('project_id', state.projectId)
          .eq('question_key', q.key)
          .single();
        
        if (existing) {
          // Update existing question with new text if it has legacy format or if updateExisting is true
          const hasLegacyFormat = /^q\d+$/.test(existing.question_text || '');
          if (hasLegacyFormat || updateExisting) {
            await supabase
              .from('project_questionnaire_responses')
              .update({
                question_text: q.question,
                category: q.category,
              })
              .eq('project_id', state.projectId)
              .eq('question_key', q.key);
          }
        } else {
          // Insert new question
          await supabase
            .from('project_questionnaire_responses')
            .insert({
              project_id: state.projectId,
              question_key: q.key,
              question_text: q.question,
              category: q.category,
              answer: '',
              sort_order: questionsToSave.indexOf(q),
            });
        }
      }
    } catch (error) {
      console.error('Failed to save question metadata:', error);
    }
  };

  const updateAnswer = useCallback((key: string, value: string) => {
    const question = questions.find(q => q.key === key);
    
    // Update parent state (single source of truth)
    onStateChange({
      questionnaire: { ...answers, [key]: value },
    });
    
    // Persist to database
    if (state.projectId && question) {
      questionnaireMutation.mutate({
        projectId: state.projectId,
        questionKey: key,
        questionText: question.question,
        answer: value,
        category: question.category,
      });
    }
  }, [state.projectId, questions, answers, onStateChange, questionnaireMutation]);

  const acceptSuggestion = (key: string, suggestion: string) => {
    updateAnswer(key, suggestion);
    setAcceptedSuggestions(prev => new Set(prev).add(key));
    toast.success('Forslag akseptert');
  };

  const improveAnswer = async (questionKey: string, questionText: string, category: string) => {
    setImprovingQuestion(questionKey);
    try {
      const currentAnswer = answers[questionKey] || '';
      
      const { data, error } = await supabase.functions.invoke('improve-discovery-answer', {
        body: {
          questionText,
          currentAnswer,
          projectId: state.projectId,
          companyId: state.companyId,
          tenantId,
          category,
          otherAnswers: answers,
        },
      });

      if (error) throw error;

      if (data?.improvedAnswer) {
        updateAnswer(questionKey, data.improvedAnswer);
        
        if (data.addedPerspectives?.length > 0) {
          toast.success(`Forbedret med ${data.addedPerspectives.length} nye perspektiver`);
        } else {
          toast.success('Svar forbedret med AI');
        }
      }
    } catch (error) {
      console.error('Failed to improve answer:', error);
      toast.error('Kunne ikke forbedre svaret');
    } finally {
      setImprovingQuestion(null);
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      pain_points: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      processes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      integrations: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      goals: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      users: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    const labels: Record<string, string> = {
      pain_points: 'Utfordringer',
      processes: 'Prosesser',
      integrations: 'Integrasjoner',
      goals: 'Mål',
      users: 'Brukere',
    };
    return (
      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', colors[category] || 'bg-gray-100 text-gray-800')}>
        {labels[category] || category}
      </span>
    );
  };

  const answeredCount = Object.values(answers).filter(v => v && v.trim()).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Discovery-spørsmål
        </CardTitle>
        <CardDescription>
          AI-genererte spørsmål basert på bedriften, systemene og opplastet dokumentasjon.
          Foreslåtte svar er basert på tilgjengelig kontekst - rediger eller godta som de er.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <span className="text-muted-foreground">Laster eksisterende spørsmål...</span>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <span className="text-muted-foreground">Genererer nye spørsmål basert på kontekst fra steg 1...</span>
            <span className="text-xs text-muted-foreground mt-2">
              Inkluderer: selskap, systemer, partnere, beskrivelse og dokumenter
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateQuestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Generer flere spørsmål
              </Button>
              <span className="text-xs text-muted-foreground">
                {questions.length} spørsmål • {answeredCount} besvart
              </span>
            </div>

            <div className="space-y-8">
              {questions.map((q, i) => {
                const currentAnswer = answers[q.key] || '';
                const hasSuggestion = q.suggestedAnswer && q.suggestedAnswer.trim().length > 0;
                const isAccepted = acceptedSuggestions.has(q.key);
                const isImproving = improvingQuestion === q.key;

                return (
                  <div key={q.key} className="border rounded-lg p-4 space-y-3">
                    {/* Question header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-medium shrink-0">
                          {i + 1}
                        </span>
                        <div className="space-y-1">
                          <p className="font-medium">{q.question}</p>
                          {q.context && (
                            <p className="text-xs text-muted-foreground">{q.context}</p>
                          )}
                        </div>
                      </div>
                      {getCategoryBadge(q.category)}
                    </div>

                    {/* Suggested answer */}
                    {hasSuggestion && !currentAnswer && !isAccepted && (
                      <div className="ml-10 p-3 bg-muted/50 rounded-lg border border-dashed">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI-forslag basert på kontekst:
                            </p>
                            <p className="text-sm text-muted-foreground italic">
                              {q.suggestedAnswer}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => acceptSuggestion(q.key, q.suggestedAnswer || '')}
                            className="shrink-0"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Bruk
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Answer textarea */}
                    <div className="ml-10 space-y-2">
                      <Textarea
                        value={currentAnswer}
                        onChange={(e) => updateAnswer(q.key, e.target.value)}
                        placeholder={hasSuggestion ? "Skriv eget svar eller bruk forslaget over..." : "Skriv ditt svar her..."}
                        autoResize
                        maxHeight={400}
                      />
                      
                      {/* Action buttons */}
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {currentAnswer.length > 0 && `${currentAnswer.length} tegn`}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => improveAnswer(q.key, q.question, q.category)}
                          disabled={isImproving || !currentAnswer.trim()}
                          className="h-7"
                        >
                          {isImproving ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="h-3 w-3 mr-1" />
                          )}
                          Forbedre med AI
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {answeredCount} av {questions.length} spørsmål besvart
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
