/**
 * MessageBubble.tsx
 * -----------------
 * Renders a single chat message.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import BlinkingCursor from '../blinking-cursor/BlinkingCursor';
import { IMessageBubbleProps } from '../../types';



const MessageBubble: React.FC<IMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isStreaming = !isUser && message.isStreaming;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>✦</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
        ]}
      >
        {/* Show a typing indicator if we haven't received any text yet */}
        {isStreaming && message.text.length === 0 ? (
          <View style={styles.typingRow}>
            <Text style={styles.typingDot}>●</Text>
            <Text style={[styles.typingDot, styles.typingDotMid]}>●</Text>
            <Text style={styles.typingDot}>●</Text>
          </View>
        ) : isUser ? (
          /* User messages: plain text */
          <Text style={[styles.text, styles.textUser]}>
            {message.text}
          </Text>
        ) : (
          /* Assistant messages: rendered as Markdown */
          <View>
            <Markdown style={markdownStyles}>
              {message.text}
            </Markdown>
            {isStreaming && (
              <BlinkingCursor color="#7C6AF7" fontSize={16} />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },

  // Avatar
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A2550',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: {
    color: '#7C6AF7',
    fontSize: 14,
  },

  // Bubble
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#7C6AF7',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#1E1B3A',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2550',
  },

  // Text (user only)
  text: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  textUser: {
    color: '#FFFFFF',
  },

  // Typing indicator (three dots before first token arrives)
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  typingDot: {
    color: '#5A52A0',
    fontSize: 10,
  },
  typingDotMid: {
    color: '#7C6AF7',
  },
});

// ---------------------------------------------------------------------------
// Markdown styles (for assistant messages)
// ---------------------------------------------------------------------------

const markdownStyles = StyleSheet.create({
  // Base body text
  body: {
    color: '#E0DEFF',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // Headings
  heading1: {
    color: '#E0DEFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  heading2: {
    color: '#E0DEFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 6,
  },
  heading3: {
    color: '#E0DEFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 4,
  },

  // Bold & italic
  strong: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  em: {
    color: '#C0B8FF',
    fontStyle: 'italic',
  },

  // Inline code
  code_inline: {
    color: '#A78BFA',
    backgroundColor: '#2A2550',
    borderRadius: 4,
    paddingHorizontal: 4,
    fontFamily: 'monospace',
    fontSize: 13,
  },

  // Code blocks
  fence: {
    backgroundColor: '#12102A',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2550',
  },
  code_block: {
    backgroundColor: '#12102A',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2550',
  },

  // Code block text
  // react-native-markdown-display targets 'code_block' text via 'fence' style
  // actual text inside a fence block
  text: {
    color: '#A78BFA',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },

  // Blockquote
  blockquote: {
    backgroundColor: '#1A1830',
    borderLeftWidth: 3,
    borderLeftColor: '#7C6AF7',
    paddingLeft: 12,
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 4,
  },

  // Lists
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: '#7C6AF7',
    fontSize: 15,
    marginRight: 6,
    lineHeight: 22,
  },
  ordered_list_icon: {
    color: '#7C6AF7',
    fontSize: 15,
    marginRight: 6,
    lineHeight: 22,
  },

  // Horizontal rule
  hr: {
    backgroundColor: '#2A2550',
    height: 1,
    marginVertical: 8,
  },

  // Links
  link: {
    color: '#7C6AF7',
    textDecorationLine: 'underline',
  },

  // Paragraph spacing
  paragraph: {
    marginTop: 0,
    marginBottom: 4,
  },
});

export default memo(MessageBubble);
