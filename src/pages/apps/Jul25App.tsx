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
import { Calendar as CalendarIcon, Users, Sparkles, Gift, Star, CheckSquare, Plus } from "lucide-react";
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
  assignedTo?: string; // familyId-memberIndex or familyId
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
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", text: "Bestille mat", done: false },
    { id: "2", text: "Planlegge aktiviteter", done: false },
    { id: "3", text: "Sende ut invitasjoner", done: true },
  ]);
  
  // Mock today's date for testing (day of December)
  const [mockToday] = useState(15); // Set to 15 for testing, so doors 1-15 can be opened

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
    
    const prompt = `Generer et positivt, julete norsk ord eller uttrykk for dag ${day} i julekalenderen. Bare ett ord eller kort uttrykk, ingen forklaring.`;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { prompt, maxLength: 30 }
      });

      if (error) throw error;

      setChristmasWords(prev => prev.map(w => 
        w.date === day ? { ...w, word: data.text, generated: true } : w
      ));
      
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

  const addMemberToFamily = (familyId: string) => {
    const memberName = prompt("Navn på familiemedlem:");
    if (!memberName) return;
    
    const family = families.find(f => f.id === familyId);
    if (!family) return;
    
    const arrivalDateStr = prompt("Ankomstdato (19-31):", family.arrivalDate.toString());
    const arrivalDate = parseInt(arrivalDateStr || family.arrivalDate.toString());
    
    const arrivalTime = prompt("Ankomsttid (HH:MM):", family.arrivalTime) || family.arrivalTime;
    
    const departureDateStr = prompt("Avreisedato (19-31):", family.departureDate.toString());
    const departureDate = parseInt(departureDateStr || family.departureDate.toString());
    
    const departureTime = prompt("Avreisetid (HH:MM):", family.departureTime) || family.departureTime;
    
    setFamilies(prev => prev.map(fam => 
      fam.id === familyId 
        ? { 
            ...fam, 
            members: [...fam.members, { 
              name: memberName, 
              arrivalDate,
              arrivalTime,
              departureDate,
              departureTime
            }] 
          }
        : fam
    ));
    toast.success(`${memberName} lagt til!`);
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                Familiejul Kalender
              </CardTitle>
              <Button 
                onClick={() => setIsAddingFamily(true)}
                size="sm"
                className="bg-gradient-to-r from-red-600 to-green-600"
              >
                <Plus className="mr-2 h-4 w-4" />
                Legg til familie
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Header */}
            <div className="flex gap-1 overflow-x-auto pb-2">
              <div className="w-40 flex-shrink-0" /> {/* Spacer for family names */}
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
                  const startOffset = (family.arrivalDate - 19) * 40; // 40px per day
                  const duration = (family.departureDate - family.arrivalDate + 1) * 40;
                  
                  return (
                    <div key={family.id} className="space-y-1">
                      <div className="flex gap-1 items-center">
                        {/* Family Name */}
                        <button
                          onClick={() => toggleFamilyExpanded(family.id)}
                          className="w-40 flex-shrink-0 bg-red-600 text-white rounded px-2 py-1 text-sm text-left hover:bg-red-700 transition-colors flex items-center gap-1"
                        >
                          <span className="text-xs">{family.expanded ? '▼' : '▶'}</span>
                          {family.familyName}
                        </button>

                        {/* Gantt Bar */}
                        <div className="relative flex-1 h-8">
                          <div className="absolute inset-y-0 flex gap-1">
                            {eventDates.map(date => (
                              <div key={date} className="w-10 h-8 border-l border-border/30" />
                            ))}
                          </div>
                          <div 
                            className="absolute top-1 h-6 bg-red-500 rounded cursor-pointer hover:bg-red-600 transition-colors flex items-center justify-center text-xs text-white font-medium"
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
                        <div className="pl-44 space-y-1">
                          {family.members.map((member, idx) => {
                            const memberStartOffset = (member.arrivalDate - 19) * 40;
                            const memberDuration = (member.departureDate - member.arrivalDate + 1) * 40;
                            const isDifferent = member.arrivalDate !== family.arrivalDate || 
                                              member.departureDate !== family.departureDate ||
                                              member.arrivalTime !== family.arrivalTime ||
                                              member.departureTime !== family.departureTime;
                            
                            return (
                              <div key={idx} className="flex gap-1 items-center text-xs">
                                <span className="w-32 text-muted-foreground truncate">
                                  {member.name} {isDifferent && '⚠️'}
                                </span>
                                <div className="relative flex-1 h-6">
                                  <div className="absolute inset-y-0 flex gap-1">
                                    {eventDates.map(date => (
                                      <div key={date} className="w-10 h-6 border-l border-border/30" />
                                    ))}
                                  </div>
                                  <div 
                                    className={cn(
                                      "absolute top-1 h-4 rounded",
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
                            className="text-xs h-6 mt-1"
                            onClick={() => addMemberToFamily(family.id)}
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Tasks Widget */}
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                Oppgaveliste
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tasks.map(task => {
                  const people = getAllRegisteredPeople();
                  const assignedPerson = people.find(p => p.id === task.assignedTo);
                  
                  return (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => {
                          setTasks(prev => prev.map(t => 
                            t.id === task.id ? { ...t, done: !t.done } : t
                          ));
                        }}
                        className="w-4 h-4"
                      />
                      <span className={cn("text-sm flex-1", task.done && "line-through text-muted-foreground")}>
                        {task.text}
                      </span>
                      <Select
                        value={task.assignedTo || ""}
                        onValueChange={(value) => {
                          setTasks(prev => prev.map(t => 
                            t.id === task.id ? { ...t, assignedTo: value || undefined } : t
                          ));
                        }}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue placeholder="Tilordne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Ingen</SelectItem>
                          {people.map(person => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="w-5 h-5 text-green-600" />
                Julekalender - Ord for dagen
              </CardTitle>
              <CardDescription>
                Klikk på en luke for å generere dagens juleord med AI! 🎄
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {christmasWords.map((item) => {
                  const isOpened = item.generated;
                  const canOpen = item.date <= mockToday;
                  const isFuture = item.date > mockToday;
                  
                  return (
                    <button
                      key={item.date}
                      onClick={() => canOpen && !isOpened && generateWordForDay(item.date)}
                      disabled={isOpened || isFuture}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 p-2",
                        "transition-all",
                        isOpened 
                          ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900" 
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
                          <div className="text-xs font-medium px-1 text-green-700 dark:text-green-300">
                            {item.word}
                          </div>
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
      </div>
    </div>
  );
}
