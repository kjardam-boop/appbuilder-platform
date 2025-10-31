# Email-konfigurasjon for invitasjoner

## Oppsett med Resend

For å sende invitasjons-emails automatisk, må du konfigurere Resend:

### 1. Opprett Resend-konto
1. Gå til [resend.com](https://resend.com) og registrer deg
2. Bekreft din e-postadresse

### 2. Verifiser domene
1. Gå til [Domains](https://resend.com/domains)
2. Klikk "Add Domain"
3. Legg inn ditt domene (f.eks. `yourdomain.com`)
4. Følg instruksjonene for å legge til DNS-records hos din domeneleverandør (Domeneshop, etc.)
5. Vent på verifisering (vanligvis noen minutter til noen timer)

**For Domeneshop:**
- Logg inn på [Domeneshop](https://www.domeneshop.no)
- Gå til "Domener" → Velg ditt domene → "DNS"
- Legg til de DNS-recordene Resend viser deg (SPF, DKIM, etc.)

### 3. Opprett API-nøkkel
1. Gå til [API Keys](https://resend.com/api-keys)
2. Klikk "Create API Key"
3. Gi den et navn (f.eks. "Production")
4. Kopier API-nøkkelen (vises kun én gang!)

### 4. Konfigurer i Lovable Cloud Secrets

1. Gå til Lovable Cloud → Secrets
2. Du har allerede lagt til `RESEND_API_KEY` (ser jeg!)
3. (Valgfritt) Legg til `FROM_EMAIL` Secret:
   - Name: `FROM_EMAIL`
   - Value: `noreply@yourdomain.com` (må være fra ditt verifiserte domene)

### 5. Test invitasjon
1. Gå til en bedriftsside med kontaktpersoner
2. Klikk på UserPlus-ikonet ved en kontaktperson med e-post
3. Send invitasjon
4. Sjekk at e-posten kommer frem

## Uten email-konfigurasjon

Hvis email ikke er konfigurert:
- Invitasjonen opprettes fortsatt i databasen
- Du får en invitasjonslenke i konsollen
- Du kan dele lenken manuelt med kontaktpersonen
- Lenken er gyldig i 7 dager

## Feilsøking

### "Email failed to send"
- Sjekk at domenet er verifisert i Resend
- Sjekk at API-nøkkelen er korrekt
- Sjekk at FROM_EMAIL matcher verifisert domene

### "Domain not verified"
- DNS-endringer kan ta tid (opp til 48 timer)
- Bruk [MXToolbox](https://mxtoolbox.com/SuperTool.aspx) for å sjekke DNS
- Sjekk at alle records fra Resend er lagt til

### "Rate limit exceeded"
- Gratis Resend-plan har begrensninger
- Oppgrader plan eller vent til neste periode
