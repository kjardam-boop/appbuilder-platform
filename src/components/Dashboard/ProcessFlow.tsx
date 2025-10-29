import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

const phases = [
  {
    id: "as_is",
    title: "Nåsituasjon / AS-IS",
    description: "Kartlegg eksisterende systemer, prosesser og utfordringer",
  },
  {
    id: "to_be",
    title: "Målbilde / TO-BE / Architecture",
    description: "Definere fremtidig tilstand, arkitektur og kravspesifikasjon",
  },
  {
    id: "evaluation",
    title: "Evaluering / Scoring / Analyse og valg",
    description: "Vurdere leverandører, score tilbud og ta beslutning",
  },
  {
    id: "execution",
    title: "Gjennomføre prosjekt",
    description: "Implementering, testing og utrulling av løsningen",
  },
  {
    id: "closure",
    title: "Avslutt og fakturere prosjekt",
    description: "Prosjektavslutning, dokumentasjon og fakturering",
  },
];

interface ProcessFlowProps {
  currentPhase?: string;
}

const ProcessFlow = ({ currentPhase = "as_is" }: ProcessFlowProps) => {
  const currentIndex = phases.findIndex((p) => p.id === currentPhase);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anskaffelsesprosess</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div
                key={phase.id}
                className={`relative flex gap-4 p-4 rounded-lg border transition-all ${
                  isCurrent
                    ? "bg-primary/5 border-primary"
                    : isCompleted
                    ? "bg-muted/50 border-border"
                    : "border-border"
                }`}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle
                      className={`h-6 w-6 ${
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{phase.title}</h3>
                    {isCurrent && <Badge variant="default">Aktiv</Badge>}
                    {isCompleted && <Badge variant="secondary">Fullført</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{phase.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessFlow;
