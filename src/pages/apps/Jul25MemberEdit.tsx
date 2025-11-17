import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, CalendarIcon, MapPin, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { useJul25FamilyMembers, useUpdateFamilyMember, useDeleteFamilyMember, useUpdateFamily, useJul25Families } from "@/hooks/useJul25Families";
import { useJul25FamilyPeriods, useMemberPeriods, useSetMemberPeriods } from "@/hooks/useJul25FamilyPeriods";
import { useMemberCustomPeriods, useCreateMemberCustomPeriod, useUpdateMemberCustomPeriod, useDeleteMemberCustomPeriod } from "@/hooks/useJul25MemberCustomPeriods";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { useAppAdmin } from "@/hooks/useAppRole";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toDateOnlyString } from "@/lib/date";

export default function Jul25MemberEdit() {
  const navigate = useNavigate();
  const { memberId } = useParams<{ memberId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { isAppAdmin } = useAppAdmin('jul25');
  const { isPlatformAdmin } = usePlatformAdmin();
  
  const { data: allMembers = [] } = useJul25FamilyMembers();
  const { data: families = [] } = useJul25Families();
  const member = allMembers.find(m => m.id === memberId);
  const familyId = member?.family_id;
  const family = families.find(f => f.id === familyId);
  
  const { data: periods = [] } = useJul25FamilyPeriods(familyId);
  const { data: memberPeriods = [] } = useMemberPeriods(memberId);
  const { data: customPeriods = [] } = useMemberCustomPeriods(memberId);
  
  // Check if current user has permission (platform admin, app admin, or family admin)
  const { data: currentUserMember, isLoading: isLoadingAdmin } = useQuery({
    queryKey: ["current-user-member", user?.id, familyId],
    queryFn: async () => {
      if (!user?.id || !familyId) return null;
      const { data } = await supabase
        .from('jul25_family_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', familyId)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && !!familyId,
  });
  
  const hasPermission = isPlatformAdmin || isAppAdmin || currentUserMember?.is_admin;
  
  const updateMember = useUpdateFamilyMember();
  const deleteMember = useDeleteFamilyMember();
  const updateFamily = useUpdateFamily();
  const setMemberPeriods = useSetMemberPeriods();
  const createCustom = useCreateMemberCustomPeriod();
  const updateCustom = useUpdateMemberCustomPeriod();
  const deleteCustom = useDeleteMemberCustomPeriod();
  
  // Local state
  const [memberName, setMemberName] = useState(member?.name || "");
  const [selectedPeriodIds, setSelectedPeriodIds] = useState<string[]>([]);
  const [customArrival, setCustomArrival] = useState<Date | undefined>(
    member?.arrival_date ? new Date(member.arrival_date) : undefined
  );
  const [customDeparture, setCustomDeparture] = useState<Date | undefined>(
    member?.departure_date ? new Date(member.departure_date) : undefined
  );
  const [customLocation, setCustomLocation] = useState<'Jajabo' | 'JaJabu' | undefined>(
    (member?.custom_period_location as 'Jajabo' | 'JaJabu') || undefined
  );
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  
  // Initialize selected periods
  useEffect(() => {
    if (memberPeriods.length > 0) {
      setSelectedPeriodIds(memberPeriods.map(mp => mp.period_id));
    }
  }, [memberPeriods]);
  
  // Initialize member name
  useEffect(() => {
    if (member) {
      setMemberName(member.name);
    }
  }, [member]);
  
  // Debounced autosave for member name
  const debouncedMemberName = useDebounce(memberName, 500);
  
  useEffect(() => {
    if (member && debouncedMemberName && debouncedMemberName !== member.name) {
      updateMember.mutate({ id: member.id, name: debouncedMemberName });
    }
  }, [debouncedMemberName]);
  
  const handleTogglePeriod = (periodId: string) => {
    setSelectedPeriodIds(prev => 
      prev.includes(periodId)
        ? prev.filter(id => id !== periodId)
        : [...prev, periodId]
    );
  };
  
  const handleSave = async () => {
    if (!member) return;

    try {
      // 1. Save custom period first if set
      if (customArrival && customDeparture && customLocation) {
        if (editingCustomId) {
          await updateCustom.mutateAsync({
            id: editingCustomId,
            location: customLocation,
            start_date: toDateOnlyString(customArrival),
            end_date: toDateOnlyString(customDeparture),
          });
          setEditingCustomId(null);
        } else {
          await createCustom.mutateAsync({
            member_id: member.id,
            location: customLocation,
            start_date: toDateOnlyString(customArrival),
            end_date: toDateOnlyString(customDeparture),
          });
        }
        // Clear form after save
        setCustomArrival(undefined);
        setCustomDeparture(undefined);
        setCustomLocation(undefined);
      }
      
      // 2. Save period selections
      await setMemberPeriods.mutateAsync({
        memberId: member.id,
        periodIds: selectedPeriodIds,
      });

      // 3. Navigate back after all saves complete
      toast.success("Endringer lagret");
      navigate(`/apps/jul25/admin?familyId=${familyId}`);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.message || "Kunne ikke lagre endringer");
    }
  };
  
  if (isLoadingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/apps/jul25")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
          <p className="mt-4 text-muted-foreground">Medlem ikke funnet</p>
        </div>
      </div>
    );
  }

  // Check if user has permission (platform admin, app admin, or family admin)
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(`/apps/jul25/admin?familyId=${familyId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tilbake
          </Button>
          <Card className="mt-8 border-2 border-amber-300">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Du må være administrator (platform, app, eller familie) for å redigere medlemmer.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (!member) return;
    if (!confirm(`Er du sikker på at du vil slette ${member.name}?`)) return;
    
    deleteMember.mutate(memberId!, {
      onSuccess: () => {
        // Update family member count
        if (family && allMembers) {
          const currentFamilyMembers = allMembers.filter(m => m.family_id === familyId);
          const newCount = Math.max(1, currentFamilyMembers.length - 1);
          updateFamily.mutate({
            id: family.id,
            number_of_people: newCount,
          });
        }
        navigate(`/apps/jul25/admin?familyId=${familyId}`);
      },
    });
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/apps/jul25/admin?familyId=${familyId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tilbake til familieadministrasjon
        </Button>
        
        <h1 className="text-3xl font-bold text-green-800 mb-6 flex items-center gap-2">
          <User className="h-8 w-8" />
          Rediger medlem
        </h1>
        
        {/* Member Edit Card */}
        <Card className="border-2 border-green-500">
          <CardHeader className="bg-green-600 text-white">
            <CardTitle>Medlemsdetaljer</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Name */}
            <div>
              <Label>Navn</Label>
              <Input
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="mt-1"
              />
            </div>
            
            {/* User Status */}
            {member.user_id && (
              <div>
                <Label>Brukerkonto</Label>
                <div className="mt-1">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Koblet til bruker
                  </Badge>
                </div>
              </div>
            )}
            
            {member.is_admin && (
              <div>
                <Label>Rolle</Label>
                <div className="mt-1">
                  <Badge className="bg-green-600">Admin</Badge>
                </div>
              </div>
            )}
            
            {/* Period Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Tilstede på:</Label>
              <div className="space-y-2">
                {periods.map(period => (
                  <div 
                    key={period.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border-2",
                      period.location === 'Jajabo' 
                        ? "bg-green-50 border-green-300" 
                        : "bg-amber-50 border-amber-300"
                    )}
                  >
                    <Checkbox
                      id={`period-${period.id}`}
                      checked={selectedPeriodIds.includes(period.id)}
                      onCheckedChange={() => handleTogglePeriod(period.id)}
                      className={cn(
                        period.location === 'Jajabo' 
                          ? "border-green-500" 
                          : "border-amber-500"
                      )}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`period-${period.id}`}
                        className="font-semibold cursor-pointer flex items-center gap-2"
                      >
                        <MapPin className={cn(
                          "h-4 w-4",
                          period.location === 'Jajabo' ? "text-green-700" : "text-amber-700"
                        )} />
                        {period.location} {period.location === 'Jajabo' ? '(Nøtterøy)' : '(Nissedal)'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(period.arrival_date), "dd. MMM")} - {format(new Date(period.departure_date), "dd. MMM yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Show custom period if dates and location are set */}
                {customArrival && customDeparture && customLocation && (
                  <div 
                    className={cn(
                      "flex items-start justify-between gap-3 p-3 rounded-lg border-2",
                      customLocation === 'Jajabo' 
                        ? "bg-green-50 border-green-300" 
                        : "bg-amber-50 border-amber-300"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded border-2 bg-primary flex items-center justify-center text-white">✓</div>
                      <div>
                        <Label className="font-semibold flex items-center gap-2">
                          <MapPin className={cn(
                            "h-4 w-4",
                            customLocation === 'Jajabo' ? "text-green-700" : "text-amber-700"
                          )} />
                          {customLocation} {customLocation === 'Jajabo' ? '(Nøtterøy)' : '(Nissedal)'} - Egendefinert
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {format(customArrival, "dd. MMM")} - {format(customDeparture, "dd. MMM yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (!member) return;
                          if (window.confirm('Slette denne egendefinerte perioden?')) {
                            updateMember.mutate(
                              {
                                id: member.id,
                                arrival_date: null,
                                departure_date: null,
                                custom_period_location: null,
                              },
                              {
                                onSuccess: () => {
                                  // Clear local state so UI updates immediately
                                  setCustomArrival(undefined);
                                  setCustomDeparture(undefined);
                                  setCustomLocation(undefined);
                                },
                              }
                            );
                          }
                        }}
                        title="Slett egendefinert periode"
                      >
                        <Trash2 className="h-3 w-3" /> Slett
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Custom Dates (Optional Override) */}
            <div className="pt-4 border-t">
              <Label className="text-base font-semibold mb-3 block">
                Egendefinerte datoer (flere intervaller støttes)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Sett egne datoer hvis medlemmet kun kommer deler av periodene
              </p>

              {/* Existing custom periods for this member */}
              {customPeriods.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-sm">Lagrede egendefinerte intervaller</Label>
                  {customPeriods.map((cp) => (
                    <div
                      key={cp.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border-2",
                        cp.location === "Jajabo"
                          ? "bg-green-50 border-green-300"
                          : "bg-amber-50 border-amber-300"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin
                          className={cn(
                            "h-4 w-4",
                            cp.location === "Jajabo" ? "text-green-700" : "text-amber-700"
                          )}
                        />
                        <div className="font-medium text-sm">
                          {cp.location} {cp.location === "Jajabo" ? "(Nøtterøy)" : "(Nissedal)"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(cp.start_date), "dd. MMM")} - {format(new Date(cp.end_date), "dd. MMM yyyy")}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCustomLocation(cp.location);
                            setCustomArrival(new Date(cp.start_date));
                            setCustomDeparture(new Date(cp.end_date));
                            setEditingCustomId(cp.id);
                          }}
                          title="Rediger periode"
                        >
                          <Pencil className="h-3 w-3" /> Rediger
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm("Slette denne egendefinerte perioden?")) {
                              deleteCustom.mutate(cp.id);
                            }
                          }}
                          title="Slett periode"
                        >
                          <Trash2 className="h-3 w-3" /> Slett
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-4">
                {/* Location Selection */}
                <div>
                  <Label>Sted</Label>
                  <RadioGroup 
                    value={customLocation || ""} 
                    onValueChange={(value) => setCustomLocation(value as 'Jajabo' | 'JaJabu')}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Jajabo" id="custom-jajabo" />
                      <Label htmlFor="custom-jajabo" className="cursor-pointer">
                        Jajabo (Nøtterøy)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="JaJabu" id="custom-jajabu" />
                      <Label htmlFor="custom-jajabu" className="cursor-pointer">
                        JaJabu (Nissedal)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Ankomst</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !customArrival && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customArrival ? format(customArrival, "PPP") : <span>Velg dato</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customArrival}
                          onSelect={setCustomArrival}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label>Avreise</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !customDeparture && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDeparture ? format(customDeparture, "PPP") : <span>Velg dato</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={customDeparture}
                          onSelect={setCustomDeparture}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-2 pt-4">
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett medlem
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/apps/jul25/admin?familyId=${familyId}`)}
                    className="flex-1 sm:flex-none"
                  >
                    Avbryt
                  </Button>
                  <Button 
                    onClick={() => {
                      // clear form
                      setCustomArrival(undefined);
                      setCustomDeparture(undefined);
                      setCustomLocation(undefined);
                      setEditingCustomId(null);
                    }}
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                  >
                    Nullstill egendefinert
                  </Button>
                  <Button 
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  >
                    {editingCustomId ? 'Oppdater' : 'Lagre'}
                  </Button>
                </div>
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
