import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface ContactPerson {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
}
interface ContactPersonsCardProps {
  companyId: string;
  companyName: string;
}
export function ContactPersonsCard({
  companyId,
  companyName
}: ContactPersonsCardProps) {
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    fetchContacts();
  }, [companyId]);
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('supplier_contacts').select('id, name, email, phone, role, is_primary').eq('company_id', companyId).is('project_id', null) // Only general company contacts, not project-specific
      .order('is_primary', {
        ascending: false
      }).order('created_at', {
        ascending: true
      });
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error("Kunne ikke laste kontaktpersoner");
    } finally {
      setIsLoading(false);
    }
  };
  if (isLoading) {
    return <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Kontaktpersoner
            </CardTitle>
            <CardDescription className="mx-0 my-[5px]">
              Registrerte kontaktpersoner for {companyName}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Legg til
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(() => {
          const seen = new Set<string>();
          const unique = contacts.filter(c => {
            const key = `${c.name.trim().toLowerCase()}|${(c.role || '').trim().toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (unique.length === 0) {
            return (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  Ingen kontaktpersoner registrert ennå
                </p>
              </div>
            );
          }
          return (
            <div className="space-y-3">
              {unique.map(contact => (
                <div key={contact.id} className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{contact.name}</span>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            Primær
                          </Badge>
                        )}
                      </div>
                      {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    {contact.email && contact.email.trim() !== '' && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </CardContent>
    </Card>;
}