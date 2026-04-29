/**
 * useChat.ts
 * ----------
 * Central state manager for the chat screen.
 *
 * ALL persistent state (messages, service, tokens, error) now lives in Redux
 * so it survives component re-mounts and is only reset when the user taps
 * "New Chat".
 *
 * Ephemeral streaming bookkeeping (drain queue, interval, abort controller)
 * stays in refs — they are per-session and don't need to survive re-renders.
 *
 * Supports three LLM back-ends selectable at runtime:
 *   - 'ollama'  → local Ollama server (no token required)
 *   - 'groq'    → Groq cloud API  (user-supplied token stored in Redux)
 *   - 'gemini'  → Google Gemini   (user-supplied token stored in Redux)
 *
 * Key design decisions:
 *
 * 1. SMOOTH RENDERING via a token queue
 *    Raw chunks arrive in bursts (sometimes 50+ chars at once).
 *    We push them into `pendingQueueRef` (a plain string buffer) and drain
 *    it at a fixed interval — revealing a small number of characters per tick.
 *    This decouples network delivery speed from render speed, giving a
 *    typewriter-like feel regardless of how the server batches data.
 *
 * 2. ABORT via AbortController pattern
 *    We hold a ref to the current StreamController.  Calling stopStream()
 *    sets the `aborted` flag synchronously before XHR can fire any more
 *    callbacks, then clears the drain interval.  No ghost state can leak.
 *
 * 3. CONCURRENT MESSAGE HANDLING
 *    If sendMessage() is called while a stream is active (e.g. user sends
 *    a second message before the first response finishes), we:
 *      a) Abort the current stream immediately
 *      b) Flush whatever was pending in the queue into the interrupted
 *         message so it isn't lost / truncated silently
 *      c) Mark it as complete (isStreaming: false)
 *      d) Start a fresh stream for the new message
 *    This means the UI shows the partial response rather than a blank bubble.
 *
 * 4. MEMORY SAFETY
 *    The drain interval is always cleaned up in stopStream() which is also
 *    called from the useEffect cleanup — so no interval leaks on unmount.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  CHARS_PER_TICK,
  DRAIN_INTERVAL_MS,
  FAST_CHARS_PER_TICK,
  FAST_DRAIN_THRESHOLD,
} from '../constants';
import {
  OllamaMessage,
  streamOllamaResponse,
  StreamController as OllamaController,
} from '../services/ollamaService';
import {
  GroqMessage,
  streamGroqResponse,
  StreamController as GroqController,
} from '../services/groqSSE';
import {
  GeminiMessage,
  streamGeminiResponse,
  StreamController as GeminiController,
} from '../services/geminiSSE';
import { IMessage } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import {
  LLMService,
  addMessages,
  appendToMessage,
  finalizeMessage,
  flushAndFinalizeMessage,
  removeMessage,
  setStreaming,
  setError,
  clearError,
  setSelectedService,
  resetChat as resetChatAction,
} from '../store/chatSlice';

export type { LLMService };

type AnyController = OllamaController | GroqController | GeminiController;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseChatReturn {
  messages: IMessage[];
  isStreaming: boolean;
  error: string | null;
  selectedService: LLMService;
  groqToken: string;
  geminiToken: string;
  setSelectedService: (service: LLMService) => void;
  sendMessage: (text: string) => void;
  stopStream: () => void;
  resetChat: () => void;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
  const dispatch = useAppDispatch();

  // ── Read all persistent state from Redux ──────────────────────────────────
  const messages      = useAppSelector(s => s.chat.messages);
  const isStreaming   = useAppSelector(s => s.chat.isStreaming);
  const error         = useAppSelector(s => s.chat.error);
  const selectedService = useAppSelector(s => s.chat.selectedService);
  const groqToken     = useAppSelector(s => s.chat.groqToken);
  const geminiToken   = useAppSelector(s => s.chat.geminiToken);

  // ── Always-current mirrors via refs (avoid stale closures in callbacks) ───
  const messagesRef         = useRef<IMessage[]>(messages);
  messagesRef.current       = messages;

  const selectedServiceRef  = useRef<LLMService>(selectedService);
  selectedServiceRef.current = selectedService;

  const groqTokenRef        = useRef<string>(groqToken);
  groqTokenRef.current      = groqToken;

  const geminiTokenRef      = useRef<string>(geminiToken);
  geminiTokenRef.current    = geminiToken;

  // ── Ephemeral streaming state (refs — no re-render needed) ────────────────

  const pendingQueueRef = useRef<string>('');

  /** Reference to the XHR-based stream controller */
  const streamControllerRef = useRef<AnyController | null>(null);

  /** ID of the assistant message currently being streamed */
  const activeMessageIdRef = useRef<string | null>(null);

  /** Drain interval handle */
  const drainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------------
  // Drain — reveals queued chars at a steady pace
  // -------------------------------------------------------------------------

  const startDrain = useCallback((messageId: string) => {
    // Guard: clear any existing interval
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
    }

    drainIntervalRef.current = setInterval(() => {
      const queueLen = pendingQueueRef.current.length;
      if (queueLen === 0) { return; }

      // Adaptive speed: if queue is backing up, drain faster
      const charsToTake =
        queueLen > FAST_DRAIN_THRESHOLD ? FAST_CHARS_PER_TICK : CHARS_PER_TICK;

      const chars = pendingQueueRef.current.slice(0, charsToTake);
      pendingQueueRef.current = pendingQueueRef.current.slice(charsToTake);

      dispatch(appendToMessage({ id: messageId, chars }));
    }, DRAIN_INTERVAL_MS);
  }, [dispatch]);

  /**
   * Flush remaining pending chars instantly then stop the interval.
   * Used when the stream finishes or is aborted so we don't leave partial text.
   */
  const flushAndStopDrain = useCallback((messageId: string) => {
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
    const remaining = pendingQueueRef.current;
    pendingQueueRef.current = '';

    dispatch(flushAndFinalizeMessage({ id: messageId, chars: remaining }));
  }, [dispatch]);

  // -------------------------------------------------------------------------
  // stopStream — public, also called internally
  // -------------------------------------------------------------------------

  const stopStream = useCallback(() => {
    // Abort the XHR first so no more onChunk callbacks fire
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }

    const msgId = activeMessageIdRef.current;
    activeMessageIdRef.current = null;

    if (msgId) {
      flushAndStopDrain(msgId);
    } else {
      // Nothing to flush, just kill the interval
      if (drainIntervalRef.current) {
        clearInterval(drainIntervalRef.current);
        drainIntervalRef.current = null;
      }
      pendingQueueRef.current = '';
    }

    dispatch(setStreaming(false));
  }, [flushAndStopDrain, dispatch]);

  // -------------------------------------------------------------------------
  // resetChat — clears all messages and stops any active stream
  // -------------------------------------------------------------------------

  const resetChat = useCallback(() => {
    // Stop any active stream first (abort XHR, clear intervals)
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    if (drainIntervalRef.current) {
      clearInterval(drainIntervalRef.current);
      drainIntervalRef.current = null;
    }
    pendingQueueRef.current = '';
    activeMessageIdRef.current = null;

    // Reset messages / streaming / error in Redux
    dispatch(resetChatAction());
  }, [dispatch]);

  // -------------------------------------------------------------------------
  // sendMessage
  // -------------------------------------------------------------------------

  const sendMessage = useCallback(
    (inputText: string) => {
      const trimmed = inputText.trim();
      if (!trimmed) { return; }

      // --- Handle concurrent message ---
      // If a stream is in flight, abort it gracefully before starting a new one.
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;

        const prevMsgId = activeMessageIdRef.current;
        activeMessageIdRef.current = null;

        if (prevMsgId) {
          // Flush whatever was buffered so the partial response is visible
          flushAndStopDrain(prevMsgId);
        } else {
          if (drainIntervalRef.current) {
            clearInterval(drainIntervalRef.current);
            drainIntervalRef.current = null;
          }
          pendingQueueRef.current = '';
        }
      }

      dispatch(setError(null));

      // Committed messages (no streaming bubbles, no empty text)
      const committed = messagesRef.current.filter(
        m => !m.isStreaming && m.text.trim().length > 0,
      );

      // Build UI messages
      const userMsg: IMessage = {
        id: generateId(),
        role: 'user',
        text: trimmed,
        createdAt: Date.now(),
      };

      const assistantMsgId = generateId();
      const assistantMsg: IMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: '',
        isStreaming: true,
        createdAt: Date.now() + 1,
      };

      dispatch(addMessages({ user: userMsg, assistant: assistantMsg }));

      activeMessageIdRef.current = assistantMsgId;
      dispatch(setStreaming(true));
      pendingQueueRef.current = '';

      startDrain(assistantMsgId);

      // -----------------------------------------------------------------------
      // Shared callbacks (identical for all three services)
      // -----------------------------------------------------------------------

      const onChunk = (chunk: string) => {
        pendingQueueRef.current += chunk;
      };

      const onDone = () => {
        const checkEmpty = setInterval(() => {
          if (pendingQueueRef.current.length === 0) {
            clearInterval(checkEmpty);
            if (drainIntervalRef.current) {
              clearInterval(drainIntervalRef.current);
              drainIntervalRef.current = null;
            }
            activeMessageIdRef.current = null;
            streamControllerRef.current = null;
            dispatch(finalizeMessage({ id: assistantMsgId }));
            dispatch(setStreaming(false));
          }
        }, DRAIN_INTERVAL_MS);
      };

      const onError = (err: Error) => {
        console.warn('Stream error:', err);

        if (drainIntervalRef.current) {
          clearInterval(drainIntervalRef.current);
          drainIntervalRef.current = null;
        }

        const remaining = pendingQueueRef.current;
        pendingQueueRef.current = '';

        // Check if the bubble has content
        const bubble = messagesRef.current.find(m => m.id === assistantMsgId);
        const hasContent = (bubble?.text ?? '').length > 0 || remaining.length > 0;

        if (!hasContent) {
          dispatch(removeMessage(assistantMsgId));
        } else {
          dispatch(flushAndFinalizeMessage({ id: assistantMsgId, chars: remaining }));
        }

        activeMessageIdRef.current = null;
        streamControllerRef.current = null;
        dispatch(setStreaming(false));
        dispatch(setError(err.message));
      };

      // -----------------------------------------------------------------------
      // Route to the selected service
      // -----------------------------------------------------------------------

      const service = selectedServiceRef.current;
      let controller: AnyController;

      if (service === 'ollama') {
        const history: OllamaMessage[] = [
          ...committed.map(m => ({
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.text,
          })),
          { role: 'user' as const, content: trimmed },
        ];
        controller = streamOllamaResponse(history, onChunk, onDone, onError);

      } else if (service === 'groq') {
        const history: GroqMessage[] = [
          ...committed.map(m => ({
            role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.text,
          })),
          { role: 'user' as const, content: trimmed },
        ];
        controller = streamGroqResponse(
          history,
          groqTokenRef.current,
          onChunk,
          onDone,
          onError,
        );

      } else {
        // gemini
        const history: GeminiMessage[] = [
          ...committed.map(m => ({
            role: m.role === 'user' ? ('user' as const) : ('model' as const),
            parts: [{ text: m.text }],
          })),
          { role: 'user' as const, parts: [{ text: trimmed }] },
        ];
        controller = streamGeminiResponse(
          history,
          geminiTokenRef.current,
          onChunk,
          onDone,
          onError,
          );
      }

      streamControllerRef.current = controller;
    },
    [startDrain, flushAndStopDrain, dispatch],
  );

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
      }
      if (drainIntervalRef.current) {
        clearInterval(drainIntervalRef.current);
      }
      pendingQueueRef.current = '';
    };
  }, []);

  return {
    messages,
    isStreaming,
    error,
    selectedService,
    groqToken,
    geminiToken,
    setSelectedService: (service: LLMService) => dispatch(setSelectedService(service)),
    sendMessage,
    stopStream,
    resetChat,
    clearError: () => dispatch(clearError()),
  };
}
