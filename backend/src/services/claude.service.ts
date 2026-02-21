import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

// ── Singleton Client ─────────────────────────────

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

// ── Types ──────────────────────────────────────

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export interface ClaudeCallOptions {
  messages: Anthropic.MessageParam[];
  systemPrompt?: string;
  maxTokens?: number;
  model?: string;
}

export interface ClaudeCallResult {
  text: string;
  json: unknown | null;
  inputTokens: number;
  outputTokens: number;
}

// ── Retry Config ─────────────────────────────────

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── JSON Extraction ──────────────────────────────

/**
 * Extracts JSON from an LLM response, handling markdown code fences.
 */
export function extractJSON(text: string): unknown | null {
  // Try extracting from code fences first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try finding the first { ... } or [ ... ] block
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ── Core API Call ────────────────────────────────

export async function callClaude(options: ClaudeCallOptions): Promise<ClaudeCallResult> {
  const {
    messages,
    systemPrompt,
    maxTokens = 2000,
    model = DEFAULT_MODEL,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages,
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

      return {
        text,
        json: extractJSON(text),
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (err) {
      lastError = err;
      if (isRetryable(err) && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[claude] Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// ── Text Chunking ────────────────────────────────

/**
 * Splits text into chunks of approximately `maxWords` words,
 * breaking at sentence boundaries to avoid mid-sentence cuts.
 */
export function chunkText(text: string, maxWords = 4000): string[] {
  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let wordCount = 0;

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    if (wordCount + sentenceWords > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      wordCount = sentenceWords;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
      wordCount += sentenceWords;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
