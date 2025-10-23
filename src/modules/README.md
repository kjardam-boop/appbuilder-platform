# Modules

This directory contains the modular architecture for the application. Each module is self-contained with its own types, services, hooks, and components.

## 🎯 Available Modules

### ✅ Company Module (`src/modules/company/`)
**Status:** Implemented

Handles all company-related functionality including:
- Company search and lookup
- Company metadata management
- Integration with Brønnøysundregistrene
- Financial data and hierarchy

**Key exports:**
```typescript
import { 
  useCompany, 
  useCompanySearch, 
  CompanyCard, 
  CompanyService 
} from '@/modules/company';
```

**Edge Functions:**
- `brreg-lookup` - Search companies
- `brreg-enhanced-lookup` - Get contact info
- `brreg-company-details` - Full company data
- `brreg-regnskaplookup` - Financial statements
- `brreg-konsern-lookup` - Company hierarchy

### ✅ AI Module (`src/modules/ai/`)
**Status:** Implemented

Centralized AI functionality including:
- Chat interfaces
- Text generation
- Field assistance
- Data analysis

**Key exports:**
```typescript
import { 
  useAIChat, 
  useAIGeneration, 
  useFieldAssist,
  useAIAnalysis,
  AIChatInterface,
  AIGenerationButton 
} from '@/modules/ai';
```

**Edge Functions:**
- `ai-assistant` - General chat assistant
- `field-chat-assist` - Field-specific help
- `generate-text` - Text generation
- `analyze-data` - Data analysis
- `generate-company-description` - Company descriptions
- `generate-from-questionnaire` - Questionnaire-based generation

### ✅ Project Module (`src/modules/project/`)
**Status:** Implemented

Project management and workflow including supplier management:
- Project CRUD operations
- Requirements management
- Stakeholder management
- Milestones and phases
- **Supplier management** (long list, short list, evaluation)
- **Supplier performance tracking**

**Key exports:**
```typescript
import { 
  useProject, 
  useUserProjects,
  useProjectSuppliers,
  useSupplierPerformance,
  SupplierCard,
  SupplierStatusBadge,
  ProjectService,
  PROJECT_PHASES 
} from '@/modules/project';
```

**Database Tables:**
- `projects`
- `project_requirements`
- `project_stakeholders`
- `project_milestones`
- `project_evaluations`
- `project_suppliers`
- `supplier_performance`

### ✅ Document Module (`src/modules/document/`)
**Status:** Implemented (Basic)

Document management:
- Document storage
- Phase-specific documents
- Document versioning (planned)

**Key exports:**
```typescript
import { 
  useProjectDocuments,
  DocumentService 
} from '@/modules/document';
```

**Database Tables:**
- `documents`
- `document_versions` (planned)

### ✅ Auth Module (`src/modules/auth/`)
**Status:** Deprecated (Use User Module)

Legacy authentication services. Use `@/modules/user` instead.

**Deprecated exports:**
```typescript
// Use UserService instead
import { AuthService } from '@/modules/auth';
```

### ✅ User Module (`src/modules/user/`)
**Status:** Implemented

Complete user management system including:
- Authentication (sign in, sign up, sign out)
- User profiles
- Role-based access control (admin, moderator, user)
- User administration UI

**Key exports:**
```typescript
import { 
  useAuth,
  useCurrentUser,
  useAdminRole,
  UserService,
  UserList,
  UserRoleBadge
} from '@/modules/user';
```

**Database Tables:**
- `profiles`
- `user_roles`

**Pages:**
- `/auth` - Sign in/sign up
- `/admin/users` - User management (admin only)

### ✅ Company Module - CRM and Supplier Features
**Status:** Integrated into Company Module

Extended company functionality including:
- **CRM status tracking** (prospect, qualified_lead, customer, former_customer, partner)
- **Customer interaction tracking** (meetings, emails, calls)
- **Company segmentation**
- **Customer scoring** via CompanyMetadata
- **Company roles** (supplier, customer, partner)
- **Approved supplier status**
- **Supplier certifications**

**Key additions:**
- Types: `CustomerInteraction`, `CRM_STATUSES`, `INTERACTION_TYPES`, `CompanyRole`, `COMPANY_ROLES`
- Hooks: `useCompanyInteractions`
- Service methods: 
  - CRM: `updateCRMStatus`, `getInteractions`, `addInteraction`, `updateSegment`
  - Supplier: `updateCompanyRoles`, `toggleApprovedSupplier`, `updateSupplierCertifications`, `getApprovedSuppliers`, `getCompaniesByRole`

**Database Tables:**
- `customer_interactions`
- `companies` (with `company_roles`, `is_approved_supplier`, `supplier_certifications` fields)

## 🏗️ Module Structure

Each module follows this standard structure:

```
src/modules/{module-name}/
├── hooks/           # React hooks for data and state
├── components/      # UI components
├── services/        # Business logic and API calls
├── types/          # TypeScript types and interfaces
├── utils/          # Helper functions (optional)
└── index.ts        # Public API exports
```

## 🔧 Core Infrastructure

### Module Registry (`src/core/moduleRegistry.ts`)
Central registry for managing modules:
```typescript
import ModuleRegistry from '@/core/moduleRegistry';

// Check if module is enabled
if (ModuleRegistry.isEnabled('company')) {
  // Use company module
}

// Get all enabled modules
const enabled = ModuleRegistry.getEnabled();
```

