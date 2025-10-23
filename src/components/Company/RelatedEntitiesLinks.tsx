import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const RelatedEntitiesLinks = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Related Entities</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Database not configured. This feature requires migration.
        </p>
      </CardContent>
    </Card>
  );
};
