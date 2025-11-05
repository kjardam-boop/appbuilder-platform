export {
  createTestQueryClient,
  createQueryWrapper,
  createRouterWrapper,
  createWrapper,
  createMockRole,
  mockSupabaseAuth,
  mockSupabaseTable,
  waitForDataLoad,
  renderWithProviders,
  createMockContext,
  createMockProfile,
  type MockRole,
} from "./testSetup";

export {
  expectTableRow,
  expectRoleBadge,
  expectScopeDisplay,
  expectLoadingState,
  expectUserProfile,
  expectStatistics,
  expectErrorMessage,
  expectItemCount,
  expectPermissionGranted,
  expectPermissionDenied,
  expectRoleInScope,
} from "./assertions";
