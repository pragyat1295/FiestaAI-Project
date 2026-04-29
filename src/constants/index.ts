// ---------------------------------------------------------------------------
// Ollama — local LLM server, runs on-device / localhost (no API key needed)
// Install: https://ollama.com
//
// ⚠️  IMPORTANT — Android emulator setup:
//   The emulator cannot reach 127.0.0.1 on your host directly.
//   You MUST bind Ollama to 0.0.0.0 before starting it:
//
//     Windows (PowerShell / CMD):
//       set OLLAMA_HOST=0.0.0.0:11434 && ollama serve
//
//     macOS / Linux (bash/zsh):
//       OLLAMA_HOST=0.0.0.0:11434 ollama serve
//
//   Then pull the model (one-time):
//       ollama pull qwen3.5:2b
//
//   Verify it's reachable from the emulator:
//       curl http://10.0.2.2:11434/api/tags
// ---------------------------------------------------------------------------

import { LLMService } from '../hooks/useChat';

/**
 * Base URL for the local Ollama server.
 *
 * Android emulator  →  use 10.0.2.2  (maps to host 127.0.0.1)
 * Physical device   →  use your machine's LAN IP, e.g. http://192.168.1.x:11434
 *
 * Remember to start Ollama with:  OLLAMA_HOST=0.0.0.0:11434 ollama serve
 */
export const OLLAMA_BASE_URL = 'http://10.0.2.2:11434';

/**
 * Model to use — qwen3.5:2b (Q4_K_M, LoRA+QLoRA, Score: 83/100)
 * Pull command: ollama pull qwen3.5:2b
 */
export const OLLAMA_MODEL = 'qwen3.5:2b';

// ---------------------------------------------------------------------------
// Groq — free tier, ~14 400 req/day, OpenAI-compatible SSE streaming
// API tokens are now entered by the user at runtime via the TokenModal and
// stored in Redux — no hardcoded keys needed here.
// ---------------------------------------------------------------------------

/**
 * Model to use — all options below are FREE on Groq's free tier:
 *   'llama-3.3-70b-versatile'  — most capable, great for chat  ← default
 *   'llama3-8b-8192'           — fastest, lowest latency
 *   'gemma2-9b-it'             — Google Gemma 2, well-rounded
 */
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * How many milliseconds between each drain tick of the smooth-render queue.
 * Lower = faster character reveal.
 */
export const DRAIN_INTERVAL_MS = 16; // ~60 fps

/**
 * Characters revealed per drain tick.  At 16 ms ticks this gives
 * ~187 chars/s — fast enough to not feel slow, slow enough to feel smooth.
 */
export const CHARS_PER_TICK = 3;

/**
 * If the pending queue grows beyond this threshold we speed up
 * the drain to avoid the queue falling too far behind the stream.
 */
export const FAST_DRAIN_THRESHOLD = 60;
export const FAST_CHARS_PER_TICK = 8;

/** ms before we consider the user to have "scrolled away" from the bottom */
export const SCROLL_BOTTOM_THRESHOLD = 60;

// ---------------------------------------------------------------------------
// Service switcher config
// ---------------------------------------------------------------------------

export const SERVICES: { id: LLMService; label: string; icon: string }[] = [
  { id: 'ollama', label: 'Ollama', icon: '🦙' },
  { id: 'groq',   label: 'Groq',   icon: '⚡' },
  { id: 'gemini', label: 'Gemini', icon: '✦' },
];

export const SUGGESTIONS = [
  '✨ Write a poem',
  '🔬 Explain quantum physics',
  '💻 Debug my code',
  '🌍 Plan a trip',
];
