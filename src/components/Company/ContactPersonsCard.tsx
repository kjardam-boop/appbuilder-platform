import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, User, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ContactPerson } from "@/modules/core/company/types/company.types";
import { ContactPersonDialog } from "./ContactPersonDialog";

interface ContactPersonsCardProps {
  companyId: string;
  companyName: string;
  contacts: ContactPerson[];
  onUpdate: (contacts: ContactPerson[]) => Promise<void>;
}

export function ContactPersonsCard({
  companyId,
  companyName,
  contacts,
  onUpdate
}: ContactPersonsCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactPerson | null>(null);

  const handleAddContact = () => {
    setEditingContact(null);
    setIsDialogOpen(true);
  };

  const handleEditContact = (contact: ContactPerson) => {
    setEditingContact(contact);
    setIsDialogOpen(true);
  };

  const handleDeleteContact = async (index: number) => {
    try {
      const updatedContacts = contacts.filter((_, i) => i !== index);
      await onUpdate(updatedContacts);
      toast.success("Kontaktperson slettet");
    } catch (error) {
      toast.error("Kunne ikke slette kontaktperson");
    }
  };

  const handleSaveContact = async (contact: ContactPerson) => {
    try {
      let updatedContacts: ContactPerson[];
      
      if (editingContact) {
        // Update existing contact
        const index = contacts.findIndex(c => 
          c.full_name === editingContact.full_name && 
          c.title === editingContact.title
        );
        updatedContacts = [...contacts];
        updatedContacts[index] = contact;
      } else {
        // Add new contact
        updatedContacts = [...contacts, contact];
      }

      await onUpdate(updatedContacts);
      setIsDialogOpen(false);
      toast.success(editingContact ? "Kontaktperson oppdatert" : "Kontaktperson lagt til");
    } catch (error) {
      toast.error("Kunne ikke lagre kontaktperson");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Kontaktpersoner
              </CardTitle>
              <CardDescription className="mt-1.5">
                Registrerte kontaktpersoner for {companyName}
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleAddContact}>
              <Plus className="h-4 w-4 mr-2" />
              Legg til
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">
                Ingen kontaktpersoner registrert ennå
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, index) => (
                <div 
                  key={index} 
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{contact.full_name}</span>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Primær
                          </Badge>
                        )}
                      </div>
                      {contact.title && (
                        <p className="text-sm text-muted-foreground">{contact.title}</p>
                      )}
                      {contact.department && (
                        <p className="text-xs text-muted-foreground">{contact.department}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteContact(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {contact.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContactPersonDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contact={editingContact}
        onSave={handleSaveContact}
      />
    </>
  );
}