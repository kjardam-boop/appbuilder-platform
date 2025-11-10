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

import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Users, Star, CheckSquare, Plus, Edit2, Trash2, Mail, LogOut, LogIn, UserCog, Baby, Church, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toDateOnlyString } from "@/lib/date";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/modules/core/user/hooks/useAuth";
import { useJul25Families, useJul25FamilyMembers, useCreateFamily, useUpdateFamily, useDeleteFamily, useJoinFamily, useUpdateFamilyMember } from "@/hooks/useJul25Families";
import { useJul25Tasks, useCreateTask, useUpdateTask, useDeleteTask, useTaskAssignments, useSetTaskAssignments } from "@/hooks/useJul25Tasks";
import { useJul25FamilyPeriods, useMemberPeriods } from "@/hooks/useJul25FamilyPeriods";
import { useMemberCustomPeriods } from "@/hooks/useJul25MemberCustomPeriods";
import { useAppAdmin } from "@/hooks/useAppRole";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useJul25DoorContent, useUpsertDoorContent } from "@/hooks/useJul25DoorContent";
import { useJul25ChristmasWords } from "@/hooks/useJul25ChristmasWords";

interface ChristmasWord {
  date: number;
  word: string;
  generated: boolean;
}

export default function Jul25App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isAppAdmin, isLoading: isLoadingAppRole } = useAppAdmin('jul25');
  const { isPlatformAdmin } = usePlatformAdmin();
  
  // Data fra database
  const { data: families = [] } = useJul25Families();
  const { data: allMembers = [] } = useJul25FamilyMembers();
  const { data: allPeriods = [] } = useJul25FamilyPeriods();
  const { data: tasks = [] } = useJul25Tasks();
  const { data: allAssignments = [] } = useTaskAssignments();
  
  // Fetch member periods for all members at once
  const { data: allMemberPeriods = [] } = useMemberPeriods();
  const { data: allCustomPeriods = [] } = useMemberCustomPeriods();
  
  // Fetch door content from database
  const { data: doorContents = [] } = useJul25DoorContent();
  const upsertDoorContent = useUpsertDoorContent();
  
  // Fetch pre-seeded christmas words (fallback)
  const { data: christmasWordsDb = [] } = useJul25ChristmasWords();
  
  // Mutations
  const createFamily = useCreateFamily();
  const updateFamily = useUpdateFamily();
  const deleteFamily = useDeleteFamily();
  const joinFamily = useJoinFamily();
  const updateMember = useUpdateFamilyMember();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const setTaskAssignments = useSetTaskAssignments();
  
  // Realtime updates for member periods and custom periods to avoid stale UI
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel('jul25-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jul25_member_periods' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jul25-member-periods'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jul25_member_custom_periods' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jul25-member-custom-periods'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jul25_family_periods' }, () => {
        queryClient.invalidateQueries({ queryKey: ['jul25-family-periods'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  // Dato hjelpefunksjoner
  // Normaliser datoer til dagindeks relativt til 1. nov 2025 (UTC) for å støtte nov+des 2025 og jan 2026
  const BASE_UTC = Date.UTC(2025, 10, 1); // 10 = november
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const toStartOfDayUTC = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());

  // Konverter ISO/Date til fortløpende dagnummer (1 = 1. nov 2025)
  const timestampToDay = (input: string | Date): number => {
    const d = typeof input === 'string' ? new Date(input) : input;
    const diffDays = Math.floor((toStartOfDayUTC(d) - BASE_UTC) / MS_PER_DAY) + 1;
    return diffDays; // kan være < 1 hvis før base (skal ikke skje i UI)
  };

  // Konverter dagnummer tilbake til lesbar dato
  const dayToDateString = (day: number): string => {
    if (day <= 30) {
      return `${day}. nov`;
    } else if (day <= 61) {
      return `${day - 30}. des`;
    } else {
      return `${day - 61}. jan`;
    }
  };

  // Admin status: Check if user is app admin (tenant_owner/tenant_admin or explicit app_admin role)
  const isAdmin = isAppAdmin;
  
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
  const [taskFamilyFilter, setTaskFamilyFilter] = useState<string>("all");
  const [taskSortBy, setTaskSortBy] = useState<"name" | "deadline">("name");
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  
  // Invitation handling
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [isValidatingInvite, setIsValidatingInvite] = useState(false);
  
  // Family onboarding form
  const [onboardingMode, setOnboardingMode] = useState<"join" | "create">("create");
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newNumberOfPeople, setNewNumberOfPeople] = useState(2);
  const [newArrivalDate, setNewArrivalDate] = useState(19);
  const [newDepartureDate, setNewDepartureDate] = useState(31);
  const [memberName, setMemberName] = useState("");
  
  // Task form
  const [taskText, setTaskText] = useState("");
  const [taskDeadline, setTaskDeadline] = useState<Date | undefined>();
  const [taskAssignedMembers, setTaskAssignedMembers] = useState<string[]>([]);
  
  // Invitation
  const [invitationEmail, setInvitationEmail] = useState("");
  
  // Christmas calendar
  const [christmasWords, setChristmasWords] = useState<ChristmasWord[]>([]);
  const [selectedWord, setSelectedWord] = useState<ChristmasWord | null>(null);
  
  // Get current day of December (1-24)
  const getCurrentDecemberDay = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-indexed: 11 = December
    const day = now.getDate();
    
    // Only return day if we're in December, otherwise return 0 (no doors can be opened)
    if (month === 11) { // December
      return Math.min(day, 24); // Cap at 24
    }
    return 0;
  };
  
  const currentDay = getCurrentDecemberDay();
  
  // Initialize christmas words from database with fallback to pre-seeded content
  useEffect(() => {
    const words: ChristmasWord[] = [];
    for (let i = 1; i <= 24; i++) {
      const dbContent = doorContents.find(dc => dc.door_number === i);
      const preSeeded = christmasWordsDb.find(cw => cw.day === i);
      
      words.push({ 
        date: i, 
        word: dbContent?.content || preSeeded?.word || "", 
        generated: !!dbContent 
      });
    }
    setChristmasWords(words);
  }, [doorContents, christmasWordsDb]);
  
  // Handle invitation token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    
    if (!token) return;
    
    setInviteToken(token);
    setIsValidatingInvite(true);
    
    // Validate token
    const validateInvite = async () => {
      try {
        const { data, error } = await supabase.rpc('validate_jul25_invitation_token', {
          _token: token,
          _identifier: '' // Will be checked against email/phone during signup
        });
        
        if (error) {
          console.error('[Jul25] Invitation validation error:', error);
          toast.error("Invitasjonslinken er ugyldig eller utløpt");
          setInviteToken(null);
          return;
        }
        
        const result = data as any;
        
        if (!result?.valid) {
          toast.error("Invitasjonslinken er ugyldig eller utløpt");
          setInviteToken(null);
          return;
        }
        
        // Store invitation data
        setInvitationData(result);
        
        // Pre-fill signup email if available
        if (result.email) {
          setSignupEmail(result.email);
        }
        
        // If user is NOT logged in, open registration dialog
        if (!user) {
          setShowLoginDialog(true);
          toast.success("Velkommen! Registrer deg for å akseptere invitasjonen 🎄");
        } else {
          // If user IS logged in, accept invitation immediately
          acceptInvitationForLoggedInUser(token, result);
        }
      } catch (err) {
        console.error('[Jul25] Invitation validation error:', err);
        toast.error("Kunne ikke validere invitasjon");
        setInviteToken(null);
      } finally {
        setIsValidatingInvite(false);
      }
    };
    
    validateInvite();
  }, [user]); // Re-run when user login state changes
  
  const acceptInvitationForLoggedInUser = async (token: string, invData: any) => {
    try {
      const identifier = invData.email || invData.phone;
      
      const { data, error } = await supabase.rpc('accept_jul25_invitation', {
        _token: token,
        _identifier: identifier
      });
      
      if (error) throw error;
      
      const result = data as any;
      
      if (!result?.success) {
        toast.error(`Kunne ikke godta invitasjon: ${result?.error || 'Ukjent feil'}`);
        return;
      }
      
      toast.success("Invitasjon akseptert! Velkommen til jul25 🎄");
      
      // Remove invite param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url.toString());
      
      setInviteToken(null);
      setInvitationData(null);
      
      // Show family onboarding if user doesn't have a family yet
      if (!userFamily) {
        setShowFamilyOnboarding(true);
      }
    } catch (error: any) {
      console.error('[Jul25] Accept invitation error:', error);
      toast.error(error.message || "Kunne ikke godta invitasjon");
    }
  };
  
  // Note: Family onboarding is no longer automatic - users must click "Register" button
  // to open the family registration dialog
  
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
    
    // If there's an invitation, validate identifier match
    if (inviteToken && invitationData) {
      const invitedIdentifier = invitationData.email || invitationData.phone;
      
      if (invitationData.email && signupEmail !== invitationData.email) {
        toast.error(`Du må registrere deg med den inviterte e-posten: ${invitationData.email}`);
        return;
      }
    }
    
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
        toast.success("Konto opprettet! 🎄");
        
        // If there's an invitation token, accept it
        if (inviteToken && invitationData) {
          const identifier = invitationData.email || invitationData.phone;
          
          const { data: acceptData, error: acceptError } = await supabase.rpc('accept_jul25_invitation', {
            _token: inviteToken,
            _identifier: identifier
          });
          
          const result = acceptData as any;
          
          if (acceptError) {
            console.error('[Jul25] Accept invitation error:', acceptError);
            toast.error("Kontoen ble opprettet, men invitasjonen kunne ikke godtas");
          } else if (!result?.success) {
            toast.error(`Invitasjon kunne ikke godtas: ${result?.error || 'Ukjent feil'}`);
          } else {
            toast.success("Invitasjon akseptert! 🎄");
            
            // Remove invite param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('invite');
            window.history.replaceState({}, '', url.toString());
            
            setInviteToken(null);
            setInvitationData(null);
          }
        }
        
        setShowLoginDialog(false);
        
        // Open family onboarding immediately after signup
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
          deadline: taskDeadline ? toDateOnlyString(taskDeadline) : null,
          assigned_family_id: null, // Deprecated - using assignments instead
        });
        
        // Update assignments
        await setTaskAssignments.mutateAsync({
          taskId: editingTask.id,
          memberIds: taskAssignedMembers,
        });
        
        toast.success("Oppgave oppdatert");
      } else {
        const newTask = await createTask.mutateAsync({
          text: taskText,
          done: false,
          deadline: taskDeadline ? toDateOnlyString(taskDeadline) : null,
          assigned_family_id: null, // Deprecated - using assignments instead
          created_by: user?.id || null,
        });
        
        // Create assignments
        if (taskAssignedMembers.length > 0) {
          await setTaskAssignments.mutateAsync({
            taskId: newTask.id,
            memberIds: taskAssignedMembers,
          });
        }
        
        toast.success("Oppgave opprettet");
      }
      
      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskText("");
      setTaskDeadline(undefined);
      setTaskAssignedMembers([]);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke lagre oppgave");
    }
  };
  
  const generateWordForDay = async (day: number) => {
    // Check if door can be opened
    // Platform admins can open all doors, others only current day and earlier
    if (!isPlatformAdmin && day > currentDay) {
      toast.error("Du kan ikke åpne fremtidige luker!");
      return;
    }
    
    // Check if custom content already exists in database
    const dbContent = doorContents.find(dc => dc.door_number === day);
    if (dbContent) {
      // Custom content exists, show it
      const existingWord = { date: day, word: dbContent.content, generated: true };
      setSelectedWord(existingWord);
      return;
    }
    
    // Check if pre-seeded content exists
    const preSeeded = christmasWordsDb.find(cw => cw.day === day);
    if (preSeeded) {
      // Pre-seeded content exists, show it
      const seededWord = { date: day, word: preSeeded.word, generated: false };
      setSelectedWord(seededWord);
      return;
    }
    
    // No content exists, generate it with AI
    const currentDate = new Date(2025, 11, day); // December 2025
    const dateStr = `${day}. desember 2025`;
    
    // Variert tematikk basert på periode
    let themeGuidance = "";
    if (day <= 7) {
      themeGuidance = "Fokuser på forventning, håp og forberedelse til jul. Snakk om adventstiden som ventetid.";
    } else if (day <= 14) {
      themeGuidance = "Fokuser på glede, fellesskap og julestemning. Snakk om tradisjoner og samvær.";
    } else if (day <= 21) {
      themeGuidance = "Fokuser på budskapet om Jesu fødsel, stjerna over Betlehem, eller juleevangeliet.";
    } else {
      themeGuidance = "Fokuser på julegleden, gaver, kjærlighet og den nært forestående julaften.";
    }
    
    // Varierte stilvalg
    const styles = [
      "Skriv som et reflekterende dikt",
      "Skriv som en varm fortelling",
      "Skriv som en oppmuntrende betraktning",
      "Skriv som en poetisk meditasjon",
      "Skriv som en livlig beskrivelse"
    ];
    const selectedStyle = styles[day % styles.length];
    
    const prompt = `Skriv en unik og inspirerende tekst for ${dateStr} som del av en digital julekalender. 

VIKTIG INFORMASJON OM ADVENT 2025:
- 1. søndag i advent (1. lys): 30. november 2025
- 2. søndag i advent (2. lys): 7. desember 2025
- 3. søndag i advent (3. lys): 14. desember 2025
- 4. søndag i advent (4. lys): 21. desember 2025
- Julaften: 24. desember 2025

TEMATISK RETNING FOR DENNE DAGEN:
${themeGuidance}

STILVALG:
${selectedStyle}

Teksten skal:
- Være 2-4 setninger (150-250 ord)
- Ha fokus på jul, advent og/eller den kristne julen
- Hvis datoen er en adventssøndag, nevn at dette er [X]. søndag i advent og at vi tenner [X]. lys
- Inkludere EN interessant historisk hendelse eller fakta som skjedde på denne datoen (${day}. desember) i historien
- Være varm, inkluderende og julestemningsfylt
- Være HELT UNIK - ikke bruk standardfraser som "i adventstiden" eller "i disse dager" hver gang
- Variere lengde, tone og struktur fra dag til dag
- Være på norsk og passe for alle aldre

Formater teksten i to deler:
1. En juletekst med fokus på advent, jul og kristne tradisjoner (bruk den anbefalte stilarten)
2. En historisk fakta om hva som skjedde på denne datoen

Eksempel struktur:
"[Hyggelig juletekst om dagen]

Visste du at: [Interessant historisk fakta om ${day}. desember]"`;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-text', {
        body: { prompt, maxLength: 500 }
      });

      if (error) throw error;

      const content = data.content || data.text || "God jul! 🎄";
      
      // Save to database
      await upsertDoorContent.mutateAsync({
        door_number: day,
        content: content
      });
      
      const newWord = { date: day, word: content, generated: true };
      setChristmasWords(prev => prev.map(w => 
        w.date === day ? newWord : w
      ));
      setSelectedWord(newWord);
      
      toast.success(`Dagens tekst generert og lagret! 🎄`);
    } catch (error) {
      console.error('Error generating word:', error);
      toast.error('Kunne ikke generere tekst');
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
  
  // Get effective family dates based on periods and member dates
  const getEffectiveFamilyDates = (family: any) => {
    const familyMembers = allMembers.filter(m => m.family_id === family.id);
    const familyPeriods = allPeriods.filter(p => p.family_id === family.id);
    
    let earliestArrival: Date | null = null;
    let latestDeparture: Date | null = null;
    
    // First, consider all family periods
    familyPeriods.forEach(period => {
      const arrDate = period.arrival_date ? new Date(period.arrival_date) : null;
      const depDate = period.departure_date ? new Date(period.departure_date) : null;
      
      if (arrDate) {
        earliestArrival = !earliestArrival || arrDate < earliestArrival ? arrDate : earliestArrival;
      }
      if (depDate) {
        latestDeparture = !latestDeparture || depDate > latestDeparture ? depDate : latestDeparture;
      }
    });
    
    // Then, consider member-specific dates if they exist
    familyMembers.forEach(member => {
      if (member.arrival_date) {
        const arrDate = new Date(member.arrival_date);
        earliestArrival = !earliestArrival || arrDate < earliestArrival ? arrDate : earliestArrival;
      }
      if (member.departure_date) {
        const depDate = new Date(member.departure_date);
        latestDeparture = !latestDeparture || depDate > latestDeparture ? depDate : latestDeparture;
      }
    });
    
    // Fallback to Nov 1 - Jan 4 if no dates found
    if (!earliestArrival || !latestDeparture) {
      const baseDate = new Date(2025, 10, 1); // Nov 1, 2025
      return {
        arrival_date: earliestArrival || baseDate,
        departure_date: latestDeparture || new Date(2026, 0, 4), // Jan 4, 2026
      };
    }
    
    return {
      arrival_date: earliestArrival,
      departure_date: latestDeparture,
    };
  };
  
  const getMembersPerDay = (family: any): Record<number, number> => {
    const membersPerDay: Record<number, number> = {};
    const familyMembers = allMembers.filter(m => m.family_id === family.id);
    const familyPeriods = allPeriods.filter(p => p.family_id === family.id);
    
    // Get all unique days where the family or any member is present
    const allDays = new Set<number>();
    
    // Add days from family periods
    familyPeriods.forEach(period => {
      const startDay = timestampToDay(period.arrival_date);
      const endDay = timestampToDay(period.departure_date);
      for (let day = startDay; day <= endDay; day++) {
        allDays.add(day);
      }
    });
    
    // Add days from member custom dates
    familyMembers.forEach(member => {
      if (member.arrival_date && member.departure_date) {
        const startDay = timestampToDay(member.arrival_date);
        const endDay = timestampToDay(member.departure_date);
        for (let day = startDay; day <= endDay; day++) {
          allDays.add(day);
        }
      }
    });
    
    // If no days found, return empty
    if (allDays.size === 0) {
      return {};
    }
    
    // Count members present on each day
    Array.from(allDays).sort((a, b) => a - b).forEach(day => {
      if (familyMembers.length === 0) {
        // If no members defined, use family's number_of_people
        membersPerDay[day] = family.number_of_people;
      } else {
        // Count how many members are present on this specific day
        const count = familyMembers.filter(member => {
          // Check if member has custom dates
          if (member.arrival_date && member.departure_date) {
            const arrDay = timestampToDay(member.arrival_date);
            const depDay = timestampToDay(member.departure_date);
            return day >= arrDay && day <= depDay;
          }
          
          // Otherwise, check if day is within any family period
          return familyPeriods.some(period => {
            const arrDay = timestampToDay(period.arrival_date);
            const depDay = timestampToDay(period.departure_date);
            return day >= arrDay && day <= depDay;
          });
        }).length;
        
        membersPerDay[day] = count;
      }
    });
    
    return membersPerDay;
  };
  
  // Calculate dynamic date range based on periods (family + member custom) - MOVED BEFORE getGuestsPerDay
  const getDateRange = () => {
    let minDay = Infinity;
    let maxDay = -Infinity;

    const consider = (isoStart?: string, isoEnd?: string) => {
      if (!isoStart || !isoEnd) return;
      const s = Math.max(1, timestampToDay(isoStart));
      const e = Math.max(1, timestampToDay(isoEnd));
      if (s < minDay) minDay = s;
      if (e > maxDay) maxDay = e;
    };

    // Include family periods
    allPeriods.forEach(p => consider(p.arrival_date, p.departure_date));
    // Include member-level single custom (backwards compat)
    allMembers.forEach(m => consider(m.arrival_date || undefined, m.departure_date || undefined));
    // Include multi custom periods
    allCustomPeriods.forEach(cp => consider(cp.start_date, cp.end_date));

    // Fallback: if no data, show Nov 1 .. Jan 4 (1..66)
    if (minDay === Infinity) {
      minDay = 1;
      maxDay = 66;
    }

    return Array.from({ length: maxDay - minDay + 1 }, (_, i) => i + minDay);
  };
  
  const eventDates = getDateRange();
  
  const getGuestsPerDay = () => {
    const guestsPerDay: Record<number, number> = {};
    
    // Initialize with eventDates range
    eventDates.forEach(day => {
      guestsPerDay[day] = 0;
    });
    
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
    
    // Sort based on selected option
    if (taskSortBy === "deadline") {
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else {
      // Sort by name
      sorted.sort((a, b) => a.text.localeCompare(b.text));
    }
    
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
  
  // Memoize guests per day to avoid stale values and heavy recomputation
  const guestsPerDayMap = useMemo(() => getGuestsPerDay(), [families, allMembers, allPeriods, allCustomPeriods]);
  
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
            <h1 className="text-4xl sm:text-5xl font-bold" style={{
              background: 'linear-gradient(to right, hsl(var(--jul25-red)), hsl(120, 70%, 35%), hsl(45, 100%, 60%), hsl(var(--jul25-red-dark)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              JaJabo jul 2025
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
                {!userMembership && !isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFamilyOnboarding(true)}
                    className="gap-2 bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <Users className="w-4 h-4" />
                    Registrer familie
                  </Button>
                )}
                {isAdmin && (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                    <UserCog className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/apps/jul25/invite")}
                    className="gap-2 bg-green-600 text-white hover:bg-green-700 border-green-600"
                  >
                    <Mail className="w-4 h-4" />
                    Inviter
                  </Button>
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
            {/* Single scroll container for entire calendar */}
            <div className="hidden sm:block overflow-x-auto pb-2">
              <div className="flex flex-col" style={{ minWidth: `${160 + eventDates.length * 40}px` }}>
                
                {/* Date Header */}
                <div className="flex gap-0 mb-4">
                  <div className="w-32 sm:w-40 flex-shrink-0 flex flex-col justify-end sticky left-0 bg-background z-10">
                    <div className="text-xs font-medium text-muted-foreground h-[18px] flex items-center border-b border-border/30">Dato</div>
                    <div className="text-xs font-medium text-muted-foreground h-[18px] flex items-center">Antall tilstede</div>
                  </div>
                {eventDates.map((date, index) => {
                  const guestsPerDay = getGuestsPerDay();
                  const isFirstOfMonth = index === 0 || (date === 31 && eventDates[index - 1] === 30) || (date === 62 && eventDates[index - 1] === 61);
                  const month = date <= 30 ? 'Nov' : date <= 61 ? 'Des' : 'Jan';
                  const displayDay = date <= 30 ? date : date <= 61 ? (date - 30) : (date - 61);
                  
                  return (
                    <div key={date} className="w-10 flex-shrink-0 text-center flex flex-col">
                      {isFirstOfMonth && (
                        <div className="text-[10px] font-semibold text-muted-foreground/70 h-3">{month}</div>
                      )}
                      <div className={cn("font-medium text-xs border-l border-border/30 h-[18px] flex items-center justify-center", !isFirstOfMonth && "mt-3")}>
                        {displayDay}
                      </div>
                      <div className="text-xs text-muted-foreground h-[18px] flex items-center justify-center">
                        {guestsPerDay[date] > 0 ? `${guestsPerDay[date]}` : '-'}
                      </div>
                    </div>
                  );
                })}
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
                  const minDate = eventDates[0] || 1;
                  const effectiveDates = getEffectiveFamilyDates(family);
                  const arrDay = timestampToDay(effectiveDates.arrival_date);
                  const depDay = timestampToDay(effectiveDates.departure_date);
                  const startOffset = (arrDay - minDate) * 40;
                  const duration = (depDay - arrDay + 1) * 40;
                  const familyMembers = allMembers.filter(m => m.family_id === family.id);
                  const membersPerDay = getMembersPerDay(family);
                  const isExpanded = expandedFamilies.has(family.id);
                  
                  const isUserFamilyAdmin = isAdmin || (userMembership && userMembership.family_id === family.id && userMembership.is_admin);
                  
                      return (
                        <div key={family.id} className="space-y-2">
                          <div className="flex gap-2 sm:gap-1 items-start">
                            {/* Family Name */}
                            <div className="w-full sm:w-32 md:w-40 flex-shrink-0 sticky left-0 bg-background z-10">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => toggleFamilyExpanded(family.id)}
                                  className="flex-1 bg-green-700 text-white rounded px-2 py-2 sm:py-1 text-sm text-left hover:bg-green-800 transition-colors flex items-center gap-1"
                                >
                                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                                  <span className="truncate">{family.name}</span>
                                </button>
                                {isUserFamilyAdmin && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => navigate(`/apps/jul25/admin?familyId=${family.id}`)}
                                    title="Administrer familie"
                                  >
                                    <UserCog className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Gantt Bar */}
                            <div className="relative flex-1 h-8">
                              <div className="absolute inset-y-0 flex gap-0">
                                {eventDates.map(date => (
                                  <div key={date} className="w-10 h-8 border-l border-border/30" />
                                ))}
                              </div>
                              <div 
                                className="absolute top-1 h-6 bg-green-600 rounded cursor-pointer hover:bg-green-700 transition-colors flex items-center text-xs text-white font-medium overflow-hidden"
                                style={{ 
                                  left: `${startOffset}px`, 
                                  width: `${duration}px` 
                                }}
                                title={`${family.name}: ${dayToDateString(arrDay)} - ${dayToDateString(depDay)}`}
                              >
                                {Object.entries(membersPerDay).map(([day, count]) => {
                                  const dayNum = parseInt(day);
                                  const dayOffset = (dayNum - arrDay) * 40;
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
                            <div className="ml-4 sm:ml-0 space-y-1 mt-2">
                              {familyMembers.map((member) => {
                            const periods = allPeriods.filter(p => p.family_id === family.id);
                            const memberPeriods = allMemberPeriods.filter(mp => mp.member_id === member.id);
                            const assignedPeriods = periods.filter(p => 
                              memberPeriods.some(mp => mp.period_id === p.id)
                            );
                            
                            const memberCustoms = allCustomPeriods
                              .filter(cp => cp.member_id === member.id)
                              .map(cp => ({
                                id: cp.id,
                                family_id: member.family_id,
                                location: cp.location,
                                arrival_date: cp.start_date,
                                departure_date: cp.end_date,
                                created_at: cp.created_at,
                                updated_at: cp.updated_at,
                              }));

                            const singleCustom = (member.arrival_date && member.departure_date && member.custom_period_location)
                              ? [{
                                  id: `custom-${member.id}`,
                                  family_id: member.family_id,
                                  location: member.custom_period_location,
                                  arrival_date: member.arrival_date,
                                  departure_date: member.departure_date,
                                  created_at: member.created_at,
                                  updated_at: member.updated_at,
                                }]
                              : [];

                                const effectivePeriods = [...memberCustoms, ...singleCustom, ...(assignedPeriods.length > 0 ? assignedPeriods : [])];
                                
                                return (
                                  <div key={member.id} className="flex gap-2 sm:gap-1 items-start">
                                    <div className="w-full sm:w-32 md:w-40 flex-shrink-0 sticky left-0 bg-background z-10">
                                      <div className="flex items-center gap-1">
                                        <div className="flex-1 bg-green-500 text-white rounded px-2 py-1 text-xs truncate">
                                          {member.name}
                                        </div>
                                        {isUserFamilyAdmin && (
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           className="h-6 w-6 p-0"
                                           onClick={() => navigate(`/apps/jul25/member/${member.id}`)}
                                           title="Rediger person"
                                         >
                                           <Edit2 className="h-3 w-3" />
                                         </Button>
                                       )}
                                      </div>
                                    </div>

                                    <div className="relative flex-1 h-7">
                                      <div className="absolute inset-y-0 flex gap-0">
                                        {eventDates.map(date => (
                                          <div key={date} className="w-10 h-7 border-l border-border/30" />
                                        ))}
                                      </div>
                                      {effectivePeriods.map(period => {
                                    const arr = Math.max(1, timestampToDay(period.arrival_date));
                                    const dep = Math.max(1, timestampToDay(period.departure_date));
                                    const startOffset = (arr - minDate) * 40;
                                    const width = (dep - arr + 1) * 40;
                                    
                                        return (
                                          <div 
                                            key={period.id}
                                            className={cn(
                                              "absolute top-1 h-5 rounded-sm cursor-pointer transition-colors flex items-center text-[10px] text-white font-medium px-2",
                                              period.location === 'Jajabo'
                                                ? "bg-green-500 hover:bg-green-600"
                                                : "bg-red-500 hover:bg-red-600"
                                            )}
                                            style={{ 
                                              left: `${startOffset}px`, 
                                              width: `${width}px` 
                                            }}
                                            title={`${member.name} - ${period.location}: ${dayToDateString(arr)} - ${dayToDateString(dep)}`}
                                          >
                                            <span className="truncate">{period.location}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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
                      {user && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingTask(null);
                            setTaskText("");
                            setTaskDeadline(undefined);
                            setTaskAssignedMembers([]);
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
                  {/* Family filter and Sort */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs">Filtrer:</Label>
                    <Select value={taskFamilyFilter} onValueChange={setTaskFamilyFilter}>
                      <SelectTrigger className="h-8 text-xs w-[150px]">
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
                    
                    <Label className="text-xs ml-2">Sorter:</Label>
                    <Select value={taskSortBy} onValueChange={(v) => setTaskSortBy(v as "name" | "deadline")}>
                      <SelectTrigger className="h-8 text-xs w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Navn</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getSortedTasks().map(task => {
                    const taskAssignments = allAssignments.filter(a => a.task_id === task.id);
                    const assignedMembers = taskAssignments
                      .map(a => allMembers.find(m => m.id === a.family_member_id))
                      .filter(Boolean);
                    const creator = allMembers.find(m => m.user_id === task.created_by);
                    
                    return (
                      <div key={task.id} className="grid grid-cols-[auto,1fr,120px,150px,auto] items-center gap-2 p-2 rounded-lg hover:bg-accent">
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
                        <div className="min-w-0">
                          <span className={cn("text-sm", task.done && "line-through text-muted-foreground")}>
                            {task.text}
                          </span>
                          {creator && (
                            <div className="text-xs text-muted-foreground">
                              Opprettet av: {creator.name}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          {task.deadline ? (
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              📅 {new Date(task.deadline).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        <div className="flex justify-end">
                          {assignedMembers.length > 0 ? (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {assignedMembers.map(member => (
                                <Badge key={member?.id} variant="secondary" className="text-xs whitespace-nowrap">
                                  {member?.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                        {user && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 px-2" 
                              onClick={() => {
                                setEditingTask(task);
                                setTaskText(task.text);
                                setTaskDeadline(task.deadline ? new Date(task.deadline) : undefined);
                                const taskAssignments = allAssignments.filter(a => a.task_id === task.id);
                                setTaskAssignedMembers(taskAssignments.map(a => a.family_member_id));
                                setShowTaskDialog(true);
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            {(isAdmin || task.created_by === user?.id) && (
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={async () => {
                                  if (confirm("Er du sikker på at du vil slette denne oppgaven?")) {
                                    await deleteTask.mutateAsync(task.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
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
                Julekalender - Dagens tekst
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Klikk på en luke for å lese dagens juletekst med historisk fakta! 🎄
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {christmasWords.map((item) => {
                  const isOpened = item.generated;
                  const canOpen = isPlatformAdmin || item.date <= currentDay;
                  const isFuture = !isPlatformAdmin && item.date > currentDay;
                  
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
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-500" />
                {selectedWord?.date}. desember - Dagens tekst
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="py-6 space-y-4">
                <div className="text-center mb-4">
                  <Star className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                </div>
                <div className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                  {selectedWord?.word || "Laster..."}
                </div>
                <div className="pt-4 text-center">
                  <Star className="w-8 h-8 mx-auto text-yellow-500/50" />
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Login/Signup Dialog */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {inviteToken ? "Velkommen til Familiejul 2025" : "Logg inn eller opprett konto"}
              </DialogTitle>
              <DialogDescription>
                {inviteToken 
                  ? "Du har blitt invitert! Registrer deg for å akseptere invitasjonen."
                  : "Logg inn eller opprett konto for å melde deg på"
                }
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
                      disabled={!!(inviteToken && invitationData?.email)}
                      placeholder={invitationData?.email ? "E-post fra invitasjon" : "din@epost.no"}
                      className={invitationData?.email ? "bg-muted" : ""}
                    />
                    {invitationData?.email && (
                      <p className="text-xs text-muted-foreground">
                        ✉️ Du må registrere deg med denne e-posten
                      </p>
                    )}
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
                             {dayToDateString(date)}
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
                             {dayToDateString(date)}
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
                <Label>Ansvarlige (valgfritt)</Label>
                <ScrollArea className="h-[200px] border rounded-md p-3">
                  <div className="space-y-2">
                    {allMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ingen personer tilgjengelig</p>
                    ) : (
                      allMembers.map(member => {
                        const family = families.find(f => f.id === member.family_id);
                        return (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={taskAssignedMembers.includes(member.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTaskAssignedMembers([...taskAssignedMembers, member.id]);
                                } else {
                                  setTaskAssignedMembers(taskAssignedMembers.filter(id => id !== member.id));
                                }
                              }}
                            />
                            <Label
                              htmlFor={`member-${member.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {member.name} {family && <span className="text-muted-foreground">({family.name})</span>}
                            </Label>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-deadline">Frist (valgfritt)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !taskDeadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {taskDeadline ? format(taskDeadline, "PPP") : <span>Velg dato</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={taskDeadline}
                      onSelect={setTaskDeadline}
                      defaultMonth={new Date(2025, 11, 1)}
                      disabled={(date) => {
                        // Only allow dates between Dec 1, 2025 and Jan 31, 2026
                        const dec1 = new Date(2025, 11, 1);
                        const jan31 = new Date(2026, 0, 31);
                        return date < dec1 || date > jan31;
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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

        {/* Dialogs removed - now use dedicated admin pages */}
      </div>
    </div>
  );
}
