# Integrations Module

## Oversikt

Integrations-modulen er kjernen for all kommunikasjon med eksterne systemer. Den tilbyr et standardisert rammeverk for å bygge, registrere og administrere integrasjoner med tredjepartstjenester som ERP, CRM, e-post, betalingssystemer, og mer.

## Arkitektur

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[UI Components]
        Hooks[React Hooks]
    end
    
    subgraph "Application Layer"
        TIS[TenantIntegrationService]
        IS[IntegrationService]
        WS[WebhookService]
        McpAS[McpActionRegistryService]
    end
    
    subgraph "Adapter Layer"
        AR[AdapterRegistry]
        BA[BaseAdapter]
        SA[StandardAdapter]
        
        subgraph "Konkrete Adaptere"
            Brreg[BrregAdapter]
            N8n[N8nMcpAdapter]
            Custom[Custom Adapters]
        end
    end
    
    subgraph "External Systems"
        API1[External API 1]
        API2[External API 2]
        MCP[MCP Providers]
    end
    
    subgraph "Database"
        DB[(Supabase)]
        Tables[tenant_integrations<br/>integration_definitions<br/>integration_usage_logs<br/>mcp_actions]
    end
    
    UI --> Hooks
    Hooks --> TIS
    TIS --> IS
    IS --> AR
    AR --> BA
    AR --> SA
    BA --> Brreg
    SA --> N8n
    SA --> Custom
    
    Brreg --> API1
    N8n --> MCP
    Custom --> API2
    
    TIS --> DB
    IS --> Tables
    WS --> DB
    McpAS --> Tables
    
    style AR fill:#e1f5ff
    style IS fill:#e1f5ff
    style TIS fill:#e1f5ff
```

## Adapter Registry

AdapterRegistry er det sentrale registeret for alle integrasjonsadaptere. Det fungerer som et singleton-mønster som lar systemet dynamisk registrere, hente og administrere adaptere.

```mermaid
classDiagram
    class AdapterRegistry {
        -Map~string, IntegrationAdapter~ adapters
        +register(adapter: IntegrationAdapter) void
        +get(adapterId: string) IntegrationAdapter
        +getAll() IntegrationAdapter[]
        +has(adapterId: string) boolean
        +unregister(adapterId: string) boolean
    }
    
    class IntegrationAdapter {
        <<interface>>
        +id: string
        +name: string
        +description: string
        +setup(ctx, config) Promise~void~
        +invoke(ctx, action, payload) Promise~any~
        +validate(config) boolean
        +getRequiredFields() AdapterConfigField[]
        +getActions() AdapterAction[]
    }
    
    class StandardBaseAdapter {
        <<abstract>>
        #config: AdapterConfig
        +setup(ctx, config) Promise~void~
        +invoke(ctx, action, payload) Promise~any~
        +validate(config) boolean
        +isConfigured() boolean
        +getConfig() Partial~AdapterConfig~
    }
    
    class BaseAdapter {
        <<abstract>>
        #config: IntegrationConfig
        +call(endpoint, options) Promise~IntegrationResponse~
        +syncToDatabase(data) Promise~void~
        +shouldSync(entityId) Promise~boolean~
        #handleError(error, context) never
        #log(level, message, data) void
    }
    
    class BrregAdapter {
        +id: "brreg"
        +name: "Brønnøysund Register Centre"
        +invoke(ctx, action, payload) Promise~any~
        -searchEntities(query) Promise
        -getEntityDetails(orgnr) Promise
    }
    
    class N8nMcpAdapter {
        +id: string
        +name: string
        +invoke(ctx, action, payload) Promise~any~
        -executeWorkflow(workflowId, data) Promise
    }
    
    AdapterRegistry --> IntegrationAdapter
    IntegrationAdapter <|.. StandardBaseAdapter
    IntegrationAdapter <|.. BaseAdapter
    StandardBaseAdapter <|-- N8nMcpAdapter
    BaseAdapter <|-- BrregAdapter
