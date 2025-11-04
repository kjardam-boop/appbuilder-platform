# Invitation System

## 📝 Overview
Secure invitation system for onboarding external users, suppliers, and contact persons. Generates time-limited tokens and sends email invitations via edge functions.

## 🎯 Use Cases
- **Supplier Onboarding**: Invite suppliers to submit evaluations
- **Contact Person Registration**: Invite company contacts to join
- **Team Member Invitations**: Invite users to join tenant
- **Partner Access**: Grant temporary access to implementation partners

## 🚀 Quick Start

### Send an Invitation
```typescript
import { supabase } from "@/integrations/supabase/client";

async function inviteSupplier(email: string, companyId: string) {
  const { data, error } = await supabase.functions.invoke(
    "send-supplier-invitation",
    {
      body: {
        email,
        companyId,
        contactPersonName: "John Doe"
      }
    }
  );
  
  if (error) {
    console.error("Invitation failed:", error);
    return;
  }
  
  console.log("Invitation sent:", data);
}
```

## 📊 Data Model

### Database Tables

**`invitations`**
- `id` - UUID primary key
- `email` - Recipient email
- `token` - Unique invitation token (UUID)
- `company_id` - Associated company (optional)
- `contact_person_name` - Name of invitee
- `status` - `pending`, `accepted`, `expired`, `revoked`
- `invited_by` - User who sent invitation
- `created_at` - When invitation was sent
- `expires_at` - Expiration timestamp (default 7 days)
- `accepted_at` - When invitation was accepted

### Key Relationships
- Invitations can be linked to companies
- Invitations track who sent them (invited_by → users)
- Expired invitations can't be used

## 🔌 API Reference

### Edge Functions

**`send-supplier-invitation`**
```typescript
// POST /functions/v1/send-supplier-invitation
{
  "email": "supplier@example.com",
  "companyId": "uuid",
  "contactPersonName": "John Doe"
}
```

**`send-user-invitation`**
```typescript
// POST /functions/v1/send-user-invitation
{
  "email": "user@example.com",
  "role": "project_contributor",
  "tenantId": "uuid"
}
```

### Service Functions

**`InvitationService.createInvitation()`**
- Creates invitation record
- Generates secure token
- Sets expiration date

**`InvitationService.validateToken(token)`**
- Validates token hasn't expired
- Checks status is pending
- Returns invitation details

**`InvitationService.acceptInvitation(token)`**
- Marks invitation as accepted
- Creates user account if needed
- Links to company/tenant

## 🔧 Configuration

### Email Configuration
Invitations use Lovable Cloud's built-in email service. No configuration needed.

### Token Security
- Tokens are UUID v4 (cryptographically random)
- Default expiration: 7 days
- One-time use only
- Can be manually revoked

### Expiration Settings
```typescript
const expiresAt = new Date();
expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
```

## 💡 Examples

### Example 1: Invite Supplier Contact
```typescript
import { InviteContactDialog } from "@/components/Company/InviteContactDialog";

function CompanyContactsTab({ companyId }: { companyId: string }) {
  return (
    <div>
      <h2>Contact Persons</h2>
      <InviteContactDialog companyId={companyId} />
    </div>
  );
}
```

### Example 2: Supplier Invitation Form
```typescript
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function SupplierInviteForm({ evaluationId }: { evaluationId: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const handleInvite = async () => {
    setIsLoading(true);
    
    const { error } = await supabase.functions.invoke(
      "send-supplier-invitation",
      {
        body: {
          email,
          contactPersonName: name,
          evaluationId
        }
      }
    );
    
    if (error) {
      toast.error("Failed to send invitation");
    } else {
      toast.success("Invitation sent successfully");
      setEmail("");
      setName("");
    }
    
    setIsLoading(false);
  };
  
  return (
    <div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <button onClick={handleInvite} disabled={isLoading}>
        Send Invitation
      </button>
    </div>
  );
}
```

### Example 3: Accept Invitation Flow
```typescript
// pages/AcceptInvitation.tsx
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  useEffect(() => {
    async function acceptInvite() {
      if (!token) return;
      
      // Validate token
      const { data: invitation, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();
      
      if (error || !invitation) {
        navigate("/auth?error=invalid_token");
        return;
      }
      
      // Check expiration
      if (new Date(invitation.expires_at) < new Date()) {
        navigate("/auth?error=expired_token");
        return;
      }
      
      // Show signup form pre-filled with email
      navigate(`/auth?email=${invitation.email}&token=${token}`);
    }
    
    acceptInvite();
  }, [token, navigate]);
  
  return <div>Processing invitation...</div>;
}
```

## 🔗 Dependencies

Required:
- **Authentication**: For user creation on acceptance
- **Email Integration**: For sending invitation emails (via Lovable Cloud)

Optional:
- **Company Module**: For company-linked invitations
- **Project Module**: For project-scoped invitations

## 🏗️ Technical Implementation

### Frontend Files
- `src/components/Company/InviteContactDialog.tsx`
- `src/pages/SupplierAuth.tsx` (invitation acceptance)

### Backend Files
- `supabase/functions/send-supplier-invitation/index.ts`
- `supabase/functions/send-user-invitation/index.ts`

### Database Tables
- `invitations`

### Database Migrations
- Create invitations table with RLS
- Add token uniqueness constraint
- Add expiration check constraint

## 🔐 Security Considerations
- Tokens are cryptographically random UUIDs
- Invitations expire after 7 days
- One-time use only (status updated on acceptance)
- RLS ensures users can only view invitations they sent or received
- Email addresses are validated before sending
- Rate limiting prevents spam

## 🐛 Troubleshooting

**Issue**: Invitation emails not being received
**Solution**: Check spam folder, verify email address is valid, ensure edge function deployed

**Issue**: Token validation fails
**Solution**: Token may have expired or already been used - resend invitation

**Issue**: Can't accept invitation
**Solution**: Ensure user isn't already registered with that email

---
*Part of the Lovable Platform • Last updated: 2025-01-15*
