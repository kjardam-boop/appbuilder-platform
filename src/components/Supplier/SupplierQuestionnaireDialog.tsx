import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { QuestionCard } from "@/components/GuidedQuestionnaire/QuestionCard";
import { supabase } from "@/integrations/supabase/client";
import { useSaveEvaluation } from "@/modules/supplier";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  placeholder?: string;
  max_length?: number;
  is_required: boolean;
}

interface SupplierQuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  supplierId: string;
  fieldKey: string;
  categoryLabel: string;
  supplierName: string;
  showScoring?: boolean; // Internal evaluation mode shows scoring
}

export const SupplierQuestionnaireDialog = ({
  open,
  onOpenChange,
  projectId,
  supplierId,
  fieldKey,
  categoryLabel,
  supplierName,
  showScoring = true,
}: SupplierQuestionnaireDialogProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, { answer: string; score: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const saveEvaluation = useSaveEvaluation();

  useEffect(() => {
    if (open) {
      fetchQuestions();
      fetchResponses();
    }
  }, [open, fieldKey]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { EvaluationService } = await import('@/modules/supplier');
      const combinedQuestions = await EvaluationService.getCombinedQuestions(projectId, fieldKey);
      setQuestions(combinedQuestions as any);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Kunne ikke hente spørsmål');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('supplier_evaluation_responses')
        .select('question_id, answer, score')
        .eq('project_id', projectId)
        .eq('supplier_id', supplierId);

      if (error) throw error;

      const responseMap: Record<string, { answer: string; score: number }> = {};
      data?.forEach(r => {
        responseMap[r.question_id] = {
          answer: r.answer || '',
          score: r.score || 3,
        };
      });
      setResponses(responseMap);
    } catch (error) {
      console.error('Error fetching responses:', error);
    }
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        answer: value,
        score: prev[questionId]?.score || 3,
      },
    }));
  };

  const handleScoreChange = (questionId: string, score: number) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        answer: prev[questionId]?.answer || '',
        score,
      },
    }));
  };

  const handleSave = async () => {
    try {
      const evaluations = Object.entries(responses)
        .filter(([_, data]) => data.answer || (showScoring && data.score))
        .map(([questionId, data]) => {
          const question = questions.find(q => q.id === questionId);
          return {
            project_id: projectId,
            supplier_id: supplierId,
            question_id: questionId,
            answer: data.answer,
            score: showScoring ? data.score : undefined,
            question_source: (question as any)?.source || 'global'
          };
        });

      await Promise.all(evaluations.map(e => saveEvaluation.mutateAsync(e)));
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving evaluations:', error);
    }
  };

  const completedCount = Object.values(responses).filter(r => r.answer.trim()).length;
  const canSave = completedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Evaluer leverandør: {supplierName} - {categoryLabel}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {completedCount} av {questions.length} spørsmål besvart
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Ingen spørsmål tilgjengelig for denne kategorien.
              <br />
              Gå til Admin → Spørsmål for å legge til spørsmål.
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="space-y-2">
                <QuestionCard
                  questionId={question.id}
                  questionText={question.question_text}
                  placeholder={question.placeholder}
                  value={responses[question.id]?.answer || ''}
                  onChange={(value) => handleResponseChange(question.id, value)}
                  maxLength={question.max_length}
                  isRequired={question.is_required}
                  displayOrder={index + 1}
                />
                
                {showScoring && (
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-sm text-muted-foreground">Score (1-5):</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(score => (
                        <Button
                          key={score}
                          type="button"
                          variant={responses[question.id]?.score === score ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleScoreChange(question.id, score)}
                          className="w-10 h-10"
                        >
                          {score}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || saveEvaluation.isPending}
          >
            {saveEvaluation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Lagrer...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Lagre evaluering
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
