import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * App Category - Hierarchical taxonomy for external systems
 */
export interface AppCategory extends BaseEntity {
  key: string;
  name: string;
  slug: string;
  description: string | null;
  icon_name: string;
  parent_key: string | null;
  documentation_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AppCategoryTree extends AppCategory {
  parent_name: string | null;
  product_count: number;
}

export const appCategorySchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must be lowercase with underscores"),
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be kebab-case"),
  description: z.string().max(500).optional().or(z.literal("")),
  icon_name: z.string().default("Folder"),
  parent_key: z.string().optional().or(z.literal("")),
  documentation_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  sort_order: z.number().int().min(0).default(0),
});

export type AppCategoryInput = z.infer<typeof appCategorySchema>;
