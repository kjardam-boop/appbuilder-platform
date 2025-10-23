import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AIQuestionGenerator = () => {
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
