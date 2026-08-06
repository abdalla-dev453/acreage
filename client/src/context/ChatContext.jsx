import { createContext, useState } from 'react';
import API from '../services/api';

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [activeRecipient, setActiveRecipient] = useState(null);

  // 1. Updated path to match backend: /api/chat/ (singular)
  const fetchThread = async (userId) => {
    try {
      const res = await API.get(`/chat/${userId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load chat history', err);
    }
  };

  // 2. Updated path to match backend: /api/chat/ (singular)
  const sendMessage = async (receiverId, messageText) => {
    try {
      const res = await API.post('/chat/', {
        receiver_id: receiverId, // Correct: matches Flask model attribute layout
        message: messageText,
      });
      
      // Append the newly created message to our reactive local state
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        activeRecipient,
        setActiveRecipient,
        fetchThread,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
