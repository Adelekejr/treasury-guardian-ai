/**
 * Optional remote AI adapter.
 *
 * The endpoint and model come from public frontend config; the API key is
 * typed in at runtime and held in this module's closure for the session only —
 * it is never written to storage, never logged, and never put in a VITE_ var.
 *
 * The endpoint contract is intentionally provider-neutral: it must accept
 * `POST {system, prompt, model}` and answer with either `{content: string}`,
 * `{text: string}`, or the structured object itself. Configure your own proxy;
 * no provider API shape is assumed here.
 */
import { applyAiOutput } from './guard';
import { AI_SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import type { AiAdapter, AiExplainInput } from './types';

export interface RemoteAdapterOptions {
  readonly endpoint: string;
  readonly model: string | null;
  /** Session-only credential. Not persisted anywhere. */
  readonly apiKey: string | null;
  readonly timeoutMs?: number;
}

function extractContent(payload: unknown): unknown {
  if (typeof payload === 'string') return payload;
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.content === 'string') return record.content;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.output === 'string') return record.output;
    return record;
  }
  return payload;
}

export function createRemoteAiAdapter(options: RemoteAdapterOptions): AiAdapter {
  const timeoutMs = options.timeoutMs ?? 15000;

  return {
    name: options.model ? `Remote provider (${options.model})` : 'Remote provider',
    kind: 'remote',
    async explain(input: AiExplainInput) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (input.signal) {
        input.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        if (options.apiKey) headers.authorization = `Bearer ${options.apiKey}`;

        const response = await fetch(options.endpoint, {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            model: options.model,
            system: AI_SYSTEM_PROMPT,
            prompt: buildUserPrompt(input),
          }),
        });

        if (!response.ok) {
          return {
            status: 'UNAVAILABLE' as const,
            explanation: null,
            error: `AI provider responded with HTTP ${response.status}.`,
          };
        }

        const payload: unknown = await response.json();
        return applyAiOutput(input.assessment, extractContent(payload), this.name, input.now).ai;
      } catch (error) {
        const reason =
          (error as Error)?.name === 'AbortError'
            ? `AI provider did not respond within ${timeoutMs} ms.`
            : `AI provider is unreachable: ${(error as Error).message}`;
        return { status: 'UNAVAILABLE' as const, explanation: null, error: reason };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
