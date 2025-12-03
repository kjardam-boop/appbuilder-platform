import { useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Bookmark,
  Wrench,
  Key,
  BookOpen,
  FileText,
  ChevronRight,
  Wand2,
  Factory,
  UserCog,
  Mail,
  Activity,
  Bot,
  Lock,
  Code2,
  TestTube,
  Palette,
  Workflow,
  Eye,
  Layers,
  Store,
  Building,
  Handshake,
  UserCheck,
} from "lucide-react";
import { useUserPermissions } from "@/modules/core/permissions/hooks/useUserPermissions";
import { adminNavigationMapping } from "@/config/adminNavigation";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url?: string;
  icon: any;
  end?: boolean;
  badge?: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  icon: any;
  defaultOpen?: boolean;
  items: NavItem[];
}

/**
 * Reorganized Admin Navigation
 * 
 * Structure based on user workflows:
 * 1. Overview - Quick access
 * 2. App Factory - App creation and management (NEW!)
 * 3. Tenants - Multi-tenancy management
 * 4. Users & Access - IAM
 * 5. Integrations - External connections
 * 6. Content - Catalogs and content
 * 7. Platform - Settings and configuration
 * 8. Developer - Dev tools
 */
const adminNavItems: NavSection[] = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "App Factory",
    icon: Factory,
    defaultOpen: true,
    items: [
      { title: "App Wizard", url: "/admin/apps/wizard", icon: Wand2, badge: "NEW" },
      { title: "App Projects", url: "/admin/apps/projects", icon: FolderKanban },
      { title: "App Catalog", url: "/admin/apps", icon: Package },
      { title: "External Systems", url: "/admin/external-systems", icon: Server },
      { title: "Capabilities", url: "/admin/capabilities", icon: Layers },
      { title: "System Vendors", url: "/admin/app-vendors", icon: Store },
    ],
  },
  {
    title: "Tenants",
    icon: Building2,
    items: [
      { title: "Tenant Management", url: "/admin/tenants", icon: Building2 },
      { title: "Tenant Systems", url: "/admin/tenant-systems", icon: Server },
    ],
  },
  {
    title: "Users & Access",
    icon: UserCog,
    items: [
      { title: "User Management", url: "/admin/users", icon: Users },
      { title: "Invitations", url: "/admin/invitations", icon: Mail },
      { title: "Role Overview", url: "/admin/roles", icon: Shield },
      { title: "Role Configuration", url: "/admin/roles/config", icon: Settings },
      { title: "Permission Health", url: "/admin/permissions/health", icon: Activity },
    ],
  },
  {
    title: "Integrations",
    icon: Plug,
    items: [
      { title: "Integrations Hub", url: "/admin/integrations", icon: Plug },
      { title: "n8n Workflows", url: "/admin/n8n/workflows", icon: Workflow },
      { title: "Odoo CRM", url: "/admin/integrations/odoo", icon: Building2 },
      { title: "Credentials", url: "/admin/credentials", icon: Key },
    ],
  },
  {
    title: "Companies & CRM",
    icon: Building,
    items: [
      { title: "All Companies", url: "/companies", icon: Building2 },
      { title: "Saved Companies", url: "/admin/companies", icon: Bookmark },
      { title: "Customers", url: "/customers", icon: UserCheck },
      { title: "Partners", url: "/implementation-partners", icon: Handshake },
      { title: "System Vendors", url: "/system-vendors", icon: Server },
    ],
  },
  {
    title: "Content & Catalogs",
    icon: BookOpen,
    items: [
      { title: "Industries", url: "/admin/industries", icon: Briefcase },
      { title: "AI Content Library", url: "/admin/content-library", icon: FileText },
      { title: "Documentation", url: "/admin/documentation", icon: BookOpen },
    ],
  },
  {
    title: "Platform Settings",
    icon: Settings,
    items: [
      { title: "System Settings", url: "/admin/settings", icon: Settings },
      { title: "AI Providers", url: "/admin/ai-providers", icon: Bot },
      { title: "MCP Policy", url: "/admin/mcp/policy", icon: Shield },
      { title: "MCP Secrets", url: "/admin/mcp/secrets", icon: Lock },
    ],
  },
  {
    title: "Developer Tools",
    icon: Code2,
    items: [
      { title: "Seed Database", url: "/admin/database", icon: Database },
      { title: "Run Migrations", url: "/admin/run-migrations", icon: Database },
      { title: "Database Naming", url: "/admin/database/naming", icon: Database },
      { title: "Performance Test", url: "/admin/performance-test", icon: TestTube },
      { title: "AI MCP Demo", url: "/admin/ai/mcp-demo", icon: Bot },
      { title: "Archived Resources", url: "/admin/archived", icon: Archive },
    ],
  },
];

