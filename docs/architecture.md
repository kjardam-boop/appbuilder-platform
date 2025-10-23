# Arkitektur

## Systemdesign

### Overordnet arkitektur

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        MOBILE[Mobile Browser]
    end
    
    subgraph "Application Layer"
        ROUTER[React Router]
        CTX[Context Builder]
        MODULES[Module System]
        EVENTS[Event Bus]
    end
    
    subgraph "Service Layer"
        USER_SVC[User Service]
        COMP_SVC[Company Service]
        PROJ_SVC[Project Service]
        APP_SVC[Application Service]
        INT_SVC[Integration Service]
    end
    
    subgraph "Data Layer"
        SUPABASE[Supabase]
        DB[(PostgreSQL)]
        EDGE[Edge Functions]
        STORAGE[File Storage]
    end
    
    subgraph "External Layer"
        BRREG[Brønnøysund API]
        CRM[CRM Systems]
        ERP[ERP Systems]
    end
    
    WEB --> ROUTER
    MOBILE --> ROUTER
    
    ROUTER --> CTX
    CTX --> MODULES
    MODULES --> EVENTS
    
    MODULES --> USER_SVC
    MODULES --> COMP_SVC
    MODULES --> PROJ_SVC
    MODULES --> APP_SVC
    MODULES --> INT_SVC
    
    USER_SVC --> SUPABASE
    COMP_SVC --> SUPABASE
    PROJ_SVC --> SUPABASE
    APP_SVC --> SUPABASE
    INT_SVC --> EDGE
    
    SUPABASE --> DB
    EDGE --> BRREG
    EDGE --> CRM
    EDGE --> ERP
```

## Request Flow

### Typisk request-flyt

```mermaid
sequenceDiagram
    participant User
    participant Router
    participant Context
    participant Service
    participant Supabase
    participant External
    
    User->>Router: Åpne side
    Router->>Context: buildClientContext()
    Context->>Context: Resolve tenant fra host
    Context->>Supabase: Hent tenant config
    Supabase-->>Context: TenantConfig
    Context->>Context: Valider auth
    Context-->>Router: RequestContext (ctx)
    
    Router->>Service: someService.getData(ctx, ...)
    Service->>Service: Valider tenant + roller
    Service->>Supabase: Query med tenant filter
    Supabase-->>Service: Data
    
    alt Trenger ekstern data
        Service->>External: Via adapter + rate limit
        External-->>Service: Response
    end
    
    Service-->>Router: Resultat
    Router-->>User: Render side
```

### Context Builder

Hver request bygger en `RequestContext`:

```typescript
interface RequestContext {
  tenant_id: string;
  tenant: TenantConfig;
  userId?: string;
  roles?: AppRole[];
  request_id: string;
  timestamp: string;
  db: SupabaseClient;
  featureFlags?: Record<string, boolean>;
}
```

**Byggeprosess**:
1. Resolve tenant fra host/subdomain
2. Hent tenant config fra `tenants.json` eller control-DB
3. Valider bruker (auth.uid())
4. Hent roller fra `tenant_users`
5. Initialiser DB-client med RLS-context
6. Returner ctx

## Modularkitektur

### Core Modules

```mermaid
graph LR
    subgraph "Core"
        USER[User/Auth]
        COMPANY[Company]
        PROJECT[Project]
        DOCUMENT[Document]
        TASKS[Tasks]
        OPPORTUNITY[Opportunity]
        AI[AI]
        COMPLIANCE[Compliance]
        INTEGRATIONS[Integrations]
        APPLICATIONS[Applications]
        ADMIN[Admin]
    end
    
    subgraph "Addons"
        SUPPLIER[Supplier]
        INDUSTRY[Industry]
        ERPSYSTEM[ERP System]
    end
    
    USER --> PROJECT
    COMPANY --> PROJECT
    PROJECT --> TASKS
    PROJECT --> DOCUMENT
    PROJECT --> SUPPLIER
    
    COMPANY --> APPLICATIONS
    APPLICATIONS --> ERPSYSTEM
    
    INTEGRATIONS --> COMPANY
    
    AI --> DOCUMENT
    AI --> COMPANY
```

### Modul-struktur

Hver modul følger samme pattern:

```
modules/core/<module-name>/
├── components/          # React komponenter
├── hooks/              # Custom hooks (useX)
├── services/           # Business logic
├── types/              # TypeScript types
└── index.ts            # Public API
```

**Eksempel**: Company-modul

```typescript
// modules/core/company/index.ts
export * from "./types/company.types";
export { CompanyService } from "./services/companyService";
export { useCompany } from "./hooks/useCompany";
export { CompanyCard } from "./components/CompanyCard";
```

## Event System

### Event Bus Pattern

```mermaid
graph TB
    subgraph "Event Publishers"
        COMP[Company Created]
        PROJ[Project Updated]
        TASK[Task Completed]
    end
    
    subgraph "Event Bus"
        BUS[EventBus]
    end
    
    subgraph "Event Listeners"
        AI_LISTENER[AI Analysis]
        TASK_AUTO[Auto Task Creation]
        PROJ_STATUS[Project Status Update]
        AUDIT[Audit Logger]
    end
    
    COMP --> BUS
    PROJ --> BUS
    TASK --> BUS
    
    BUS --> AI_LISTENER
    BUS --> TASK_AUTO
    BUS --> PROJ_STATUS
    BUS --> AUDIT
