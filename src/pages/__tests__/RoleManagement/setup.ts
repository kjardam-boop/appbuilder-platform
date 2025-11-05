import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { RoleService } from "@/modules/core/user/services/roleService";
import { UserRoleRecord, RoleScope } from "@/modules/core/user/types/role.types";

export const mockProfiles = [
  {
    id: "user-1",
    user_id: "user-1",
    email: "kjardam@gmail.com",
    full_name: "Kjetil Jardam",
  },
  {
    id: "user-2",
    user_id: "user-2",
    email: "kjetil@jardam.no",
    full_name: "Kjetil Johan Jardam",
  },
];

export const createEmptyRolesByScope = (): Record<RoleScope, UserRoleRecord[]> => ({
  platform: [],
  tenant: [],
  company: [],
  project: [],
  app: [],
});

export const setupBasicMocks = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockResolvedValue({
    data: mockProfiles,
    error: null,
  });

  vi.mocked(supabase.from).mockReturnValue({
    select: mockSelect,
    order: mockOrder,
  } as any);

  vi.mocked(RoleService.getUserRolesByScope).mockImplementation(
    async () => createEmptyRolesByScope()
  );

  vi.mocked(RoleService.revokeRole).mockResolvedValue();
};

export const setupErrorMocks = () => {
  const mockSelect = vi.fn().mockReturnThis();
  const mockOrder = vi.fn().mockResolvedValue({
    data: null,
    error: new Error("Database error"),
  });

  vi.mocked(supabase.from).mockReturnValue({
    select: mockSelect,
    order: mockOrder,
  } as any);
};
