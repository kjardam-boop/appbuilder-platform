import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ContactPerson } from "@/modules/core/company/types/company.types";

interface ContactPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactPerson | null;
  onSave: (contact: ContactPerson) => void;
}

export function ContactPersonDialog({
  open,
  onOpenChange,
  contact,
  onSave
}: ContactPersonDialogProps) {
  const [formData, setFormData] = useState<ContactPerson>({
    full_name: "",
    email: null,
    phone: null,
    title: null,
    department: null,
    is_primary: false,
    notes: null
  });

  useEffect(() => {
    if (contact) {
      setFormData(contact);
    } else {
      setFormData({
        full_name: "",
        email: null,
        phone: null,
        title: null,
        department: null,
        is_primary: false,
        notes: null
      });
    }
  }, [contact, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {contact ? "Rediger kontaktperson" : "Legg til kontaktperson"}
            </DialogTitle>
            <DialogDescription>
              Fyll inn informasjon om kontaktpersonen
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Fullt navn <span className="text-destructive">*</span>
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ola Nordmann"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Tittel/Rolle</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => setFormData({ ...formData, title: e.target.value || null })}
                placeholder="Daglig leder"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Avdeling</Label>
              <Input
                id="department"
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value || null })}
                placeholder="Salg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-post</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value || null })}
                placeholder="ola@eksempel.no"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value || null })}
                placeholder="12345678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notater</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                placeholder="Ekstra informasjon..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked })}
              />
              <Label htmlFor="is_primary" className="cursor-pointer">
                Primær kontaktperson
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={!formData.full_name.trim()}>
              Lagre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}