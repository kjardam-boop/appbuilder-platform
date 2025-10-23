import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

const phases = [
  {
    id: "malbilde",
    title: "Målbilde, Virksomhetsprosesser & Behov",
    description: "Definere prosjektmandat, målbilde og virksomhetsprosesser",
  },
  {
    id: "markedsdialog",
    title: "Markedsdialog, IItD & Nedvalg",
    description: "Utarbeide invitasjon til dialog og evaluere leverandører",
  },
  {
    id: "invitasjon",
    title: "Invitasjon til kontrakt (IIK)",
    description: "Beskrive kontraktmodell og utvikle tildelingskriterier",
  },
  {
    id: "leverandor",
    title: "Leverandøroppfølging & forberende evaluering",
    description: "Dialog med leverandører og forberede evalueringsteamet",
  },
  {
    id: "evaluering",
    title: "Evaluering & Kontraktsforhandling",
    description: "Gjennomgå og evaluere leverandørsøknader",
  },
];

interface ProcessFlowProps {
  currentPhase?: string;
}

const ProcessFlow = ({ currentPhase = "malbilde" }: ProcessFlowProps) => {
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
