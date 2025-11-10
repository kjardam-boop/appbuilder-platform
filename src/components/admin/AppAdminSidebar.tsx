import { useMemo } from "react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  Shield,
  Database,
  Briefcase,
  Package,
  Plug,
  Server,
  Archive,
  Sparkles,
  Network,
  FolderKanban,
  Target,
  Truck,
  CheckSquare,
  Bookmark,
  Wrench,
} from "lucide-react";
import { useUserPermissions } from "@/modules/core/permissions/hooks/useUserPermissions";
import { adminNavigationMapping } from "@/config/adminNavigation";

const adminNavItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Platform Management",
    items: [
      { title: "Tenant Admin", url: "/admin/tenants", icon: Building2 },
      { title: "Users & Roles", url: "/admin/users", icon: Users },
      { title: "Role Overview", url: "/admin/roles", icon: Shield },
      { title: "Role Configuration", url: "/admin/roles/config", icon: Settings },
      { title: "Companies", url: "/admin/companies", icon: Building2 },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Business Management",
    items: [
      { title: "Projects", url: "/projects", icon: FolderKanban },
      { title: "Opportunities", url: "/opportunities", icon: Target },
    ],
  },
  {
    title: "Companies",
    items: [
      { title: "Lagrede selskaper", url: "/admin/companies", icon: Bookmark },
      { title: "Kunder", url: "/customers", icon: Users },
      { title: "Systemleverandører", url: "/system-vendors", icon: Server },
      { title: "Implementeringspartnere", url: "/implementation-partners", icon: Wrench },
    ],
  },
  {
    title: "Content Management",
    items: [
      { title: "Industries", url: "/admin/industries", icon: Briefcase },
      { title: "App Catalog", url: "/admin/apps", icon: Package },
      { title: "App Vendors", url: "/admin/app-vendors", icon: Briefcase },
      { title: "External Systems", url: "/admin/external-systems", icon: Server },
      { title: "Capabilities", url: "/admin/capabilities", icon: Package },
    ],
  },
  {
    title: "Integrations (MCP)",
    items: [
      { title: "Policy Configuration", url: "/admin/mcp/policy", icon: Shield },
      { title: "Workflow Mappings", url: "/admin/mcp/workflows", icon: Plug },
      { title: "Secrets & Signing", url: "/admin/mcp/secrets", icon: Shield },
      { title: "Observability", url: "/admin/mcp/observability", icon: Plug },
      { title: "Compatibility", url: "/admin/compatibility", icon: Package },
      { title: "Categories", url: "/admin/categories", icon: Package },
      { title: "Tenant Systems", url: "/admin/tenant-systems", icon: Building2 },
      { title: "Performance Test", url: "/admin/performance-test", icon: CheckSquare },
      { title: "Recommendations", url: "/admin/integration-recommendations", icon: Sparkles },
      { title: "Integration Graph", url: "/admin/integration-graph", icon: Network },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Integrations", url: "/admin/integrations", icon: Plug },
      { title: "Security", url: "/admin/security", icon: Shield },
      { title: "Seed Database", url: "/admin/database", icon: Database },
      { title: "Archived Resources", url: "/admin/archived", icon: Archive },
    ],
  },
];

export default function AppAdminSidebar() {
  const { state } = useSidebar();
  const { data: permissions } = useUserPermissions();

  // Filter navigation items based on user permissions
  const visibleNavItems = useMemo(() => {
    if (!permissions) return [];

    return adminNavItems
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          const requirement = adminNavigationMapping[item.url];
          
          // No requirement = always visible
          if (!requirement || !requirement.resource) return true;
          
          // Check if user has required permission
          return permissions.some(p => 
            p.resource_key === requirement.resource &&
            (p.action_key === requirement.requiredAction || p.action_key === 'admin')
          );
        })
      }))
      .filter(section => section.items.length > 0); // Remove empty sections
  }, [permissions]);

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {state === "expanded" && <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h2>}
        {/* No SidebarTrigger here; global header hosts the trigger */}
      </div>

      <SidebarContent>
        {visibleNavItems.map((section) => (
          <SidebarGroup key={section.title}>
            {state === "expanded" && (
              <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                       <NavLink
                        to={item.url}
                        end={('end' in item && item.end) === true}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        {state === "expanded" && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
