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

  // Follow-up questions (if any)
  if (qaResult.followups && qaResult.followups.length > 0) {
    blocks.push({
      type: "cards.list",
      title: "Videre spørsmål",
      items: qaResult.followups.map((question, idx) => ({
        title: question,
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
