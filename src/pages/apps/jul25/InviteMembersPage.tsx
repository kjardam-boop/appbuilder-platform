import { useState } from "react";
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

export default function InviteMembersPage() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const context = useTenantContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    recipient: "",
    method: "sms" as "sms" | "email",
    message: "Du er invitert til å bli med i julkalenderen! 🎄",
    invitationType: "family_member" as "family_member" | "guest",
  });

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
      // Use notification service with tenant context
      const result = await sendInvitation(context.tenant_id, currentUser.id, {
        recipient: formData.recipient,
        method: formData.method,
        message: formData.message,
        invitationType: formData.invitationType,
      });

      if (!result.ok) {
        throw new Error(result.error || 'Kunne ikke sende invitasjon');
      }

      toast({
        title: "Invitasjon sendt!",
        description: `Invitasjonen ble sendt via ${formData.method === 'sms' ? 'SMS' : 'e-post'}`,
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
              Dette er meldingen mottakeren vil få sammen med invitasjonslenken
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
    "message": "${formData.message}",
    "invitation_type": "family_member",
    "sent_by": "uuid",
    "sent_by_email": "user@example.com"
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
