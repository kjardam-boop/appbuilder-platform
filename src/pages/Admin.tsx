import { Outlet } from "react-router-dom";

/**
 * Admin layout component
 * 
 * Access control is now handled by:
 * 1. GlobalLayout in App.tsx (shows/hides admin sidebar)
 * 2. PermissionProtectedRoute (per-route permission checks)
 * 
 * This component just renders the outlet for nested routes.
 */
export default function Admin() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 space-y-6">
        <Outlet />
      </div>
    </div>
  );
}
