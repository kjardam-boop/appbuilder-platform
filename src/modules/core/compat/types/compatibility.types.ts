/**
 * Compatibility Engine Types
 * Fit scoring between Platform Apps and External Systems
 */

export interface CapabilityMatch {
  capability: string;
  required: boolean;
  available: boolean;
  readWrite: 'full' | 'read-only' | 'none';
  score: number;
}

export interface IntegrationReadiness {
  provider: string;
  hasWorkflow: boolean;
  hasMcpRef: boolean;
  hasActiveSecret: boolean;
  score: number;
}

export interface ComplianceMatch {
  requirement: string;
  satisfied: boolean;
  score: number;
}

export interface ScoreBreakdown {
  capabilityMatch: {
    score: number;
    weight: number;
    details: CapabilityMatch[];
  };
  integrationReadiness: {
    score: number;
    weight: number;
    details: IntegrationReadiness[];
  };
  compliance: {
    score: number;
    weight: number;
    details: ComplianceMatch[];
  };
  ecosystemMaturity: {
    score: number;
    weight: number;
    details: {
      integrationCount: number;
      mcpRefCount: number;
      useCaseCount: number;
    };
  };
}

export interface CompatibilityScore {
  totalScore: number;
  breakdown: ScoreBreakdown;
  explain: string[];
  recommendations: string[];
  badges: string[];
}

export interface SystemScore {
  systemSlug: string;
  systemName: string;
  score: number;
  badges: string[];
  breakdown?: ScoreBreakdown;
}

export interface CompatibilityMatrix {
  appKey: string;
  appName: string;
  systems: SystemScore[];
  timestamp: string;
}
