// @ts-nocheck
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { OpportunityService } from "../services/opportunityService";
import CompanySelector from "@/modules/core/company/components/CompanySelector";
import { supabase } from "@/integrations/supabase/client";
import type { Opportunity, OpportunityStage } from "../types/opportunity.types";
import { OPPORTUNITY_STAGE_LABELS } from "../types/opportunity.types";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Building2 } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { RelatedEntitiesCard } from "@/components/RelatedEntitiesCard";
import { RelatedEntityLink } from "@/components/ui/related-entity-link";

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity?: Opportunity;
  ownerId: string;
  companyId?: string;
  onSuccess?: () => void;
}

export const OpportunityDialog = ({
  open,
  onOpenChange,
  opportunity,
  ownerId,
  companyId: initialCompanyId,
  onSuccess,
}: OpportunityDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState<string | undefined>(initialCompanyId);
  const [companyName, setCompanyName] = useState<string>("");
  const [stage, setStage] = useState<OpportunityStage>("prospecting");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [probability, setProbability] = useState("0");
  const [expectedCloseDate, setExpectedCloseDate] = useState<Date | undefined>();
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  useEffect(() => {
    if (opportunity) {
      setTitle(opportunity.title);
      setDescription(opportunity.description || "");
      setCompanyId(opportunity.company_id);
      setStage(opportunity.stage);
      setEstimatedValue(opportunity.estimated_value?.toString() || "");
      setProbability(opportunity.probability?.toString() || "0");
      setExpectedCloseDate(opportunity.expected_close_date ? new Date(opportunity.expected_close_date) : undefined);
      
      // Load company name
      if (opportunity.company_id) {
        loadCompanyName(opportunity.company_id);
      }
    } else {
      setTitle("");
      setDescription("");
      setCompanyId(initialCompanyId);
      setCompanyName("");
      setStage("prospecting");
      setEstimatedValue("");
      setProbability("0");
      setExpectedCloseDate(undefined);
      
      // Load company name for initial company
      if (initialCompanyId) {
        loadCompanyName(initialCompanyId);
      }
    }
  }, [opportunity, initialCompanyId, open]);

  const loadCompanyName = async (id: string) => {
    try {
      const { data } = await supabase
        .from("companies")
        .select("name")
        .eq("id", id)
        .single();
      
      if (data) {
        setCompanyName(data.name);
      }
    } catch (error) {
      console.error("Error loading company name:", error);
    }
  };

  const handleCompanySelect = async (id: string) => {
    setCompanyId(id);
    await loadCompanyName(id);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Feil",
        description: "Tittel er påkrevd",
        variant: "destructive",
      });
      return;
    }

    if (!companyId) {
      toast({
        title: "Feil",
        description: "Velg et selskap",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const opportunityData: Partial<Opportunity> = {
        title: title.trim(),
        description: description.trim() || null,
        company_id: companyId,
        owner_id: ownerId,
        stage,
        estimated_value: estimatedValue ? parseInt(estimatedValue) : null,
        probability: parseInt(probability),
        expected_close_date: expectedCloseDate ? format(expectedCloseDate, 'yyyy-MM-dd') : null,
      };

      if (opportunity) {
        await OpportunityService.updateOpportunity(opportunity.id, opportunityData);
        toast({
          title: "Suksess",
          description: "Mulighet oppdatert",
        });
      } else {
        await OpportunityService.createOpportunity(opportunityData as any);
        toast({
          title: "Suksess",
          description: "Mulighet opprettet",
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving opportunity:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre mulighet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {opportunity ? "Rediger mulighet" : "Ny mulighet"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tittel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Navn på muligheten"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Selskap *</Label>
            {companyId ? (
              <div className="flex items-center gap-2">
                <Input value={companyName || companyId} disabled className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCompanyId(undefined);
                    setCompanyName("");
                    setShowCompanySelector(true);
                  }}
                >
                  Endre
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => setShowCompanySelector(true)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Velg selskap
              </Button>
            )}
            <CompanySelector
              open={showCompanySelector}
              onOpenChange={setShowCompanySelector}
              onSelect={(id) => {
                handleCompanySelect(id);
                setShowCompanySelector(false);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Beskrivelse</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beskriv muligheten"
              rows={3}
            />
          </div>

          {/* Related Resources Section */}
          {opportunity && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Relatert til</Label>
              <div className="p-3 rounded-lg border bg-muted/30 space-y-2">
                {companyName && companyId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Selskap:</span>
                    <RelatedEntityLink
                      entityType="company"
                      entityId={companyId}
                      entityName={companyName}
                    />
                  </div>
                )}
                {opportunity.converted_to_project_id && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Prosjekt:</span>
                    <RelatedEntityLink
                      entityType="project"
                      entityId={opportunity.converted_to_project_id}
                      entityName="Se prosjekt"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {opportunity && (
            <RelatedEntitiesCard entityType="opportunity" entityId={opportunity.id} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Fase</Label>
              <Select value={stage} onValueChange={(value) => setStage(value as OpportunityStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPPORTUNITY_STAGE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="probability">Sannsynlighet (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Estimert verdi (NOK)</Label>
              <Input
                id="value"
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Forventet avslutning</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expectedCloseDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expectedCloseDate ? (
                      format(expectedCloseDate, "PPP", { locale: nb })
                    ) : (
                      <span>Velg dato</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedCloseDate}
                    onSelect={setExpectedCloseDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {opportunity ? "Oppdater" : "Opprett"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
