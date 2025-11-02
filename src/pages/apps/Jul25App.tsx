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
import { Calendar as CalendarIcon, Users, Sparkles, Gift, Star, CheckSquare, Plus, ArrowUpDown } from "lucide-react";
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
  const [newFamilyName, setNewFamilyName] = useState("");
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
  
  const [mockToday] = useState(15);

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

      const newWord = { date: day, word: data.text, generated: true };
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
    
    const newFamily: FamilyRegistration = {
      id: crypto.randomUUID(),
      familyName: newFamilyName,
      arrivalDate: newArrivalDate,
      arrivalTime: newArrivalTime,
      departureDate: newDepartureDate,
      departureTime: newDepartureTime,
      members: [],
      expanded: false
    };
    
    setFamilies([...families, newFamily]);
    setNewFamilyName("");
    setNewArrivalDate(19);
    setNewArrivalTime("15:00");
    setNewDepartureDate(31);
    setNewDepartureTime("12:00");
    setIsAddingFamily(false);
    toast.success(`Familie ${newFamilyName} lagt til! 🎄`);
  };

  const openMemberDialog = (familyId: string) => {
    const family = families.find(f => f.id === familyId);
    if (!family) return;
    
    setNewMemberName("");
    setNewMemberArrivalDate(family.arrivalDate);
    setNewMemberArrivalTime(family.arrivalTime);
    setNewMemberDepartureDate(family.departureDate);
    setNewMemberDepartureTime(family.departureTime);
    setMemberDialog({ open: true, familyId });
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
    
    setFamilies(prev => prev.map(fam => 
      fam.id === memberDialog.familyId
        ? { 
            ...fam, 
            members: [...fam.members, { 
              name: newMemberName, 
              arrivalDate: newMemberArrivalDate,
              arrivalTime: newMemberArrivalTime,
              departureDate: newMemberDepartureDate,
              departureTime: newMemberDepartureTime
            }] 
          }
        : fam
    ));
    
    toast.success(`${newMemberName} lagt til!`);
    setMemberDialog({ open: false, familyId: null });
  };

  const toggleFamilyExpanded = (familyId: string) => {
    setFamilies(prev => prev.map(fam => 
      fam.id === familyId ? { ...fam, expanded: !fam.expanded } : fam
    ));
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

  // Gantt layout constants
  const DAY_W = 40; // matches w-10
  const DAY_GAP = 0; // matches gap-0
  const DAY_UNIT = DAY_W + DAY_GAP;

  const eventDates = Array.from({ length: 13 }, (_, i) => i + 19); // 19-31

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-green-50 to-white dark:from-red-950/20 dark:via-green-950/20 dark:to-background">
      {/* Snowflake decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <Sparkles className="absolute top-10 left-10 w-6 h-6 text-blue-300 animate-pulse" />
        <Star className="absolute top-20 right-20 w-5 h-5 text-yellow-300 animate-pulse" />
        <Gift className="absolute bottom-20 left-20 w-6 h-6 text-red-300 animate-bounce" />
        <Sparkles className="absolute bottom-10 right-10 w-5 h-5 text-blue-300 animate-pulse" />
      </div>

      <div className="container mx-auto py-8 space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Gift className="w-12 h-12 text-red-600 animate-bounce" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 via-green-600 to-red-600 bg-clip-text text-transparent">
              Jul25 Familiejul
            </h1>
            <Gift className="w-12 h-12 text-red-600 animate-bounce" />
          </div>
          <p className="text-xl text-muted-foreground">
            AG Jacobsen Consulting - Familiejul 2025
          </p>
          <p className="text-sm text-muted-foreground">
            🎄 Meld deg på og fortell oss når du kommer! 🎅
          </p>
        </div>

        {/* Main Calendar - Family Registration */}
        <Card className="border-2 border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                Familiejul Kalender
              </CardTitle>
              <Button 
                onClick={() => setIsAddingFamily(true)}
                size="sm"
                className="bg-gradient-to-r from-red-600 to-green-600 w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til familie
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {/* Date Header - Hidden on mobile, scrollable on larger screens */}
            <div className="hidden sm:flex gap-0 overflow-x-auto pb-2">
              <div className="w-32 sm:w-40 flex-shrink-0" />
              {eventDates.map(date => (
                <div key={date} className="w-10 flex-shrink-0 text-center font-medium text-xs border-l border-border/30">
                  {date}
                </div>
              ))}
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
                  
                  return (
                    <div key={family.id} className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-start">
                        {/* Family Name and Info */}
                        <div className="w-full sm:w-32 md:w-40 flex-shrink-0">
                          <button
                            onClick={() => toggleFamilyExpanded(family.id)}
                            className="w-full bg-red-600 text-white rounded px-2 py-2 sm:py-1 text-sm text-left hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            <span className="text-xs">{family.expanded ? '▼' : '▶'}</span>
                            <span className="truncate">{family.familyName}</span>
                          </button>
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
                            className="absolute top-1 h-6 bg-red-500 rounded cursor-pointer hover:bg-red-600 transition-colors flex items-center justify-center text-xs text-white font-medium min-w-max"
                            style={{ 
                              left: `${startOffset}px`, 
                              width: `${duration}px` 
                            }}
                            title={`${family.familyName}: ${family.arrivalDate}. ${family.arrivalTime} - ${family.departureDate}. ${family.departureTime}`}
                          >
                            {family.members.length > 0 ? `${family.members.length + 1}` : '1'}
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
                                <span className="w-full sm:w-32 md:w-40 text-muted-foreground truncate flex items-center gap-1">
                                  {member.name} {isDifferent && <span className="text-orange-500">⚠️</span>}
                                </span>
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
                                      isDifferent ? "bg-orange-400" : "bg-red-400"
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-8 sm:h-6 mt-2 sm:mt-1 w-full sm:w-auto"
                            onClick={() => openMemberDialog(family.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Legg til medlem
                          </Button>
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
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-600" />
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
                          className="h-7 text-xs flex-1 sm:w-28"
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
                    const text = prompt("Ny oppgave:");
                    if (text) {
                      setTasks(prev => [...prev, { id: crypto.randomUUID(), text, done: false }]);
                    }
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Legg til oppgave
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Christmas Calendar - AI Word of the Day */}
          <Card className="border-2 border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
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
                          ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900 hover:scale-105" 
                          : isFuture
                          ? "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-800 opacity-50 cursor-not-allowed"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/40 hover:scale-105 hover:shadow-lg cursor-pointer"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 left-1 text-xs font-bold",
                        isFuture ? "text-gray-400" : "text-red-600"
                      )}>
                        {item.date}
                      </div>
                      <div className="flex items-center justify-center h-full text-center">
                        {isOpened ? (
                          <Sparkles className="w-6 h-6 text-green-600" />
                        ) : (
                          <Gift className={cn(
                            "w-6 h-6 opacity-50",
                            isFuture ? "text-gray-400" : "text-red-400"
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
                <Gift className="w-6 h-6 text-green-600" />
                Dag {selectedWord?.date} - Ord for dagen
              </DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-4">
                {selectedWord?.word}
              </div>
              <Sparkles className="w-12 h-12 mx-auto text-green-500 animate-pulse" />
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Family Dialog */}
        <Dialog open={isAddingFamily} onOpenChange={setIsAddingFamily}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                Legg til familie
              </DialogTitle>
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
              <Button onClick={addFamily} className="bg-gradient-to-r from-red-600 to-green-600">
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
                <Users className="w-5 h-5 text-red-600" />
                Legg til familiemedlem
              </DialogTitle>
              <DialogDescription className="text-xs">
                Standard datoer er hentet fra familien, men kan endres
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
              <Button variant="outline" onClick={() => setMemberDialog({ open: false, familyId: null })}>
                Avbryt
              </Button>
              <Button onClick={addMember} className="bg-gradient-to-r from-red-600 to-green-600">
                <Plus className="mr-2 h-4 w-4" />
                Legg til
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
