export interface SupplierEvaluation {
  id: string;
  project_id: string;
  supplier_id: string;
  question_id: string;
  answer: string;
  score: number;
  notes?: string;
  question_source?: string;
  evaluated_by: string | null;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
  erp_system_id?: string;
}

export interface SupplierEvaluationSummary {
  supplier_id: string;
  supplier_name: string;
  categories: {
    [key: string]: {
      score: number;
      completedQuestions: number;
      totalQuestions: number;
    };
  };
  overallScore: number;
  totalCompleted: number;
  totalQuestions: number;
}

export interface SupplierPortalInvitation {
  id: string;
  project_id: string;
  supplier_id: string;
  email: string;
  token: string;
  expires_at: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
}

export const SUPPLIER_EVALUATION_CATEGORIES = [
  {
    key: 'supplier_background',
    label: 'Bakgrunn',
    description: 'Økonomisk soliditet, organisasjon, kompetanse og sertifiseringer',
    icon: 'Building2',
  },
  {
    key: 'supplier_experience',
    label: 'Erfaring',
    description: 'Tidligere prosjekter, referanser og bransjeerfaring',
    icon: 'Award',
  },
  {
    key: 'supplier_delivery',
    label: 'Leveranse',
    description: 'Leveransemodell, metodikk og risikohåndtering',
    icon: 'Truck',
  },
  {
    key: 'supplier_support',
    label: 'Support',
    description: 'Supportmodell, vedlikehold og opplæring',
    icon: 'Headphones',
  },
  {
    key: 'supplier_security',
    label: 'Sikkerhet',
    description: 'GDPR, informasjonssikkerhet og compliance',
    icon: 'Shield',
  },
  {
    key: 'supplier_technical',
    label: 'Teknisk',
    description: 'Arkitektur, integrasjon og skalerbarhet',
    icon: 'Code',
  },
  {
    key: 'supplier_collaboration',
    label: 'Samarbeid',
    description: 'Samarbeidsmodell, kommunikasjon og kultur',
    icon: 'Users',
  },
] as const;

export type SupplierEvaluationCategory = typeof SUPPLIER_EVALUATION_CATEGORIES[number]['key'];
