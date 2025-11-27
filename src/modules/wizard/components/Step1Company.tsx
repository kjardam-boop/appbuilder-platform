/**
 * Step 1: Company & Systems Selection
 * 
 * First step of the App Creation Wizard.
 * Select customer company, identify current systems, and add partners.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { 
  EmptyState, 
  LoadingState 
} from '@/components/shared';
import type { 
  WizardState, 
  CustomerCompanyOption, 
  ExternalSystemOption, 
  PartnerOption 
} from '../types/wizard.types';

interface Step1Props {
  state: WizardState;
  onStateChange: (updates: Partial<WizardState>) => void;
  companies: CustomerCompanyOption[];
  externalSystems: ExternalSystemOption[];
  partners: PartnerOption[];
  isLoading?: boolean;
}

export function Step1Company({
  state,
  onStateChange,
  companies,
  externalSystems,
  partners,
  isLoading,
}: Step1Props) {
  // Add system to selection
  const addSystem = (systemId: string) => {
    const system = externalSystems.find(s => s.id === systemId);
    if (system && !state.systems.find(s => s.id === systemId)) {
      onStateChange({
        systems: [...state.systems, { 
          id: system.id, 
          name: system.name, 
          type: system.systemType 
        }],
      });
    }
  };

  // Remove system from selection
  const removeSystem = (systemId: string) => {
    onStateChange({
      systems: state.systems.filter(s => s.id !== systemId),
    });
  };

  // Add partner to selection
  const addPartner = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId);
    if (partner && !state.partners.find(p => p.id === partnerId)) {
      onStateChange({
        partners: [...state.partners, { id: partner.id, name: partner.name }],
      });
    }
  };

  // Remove partner from selection
  const removePartner = (partnerId: string) => {
    onStateChange({
      partners: state.partners.filter(p => p.id !== partnerId),
    });
  };

  if (isLoading) {
    return <LoadingState message="Laster data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Prosjektdetaljer</CardTitle>
          <CardDescription>
            Grunnleggende informasjon om applikasjonen du bygger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Prosjektnavn *</Label>
            <Input
              id="projectName"
              value={state.projectName}
              onChange={(e) => onStateChange({ projectName: e.target.value })}
              placeholder="f.eks. Acme Corp Dashboard"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="projectDescription">Beskrivelse</Label>
            <Textarea
              id="projectDescription"
              value={state.projectDescription}
              onChange={(e) => onStateChange({ projectDescription: e.target.value })}
              placeholder="Kort beskrivelse av applikasjonen..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Company */}
      <Card>
        <CardHeader>
          <CardTitle>Kundeselskap</CardTitle>
          <CardDescription>
            Velg selskapet denne applikasjonen bygges for (kun kunder og prospekter)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Velg selskap *</Label>
            <Select
              value={state.companyId || ''}
              onValueChange={(value) => onStateChange({ companyId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Velg et selskap..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex flex-col">
                      <span>{company.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {company.company_roles?.join(', ')}
                        {company.industry_description && ` • ${company.industry_description}`}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ingen kunder eller prospekter funnet. Selskaper trenger rollen 'customer' eller 'prospect'.{' '}
                <a href="/customers" className="text-primary underline">Administrer kunder →</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Eksisterende systemer</CardTitle>
          <CardDescription>
            Hvilke systemer bruker dette selskapet i dag? Dette hjelper oss forstå integrasjonsbehov.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected systems */}
          {state.systems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.systems.map((system) => (
                <Badge key={system.id} variant="secondary" className="pl-2 pr-1 py-1">
                  {system.name}
                  <span className="text-xs text-muted-foreground ml-1">({system.type})</span>
                  <button
                    type="button"
                    onClick={() => removeSystem(system.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* System selector */}
          <div className="space-y-2">
            <Label>Legg til system</Label>
            <Select onValueChange={addSystem}>
              <SelectTrigger>
                <SelectValue placeholder="Velg et system..." />
              </SelectTrigger>
              <SelectContent>
                {externalSystems
                  .filter(s => !state.systems.find(ss => ss.id === s.id))
                  .map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      <div className="flex items-center gap-2">
                        <span>{system.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({system.systemType})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {externalSystems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ingen eksterne systemer funnet.{' '}
                <a href="/admin/external-systems" className="text-primary underline">Legg til systemer →</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Partners */}
      <Card>
        <CardHeader>
          <CardTitle>Implementeringspartnere</CardTitle>
          <CardDescription>
            Velg partnere eller konsulenter som er involvert i prosjektet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected partners */}
          {state.partners.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {state.partners.map((partner) => (
                <Badge key={partner.id} variant="outline" className="pl-2 pr-1 py-1">
                  {partner.name}
                  <button
                    type="button"
                    onClick={() => removePartner(partner.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Partner selector */}
          <div className="space-y-2">
            <Label>Legg til partner</Label>
            <Select onValueChange={addPartner}>
              <SelectTrigger>
                <SelectValue placeholder="Velg en partner..." />
              </SelectTrigger>
              <SelectContent>
                {partners
                  .filter(p => !state.partners.find(sp => sp.id === p.id))
                  .map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      <div className="flex flex-col">
                        <span>{partner.name}</span>
                        {partner.industry_description && (
                          <span className="text-xs text-muted-foreground">
                            {partner.industry_description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {partners.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ingen implementeringspartnere funnet. Selskaper trenger rollen 'partner'.{' '}
                <a href="/implementation-partners" className="text-primary underline">Administrer partnere →</a>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

