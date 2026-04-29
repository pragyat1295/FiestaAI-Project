/**
 * ollamaService.ts
 * ----------------
 * XHR-based NDJSON streaming for Ollama's local chat endpoint.
 *
 * Ollama runs locally on port 11434 and returns newline-delimited JSON (NDJSON):
 *   {"model":"qwen3.5:2b","created_at":"...","message":{"role":"assistant","content":"Hello"},"done":false}
 *   ...
 *   {"model":"qwen3.5:2b","created_at":"...","message":{"role":"assistant","content":""},"done":true}
 *
 * We reuse the same XHR + onprogress pattern as groqSSE.ts and geminiSSE.ts
 * so the rest of the app (useChat, drain queue, abort) needs minimal changes.
 *
 * Model: qwen3.5:2b (Q4_K_M, LoRA+QLoRA, Score: 83/100)
 * Pull:  ollama pull qwen3.5:2b
 */

import { OLLAMA_BASE_URL, OLLAMA_MODEL } from '../constants';

export type OnChunk = (text: string) => void;
export type OnDone  = () => void;
export type OnError = (error: Error) => void;

export interface StreamController {
  abort: () => void;
}

/** OpenAI-compatible message format used by Ollama */
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OLLAMA_CHAT_URL = `${OLLAMA_BASE_URL}/api/chat`;

const SYSTEM_PROMPT =
  'You are Fiesta AI, a helpful and friendly AI assistant. Answer all user queries clearly and concisely.';

// ---------------------------------------------------------------------------
// Main streaming function
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget streaming call to the local Ollama instance.
 * Returns a controller whose abort() halts the stream synchronously.
 *
 * Make sure Ollama is running (`ollama serve`) and the model is pulled:
 *   ollama pull qwen3.5:2b
 */
export function streamOllamaResponse(
  history: OllamaMessage[],
  onChunk: OnChunk,
  onDone: OnDone,
  onError: OnError,
): StreamController {
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let aborted = false;

  xhr.open('POST', OLLAMA_CHAT_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // onprogress fires whenever new bytes arrive.
  // We slice only the *new* portion so we never re-process the same data.
  xhr.onprogress = () => {
    if (aborted) { return; }
    const newText = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    extractTextFromNDJSON(newText, onChunk);
  };

  xhr.onload = () => {
    if (aborted) { return; }

    // HTTP-level error check (onerror only fires on network failures)
    if (xhr.status < 200 || xhr.status >= 300) {
      let message = `Ollama API error (HTTP ${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (body?.error) {
          message = typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
        }
      } catch {
        // non-JSON body — use default message
      }
      onError(new Error(buildFriendlyError(xhr.status, message)));
      return;
    }

    // Flush any bytes that arrived between last progress and load events
    const tail = xhr.responseText.slice(cursor);
    if (tail) { extractTextFromNDJSON(tail, onChunk); }
    onDone();
  };

  xhr.onerror = () => {
    if (aborted) { return; }
    onError(
      new Error(
        'Cannot connect to Ollama at ' + OLLAMA_BASE_URL + '.\n\n' +
        'Fix checklist:\n' +
        '1. Start Ollama on your host machine:\n' +
        '   OLLAMA_HOST=0.0.0.0:11434 ollama serve\n' +
        '   (The 0.0.0.0 binding lets the Android emulator reach it via 10.0.2.2)\n' +
        '2. Pull the model if not already done:\n' +
        '   ollama pull ' + OLLAMA_MODEL + '\n' +
        '3. On a physical device, update OLLAMA_BASE_URL in src/constants/index.ts\n' +
        '   to your machine\'s LAN IP, e.g. http://192.168.1.x:11434',
      ),
    );
  };

  xhr.ontimeout = () => {
    if (aborted) { return; }
    onError(new Error(
      'Ollama request timed out after 2 minutes.\n' +
      'The model may still be loading — please try again.\n' +
      'Tip: run `ollama run ' + OLLAMA_MODEL + '` in a terminal first to pre-load the model.',
    ));
  };

  xhr.onabort = () => { /* intentional abort — not an error */ };

  xhr.timeout = 120_000; // 2 min — local model cold-start can be slow

  const payload = JSON.stringify({
    model: OLLAMA_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
    ],
    stream: true,
    think: false,
    options: {
      temperature: 0.9,
      num_predict: 2048,
    },
  });

  xhr.send(payload);

  return {
    abort() {
      aborted = true;
      xhr.abort();
    },
  };
}

// ---------------------------------------------------------------------------
// Error formatter
// ---------------------------------------------------------------------------

function buildFriendlyError(httpStatus: number, rawMessage: string): string {
  if (httpStatus === 0 || httpStatus === 404) {
    return 'Ollama not found. Run `ollama serve` and ensure the model is pulled with `ollama pull qwen3.5:2b`.';
  }

  if (httpStatus === 404 || rawMessage.toLowerCase().includes('model') && rawMessage.toLowerCase().includes('not found')) {
    return 'Model qwen3.5:2b not found. Run: ollama pull qwen3.5:2b';
  }

  if (httpStatus >= 500) {
    return 'Ollama service error. Check `ollama serve` logs for details.';
  }

  return rawMessage.length > 120 ? `${rawMessage.slice(0, 117)}…` : rawMessage;
}

// ---------------------------------------------------------------------------
// NDJSON parser — Ollama format
// ---------------------------------------------------------------------------

/**
 * Ollama NDJSON line format:
 *   {"model":"qwen3.5:2b","message":{"role":"assistant","content":"Hello"},"done":false}
 *
 * We extract only the content delta from each line.
 * Lines with "done": true have an empty content — they're safely skipped.
 * Partial / malformed lines are silently skipped; they arrive complete next tick.
 */
function extractTextFromNDJSON(raw: string, onChunk: OnChunk): void {
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { continue; }
    try {
      const obj = JSON.parse(trimmed);
      // Skip final "done" sentinel (content is empty string there)
      if (obj?.done === true) { continue; }
      const text: string = obj?.message?.content ?? '';
      if (text) { onChunk(text); }
    } catch {
      // Partial / malformed line — will arrive complete next tick
    }
  }
}
