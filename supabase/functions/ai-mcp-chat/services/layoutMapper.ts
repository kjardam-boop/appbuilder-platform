/**
 * Layout Mapper
 * Convert QA result to ExperienceJSON
 */

import type { QaResult, Theme, ExperienceJSON } from '../types/index.ts';

export function mapQaToExperience(
  qaResult: QaResult,
  theme: Theme
): ExperienceJSON {
  const blocks: any[] = [];

  // Main answer card
  blocks.push({
    type: "card",
    headline: "Svar",
    body: qaResult.answer
  });

  // Sources (if any)
  if (qaResult.sources && qaResult.sources.length > 0) {
    blocks.push({
      type: "cards.list",
      title: "Kilder",
      items: qaResult.sources.map(source => ({
        title: source.title,
        cta: [
          {
            label: "Åpne",
            href: `/docs/${source.id}`
          }
        ]
      }))
    });
  }

  // Follow-up questions (if any)
  if (qaResult.followups && qaResult.followups.length > 0) {
    blocks.push({
      type: "cards.list",
      title: "Videre spørsmål",
      items: qaResult.followups.map(question => ({
        title: question
      }))
    });
  }

  return {
    version: "1.0",
    theme: {
      primary: theme.primary,
      accent: theme.accent,
      surface: theme.surface || "#ffffff",
      textOnSurface: theme.textOnSurface || "#1a1a1a"
    },
    layout: {
      type: "stack",
      gap: "md"
    },
    blocks
  };
}
