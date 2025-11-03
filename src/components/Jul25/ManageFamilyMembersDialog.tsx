import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus } from "lucide-react";
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
}

export function ManageFamilyMembersDialog({ 
  familyId, 
  members, 
  open, 
  onOpenChange 
}: ManageFamilyMembersDialogProps) {
  const [editingMember, setEditingMember] = useState<Jul25FamilyMember | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [arrivalDate, setArrivalDate] = useState<number | null>(null);
  const [arrivalTime, setArrivalTime] = useState("");
  const [departureDate, setDepartureDate] = useState<number | null>(null);
  const [departureTime, setDepartureTime] = useState("");
  
  const addMember = useJoinFamily();
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember.mutate({
      family_id: familyId,
      name: memberName,
      user_id: null, // Non-user member (child, etc.)
      is_admin: false,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime || null,
      departure_date: departureDate,
      departure_time: departureTime || null,
    }, {
      onSuccess: () => {
        setAddingMember(false);
        setMemberName("");
        setArrivalDate(null);
        setArrivalTime("");
        setDepartureDate(null);
        setDepartureTime("");
      },
    });
  };

  const handleUpdateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    
    updateMember.mutate({
      id: editingMember.id,
      name: memberName,
      arrival_date: arrivalDate,
      arrival_time: arrivalTime || null,
      departure_date: departureDate,
      departure_time: departureTime || null,
    }, {
      onSuccess: () => {
        setEditingMember(null);
        setMemberName("");
        setArrivalDate(null);
        setArrivalTime("");
        setDepartureDate(null);
        setDepartureTime("");
      },
    });
  };

  const startEdit = (member: Jul25FamilyMember) => {
    setEditingMember(member);
    setMemberName(member.name);
    setArrivalDate(member.arrival_date);
    setArrivalTime(member.arrival_time || "");
    setDepartureDate(member.departure_date);
    setDepartureTime(member.departure_time || "");
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setAddingMember(false);
    setMemberName("");
    setArrivalDate(null);
    setArrivalTime("");
    setDepartureDate(null);
    setDepartureTime("");
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
                      <>Dag {member.arrival_date} - {member.departure_date}</>
                    )}
                    {member.is_admin && " (Admin)"}
                    {!member.user_id && " (Ikke bruker)"}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="memberArrivalDate">Ankomstdag (1-24)</Label>
                  <Input
                    id="memberArrivalDate"
                    type="number"
                    min="1"
                    max="24"
                    value={arrivalDate || ""}
                    onChange={(e) => setArrivalDate(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="memberArrivalTime">Ankomsttid</Label>
                  <Input
                    id="memberArrivalTime"
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="memberDepartureDate">Avreisedag (1-24)</Label>
                  <Input
                    id="memberDepartureDate"
                    type="number"
                    min="1"
                    max="24"
                    value={departureDate || ""}
                    onChange={(e) => setDepartureDate(e.target.value ? parseInt(e.target.value) : null)}
                  />
                </div>
                <div>
                  <Label htmlFor="memberDepartureTime">Avreisetid</Label>
                  <Input
                    id="memberDepartureTime"
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                  />
                </div>
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
