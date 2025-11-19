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

  // Main answer as markdown content
  blocks.push({
    type: "content",
    markdown: qaResult.answer
  });

  // Sources (if any)
  if (qaResult.sources && qaResult.sources.length > 0) {
    blocks.push({
      type: "cards.list",
      title: "Kilder",
      items: qaResult.sources.map(source => ({
        title: source.title,
        body: "Dette dokumentet inneholder relevant informasjon om ditt spørsmål.",
        cta: [
          {
            label: "Åpne dokument",
            href: `/docs/${source.id}`,
            icon: "external-link"
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
      items: qaResult.followups.map((question, idx) => ({
        title: question,
        body: "Klikk for å stille dette spørsmålet til AI-assistenten.",
        cta: [
          {
            label: "Still spørsmål",
            action_id: `ask_followup_${idx}`,
            icon: "message-circle",
            context: { question }
          }
        ]
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
