import { z } from 'zod';

/**
 * Validates the JSON response from Claude for pattern extraction.
 * Provides fallback defaults if the LLM returns unexpected structure.
 */
export const PatternExtractionResponseSchema = z.object({
  painPoints: z.array(z.string()).min(1).max(10),
  winningSubjects: z.array(z.string()).min(1).max(10),
  commonObjections: z.array(z.string()).min(1).max(10),
  championRoles: z.array(z.string()).min(1).max(10),
});

export type PatternExtractionResponse = z.infer<typeof PatternExtractionResponseSchema>;

export const FALLBACK_PATTERNS: PatternExtractionResponse = {
  painPoints: [
    'Inefficient manual processes',
    'Lack of data visibility',
    'Difficulty scaling operations',
  ],
  winningSubjects: [
    'How {Company} improved efficiency by X%',
    'Quick question about {painPoint}',
    'Your {Industry} peers are seeing results',
  ],
  commonObjections: [
    'We already have a solution in place',
    'Budget constraints this quarter',
    'Need internal alignment first',
  ],
  championRoles: [
    'VP of Sales',
    'Director of Operations',
    'Head of Revenue',
  ],
};
