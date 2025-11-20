/**
 * AI MCP Chat Types
 */

export interface QaResult {
  answer: string;
  sources: Array<{ id: string; title: string }>;
  followups: string[];
}

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  settings?: {
    company_id?: string;
    [key: string]: any;
  };
}

export interface Theme {
  primary: string;
  accent: string;
  surface?: string;
  textOnSurface?: string;
}

export interface ExperienceJSON {
  version: string;
  theme: {
    primary: string;
    accent: string;
    surface: string;
    textOnSurface: string;
  };
  layout: {
    type: string;
    gap: string;
  };
  blocks: ExperienceBlock[];
}

export interface ExperienceBlock {
  type: 'hero' | 'card' | 'cards.list' | 'content' | 'steps' | 'cta' | 'table';
  headline?: string;
  subheadline?: string;
  body?: string;
  title?: string;
  items?: any[];
  [key: string]: any;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  call_id: string;
  data: any;
}

export interface ContentDoc {
  id: string;
  title: string;
  content_markdown: string;
  keywords?: string[];
  category?: string;
  snippet?: string;
  relevanceScore?: number;
}
