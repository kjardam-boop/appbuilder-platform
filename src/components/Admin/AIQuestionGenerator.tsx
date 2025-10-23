import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIQuestionGeneratorProps {
  fieldKey: string;
  mode: string;
  onQuestionsGenerated: () => void;
}

export const AIQuestionGenerator = ({ fieldKey, mode, onQuestionsGenerated }: AIQuestionGeneratorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Question Generator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Database not configured. This feature requires migration.
        </p>
      </CardContent>
    </Card>
  );
};
