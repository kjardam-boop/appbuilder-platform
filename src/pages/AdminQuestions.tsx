import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/modules/core/user";
import Header from "@/components/Dashboard/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionManager } from "@/components/Admin/QuestionManager";
import { AIQuestionGenerator } from "@/components/Admin/AIQuestionGenerator";
import { Shield, ArrowLeft, Building2, Users } from "lucide-react";
import { SUPPLIER_EVALUATION_CATEGORIES } from "@/modules/core/supplier";

const AdminQuestions = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useCurrentUser();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchProfile();
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const db = supabase as any;
    const { data } = await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userName={profile?.full_name} userEmail={profile?.email} />
      
      <main className="w-full px-4 lg:px-6 xl:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til dashboard
        </Button>

        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-4xl font-bold">Administrer spørsmål</h1>
        </div>

        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Spørsmål til selskap
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-2">
              <Users className="h-4 w-4" />
              Spørsmål til leverandører
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Spørsmål for selskapet</CardTitle>
                <CardDescription>
                  Spørsmål som hjelper kjøpende selskap med å definere behov
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="mandate" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="mandate">Mandat</TabsTrigger>
                    <TabsTrigger value="requirements">Krav</TabsTrigger>
                    <TabsTrigger value="invitation_description">IItD</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="mandate">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Mandat</h3>
                        <p className="text-sm text-muted-foreground">Definer prosjektets formål og rammer</p>
                      </div>
                      <AIQuestionGenerator fieldKey="mandate" mode="company" onQuestionsGenerated={() => window.location.reload()} />
                    </div>
                    <QuestionManager fieldKey="mandate" />
                  </TabsContent>
                  
                  <TabsContent value="requirements">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Krav</h3>
                        <p className="text-sm text-muted-foreground">Spesifiser krav til løsningen</p>
                      </div>
                      <AIQuestionGenerator fieldKey="requirements" mode="company" onQuestionsGenerated={() => window.location.reload()} />
                    </div>
                    <QuestionManager fieldKey="requirements" />
                  </TabsContent>
                  
                  <TabsContent value="invitation_description">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">Invitasjon til tilbudsinnhenting</h3>
                        <p className="text-sm text-muted-foreground">Beskriv prosjektet for leverandører</p>
                      </div>
                      <AIQuestionGenerator fieldKey="invitation_description" mode="company" onQuestionsGenerated={() => window.location.reload()} />
                    </div>
                    <QuestionManager fieldKey="invitation_description" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader>
                <CardTitle>Spørsmål til leverandører</CardTitle>
                <CardDescription>
                  Spørsmål for systematisk leverandørevaluering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={SUPPLIER_EVALUATION_CATEGORIES[0].key} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 gap-1">
                    {SUPPLIER_EVALUATION_CATEGORIES.map(cat => (
                      <TabsTrigger key={cat.key} value={cat.key} className="text-xs px-2">
                        {cat.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {SUPPLIER_EVALUATION_CATEGORIES.map(cat => (
                    <TabsContent key={cat.key} value={cat.key}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{cat.label}</h3>
                          <p className="text-sm text-muted-foreground">{cat.description}</p>
                        </div>
                        <AIQuestionGenerator fieldKey={cat.key} mode="supplier" onQuestionsGenerated={() => window.location.reload()} />
                      </div>
                      <QuestionManager fieldKey={cat.key} />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminQuestions;
