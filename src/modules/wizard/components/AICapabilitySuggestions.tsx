/**
 * AICapabilitySuggestions
 * 
 * Displays AI-powered capability suggestions based on workshop results.
 * Shows confidence badges, explanations, and allows selection/rejection.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, RefreshCw, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface CapabilitySuggestion {
  capabilityId: string;
  capabilityKey: string;
  capabilityName: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  reason: string;
  matchedPainPoints: string[];
  matchedRequirements: string[];
}

interface AICapabilitySuggestionsProps {
  projectId: string;
  tenantId: string;
  selectedCapabilityIds: string[];
  onSelectCapability: (capabilityId: string, capabilityKey: string, capabilityName: string, category: string) => void;
  disabled?: boolean;
}

const CONFIDENCE_STYLES = {
  high: { 
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Høy',
    icon: CheckCircle2,
  },
  medium: { 
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Medium',
    icon: Info,
  },
  low: { 
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    label: 'Lav',
    icon: AlertCircle,
  },
};

export function AICapabilitySuggestions({
  projectId,
  tenantId,
  selectedCapabilityIds,
  onSelectCapability,
  disabled = false,
}: AICapabilitySuggestionsProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-capability-suggestions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('suggest-capabilities', {
        body: { projectId, tenantId, maxSuggestions: 8 },
      });

      if (error) throw error;
      return data as {
        suggestions: CapabilitySuggestion[];
        analysisContext: {
          painPointsAnalyzed: number;
          requirementsAnalyzed: number;
          capabilitiesMatched: number;
        };
      };
    },
    enabled: !!projectId && !!tenantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3 text-purple-600">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Analyserer workshop-resultater...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data?.suggestions?.length) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">AI-anbefalinger</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error 
              ? 'Kunne ikke generere anbefalinger. Prøv igjen senere.'
              : 'Ingen anbefalinger tilgjengelig. Fullfør workshop for bedre forslag.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const suggestions = data.suggestions;
  const context = data.analysisContext;

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">AI-anbefalte capabilities</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || disabled}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Basert på {context.painPointsAnalyzed} pain points og {context.requirementsAnalyzed} krav fra workshop
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.map((suggestion) => {
          const isSelected = selectedCapabilityIds.includes(suggestion.capabilityId);
          const style = CONFIDENCE_STYLES[suggestion.confidence];
          const ConfidenceIcon = style.icon;

          return (
            <div
              key={suggestion.capabilityId}
              className={`
                flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                ${isSelected 
                  ? 'bg-purple-100 border-purple-300' 
                  : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              onClick={() => !disabled && onSelectCapability(
                suggestion.capabilityId,
                suggestion.capabilityKey,
                suggestion.capabilityName,
                suggestion.category
              )}
            >
              <Checkbox
                checked={isSelected}
                disabled={disabled}
                className="mt-0.5"
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={() => !disabled && onSelectCapability(
                  suggestion.capabilityId,
                  suggestion.capabilityKey,
                  suggestion.capabilityName,
                  suggestion.category
                )}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{suggestion.capabilityName}</span>
                  <Badge variant="outline" className="text-xs">
                    {suggestion.category}
                  </Badge>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className={`text-xs flex items-center gap-1 ${style.badge}`}
                        >
                          <ConfidenceIcon className="h-3 w-3" />
                          {style.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Confidence score: {suggestion.confidenceScore}%</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <p className="text-xs text-muted-foreground mt-1 cursor-help line-clamp-1 hover:text-purple-600">
                      {suggestion.reason}
                    </p>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Hvorfor denne?</p>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                      
                      {suggestion.matchedPainPoints.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-red-600">Adresserer pain points:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                            {suggestion.matchedPainPoints.slice(0, 3).map((pp, i) => (
                              <li key={i}>{pp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {suggestion.matchedRequirements.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-green-600">Oppfyller krav:</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                            {suggestion.matchedRequirements.slice(0, 3).map((req, i) => (
                              <li key={i}>{req}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

