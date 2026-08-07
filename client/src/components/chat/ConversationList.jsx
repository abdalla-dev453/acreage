import { useState } from 'react';
import { Search } from 'lucide-react';

export default function ConversationList({ contacts = [], activeId, onSelect }) {
  // 1. Reactive state tracking for live client-side searches
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Safe, case-insensitive filter computation loop
  const filteredContacts = contacts.filter((contact) => {
    const name = contact?.username || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="w-80 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col h-[calc(100vh-2rem)]">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Chats</h2>
      
      {/* Search Input Bar Field */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
        />
      </div>

      {/* Main Filtered Scroll Context Container */}
      <div className="space-y-1 overflow-y-auto flex-1 pr-1">
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => {
            const contactName = contact?.username || 'User';
            // Safe fallback logic preventing index string slicing execution errors
            const initial = contactName.trim().charAt(0).toUpperCase() || '?';
            const isActive = activeId === contact.id;

            return (
              <div
                key={contact.id}
                onClick={() => onSelect(contact)}
                className={`p-3 rounded-xl flex items-center space-x-3 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-900 border border-orange-100'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                {/* Visual Initial Placeholder Avatar Block */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm shrink-0 ${
                  isActive ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-700'
                }`}>
                  {initial}
                </div>

                {/* Text Node Descriptions Layout */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{contactName}</p>
                  <p className={`text-xs truncate ${isActive ? 'text-orange-500 font-medium' : 'text-slate-400'}`}>
                    {contact?.role ? `${contact.role} • Tap to chat` : 'Tap to chat'}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          /* Missing Records Alternative Empty State Layout View */
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            No conversations found
          </div>
        )}
      </div>
    </div>
  );
}
