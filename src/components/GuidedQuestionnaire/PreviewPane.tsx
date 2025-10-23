import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2 } from "lucide-react";

interface PreviewPaneProps {
  previewText: string;
  isGenerating: boolean;
  onGenerateWithAI: () => void;
  canGenerate: boolean;
}

export const PreviewPane = ({
  previewText,
  isGenerating,
  onGenerateWithAI,
  canGenerate,
}: PreviewPaneProps) => {
  return (
    <div className="flex flex-col h-full border-l">
      <div className="p-4 border-b bg-muted/50">
        <h3 className="font-semibold">Forhåndsvisning</h3>
        <p className="text-sm text-muted-foreground">
          Teksten oppdateres automatisk basert på dine svar
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {previewText ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            {previewText}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Begynn å svare på spørsmålene for å se en forhåndsvisning...
          </p>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <Button
          onClick={onGenerateWithAI}
          disabled={!canGenerate || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Genererer...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Forbedre med AI
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
