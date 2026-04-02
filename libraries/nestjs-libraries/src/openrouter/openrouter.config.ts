/**
 * Centralized OpenRouter model configuration.
 *
 * All LLM and image-generation calls route through OpenRouter.
 * Three model tiers let operators pick the right cost/quality trade-off:
 *
 *   POSTIZ_LIGHT_MODEL   – classification, extraction, short summaries
 *   POSTIZ_COMPLEX_MODEL – content generation, hooks, agent reasoning
 *   POSTIZ_IMAGE_MODEL   – image generation (replaces DALL-E)
 *
 * Set OPENROUTER_API_KEY and (optionally) OPENROUTER_BASE_URL in env.
 */

import { ChatOpenAI } from '@langchain/openai';
import OpenAI from 'openai';
import { createOpenAI } from '@ai-sdk/openai';

// ── env helpers ──────────────────────────────────────────────────────────────

const apiKey = () => process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
const baseURL = () => process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

// ── model ids ────────────────────────────────────────────────────────────────

export const LIGHT_MODEL = process.env.POSTIZ_LIGHT_MODEL || 'openai/gpt-4.1-mini';
export const COMPLEX_MODEL = process.env.POSTIZ_COMPLEX_MODEL || 'openai/gpt-4.1';
export const IMAGE_MODEL = process.env.POSTIZ_IMAGE_MODEL || 'google/gemini-3.1-flash-image-preview';

// ── LangChain ChatOpenAI (used by agent graphs) ─────────────────────────────

export function createLangChainModel(
  tier: 'light' | 'complex',
  opts?: { temperature?: number }
) {
  return new ChatOpenAI({
    apiKey: apiKey(),
    model: tier === 'light' ? LIGHT_MODEL : COMPLEX_MODEL,
    temperature: opts?.temperature ?? (tier === 'light' ? 0 : 0.7),
    configuration: {
      baseURL: baseURL(),
      defaultHeaders: {
        'HTTP-Referer': process.env.MAIN_URL || 'https://postiz.com',
        'X-Title': 'Postiz',
      },
    },
  });
}

// ── Raw OpenAI SDK client (used by openai.service.ts) ────────────────────────

export function createOpenAIClient() {
  return new OpenAI({
    apiKey: apiKey(),
    baseURL: baseURL(),
    defaultHeaders: {
      'HTTP-Referer': process.env.MAIN_URL || 'https://postiz.com',
      'X-Title': 'Postiz',
    },
  });
}

// ── Vercel AI SDK provider (used by Mastra agent) ────────────────────────────

export function createAISDKProvider() {
  return createOpenAI({
    apiKey: apiKey(),
    baseURL: baseURL(),
    headers: {
      'HTTP-Referer': process.env.MAIN_URL || 'https://postiz.com',
      'X-Title': 'Postiz',
    },
  });
}

// ── Image generation via OpenRouter chat completions ─────────────────────────

export async function generateImage(
  prompt: string,
  opts?: { vertical?: boolean }
): Promise<string> {
  const client = createOpenAIClient();

  const response = await client.chat.completions.create({
    model: IMAGE_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    // @ts-ignore – OpenRouter extension for image generation
    modalities: ['image', 'text'],
    // @ts-ignore – OpenRouter extension
    ...(opts?.vertical ? { image_config: { aspect_ratio: '9:16' } } : {}),
  } as any);

  const choice = response.choices?.[0];
  const message = choice?.message as any;

  // OpenRouter returns images in the content array as image_url parts
  if (Array.isArray(message?.content)) {
    const imagePart = message.content.find(
      (p: any) => p.type === 'image_url' || p.type === 'image'
    );
    if (imagePart?.image_url?.url) return imagePart.image_url.url;
    if (imagePart?.url) return imagePart.url;
  }

  // Fallback: check for images array (some OpenRouter models)
  if (Array.isArray(message?.images)) {
    const img = message.images[0];
    if (img?.image_url?.url) return img.image_url.url;
    if (typeof img === 'string') return img;
  }

  throw new Error(
    `Image generation failed: no image in response from ${IMAGE_MODEL}`
  );
}
