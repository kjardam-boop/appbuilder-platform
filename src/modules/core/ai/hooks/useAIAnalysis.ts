import { useState, useCallback } from 'react';
import { AIService } from '../services/aiService';
import { AIAnalysisResponse } from '../types/ai.types';
import { toast } from 'sonner';

type AnalysisType = 'summary' | 'insights' | 'recommendations' | 'evaluation';

export const useAIAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AIAnalysisResponse | null>(null);

  const analyze = useCallback(async (
    data: any,
    analysisType: AnalysisType,
    context?: string
  ): Promise<AIAnalysisResponse | null> => {
    if (!data || isAnalyzing) return null;

    setIsAnalyzing(true);
    try {
      const response = await AIService.analyzeData({
        data,
        analysisType,
        context,
      });

      setLastAnalysis(response);
      return response;
    } catch (error) {
      console.error('AI Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Kunne ikke analysere data');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const summarize = useCallback((data: any, context?: string) => 
    analyze(data, 'summary', context), [analyze]
  );

  const getInsights = useCallback((data: any, context?: string) => 
    analyze(data, 'insights', context), [analyze]
  );

  const getRecommendations = useCallback((data: any, context?: string) => 
    analyze(data, 'recommendations', context), [analyze]
  );

  const evaluate = useCallback((data: any, context?: string) => 
    analyze(data, 'evaluation', context), [analyze]
  );

  return {
    analyze,
    summarize,
    getInsights,
    getRecommendations,
    evaluate,
    isAnalyzing,
    lastAnalysis,
  };
};
