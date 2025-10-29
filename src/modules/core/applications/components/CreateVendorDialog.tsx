import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { VendorService } from "../services/vendorService";
import { buildClientContext } from "@/shared/lib/buildContext";
import { toast } from "sonner";

const createVendorSchema = z.object({
  name: z.string().min(2, "Navn må være minst 2 tegn"),
  website: z.string().url("Ugyldig URL").optional().or(z.literal("")),
  description: z.string().optional(),
});

type CreateVendorData = z.infer<typeof createVendorSchema>;

interface CreateVendorDialogProps {
  open: boolean;
  suggestedName: string;
  onCreated: (vendorId: string, vendorName: string) => void;
  onCancel: () => void;
}

export function CreateVendorDialog({ open, suggestedName, onCreated, onCancel }: CreateVendorDialogProps) {
  const [isCreating, setIsCreating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateVendorData>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: suggestedName,
      website: "",
      description: "",
    },
  });

  const onSubmit = async (data: CreateVendorData) => {
    setIsCreating(true);
    try {
      const ctx = buildClientContext();
      
      // First create a company placeholder for the vendor
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: data.name,
          website: data.website || null,
          source: "manual",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // Now create the vendor
      const vendor = await VendorService.createVendor(ctx, {
        name: data.name,
        company_id: companyData.id,
        website: data.website || null,
        description: data.description || null,
      });

      toast.success(`Leverandør "${vendor.name}" opprettet`);
      onCreated(vendor.id, vendor.name);
    } catch (error) {
      console.error("Error creating vendor:", error);
      toast.error("Kunne ikke opprette leverandør");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Opprett ny leverandør</DialogTitle>
          <DialogDescription>
            Leverandøren finnes ikke i systemet. Opprett den nå for å fortsette.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Leverandørnavn *</Label>
            <Input {...register("name")} placeholder="f.eks. Microsoft" />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="website">Nettside</Label>
            <Input {...register("website")} placeholder="https://www.example.com" />
            {errors.website && (
              <p className="text-sm text-destructive mt-1">{errors.website.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Beskrivelse</Label>
            <Input {...register("description")} placeholder="Kort beskrivelse av leverandøren" />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Oppretter...
                </>
              ) : (
                "Opprett leverandør"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
