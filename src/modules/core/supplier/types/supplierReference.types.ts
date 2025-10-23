import { BaseEntity } from "@/core/types/common.types";

/**
 * Supplier reference types - only for evaluation/scoring context
 * Company data lives in company module with supplier role
 */

export interface SupplierEvaluation extends BaseEntity {
  project_id: string;
  company_id: string; // Reference to companies table
  status: "invited" | "in_progress" | "completed" | "rejected";
  invited_at: string;
  completed_at: string | null;
  invited_by: string;
  notes: string | null;
}

export interface SupplierScore extends BaseEntity {
  evaluation_id: string;
  company_id: string; // Reference to companies table
  project_id: string;
  total_score: number;
  criteria_scores: {
    criteriaId: string;
    score: number;
    weight: number;
    notes: string | null;
  }[];
  scored_by: string;
  scored_at: string;
}

export interface SupplierPerformance extends BaseEntity {
  project_id: string;
  company_id: string; // Reference to companies table
  delivery_score: number | null;
  quality_score: number | null;
  communication_score: number | null;
  overall_rating: number | null;
  feedback: string | null;
  evaluated_by: string;
  evaluated_at: string;
}

/**
 * Helper function to get suppliers for a project
 * Returns companies with supplier role that are part of project
 */
export interface ProjectSupplier {
  id: string;
  project_id: string;
  company_id: string;
  status: "longlist" | "shortlist" | "winner" | "rejected";
  added_at: string;
  company?: {
    id: string;
    name: string;
    org_number: string;
    website: string | null;
    company_roles: string[];
  };
}
