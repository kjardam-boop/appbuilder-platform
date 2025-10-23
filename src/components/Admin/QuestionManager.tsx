import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionManagerProps {
  fieldKey: string;
}

export const QuestionManager = ({ fieldKey }: QuestionManagerProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Database not configured. This feature requires migration.
        </p>
      </CardContent>
    </Card>
  );
};
