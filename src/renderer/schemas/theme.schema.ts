import { z } from 'zod';

export const ThemeTokensSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i),
  accent: z.string().regex(/^#[0-9A-F]{6}$/i),
  surface: z.string().regex(/^#[0-9A-F]{6}$/i),
  textOnSurface: z.string().regex(/^#[0-9A-F]{6}$/i),
  fontStack: z.string(),
  logoUrl: z.string().url().optional(),
});

export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