### Event Bus (`src/core/eventBus.ts`)
Pub/sub system for inter-module communication:
```typescript
import EventBus from '@/core/eventBus';

// Emit event
EventBus.emit('company.selected', { companyId: '123' });

// Listen to event
EventBus.on('company.selected', (data) => {
  console.log('Company selected:', data.companyId);
});
```

## 📦 Adding a New Module

1. **Create directory structure:**
```bash
mkdir -p src/modules/new-module/{hooks,components,services,types}
```

2. **Define types** in `types/*.types.ts`

3. **Create service layer** in `services/*Service.ts`

4. **Build hooks** in `hooks/*.ts`

5. **Create components** in `components/*.tsx`

6. **Export public API** in `index.ts`:
```typescript
export const NEW_MODULE = {
  name: 'new-module',
  version: '1.0.0',
  description: 'Module description',
} as const;
```

7. **Register** in `src/core/index.ts`:
```typescript
import { NEW_MODULE } from '@/modules/new-module';
ModuleRegistry.register({ ...NEW_MODULE, enabled: true });
```

## 🎯 Best Practices

### ✅ DO:
- Keep modules loosely coupled
- Use EventBus for cross-module communication
- Export only what's needed via `index.ts`
- Write comprehensive types
- Handle errors gracefully
- Use semantic versioning

### ❌ DON'T:
- Import internal module files directly (use the module's index.ts)
- Create circular dependencies between modules
- Store module state globally (use React context or hooks)
- Mix business logic with UI components

## 🔗 Module Dependencies

```
User Module (base layer)
    ↓
Company Module (with CRM & supplier roles) ← AI Module
    ↓                                           ↓
Project Module (with supplier mgmt) ←─────────┘
    ↓
Document Module
```

## 📊 Module Status Summary

| Module | Status | Components | Hooks | Services | Edge Functions |
|--------|--------|------------|-------|----------|----------------|
| User | ✅ Implemented | 2 | 3 | 1 | 0 |
| Company | ✅ Implemented + CRM + Roles | 3 | 3 | 1 | 5 |
| AI | ✅ Implemented | 2 | 4 | 1 | 6 |
| Project | ✅ Implemented + Suppliers | 2 | 4 | 1 | 0 |
| Document | ✅ Basic | 0 | 1 | 1 | 0 |
| Auth | ⚠️ Deprecated | 0 | 0 | 1 | 0 |

### ✅ Tasks Module (`src/modules/tasks/`)
**Status:** Implemented

Cross-cutting task management:
- Polymorphic tasks (company, project, opportunity, user)
- Checklist items with auto-completion tracking
- Task categories (admin-configurable)
- Priority and status tracking
- Due dates and assignments

**Key exports:**
```typescript
import { 
  TaskService,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS
} from '@/modules/tasks';
```

**Database Tables:**
- `tasks`
- `task_checklist_items`
- `task_categories`

### ✅ Opportunity Module (`src/modules/opportunity/`)
**Status:** Implemented

Sales pipeline management:
- Opportunity stages (prospecting → closed_won/lost)
- Product management (hierarchical categories)
- Activity timeline
- Sales forecasting (multiple timeframes)
- Auto-conversion to projects

**Key exports:**
```typescript
import { 
  OpportunityService,
  ProductService,
  OPPORTUNITY_STAGE_LABELS
} from '@/modules/opportunity';
```

**Database Tables:**
- `opportunities`
- `opportunity_products`
- `opportunity_activities`
- `products`

### ✅ Admin Module (`src/modules/admin/`)
**Status:** Implemented

Administrative tools:
- Task category management
- Product management (planned)
- System configuration (planned)

**Key exports:**
```typescript
import { 
  TaskCategoryManager
} from '@/modules/admin';
```

## 🔗 Module Dependencies

```
                    ┌─────────┐
                    │  Tasks  │ (Cross-cutting)
                    └─────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────┐    ┌──────────────┐    ┌─────────┐
│ Company  │◄───│ Opportunity  │    │ Project │
│ + CRM    │    └──────────────┘    │ + Supp  │
└──────────┘            │            └─────────┘
       ▲                └────────────────┘
       │                (convert to)
       │
┌──────────┐    ┌──────────┐    ┌────────┐
│   User   │    │    AI    │    │  Admin │
└──────────┘    └──────────┘    └────────┘
```

## 📊 Module Status Summary

| Module | Status | Components | Hooks | Services |
|--------|--------|------------|-------|----------|
| User | ✅ Implemented | 2 | 3 | 1 |
| Company | ✅ Implemented + CRM | 3 | 3 | 1 |
| AI | ✅ Implemented | 2 | 4 | 1 |
| Project | ✅ Implemented + Suppliers | 2 | 4 | 1 |
| Document | ✅ Basic | 0 | 1 | 1 |
| Tasks | ✅ Implemented | 0 | 0 | 1 |
| Opportunity | ✅ Implemented | 0 | 0 | 2 |
| Admin | ✅ Basic | 1 | 0 | 0 |
| Auth | ⚠️ Deprecated | 0 | 0 | 1 |
