/**
 * Capability Bundles Admin Page
 * 
 * Manage pre-configured bundles of capabilities that work well together.
 * Bundles are "starter packs" that customers can choose to quickly add
 * a set of related capabilities to their app.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader, LoadingState, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import type { CapabilityBundle, CapabilityBundleInput } from '@/modules/core/capabilities/types/capability.types';
import { useCapabilities } from '@/modules/core/capabilities';

// Icon options for bundles
const ICON_OPTIONS = [
  'Package', 'Sparkles', 'Users', 'FolderKanban', 'Building2',
  'BarChart3', 'FileText', 'Calendar', 'CheckSquare', 'Workflow',
  'Database', 'Shield', 'Zap', 'Globe', 'Settings',
];

export default function CapabilityBundlesPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<CapabilityBundle | null>(null);
  const [formData, setFormData] = useState<CapabilityBundleInput>({
    key: '',
    name: '',
    description: '',
    capabilities: [],
    target_industries: [],
    price_per_month: undefined,
    icon_name: 'Package',
  });
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);

  // Fetch bundles
  const { data: bundles, isLoading } = useQuery({
    queryKey: ['capability-bundles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capability_bundles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as CapabilityBundle[];
    },
  });

  // Fetch all capabilities for selection
  const { data: capabilities } = useCapabilities({ is_active: true });

  // Filter to only public capabilities (the ones customers can use)
  const publicCapabilities = capabilities?.filter(c => 
    (c as any).visibility === 'public' || !(c as any).visibility
  ) || [];

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CapabilityBundleInput) => {
      const payload = {
        ...data,
        capabilities: selectedCapabilities,
        updated_at: new Date().toISOString(),
      };

      if (editingBundle) {
        const { error } = await supabase
          .from('capability_bundles')
          .update(payload)
          .eq('id', editingBundle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('capability_bundles')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capability-bundles'] });
      toast.success(editingBundle ? 'Bundle oppdatert' : 'Bundle opprettet');
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capability_bundles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capability-bundles'] });
      toast.success('Bundle slettet');
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('capability_bundles')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capability-bundles'] });
    },
  });

  const handleOpenCreate = () => {
    setEditingBundle(null);
    setFormData({
      key: '',
      name: '',
      description: '',
      capabilities: [],
      target_industries: [],
      price_per_month: undefined,
      icon_name: 'Package',
    });
    setSelectedCapabilities([]);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (bundle: CapabilityBundle) => {
    setEditingBundle(bundle);
    setFormData({
      key: bundle.key,
      name: bundle.name,
      description: bundle.description || '',
      capabilities: bundle.capabilities,
      target_industries: bundle.target_industries || [],
      price_per_month: bundle.price_per_month || undefined,
      icon_name: bundle.icon_name || 'Package',
    });
    setSelectedCapabilities(bundle.capabilities || []);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBundle(null);
  };

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.key.trim()) {
      toast.error('Navn og nøkkel er påkrevd');
      return;
    }
    saveMutation.mutate(formData);
  };

  const toggleCapability = (capKey: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capKey) 
        ? prev.filter(k => k !== capKey)
        : [...prev, capKey]
    );
  };

  if (isLoading) {
    return <LoadingState message="Laster bundles..." />;
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <PageHeader
        title="Capability Bundles"
        description="Administrer forhåndskonfigurerte pakker med capabilities som fungerer godt sammen."
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Ny Bundle
          </Button>
        }
      />

      {bundles?.length === 0 ? (
        <EmptyState
          title="Ingen bundles ennå"
          description="Opprett din første bundle for å gjøre det enklere for kunder å velge capabilities."
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Opprett Bundle
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bundle</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Pris/mnd</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles?.map((bundle) => (
                  <TableRow key={bundle.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{bundle.name}</p>
                          <p className="text-sm text-muted-foreground">{bundle.key}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {bundle.capabilities?.slice(0, 3).map((capKey) => (
                          <Badge key={capKey} variant="secondary" className="text-xs">
                            {capKey}
                          </Badge>
                        ))}
                        {(bundle.capabilities?.length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{bundle.capabilities.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {bundle.price_per_month 
                        ? `${bundle.price_per_month} kr`
                        : <span className="text-muted-foreground">—</span>
                      }
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={bundle.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: bundle.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(bundle)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm('Er du sikker på at du vil slette denne bundlen?')) {
                              deleteMutation.mutate(bundle.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBundle ? 'Rediger Bundle' : 'Ny Bundle'}
            </DialogTitle>
            <DialogDescription>
              Opprett en pakke med capabilities som fungerer godt sammen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="key">Nøkkel *</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    key: e.target.value.toLowerCase().replace(/\s+/g, '-') 
                  }))}
                  placeholder="crm-starter"
                  disabled={!!editingBundle}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="CRM Starter Pack"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="En samling av capabilities for..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="icon">Ikon</Label>
                <Select
                  value={formData.icon_name}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg ikon" />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((icon) => (
                      <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Pris per måned (kr)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price_per_month || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    price_per_month: e.target.value ? parseFloat(e.target.value) : undefined 
                  }))}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Capability Selection */}
            <div className="space-y-2">
              <Label>Capabilities i denne bundlen ({selectedCapabilities.length} valgt)</Label>
              <Card className="max-h-[200px] overflow-y-auto">
                <CardContent className="p-3 space-y-2">
                  {publicCapabilities.map((cap) => {
                    const isSelected = selectedCapabilities.includes(cap.key);
                    return (
                      <div
                        key={cap.id}
                        className={`
                          flex items-center justify-between p-2 rounded-md cursor-pointer
                          ${isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted'}
                        `}
                        onClick={() => toggleCapability(cap.key)}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2" />
                          )}
                          <span className="font-medium text-sm">{cap.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {cap.category}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Selected capabilities preview */}
            {selectedCapabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedCapabilities.map((capKey) => (
                  <Badge key={capKey} variant="secondary">
                    {capKey}
                    <button
                      type="button"
                      onClick={() => toggleCapability(capKey)}
                      className="ml-1 hover:bg-muted rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Avbryt
            </Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingBundle ? 'Lagre endringer' : 'Opprett Bundle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

