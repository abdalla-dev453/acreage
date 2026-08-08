import { useState, useMemo } from 'react';
import { Search, MessageSquare, Check, CheckCheck, CircleDot } from 'lucide-react';

export default function ConversationList({ contacts = [], activeId, onSelect, messages = [], currentUserId }) {
  const [searchTerm, setSearchTerm] = useState('');

  // REVOLUTIONARY ENGINE: Dynamically enrich contact profiles with active message metadata and sort them
  const processedContacts = useMemo(() => {
    const list = contacts.map((contact) => {
      // 1. Gather all messages shared between the current user and this specific contact
      const sharedMessages = messages.filter(
        (m) =>
          (m.sender_id === contact.id && m.receiver_id == currentUserId) ||
          (m.sender_id == currentUserId && m.receiver_id === contact.id)
      );

      // 2. Identify the absolute latest message object node
      const latestMessage = sharedMessages.length > 0 ? sharedMessages[sharedMessages.length - 1] : null;

      // 3. Compute the unread count badge parameters for incoming items
      const unreadCount = sharedMessages.filter((m) => m.sender_id === contact.id && !m.is_read).length;

      return {
        ...contact,
        lastMessageText: latestMessage ? latestMessage.message : 'No conversation established yet.',
        lastMessageTime: latestMessage ? new Date(latestMessage.created_at) : new Date(0), // Epoch baseline fallback
        isLastMessageFromMe: latestMessage ? latestMessage.sender_id == currentUserId : false,
        isLastMessageRead: latestMessage ? latestMessage.is_read : false,
        unreadCount: unreadCount,
      };
    });

    // 4. Run your case-insensitive textual string filter parameter block
    const filtered = list.filter((contact) => {
      const name = contact?.username || '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // 5. CRUCIAL RULE: Sort by timestamp descending so the latest active conversation bubbles to the top instantly!
    return filtered.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  }, [contacts, messages, searchTerm, currentUserId]);

  return (
    <div className="w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col h-[calc(100vh-2rem)] shrink-0">
      
      {/* Dynamic Upper Summary Block */}
      <div className="mb-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>Inbox Hub</span>
          <MessageSquare className="w-4 h-4 text-orange-500" />
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Real-time marketplace negotiation threads</p>
      </div>
      
      {/* Glassmorphic Search Input Component Field */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 stroke-[2.2]" />
        <input
          type="text"
          placeholder="Search contact handles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200/60 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
        />
      </div>

      {/* Main Filtered Scrolling Context Layout Container */}
      <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 scrollbar-thin">
        {processedContacts.length > 0 ? (
          processedContacts.map((contact) => {
            const contactName = contact?.username || 'Trader';
            const initial = contactName.trim().charAt(0).toUpperCase() || '?';
            const isActive = activeId === contact.id;
            const hasConversation = contact.lastMessageTime.getTime() > 0;

            return (
              <div
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={`p-3 rounded-xl flex items-start space-x-3 cursor-pointer transition-all border border-transparent select-none group ${
                  isActive
                    ? 'bg-orange-50/80 border-orange-100 shadow-sm'
                    : 'hover:bg-slate-50/80 hover:border-slate-100'
                }`}
              >
                {/* Visual Initial Placeholder Avatar Bubble */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shrink-0 transition-transform group-hover:scale-105 border uppercase ${
                  isActive 
                    ? 'bg-orange-600 text-white border-transparent' 
                    : 'bg-orange-50 text-orange-700 border-orange-100/30'
                }`}>
                  {initial}
                </div>

                {/* Main Dynamic Meta Information Column Wrapper */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <p className="text-xs font-black text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                      @{contactName}
                    </p>
                    {hasConversation && (
                      <span className="text-[9px] font-bold text-slate-400 font-mono">
                        {contact.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  
                  {/* Real-Time Last Message Text Segment Fragment Row */}
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium">
                    {contact.isLastMessageFromMe && (
                      <span className="shrink-0 text-slate-300">
                        {contact.isLastMessageRead ? (
                          <CheckCheck className="w-3.5 h-3.5 text-orange-500" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                    <p className={`truncate text-[11px] leading-tight flex-1 ${
                      contact.unreadCount > 0 && !isActive ? 'text-slate-900 font-black' : 'text-slate-400 font-medium'
                    }`}>
                      {contact.lastMessageText}
                    </p>
                  </div>

                  {/* Account Classification Badge Track Tags */}
                  <span className="inline-block text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-orange-600/80 transition-colors mt-1">
                    {contact.role || 'Member'}
                  </span>
                </div>

                {/* HIGH-UX METRIC: Unread Badge Alert Notification Bubble */}
                {contact.unreadCount > 0 && !isActive && (
                  <div className="flex flex-col items-center justify-center shrink-0 self-center">
                    <span className="min-w-[16px] h-4 px-1 bg-orange-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-sm shadow-orange-600/20 animate-pulse">
                      {contact.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Missing Records Alternative Empty State Layout View */
          <div className="text-center py-16 text-slate-400 font-medium text-xs flex flex-col items-center justify-center space-y-2">
            <CircleDot className="w-6 h-6 text-slate-200 stroke-[1.5]" />
            <span className="uppercase tracking-wider text-[10px] font-black text-slate-300">No active streams found</span>
          </div>
        )}
      </div>
    </div>
  );
}
