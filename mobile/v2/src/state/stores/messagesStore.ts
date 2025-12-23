/**
 * Messages Store
 *
 * Manages message list, send/receive actions, and message ordering.
 * Handles encrypted messages for the active session.
 */

import { create } from 'zustand';
import { encryptMessage, decryptMessage } from '@/services/encryption';
import type { EncryptedMessage, DecryptedMessage } from '@/services/encryption';

/**
 * Message status
 */
export type MessageStatus = 'sending' | 'sent' | 'received' | 'failed';

/**
 * Message type (who sent it)
 */
export type MessageType = 'sent' | 'received';

/**
 * Message in the store
 */
export interface Message {
  id: string;
  content: string;
  timestamp: number;
  type: MessageType;
  status: MessageStatus;
  error?: string;
}

/**
 * Messages state
 */
interface MessagesState {
  // Messages list (ordered by timestamp)
  messages: Message[];

  // Sending state
  isSending: boolean;
  sendError: string | null;
}

/**
 * Messages actions
 */
interface MessagesActions {
  /**
   * Add a received message (already decrypted)
   */
  addReceivedMessage: (decrypted: DecryptedMessage) => void;

  /**
   * Send a message (encrypts and returns encrypted payload)
   */
  sendMessage: (
    token: string,
    content: string
  ) => Promise<EncryptedMessage>;

  /**
   * Mark a message as sent successfully
   */
  markMessageSent: (messageId: string) => void;

  /**
   * Mark a message as failed
   */
  markMessageFailed: (messageId: string, error: string) => void;

  /**
   * Clear all messages
   */
  clearMessages: () => void;

  /**
   * Get messages count
   */
  getMessagesCount: () => number;
}

/**
 * Messages store type
 */
type MessagesStore = MessagesState & MessagesActions;

/**
 * Initial state
 */
const initialState: MessagesState = {
  messages: [],
  isSending: false,
  sendError: null,
};

/**
 * Messages store
 */
export const useMessagesStore = create<MessagesStore>((set, get) => ({
  ...initialState,

  addReceivedMessage: (decrypted) => {
    const state = get();

    // Check for duplicate message (prevent adding same message twice)
    // This also ignores messages we sent ourselves (they already exist with type 'sent')
    const existingMessage = state.messages.find((msg) => msg.id === decrypted.messageId);
    if (existingMessage) {
      console.log('[MessagesStore] Ignoring duplicate/own message:', decrypted.messageId, 'type:', existingMessage.type);
      return;
    }

    const newMessage: Message = {
      id: decrypted.messageId,
      content: decrypted.content,
      timestamp: decrypted.timestamp,
      type: 'received',
      status: 'received',
    };

    set((state) => ({
      messages: [...state.messages, newMessage].sort(
        (a, b) => a.timestamp - b.timestamp
      ),
    }));
  },

  sendMessage: async (token, content) => {
    set({ isSending: true, sendError: null });

    try {
      // Encrypt message
      const encrypted = await encryptMessage(token, content);

      // Add to local store as "sending"
      const newMessage: Message = {
        id: encrypted.messageId,
        content,
        timestamp: encrypted.timestamp,
        type: 'sent',
        status: 'sending',
      };

      set((state) => ({
        messages: [...state.messages, newMessage].sort(
          (a, b) => a.timestamp - b.timestamp
        ),
        isSending: false,
      }));

      // Return encrypted message for WebRTC sending
      return encrypted;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to encrypt message';

      set({
        isSending: false,
        sendError: errorMessage,
      });

      throw error;
    }
  },

  markMessageSent: (messageId) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId ? { ...msg, status: 'sent' as MessageStatus } : msg
      ),
    }));
  },

  markMessageFailed: (messageId, error) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, status: 'failed' as MessageStatus, error }
          : msg
      ),
    }));
  },

  clearMessages: () => {
    set(initialState);
  },

  getMessagesCount: () => {
    return get().messages.length;
  },
}));

/**
 * Selectors for common state slices
 */
export const selectMessages = (state: MessagesStore) => state.messages;

export const selectLastMessage = (state: MessagesStore) =>
  state.messages.length > 0
    ? state.messages[state.messages.length - 1]
    : null;

export const selectIsSending = (state: MessagesStore) => state.isSending;

export const selectSendError = (state: MessagesStore) => state.sendError;

/**
 * Helper to decrypt and add a received message
 */
export async function decryptAndAddMessage(
  token: string,
  payload: string,
  messageId: string,
  timestamp: number
): Promise<void> {
  try {
    const decrypted = await decryptMessage(token, payload, messageId, timestamp);
    useMessagesStore.getState().addReceivedMessage(decrypted);
  } catch (error) {
    console.error('Failed to decrypt message:', error);
    throw error;
  }
}
