export type TMessageRole = 'user' | 'assistant';

export interface IMessage {
  id: string;
  role: TMessageRole;
  /** The fully committed text (already displayed) */
  text: string;
  /** True while the assistant is still streaming this message */
  isStreaming?: boolean;
  /** Timestamp for ordering */
  createdAt: number;
}

export interface IChatState {
  messages: IMessage[];
  isStreaming: boolean;
  error: string | null;
}

export interface IErrorBannerProps {
  message: string;
  onDismiss: () => void;
}


export interface IMessageBubbleProps {
  message: IMessage;
}