```

### Event Kontrakter

**CompanyCreated**:
```typescript
interface CompanyCreatedEvent {
  type: "company.created";
  data: {
    companyId: string;
    tenantId: string;
    userId: string;
  };
  timestamp: string;
}
```

**Publisering**:
```typescript
eventBus.publish("company.created", {
  companyId: company.id,
  tenantId: ctx.tenant_id,
  userId: ctx.userId,
});
```

**Lytting**:
```typescript
eventBus.on("company.created", async (event) => {
  // Auto-opprett AI-analyse task
  await TaskService.create(ctx, {
    title: `Analyser ${company.name}`,
    entity_type: "company",
    entity_id: event.data.companyId,
  });
});
```

## Data Layer

### Database Schema

```mermaid
erDiagram
    TENANT_USERS ||--o{ PROJECTS : owns
    TENANT_USERS {
        uuid tenant_id
        uuid user_id
        app_role[] roles
        boolean is_active
    }
    
    COMPANIES ||--o{ PROJECTS : has
    COMPANIES {
        uuid id
        string name
        string org_number
        text[] company_roles
    }
    
    PROJECTS ||--o{ TASKS : contains
    PROJECTS {
        uuid id
        string title
        uuid owner_id
        uuid company_id
    }
    
    PROJECTS ||--o{ PROJECT_APP_PRODUCTS : evaluates
    PROJECT_APP_PRODUCTS {
        uuid project_id
        uuid app_product_id
        string stage
    }
    
    APP_PRODUCTS ||--o{ PROJECT_APP_PRODUCTS : in
    APP_PRODUCTS {
        uuid id
        string name
        uuid vendor_id
        string app_type
    }
    
    APP_VENDORS ||--o{ APP_PRODUCTS : provides
    APP_VENDORS {
        uuid id
        uuid company_id
        string name
    }
    
    COMPANIES ||--o{ APP_VENDORS : is
    
    TENANT_INTEGRATIONS {
        uuid tenant_id
        string adapter_id
        jsonb config
        jsonb credentials
    }
```

### RLS Policies

Alle tabeller har Row-Level Security aktivert:

**Eksempel - Projects**:
```sql
-- Users can only see projects in their tenant
CREATE POLICY "Users can view own tenant projects"
ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE tenant_id = projects.tenant_id
    AND user_id = auth.uid()
    AND is_active = true
  )
);
```

## Integration Layer

### Adapter Pattern

```mermaid
graph TB
    subgraph "Application"
        APP[Application Code]
    end
    
    subgraph "Adapter Registry"
        REGISTRY[AdapterRegistry]
        BRREG_ADAPTER[BrregAdapter]
        HUBSPOT_ADAPTER[HubSpotAdapter]
        CUSTOM_ADAPTER[CustomAdapter]
    end
    
    subgraph "External Systems"
        BRREG_API[Brønnøysund API]
        HUBSPOT_API[HubSpot API]
        CUSTOM_API[Custom API]
    end
    
    APP --> REGISTRY
    REGISTRY --> BRREG_ADAPTER
    REGISTRY --> HUBSPOT_ADAPTER
    REGISTRY --> CUSTOM_ADAPTER
    
    BRREG_ADAPTER --> BRREG_API
    HUBSPOT_ADAPTER --> HUBSPOT_API
    CUSTOM_ADAPTER --> CUSTOM_API
```

**Adapter Interface**:
```typescript
interface IntegrationAdapter {
  id: string;
  name: string;
  setup(ctx: RequestContext, config: AdapterConfig): Promise<void>;
  invoke(ctx: RequestContext, action: string, payload: any): Promise<any>;
  validate(config: AdapterConfig): Promise<boolean>;
  getActions(): AdapterAction[];
}
```

**Bruk**:
```typescript
// Via edge function
POST /api/integrations/brreg/company-search
Body: { query: "Acme AS" }

// Eller direkte
const adapter = AdapterRegistry.get("brreg");
const result = await adapter.invoke(ctx, "company-search", { query: "Acme AS" });
```

## Security

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Supabase Auth
    participant DB
    
    User->>Frontend: Login (email/google/apple)
    Frontend->>Supabase Auth: signIn()
    Supabase Auth->>Supabase Auth: Validate credentials
    Supabase Auth-->>Frontend: JWT token
    
    Frontend->>DB: Query with JWT
    DB->>DB: Validate JWT
    DB->>DB: Check RLS policies
    DB-->>Frontend: Filtered data
    Frontend-->>User: Display data
```

### RBAC Enforcement

**Frontend**:
```typescript
const { hasRole } = useUserRole();

if (hasRole("tenant_admin")) {
  return <AdminPanel />;
}
```

**Backend**:
```typescript
const hasRole = await userHasRole(ctx.userId, ctx.tenant_id, "tenant_admin");
if (!hasRole) {
  throw new UnauthorizedError("Requires tenant_admin role");
}
```

**Database**:
```sql
-- Via security definer function
CREATE POLICY "Only admins can delete"
ON projects FOR DELETE
USING (
  user_has_role(auth.uid(), tenant_id, 'tenant_admin')
);
```

## Performance

### Caching Strategy

- **Tenant config**: In-memory cache, 5 min TTL
- **User roles**: Session cache
- **Static data**: Browser cache headers
- **API responses**: SWR/React Query

### Optimization

- Lazy loading av moduler
- Code splitting per route
- Optimistic updates (React Query)
- Debouncing av søk
- Pagination på alle lister

## Skalerbarhet

### Horizontal Scaling

- **Frontend**: Statisk, CDN-cachet
- **Edge Functions**: Auto-scale via Supabase
- **Database**: Connection pooling, read replicas

### Tenant Isolation

- Per-tenant database schemas (fremtidig)
- RLS policies sikrer data-isolering
- Rate limiting per tenant på integrasjoner
