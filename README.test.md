# Testing Guide

## Oversikt

Dette prosjektet bruker Vitest som test-rammeverk med React Testing Library for komponenttesting.

## Installasjon

Test-avhengigheter er allerede installert. For å legge til test-scripts i package.json, legg til følgende i `scripts`-seksjonen:

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Kjøre tester

```bash
# Kjør alle tester én gang
npm test

# Kjør tester i watch mode (re-kjører ved filendringer)
npm run test:watch

# Kjør tester med coverage-rapport
npm run test:coverage

# Åpne Vitest UI (visuell test-runner)
npm run test:ui
```

## Teststruktur

Tester ligger i `__tests__`-mapper ved siden av koden de tester:

```
src/
  modules/
    core/
      user/
        services/
          userService.ts
          __tests__/
            userService.test.ts
```

## Test-kategorier

### Unit Tests
Tester individuelle funksjoner og klasser isolert:
- Services (RoleService, UserService, CompanyService)
- Utilities
- Helper-funksjoner

### Integration Tests
Tester samspill mellom flere komponenter:
- API-kall med mocked Supabase
- Hooks med context
- Service-lag med database-interaksjon

### Component Tests
Tester React-komponenter:
- Rendering
- Brukerinteraksjon
- State-håndtering

## Eksempler

### Testing en service

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserService } from "../userService";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client");

describe("UserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return current user", async () => {
    // Mock setup
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "123", email: "test@test.com" } },
      error: null,
    } as any);

    // Test
    const user = await UserService.getCurrentUser();
    
    // Assert
    expect(user).toBeTruthy();
    expect(user?.email).toBe("test@test.com");
  });
});
```

### Testing en hook

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../useAuth";

describe("useAuth", () => {
  it("should handle authentication", async () => {
    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.session).toBeTruthy();
  });
});
```

### Testing en komponent

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  it("should handle clicks", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText("Click me"));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

## Mocking

### Supabase Client

Supabase-klienten er automatisk mocked i `src/test/setup.ts`. Du kan overstyre mocks i individuelle tester:

```typescript
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ data: mockData, error: null }),
} as any);
```

### Context

Bruk `createMockContext` fra `src/test/mocks/supabase.ts`:

```typescript
import { createMockContext } from "@/test/mocks/supabase";

const mockContext = createMockContext({
  tenantId: "custom-tenant-id",
  roles: ["admin"],
});
```

## Best Practices

1. **Arrange-Act-Assert**: Strukturer tester med tydelig oppsett, handling og påstand
2. **Isolering**: Hver test skal være uavhengig av andre
3. **Cleanup**: Bruk `beforeEach` og `afterEach` for å rydde opp
4. **Descriptive names**: Bruk beskrivende testnavn som forklarer hva som testes
5. **Test edge cases**: Test ikke bare happy path, men også feilsituasjoner
6. **Mock external dependencies**: Mock alltid eksterne avhengigheter som API-kall

## Coverage-mål

- **Minimum**: 70% coverage på kritiske moduler
- **Mål**: 80-90% coverage på business logic
- **Focus areas**:
  - Authentication og autorisasjon (100%)
  - Rollehåndtering (100%)
  - Data persistence services (90%)
  - Tenant isolation (100%)

## Continuous Integration

Tester kjøres automatisk ved:
- Push til feature branches
- Pull requests
- Merge til main

CI vil feile hvis:
- Coverage faller under minimum threshold
- Noen tester feiler
- Linting-feil

## Debugging Tests

```bash
# Kjør en enkelt test-fil
npm test -- userService.test.ts

# Kjør tester som matcher pattern
npm test -- --grep "RoleService"

# Kjør med debugger
node --inspect-brk node_modules/.bin/vitest
```

## Neste steg

1. Legg til flere component tests
2. Implementer E2E-tester med Playwright
3. Sett opp visual regression testing
4. Integrer med CI/CD pipeline