```

## Standard Integrasjonsflyt

### 1. Setup-fase

```mermaid
sequenceDiagram
    actor Admin
    participant UI
    participant TIS as TenantIntegrationService
    participant AR as AdapterRegistry
    participant Adapter
    participant DB as Database
    
    Admin->>UI: Konfigurer integrasjon
    UI->>TIS: createIntegration(tenantId, config)
    TIS->>DB: Lagre konfigurasjon
    TIS->>AR: get(adapterId)
    AR-->>TIS: Adapter instance
    TIS->>Adapter: setup(ctx, config)
    Adapter->>Adapter: validate(config)
    alt Valid config
        Adapter-->>TIS: Setup OK
        TIS-->>UI: Success
        UI-->>Admin: Integrasjon aktivert
    else Invalid config
        Adapter-->>TIS: Validation error
        TIS-->>UI: Error message
        UI-->>Admin: Feilmelding
    end
```

### 2. Invoke-fase (Runtime)

```mermaid
sequenceDiagram
    actor User
    participant App
    participant IS as IntegrationService
    participant AR as AdapterRegistry
    participant Adapter
    participant External as External API
    participant DB as Database
    
    User->>App: Trigger action
    App->>IS: invoke(adapterId, action, payload)
    IS->>AR: get(adapterId)
    AR-->>IS: Adapter instance
    IS->>IS: Check rate limits
    IS->>Adapter: invoke(ctx, action, payload)
    Adapter->>External: API call
    External-->>Adapter: Response
    Adapter->>Adapter: Transform data
    Adapter-->>IS: Result
    IS->>DB: Log usage
    IS-->>App: Return result
    App-->>User: Display result
```

## MCP (Model Context Protocol) Integrasjon

MCP-integrasjonen lar systemet kommunisere med eksterne MCP-providers som n8n, Make, Zapier, eller egenutviklede løsninger.

```mermaid
graph TB
    subgraph "Application"
        McpClient[McpClient]
        McpService[McpActionRegistryService]
    end
    
    subgraph "Adapter Layer"
        N8nAdapter[N8nMcpAdapter]
        CustomMcp[Custom MCP Adapters]
    end
    
    subgraph "MCP Providers"
        N8n[n8n Workflows]
        Make[Make Scenarios]
        Zapier[Zapier Zaps]
    end
    
    subgraph "Database"
        McpActions[(mcp_actions)]
        TenantInt[(tenant_integrations)]
    end
    
    McpService --> McpClient
    McpClient --> N8nAdapter
    McpClient --> CustomMcp
    
    N8nAdapter --> N8n
    CustomMcp --> Make
    CustomMcp --> Zapier
    
    McpService --> McpActions
    McpService --> TenantInt
    
    style McpClient fill:#fff4e6
    style McpService fill:#fff4e6
```

### MCP Action Flow

```mermaid
sequenceDiagram
    participant App
    participant McpService
    participant McpClient
    participant Adapter as MCP Adapter
    participant Provider as MCP Provider
    participant DB
    
    App->>McpService: executeAction(actionKey, params)
    McpService->>DB: Hent action config
    DB-->>McpService: Action details
    McpService->>McpClient: invoke(provider, action, params)
    McpClient->>Adapter: execute(action, params)
    Adapter->>Provider: HTTP Request
    Provider-->>Adapter: Response
    Adapter->>Adapter: Transform response
    Adapter-->>McpClient: Result
    McpClient-->>McpService: Result
    McpService->>DB: Log execution
    McpService-->>App: Return result
```

## Webhook System

Webhook-systemet håndterer innkommende events fra eksterne systemer.

```mermaid
graph LR
    subgraph "External System"
        ES[External Service]
    end
    
    subgraph "Edge Function"
        WH[Webhook Endpoint]
        Auth[Verify Signature]
        Route[Route to Handler]
    end
    
    subgraph "Application"
        WS[WebhookService]
        Handler[Webhook Handler]
        Process[Process Event]
    end
    
    subgraph "Database"
        Logs[(webhook_logs)]
        Data[(Application Tables)]
    end
    
    ES -->|POST| WH
    WH --> Auth
    Auth --> Route
    Route --> WS
    WS --> Handler
    Handler --> Process
    Process --> Data
    WS --> Logs
    
    style WH fill:#ffe6e6
    style Handler fill:#ffe6e6
