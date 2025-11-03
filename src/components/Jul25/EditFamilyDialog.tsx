import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Jul25Family, useUpdateFamily } from "@/hooks/useJul25Families";

interface EditFamilyDialogProps {
  family: Jul25Family;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditFamilyDialog({ family, open, onOpenChange }: EditFamilyDialogProps) {
  const [name, setName] = useState(family.name);
  const [numberOfPeople, setNumberOfPeople] = useState(family.number_of_people);
  const [arrivalDate, setArrivalDate] = useState(family.arrival_date);
  const [arrivalTime, setArrivalTime] = useState(family.arrival_time);
  const [departureDate, setDepartureDate] = useState(family.departure_date);
  const [departureTime, setDepartureTime] = useState(family.departure_time);
  
  const updateFamily = useUpdateFamily();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFamily.mutate({
      id: family.id,
      name,
      number_of_people: numberOfPeople,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime,
      departure_date: departureDate,
      departure_time: departureTime,
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="arrivalDate">Ankomstdag (1-24)</Label>
              <Input
                id="arrivalDate"
                type="number"
                min="1"
                max="24"
                value={arrivalDate}
                onChange={(e) => setArrivalDate(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="arrivalTime">Ankomsttid</Label>
              <Input
                id="arrivalTime"
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departureDate">Avreisedag (1-24)</Label>
              <Input
                id="departureDate"
                type="number"
                min="1"
                max="24"
                value={departureDate}
                onChange={(e) => setDepartureDate(parseInt(e.target.value))}
                required
              />
            </div>
            <div>
              <Label htmlFor="departureTime">Avreisetid</Label>
              <Input
                id="departureTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                required
              />
            </div>
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
