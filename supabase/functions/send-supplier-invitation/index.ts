import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  contactName: string;
  contactEmail: string;
  supplierName: string;
  projectTitle: string;
  invitationLink: string;
  expiresAt: string;
  projectId: string;
  supplierId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user from JWT
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { contactName, contactEmail, supplierName, projectTitle, invitationLink, expiresAt, projectId, supplierId }: InvitationEmailRequest = await req.json();

    // Validate required fields
    if (!contactName || !contactEmail || !projectId || !supplierId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Verify user has permission to send invitations for this project
    const { data: project, error: projectError } = await supabaseClient
      .from("projects")
      .select("owner_id, created_by, company_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Check if user is project owner/creator OR has access via company
    let hasAccess = project.owner_id === user.id || project.created_by === user.id;
    
    if (!hasAccess && project.company_id) {
      const { data: companyUser } = await supabaseClient
        .from("company_users")
        .select("id")
        .eq("company_id", project.company_id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      hasAccess = !!companyUser;
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized to send invitations for this project" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Verify invitation exists (permission already verified via project check)
    const { data: invitation, error: invitationError } = await supabaseClient
      .from("supplier_portal_invitations")
      .select("id")
      .eq("project_id", projectId)
      .eq("supplier_id", supplierId)
      .maybeSingle();

    if (invitationError || !invitation) {
      console.error("Invitation lookup error:", invitationError);
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    console.log("Sending supplier invitation email to:", contactEmail);

    const emailResponse = await resend.emails.send({
      from: "Innkjøpsprosess <onboarding@resend.dev>",
      to: [contactEmail],
      subject: `Invitasjon til leverandørspørreskjema - ${projectTitle}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            .info-box { background-color: white; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
            .warning-box { background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
            ul { margin: 10px 0; padding-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Leverandørinvitasjon</h1>
            </div>
            <div class="content">
              <p>Hei ${contactName},</p>
              
              <p>Du er invitert til å delta i en leverandørevaluering på vegne av <strong>${supplierName}</strong>.</p>
              
              <div class="info-box">
                <p><strong>Prosjekt:</strong> ${projectTitle}</p>
                <p><strong>Utløper:</strong> ${new Date(expiresAt).toLocaleDateString('nb-NO', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>

              <div class="warning-box">
                <strong>Viktig - Registrering påkrevd:</strong>
                <ul>
                  <li>Du må registrere deg med en leverandørbruker for å få tilgang</li>
                  <li>Bruk denne e-postadressen (${contactEmail}) ved registrering</li>
                  <li>Du vil motta en verifiseringslenke på e-post etter registrering</li>
                  <li>Etter verifisering får du tilgang til spørreskjemaet</li>
                </ul>
              </div>
              
              <p>Klikk på lenken nedenfor for å komme i gang:</p>
              
              <a href="${invitationLink}" class="button">Registrer deg og start evaluering</a>
              
              <p>Eller kopier og lim inn denne lenken i nettleseren din:</p>
              <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${invitationLink}</p>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Merk:</strong> Denne invitasjonen utløper ${new Date(expiresAt).toLocaleDateString('nb-NO')}. 
                Hvis du har spørsmål, vennligst kontakt prosjektansvarlig.
              </p>
            </div>
            <div class="footer">
              <p>Denne e-posten ble sendt automatisk fra innkjøpsprosess-systemet.</p>
              <p>Vennligst ikke svar på denne e-posten.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-supplier-invitation function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send invitation" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
