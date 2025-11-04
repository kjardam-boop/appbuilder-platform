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
} from "lucide-react";

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
      { title: "Tenants", url: "/admin/tenants", icon: Building2 },
      { title: "Users & Roles", url: "/admin/users", icon: Users },
      { title: "Role Overview", url: "/admin/roles", icon: Shield },
      { title: "Role Configuration", url: "/admin/roles/config", icon: Settings },
      { title: "Companies", url: "/admin/companies", icon: Building2 },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Content Management",
    items: [
      { title: "Industries", url: "/admin/industries", icon: Briefcase },
      { title: "App Catalog", url: "/admin/apps", icon: Package },
      { title: "External Systems", url: "/admin/applications", icon: Server },
      { title: "Capabilities", url: "/admin/capabilities", icon: Package },
    ],
  },
  {
    title: "Integrations (MCP)",
    items: [
      { title: "Policy Configuration", url: "/admin/mcp/policy", icon: Shield },
      { title: "Workflow Mappings", url: "/admin/mcp/workflows", icon: Plug },
      { title: "Secrets & Signing", url: "/admin/mcp/secrets", icon: Shield },
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

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {state === "expanded" && <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h2>}
        {/* No SidebarTrigger here; global header hosts the trigger */}
      </div>

      <SidebarContent>
        {adminNavItems.map((section) => (
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
                        end={item.end}
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
