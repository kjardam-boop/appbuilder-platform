/**
 * Jul25 - Julebord Påmeldingssystem for AG Jacobsen Consulting
 * 
 * Features:
 * - Julekalender med datoer
 * - Påmelding av deltakere (ankomst/avreise)
 * - Visuell oversikt over hvem som kommer når
 * - Juletema med animasjoner
 */

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Users, Sparkles, Star, CheckSquare, Plus, ArrowUpDown, Baby, Church, Heart, Edit2, Trash2, X, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface FamilyMember {
  name: string;
  arrivalDate: number;
  arrivalTime: string;
  departureDate: number;
  departureTime: string;
}

interface FamilyRegistration {
  id: string;
  familyName: string;
  numberOfPeople: number;
  arrivalDate: number;
  arrivalTime: string;
  departureDate: number;
  departureTime: string;
  members: FamilyMember[];
  expanded: boolean;
}

interface ChristmasWord {
  date: number;
  word: string;
  generated: boolean;
}

interface Task {
  id: string;
  text: string;
  done: boolean;
  assignedTo?: string;
  deadline?: string; // ISO date string
}

interface MemberDialogState {
  open: boolean;
  familyId: string | null;
  editIndex?: number;
}

export default function Jul25App() {
  const [families, setFamilies] = useState<FamilyRegistration[]>([]);
  const [christmasWords, setChristmasWords] = useState<ChristmasWord[]>([]);
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyRegistration | null>(null);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newNumberOfPeople, setNewNumberOfPeople] = useState(2);
  const [newArrivalDate, setNewArrivalDate] = useState(19);
  const [newArrivalTime, setNewArrivalTime] = useState("15:00");
  const [newDepartureDate, setNewDepartureDate] = useState(31);
  const [newDepartureTime, setNewDepartureTime] = useState("12:00");
  
  const [memberDialog, setMemberDialog] = useState<MemberDialogState>({ open: false, familyId: null });
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberArrivalDate, setNewMemberArrivalDate] = useState(19);
  const [newMemberArrivalTime, setNewMemberArrivalTime] = useState("15:00");
  const [newMemberDepartureDate, setNewMemberDepartureDate] = useState(31);
  const [newMemberDepartureTime, setNewMemberDepartureTime] = useState("12:00");
  
  const [selectedWord, setSelectedWord] = useState<ChristmasWord | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Bestille mat", done: false, deadline: "2025-12-20" },
    { id: "2", text: "Planlegge aktiviteter", done: false, deadline: "2025-12-22" },
    { id: "3", text: "Sende ut invitasjoner", done: true },
  ]);
  const [taskSortBy, setTaskSortBy] = useState<"name" | "date">("name");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  
  const [mockToday] = useState(15);
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);
  const [invitationEmail, setInvitationEmail] = useState("");

  useEffect(() => {
    // Initialize Christmas words for days 1-24
    const words: ChristmasWord[] = [];
    for (let i = 1; i <= 24; i++) {
      words.push({ date: i, word: "", generated: false });
    }
    setChristmasWords(words);
  }, []);

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

  const addFamily = () => {
    if (!newFamilyName.trim()) {
      toast.error("Vennligst skriv inn familienavn");
      return;
    }
    
    if (newArrivalDate > newDepartureDate) {
      toast.error("Ankomstdato må være før avreisedato");
      return;
    }
    
    if (editingFamily) {
      // Update existing
      setFamilies(prev => prev.map(f => 
        f.id === editingFamily.id 
          ? { ...f, familyName: newFamilyName, numberOfPeople: newNumberOfPeople, arrivalDate: newArrivalDate, arrivalTime: newArrivalTime, departureDate: newDepartureDate, departureTime: newDepartureTime }
          : f
      ));
      toast.success(`Familie ${newFamilyName} oppdatert! 🎄`);
    } else {
      // Add new
      const newFamily: FamilyRegistration = {
        id: crypto.randomUUID(),
        familyName: newFamilyName,
        numberOfPeople: newNumberOfPeople,
        arrivalDate: newArrivalDate,
        arrivalTime: newArrivalTime,
        departureDate: newDepartureDate,
        departureTime: newDepartureTime,
        members: [],
        expanded: false
      };
      setFamilies([...families, newFamily]);
      toast.success(`Familie ${newFamilyName} lagt til! 🎄`);
    }
    
    setNewFamilyName("");
    setNewNumberOfPeople(2);
    setNewArrivalDate(19);
    setNewArrivalTime("15:00");
    setNewDepartureDate(31);
    setNewDepartureTime("12:00");
    setIsAddingFamily(false);
    setEditingFamily(null);
  };

  const openEditFamilyDialog = (family: FamilyRegistration) => {
    setEditingFamily(family);
    setNewFamilyName(family.familyName);
    setNewNumberOfPeople(family.numberOfPeople);
    setNewArrivalDate(family.arrivalDate);
    setNewArrivalTime(family.arrivalTime);
    setNewDepartureDate(family.departureDate);
    setNewDepartureTime(family.departureTime);
    setIsAddingFamily(true);
  };

  const deleteFamily = (familyId: string) => {
    if (confirm("Er du sikker på at du vil slette denne familien?")) {
      setFamilies(prev => prev.filter(f => f.id !== familyId));
      toast.success("Familie slettet");
    }
  };

  const specifyDays = (familyId: string) => {
    const family = families.find(f => f.id === familyId);
    if (!family) return;
    
    // Auto-generate members if they don't exist
    if (family.members.length === 0) {
      const generatedMembers: FamilyMember[] = [];
      for (let i = 1; i <= family.numberOfPeople; i++) {
        generatedMembers.push({
          name: `Familiemedlem ${i}`,
          arrivalDate: family.arrivalDate,
          arrivalTime: family.arrivalTime,
          departureDate: family.departureDate,
          departureTime: family.departureTime
        });
      }
      
      setFamilies(prev => prev.map(fam => 
        fam.id === familyId ? { ...fam, members: generatedMembers, expanded: true } : fam
      ));
      
      toast.success(`${family.numberOfPeople} medlemmer opprettet! Klikk på navnene for å endre datoer.`);
    } else {
      // Just expand if members already exist
      toggleFamilyExpanded(familyId);
    }
  };

  const openMemberDialog = (familyId: string) => {
    const family = families.find(f => f.id === familyId);
    if (!family) return;
    
    setNewMemberName("");
    setNewMemberArrivalDate(family.arrivalDate);
    setNewMemberArrivalTime(family.arrivalTime);
    setNewMemberDepartureDate(family.departureDate);
    setNewMemberDepartureTime(family.departureTime);
    setMemberDialog({ open: true, familyId, editIndex: undefined });
  };
  
  const openEditMemberDialog = (familyId: string, memberIndex: number) => {
    const family = families.find(f => f.id === familyId);
    if (!family) return;
    
    const member = family.members[memberIndex];
    setNewMemberName(member.name);
    setNewMemberArrivalDate(member.arrivalDate);
    setNewMemberArrivalTime(member.arrivalTime);
    setNewMemberDepartureDate(member.departureDate);
    setNewMemberDepartureTime(member.departureTime);
    setMemberDialog({ open: true, familyId, editIndex: memberIndex });
  };
  
  const addMember = () => {
    if (!newMemberName.trim() || !memberDialog.familyId) {
      toast.error("Vennligst skriv inn navn");
      return;
    }
    
    if (newMemberArrivalDate > newMemberDepartureDate) {
      toast.error("Ankomstdato må være før avreisedato");
      return;
    }
    
    const memberData: FamilyMember = {
      name: newMemberName,
      arrivalDate: newMemberArrivalDate,
      arrivalTime: newMemberArrivalTime,
      departureDate: newMemberDepartureDate,
      departureTime: newMemberDepartureTime
    };
    
    if (memberDialog.editIndex !== undefined) {
      // Edit existing member
      setFamilies(prev => prev.map(fam => 
        fam.id === memberDialog.familyId
          ? { 
              ...fam, 
              members: fam.members.map((m, idx) => 
                idx === memberDialog.editIndex ? memberData : m
              )
            }
          : fam
      ));
      toast.success(`${newMemberName} oppdatert!`);
    } else {
      // Add new member
      setFamilies(prev => prev.map(fam => 
        fam.id === memberDialog.familyId
          ? { 
              ...fam, 
              members: [...fam.members, memberData] 
            }
          : fam
      ));
      toast.success(`${newMemberName} lagt til!`);
    }
    
    setMemberDialog({ open: false, familyId: null, editIndex: undefined });
  };

  const toggleFamilyExpanded = (familyId: string) => {
    setFamilies(prev => prev.map(fam => 
      fam.id === familyId ? { ...fam, expanded: !fam.expanded } : fam
    ));
  };

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task);
    setEditingTaskText(task.text);
  };

  const saveTask = () => {
    if (!editingTaskText.trim()) {
      toast.error("Oppgavetekst kan ikke være tom");
      return;
    }
    
    if (editingTask) {
      setTasks(prev => prev.map(t => 
        t.id === editingTask.id ? { ...t, text: editingTaskText } : t
      ));
      toast.success("Oppgave oppdatert");
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: editingTaskText,
        done: false
      };
      setTasks(prev => [...prev, newTask]);
      toast.success("Oppgave lagt til");
    }
    
    setEditingTask(null);
    setEditingTaskText("");
  };

  const deleteTask = (taskId: string) => {
    if (confirm("Er du sikker på at du vil slette denne oppgaven?")) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success("Oppgave slettet");
    }
  };

  const deleteMember = (familyId: string, memberIdx: number) => {
    if (confirm("Er du sikker på at du vil slette dette medlemmet?")) {
      setFamilies(prev => prev.map(fam => 
        fam.id === familyId ? {
          ...fam,
          members: fam.members.filter((_, idx) => idx !== memberIdx)
        } : fam
      ));
      toast.success("Medlem slettet");
    }
  };

  const getMembersPerDay = (family: FamilyRegistration): Record<number, number> => {
    const membersPerDay: Record<number, number> = {};
    
    for (let day = family.arrivalDate; day <= family.departureDate; day++) {
      if (family.members.length === 0) {
        membersPerDay[day] = family.numberOfPeople;
      } else {
        membersPerDay[day] = family.members.filter(member => 
          day >= member.arrivalDate && day <= member.departureDate
        ).length;
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
  
  const getAllRegisteredPeople = () => {
    const people: { id: string; label: string }[] = [];
    families.forEach(family => {
      people.push({ id: family.id, label: family.familyName });
      family.members.forEach((member, idx) => {
        people.push({ 
          id: `${family.id}-${idx}`, 
          label: `${member.name} (${family.familyName})` 
        });
      });
    });
    return people;
  };

  const getSortedTasks = () => {
    const sorted = [...tasks];
    if (taskSortBy === "name") {
      return sorted.sort((a, b) => a.text.localeCompare(b.text));
    } else {
      return sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    }
  };

  const sendInvitations = async () => {
    if (!invitationEmail.trim()) {
      toast.error("Vennligst skriv inn e-postadresse");
      return;
    }

    try {
      // Here you would call your email service
      // For now, just show success
      toast.success(`Invitasjon sendt til ${invitationEmail}! 📧`);
      setInvitationEmail("");
      setShowInvitationDialog(false);
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Kunne ikke sende invitasjon');
    }
  };

  // Gantt layout constants
  const DAY_W = 40; // matches w-10
  const DAY_GAP = 0; // matches gap-0
  const DAY_UNIT = DAY_W + DAY_GAP;

  const eventDates = Array.from({ length: 13 }, (_, i) => i + 19); // 19-31

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-amber-50 to-white dark:from-green-950/20 dark:via-amber-950/20 dark:to-background">
      {/* Christmas decorations - bibel tema */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Star className="absolute top-10 left-10 w-8 h-8 text-yellow-400 animate-pulse" />
        <Star className="absolute top-20 right-20 w-6 h-6 text-amber-300 animate-pulse" />
        <Heart className="absolute bottom-20 left-20 w-7 h-7 text-green-400 animate-pulse" />
        <Baby className="absolute bottom-10 right-10 w-6 h-6 text-amber-400 animate-pulse" />
      </div>

      <div className="container mx-auto py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Star className="w-12 h-12 text-yellow-500 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-700 via-amber-600 to-green-700 bg-clip-text text-transparent">
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
        </div>

        {/* Main Calendar - Family Registration */}
        <Card className="border-2 border-green-200 dark:border-green-900">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                Kalender
              </CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => setShowInvitationDialog(true)}
                  size="sm"
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Send invitasjon
                </Button>
                <Button 
                  onClick={() => setIsAddingFamily(true)}
                  size="sm"
                  className="bg-gradient-to-r from-green-600 to-amber-600 flex-1 sm:flex-none"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Legg til familie
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Date Header - Hidden on mobile, scrollable on larger screens */}
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

            {/* Family Rows - Gantt Style */}
            {families.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Ingen familier lagt til ennå</p>
                <p className="text-sm">Klikk "Legg til familie" for å komme i gang</p>
              </div>
            ) : (
              <div className="space-y-3">
                {families.map((family) => {
                  const startOffset = (family.arrivalDate - 19) * 40;
                  const duration = (family.departureDate - family.arrivalDate + 1) * 40;
                  const familyMembersPerDay = getMembersPerDay(family);
                  
                  return (
                    <div key={family.id} className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-start">
                        {/* Family Name and Info */}
                        <div className="w-full sm:w-32 md:w-40 flex-shrink-0">
                          <div className="flex gap-1">
                            <button
                              onClick={() => toggleFamilyExpanded(family.id)}
                              className="flex-1 bg-green-700 text-white rounded px-2 py-2 sm:py-1 text-sm text-left hover:bg-green-800 transition-colors flex items-center gap-1"
                            >
                              <span className="text-xs">{family.expanded ? '▼' : '▶'}</span>
                              <span className="truncate">{family.familyName}</span>
                            </button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-auto py-1 px-2" 
                              onClick={() => openEditFamilyDialog(family)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-auto py-1 px-2 text-destructive" 
                              onClick={() => deleteFamily(family.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                            {family.arrivalDate}/12 {family.arrivalTime} - {family.departureDate}/12 {family.departureTime}
                          </div>
                        </div>

                        {/* Gantt Bar - Hidden on mobile */}
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
                            title={`${family.familyName}: ${family.arrivalDate}. ${family.arrivalTime} - ${family.departureDate}. ${family.departureTime}`}
                          >
                            {Object.entries(familyMembersPerDay).map(([day, count]) => {
                              const dayOffset = (parseInt(day) - family.arrivalDate) * 40;
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
                      {family.expanded && (
                        <div className="ml-4 sm:ml-0 space-y-2 sm:space-y-1 mt-2">
                          {family.members.map((member, idx) => {
                            const memberStartOffset = (member.arrivalDate - 19) * 40;
                            const memberDuration = (member.departureDate - member.arrivalDate + 1) * 40;
                            const isDifferent = member.arrivalDate !== family.arrivalDate || 
                                              member.departureDate !== family.departureDate ||
                                              member.arrivalTime !== family.arrivalTime ||
                                              member.departureTime !== family.departureTime;
                            
                            return (
                              <div key={idx} className="flex flex-col sm:flex-row gap-1 items-start text-xs bg-accent/30 sm:bg-transparent p-2 sm:p-0 rounded">
                                <div className="flex gap-1 items-center w-full sm:w-32 md:w-40">
                                  <button
                                    onClick={() => openEditMemberDialog(family.id, idx)}
                                    className="flex-1 text-muted-foreground truncate text-left hover:text-foreground hover:underline cursor-pointer"
                                  >
                                    {member.name}
                                  </button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-1 text-destructive" 
                                    onClick={() => deleteMember(family.id, idx)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="text-xs text-muted-foreground sm:hidden">
                                  {member.arrivalDate}/12 {member.arrivalTime} - {member.departureDate}/12 {member.departureTime}
                                </div>
                                <div className="relative flex-1 h-6 hidden sm:block overflow-x-auto">
                                  <div className="absolute inset-y-0 flex gap-0 min-w-max">
                                    {eventDates.map(date => (
                                      <div key={date} className="w-10 h-6 border-l border-border/30" />
                                    ))}
                                  </div>
                                  <div 
                                    className={cn(
                                      "absolute top-1 h-4 rounded min-w-max",
                                      isDifferent ? "bg-[hsl(var(--christmas-gold-muted))]" : "bg-[hsl(var(--christmas-emerald))]"
                                    )}
                                    style={{ 
                                      left: `${memberStartOffset}px`, 
                                      width: `${memberDuration}px`
                                    }}
                                    title={`${member.name}: ${member.arrivalDate}. ${member.arrivalTime} - ${member.departureDate}. ${member.departureTime}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 sm:h-6 mt-2 sm:mt-1 flex-1 sm:flex-none"
                              onClick={() => specifyDays(family.id)}
                            >
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              Spesifiser dager
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 sm:h-6 mt-2 sm:mt-1"
                              onClick={() => openMemberDialog(family.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Legg til medlem
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tasks Widget */}
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-amber-600" />
                  Oppgaveliste
                </CardTitle>
                <Select value={taskSortBy} onValueChange={(v) => setTaskSortBy(v as "name" | "date")}>
                  <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sorter: Navn</SelectItem>
                    <SelectItem value="date">Sorter: Dato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getSortedTasks().map(task => {
                  const people = getAllRegisteredPeople();
                  
                  return (
                    <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 rounded-lg hover:bg-accent">
                      <div className="flex items-center gap-2 flex-1 w-full">
                        <input
                          type="checkbox"
                          checked={task.done}
                          onChange={() => {
                            setTasks(prev => prev.map(t => 
                              t.id === task.id ? { ...t, done: !t.done } : t
                            ));
                          }}
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <span className={cn("text-sm flex-1", task.done && "line-through text-muted-foreground")}>
                          {task.text}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2" 
                          onClick={() => openEditTaskDialog(task)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 px-2 text-destructive" 
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto pl-6 sm:pl-0">
                        <Input
                          type="date"
                          value={task.deadline || ""}
                          onChange={(e) => {
                            setTasks(prev => prev.map(t => 
                              t.id === task.id ? { ...t, deadline: e.target.value } : t
                            ));
                          }}
                          className="h-7 text-xs flex-1 sm:w-28 !text-foreground [&::-webkit-datetime-edit]:text-foreground [&::-webkit-calendar-picker-indicator]:opacity-70"
                        />
                        <Select
                          value={task.assignedTo || "none"}
                          onValueChange={(value) => {
                            setTasks(prev => prev.map(t => 
                              t.id === task.id ? { ...t, assignedTo: value === "none" ? undefined : value } : t
                            ));
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1 sm:w-32">
                            <SelectValue placeholder="Tilordne" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Ingen</SelectItem>
                            {people.map(person => (
                              <SelectItem key={person.id} value={person.id}>
                                {person.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs mt-2"
                  onClick={() => {
                    setEditingTask(null);
                    setEditingTaskText("Ny oppgave");
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Legg til oppgave
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Christmas Calendar - AI Word of the Day */}
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
                        "relative aspect-square rounded-lg border-2 p-2",
                        "transition-all",
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
                        {isOpened ? (
                          <Star className="w-6 h-6 text-yellow-500" />
                        ) : (
                          <Star className={cn(
                            "w-6 h-6 opacity-50",
                            isFuture ? "text-gray-400" : "text-purple-400"
                          )} />
                        )}
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

        {/* Add Family Dialog */}
        <Dialog open={isAddingFamily} onOpenChange={setIsAddingFamily}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                {editingFamily ? "Rediger familie" : "Legg til familie"}
              </DialogTitle>
              <DialogDescription>
                Fyll inn familiens informasjon. Du kan legge til individuelle medlemmer senere.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="familyName">Familienavn *</Label>
                <Input
                  id="familyName"
                  placeholder="f.eks. Familie Hansen"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="numberOfPeople">Antall personer i familien *</Label>
                <Input
                  id="numberOfPeople"
                  type="number"
                  min="1"
                  value={newNumberOfPeople}
                  onChange={(e) => setNewNumberOfPeople(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Ankomstdato *</Label>
                  <Select value={newArrivalDate.toString()} onValueChange={(v) => setNewArrivalDate(parseInt(v))}>
                    <SelectTrigger id="arrivalDate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDates.map(date => (
                        <SelectItem key={date} value={date.toString()}>
                          {date}. desember
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="arrivalTime">Klokkeslett</Label>
                  <Input
                    id="arrivalTime"
                    type="time"
                    value={newArrivalTime}
                    onChange={(e) => setNewArrivalTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Avreisedato *</Label>
                  <Select value={newDepartureDate.toString()} onValueChange={(v) => setNewDepartureDate(parseInt(v))}>
                    <SelectTrigger id="departureDate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDates.map(date => (
                        <SelectItem key={date} value={date.toString()}>
                          {date}. desember
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="departureTime">Klokkeslett</Label>
                  <Input
                    id="departureTime"
                    type="time"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Du kan legge til familiemedlemmer med egne datoer etter at familien er opprettet
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingFamily(false)}>
                Avbryt
              </Button>
              <Button onClick={addFamily} className="bg-gradient-to-r from-green-600 to-amber-600">
                <Plus className="mr-2 h-4 w-4" />
                Legg til
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={memberDialog.open} onOpenChange={(open) => setMemberDialog({ open, familyId: null })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                {memberDialog.editIndex !== undefined ? "Rediger familiemedlem" : "Legg til familiemedlem"}
              </DialogTitle>
              <DialogDescription>
                {memberDialog.editIndex !== undefined 
                  ? "Endre ankomst/avreise datoer for medlemmet."
                  : "Legg til et enkeltmedlem med egne ankomst/avreise datoer."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="memberName">Navn *</Label>
                <Input
                  id="memberName"
                  placeholder="f.eks. Kjetil"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberArrivalDate">Ankomstdato *</Label>
                  <Select value={newMemberArrivalDate.toString()} onValueChange={(v) => setNewMemberArrivalDate(parseInt(v))}>
                    <SelectTrigger id="memberArrivalDate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDates.map(date => (
                        <SelectItem key={date} value={date.toString()}>
                          {date}. desember
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="memberArrivalTime">Klokkeslett</Label>
                  <Input
                    id="memberArrivalTime"
                    type="time"
                    value={newMemberArrivalTime}
                    onChange={(e) => setNewMemberArrivalTime(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="memberDepartureDate">Avreisedato *</Label>
                  <Select value={newMemberDepartureDate.toString()} onValueChange={(v) => setNewMemberDepartureDate(parseInt(v))}>
                    <SelectTrigger id="memberDepartureDate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDates.map(date => (
                        <SelectItem key={date} value={date.toString()}>
                          {date}. desember
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="memberDepartureTime">Klokkeslett</Label>
                  <Input
                    id="memberDepartureTime"
                    type="time"
                    value={newMemberDepartureTime}
                    onChange={(e) => setNewMemberDepartureTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMemberDialog({ open: false, familyId: null, editIndex: undefined })}>
                Avbryt
              </Button>
              <Button onClick={addMember} className="bg-gradient-to-r from-green-600 to-amber-600">
                {memberDialog.editIndex !== undefined ? (
                  <>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Oppdater
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Legg til
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={editingTask !== null} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                {editingTask ? "Rediger oppgave" : "Ny oppgave"}
              </DialogTitle>
              <DialogDescription>
                Skriv inn oppgaveteksten.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="taskText">Oppgavetekst *</Label>
                <Input
                  id="taskText"
                  placeholder="f.eks. Bestille mat"
                  value={editingTaskText}
                  onChange={(e) => setEditingTaskText(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Avbryt
              </Button>
              <Button onClick={saveTask} className="bg-gradient-to-r from-green-600 to-amber-600">
                <Plus className="mr-2 h-4 w-4" />
                {editingTask ? "Oppdater" : "Legg til"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invitation Dialog */}
        <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Send invitasjon
              </DialogTitle>
              <DialogDescription>
                Send en invitasjon til nye familier for å melde seg på julebordet.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invitationEmail">E-postadresse *</Label>
                <Input
                  id="invitationEmail"
                  type="email"
                  placeholder="f.eks. familie@eksempel.no"
                  value={invitationEmail}
                  onChange={(e) => setInvitationEmail(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Invitasjonen inneholder en link til påmeldingsskjemaet.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvitationDialog(false)}>
                Avbryt
              </Button>
              <Button onClick={sendInvitations} className="bg-gradient-to-r from-green-600 to-amber-600">
                <Mail className="mr-2 h-4 w-4" />
                Send invitasjon
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