```

### Webhook Event Flow

```mermaid
sequenceDiagram
    participant Ext as External System
    participant Edge as Edge Function
    participant WS as WebhookService
    participant Handler as WebhookHandler
    participant DB as Database
    participant App as Application
    
    Ext->>Edge: POST /webhooks/{provider}
    Edge->>Edge: Verify signature
    Edge->>WS: processWebhook(provider, payload)
    WS->>DB: Log incoming webhook
    WS->>Handler: handle(payload)
    Handler->>Handler: Validate payload
    Handler->>DB: Update data
    Handler->>App: Trigger events
    Handler-->>WS: Processing result
    WS->>DB: Update log status
    WS-->>Edge: Response
    Edge-->>Ext: 200 OK
```

## Datamodell

```mermaid
erDiagram
    tenant_integrations ||--o{ integration_usage_logs : logs
    tenant_integrations ||--o{ vault_credentials : credentials
    tenant_integrations }o--|| integration_definitions : defined_by
    integration_definitions ||--o{ mcp_actions : has
    integration_definitions }o--|| provider_types : uses
    
    tenant_integrations {
        uuid id PK
        uuid tenant_id FK
        uuid integration_definition_id FK
        jsonb config
        string status
        timestamp created_at
    }
    
    integration_definitions {
        uuid id PK
        string key UK
        string name
        string integration_type
        jsonb default_config
        boolean is_system
    }
    
    provider_types {
        uuid id PK
        string key UK
        string name
        string category
    }
    
    mcp_actions {
        uuid id PK
        uuid integration_definition_id FK
        string action_key UK
        string name
        jsonb parameters_schema
    }
    
    integration_usage_logs {
        uuid id PK
        uuid tenant_integration_id FK
        string action
        jsonb request_payload
        jsonb response_data
        string status
        timestamp created_at
    }
    
    vault_credentials {
        uuid id PK
        uuid tenant_integration_id FK
        string key
        text encrypted_value
        timestamp expires_at
    }
```

## Adapter-typer

### BaseAdapter (Legacy)

Brukes for eldre integrasjoner som BrregAdapter. Støtter:
- HTTP API calls med retry-logikk
- Database-synkronisering
- Konsistent feilhåndtering
- Logging

**Eksempel:**
```typescript
class BrregAdapter extends BaseAdapter<BrregConfig> {
  name = 'brreg';
  
  async call(endpoint: string, options?: IntegrationCallOptions) {
    // HTTP request logic
  }
  
  async syncToDatabase(data: any) {
    // Save to Supabase
  }
}
```

### StandardAdapter (Modern)

Nyere adaptere bruker StandardAdapter som støtter:
- RequestContext (tenantId, userId, roles)
- Konfigurasjonsskjema
- Action-basert API
- Validering

**Eksempel:**
```typescript
class N8nMcpAdapter extends StandardBaseAdapter {
  id = 'n8n-mcp';
  name = 'n8n MCP Provider';
  
  async invoke(ctx: RequestContext, action: string, payload: any) {
    switch(action) {
      case 'execute-workflow':
        return this.executeWorkflow(payload);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
  
  getRequiredFields() {
    return [
      { key: 'baseUrl', label: 'n8n URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true }
    ];
  }
}
```

## Rate Limiting

```mermaid
flowchart TD
    Start([Invoke Integration]) --> CheckConfig{Config has<br/>rate limit?}
    CheckConfig -->|No| Execute[Execute Action]
    CheckConfig -->|Yes| GetUsage[Hent siste bruk fra logs]
    GetUsage --> CheckRate{Innenfor<br/>grense?}
    CheckRate -->|Ja| Execute
    CheckRate -->|Nei| Wait[Vent til neste slot]
    Wait --> Execute
    Execute --> Log[Logg bruk]
    Log --> End([Return Result])
    
    style CheckRate fill:#ffe6e6
    style Wait fill:#ffe6e6
```

## Secrets Management

```mermaid
graph TB
    subgraph "Application Layer"
        App[Application]
        Service[TenantIntegrationService]
    end
    
    subgraph "Secrets Layer"
        Get[getTenantSecrets]
        Set[setTenantSecrets]
    end
    
    subgraph "Storage"
        Vault[(Supabase Vault)]
        Creds[(vault_credentials)]
    end
    
    App --> Service
    Service --> Get
    Service --> Set
    Get --> Vault
    Set --> Vault
    Get --> Creds
    Set --> Creds
    
    style Vault fill:#e6ffe6
    style Creds fill:#e6ffe6
```

API-nøkler og andre hemmeligheter lagres kryptert i Supabase Vault:

```typescript
// Lagre secret
await setTenantSecrets(tenantId, integrationId, {
  apiKey: 'secret-value',
  clientSecret: 'another-secret'
});

// Hente secret
const secrets = await getTenantSecrets(tenantId, integrationId);
console.log(secrets.apiKey); // Dekryptert verdi
```

## Brukseksempler

### 1. Registrere ny adapter

```typescript
import { adapterRegistry } from '@/modules/core/integrations/services/AdapterRegistry';
import { MyCustomAdapter } from './adapters/MyCustomAdapter';

// Opprett og registrer adapter
const adapter = new MyCustomAdapter({
  enabled: true,
  apiKey: 'xyz',
  baseUrl: 'https://api.example.com'
});

adapterRegistry.register(adapter);
```

### 2. Bruke en adapter

```typescript
import { adapterRegistry } from '@/modules/core/integrations/services/AdapterRegistry';

const ctx = {
  tenantId: 'tenant-123',
  userId: 'user-456',
  roles: ['admin']
};

const adapter = adapterRegistry.get('my-custom-adapter');
const result = await adapter.invoke(ctx, 'search', { query: 'test' });
```

### 3. Opprette tenant-integrasjon

```typescript
import { TenantIntegrationService } from '@/modules/core/integrations';

await TenantIntegrationService.create({
  tenantId: 'tenant-123',
  integrationDefinitionId: 'def-456',
  config: {
    enabled: true,
    apiKey: 'secret-key',
    baseUrl: 'https://api.example.com'
  }
});
```

## Best Practices

### 1. Adapter Development
- **Enkelt ansvar**: Hver adapter skal kun håndtere én tjeneste
- **Valider alltid**: Bruk `validate()` for å sjekke konfigurasjon før bruk
- **Logging**: Logg alle API-kall for debugging
- **Feilhåndtering**: Bruk `handleError()` for konsistent feilhåndtering

### 2. Configuration
- **Secrets**: Lagre API-nøkler i Vault, aldri i config
- **Defaults**: Definer fornuftige standardverdier
- **Schema**: Bruk JSON Schema for å validere konfigurasjon

### 3. Rate Limiting
- **Respekter grenser**: Implementer rate limiting basert på leverandørens grenser
- **Retry logic**: Implementer exponential backoff for feilede forespørsler
- **Circuit breaker**: Stopp forespørsler midlertidig ved gjentatte feil

### 4. Security
- **Credentials rotation**: Støtt oppdatering av credentials uten nedetid
- **Scoped access**: Bruk RequestContext for å begrense tilgang
- **Audit logging**: Logg alle integrasjonshandlinger

## Testing

### Unit Tests
```typescript
describe('MyCustomAdapter', () => {
  it('should validate config correctly', () => {
    const adapter = new MyCustomAdapter();
    expect(adapter.validate({ apiKey: 'test' })).toBe(true);
    expect(adapter.validate({})).toBe(false);
  });
  
  it('should invoke actions', async () => {
    const adapter = new MyCustomAdapter({ apiKey: 'test' });
    const result = await adapter.invoke(ctx, 'search', { query: 'test' });
    expect(result).toBeDefined();
  });
});
```

### Integration Tests
```typescript
describe('Integration Flow', () => {
  it('should register and use adapter', async () => {
    const adapter = new MyCustomAdapter({ apiKey: 'test' });
    adapterRegistry.register(adapter);
    
    const retrieved = adapterRegistry.get('my-custom-adapter');
    expect(retrieved).toBe(adapter);
    
    const result = await retrieved.invoke(ctx, 'search', { query: 'test' });
    expect(result).toBeDefined();
  });
});
```

## Videre Utvikling

- [ ] GraphQL-støtte for adaptere
- [ ] Caching-lag for API-kall
- [ ] Batch operations support
- [ ] Webhook transformation pipeline
- [ ] Integration marketplace
- [ ] Self-service adapter registration
