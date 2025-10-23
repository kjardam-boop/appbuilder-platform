import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PartnerCertificationManager = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partner Certifications</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Database tables not yet configured. This feature will be available after migration.
        </p>
      </CardContent>
    </Card>
  );
};
