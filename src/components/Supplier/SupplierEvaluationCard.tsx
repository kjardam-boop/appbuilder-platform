import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Award, 
  Truck, 
  Headphones, 
  Shield, 
  Code, 
  Users,
  Mail,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SUPPLIER_EVALUATION_CATEGORIES } from "@/modules/supplier";
import { useEvaluationSummary, useCreatePortalInvitation } from "@/modules/supplier";
import { SupplierQuestionnaireDialog } from "./SupplierQuestionnaireDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const iconMap = {
  Building2,
  Award,
  Truck,
  Headphones,
  Shield,
  Code,
  Users,
};

interface SupplierEvaluationCardProps {
  projectId: string;
  supplierId: string;
  supplierName: string;
  supplierEmail?: string;
}

export const SupplierEvaluationCard = ({
  projectId,
  supplierId,
  supplierName,
  supplierEmail,
}: SupplierEvaluationCardProps) => {
  const navigate = useNavigate();
  const { data: summary, isLoading } = useEvaluationSummary(projectId, supplierId);
  const createInvitation = useCreatePortalInvitation();
  const [activeDialog, setActiveDialog] = useState<{ fieldKey: string; label: string } | null>(null);
  const [email, setEmail] = useState(supplierEmail || '');
  const [showInvite, setShowInvite] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 4) return "default";
    if (score >= 3) return "secondary";
    return "destructive";
  };

  const handleSendInvite = async () => {
    if (!email) return;
    await createInvitation.mutateAsync({ projectId, supplierId, email });
    setShowInvite(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{supplierName}</CardTitle>
              {summary && (
                <p className="text-sm text-muted-foreground mt-1">
                  {summary.totalCompleted} av {summary.totalQuestions} spørsmål besvart
                </p>
              )}
            </div>
            {summary && summary.totalCompleted > 0 && (
              <Badge variant={getScoreBadge(summary.overallScore)} className="text-lg px-4 py-2">
                {summary.overallScore.toFixed(1)}/5
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {SUPPLIER_EVALUATION_CATEGORIES.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap];
            const categoryData = summary?.categories[category.key];
            const score = categoryData?.score || 0;
            const completed = categoryData?.completedQuestions || 0;
            const total = categoryData?.totalQuestions || 0;

            return (
              <div
                key={category.key}
                className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_104px_112px] items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors w-full"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{category.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {category.description}
                    </p>
                  </div>
                </div>

                {completed > 0 ? (
                  <div className="text-right w-[104px] justify-self-end">
                    <p className={`font-semibold text-sm ${getScoreColor(score)}`}>
                      {score.toFixed(1)}/5
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {completed}/{total}
                    </p>
                  </div>
                ) : (
                  <div className="w-[104px] text-center justify-self-end">
                    <Badge variant="outline" className="text-xs">
                      Ikke startet
                    </Badge>
                  </div>
                )}

                <Button
                  size="sm"
                  variant={completed > 0 ? "outline" : "default"}
                  onClick={() => setActiveDialog({ fieldKey: category.key, label: category.label })}
                  className="w-[112px] justify-self-end"
                >
                  {completed > 0 ? 'Se detaljer' : 'Evaluer'}
                </Button>
              </div>
            );
          })}

          <div className="pt-4 border-t space-y-2">
            <Button
              className="w-full"
              onClick={() => navigate(`/project/${projectId}/supplier/${supplierId}/scoring`)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI Analyse & Scoring
            </Button>

            {showInvite ? (
              <div className="space-y-2">
                <Label htmlFor="supplier-email">Send invitasjon til leverandør</Label>
                <div className="flex gap-2">
                  <Input
                    id="supplier-email"
                    type="email"
                    placeholder="leverandor@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button
                    onClick={handleSendInvite}
                    disabled={!email || createInvitation.isPending}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                  <Button variant="outline" onClick={() => setShowInvite(false)}>
                    Avbryt
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leverandøren vil få en lenke for å fylle ut spørsmålene selv
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowInvite(true)}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Inviter leverandør til selvbetjening
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {activeDialog && (
        <SupplierQuestionnaireDialog
          open={!!activeDialog}
          onOpenChange={(open) => !open && setActiveDialog(null)}
          projectId={projectId}
          supplierId={supplierId}
          fieldKey={activeDialog.fieldKey}
          categoryLabel={activeDialog.label}
          supplierName={supplierName}
        />
      )}
    </>
  );
};
