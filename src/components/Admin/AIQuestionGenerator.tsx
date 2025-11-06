import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useAIMcpChat } from "@/modules/core/ai";
import { useToast } from "@/hooks/use-toast";

interface AIQuestionGeneratorProps {
  fieldKey: string;
  mode: string;
  onQuestionsGenerated: () => void;
  tenantId: string;
  companyId?: string;
  projectId?: string;
}

export const AIQuestionGenerator = ({ 
  fieldKey, 
  mode, 
  onQuestionsGenerated,
  tenantId,
  companyId,
  projectId
}: AIQuestionGeneratorProps) => {
  const [context, setContext] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const { toast } = useToast();

  const systemPrompt = `Du er en ekspert på å generere relevante spørsmål for bedriftsevaluering og systemvalg.

Din oppgave er å generere skreddersydde spørsmål basert på:
- Bedriftens bransje og størrelse
- Eksisterende prosjekter og deres scope
- Tilgjengelige applikasjoner/systemer i katalogen
- Kontekst som brukeren gir

Bruk MCP tools til å hente relevant informasjon:
- list_companies: Se bedriftsinformasjon og bransje
- list_projects: Forstå pågående prosjekter og behov
- list_applications: Kjenn til tilgjengelige ERP/CRM/andre systemer
- get_company: Dypere innsikt i spesifikk bedrift

Generer 5-8 relevante, konkrete spørsmål som:
- Er spesifikke for bedriftens bransje og situasjon
- Dekker funksjonelle, tekniske og strategiske aspekter
- Hjelper med å evaluere ${mode === 'erp' ? 'ERP-systemer' : 'leverandører'}
- Er klare og handlingsrettede

Format: Returner bare spørsmålene, ett per linje, nummerert (1., 2., etc.)`;

  const { messages, sendMessage, isLoading } = useAIMcpChat(tenantId, systemPrompt);

  const handleGenerate = async () => {
    try {
      let prompt = `Generer spørsmål for ${mode}-evaluering.`;
      
      if (companyId) {
        prompt += ` Bedrift ID: ${companyId}. Hent bedriftsinformasjon først.`;
      }
      
      if (projectId) {
        prompt += ` Prosjekt ID: ${projectId}. Hent prosjektdetaljer først.`;
      }
      
      if (context) {
        prompt += ` Ytterligere kontekst: ${context}`;
      }

      const response = await sendMessage(prompt);
      
      if (response?.response) {
        // Parse numbered questions from response
        const questions = response.response
          .split('\n')
          .filter(line => /^\d+\./.test(line.trim()))
          .map(line => line.replace(/^\d+\.\s*/, '').trim())
          .filter(q => q.length > 0);
        
        setGeneratedQuestions(questions);
        
        toast({
          title: "Spørsmål generert",
          description: `${questions.length} spørsmål generert med AI og MCP`,
        });
        
        onQuestionsGenerated();
      }
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke generere spørsmål",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Spørsmålsgenerator (MCP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="context">Ekstra kontekst (valgfritt)</Label>
          <Input
            id="context"
            placeholder="F.eks: Fokus på integrasjoner, bruker 50 ansatte, etc."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Genererer med AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generer Spørsmål
            </>
          )}
        </Button>

        {generatedQuestions.length > 0 && (
          <div className="space-y-2 mt-6">
            <h4 className="font-semibold">Genererte spørsmål:</h4>
            <ul className="space-y-2">
              {generatedQuestions.map((question, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold text-sm mb-2">AI Prosess:</h4>
            <div className="space-y-2 text-xs">
              {messages.slice(-3).map((msg, idx) => (
                <div key={idx} className={msg.role === 'user' ? 'text-muted-foreground' : ''}>
                  <strong>{msg.role === 'user' ? 'Du' : 'AI'}:</strong> {msg.content.substring(0, 100)}...
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
