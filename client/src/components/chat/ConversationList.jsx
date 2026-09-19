import { useState, useMemo } from 'react';
import { Search, MessageSquare, Check, CheckCheck, CircleDot, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ConversationList({
  contacts = [],
  activeId,
  onSelect,
  messages = [],
  currentUserId,
  typingContactIds = [],
  unreadCounts = {},
  conversations = [],
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const useConversations = conversations.length > 0 && contacts.length === 0;

  const processedContacts = useMemo(() => {
    if (useConversations) {
      return conversations
        .filter((c) =>
          (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.last_message || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return tb - ta;
        });
    }

    const list = contacts.map((contact) => {
      const contactIdStr = String(contact.id);
      const currentUserIdStr = String(currentUserId);

      const sharedMessages = messages.filter((m) => {
        const senderIdStr = String(m.sender_id);
        const receiverIdStr = String(m.receiver_id);
        return (
          (senderIdStr === contactIdStr && receiverIdStr === currentUserIdStr) ||
          (senderIdStr === currentUserIdStr && receiverIdStr === contactIdStr)
        );
      });

      const latestMessage = sharedMessages.length > 0 ? sharedMessages[sharedMessages.length - 1] : null;
      const unread = sharedMessages.filter(
        (m) => String(m.sender_id) === contactIdStr && !m.is_read
      ).length;

      return {
        ...contact,
        lastMessageText: latestMessage ? latestMessage.message : 'No conversation established yet.',
        lastMessageTime: latestMessage ? new Date(latestMessage.created_at) : new Date(0),
        isLastMessageFromMe: latestMessage ? String(latestMessage.sender_id) === currentUserIdStr : false,
        isLastMessageRead: latestMessage ? latestMessage.is_read : false,
        unreadCount: unread,
        hasConversation: latestMessage !== null,
      };
    });

    const filtered = list.filter((contact) => {
      const name = contact?.username || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return filtered.sort((a, b) => {
      if (a.hasConversation && b.hasConversation) {
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      }
      if (a.hasConversation && !b.hasConversation) return -1;
      if (!a.hasConversation && b.hasConversation) return 1;
      return 0;
    });
  }, [contacts, messages, searchTerm, currentUserId, conversations, useConversations]);

  const displayList = processedContacts;

  return (
    <div className="w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col h-[calc(100vh-2rem)] shrink-0">
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>Conversations</span>
          <MessageSquare className="w-4 h-4 text-green-500" />
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
          {useConversations
            ? `${conversations.length} conversations`
            : `${contacts.length} users on platform`}
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 stroke-[2.2]" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-slate-500"
        />
      </div>

      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {displayList.length > 0 ? (
          displayList.map((contact) => {
            const contactName = contact?.username || 'Trader';
            const initial = contactName.trim().charAt(0).toUpperCase() || '?';
            const isActive = String(activeId) === String(contact.id);
            const isTyping = typingContactIds.map(String).includes(String(contact.id));
            const unread = useConversations
              ? (contact.unread_count || 0)
              : (contact.unreadCount || 0);
            const lastMsg = useConversations
              ? (contact.last_message || '')
              : (contact.lastMessageText || '');
            const lastTime = useConversations
              ? (contact.last_message_at
                  ? new Date(contact.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '')
              : (contact.hasConversation
                  ? contact.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '');
            const isRead = useConversations
              ? (contact.is_read !== false)
              : contact.isLastMessageRead;

            return (
              <motion.div
                key={contact.id}
                whileHover={{ backgroundColor: '#f8fafc' }}
                onClick={() => onSelect(contact)}
                className={`p-3 rounded-xl flex items-start space-x-3 cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-green-50/80 border-green-100 shadow-sm'
                    : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shrink-0 transition-transform group-hover:scale-105 border uppercase ${
                  contact.role === 'farmer'
                    ? (isActive ? 'bg-green-600 text-white border-transparent' : 'bg-emerald-50 text-emerald-700 border-emerald-100/30')
                    : (isActive ? 'bg-blue-600 text-white border-transparent' : 'bg-blue-50 text-blue-700 border-blue-100/30')
                }`}>
                  {initial}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-xs font-black truncate ${isActive ? 'text-green-700' : 'text-slate-800'}`}>
                        @{contactName}
                      </p>
                      {contact.role && (
                        <span className={`text-[8px] font-black uppercase px-1 py-0.25 rounded ${
                          contact.role === 'farmer'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {contact.role.slice(0, 4)}
                        </span>
                      )}
                    </div>
                    {lastTime && (
                      <span className="text-[9px] text-slate-400 font-mono shrink-0">
                        {lastTime}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-0.5 gap-1">
                    {isTyping ? (
                      <div className="flex items-center gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="w-1.5 h-1.5 bg-green-600 rounded-full block"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatType: 'loop' }}
                          />
                        ))}
                        <span className="text-[10px] text-green-600 font-bold">typing...</span>
                      </div>
                    ) : (
                      <p className={`text-[10px] font-medium truncate ${
                        (useConversations ? unread : unread) > 0 && !isActive
                          ? 'text-slate-900 font-black'
                          : 'text-slate-500'
                      }`}>
                        {lastMsg || 'No messages yet'}
                      </p>
                    )}

                    {((useConversations ? unread : unread) > 0 && !isActive) && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="min-w-[18px] h-4 px-1 bg-green-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shrink-0"
                      >
                        {((useConversations ? unread : unread) > 99) ? '99+' : (useConversations ? unread : unread)}
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-16 text-slate-500 font-medium text-xs flex flex-col items-center justify-center space-y-2">
            <CircleDot className="w-6 h-6 text-slate-200 stroke-[1.5]" />
            <span className="uppercase tracking-wider text-[10px] font-black">
              {searchTerm ? 'No matching conversations' : 'No conversations yet'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
