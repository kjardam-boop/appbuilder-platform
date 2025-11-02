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
import { Calendar as CalendarIcon, Users, Sparkles, Gift, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isSameDay } from "date-fns";
import { nb } from "date-fns/locale";

interface Attendance {
  id: string;
  name: string;
  email: string;
  arrival_date: string;
  departure_date: string;
  notes: string | null;
  created_at: string;
}

export default function Jul25App() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [arrivalDate, setArrivalDate] = useState<Date | undefined>(undefined);
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadAttendances();
  }, []);

  const loadAttendances = async () => {
    try {
      // For POC, we'll create a simple table later
      // For now, mock data
      setAttendances([]);
    } catch (error) {
      console.error('Error loading attendances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !email || !arrivalDate || !departureDate) {
      toast.error("Vennligst fyll ut alle felter");
      return;
    }

    if (departureDate < arrivalDate) {
      toast.error("Avreisedato må være etter ankomstdato");
      return;
    }

    // For POC - would save to database
    const newAttendance: Attendance = {
      id: crypto.randomUUID(),
      name,
      email,
      arrival_date: arrivalDate.toISOString(),
      departure_date: departureDate.toISOString(),
      notes,
      created_at: new Date().toISOString()
    };

    setAttendances([...attendances, newAttendance]);
    toast.success(`Påmeldt! Velkommen ${name} 🎄`);
    
    // Reset form
    setName("");
    setEmail("");
    setArrivalDate(undefined);
    setDepartureDate(undefined);
    setNotes("");
    setIsDialogOpen(false);
  };

  const getAttendeesForDate = (date: Date) => {
    return attendances.filter(att => {
      const arrival = new Date(att.arrival_date);
      const departure = new Date(att.departure_date);
      return date >= arrival && date <= departure;
    });
  };

  const getDatesInRange = () => {
    const start = new Date(2025, 11, 1); // December 1, 2025
    const end = new Date(2025, 11, 24); // December 24, 2025
    const dates: Date[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    
    return dates;
  };

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
              Jul25 Julebord
            </h1>
            <Gift className="w-12 h-12 text-red-600 animate-bounce" />
          </div>
          <p className="text-xl text-muted-foreground">
            AG Jacobsen Consulting - Julebord 2025
          </p>
          <p className="text-sm text-muted-foreground">
            🎄 Meld deg på og fortell oss når du kommer! 🎅
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Påmeldte</CardTitle>
              <Users className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{attendances.length}</div>
              <p className="text-xs text-muted-foreground">Deltakere totalt</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dager til jul</CardTitle>
              <CalendarIcon className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {Math.max(0, Math.ceil((new Date(2025, 11, 24).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}
              </div>
              <p className="text-xs text-muted-foreground">Dager igjen</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Julestatus</CardTitle>
              <Sparkles className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">🎉</div>
              <p className="text-xs text-muted-foreground">Klar for fest!</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Grid */}
        <Card className="border-2 border-red-200 dark:border-red-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-red-600" />
                  Julekalender
                </CardTitle>
                <CardDescription>
                  Klikk på en dato for å se hvem som kommer
                </CardDescription>
              </div>
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700"
              >
                <Users className="mr-2 h-4 w-4" />
                Meld deg på
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {getDatesInRange().map((date, idx) => {
                const attendeesOnDate = getAttendeesForDate(date);
                const dayNum = idx + 1;
                const isToday = isSameDay(date, new Date());
                
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative aspect-square rounded-lg border-2 p-2
                      transition-all hover:scale-105 hover:shadow-lg
                      ${isToday 
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' 
                        : 'border-red-200 dark:border-red-900 bg-white dark:bg-card'
                      }
                      ${attendeesOnDate.length > 0 
                        ? 'ring-2 ring-green-500 ring-offset-2' 
                        : ''
                      }
                    `}
                  >
                    <div className="absolute top-1 left-1 text-xs font-bold text-red-600">
                      {dayNum}
                    </div>
                    <div className="flex items-center justify-center h-full">
                      {attendeesOnDate.length > 0 ? (
                        <div className="text-center">
                          <Gift className="w-6 h-6 text-green-600 mx-auto mb-1" />
                          <Badge variant="secondary" className="text-xs">
                            {attendeesOnDate.length}
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-2xl opacity-20">
                          {dayNum <= 24 ? '🎄' : ''}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                {format(selectedDate, "EEEE d. MMMM", { locale: nb })}
              </CardTitle>
              <CardDescription>
                Hvem kommer denne dagen?
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getAttendeesForDate(selectedDate).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ingen påmeldt for denne dagen ennå 🎅
                </p>
              ) : (
                <div className="space-y-2">
                  {getAttendeesForDate(selectedDate).map((att) => (
                    <div 
                      key={att.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div>
                        <div className="font-semibold">{att.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Ankomst: {format(new Date(att.arrival_date), "d. MMM", { locale: nb })} • 
                          Avreise: {format(new Date(att.departure_date), "d. MMM", { locale: nb })}
                        </div>
                      </div>
                      <Gift className="w-5 h-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Registration Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-red-600" />
                Meld deg på julebordet
              </DialogTitle>
              <DialogDescription>
                Fortell oss når du kommer, så holder vi oversikten! 🎄
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Navn *</Label>
                <Input
                  id="name"
                  placeholder="Ola Nordmann"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-post *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ola@agj.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ankomst *</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => document.getElementById('arrival-cal')?.click()}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {arrivalDate ? format(arrivalDate, "d. MMM", { locale: nb }) : "Velg dato"}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Avreise *</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => document.getElementById('departure-cal')?.click()}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departureDate ? format(departureDate, "d. MMM", { locale: nb }) : "Velg dato"}
                  </Button>
                </div>
              </div>
              <div className="hidden">
                <Calendar
                  id="arrival-cal"
                  mode="single"
                  selected={arrivalDate}
                  onSelect={setArrivalDate}
                  disabled={(date) => date < new Date(2025, 11, 1) || date > new Date(2025, 11, 24)}
                />
                <Calendar
                  id="departure-cal"
                  mode="single"
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  disabled={(date) => date < new Date(2025, 11, 1) || date > new Date(2025, 11, 24)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Kommentar</Label>
                <Input
                  id="notes"
                  placeholder="Mat-preferanser, allergier etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Avbryt
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-red-600 to-green-600"
              >
                <Gift className="mr-2 h-4 w-4" />
                Meld meg på!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
