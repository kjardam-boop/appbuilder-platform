import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Jul25Family, useUpdateFamily } from "@/hooks/useJul25Families";

interface EditFamilyDialogProps {
  family: Jul25Family;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFamilyDialog({ family, open, onOpenChange }: EditFamilyDialogProps) {
  const [name, setName] = useState(family.name);
  const [numberOfPeople, setNumberOfPeople] = useState(family.number_of_people);
  
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(
    new Date(family.arrival_date)
  );
  const [departureDate, setDepartureDate] = useState<Date | undefined>(
    new Date(family.departure_date)
  );
  
  const updateFamily = useUpdateFamily();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrivalDate || !departureDate) return;
    
    // Validate departure is not before arrival
    if (departureDate < arrivalDate) {
      alert("Avreisedato kan ikke være før ankomstdato");
      return;
    }
    
    updateFamily.mutate({
      id: family.id,
      name,
      number_of_people: numberOfPeople,
      arrival_date: arrivalDate.toISOString(),
      departure_date: departureDate.toISOString(),
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rediger familie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Familienavn</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="numberOfPeople">Antall personer</Label>
            <Input
              id="numberOfPeople"
              type="number"
              min="1"
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(parseInt(e.target.value))}
              required
            />
          </div>
          <div>
            <Label>Ankomstdag</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !arrivalDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {arrivalDate ? format(arrivalDate, "PPP") : <span>Velg dato</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={arrivalDate}
                  onSelect={setArrivalDate}
                  defaultMonth={new Date(2025, 11, 1)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Avreisedag</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !departureDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {departureDate ? format(departureDate, "PPP") : <span>Velg dato</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  defaultMonth={new Date(2025, 11, 1)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button type="submit" disabled={updateFamily.isPending}>
              Lagre
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
