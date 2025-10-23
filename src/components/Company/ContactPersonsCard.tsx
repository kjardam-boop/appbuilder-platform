import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const ContactPersonsCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Persons</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Database not configured. This feature requires migration.
        </p>
      </CardContent>
    </Card>
  );
};