# Fiesta AI — Architecture Notes

## Overview

A minimal React Native chat screen that streams responses from Gemini with a smooth, natural typewriter feel on both iOS and Android.

---

## Project Structure

```
src/
├── constants/index.ts       — tuning knobs (drain speed, thresholds)
├── types/index.ts           — shared TypeScript interfaces
├── services/geminiSSE.ts    — SSE transport layer (XHR, no third-party libs)
├── hooks/useChat.ts         — all chat state, streaming lifecycle, abort
├── components/
│   ├── BlinkingCursor.tsx   — animated ▍ cursor using native driver
│   ├── MessageBubble.tsx    — single chat bubble (memoised)
│   └── ChatInput.tsx        — text field + Send / Stop button
└── screens/ChatScreen.tsx   — FlatList, auto-scroll, keyboard, header
```

---

## Key Design Decisions

### 1. WHY XHR instead of `fetch + ReadableStream`

`XMLHttpRequest.onprogress` delivers progressive text identically on iOS and Android without needing `ReadableStream` polyfills or `TextDecoder`. Calling `xhr.abort()` is synchronous — there are no dangling reader locks, which makes clean cancellation trivial.

> **Trade-off acknowledged:** `fetch` + `ReadableStream` is now viable on RN 0.76+ but XHR is still the most reliable cross-platform choice for SSE today.

---

### 2. THE BURST PROBLEM & THE TOKEN QUEUE

LLM servers batch tokens. A single `onprogress` event might deliver 80 characters at once. Naïvely writing that to state produces a "jump" in the UI.

**Solution: Decouple network speed from render speed.**

```
Network → pendingQueueRef (string buffer) → drainInterval → setState → UI
```

- Every incoming chunk is **appended** to `pendingQueueRef` (a plain string ref — no re-renders).
- A `setInterval` at 16 ms (≈ 60 fps) drains **3 characters per tick** from the front of the buffer.
- If the buffer grows beyond 60 chars (network is fast), we drain **8 chars/tick** — adaptive speed prevents the queue from falling too far behind.
- Result: text appears smoothly regardless of how the server batches data.

---

### 3. CLEAN ABORT / STOP BUTTON

```
stopStream()
  └─ xhr.abort()           ← no more onChunk callbacks can fire (synchronous)
  └─ clearInterval(drain)  ← no more setState calls from the drain
  └─ flush remaining queue ← partial text shown, not silently dropped
  └─ setIsStreaming(false)  ← UI reflects stopped state
```

No ghost state. No stale callbacks. The `aborted` boolean inside `streamGeminiResponse` is checked before every callback so even in-flight callbacks become no-ops the moment `abort()` is called.

---

### 4. CONCURRENT MESSAGES (Follow-up Problem)

> *"A user sends a second message before the first response finishes streaming. How does your implementation handle this?"*

When `sendMessage()` is called while a stream is active:

1. **Abort** the XHR immediately (`aborted = true` before any callbacks).
2. **Flush** the pending queue into the interrupted message — the user sees the partial response, not a blank bubble.
3. **Mark** the interrupted message as `isStreaming: false`.
4. **Start** a fresh stream for the new message with the full conversation history.

This preserves the conversational context: Model receives all previous messages (including the partial one) as history.

The history is built from `messagesRef.current` **synchronously** before calling `setMessages` — no `setTimeout`, no stale closure captures.

---

### 5. AUTO-SCROLL — DON'T HIJACK THE USER

Rules:
- **At bottom** → auto-scroll on every new token.
- **Scrolled up** → freeze auto-scroll; show a `↓` FAB.
- **Scroll back to bottom** → re-enable auto-scroll.

Detection uses `onScroll` (throttled to 16 ms):
```
distanceFromBottom = contentHeight - (scrollOffset + visibleHeight)
scrolledUp = distanceFromBottom > 60px
```

`isScrolledUpRef` is a **ref** (not state) so scroll events don't cause re-renders. Only the FAB visibility (`showScrollToBottom`) is mirrored in state, and it only changes when the user crosses the threshold — minimising re-renders.

---

### 6. PERFORMANCE

| Concern | Solution |
|---|---|
| Re-rendering old messages during typing | `React.memo` on `MessageBubble` |
| Scroll event overhead | `scrollEventThrottle={16}`, ref-based threshold check |
| Android list memory | `removeClippedSubviews={true}`, `windowSize={10}` |
| Cursor animation blocking JS thread | `useNativeDriver: true` on `Animated.loop` |
| Interval leaks on unmount | `useEffect` cleanup in `useChat` |

---

### 7. BLINKING CURSOR

`Animated.loop` + `Animated.sequence` drives a 0→1→0 opacity cycle at 530 ms per phase (≈ 0.94 Hz), matching standard terminal cursor blink rate. `useNativeDriver: true` keeps it off the JS thread entirely — no impact on the drain interval or React renders.

---

---

### 8. Add-On

To implement multi-model, I have added 2 extra model where user can add his tokens and check the response accordingely.

---

## Running the App

```bash
# Android
cd FiestaAI
npx react-native run-android

# iOS (Mac only)
cd FiestaAI/ios && pod install && cd ..
npx react-native run-ios
```

**Minimum requirements:**
- Android: API 21+
- iOS: 13.4+
- Node: 18+
