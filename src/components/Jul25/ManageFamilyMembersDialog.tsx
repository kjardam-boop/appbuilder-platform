import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  Jul25FamilyMember, 
  useJoinFamily, 
  useUpdateFamilyMember, 
  useDeleteFamilyMember 
} from "@/hooks/useJul25Families";

interface ManageFamilyMembersDialogProps {
  familyId: string;
  members: Jul25FamilyMember[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEditMemberId?: string;
}

export function ManageFamilyMembersDialog({ 
  familyId, 
  members, 
  open, 
  onOpenChange,
  initialEditMemberId
}: ManageFamilyMembersDialogProps) {
  const [editingMember, setEditingMember] = useState<Jul25FamilyMember | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>();
  const [departureDate, setDepartureDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open && initialEditMemberId) {
      const m = members.find(mm => mm.id === initialEditMemberId);
      if (m) {
        setEditingMember(m);
        setMemberName(m.name);
        setArrivalDate(m.arrival_date ? new Date(m.arrival_date) : undefined);
        setDepartureDate(m.departure_date ? new Date(m.departure_date) : undefined);
      }
    }
  }, [open, initialEditMemberId, members]);
  
  const addMember = useJoinFamily();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate departure is not before arrival
    if (arrivalDate && departureDate && departureDate < arrivalDate) {
      alert("Avreisedato kan ikke være før ankomstdato");
      return;
    }
    
    addMember.mutate({
      family_id: familyId,
      name: memberName,
      user_id: null, // Non-user member (child, etc.)
      is_admin: false,
      arrival_date: arrivalDate?.toISOString() || null,
      departure_date: departureDate?.toISOString() || null,
    }, {
      onSuccess: () => {
        setAddingMember(false);
        setMemberName("");
        setArrivalDate(undefined);
        setDepartureDate(undefined);
      },
    });
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    // Validate departure is not before arrival
    if (arrivalDate && departureDate && departureDate < arrivalDate) {
      alert("Avreisedato kan ikke være før ankomstdato");
      return;
    }
    
    updateMember.mutate({
      id: editingMember.id,
      name: memberName,
      arrival_date: arrivalDate?.toISOString() || null,
      departure_date: departureDate?.toISOString() || null,
    }, {
      onSuccess: () => {
        setEditingMember(null);
        setMemberName("");
        setArrivalDate(undefined);
        setDepartureDate(undefined);
      },
    });
  };

  const startEdit = (member: Jul25FamilyMember) => {
    setEditingMember(member);
    setMemberName(member.name);
    setArrivalDate(member.arrival_date ? new Date(member.arrival_date) : undefined);
    setDepartureDate(member.departure_date ? new Date(member.departure_date) : undefined);
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setAddingMember(false);
    setMemberName("");
    setArrivalDate(undefined);
    setDepartureDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Administrer familiemedlemmer</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Existing members */}
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{member.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.arrival_date && member.departure_date && (
                      <>{format(new Date(member.arrival_date), "d. MMM")} - {format(new Date(member.departure_date), "d. MMM")}</>
                    )}
                    {member.is_admin && " (Admin)"}
                    {!member.user_id && /^.+\s\d+$/.test(member.name) && " (Ledig plass)"}
                    {!member.user_id && !/^.+\s\d+$/.test(member.name) && " (Ikke bruker)"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(member)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!member.user_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMember.mutate(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit form */}
          {(addingMember || editingMember) && (
            <form onSubmit={editingMember ? handleUpdateMember : handleAddMember} className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="memberName">Navn</Label>
                <Input
                  id="memberName"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
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
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Avbryt
                </Button>
                <Button type="submit">
                  {editingMember ? "Oppdater" : "Legg til"}
                </Button>
              </div>
            </form>
          )}

          {/* Add button */}
          {!addingMember && !editingMember && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAddingMember(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Legg til familiemedlem
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
