import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedApplicationData {
  vendor_name: string;
  product_name: string;
  short_name?: string;
  app_type: string;
  deployment_models?: string[];
  market_segments?: string[];
  description?: string;
  modules_supported?: string[];
  localizations?: string[];
  target_industries?: string[];
}

interface GenerationResponse {
  data: GeneratedApplicationData;
  websiteFetched: boolean;
  websiteUrl: string;
}

interface UseApplicationGenerationOptions {
  onSuccess?: (data: GeneratedApplicationData) => void;
  onError?: (error: Error) => void;
}

export const useApplicationGeneration = (options: UseApplicationGenerationOptions = {}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<GeneratedApplicationData | null>(null);

  const generate = useCallback(async (websiteUrl: string): Promise<GeneratedApplicationData | null> => {
    if (!websiteUrl.trim() || isGenerating) return null;

    setIsGenerating(true);
    try {
      console.log('Generating application info from:', websiteUrl);
      
      const { data, error } = await supabase.functions.invoke<GenerationResponse>(
        'generate-application-info',
        {
          body: { websiteUrl: websiteUrl.trim() }
        }
      );

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Kunne ikke generere applikasjonsinformasjon');
      }

      if (!data?.data) {
        throw new Error('Ingen data mottatt fra AI');
      }

      setLastGenerated(data.data);
      
      if (options.onSuccess) {
        options.onSuccess(data.data);
      }

      toast.success(
        data.websiteFetched 
          ? 'Applikasjonsinformasjon hentet fra nettside'
          : 'Applikasjonsinformasjon generert basert på URL'
      );

      return data.data;
    } catch (error) {
      console.error('Application generation error:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      } else {
        toast.error(
          error instanceof Error 
            ? error.message 
            : 'Kunne ikke generere applikasjonsinformasjon'
        );
      }

      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, options]);

  return {
    generate,
    isGenerating,
    lastGenerated,
  };
};
