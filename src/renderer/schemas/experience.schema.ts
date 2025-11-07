import { z } from 'zod';
import { ThemeTokensSchema } from './theme.schema';

const CardBlockSchema = z.object({
  type: z.literal('card'),
  headline: z.string(),
  body: z.string(),
  actions: z.array(z.object({
    label: z.string(),
    action_id: z.string(),
  })).optional(),
});

const CardsListBlockSchema = z.object({
  type: z.literal('cards.list'),
  title: z.string().optional(),
  items: z.array(z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    body: z.string().optional(),
    itemType: z.enum(['person', 'service', 'company', 'generic']).optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    cta: z.array(z.object({
      label: z.string(),
      href: z.string().url().optional(),
      type: z.enum(['email', 'phone', 'web', 'generic']).optional(),
    })).optional(),
    meta: z.record(z.string()).optional(),
  })),
});

const TableBlockSchema = z.object({
  type: z.literal('table'),
  title: z.string().optional(),
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
});

const FlowStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  form: z.object({
    fields: z.array(z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'select', 'multiselect', 'textarea']),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional(),
    })),
    on_submit: z.object({
      type: z.literal('tool_call'),
      tool: z.string(),
      params_schema: z.record(z.any()),
      params_mapping: z.record(z.any()),
      on_success: z.array(z.any()).optional(),
      on_error: z.array(z.any()).optional(),
    }),
  }),
});

const FlowBlockSchema = z.object({
  type: z.literal('flow'),
  id: z.string(),
  steps: z.array(FlowStepSchema),
});

const BlockSchema = z.discriminatedUnion('type', [
  CardBlockSchema,
  CardsListBlockSchema,
  TableBlockSchema,
  FlowBlockSchema,
]);

export const ExperienceJSONSchema = z.object({
  version: z.literal('1.0'),
  layout: z.object({
    type: z.enum(['stack', 'grid']),
    gap: z.enum(['sm', 'md', 'lg']).optional(),
  }),
  theme: ThemeTokensSchema.optional(),
  blocks: z.array(BlockSchema),
});

export type ExperienceJSON = z.infer<typeof ExperienceJSONSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type CardBlock = z.infer<typeof CardBlockSchema>;
export type CardsListBlock = z.infer<typeof CardsListBlockSchema>;
export type TableBlock = z.infer<typeof TableBlockSchema>;
export type FlowBlock = z.infer<typeof FlowBlockSchema>;
