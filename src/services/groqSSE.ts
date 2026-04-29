import { GROQ_MODEL } from '../constants';

export type OnChunk = (text: string) => void;
export type OnDone  = () => void;
export type OnError = (error: Error) => void;

export interface StreamController {
  abort: () => void;
}

/** OpenAI-compatible message format used by Groq */
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT =
  'You are Fiesta AI, a helpful and friendly AI assistant. Answer all user queries clearly and concisely.';

// ---------------------------------------------------------------------------
// Main streaming function
// ---------------------------------------------------------------------------

/**
 * Fire-and-forget streaming call to Groq.
 * Returns a controller whose abort() halts the stream synchronously.
 *
 * @param history   Full conversation history (user + assistant turns)
 * @param apiToken  User's Groq API token (stored in Redux)
 * @param onChunk   Called with each new text chunk
 * @param onDone    Called when the stream completes successfully
 * @param onError   Called if any error occurs
 */
export function streamGroqResponse(
  history: GroqMessage[],
  apiToken: string,
  onChunk: OnChunk,
  onDone: OnDone,
  onError: OnError,
): StreamController {
  const xhr = new XMLHttpRequest();
  let cursor = 0;
  let aborted = false;

  xhr.open('POST', GROQ_API_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Authorization', `Bearer ${apiToken}`);

  // onprogress fires whenever new bytes arrive.
  // We slice only the *new* portion so we never re-process the same data.
  xhr.onprogress = () => {
    if (aborted) { return; }
    const newText = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    extractTextFromSSE(newText, onChunk);
  };

  xhr.onload = () => {
    if (aborted) { return; }

    // HTTP-level error check (onerror only fires on network failures)
    if (xhr.status < 200 || xhr.status >= 300) {
      let message = `Groq API error (HTTP ${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText);
        if (body?.error?.message) {
          message = body.error.message;
        }
      } catch {
        // non-JSON body — use default message
      }
      onError(new Error(buildFriendlyError(xhr.status, message)));
      return;
    }

    // Flush any bytes that arrived between last progress and load events
    const tail = xhr.responseText.slice(cursor);
    if (tail) { extractTextFromSSE(tail, onChunk); }
    onDone();
  };

  xhr.onerror = () => {
    if (aborted) { return; }
    onError(new Error('Network error — check your internet connection.'));
  };

  xhr.ontimeout = () => {
    if (aborted) { return; }
    onError(new Error('Request timed out. Please try again.'));
  };

  xhr.onabort = () => { /* intentional abort — not an error */ };

  xhr.timeout = 60_000;

  const payload = JSON.stringify({
    model: GROQ_MODEL,
    // Groq expects the system prompt as the first message in the array
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
    stream: true,
    temperature: 0.9,
    max_tokens: 2048,
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
  const isRateLimit =
    httpStatus === 429 ||
    /rate.?limit/i.test(rawMessage) ||
    /quota/i.test(rawMessage);

  if (isRateLimit) {
    // Groq sometimes includes "Please try again in Xs."
    const retryMatch = rawMessage.match(/try again in ([\d.]+)\s*s/i);
    if (retryMatch) {
      const secs = Math.ceil(parseFloat(retryMatch[1]));
      return `Rate limit reached. Please retry in ${secs}s.`;
    }
    return 'Rate limit reached. Please wait a moment and try again.';
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return 'Invalid or missing Groq API key. Please check your token.';
  }

  if (httpStatus >= 500) {
    return 'Groq service is temporarily unavailable. Please try again shortly.';
  }

  return rawMessage.length > 120 ? `${rawMessage.slice(0, 117)}…` : rawMessage;
}

// ---------------------------------------------------------------------------
// SSE parser — OpenAI format
// ---------------------------------------------------------------------------

function extractTextFromSSE(raw: string, onChunk: OnChunk): void {
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('data:')) { continue; }
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') { continue; }
    try {
      const payload = JSON.parse(jsonStr);
      const text: string = payload?.choices?.[0]?.delta?.content ?? '';
      if (text) { onChunk(text); }
    } catch {
      // Partial / malformed line — will arrive complete next tick
    }
  }
}
