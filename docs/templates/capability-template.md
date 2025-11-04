# [Capability Name]

## 📝 Overview
[1-2 sentences describing what this capability does and its primary purpose]

## 🎯 Use Cases
- **[Use Case 1]**: [Brief description]
- **[Use Case 2]**: [Brief description]
- **[Use Case 3]**: [Brief description]

## 🚀 Quick Start

### Installation
This capability is part of the core platform and available by default.

### Basic Usage
```typescript
// Example code showing the simplest way to use this capability
import { useExample } from "@/modules/core/[module]/hooks/useExample";

function MyComponent() {
  const { data, isLoading } = useExample();
  
  return <div>{/* Your UI */}</div>;
}
```

## 📊 Data Model

### Database Tables
[List of tables this capability uses - auto-populated from `domain_tables`]

### Key Relationships
[Describe how tables relate to each other]

## 🔌 API Reference

### React Hooks
[Auto-generated from `hooks` field]

**`useExample()`**
- **Purpose**: [What it does]
- **Returns**: [Return type and description]
- **Example**: [Code example]

### Services
[List key service functions]

**`ServiceName.methodName()`**
- **Parameters**: [List parameters]
- **Returns**: [Return type]
- **Example**: [Code example]

### Edge Functions
[List from `backend_files`]

## 🔧 Configuration

### Environment Variables
[If applicable, list required environment variables]

```bash
VITE_EXAMPLE_VAR=value
```

### Required Secrets
[If applicable, list secrets needed via Lovable Cloud]

### RLS Policies
[Brief description of Row Level Security policies]

## 💡 Examples

### Example 1: [Common Use Case]
```typescript
// Practical example showing a common scenario
```

### Example 2: [Advanced Use Case]
```typescript
// More complex example with error handling
```

## 🔗 Dependencies
[Auto-generated from `dependencies` field]

This capability requires:
- [Dependency 1]: [Why it's needed]
- [Dependency 2]: [Why it's needed]

## 🏗️ Technical Implementation

### Frontend Files
[List from `frontend_files`]

### Backend Files
[List from `backend_files`]

### Database Migrations
[List from `database_migrations`]

## 🔐 Security Considerations
[Important security notes, RLS policies, authentication requirements]

## 🐛 Troubleshooting

### Common Issues
**Issue**: [Problem description]
**Solution**: [How to fix]

## 📝 Version History
[Link to version history in UI or database]

---
*Part of the Lovable Platform • Last updated: [auto-generated date]*
