import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';
import { toast } from 'sonner';

interface UseAIGenerationOptions {
  onSuccess?: (content: string) => void;
  onError?: (error: Error) => void;
}

export const useAIGeneration = (options: UseAIGenerationOptions = {}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const generate = useCallback(async (
    prompt: string,
    context?: string,
    maxLength?: number
  ): Promise<string | null> => {
    if (!prompt.trim() || isGenerating) return null;

    setIsGenerating(true);
    try {
      const response = await AIService.generateText({
        prompt: prompt.trim(),
        context,
        maxLength,
      });

      setLastGenerated(response.content);
      
      if (options.onSuccess) {
        options.onSuccess(response.content);
      }

      return response.content;
    } catch (error) {
      console.error('AI Generation error:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      } else {
        toast.error(error instanceof Error ? error.message : 'Kunne ikke generere tekst');
      }

      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, options]);

  const generateCompanyDescription = useCallback(async (
    websiteUrl: string,
    companyName: string
  ): Promise<{ description: string; websiteFetched: boolean } | null> => {
    if (!websiteUrl || isGenerating) return null;

    setIsGenerating(true);
    try {
      const response = await AIService.generateCompanyDescription(websiteUrl, companyName);
      setLastGenerated(response.description);
      
      if (options.onSuccess) {
        options.onSuccess(response.description);
      }

      return response;
    } catch (error) {
      console.error('Company description generation error:', error);
      
      if (options.onError) {
        options.onError(error as Error);
      } else {
        toast.error(error instanceof Error ? error.message : 'Kunne ikke generere beskrivelse');
      }

      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, options]);

  return {
    generate,
    generateCompanyDescription,
    isGenerating,
    lastGenerated,
  };
};
