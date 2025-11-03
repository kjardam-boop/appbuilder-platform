import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Edit2, Trash2, MapPin, CalendarIcon, Users, UserPlus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useJul25Families, useJul25FamilyMembers, useUpdateFamily } from "@/hooks/useJul25Families";
import { useJul25FamilyPeriods, useCreatePeriod, useUpdatePeriod, useDeletePeriod, useMemberPeriods } from "@/hooks/useJul25FamilyPeriods";
import { useDebounce } from "@/hooks/useDebounce";

export default function Jul25FamilyAdmin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const familyId = searchParams.get("familyId");
  
  const { data: families = [] } = useJul25Families();
  const { data: allMembers = [] } = useJul25FamilyMembers();
  const { data: allPeriods = [] } = useJul25FamilyPeriods();
  const { data: allMemberPeriods = [] } = useMemberPeriods(); // Fetch all member periods once
  
  const family = families.find(f => f.id === familyId);
  const members = allMembers.filter(m => m.family_id === familyId);
  const periods = allPeriods.filter(p => p.family_id === familyId);
  
  const updateFamily = useUpdateFamily();
  const createPeriod = useCreatePeriod();
  const updatePeriod = useUpdatePeriod();
  const deletePeriod = useDeletePeriod();
  
  // Local state for inline editing
  const [editingName, setEditingName] = useState(false);
  const [familyName, setFamilyName] = useState(family?.name || "");
  const [peopleCount, setPeopleCount] = useState(family?.number_of_people || 2);
  
  // Period dialog state
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [periodLocation, setPeriodLocation] = useState<'Jajabo' | 'JaJabu'>('Jajabo');
  const [periodArrival, setPeriodArrival] = useState<Date | undefined>(new Date(2025, 11, 20));
  const [periodDeparture, setPeriodDeparture] = useState<Date | undefined>(new Date(2025, 11, 25));
  
  // Debounced autosave for family name
  const debouncedFamilyName = useDebounce(familyName, 500);
  
  // Autosave family name
  useEffect(() => {
    if (family && debouncedFamilyName && debouncedFamilyName !== family.name) {
      updateFamily.mutate({ id: family.id, name: debouncedFamilyName });
    }
  }, [debouncedFamilyName, family]);
  
  // Autosave people count
  const handlePeopleCountChange = (delta: number) => {
    const newCount = Math.max(1, peopleCount + delta);
    setPeopleCount(newCount);
    if (family) {
      updateFamily.mutate({ id: family.id, number_of_people: newCount });
    }
  };
  
  const handleSavePeriod = () => {
    if (!periodArrival || !periodDeparture) {
      toast.error("Velg både ankomst og avreise");
      return;
    }
    
    if (periodDeparture < periodArrival) {
      toast.error("Avreise kan ikke være før ankomst");
      return;
    }
    
    const periodData = {
      family_id: familyId!,
      location: periodLocation,
      arrival_date: periodArrival.toISOString(),
      departure_date: periodDeparture.toISOString(),
    };
    
    if (editingPeriod) {
      updatePeriod.mutate({ id: editingPeriod.id, ...periodData }, {
        onSuccess: () => {
          setPeriodDialogOpen(false);
          setEditingPeriod(null);
        },
      });
    } else {
      createPeriod.mutate(periodData, {
        onSuccess: () => {
          setPeriodDialogOpen(false);
        },
      });
    }
  };
  
  const handleEditPeriod = (period: any) => {
    setEditingPeriod(period);
    setPeriodLocation(period.location);
    setPeriodArrival(new Date(period.arrival_date));
    setPeriodDeparture(new Date(period.departure_date));
    setPeriodDialogOpen(true);
  };
  
  const handleDeletePeriod = (periodId: string) => {
    if (confirm("Er du sikker på at du vil slette denne perioden?")) {
      deletePeriod.mutate(periodId);
    }
  };
  
  const handleAddPeriod = () => {
    setEditingPeriod(null);
    setPeriodLocation('Jajabo');
    setPeriodArrival(new Date(2025, 11, 20));
    setPeriodDeparture(new Date(2025, 11, 25));
    setPeriodDialogOpen(true);
  };
  
  if (!family) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/apps/jul25")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake til Jul25
          </Button>
          <p className="mt-4 text-muted-foreground">Familie ikke funnet</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Button variant="ghost" onClick={() => navigate("/apps/jul25")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til Jul25
        </Button>
        
        <h1 className="text-3xl font-bold text-green-800 mb-6">Familieadministrasjon</h1>
        
        {/* Family Info Card */}
        <Card className="border-2 border-green-600">
          <CardHeader className="bg-green-700 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Familieinfo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Family Name */}
            <div>
              <Label>Familienavn</Label>
              {editingName ? (
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  onBlur={() => setEditingName(false)}
                  autoFocus
                  className="mt-1"
                />
              ) : (
                <div 
                  onClick={() => setEditingName(true)}
                  className="mt-1 p-2 border rounded cursor-pointer hover:bg-green-50"
                >
                  {familyName || family.name}
                </div>
              )}
            </div>
            
            {/* Number of People */}
            <div>
              <Label>Antall personer</Label>
              <div className="flex items-center gap-3 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePeopleCountChange(-1)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold text-green-800 min-w-[3rem] text-center">
                  {peopleCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePeopleCountChange(1)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Periods */}
            <div>
              <Label>Perioder / Steder</Label>
              <div className="mt-2 space-y-2">
                {periods.map(period => (
                  <Card 
                    key={period.id}
                    className={cn(
                      "border-2",
                      period.location === 'Jajabo' ? "bg-green-100 border-green-300" : "bg-amber-100 border-amber-300"
                    )}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className={cn(
                          "h-5 w-5",
                          period.location === 'Jajabo' ? "text-green-700" : "text-amber-700"
                        )} />
                        <div>
                          <div className="font-semibold">
                            {period.location} {period.location === 'Jajabo' ? '(Nøtterøy)' : '(Nissedal)'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(period.arrival_date), "dd. MMM")} - {format(new Date(period.departure_date), "dd. MMM yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleEditPeriod(period)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeletePeriod(period.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                <Button 
                  variant="outline"
                  onClick={handleAddPeriod}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Legg til periode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Members List */}
        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Familiemedlemmer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {members.map(member => {
                  // Filter member periods for this specific member
                  const memberPeriods = allMemberPeriods.filter(mp => mp.member_id === member.id);
                  
                  return (
                    <Card key={member.id} className="border">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">
                            {member.name}
                            {member.user_id && (
                              <Badge variant="secondary" className="ml-2">Bruker</Badge>
                            )}
                            {member.is_admin && (
                              <Badge variant="default" className="ml-2 bg-green-600">Admin</Badge>
                            )}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {periods.map(period => {
                              const isInPeriod = memberPeriods.some(mp => mp.period_id === period.id);
                              if (!isInPeriod) return null;
                              
                              return (
                                <Badge 
                                  key={period.id}
                                  variant="outline"
                                  className={cn(
                                    period.location === 'Jajabo' 
                                      ? "bg-green-200 text-green-800 border-green-300" 
                                      : "bg-amber-200 text-amber-800 border-amber-300"
                                  )}
                                >
                                  {period.location}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(`/apps/jul25/member/${member.id}`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Period Dialog */}
        <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingPeriod ? 'Rediger periode' : 'Ny periode'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Sted</Label>
                <Select value={periodLocation} onValueChange={(v: any) => setPeriodLocation(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jajabo">Jajabo (Nøtterøy)</SelectItem>
                    <SelectItem value="JaJabu">JaJabu (Nissedal)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Ankomstdag</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodArrival && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodArrival ? format(periodArrival, "PPP") : <span>Velg dato</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodArrival}
                      onSelect={setPeriodArrival}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label>Avreisedag</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !periodDeparture && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {periodDeparture ? format(periodDeparture, "PPP") : <span>Velg dato</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={periodDeparture}
                      onSelect={setPeriodDeparture}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPeriodDialogOpen(false)}>
                Avbryt
              </Button>
              <Button onClick={handleSavePeriod} className="bg-green-600 hover:bg-green-700">
                Lagre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
