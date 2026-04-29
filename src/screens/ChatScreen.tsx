/**
 * ChatScreen.tsx
 * --------------
 * The main screen.  Wires together useChat, MessageBubble, ChatInput,
 * TokenModal, and implements smart auto-scroll behaviour.
 *
 * AUTO-SCROLL RULES:
 *  - When new content arrives while the user is AT the bottom → scroll down.
 *  - When the user has manually scrolled UP → do NOT hijack their scroll.
 *  - When the user scrolls back to the bottom → re-enable auto-scroll.
 *  - A "↓" FAB appears while the user is scrolled up so they can jump back.
 *
 * TOKEN MODAL RULES:
 *  - When the user selects Groq or Gemini and no token is stored → show modal.
 *  - If the user cancels → stay on the current service (don't switch).
 *  - If the user enters a token → store in Redux, switch service, close modal.
 *  - Token is remembered across new chats (resetChat only clears messages).
 *
 * We detect "at bottom" by comparing:
 *   contentHeight - (scrollOffset + visibleHeight) < SCROLL_BOTTOM_THRESHOLD
 *
 * We use a FlatList (not ScrollView) so only visible bubbles are rendered,
 * keeping memory usage bounded even in long conversations.
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ChatInput from '../components/chat-input/ChatInput';
import MessageBubble from '../components/message-bubble/MessageBubble';
import TokenModal from '../components/token-modal/TokenModal';
import EmptyState from '../components/empty-state/EmptyState';
import { useChat, LLMService } from '../hooks/useChat';
import { useAppDispatch } from '../store';
import { setGroqToken, setGeminiToken } from '../store/chatSlice';
import { SCROLL_BOTTOM_THRESHOLD } from '../constants';
import { IMessage } from '../types';
import { styles } from './ChatScreen.style';
import ErrorBanner from '../components/error-banner/ErrorBanner';
import Header from '../components/header/Header';
import ServiceSwitch from '../components/service-switch/ServiceSwitch';

const ChatScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const {
    messages,
    isStreaming,
    error,
    selectedService,
    groqToken,
    geminiToken,
    setSelectedService,
    sendMessage,
    stopStream,
    clearError,
  } = useChat();

  const flatListRef = useRef<FlatList<IMessage>>(null);

  /**
   * Whether the user is currently scrolled away from the bottom.
   * We use a ref (not state) to avoid re-renders on every scroll event.
   */
  const isScrolledUpRef = useRef(false);

  /**
   * Mirror of isScrolledUpRef in state — only updated when we need to
   * show/hide the scroll-to-bottom FAB, so we get a minimal number of renders.
   */
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // -------------------------------------------------------------------------
  // Token modal state
  // -------------------------------------------------------------------------

  /**
   * Which service's token modal is currently visible (null = none).
   * We track the *pending* service so we can revert if the user cancels.
   */
  const [tokenModalService, setTokenModalService] = useState<LLMService | null>(null);

  // -------------------------------------------------------------------------
  // Auto-scroll: trigger on every message update
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (messages.length === 0) { return; }
    if (isScrolledUpRef.current) { return; }  // user scrolled up — respect it

    // Small delay so the FlatList has committed the new item before we scroll
    const t = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => clearTimeout(t);
  }, [messages]);

  // -------------------------------------------------------------------------
  // Scroll event handling
  // -------------------------------------------------------------------------

  const handleScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      const scrolledUp = distanceFromBottom > SCROLL_BOTTOM_THRESHOLD;

      if (scrolledUp !== isScrolledUpRef.current) {
        isScrolledUpRef.current = scrolledUp;
        setShowScrollToBottom(scrolledUp);
      }
    },
    [],
  );

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    isScrolledUpRef.current = false;
    setShowScrollToBottom(false);
  }, []);

  // -------------------------------------------------------------------------
  // Service switcher handler
  //
  // Rules:
  //  - If switching to Ollama → just switch (no token needed).
  //  - If switching to Groq/Gemini and token already stored → just switch.
  //  - If switching to Groq/Gemini and NO token stored → show token modal.
  //  - Do NOT reset the chat on service change.
  // -------------------------------------------------------------------------

  const handleServiceChange = useCallback(
    (service: LLMService) => {
      if (service === selectedService) { return; }

      if (service === 'ollama') {
        setSelectedService(service);
        return;
      }

      // Groq or Gemini — check if we already have a token
      const existingToken = service === 'groq' ? groqToken : geminiToken;

      if (existingToken) {
        // Token already stored — switch immediately
        setSelectedService(service);
      } else {
        // No token yet — show the modal (service switch is deferred)
        setTokenModalService(service);
      }
    },
    [selectedService, groqToken, geminiToken, setSelectedService],
  );


  const handleTokenConfirm = useCallback(
    (token: string) => {
      if (!tokenModalService) { return; }

      // Store token in Redux
      if (tokenModalService === 'groq') {
        dispatch(setGroqToken(token));
      } else {
        dispatch(setGeminiToken(token));
      }

      setSelectedService(tokenModalService);
      setTokenModalService(null);
    },
    [tokenModalService, dispatch, setSelectedService],
  );

  const handleTokenCancel = useCallback(() => {
    // User cancelled — stay on the current service
    setTokenModalService(null);
  }, []);

  // -------------------------------------------------------------------------
  // FlatList render
  // -------------------------------------------------------------------------

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<IMessage>) => (
      <MessageBubble message={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: IMessage) => item.id, []);

  const listFooter = <View style={styles.listFooter} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0D1F" />

      {/* ── Token Modal ────*/}
      {tokenModalService && (
        <TokenModal
          visible={tokenModalService !== null}
          service={tokenModalService}
          onConfirm={handleTokenConfirm}
          onCancel={handleTokenCancel}
        />
      )}

      {/* Header */}
      <Header/>

      {/* Service switcher */}
      <ServiceSwitch handleServiceChange={handleServiceChange} />

      {/* Error banner */}
      {error && <ErrorBanner message={error} onDismiss={clearError} />}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={'padding'}
        keyboardVerticalOffset={0}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          ListEmptyComponent={<EmptyState />}
          ListFooterComponent={listFooter}
          contentContainerStyle={styles.listContent}
          // Performance tuning
          removeClippedSubviews={Platform.OS === 'android'}
          windowSize={10}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={32}
          initialNumToRender={20}
          // Scroll events at ~60fps during streaming for smooth auto-scroll tracking
          scrollEventThrottle={16}
          onScroll={handleScroll}
          // Keyboard interaction
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        {/* Scroll-to-bottom FAB */}
        {showScrollToBottom && (
          <TouchableOpacity
            style={styles.scrollFab}
            onPress={scrollToBottom}
            activeOpacity={0.85}
            accessibilityLabel="Scroll to bottom"
          >
            <Text style={styles.scrollFabIcon}>↓</Text>
          </TouchableOpacity>
        )}

        {/* Input bar */}
        <ChatInput
          isStreaming={isStreaming}
          onSend={sendMessage}
          onStop={stopStream}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


export default ChatScreen;
