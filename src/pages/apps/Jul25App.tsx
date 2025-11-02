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

interface FamilyRegistration {
  id: string;
  familyName: string;
  members: { name: string; dates: number[] }[];
}

interface ChristmasWord {
  date: number;
  word: string;
  generated: boolean;
}

export default function Jul25App() {
  const [families, setFamilies] = useState<FamilyRegistration[]>([]);
  const [christmasWords, setChristmasWords] = useState<ChristmasWord[]>([]);
  const [selectedChristmasDate, setSelectedChristmasDate] = useState<number | null>(null);
  const [isAddingFamily, setIsAddingFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [tasks, setTasks] = useState<{ id: string; text: string; done: boolean }[]>([
    { id: "1", text: "Bestille mat", done: false },
    { id: "2", text: "Planlegge aktiviteter", done: false },
    { id: "3", text: "Sende ut invitasjoner", done: true },
  ]);

  useEffect(() => {
    // Initialize Christmas words for days 1-24
    const words: ChristmasWord[] = [];
    for (let i = 1; i <= 24; i++) {
      words.push({ date: i, word: "", generated: false });
    }
    setChristmasWords(words);
  }, []);

  const generateWordForDay = async (day: number) => {
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
    
    const newFamily: FamilyRegistration = {
      id: crypto.randomUUID(),
      familyName: newFamilyName,
      members: []
    };
    
    setFamilies([...families, newFamily]);
    setNewFamilyName("");
    setIsAddingFamily(false);
    toast.success(`Familie ${newFamilyName} lagt til! 🎄`);
  };

  const addMemberToFamily = (familyId: string, memberName: string) => {
    setFamilies(prev => prev.map(fam => 
      fam.id === familyId 
        ? { ...fam, members: [...fam.members, { name: memberName, dates: [] }] }
        : fam
    ));
  };

  const toggleDateForMember = (familyId: string, memberIndex: number, date: number) => {
    setFamilies(prev => prev.map(fam => {
      if (fam.id !== familyId) return fam;
      
      const newMembers = [...fam.members];
      const member = newMembers[memberIndex];
      
      if (member.dates.includes(date)) {
        member.dates = member.dates.filter(d => d !== date);
      } else {
        member.dates = [...member.dates, date].sort((a, b) => a - b);
      }
      
      return { ...fam, members: newMembers };
    }));
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              <div className="w-40 flex-shrink-0" /> {/* Spacer for family names */}
              {eventDates.map(date => (
                <div key={date} className="w-12 flex-shrink-0 text-center font-medium text-sm">
                  {date}
                </div>
              ))}
            </div>

            {/* Family Rows */}
            {families.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>Ingen familier lagt til ennå</p>
                <p className="text-sm">Klikk "Legg til familie" for å komme i gang</p>
              </div>
            ) : (
              <div className="space-y-4">
                {families.map((family) => (
                  <div key={family.id} className="space-y-2">
                    <div className="flex gap-2 items-start">
                      {/* Family Name */}
                      <div className="w-40 flex-shrink-0">
                        <Select
                          value={family.familyName}
                          onValueChange={(value) => {
                            setFamilies(prev => prev.map(f => 
                              f.id === family.id ? { ...f, familyName: value } : f
                            ));
                          }}
                        >
                          <SelectTrigger className="bg-red-600 text-white border-0 h-8 text-sm">
                            <SelectValue placeholder="<Familienavn>" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={family.familyName}>{family.familyName}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Date Grid for this family */}
                      <div className="flex gap-2 overflow-x-auto">
                        {eventDates.map(date => {
                          const membersOnDate = family.members.filter(m => m.dates.includes(date));
                          return (
                            <div key={date} className="w-12 h-8 flex-shrink-0 text-center text-xs">
                              {membersOnDate.length > 0 && (
                                <Badge variant="secondary" className="w-full h-full flex items-center justify-center">
                                  {membersOnDate.length}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Member Buttons */}
                    <div className="flex gap-2 items-center pl-40">
                      {family.members.map((member, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="bg-red-100 dark:bg-red-950/30 border-red-300 dark:border-red-900 text-xs h-7"
                          onClick={() => {
                            toast.info(`Redigerer datoer for ${member.name}`);
                          }}
                        >
                          {member.name}
                        </Button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          const name = prompt("Navn på nytt familiemedlem:");
                          if (name) addMemberToFamily(family.id, name);
                        }}
                      >
                        + Navn
                      </Button>
                    </div>
                  </div>
                ))}
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
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
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
                    <span className={cn("text-sm", task.done && "line-through text-muted-foreground")}>
                      {task.text}
                    </span>
                  </div>
                ))}
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
                  
                  return (
                    <button
                      key={item.date}
                      onClick={() => !isOpened && generateWordForDay(item.date)}
                      disabled={isOpened}
                      className={cn(
                        "relative aspect-square rounded-lg border-2 p-2",
                        "transition-all hover:scale-105 hover:shadow-lg",
                        isOpened 
                          ? "bg-green-100 dark:bg-green-950/30 border-green-300 dark:border-green-900" 
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-950/40"
                      )}
                    >
                      <div className="absolute top-1 left-1 text-xs font-bold text-red-600">
                        {item.date}
                      </div>
                      <div className="flex items-center justify-center h-full text-center">
                        {isOpened ? (
                          <div className="text-xs font-medium px-1 text-green-700 dark:text-green-300">
                            {item.word}
                          </div>
                        ) : (
                          <Gift className="w-6 h-6 text-red-400 opacity-50" />
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
                  onKeyDown={(e) => e.key === 'Enter' && addFamily()}
                />
              </div>
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
