/**
 * Jul25 - Julebord Påmeldingssystem for AG Jacobsen Consulting
 * 
 * Features:
 * - Autentisering med familie-tilknytning
 * - Familieregistrering og påmelding
 * - Oppgaver tildelt familier
 * - Julekalender med AI-genererte ord
 * - Admin-panel for administrasjon
 */

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Users, Star, CheckSquare, Plus, Edit2, Trash2, Mail, LogOut, LogIn, UserCog, Baby, Church, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { useJul25Families, useJul25FamilyMembers, useCreateFamily, useUpdateFamily, useDeleteFamily, useJoinFamily, useUpdateFamilyMember } from "@/hooks/useJul25Families";
import { useJul25Tasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/hooks/useJul25Tasks";
import { EditFamilyDialog } from "@/components/Jul25/EditFamilyDialog";
import { ManageFamilyMembersDialog } from "@/components/Jul25/ManageFamilyMembersDialog";

interface ChristmasWord {
  date: number;
  word: string;
  generated: boolean;
}

export default function Jul25App() {
  const { user, signOut } = useAuth();
  
  // Data fra database
  const { data: families = [] } = useJul25Families();
  const { data: allMembers = [] } = useJul25FamilyMembers();
  const { data: tasks = [] } = useJul25Tasks();
  
  // Mutations
  const createFamily = useCreateFamily();
  const updateFamily = useUpdateFamily();
  const deleteFamily = useDeleteFamily();
  const joinFamily = useJoinFamily();
  const updateMember = useUpdateFamilyMember();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  
  // Admin emails
  const adminEmails = ["admin@jul25.no", "kjetil@agj.no"];
  const isAdmin = user && adminEmails.includes(user.email || "");
  
  // Finn brukerens familie-medlemskap
  const userMembership = allMembers.find(m => m.user_id === user?.id);
  const userFamily = families.find(f => f.id === userMembership?.family_id);
  
  // UI State
  const [showFamilyOnboarding, setShowFamilyOnboarding] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
  const [editingFamily, setEditingFamily] = useState<any>(null);
  const [managingFamilyId, setManagingFamilyId] = useState<string | null>(null);
  const [taskFamilyFilter, setTaskFamilyFilter] = useState<string>("all");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  
  // Family onboarding form
  const [onboardingMode, setOnboardingMode] = useState<"join" | "create">("create");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newNumberOfPeople, setNewNumberOfPeople] = useState(2);
  const [newArrivalDate, setNewArrivalDate] = useState(19);
  const [newArrivalTime, setNewArrivalTime] = useState("15:00");
  const [newDepartureDate, setNewDepartureDate] = useState(31);
  const [newDepartureTime, setNewDepartureTime] = useState("12:00");
  const [memberName, setMemberName] = useState("");
  
  // Task form
  const [taskText, setTaskText] = useState("");
  const [taskDeadline, setTaskDeadline] = useState<string>("");
  const [taskAssignedFamily, setTaskAssignedFamily] = useState<string>("");
  
  // Invitation
  const [invitationEmail, setInvitationEmail] = useState("");
  
  // Christmas calendar
  const [christmasWords, setChristmasWords] = useState<ChristmasWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<ChristmasWord | null>(null);
  const [mockToday] = useState(15);
  
  useEffect(() => {
    const words: ChristmasWord[] = [];
    for (let i = 1; i <= 24; i++) {
      words.push({ date: i, word: "", generated: false });
    }
    setChristmasWords(words);
  }, []);
  
  // Check if user needs family onboarding
  useEffect(() => {
    if (user && !userMembership && !isAdmin) {
      setShowFamilyOnboarding(true);
    }
  }, [user, userMembership, isAdmin]);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) throw error;
      
      toast.success("Velkommen! 🎄");
      setShowLoginDialog(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (error: any) {
      toast.error(error.message || "Innlogging feilet");
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const redirectUrl = `${window.location.origin}/apps/jul25`;
      
      const { error, data } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupName,
          },
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast.success("Konto opprettet! Nå kan du registrere familie. 🎄");
        setShowLoginDialog(false);
        setShowFamilyOnboarding(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Registrering feilet");
    }
  };
  
  const handleLogout = async () => {
    await signOut();
    toast.success("Du er nå logget ut");
  };
  
  const handleCompleteOnboarding = async () => {
    if (!user) return;
    
    try {
      if (onboardingMode === "create") {
        // Opprett ny familie
        if (!newFamilyName.trim() || !memberName.trim()) {
          toast.error("Fyll inn alle feltene");
          return;
        }
        
        const family = await createFamily.mutateAsync({
          name: newFamilyName,
          number_of_people: newNumberOfPeople,
          arrival_date: newArrivalDate,
          arrival_time: newArrivalTime,
          departure_date: newDepartureDate,
          departure_time: newDepartureTime,
        });
        
        // Bli med som admin
        await joinFamily.mutateAsync({
          family_id: family.id,
          name: memberName,
          user_id: user.id,
          is_admin: true,
        });
        
        setShowFamilyOnboarding(false);
        toast.success("Familie opprettet! 🎄");
      } else {
        // Bli med i eksisterende familie
        if (!selectedFamilyId || !memberName.trim()) {
          toast.error("Velg en familie og skriv inn navnet ditt");
          return;
        }
        
        // Bli med som admin (begge foreldre blir admins)
        await joinFamily.mutateAsync({
          family_id: selectedFamilyId,
          name: memberName,
          user_id: user.id,
          is_admin: true,
        });
        
        setShowFamilyOnboarding(false);
        toast.success("Du er nå med i familien! 🎄");
      }
    } catch (error: any) {
      toast.error(error.message || "Noe gikk galt");
    }
  };
  
  const handleSaveTask = async () => {
    if (!taskText.trim()) {
      toast.error("Oppgavetekst kan ikke være tom");
      return;
    }
    
    try {
      if (editingTask) {
        await updateTask.mutateAsync({
          id: editingTask.id,
          text: taskText,
          deadline: taskDeadline || null,
          assigned_family_id: taskAssignedFamily || null,
        });
        toast.success("Oppgave oppdatert");
      } else {
        await createTask.mutateAsync({
          text: taskText,
          done: false,
          deadline: taskDeadline || null,
          assigned_family_id: taskAssignedFamily || null,
          created_by: user?.id || null,
        });
        toast.success("Oppgave opprettet");
      }
      
      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskText("");
      setTaskDeadline("");
      setTaskAssignedFamily("");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke lagre oppgave");
    }
  };
  
  const generateWordForDay = async (day: number) => {
    if (day > mockToday) {
      toast.error("Du kan ikke åpne fremtidige luker!");
      return;
    }
    
    const existing = christmasWords.find(w => w.date === day);
    if (existing?.generated) {
      setSelectedWord(existing);
      return;
    }
    
    const prompt = `Generer et positivt, julete norsk ord eller uttrykk for dag ${day} i julekalenderen. Bare ett ord eller kort uttrykk, ingen forklaring.`;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { prompt, maxLength: 30 }
      });

      if (error) throw error;

      const newWord = { date: day, word: data.content || data.text || "Julebro", generated: true };
      setChristmasWords(prev => prev.map(w => 
        w.date === day ? newWord : w
      ));
      setSelectedWord(newWord);
      
      toast.success(`Ord for dag ${day} generert! 🎄`);
    } catch (error) {
      console.error('Error generating word:', error);
      toast.error('Kunne ikke generere ord');
    }
  };
  
  const toggleFamilyExpanded = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };
  
  const getMembersPerDay = (family: any): Record<number, number> => {
    const membersPerDay: Record<number, number> = {};
    const familyMembers = allMembers.filter(m => m.family_id === family.id);
    
    for (let day = family.arrival_date; day <= family.departure_date; day++) {
      if (familyMembers.length === 0) {
        membersPerDay[day] = family.number_of_people;
      } else {
        membersPerDay[day] = familyMembers.filter(member => {
          const arrDate = member.arrival_date || family.arrival_date;
          const depDate = member.departure_date || family.departure_date;
          return day >= arrDate && day <= depDate;
        }).length;
      }
    }
    
    return membersPerDay;
  };
  
  const getGuestsPerDay = () => {
    const guestsPerDay: Record<number, number> = {};
    
    for (let day = 19; day <= 31; day++) {
      guestsPerDay[day] = 0;
    }
    
    families.forEach(family => {
      const familyMembersPerDay = getMembersPerDay(family);
      Object.entries(familyMembersPerDay).forEach(([day, count]) => {
        guestsPerDay[parseInt(day)] += count;
      });
    });
    
    return guestsPerDay;
  };
  
  const getSortedTasks = () => {
    let sorted = [...tasks];
    
    // Filtrer bort fullførte hvis skjult
    if (hideCompletedTasks) {
      sorted = sorted.filter(task => !task.done);
    }
    
    // Filtrer på familie hvis valgt
    if (taskFamilyFilter !== "all") {
      if (taskFamilyFilter === "mine" && userFamily) {
        sorted = sorted.filter(task => task.assigned_family_id === userFamily.id);
      } else if (taskFamilyFilter !== "mine") {
        sorted = sorted.filter(task => task.assigned_family_id === taskFamilyFilter);
      }
    }
    
    return sorted;
  };
  
  const eventDates = Array.from({ length: 13 }, (_, i) => i + 19);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-amber-50 to-white dark:from-green-950/20 dark:via-amber-950/20 dark:to-background">
      {/* Christmas decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Star className="absolute top-20 right-20 w-6 h-6 text-amber-300 animate-pulse" />
        <Heart className="absolute bottom-20 left-20 w-7 h-7 text-green-400 animate-pulse" />
        <Baby className="absolute bottom-10 right-10 w-6 h-6 text-amber-400 animate-pulse" />
      </div>

      <div className="container mx-auto py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Star className="w-12 h-12 text-yellow-500 animate-pulse" />
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-700 via-amber-600 to-green-700 bg-clip-text text-transparent">
              Jul25 Familiejul
            </h1>
            <Star className="w-12 h-12 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-xl text-muted-foreground">
            AG Jacobsen Consulting - Familiejul 2025
          </p>
          <p className="text-sm text-muted-foreground">
            🎄 Meld deg på og fortell oss når du kommer! 🎅
          </p>
          
          {/* Login/User Status */}
          <div className="flex justify-center gap-2 flex-wrap">
            {user ? (
              <>
                {userMembership && (
                  <Badge variant="secondary" className="bg-green-100 text-green-900">
                    <Users className="w-3 h-3 mr-1" />
                    {userFamily?.name}
                  </Badge>
                )}
                {isAdmin && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                    <UserCog className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Logg ut
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginDialog(true)}
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                Logg inn / Registrer
              </Button>
            )}
          </div>
        </div>

        {/* Main Calendar - Only visible when logged in */}
        {user && (
          <Card className="border-2 border-green-200 dark:border-green-900">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-green-600" />
                  Kalender - Familier
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
            {/* Date Header */}
            <div className="hidden sm:block overflow-x-auto pb-2">
              <div className="flex gap-0">
                <div className="w-32 sm:w-40 flex-shrink-0" />
                {eventDates.map(date => {
                  const guestsPerDay = getGuestsPerDay();
                  return (
                    <div key={date} className="w-10 flex-shrink-0 text-center">
                      <div className="font-medium text-xs border-l border-border/30 pb-1">{date}</div>
                      <div className="text-xs text-muted-foreground">
                        {guestsPerDay[date] > 0 ? `${guestsPerDay[date]}` : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Family Rows */}
            {families.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Ingen familier lagt til ennå</p>
                {!user && <p className="text-sm mt-2">Logg inn for å melde deg på!</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {families.map((family) => {
                  const startOffset = (family.arrival_date - 19) * 40;
                  const duration = (family.departure_date - family.arrival_date + 1) * 40;
                  const familyMembers = allMembers.filter(m => m.family_id === family.id);
                  const membersPerDay = getMembersPerDay(family);
                  const isExpanded = expandedFamilies.has(family.id);
                  
                  const isUserFamilyAdmin = isAdmin || (userMembership && userMembership.family_id === family.id && userMembership.is_admin);
                  
                  return (
                    <div key={family.id} className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-start">
                        {/* Family Name */}
                        <div className="w-full sm:w-32 md:w-40 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleFamilyExpanded(family.id)}
                              className="flex-1 bg-green-700 text-white rounded px-2 py-2 sm:py-1 text-sm text-left hover:bg-green-800 transition-colors flex items-center gap-1"
                            >
                              <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                              <span className="truncate">{family.name}</span>
                            </button>
                            {isUserFamilyAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setEditingFamily(family)}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => setManagingFamilyId(family.id)}
                                >
                                  <Users className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                            {family.arrival_date}/12 {family.arrival_time} - {family.departure_date}/12 {family.departure_time}
                          </div>
                        </div>

                        {/* Gantt Bar */}
                        <div className="relative flex-1 h-8 hidden sm:block overflow-x-auto">
                          <div className="absolute inset-y-0 flex gap-0 min-w-max">
                            {eventDates.map(date => (
                              <div key={date} className="w-10 h-8 border-l border-border/30" />
                            ))}
                          </div>
                          <div 
                            className="absolute top-1 h-6 bg-green-600 rounded cursor-pointer hover:bg-green-700 transition-colors flex items-center text-xs text-white font-medium min-w-max overflow-hidden"
                            style={{ 
                              left: `${startOffset}px`, 
                              width: `${duration}px` 
                            }}
                            title={`${family.name}: ${family.arrival_date}. ${family.arrival_time} - ${family.departure_date}. ${family.departure_time}`}
                          >
                            {Object.entries(membersPerDay).map(([day, count]) => {
                              const dayOffset = (parseInt(day) - family.arrival_date) * 40;
                              return (
                                <span 
                                  key={day}
                                  className="absolute top-0 bottom-0 flex items-center justify-center"
                                  style={{ left: `${dayOffset}px`, width: '40px' }}
                                >
                                  {count}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Members */}
                      {isExpanded && (
                        <div className="ml-4 sm:ml-0 space-y-2 sm:space-y-1 mt-2">
                          {familyMembers.map((member) => (
                            <div key={member.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Users className="w-3 h-3" />
                              <span>{member.name}</span>
                              {member.is_admin && <Badge variant="secondary" className="text-xs">Admin</Badge>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tasks Widget - Visible to all logged-in users */}
          {user && (
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-amber-600" />
                      Oppgaver
                    </CardTitle>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
                        className="h-8 text-xs flex-1 sm:flex-none"
                      >
                        {hideCompletedTasks ? "Vis fullførte" : "Skjul fullførte"}
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingTask(null);
                            setTaskText("");
                            setTaskDeadline("");
                            setTaskAssignedFamily("");
                            setShowTaskDialog(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Ny oppgave
                        </Button>
                      )}
                    </div>
                  </div>
                  {/* Family filter */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Filtrer:</Label>
                    <Select value={taskFamilyFilter} onValueChange={setTaskFamilyFilter}>
                      <SelectTrigger className="h-8 text-xs w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle oppgaver</SelectItem>
                        {userFamily && (
                          <SelectItem value="mine">Min familie</SelectItem>
                        )}
                        {families.map(family => (
                          <SelectItem key={family.id} value={family.id}>
                            {family.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getSortedTasks().map(task => {
                    const assignedFamily = families.find(f => f.id === task.assigned_family_id);
                    
                    return (
                      <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => {
                            updateTask.mutate({
                              id: task.id,
                              done: !task.done,
                            });
                          }}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <span className={cn("text-sm flex-1", task.done && "line-through text-muted-foreground")}>
                          {task.text}
                        </span>
                        {assignedFamily && (
                          <Badge variant="secondary" className="text-xs">
                            {assignedFamily.name}
                          </Badge>
                        )}
                        {task.deadline && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.deadline).toLocaleDateString('nb-NO')}
                          </span>
                        )}
                        {isAdmin && (
                          <>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2" 
                              onClick={() => {
                                setEditingTask(task);
                                setTaskText(task.text);
                                setTaskDeadline(task.deadline || "");
                                setTaskAssignedFamily(task.assigned_family_id || "");
                                setShowTaskDialog(true);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2 text-destructive" 
                              onClick={() => {
                                if (confirm("Er du sikker på at du vil slette denne oppgaven?")) {
                                  deleteTask.mutate(task.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                   {getSortedTasks().length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Ingen oppgaver {taskFamilyFilter === "all" ? "" : "for valgt filter"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Christmas Calendar */}
          <Card className="border-2 border-purple-300 dark:border-purple-900">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Church className="w-5 h-5 text-purple-600" />
                Julekalender - Ord for dagen
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Klikk på en luke for å generere dagens juleord med AI! 🎄
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {christmasWords.map((item) => {
                  const isOpened = item.generated;
                  const canOpen = item.date <= mockToday;
                  const isFuture = item.date > mockToday;
                  
                  return (
                    <button
                      key={item.date}
                      onClick={() => canOpen && generateWordForDay(item.date)}
                      disabled={isFuture}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 p-2 transition-all",
                        isOpened 
                          ? "bg-purple-100 dark:bg-purple-950/30 border-purple-300 dark:border-purple-900 hover:scale-105" 
                          : isFuture
                          ? "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-800 opacity-50 cursor-not-allowed"
                          : "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900 hover:bg-purple-100 dark:hover:bg-purple-950/40 hover:scale-105 hover:shadow-lg cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 left-1 text-xs font-bold",
                        isFuture ? "text-gray-400" : "text-purple-700"
                      )}>
                        {item.date}.
                      </div>
                      <div className="flex items-center justify-center h-full text-center">
                        <Star className={cn(
                          "w-6 h-6",
                          isOpened ? "text-yellow-500" : "opacity-50",
                          isFuture && "text-gray-400"
                        )} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Christmas Word Dialog */}
        <Dialog open={selectedWord !== null} onOpenChange={() => setSelectedWord(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                {selectedWord?.date}. desember - Ord for dagen
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-4">
                {selectedWord?.word || "Laster..."}
              </div>
              <Star className="w-12 h-12 mx-auto text-yellow-500 animate-pulse" />
            </div>
          </DialogContent>
        </Dialog>

        {/* Login/Signup Dialog */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Velkommen til Familiejul 2025</DialogTitle>
              <DialogDescription>
                Logg inn eller opprett konto for å melde deg på
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Logg inn</TabsTrigger>
                <TabsTrigger value="signup">Registrer</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-post</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Passord</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Logg inn</Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Fullt navn</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-post</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Passord</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full">Opprett konto</Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Family Onboarding Dialog */}
        <Dialog open={showFamilyOnboarding} onOpenChange={setShowFamilyOnboarding}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrer familie</DialogTitle>
              <DialogDescription>
                Opprett en ny familie eller bli med i en eksisterende
              </DialogDescription>
            </DialogHeader>
            <Tabs value={onboardingMode} onValueChange={(v) => setOnboardingMode(v as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Opprett ny</TabsTrigger>
                <TabsTrigger value="join">Bli med</TabsTrigger>
              </TabsList>
              
              <TabsContent value="create" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="family-name">Familienavn</Label>
                  <Input
                    id="family-name"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="f.eks. Familie Hansen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-name">Ditt navn</Label>
                  <Input
                    id="member-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="f.eks. Kjetil Hansen"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="num-people">Antall personer</Label>
                  <Input
                    id="num-people"
                    type="number"
                    min="1"
                    value={newNumberOfPeople}
                    onChange={(e) => setNewNumberOfPeople(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ankomst</Label>
                    <Select value={newArrivalDate.toString()} onValueChange={(v) => setNewArrivalDate(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventDates.map(date => (
                          <SelectItem key={date} value={date.toString()}>
                            {date}. des
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Avreise</Label>
                    <Select value={newDepartureDate.toString()} onValueChange={(v) => setNewDepartureDate(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventDates.map(date => (
                          <SelectItem key={date} value={date.toString()}>
                            {date}. des
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="join" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="select-family">Velg familie</Label>
                  <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg en familie" />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map(family => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-member-name">Ditt navn</Label>
                  <Input
                    id="join-member-name"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value)}
                    placeholder="f.eks. Kjetil Hansen"
                  />
                </div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFamilyOnboarding(false)}>
                Avbryt
              </Button>
              <Button onClick={handleCompleteOnboarding}>
                {onboardingMode === "create" ? "Opprett familie" : "Bli med"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Task Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Rediger oppgave" : "Ny oppgave"}</DialogTitle>
              <DialogDescription>
                Opprett eller rediger en oppgave for en familie
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="task-text">Oppgavetekst</Label>
                <Input
                  id="task-text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="f.eks. Bestille mat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-family">Tildel familie</Label>
                <Select value={taskAssignedFamily} onValueChange={setTaskAssignedFamily}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg familie (valgfritt)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ingen familie</SelectItem>
                    {families.map(family => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Frist (valgfritt)</Label>
                <Input
                  id="task-deadline"
                  type="date"
                  value={taskDeadline}
                  onChange={(e) => setTaskDeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSaveTask}>
                {editingTask ? "Oppdater" : "Opprett"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Family Dialog */}
        {editingFamily && (
          <EditFamilyDialog
            family={editingFamily}
            open={!!editingFamily}
            onOpenChange={(open) => !open && setEditingFamily(null)}
          />
        )}

        {/* Manage Family Members Dialog */}
        {managingFamilyId && (
          <ManageFamilyMembersDialog
            familyId={managingFamilyId}
            members={allMembers.filter(m => m.family_id === managingFamilyId)}
            open={!!managingFamilyId}
            onOpenChange={(open) => !open && setManagingFamilyId(null)}
          />
        )}
      </div>
    </div>
  );
}
