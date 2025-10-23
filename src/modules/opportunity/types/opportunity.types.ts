/**
 * Opportunity Module Types
 */

import { BaseEntity } from '@/core/types/common.types';

export type OpportunityStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type OpportunityActivityType = 'note' | 'call' | 'meeting' | 'email' | 'stage_change';

export interface Opportunity extends BaseEntity {
  title: string;
  description: string | null;
  company_id: string;
  stage: OpportunityStage;
  probability: number;
  estimated_value: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  owner_id: string;
  source: string | null;
  competitors: string[];
  converted_to_project_id: string | null;
  loss_reason: string | null;
  next_step: string | null;
  tags: string[];
}

export interface Product extends BaseEntity {
  name: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  base_price: number | null;
  is_active: boolean;
  sku: string | null;
  tags: string[];
}

export interface OpportunityProduct extends BaseEntity {
  opportunity_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  discount_percentage: number;
  total_price: number | null;
  notes: string | null;
}

export interface OpportunityActivity extends BaseEntity {
  opportunity_id: string;
  activity_type: OpportunityActivityType;
  title: string;
  description: string | null;
  activity_date: string;
  created_by: string;
  metadata: any | null;
}

export interface OpportunityWithDetails extends Opportunity {
  products?: (OpportunityProduct & { product?: Product })[];
  activities?: OpportunityActivity[];
  company?: {
    id: string;
    name: string;
    org_number: string;
  };
}

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  prospecting: 'Prospektering',
  qualification: 'Kvalifisering',
  proposal: 'Tilbud',
  negotiation: 'Forhandling',
  closed_won: 'Vunnet',
  closed_lost: 'Tapt',
};

export const OPPORTUNITY_STAGE_COLORS: Record<OpportunityStage, string> = {
  prospecting: 'bg-gray-100 text-gray-800',
  qualification: 'bg-blue-100 text-blue-800',
  proposal: 'bg-purple-100 text-purple-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
};

export const OPPORTUNITY_STAGE_PROBABILITIES: Record<OpportunityStage, number> = {
  prospecting: 10,
  qualification: 25,
  proposal: 50,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

export const OPPORTUNITY_ACTIVITY_LABELS: Record<OpportunityActivityType, string> = {
  note: 'Notat',
  call: 'Telefonsamtale',
  meeting: 'Møte',
  email: 'E-post',
  stage_change: 'Stadieendring',
};

export type ForecastPeriod = '30' | '60' | '90' | 'quarterly' | 'yearly';

export interface ForecastData {
  period: string;
  value: number;
  probability_adjusted: number;
  count: number;
}
