import { createContext, useState, useCallback, useContext } from 'react';
import API from '../services/api';
import { AuthContext } from '../context/AuthContext';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [activeRecipient, setActiveRecipient] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingContacts, setTypingContacts] = useState([]);
  const [activeChatTab, setActiveChatTab] = useState('conversations');
  const { user: currentUser } = useContext(AuthContext);

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

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await API.get('/auth/users');
      const data = res.data;
      const users = Array.isArray(data) ? data : data.items || [];
      setAllUsers(users);
      return users;
    } catch (err) {
      console.error('Failed to load users', err);
      return [];
    }
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await API.get('/chat/online');
      const ids = res.data.online_user_ids || [];
      setOnlineUserIds(ids);
      return ids;
    } catch (err) {
      console.error('Failed to load online users', err);
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

  const markMessageRead = useCallback(async (msgId, read = true) => {
    try {
      await API.patch(`/chat/${msgId}/read`, { is_read: read });
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, is_read: read } : m)));
    } catch (err) {
      console.error('Failed to mark message', err);
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

  const sortedUsers = [...allUsers].sort((a, b) => {
    const aOnline = onlineUserIds.includes(a.id);
    const bOnline = onlineUserIds.includes(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  return (
    <ChatContext.Provider
      value={{
        messages,
        activeRecipient,
        setActiveRecipient,
        conversations,
        allUsers: sortedUsers,
        onlineUserIds,
        fetchConversations,
        fetchAllUsers,
        fetchOnlineUsers,
        unreadCount,
        fetchUnreadCount,
        fetchThread,
        markThreadRead,
        markMessageRead,
        sendMessage,
        typingContacts,
        setTyping,
        activeChatTab,
        setActiveChatTab,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
