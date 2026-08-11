import { useContext, useEffect, useState } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api'; // Direct API access to fetch real contacts list
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';

export default function Chats() {
  const { messages, activeRecipient, setActiveRecipient, fetchThread, sendMessage } = useContext(ChatContext);
  const { user: currentUser } = useContext(AuthContext);
  
  // Real database contacts array hook state
  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // 1. Fetch real interactive users ledger from Flask backend upon mounting
  useEffect(() => {
    const loadConversationContacts = async () => {
      try {
        setIsLoadingContacts(true);
        // Hits your registered user profiles database endpoint
        const res = await API.get('/auth/users'); // Ensure you have a route mapping registered users
        
        // Filter out the currently logged-in user so they don't see themselves in the chat list
        const otherUsers = res.data.filter(u => u.id !== currentUser?.id);
        setContacts(otherUsers);
        
        // Auto-select the first user as active context if none is loaded yet
        if (otherUsers.length > 0 && !activeRecipient) {
          setActiveRecipient(otherUsers[0]);
        }
      } catch (err) {
        console.error('Failed to aggregate real marketplace contacts', err);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    if (currentUser) {
      loadConversationContacts();
    }
  }, [currentUser]);

  // 2. High UX Feature Anchor: Background polling manager looping every 4 seconds
  useEffect(() => {
    if (!activeRecipient) return;

    // Load message thread state immediately on user click selection
    fetchThread(activeRecipient.id);

    // Spin up interval background polling for incoming messages
    const pollInterval = setInterval(() => {
      fetchThread(activeRecipient.id);
    }, 4000);

    // Clear background interval execution threads on activeRecipient unmount shifts
    return () => clearInterval(pollInterval);
  }, [activeRecipient]);

  return (
    <div className="h-[calc(100vh-6rem)] flex gap-4 w-full animate-fade-in">
      {/* Conditionally render loader framework or final layout lists */}
      {isLoadingContacts ? (
        <div className="w-80 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center p-4">
          <span className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
          <p className="text-xs text-slate-400 font-medium mt-2">Loading chats...</p>
        </div>
      ) : (
        <ConversationList
          contacts={contacts}
          activeId={activeRecipient?.id}
          onSelect={(contact) => setActiveRecipient(contact)}
        />
      )}

      {/* Primary Communication Context Pane */}
      <ChatWindow
        activeUser={activeRecipient}
        messages={messages}
        onSendMessage={(text) => sendMessage(activeRecipient.id, text)}
      />
    </div>
  );
}
