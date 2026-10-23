import { env } from '../config/env.js';

export class AiUnavailableError extends Error {
  constructor(message, code = 'ollama_unavailable') {
    super(message);
    this.code = code; // 'ollama_unavailable' | 'model_missing' | 'bad_response'
  }
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${env.OLLAMA_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(env.OLLAMA_TIMEOUT_MS),
    });
  } catch (err) {
    throw new AiUnavailableError(`Cannot reach Ollama at ${env.OLLAMA_BASE_URL}: ${err.message}`);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404 || /not found/i.test(text)) {
      throw new AiUnavailableError(`Ollama model "${body.model}" is not installed. Run: ollama pull ${body.model}`, 'model_missing');
    }
    throw new AiUnavailableError(`Ollama returned ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** Chat returning parsed JSON. Throws AiUnavailableError on any failure. */
export async function chatJson(system, user) {
  const data = await post('/api/chat', {
    model: env.OLLAMA_CHAT_MODEL,
    stream: false,
    format: 'json',
    options: { temperature: 0.1 },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  try {
    return JSON.parse(data?.message?.content ?? '');
  } catch {
    throw new AiUnavailableError('Model did not return valid JSON', 'bad_response');
  }
}

/** Returns an array of embedding vectors, one per input string. */
export async function embed(inputs) {
  const data = await post('/api/embed', { model: env.OLLAMA_EMBED_MODEL, input: inputs });
  if (!Array.isArray(data?.embeddings) || data.embeddings.length !== inputs.length) {
    throw new AiUnavailableError('Unexpected embedding response', 'bad_response');
  }
  return data.embeddings;
}

export const toVectorLiteral = (v) => `[${v.join(',')}]`;
