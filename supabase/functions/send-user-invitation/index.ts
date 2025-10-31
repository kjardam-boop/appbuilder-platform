import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, contactPersonName, companyId, companyName } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Brukeren er allerede registrert' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { error: inviteError } = await supabaseClient
      .from('invitations')
      .insert({
        email,
        token,
        company_id: companyId,
        contact_person_name: contactPersonName,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (inviteError) {
      console.error('Error creating invitation:', inviteError);
      throw new Error('Failed to create invitation');
    }

    // Get email service credentials from tenant_integrations
    const { data: emailConfig } = await supabaseClient
      .from('tenant_integrations')
      .select('credentials')
      .eq('adapter_id', 'email-service')
      .eq('is_active', true)
      .single();

    const resendApiKey = emailConfig?.credentials?.RESEND_API_KEY;
    const fromEmail = emailConfig?.credentials?.FROM_EMAIL || 'noreply@yourdomain.com';

    if (!resendApiKey) {
      console.log('No email service configured, returning invitation token');
      const inviteUrl = `${req.headers.get('origin')}/auth?token=${token}`;
      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          inviteUrl,
          message: 'Invitasjon opprettet! Email-sending er ikke konfigurert. Del lenken manuelt med kontaktpersonen.',
          warning: 'Konfigurer Resend API-nøkkel i tenant_integrations for automatisk utsending.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send invitation email using Resend
    const inviteUrl = `${req.headers.get('origin')}/auth?token=${token}`;
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Invitasjon til plattformen${companyName ? ` - ${companyName}` : ''}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Du er invitert!</h2>
            <p>Hei ${contactPersonName || ''},</p>
            <p>Du har blitt invitert til å bli bruker på plattformen${companyName ? ` for ${companyName}` : ''}.</p>
            <p>Klikk på lenken nedenfor for å opprette din konto:</p>
            <p style="margin: 30px 0;">
              <a href="${inviteUrl}" 
                 style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Aksepter invitasjon
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Denne invitasjonen utløper om 7 dager.
            </p>
            <p style="color: #666; font-size: 14px;">
              Hvis du ikke forventet denne invitasjonen, kan du ignorere denne e-posten.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      console.error('Failed to send email:', await emailResponse.text());
      throw new Error('Failed to send invitation email');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invitasjon sendt!' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-user-invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});