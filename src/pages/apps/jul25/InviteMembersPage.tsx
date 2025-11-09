import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/modules/core/user";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendInvitation } from "@/modules/apps/jul25/services/notificationService";
import { ArrowLeft, Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";

const STORAGE_KEY = 'jul25_invitation_draft';

export default function InviteMembersPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const context = useTenantContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          recipient: "",
          method: parsed.method || "sms" as "sms" | "email",
          subject: parsed.subject || "Velkommen til jul 2025",
          message: parsed.message || "Du er invitert til å bli med i julkalenderen! 🎄",
          invitationType: "family_member" as "family_member" | "guest",
        };
      } catch {
        // Ignore parse errors
      }
    }
    return {
      recipient: "",
      method: "sms" as "sms" | "email",
      subject: "Velkommen til jul 2025",
      message: "Du er invitert til å bli med i julkalenderen! 🎄",
      invitationType: "family_member" as "family_member" | "guest",
    };
  });

  // Auto-save subject and message to localStorage
  const { status: autoSaveStatus } = useAutoSave({
    onSave: async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        subject: formData.subject,
        message: formData.message,
        method: formData.method,
      }));
    },
    delay: 500,
    enabled: true,
  });

  // Trigger auto-save when subject or message changes
  useEffect(() => {
    if (formData.subject || formData.message) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        subject: formData.subject,
        message: formData.message,
        method: formData.method,
      }));
    }
  }, [formData.subject, formData.message, formData.method]);

  const handleSendInvitation = async () => {
    if (!currentUser) {
      toast({
        title: "Feil",
        description: "Du må være logget inn",
        variant: "destructive",
      });
      return;
    }

    if (!formData.recipient) {
      toast({
        title: "Feil",
        description: "Vennligst fyll inn mottaker",
        variant: "destructive",
      });
      return;
    }

    if (!context?.tenant_id) {
      toast({
        title: "Feil",
        description: "Ingen tenant funnet - vennligst last inn siden på nytt",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Generate unique token for jul25 invitation
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      // Create jul25_invitations record
      const { error: dbError } = await supabase
        .from('jul25_invitations')
        .insert({
          token,
          email: formData.method === 'email' ? formData.recipient : null,
          phone: formData.method === 'sms' ? formData.recipient : null,
          invited_by: currentUser.id,
          expires_at: expiresAt.toISOString(),
          status: 'pending',
        });

      if (dbError) throw dbError;

      // Generate invitation URL
      const invitationUrl = `${window.location.origin}/apps/jul25?invite=${token}`;

      // Send invitation via n8n workflow
      const result = await sendInvitation(context.tenant_id, currentUser.id, {
        recipient: formData.recipient,
        method: formData.method,
        subject: formData.subject,
        message: formData.message,
        invitationType: formData.invitationType,
        invitationUrl,
        token,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Kunne ikke sende invitasjon');
      }

      toast({
        title: "Invitasjon sendt!",
        description: `Invitasjonen ble sendt via ${formData.method === 'sms' ? 'SMS' : 'e-post'}. Token: ${token}`,
      });

      // Reset form
      setFormData({
        ...formData,
        recipient: "",
      });
    } catch (error: any) {
      console.error('[InviteMembersPage] Error:', error);
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke sende invitasjon",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
      <div className="container mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/apps/jul25")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til Jul25
        </Button>
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Send invitasjon</h1>
          <p className="text-muted-foreground">
            Inviter familiemedlemmer til julkalenderen
          </p>
        </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Metode</Label>
            <RadioGroup
              value={formData.method}
              onValueChange={(value: "sms" | "email") =>
                setFormData({ ...formData, method: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sms" id="sms" />
                <Label htmlFor="sms" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-4 w-4" />
                  E-post
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">
              {formData.method === "sms" ? "Telefonnummer" : "E-postadresse"}
            </Label>
            <Input
              id="recipient"
              type={formData.method === "sms" ? "tel" : "email"}
              placeholder={
                formData.method === "sms" ? "+47 123 45 678" : "navn@eksempel.no"
              }
              value={formData.recipient}
              onChange={(e) =>
                setFormData({ ...formData, recipient: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Emne</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Velkommen til jul 2025"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
            />
            <p className="text-sm text-muted-foreground">
              Dette vil brukes som emne/overskrift i invitasjonen. Lagres automatisk.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Melding</Label>
            <Textarea
              id="message"
              placeholder="Skriv en personlig melding..."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Meldingen lagres automatisk. Linjeskift støttes og vises korrekt i e-posten.
            </p>
          </div>

          <Button
            onClick={handleSendInvitation}
            disabled={loading || !formData.recipient}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send invitasjon
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6 mt-6 bg-muted/50">
        <h3 className="font-semibold mb-3">n8n Webhook Payload-struktur</h3>
        <pre className="text-xs bg-background p-4 rounded-lg overflow-x-auto">
{`{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid", 
    "roles": ["tenant_admin"],
    "request_id": "uuid"
  },
  "action": "send_invitation",
  "input": {
    "recipient": "${formData.method === "sms" ? "+4712345678" : "email@example.com"}",
    "method": "${formData.method}",
    "subject": "${formData.subject}",
    "message": "${formData.message}",
    "invitation_type": "family_member",
    "sent_by": "uuid",
    "sent_by_email": "user@example.com",
    "invitation_url": "${window.location.origin}/apps/jul25",
    "registration_url": "${window.location.origin}/apps/jul25/register"
  }
}`}
        </pre>
        <p className="text-sm text-muted-foreground mt-3">
          Dette er payload-en som sendes til n8n-webhooken din. Webhook-URLen må være 
          konfigurert i <code className="bg-background px-1 py-0.5 rounded">mcp_tenant_workflow_map</code> 
          med workflow_key: <code className="bg-background px-1 py-0.5 rounded">jul25_send_invitation</code>
        </p>
      </Card>
      </div>
    </div>
  );
}
