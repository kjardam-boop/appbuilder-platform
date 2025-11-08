# Jul25 n8n Workflows

Dokumentasjon for n8n workflows som brukes av Jul25-applikasjonen.

## Oversikt

Jul25-appen sender notifikasjoner via n8n workflows for:
1. **Invitasjoner** (SMS/Email)
2. **Ny bruker registrert** (varsling til admin)
3. **Oppgave opprettet** (varsling til familiemedlemmer)
4. **Oppgave tilordnet** (varsling til spesifikk bruker)

## Konfigurasjon

Workflows må konfigureres i `mcp_tenant_workflow_map` tabellen:

```sql
INSERT INTO mcp_tenant_workflow_map (
  tenant_id,
  provider,
  workflow_key,
  webhook_path,
  description,
  is_active
) VALUES 
(
  'your-tenant-id',
  'n8n',
  'jul25_send_invitation',
  '/webhook/jul25-invite',
  'Send invitation via SMS or Email',
  true
),
(
  'your-tenant-id',
  'n8n',
  'jul25_user_registered',
  '/webhook/jul25-user-registered',
  'Notify admin when new user registers',
  true
),
(
  'your-tenant-id',
  'n8n',
  'jul25_task_created',
  '/webhook/jul25-task-created',
  'Notify family when task is created',
  true
),
(
  'your-tenant-id',
  'n8n',
  'jul25_task_assigned',
  '/webhook/jul25-task-assigned',
  'Notify user when task is assigned to them',
  true
);
```

## 1. Send Invitation Workflow

**Workflow Key**: `jul25_send_invitation`

**Webhook Path**: `/webhook/jul25-invite`

**Trigger**: Manual (fra InviteMembersPage)

### Payload Structure

```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "roles": ["tenant_admin"],
    "request_id": "uuid"
  },
  "action": "send_invitation",
  "input": {
    "recipient": "+4712345678",
    "method": "sms",
    "message": "Du er invitert til å bli med i julkalenderen! 🎄",
    "invitation_type": "family_member",
    "family_id": "uuid",
    "sent_by": "uuid"
  }
}
```

### n8n Workflow Steps

1. **Webhook Trigger** - Motta payload
2. **Switch Node** - Sjekk `input.method`
   - Hvis `sms`: Gå til Twilio node
   - Hvis `email`: Gå til Email node
3. **Twilio Node** (for SMS)
   - Account SID: fra Twilio
   - Auth Token: fra Twilio
   - To: `{{ $json.input.recipient }}`
   - Body: `{{ $json.input.message }}`
4. **Email Node** (for Email)
   - To: `{{ $json.input.recipient }}`
   - Subject: "Invitasjon til julkalender"
   - Body: `{{ $json.input.message }}`
5. **Response Node** - Returner status

### Response Format

```json
{
  "success": true,
  "message_id": "twilio-message-sid or email-id",
  "sent_at": "2025-12-01T10:00:00Z"
}
```

## 2. User Registered Workflow

**Workflow Key**: `jul25_user_registered`

**Webhook Path**: `/webhook/jul25-user-registered`

**Trigger**: Automatisk når ny bruker registrerer seg

### Payload Structure

```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": null,
    "roles": [],
    "request_id": "uuid"
  },
  "action": "user_registered",
  "input": {
    "user_id": "uuid",
    "user_email": "newuser@example.com",
    "user_name": "Ole Nordmann",
    "family_id": "uuid",
    "timestamp": "2025-12-01T10:00:00Z"
  }
}
```

### n8n Workflow Steps

1. **Webhook Trigger**
2. **Get Admin Contacts** - Hent admin e-post/telefon fra database
3. **Email to Admin** - Send varsel til admin(s)
4. **Response Node**

## 3. Task Created Workflow

**Workflow Key**: `jul25_task_created`

**Webhook Path**: `/webhook/jul25-task-created`

**Trigger**: Automatisk når oppgave opprettes

### Payload Structure

```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "roles": ["tenant_admin"],
    "request_id": "uuid"
  },
  "action": "task_created",
  "input": {
    "task_id": "uuid",
    "task_title": "Kjøpe julegaver",
    "family_id": "uuid",
    "notification_type": "created",
    "triggered_by": "uuid",
    "timestamp": "2025-12-01T10:00:00Z"
  }
}
```

### n8n Workflow Steps

1. **Webhook Trigger**
2. **Get Family Members** - Hent alle familiemedlemmer
3. **Loop Through Members** - For hvert medlem
4. **Send Notification** - Email eller push notification
5. **Response Node**

## 4. Task Assigned Workflow

**Workflow Key**: `jul25_task_assigned`

**Webhook Path**: `/webhook/jul25-task-assigned`

**Trigger**: Automatisk når oppgave tilordnes bruker

### Payload Structure

```json
{
  "context": {
    "tenant_id": "uuid",
    "user_id": "uuid",
    "roles": ["tenant_admin"],
    "request_id": "uuid"
  },
  "action": "task_assigned",
  "input": {
    "task_id": "uuid",
    "task_title": "Pynte juletreet",
    "assigned_to": "uuid",
    "family_id": "uuid",
    "notification_type": "assigned",
    "triggered_by": "uuid",
    "timestamp": "2025-12-01T10:00:00Z"
  }
}
```

### n8n Workflow Steps

1. **Webhook Trigger**
2. **Get User Details** - Hent brukerinfo for `assigned_to`
3. **Send Notification** - Email/SMS til tilordnet bruker
4. **Response Node**

## Testing

### Fra Admin UI

Gå til `/apps/jul25/invite-members` for å teste invitasjons-workflowen manuelt.

### Fra Kode

```typescript
import { sendInvitation } from '@/modules/apps/jul25/services/notificationService';

await sendInvitation(tenantId, userId, {
  recipient: '+4712345678',
  method: 'sms',
  message: 'Test invitasjon',
  invitationType: 'family_member',
  familyId: 'family-uuid',
});
```

## Feilsøking

### "2xx feil" - Webhook returnerer 200 men ingen respons

Sjekk at n8n-workflowen har en **Respond to Webhook** node som returnerer JSON:

```json
{
  "success": true,
  "message": "Notification sent"
}
```

### Workflow ikke funnet

Sjekk `mcp_tenant_workflow_map` og `tenant_integrations`:

```sql
-- Sjekk workflow mapping
SELECT * FROM mcp_tenant_workflow_map 
WHERE tenant_id = 'your-tenant-id' 
AND workflow_key = 'jul25_send_invitation';

-- Sjekk n8n integrasjon
SELECT * FROM tenant_integrations 
WHERE tenant_id = 'your-tenant-id' 
AND adapter_id IN ('n8n', 'n8n_mcp');
```

### Base URL mangler

Sett n8n base URL i `tenant_integrations.config`:

```json
{
  "n8n_base_url": "https://your-n8n-instance.com"
}
```

## Logging

Alle workflow-kjøringer logges i `integration_run` tabellen:

```sql
SELECT * FROM integration_run 
WHERE tenant_id = 'your-tenant-id' 
ORDER BY created_at DESC 
LIMIT 10;
```
