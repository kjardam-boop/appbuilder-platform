import { BaseEntity } from "@/core/types/common.types";
import { z } from "zod";

/**
 * Delivery Method - How integrations communicate
 */
export interface DeliveryMethod extends BaseEntity {
  key: string;
  name: string;
  description: string | null;
  icon_name: string;
  requires_auth: boolean;
  supports_bidirectional: boolean;
  documentation_url: string | null;
  is_active: boolean;
}

export const deliveryMethodSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must be lowercase with underscores"),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  icon_name: z.string().default("Plug"),
  requires_auth: z.boolean().default(true),
  supports_bidirectional: z.boolean().default(false),
  documentation_url: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type DeliveryMethodInput = z.infer<typeof deliveryMethodSchema>;
