import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import Header from "@/components/Dashboard/Header";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";

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
      { title: "Companies", url: "/admin/companies", icon: Building2 },
      { title: "System Settings", url: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Content Management",
    items: [
      { title: "Industries", url: "/admin/industries", icon: Briefcase },
      { title: "Applications", url: "/admin/applications", icon: Package },
      { title: "ERP Systems", url: "/admin/erp-systems", icon: Database },
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

function AdminSidebar() {
  const { state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b">
        {state === "expanded" && <h2 className="text-lg font-semibold">Admin Panel</h2>}
        <SidebarTrigger className="ml-auto" />
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

export default function Admin() {
  const { isPlatformAdmin, isLoading } = usePlatformAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isPlatformAdmin) {
      navigate("/dashboard");
    }
  }, [isPlatformAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Access denied. You need platform administrator privileges to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        userEmail={user?.email}
      />
      <SidebarProvider defaultOpen={true}>
        <div className="flex w-full">
          <AdminSidebar />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}
