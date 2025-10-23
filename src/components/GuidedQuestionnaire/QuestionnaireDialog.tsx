import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QuestionCard } from "./QuestionCard";
import { PreviewPane } from "./PreviewPane";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface Question {
  id: string;
  question_text: string;
  placeholder: string | null;
  max_length: number;
  is_required: boolean;
  display_order: number;
}

interface QuestionnaireDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  fieldKey: string;
  onComplete: (generatedText: string) => void;
}

export const QuestionnaireDialog = ({
  open,
  onOpenChange,
  projectId,
  fieldKey,
  onComplete,
}: QuestionnaireDialogProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const debouncedResponses = useDebounce(responses, 1000);

  // Fetch questions
  useEffect(() => {
    if (open) {
      fetchQuestions();
      fetchResponses();
    }
  }, [open, fieldKey]);

  // Auto-save responses
  useEffect(() => {
    if (Object.keys(debouncedResponses).length > 0) {
      saveResponses();
    }
  }, [debouncedResponses]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('field_questions')
      .select('*')
      .eq('field_key', fieldKey)
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error fetching questions:', error);
      toast.error('Kunne ikke laste spørsmål');
      return;
    }

    setQuestions(data || []);
    setIsLoading(false);
  };

  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .select('question_id, answer')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error fetching responses:', error);
      return;
    }

    const responsesMap: Record<string, string> = {};
    data?.forEach(r => {
      if (r.answer) {
        responsesMap[r.question_id] = r.answer;
      }
    });
    setResponses(responsesMap);
  };

  const saveResponses = async () => {
    const upsertPromises = Object.entries(responses).map(([questionId, answer]) => {
      return supabase
        .from('questionnaire_responses')
        .upsert({
          project_id: projectId,
          question_id: questionId,
          answer: answer || null,
        }, {
          onConflict: 'project_id,question_id'
        });
    });

    await Promise.all(upsertPromises);
  };

  const handleResponseChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const generatePreviewText = () => {
    return questions
      .filter(q => responses[q.id]?.trim())
      .map(q => `${q.question_text}\n${responses[q.id]}`)
      .join('\n\n');
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
      // Check required questions are answered
      const missingRequired = questions
        .filter(q => q.is_required && !responses[q.id]?.trim())
        .map(q => q.question_text);

      if (missingRequired.length > 0) {
        toast.error(`Vennligst svar på alle påkrevde spørsmål`);
        setIsGenerating(false);
        return;
      }

      // Fetch project context
      const { data: project } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();

      const projectContext = {
        projectName: project?.title,
      };

      const { data, error } = await supabase.functions.invoke('generate-from-questionnaire', {
        body: {
          fieldKey,
          responses: responses,
          projectContext,
        }
      });

      if (error) throw error;

      if (data?.generatedText) {
        onComplete(data.generatedText);
        toast.success('Tekst generert!');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error generating text:', error);
      toast.error('Kunne ikke generere tekst');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = questions.filter(q => q.is_required).every(q => responses[q.id]?.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Spørsmålsveileder</DialogTitle>
              <DialogDescription>
                Svar på spørsmålene for å få hjelp til å strukturere teksten
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Questions */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-6">
              {isLoading ? (
                <p>Laster spørsmål...</p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      questionId={q.id}
                      questionText={q.question_text}
                      placeholder={q.placeholder || undefined}
                      maxLength={q.max_length}
                      isRequired={q.is_required}
                      value={responses[q.id] || ''}
                      onChange={(value) => handleResponseChange(q.id, value)}
                      displayOrder={q.display_order}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right side - Preview */}
          <div className="w-1/2 flex flex-col">
            <PreviewPane
              previewText={generatePreviewText()}
              isGenerating={isGenerating}
              onGenerateWithAI={handleGenerateWithAI}
              canGenerate={canGenerate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
