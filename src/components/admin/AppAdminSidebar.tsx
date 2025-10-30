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
      { title: "Applications", url: "/admin/applications", icon: Package },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Integrations", url: "/admin/integrations", icon: Plug },
      { title: "Security", url: "/admin/security", icon: Shield },
      { title: "Database Tools", url: "/admin/database", icon: Database },
    ],
  },
];

export default function AppAdminSidebar() {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b">
        {state === "expanded" && <h2 className="text-lg font-semibold">Admin Panel</h2>}
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
                            ? "bg-muted text-primary font-medium"
                            : "hover:bg-muted/50"
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
