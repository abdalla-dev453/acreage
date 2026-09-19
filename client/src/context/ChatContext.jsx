import { createContext, useState, useCallback } from 'react';
import API from '../services/api';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingContacts, setTypingContacts] = useState([]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await API.get('/chat/conversations');
      const data = res.data;
      const convList = Array.isArray(data) ? data : data.items || [];
      setConversations(convList);
      return convList;
    } catch (err) {
      console.error('Failed to load conversations', err);
      return [];
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await API.get('/chat/unread-count');
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to load unread count', err);
    }
  }, []);

  const fetchThread = useCallback(async (userId) => {
    try {
      const res = await API.get(`/chat/${userId}`);
      const data = res.data;
      const msgs = Array.isArray(data) ? data : [];
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load chat history', err);
      setMessages([]);
    }
  }, []);

  const markThreadRead = useCallback(async (userId) => {
    try {
      await API.post(`/chat/${userId}/mark-read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark thread as read', err);
    }
  }, []);

  const sendMessage = useCallback(async (receiverId, messageText, replyTo = null) => {
    try {
      const payload = {
        receiver_id: receiverId,
        message: messageText,
      };
      if (replyTo) payload.reply_to = replyTo;

      const res = await API.post('/chat/', payload);
      setMessages((prev) => [...prev, res.data]);
      return res.data;
    } catch (err) {
      console.error('Failed to send message', err);
      return null;
    }
  }, []);

  const setTyping = useCallback((userId, isTyping) => {
    setTypingContacts((prev) => {
      if (isTyping) {
        return [...new Set([...prev, userId])];
      }
      return prev.filter((id) => id !== userId);
    });
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        activeRecipient,
        setActiveRecipient,
        conversations,
        fetchConversations,
        unreadCount,
        fetchUnreadCount,
        fetchThread,
        markThreadRead,
        sendMessage,
        typingContacts,
        setTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
