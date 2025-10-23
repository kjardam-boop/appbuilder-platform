import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useAIChat } from "@/modules/ai";
import { AIChatInterface } from "@/modules/ai";

const AIAssistant = () => {
  const { messages, isLoading, sendMessage, setInitialMessage } = useAIChat({
    context: "IT-anskaffelsesprosess med 5 faser",
    systemPrompt: "Du er en hjelpsom AI-assistent for IT-anskaffelser i Norge. Du kan svare på spørsmål om prosessen, dokumentasjon, og gi veiledning gjennom de ulike fasene.",
  });

  useEffect(() => {
    if (messages.length === 0) {
      setInitialMessage(
        "Hei! Jeg er din AI-assistent for IT-anskaffelser. Jeg kan hjelpe deg med å forstå prosessen, svare på spørsmål om dokumentasjon, og gi veiledning gjennom de ulike fasene. Hva kan jeg hjelpe deg med?"
      );
    }
  }, []);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Prosessassistent
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <AIChatInterface
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          placeholder="Spør om anskaffelsesprosessen..."
        />
      </CardContent>
    </Card>
  );
};

export default AIAssistant;
