import { useState, useEffect } from 'react';
import { OpportunityService } from '../services/opportunityService';
import type { ForecastData, ForecastPeriod } from '../types/opportunity.types';
import { useToast } from '@/hooks/use-toast';

export function useSalesForecast(period: ForecastPeriod = '90', ownerId?: string) {
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadForecast();
  }, [period, ownerId]);

  const loadForecast = async () => {
    try {
      setLoading(true);
      const data = await OpportunityService.getForecast(period, ownerId);
      setForecast(data);
    } catch (error) {
      console.error('Error loading forecast:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke laste prognose',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalValue = forecast.reduce((sum, item) => sum + item.value, 0);
  const totalProbabilityAdjusted = forecast.reduce((sum, item) => sum + item.probability_adjusted, 0);
  const totalCount = forecast.reduce((sum, item) => sum + item.count, 0);

  return {
    forecast,
    loading,
    totalValue,
    totalProbabilityAdjusted,
    totalCount,
    reload: loadForecast,
  };
}