// Check if any item in a section matches the current path
function useIsActiveSection(items: NavItem[], pathname: string): boolean {
  return items.some(item => {
    if (item.url && pathname.startsWith(item.url)) return true;
    if (item.children) {
      return item.children.some(child => child.url && pathname.startsWith(child.url));
    }
    return false;
  });
}

// Recursive nav item renderer
function NavItemRenderer({ 
  item, 
  sidebarState, 
  permissions,
  depth = 0 
}: { 
  item: NavItem; 
  sidebarState: string;
  permissions: any[];
  depth?: number;
}) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Check permission
  const hasPermission = useMemo(() => {
    if (!item.url) return true;
    const requirement = adminNavigationMapping[item.url];
    if (!requirement || !requirement.resource) return true;
    return permissions.some((p: any) => 
      p.resource_key === requirement.resource &&
      (p.action_key === requirement.requiredAction || p.action_key === 'admin')
    );
  }, [item.url, permissions]);

  if (!hasPermission) return null;

  // Has children - render as collapsible
  if (item.children && item.children.length > 0) {
    const isChildActive = item.children.some(child => 
      child.url && location.pathname.startsWith(child.url)
    );

    return (
      <Collapsible open={isOpen || isChildActive} onOpenChange={setIsOpen}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton className="w-full justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4" />
                {sidebarState === "expanded" && <span>{item.title}</span>}
              </div>
              {sidebarState === "expanded" && (
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  (isOpen || isChildActive) && "rotate-90"
                )} />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.children.map((child) => (
                <SidebarMenuSubItem key={child.title}>
                  <SidebarMenuSubButton asChild>
                    <NavLink
                      to={child.url!}
                      className={({ isActive }) =>
                        cn(
                          "w-full",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                        )
                      }
                    >
                      <child.icon className="h-3 w-3" />
                      {sidebarState === "expanded" && <span>{child.title}</span>}
                    </NavLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  // Regular link
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url!}
          end={item.end === true}
          className={({ isActive }) =>
            cn(
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            )
          }
        >
          <item.icon className="h-4 w-4" />
          {sidebarState === "expanded" && (
            <span className="flex items-center gap-2">
              {item.title}
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                  {item.badge}
                </span>
              )}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export default function AppAdminSidebar() {
  const { state } = useSidebar();
  const { data: permissions } = useUserPermissions();
  const location = useLocation();

  // Track which sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    // Default open sections
    const defaults: Record<string, boolean> = {};
    adminNavItems.forEach(section => {
      if (section.defaultOpen) defaults[section.title] = true;
    });
    return defaults;
  });

  // Filter sections based on permissions
  const visibleNavSections = useMemo(() => {
    if (!permissions) return [];

    return adminNavItems
      .map(section => ({
        ...section,
        items: section.items.filter(item => {
          if (!item.url) return true; // Items with children are always shown initially
          const requirement = adminNavigationMapping[item.url];
          if (!requirement || !requirement.resource) return true;
          return permissions.some((p: any) => 
            p.resource_key === requirement.resource &&
            (p.action_key === requirement.requiredAction || p.action_key === 'admin')
          );
        })
      }))
      .filter(section => section.items.length > 0);
  }, [permissions]);

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {state === "expanded" && (
          <h2 className="text-lg font-semibold text-sidebar-foreground">Admin Panel</h2>
        )}
      </div>

      <SidebarContent className="overflow-y-auto">
        {visibleNavSections.map((section) => {
          const isActive = useIsActiveSection(section.items, location.pathname);
          const isOpen = openSections[section.title] || isActive;

          return (
            <SidebarGroup key={section.title} className="py-0">
              <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.title)}>
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel 
                    className={cn(
                      "flex items-center justify-between cursor-pointer hover:bg-sidebar-accent/50 rounded-md px-2 py-1.5 transition-colors",
                      isActive && "text-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <section.icon className="h-4 w-4" />
                      {state === "expanded" && <span>{section.title}</span>}
                    </div>
                    {state === "expanded" && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-90"
                      )} />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent className="pl-2">
                    <SidebarMenu>
                      {section.items.map((item) => (
                        <NavItemRenderer 
                          key={item.title} 
                          item={item} 
                          sidebarState={state}
                          permissions={permissions || []}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </Sidebar>
  );
}
