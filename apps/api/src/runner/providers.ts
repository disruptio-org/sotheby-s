import type { ProviderId } from '@sothebys/domain';

export interface CompletionRequest {
  model: string;
  system: string;
  prompt: string;
  temperature: number;
  maxTokens: number;
  signal: AbortSignal;
}

export interface CompletionResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface Provider {
  complete(request: CompletionRequest, apiKey: string): Promise<CompletionResult>;
  /** Cheapest call that proves the key is accepted. */
  verifyKey(apiKey: string, signal: AbortSignal): Promise<boolean>;
}

/** Provider responses are untrusted input — read them defensively. */
const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const asNumber = (value: unknown): number => (typeof value === 'number' ? value : 0);

const failed = async (response: Response, provider: string): Promise<never> => {
  const body = await response.text().catch(() => '');
  const detail = body.slice(0, 500);
  throw new Error(`${provider} respondeu ${response.status}${detail ? `: ${detail}` : ''}`);
};

/* ── Anthropic ────────────────────────────────────────────────────────────── */

const anthropic: Provider = {
  async complete(request, apiKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: request.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.system,
        messages: [{ role: 'user', content: request.prompt }],
      }),
    });
    if (!response.ok) await failed(response, 'Anthropic');

    const body = asRecord(await response.json());
    const blocks = Array.isArray(body.content) ? body.content : [];
    const text = blocks
      .map((block) => {
        const rec = asRecord(block);
        return rec.type === 'text' && typeof rec.text === 'string' ? rec.text : '';
      })
      .join('');
    const usage = asRecord(body.usage);

    return {
      text,
      tokensIn: asNumber(usage.input_tokens),
      tokensOut: asNumber(usage.output_tokens),
    };
  },

  async verifyKey(apiKey, signal) {
    const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
      signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    });
    return response.ok;
  },
};

/* ── OpenAI ───────────────────────────────────────────────────────────────── */

const openai: Provider = {
  async complete(request, apiKey) {
    // The GPT-5 family renamed the token cap and fixes temperature at 1.
    const isGpt5 = request.model.startsWith('gpt-5');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: request.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.system },
          { role: 'user', content: request.prompt },
        ],
        ...(isGpt5
          ? { max_completion_tokens: request.maxTokens }
          : { max_tokens: request.maxTokens, temperature: request.temperature }),
      }),
    });
    if (!response.ok) await failed(response, 'OpenAI');

    const body = asRecord(await response.json());
    const choices = Array.isArray(body.choices) ? body.choices : [];
    const message = asRecord(asRecord(choices[0]).message);
    const usage = asRecord(body.usage);

    return {
      text: typeof message.content === 'string' ? message.content : '',
      tokensIn: asNumber(usage.prompt_tokens),
      tokensOut: asNumber(usage.completion_tokens),
    };
  },

  async verifyKey(apiKey, signal) {
    const response = await fetch('https://api.openai.com/v1/models', {
      signal,
      headers: { authorization: `Bearer ${apiKey}` },
    });
    return response.ok;
  },
};

/* ── Google Gemini ────────────────────────────────────────────────────────── */

const gemini: Provider = {
  async complete(request, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      signal: request.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          temperature: request.temperature,
          maxOutputTokens: request.maxTokens,
        },
      }),
    });
    if (!response.ok) await failed(response, 'Gemini');

    const body = asRecord(await response.json());
    const candidates = Array.isArray(body.candidates) ? body.candidates : [];
    const parts = asRecord(asRecord(candidates[0]).content).parts;
    const text = (Array.isArray(parts) ? parts : [])
      .map((part) => {
        const rec = asRecord(part);
        return typeof rec.text === 'string' ? rec.text : '';
      })
      .join('');
    const usage = asRecord(body.usageMetadata);

    return {
      text,
      tokensIn: asNumber(usage.promptTokenCount),
      tokensOut: asNumber(usage.candidatesTokenCount),
    };
  },

  async verifyKey(apiKey, signal) {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',
      { signal, headers: { 'x-goog-api-key': apiKey } },
    );
    return response.ok;
  },
};

/* ── Simulation ───────────────────────────────────────────────────────────── */

/**
 * Stands in for a real provider when RUN_SIMULATE is on. Runs still create real
 * rows, real timings and real (zero) costs — only the model call is faked.
 */
export const simulated: Provider = {
  async complete(request) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (request.signal.aborted) throw new Error('Execução cancelada.');
    const words = request.prompt.trim().split(/\s+/).length;
    return {
      text: `[simulação] ${request.system.slice(0, 80)}\n\nEntrada de ${words} palavra(s) processada por ${request.model}.`,
      tokensIn: Math.max(1, Math.round((request.system.length + request.prompt.length) / 4)),
      tokensOut: 64,
    };
  },
  async verifyKey() {
    return true;
  },
};

const PROVIDERS: Record<ProviderId, Provider> = { anthropic, openai, gemini };

export const providerFor = (id: ProviderId): Provider => PROVIDERS[id];
