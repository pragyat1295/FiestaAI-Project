export type OnChunk = (text: string) => void;
export type OnDone = () => void;
export type OnError = (error: Error) => void;

export interface StreamController {
  abort: () => void;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

const SYSTEM_INSTRUCTION =
  'You are Fiesta AI, a helpful and friendly AI assistant. Answer all user queries clearly and concisely.';

/**
 * Fire-and-forget streaming call.  Returns a controller whose abort()
 * halts the stream synchronously — callers receive no further callbacks
 * after abort() returns.
 *
 * @param history   Full conversation history
 * @param apiToken  User's Gemini API token (stored in Redux)
 * @param onChunk   Called with each new text chunk
 * @param onDone    Called when the stream completes successfully
 * @param onError   Called if any error occurs
 */
export function streamGeminiResponse(
  history: GeminiMessage[],
  apiToken: string,
  onChunk: OnChunk,
  onDone: OnDone,
  onError: OnError,
): StreamController {
  const GEMINI_STREAM_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiToken}`;

  const xhr = new XMLHttpRequest();
  let cursor = 0;       // position in xhr.responseText we've already parsed
  let aborted = false;

  xhr.open('POST', GEMINI_STREAM_URL, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  /**
   * onprogress fires whenever the browser flushes new bytes.
   * We slice only the *new* portion since our last parse so we never
   * re-process the same data even if Gemini batches events.
   */
  xhr.onprogress = () => {
    if (aborted) { return; }
    const newText = xhr.responseText.slice(cursor);
    cursor = xhr.responseText.length;
    extractTextFromSSE(newText, onChunk);
  };

  xhr.onload = () => {
    if (aborted) { return; }

    // ── HTTP-level error check ──────────────────────────────────────────────
    // xhr.onerror only fires on *network* failures (no connection, DNS, etc.).
    // For HTTP 4xx / 5xx the XHR still calls onload — we must check status.
    if (xhr.status < 200 || xhr.status >= 300) {
      let message = `Gemini API error (HTTP ${xhr.status})`;
      try {
        // Gemini error bodies look like: {"error":{"code":400,"message":"..."}}
        const body = JSON.parse(xhr.responseText);
        if (body?.error?.message) {
          message = body.error.message;
        }
      } catch {
        // non-JSON body — use the default message above
      }
      onError(new Error(buildFriendlyError(xhr.status, message)));
      return;
    }

    // Flush any bytes that arrived between the last progress and load events
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

  // Intentional abort — not treated as an error
  xhr.onabort = () => { /* no-op */ };

  // 60-second timeout
  xhr.timeout = 60000;

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: history,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 2048,
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

/**
 * Converts raw Gemini API error details into a short, user-friendly string.
 */
function buildFriendlyError(httpStatus: number, rawMessage: string): string {
  const isQuota =
    httpStatus === 429 ||
    /quota/i.test(rawMessage) ||
    /rate.?limit/i.test(rawMessage);

  if (isQuota) {
    const retryMatch = rawMessage.match(/retry in ([\d.]+)\s*s/i);
    if (retryMatch) {
      const secs = Math.ceil(parseFloat(retryMatch[1]));
      return `Rate limit reached. Please retry in ${secs}s.`;
    }
    return 'API quota exceeded. Please check your plan at ai.google.dev/rate-limit.';
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return 'Invalid or missing Gemini API key. Please check your token.';
  }

  if (httpStatus >= 500) {
    return 'Gemini service is temporarily unavailable. Please try again shortly.';
  }

  return rawMessage.length > 120 ? `${rawMessage.slice(0, 117)}…` : rawMessage;
}

// ---------------------------------------------------------------------------
// SSE parser
// ---------------------------------------------------------------------------

/**
 * Gemini SSE line format:
 *   data: {"candidates":[{"content":{"parts":[{"text":"Hello"}],...},...}],...}
 *
 * We parse only the text delta from the first candidate's first part.
 * Partial JSON lines (mid-chunk boundary) are silently skipped; they'll
 * be completed in the next onprogress delivery.
 */
function extractTextFromSSE(raw: string, onChunk: OnChunk): void {
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('data:')) { continue; }
    const jsonStr = line.slice(5).trim();
    if (!jsonStr || jsonStr === '[DONE]') { continue; }
    try {
      const payload = JSON.parse(jsonStr);
      const text: string =
        payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) { onChunk(text); }
    } catch {
      // Partial / malformed line — will arrive complete next tick
    }
  }
}
