import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Save, GripVertical, MoveRight } from "lucide-react";
import { toast } from "sonner";
import { SUPPLIER_EVALUATION_CATEGORIES } from "@/modules/supplier";

interface Question {
  id: string;
  field_key: string;
  question_text: string;
  placeholder: string | null;
  display_order: number;
  max_length: number;
  is_required: boolean;
  is_active: boolean;
}

interface QuestionManagerProps {
  fieldKey: string;
}

export const QuestionManager = ({ fieldKey }: QuestionManagerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, [fieldKey]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('field_questions')
      .select('*')
      .eq('field_key', fieldKey)
      .order('display_order');

    if (error) {
      console.error('Error fetching questions:', error);
      toast.error('Kunne ikke laste spørsmål');
      return;
    }

    setQuestions(data || []);
    setIsLoading(false);
  };

  const handleAdd = () => {
    const newQuestion: Question = {
      id: 'new-' + Date.now(),
      field_key: fieldKey,
      question_text: '',
      placeholder: null,
      display_order: questions.length + 1,
      max_length: 500,
      is_required: false,
      is_active: true,
    };
    setQuestions([...questions, newQuestion]);
    setEditingId(newQuestion.id);
  };

  const handleSave = async (question: Question) => {
    const isNew = question.id.startsWith('new-');
    
    if (isNew) {
      const { id, ...insertData } = question;
      const { data, error } = await supabase
        .from('field_questions')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('Error creating question:', error);
        toast.error('Kunne ikke opprette spørsmål');
        return;
      }

      setQuestions(prev => prev.map(q => q.id === question.id ? data : q));
      toast.success('Spørsmål opprettet');
    } else {
      const { error } = await supabase
        .from('field_questions')
        .update({
          question_text: question.question_text,
          placeholder: question.placeholder,
          max_length: question.max_length,
          is_required: question.is_required,
          is_active: question.is_active,
          display_order: question.display_order,
        })
        .eq('id', question.id);

      if (error) {
        console.error('Error updating question:', error);
        toast.error('Kunne ikke oppdatere spørsmål');
        return;
      }

      toast.success('Spørsmål oppdatert');
    }
    
    setEditingId(null);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('Er du sikker på at du vil slette dette spørsmålet?')) return;

    const { error } = await supabase
      .from('field_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Error deleting question:', error);
      toast.error('Kunne ikke slette spørsmål');
      return;
    }

    setQuestions(prev => prev.filter(q => q.id !== questionId));
    toast.success('Spørsmål slettet');
  };

  const handleUpdate = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handleMove = async (question: Question, newFieldKey: string) => {
    if (newFieldKey === question.field_key) {
      toast.info('Spørsmålet er allerede i denne seksjonen');
      return;
    }

    // Find max display_order in target section
    const { data: targetQuestions } = await supabase
      .from('field_questions')
      .select('display_order')
      .eq('field_key', newFieldKey)
      .order('display_order', { ascending: false })
      .limit(1);

    const newDisplayOrder = (targetQuestions?.[0]?.display_order || 0) + 1;

    const { error } = await supabase
      .from('field_questions')
      .update({
        field_key: newFieldKey,
        display_order: newDisplayOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', question.id);

    if (error) {
      console.error('Error moving question:', error);
      toast.error('Kunne ikke flytte spørsmål');
      return;
    }

    setQuestions(prev => prev.filter(q => q.id !== question.id));
    toast.success(`Spørsmål flyttet til ${getSectionLabel(newFieldKey)}`);
  };

  const getSectionLabel = (key: string): string => {
    const companyMap: Record<string, string> = {
      mandate: 'Mandat',
      requirements: 'Krav',
      invitation_description: 'IItD'
    };
    return companyMap[key] || SUPPLIER_EVALUATION_CATEGORIES.find(c => c.key === key)?.label || key;
  };

  const getAvailableSections = (): Array<{ key: string; label: string }> => {
    // Determine context: if current fieldKey is in company sections, show company sections, else supplier
    const companySections = ['mandate', 'requirements', 'invitation_description'];
    const isCompanyContext = companySections.includes(fieldKey);

    if (isCompanyContext) {
      return companySections.map(key => ({ key, label: getSectionLabel(key) }));
    } else {
      return SUPPLIER_EVALUATION_CATEGORIES.map(cat => ({ key: cat.key, label: cat.label }));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Laster...</div>;
  }

  return (
    <div className="space-y-4 mt-6">
      {questions.map((q) => (
        <Card key={q.id} className={editingId === q.id ? 'border-primary' : ''}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                
                <div className="flex-1 space-y-4">
                  <div>
                    <Label>Spørsmålstekst *</Label>
                    <Textarea
                      value={q.question_text}
                      onChange={(e) => handleUpdate(q.id, 'question_text', e.target.value)}
                      placeholder="Skriv spørsmålet..."
                      disabled={editingId !== q.id && editingId !== null}
                    />
                  </div>

                  <div>
                    <Label>Plassholdertekst</Label>
                    <Input
                      value={q.placeholder || ''}
                      onChange={(e) => handleUpdate(q.id, 'placeholder', e.target.value)}
                      placeholder="Hjelpetekst..."
                      disabled={editingId !== q.id && editingId !== null}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Maks lengde</Label>
                      <Input
                        type="number"
                        value={q.max_length}
                        onChange={(e) => handleUpdate(q.id, 'max_length', parseInt(e.target.value))}
                        disabled={editingId !== q.id && editingId !== null}
                      />
                    </div>
                    <div>
                      <Label>Visningsrekkefølge</Label>
                      <Input
                        type="number"
                        value={q.display_order}
                        onChange={(e) => handleUpdate(q.id, 'display_order', parseInt(e.target.value))}
                        disabled={editingId !== q.id && editingId !== null}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={q.is_required}
                        onCheckedChange={(checked) => handleUpdate(q.id, 'is_required', checked)}
                        disabled={editingId !== q.id && editingId !== null}
                      />
                      <Label>Påkrevd</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={q.is_active}
                        onCheckedChange={(checked) => handleUpdate(q.id, 'is_active', checked)}
                        disabled={editingId !== q.id && editingId !== null}
                      />
                      <Label>Aktiv</Label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {editingId === q.id ? (
                    <Button size="sm" onClick={() => handleSave(q)}>
                      <Save className="h-4 w-4 mr-1" />
                      Lagre
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(q.id)}>
                        Rediger
                      </Button>
                      
                      <Select onValueChange={(value) => handleMove(q, value)}>
                        <SelectTrigger className="h-8 text-xs">
                          <MoveRight className="h-3 w-3 mr-1" />
                          <SelectValue placeholder="Flytt" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableSections().map(section => (
                            <SelectItem 
                              key={section.key} 
                              value={section.key}
                              disabled={section.key === q.field_key}
                            >
                              {section.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleDelete(q.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button onClick={handleAdd} variant="outline" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Legg til nytt spørsmål
      </Button>
    </div>
  );
};
