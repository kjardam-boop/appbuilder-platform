import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import ProcessFlow from "@/components/Dashboard/ProcessFlow";
import AIAssistant from "@/components/Dashboard/AIAssistant";
import ProjectCard from "@/components/Dashboard/ProjectCard";
import CreateProjectDialog from "@/components/Project/CreateProjectDialog";
import { toast } from "sonner";
import { AppBreadcrumbs } from "@/components/ui/app-breadcrumbs";
import { TasksWidget } from "@/components/Dashboard/TasksWidget";
import { OpportunitiesWidget } from "@/components/Dashboard/OpportunitiesWidget";

interface Profile {
  full_name: string;
  email: string;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  current_phase: string;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchProjects();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      console.log('[Dashboard] Fetching projects...');
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[Dashboard] Error fetching projects:', error);
        throw error;
      }

      console.log('[Dashboard] Projects fetched:', data?.length || 0);
      setProjects(data || []);
    } catch (error) {
      console.error('[Dashboard] Fatal error fetching projects:', error);
      toast.error("Kunne ikke laste prosjekter");
      setProjects([]);
    }
  };

  const handleCreateProject = () => {
    if (!user) return;
    setShowCreateDialog(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userEmail={profile?.email} />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <AppBreadcrumbs />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Widgets for Tasks and Opportunities */}
            <div className="grid md:grid-cols-2 gap-4">
              <TasksWidget />
              <OpportunitiesWidget />
            </div>


            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Mine prosjekter</h2>
                  <p className="text-muted-foreground">Oversikt over IT-anskaffelsesprosjekter</p>
                </div>
                <Button onClick={handleCreateProject}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nytt prosjekt
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <p className="text-muted-foreground mb-4">Ingen prosjekter ennå</p>
                  <Button onClick={handleCreateProject} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Opprett ditt første prosjekt
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/dashboard/project/${project.id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            <ProcessFlow />
          </div>

          <div>
            <AIAssistant />
          </div>
        </div>
      </main>

      {user && (
        <CreateProjectDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchProjects}
          userId={user.id}
        />
      )}
    </div>
  );
};

export default Dashboard;
