import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IMessage } from '../types';

export type LLMService = 'ollama' | 'groq' | 'gemini';

export interface ChatState {
  messages: IMessage[];
  isStreaming: boolean;
  error: string | null;
  selectedService: LLMService;
  groqToken: string;
  geminiToken: string;
}

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  selectedService: 'ollama',
  groqToken: '',
  geminiToken: '',
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // -----------------------------------------------------------------------
    // Message management
    // -----------------------------------------------------------------------

    /** Add a user bubble + an empty streaming assistant bubble at once */
    addMessages(state, action: PayloadAction<{ user: IMessage; assistant: IMessage }>) {
      state.messages.push(action.payload.user);
      state.messages.push(action.payload.assistant);
    },

    /** Append characters to an assistant message (called every drain tick) */
    appendToMessage(state, action: PayloadAction<{ id: string; chars: string }>) {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) {
        msg.text += action.payload.chars;
      }
    },

    /** Mark a message as no longer streaming */
    finalizeMessage(state, action: PayloadAction<{ id: string; extraChars?: string }>) {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) {
        if (action.payload.extraChars) {
          msg.text += action.payload.extraChars;
        }
        msg.isStreaming = false;
      }
    },

    /** Remove an empty assistant bubble on error */
    removeMessage(state, action: PayloadAction<string>) {
      state.messages = state.messages.filter(m => m.id !== action.payload);
    },

    /** Append extra chars AND finalize in one shot (used in error/abort flush) */
    flushAndFinalizeMessage(
      state,
      action: PayloadAction<{ id: string; chars: string }>,
    ) {
      const msg = state.messages.find(m => m.id === action.payload.id);
      if (msg) {
        if (action.payload.chars) {
          msg.text += action.payload.chars;
        }
        msg.isStreaming = false;
      }
    },

    // -----------------------------------------------------------------------
    // Streaming flag
    // -----------------------------------------------------------------------

    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },

    // -----------------------------------------------------------------------
    // Error
    // -----------------------------------------------------------------------

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    clearError(state) {
      state.error = null;
    },

    // -----------------------------------------------------------------------
    // Service selection
    // -----------------------------------------------------------------------

    setSelectedService(state, action: PayloadAction<LLMService>) {
      state.selectedService = action.payload;
    },

    // -----------------------------------------------------------------------
    // API tokens
    // -----------------------------------------------------------------------

    setGroqToken(state, action: PayloadAction<string>) {
      state.groqToken = action.payload;
    },

    setGeminiToken(state, action: PayloadAction<string>) {
      state.geminiToken = action.payload;
    },

    // -----------------------------------------------------------------------
    // Reset — only triggered by "New Chat" button
    // -----------------------------------------------------------------------

    resetChat(state) {
      state.messages = [];
      state.isStreaming = false;
      state.error = null;
    },
  },
});

export const {
  addMessages,
  appendToMessage,
  finalizeMessage,
  removeMessage,
  flushAndFinalizeMessage,
  setStreaming,
  setError,
  clearError,
  setSelectedService,
  setGroqToken,
  setGeminiToken,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
