import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AIQuestionGeneratorProps {
  fieldKey: string;
  onQuestionsGenerated: () => void;
  mode?: 'company' | 'supplier';
}

interface GeneratedQuestion {
  question_text: string;
  placeholder?: string;
  max_length?: number;
  is_required: boolean;
  selected?: boolean;
}

export const AIQuestionGenerator = ({ fieldKey, onQuestionsGenerated, mode = 'supplier' }: AIQuestionGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [projectContext, setProjectContext] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Get existing questions to avoid duplicates
      const { data: existingQuestions } = await supabase
        .from('field_questions')
        .select('question_text')
        .eq('field_key', fieldKey);

      const existingTexts = existingQuestions?.map(q => q.question_text) || [];

      const functionName = mode === 'company' ? 'generate-company-questions' : 'generate-supplier-questions';
      const body = mode === 'company' 
        ? {
            projectContext: projectContext || '',
            fieldKey,
            existingQuestions: existingTexts,
            sector: 'neutral',
          }
        : {
            projectTitle: 'Generelt IT-anskaffelsesprosjekt',
            projectDescription: projectContext || '',
            fieldKey,
            existingQuestions: existingTexts,
            sector: 'neutral',
          };

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      const questions = data.questions.map((q: GeneratedQuestion) => ({
        ...q,
        selected: true,
      }));

      setGeneratedQuestions(questions);
      toast.success(`Genererte ${questions.length} spørsmål`);
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Kunne ikke generere spørsmål');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    if (selectedQuestions.length === 0) {
      toast.error('Velg minst ett spørsmål');
      return;
    }

    setIsSaving(true);
    try {
      // Get current max display_order
      const { data: maxOrderData } = await supabase
        .from('field_questions')
        .select('display_order')
        .eq('field_key', fieldKey)
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = maxOrderData?.[0]?.display_order || 0;

      const questionsToInsert = selectedQuestions.map((q, index) => ({
        field_key: fieldKey,
        question_text: q.question_text,
        placeholder: q.placeholder,
        max_length: q.max_length || 1000,
        is_required: q.is_required,
        display_order: maxOrder + index + 1,
      }));

      const { error } = await supabase
        .from('field_questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast.success(`Lagret ${selectedQuestions.length} nye spørsmål`);
      setIsOpen(false);
      setGeneratedQuestions([]);
      setProjectContext('');
      onQuestionsGenerated();
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Kunne ikke lagre spørsmål');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleQuestion = (index: number) => {
    setGeneratedQuestions(prev =>
      prev.map((q, i) => (i === index ? { ...q, selected: !q.selected } : q))
    );
  };

  const dialogTitle = mode === 'company' 
    ? 'Generer spørsmål for selskapet med AI'
    : 'Generer leverandørspørsmål med AI';
  
  const dialogDescription = mode === 'company'
    ? 'AI vil generere relevante spørsmål som hjelper med å definere behov.'
    : 'AI vil generere relevante spørsmål for leverandørevaluering.';

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Generer med AI
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {dialogDescription}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {generatedQuestions.length === 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-context">
                    Prosjektbeskrivelse (valgfritt)
                  </Label>
                  <Textarea
                    id="project-context"
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="F.eks: Vi skal anskaffe et nytt CRM-system for 500 brukere..."
                    className="min-h-[100px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    Jo mer detaljert beskrivelse, desto mer relevante spørsmål
                  </p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Genererer...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generer spørsmål
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {generatedQuestions.filter(q => q.selected).length} av {generatedQuestions.length} valgt
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGeneratedQuestions([])}
                  >
                    Generer på nytt
                  </Button>
                </div>

                {generatedQuestions.map((question, index) => (
                  <div
                    key={index}
                    className={`p-4 border rounded-lg ${
                      question.selected ? 'bg-accent/50 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={question.selected}
                        onCheckedChange={() => toggleQuestion(index)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{question.question_text}</p>
                        {question.placeholder && (
                          <p className="text-sm text-muted-foreground">
                            Eksempel: {question.placeholder}
                          </p>
                        )}
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>Max: {question.max_length || 1000} tegn</span>
                          {question.is_required && (
                            <span className="text-primary">• Påkrevd</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {generatedQuestions.length > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Avbryt
              </Button>
              <Button
                onClick={handleSaveSelected}
                disabled={isSaving || generatedQuestions.filter(q => q.selected).length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Lagrer...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til valgte spørsmål
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
