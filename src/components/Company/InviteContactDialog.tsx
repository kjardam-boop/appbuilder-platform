import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, User, Building } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContactPerson } from "@/modules/core/company/types/company.types";

interface InviteContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: ContactPerson;
  companyId: string;
  companyName: string;
}

export function InviteContactDialog({
  open,
  onOpenChange,
  contact,
  companyId,
  companyName,
}: InviteContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async () => {
    if (!contact.email) {
      toast.error("Kontaktpersonen mangler e-postadresse");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-user-invitation', {
        body: {
          email: contact.email,
          contactPersonName: contact.full_name,
          companyId,
          companyName,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || 'Invitasjon sendt!');
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Kunne ikke sende invitasjon');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Inviter bruker</DialogTitle>
          <DialogDescription>
            Send en invitasjon til {contact.full_name} for å opprette en brukerkonto.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Navn
            </Label>
            <Input 
              value={contact.full_name} 
              disabled 
              className="bg-muted"
            />
          </div>

          {contact.title && (
            <div className="space-y-2">
              <Label>Tittel</Label>
              <Input 
                value={contact.title} 
                disabled 
                className="bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-post
            </Label>
            <Input 
              value={contact.email || ''} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Selskap
            </Label>
            <Input 
              value={companyName} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            En invitasjonslink vil bli sendt til {contact.email}. 
            Invitasjonen er gyldig i 7 dager.
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Avbryt
          </Button>
          <Button
            onClick={handleInvite}
            disabled={isLoading || !contact.email}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send invitasjon
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}