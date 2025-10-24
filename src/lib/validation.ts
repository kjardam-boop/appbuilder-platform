/**
 * Input validation schemas using Zod
 * Provides client-side and server-side validation for forms
 */

import { z } from "zod";

/**
 * Authentication schema for signup and signin
 */
export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Ugyldig e-postadresse" })
    .max(255, { message: "E-postadresse må være mindre enn 255 tegn" }),
  password: z
    .string()
    .min(6, { message: "Passord må være minst 6 tegn" })
    .max(100, { message: "Passord må være mindre enn 100 tegn" }),
  fullName: z
    .string()
    .trim()
    .min(1, { message: "Fullt navn kan ikke være tomt" })
    .max(100, { message: "Fullt navn må være mindre enn 100 tegn" })
    .optional(),
});

/**
 * Contact form schema
 */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Navn kan ikke være tomt" })
    .max(100, { message: "Navn må være mindre enn 100 tegn" }),
  email: z
    .string()
    .trim()
    .email({ message: "Ugyldig e-postadresse" })
    .max(255, { message: "E-postadresse må være mindre enn 255 tegn" }),
  message: z
    .string()
    .trim()
    .min(1, { message: "Melding kan ikke være tom" })
    .max(1000, { message: "Melding må være mindre enn 1000 tegn" }),
});

/**
 * Company form schema
 */
export const companySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Bedriftsnavn kan ikke være tomt" })
    .max(200, { message: "Bedriftsnavn må være mindre enn 200 tegn" }),
  orgNumber: z
    .string()
    .trim()
    .regex(/^\d{9}$/, { message: "Organisasjonsnummer må være 9 siffer" })
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Beskrivelse må være mindre enn 2000 tegn" })
    .optional(),
});

/**
 * Project form schema
 */
export const projectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Prosjekttittel kan ikke være tom" })
    .max(200, { message: "Prosjekttittel må være mindre enn 200 tegn" }),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Beskrivelse må være mindre enn 2000 tegn" })
    .optional(),
});

/**
 * Sanitize HTML to prevent XSS attacks
 * Note: For production use, consider using DOMPurify library
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

/**
 * Validate and encode URL parameters
 */
export function encodeUrlParam(param: string): string {
  return encodeURIComponent(param.trim());
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Norwegian organization number
 */
export function isValidOrgNumber(orgNumber: string): boolean {
  const cleaned = orgNumber.replace(/\s/g, "");
  return /^\d{9}$/.test(cleaned);
}
