/**
 * Response Parser
 * Robust parsing and sanitization of AI responses
 */

import type { QaResult } from '../types/index.ts';

interface ParseResult {
  qaResult: QaResult;
  success: boolean;
  strategy: string;
}

/**
 * Parse AI response with multiple fallback strategies
 */
export function parseAIResponse(rawResponse: string): ParseResult {
  console.log('[ResponseParser] Starting parse...');
  console.log('[ResponseParser] Raw length:', rawResponse.length);
  console.log('[ResponseParser] First 200 chars:', rawResponse.slice(0, 200));

  // Strategy 1: Direct JSON parse (most common case)
  try {
    const parsed = JSON.parse(rawResponse);
    if (isValidQaResult(parsed)) {
      console.log('[ResponseParser] ✅ Strategy 1: Direct JSON parse');
      return {
        qaResult: sanitizeQaResult(parsed),
        success: true,
        strategy: 'direct'
      };
    }
  } catch (e) {
    // Continue to next strategy
  }

  // Strategy 1.5: Remove text before JSON (common AI mistake)
  const textBeforeJsonMatch = rawResponse.match(/^[^{]*(\{[\s\S]*\})$/);
  if (textBeforeJsonMatch) {
    try {
      const parsed = JSON.parse(textBeforeJsonMatch[1]);
      if (isValidQaResult(parsed)) {
        console.log('[ResponseParser] ✅ Strategy 1.5: Removed text before JSON');
        return {
          qaResult: sanitizeQaResult(parsed),
          success: true,
          strategy: 'text-before-json'
        };
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 2: Extract JSON from markdown code block
  const codeBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (isValidQaResult(parsed)) {
        console.log('[ResponseParser] ✅ Strategy 2: Code block extraction');
        return {
          qaResult: sanitizeQaResult(parsed),
          success: true,
          strategy: 'code-block'
        };
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract JSON from text with extra content
  const jsonMatch = rawResponse.match(/\{[\s\S]*"answer"[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (isValidQaResult(parsed)) {
        console.log('[ResponseParser] ✅ Strategy 3: Regex extraction');
        return {
          qaResult: sanitizeQaResult(parsed),
          success: true,
          strategy: 'regex'
        };
      }
    } catch (e) {
      // Continue to next strategy
    }
  }

  // Strategy 4: Try to find JSON object boundaries
  const firstBrace = rawResponse.indexOf('{');
  const lastBrace = rawResponse.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const jsonCandidate = rawResponse.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonCandidate);
      if (isValidQaResult(parsed)) {
        console.log('[ResponseParser] ✅ Strategy 4: Brace extraction');
        return {
          qaResult: sanitizeQaResult(parsed),
          success: true,
          strategy: 'brace-extraction'
        };
      }
    } catch (e) {
      // Continue to fallback
    }
  }

  // Fallback: Treat as plain text answer
  console.log('[ResponseParser] ⚠️ All strategies failed, using fallback');
  return {
    qaResult: createFallbackQaResult(rawResponse),
    success: false,
    strategy: 'fallback'
  };
}

/**
 * Validate if parsed object is a valid QaResult
 */
function isValidQaResult(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.answer === 'string' &&
    obj.answer.trim().length > 0 &&
    Array.isArray(obj.sources) &&
    Array.isArray(obj.followups)
  );
}

/**
 * Sanitize QaResult to ensure data quality
 */
function sanitizeQaResult(qa: QaResult): QaResult {
  // Clean answer
  let answer = qa.answer.trim();
  
  // Remove markdown artifacts from answer
  answer = answer.replace(/^```(?:json|markdown)?\s*/gm, '');
  answer = answer.replace(/\s*```$/gm, '');
  
  // Clean sources
  const sources = Array.isArray(qa.sources)
    ? qa.sources.filter(s => s && s.id && s.title)
    : [];

  // Ensure followups exist and are valid
  let followups = Array.isArray(qa.followups)
    ? qa.followups.filter(f => typeof f === 'string' && f.trim().length > 0)
    : [];

  // CRITICAL: Ensure at least 2 followup questions
  if (followups.length === 0) {
    followups = [
      "Kan du utdype dette?",
      "Fortell meg mer om dette",
      "Hva betyr dette i praksis?"
    ];
    console.log('[ResponseParser] ⚠️ No followups provided, using defaults');
  } else if (followups.length === 1) {
    followups.push("Kan du fortelle mer om dette?");
    console.log('[ResponseParser] ⚠️ Only 1 followup, added generic one');
  }

  // Limit followups to max 5
  if (followups.length > 5) {
    followups = followups.slice(0, 5);
  }

  console.log('[ResponseParser] Sanitized result:');
  console.log(`  - Answer length: ${answer.length}`);
  console.log(`  - Sources: ${sources.length}`);
  console.log(`  - Followups: ${followups.length}`);

  return {
    answer,
    sources,
    followups
  };
}

/**
 * Create fallback QaResult from plain text
 */
function createFallbackQaResult(text: string): QaResult {
  return {
    answer: text.trim() || "Jeg kunne dessverre ikke behandle dette spørsmålet. Vennligst prøv igjen.",
    sources: [],
    followups: [
      "Kan du omformulere spørsmålet?",
      "Hva ønsker du å vite mer om?",
      "Trenger du hjelp til noe annet?"
    ]
  };
}
