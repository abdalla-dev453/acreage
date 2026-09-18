import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import {
  Search, Send, Phone, MessageSquare, Users, ChevronLeft,
  Check, CheckCheck, ShieldCheck, AlertTriangle, Smile,
  Loader2, CircleDot, Info, Wifi, WifiOff, User
} from 'lucide-react';
import SEO from '../components/common/SEO';

// ── Emoji Picker (lightweight inline, no heavy lib needed) ──────────────────
const EMOJIS = ['😄','😊','🙏','👍','✅','🌿','🌾','🚜','💰','📦','🤝','❤️','🔥','👏','😂','😎','🤔','💪','🎉','📱'];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-14 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 w-64">
      <div className="grid grid-cols-10 gap-1">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => { onSelect(e); onClose(); }}
            className="text-lg hover:scale-125 transition-transform cursor-pointer leading-none p-0.5">
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Avatar bubble ────────────────────────────────────────────────────────────
function Avatar({ name = '', size = 'md', online = false, active = false }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const sizeMap = { sm: 'w-8 h-8 text-[10px]', md: 'w-10 h-10 text-xs', lg: 'w-12 h-12 text-sm' };
  return (
    <div className="relative shrink-0">
      <div className={`${sizeMap[size]} rounded-xl flex items-center justify-center font-black uppercase shadow-sm border transition-all
        ${active ? 'bg-green-600 text-white border-transparent' : 'bg-green-50 text-green-700 border-green-100/40'}`}>
        {initial}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
      )}
    </div>
  );
}

// ── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const map = {
    farmer: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    buyer: 'bg-blue-50 text-blue-700 border-blue-100',
  };
  return (
    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${map[role] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
      {role || 'member'}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN CHATS PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function Chats() {
  const { messages, activeRecipient, setActiveRecipient, fetchThread, sendMessage } = useContext(ChatContext);
  const { user: currentUser } = useContext(AuthContext);

  const [contacts, setContacts] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' | 'users'
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);  // mobile: toggle sidebar vs chat
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  const MAX_CHARS = 500;

  // ── Network status ─────────────────────────────────────────────────────────
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // ── Load contacts ──────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoadingContacts(true);
      const res = await API.get('/auth/users');
      const others = res.data.filter(u => u.id !== currentUser?.id);
      setContacts(others);
      if (others.length > 0 && !activeRecipient) {
        setActiveRecipient(others[0]);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  }, [currentUser]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ── Poll messages ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeRecipient) return;
    fetchThread(activeRecipient.id);
    const interval = setInterval(() => fetchThread(activeRecipient.id), 4000);
    return () => clearInterval(interval);
  }, [activeRecipient]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeRecipient || isSending) return;
    setIsSending(true);
    try {
      await sendMessage(activeRecipient.id, text.trim());
      setText('');
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // ── Select contact ─────────────────────────────────────────────────────────
  const selectContact = (contact) => {
    setActiveRecipient(contact);
    setPanelOpen(false); // on mobile, switch to chat view
  };

  // ── Derived lists ──────────────────────────────────────────────────────────
  // Find contacts with conversation history from messages
  const contactsWithHistory = contacts.filter(c =>
    messages.some(m => String(m.sender_id) === String(c.id) || String(m.receiver_id) === String(c.id))
  );

  const filtered = contacts.filter(c =>
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const displayList = activeTab === 'conversations'
    ? filtered.filter(c => contactsWithHistory.map(x => x.id).includes(c.id) || c.id === activeRecipient?.id)
    : filtered;

  // Unread count per contact (approximate from messages state for current thread)
  const getLastMsg = (contact) => {
    // Since messages only loads one thread at a time, we can only show for active
    if (activeRecipient?.id === contact.id) {
      const last = messages[messages.length - 1];
      return last ? last.message : null;
    }
    return null;
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full gap-0 overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white">
      <SEO title="Messages | Acreage" description="Secure messaging with verified farmers and buyers on the Acreage marketplace." />

      <div className={`
        flex flex-col bg-white border-r border-slate-100
        w-full md:w-72 lg:w-80 shrink-0
        ${panelOpen ? 'flex' : 'hidden md:flex'}
        transition-all
      `}>

        {/* Panel Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600" /> Messages
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{contacts.length} users on platform</p>
            </div>
            {/* Online indicator */}
            <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Live' : 'Offline'}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all placeholder-slate-400"
            />
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
            {[
              { key: 'conversations', label: 'Chats', icon: MessageSquare },
              { key: 'users', label: 'All Users', icon: Users }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${activeTab === tab.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {isLoadingContacts ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading users...</p>
            </div>
          ) : displayList.length > 0 ? (
            displayList.map(contact => {
              const isActive = String(activeRecipient?.id) === String(contact.id);
              const lastMsg = getLastMsg(contact);
              return (
                <div
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group border ${
                    isActive
                      ? 'bg-green-50 border-green-100 shadow-sm'
                      : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                  }`}
                >
                  <Avatar name={contact.username} active={isActive} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-black truncate ${isActive ? 'text-green-700' : 'text-slate-800'} group-hover:text-green-600 transition-colors`}>
                        @{contact.username}
                      </p>
                      <RoleBadge role={contact.role} />
                    </div>
                    {lastMsg ? (
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{lastMsg}</p>
                    ) : contact.location ? (
                      <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">📍 {contact.location}</p>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic mt-0.5">Tap to start a conversation</p>
                    )}
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
              <CircleDot className="w-8 h-8 text-slate-200 stroke-[1.5]" />
              <p className="text-[10px] font-black uppercase tracking-wider">
                {activeTab === 'conversations' ? 'No conversations yet' : 'No users found'}
              </p>
              {activeTab === 'conversations' && (
                <button onClick={() => setActiveTab('users')}
                  className="text-[10px] text-green-600 font-bold underline cursor-pointer mt-1">
                  Browse all users →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT PANEL — Chat Window ════════════════════════════════════════ */}
      <div className={`
        flex-1 flex flex-col bg-slate-50/30 overflow-hidden
        ${!panelOpen ? 'flex' : 'hidden md:flex'}
      `}>
        {!activeRecipient ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-green-600 shadow-sm mb-4">
              <MessageSquare className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Acreage Messenger</h4>
            <p className="text-xs text-slate-400 max-w-xs mt-2 font-medium leading-relaxed">
              Select a user from the list to start a secure negotiation thread.
            </p>
            {/* Mobile: show panel button */}
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" /> Browse Users
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm/5 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile back button */}
                <button
                  onClick={() => setPanelOpen(true)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <Avatar name={activeRecipient.username} size="md" online />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 text-sm truncate">@{activeRecipient.username}</h3>
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <RoleBadge role={activeRecipient.role} />
                    {activeRecipient.location && <span className="ml-1">· 📍 {activeRecipient.location}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => alert(`Calling @${activeRecipient.username}...`)}
                  className="p-2 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                  aria-label="Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { /* show profile info */ }}
                  className="p-2 border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                  aria-label="Info"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-amber-50/80 border-b border-amber-100/60 px-4 py-2 flex items-center gap-2 text-[10px] font-semibold text-amber-800 select-none shrink-0">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              Keep all negotiations within Acreage to protect your escrow wallet.
            </div>

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center select-none gap-2 text-slate-300">
                  <MessageSquare className="w-8 h-8 stroke-[1.5]" />
                  <p className="text-[10px] font-black uppercase tracking-wider">Start your conversation</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id !== activeRecipient.id;
                  const showDate = i === 0 || (
                    new Date(msg.created_at).toDateString() !== new Date(messages[i - 1]?.created_at).toDateString()
                  );
                  return (
                    <div key={msg.id || i}>
                      {showDate && msg.created_at && (
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-slate-100" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                            {new Date(msg.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                        {!isMe && <Avatar name={activeRecipient.username} size="sm" />}
                        <div className={`max-w-[75%] sm:max-w-md group`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-green-600 text-white rounded-br-none'
                              : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                          }`}>
                            <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {msg.created_at
                                ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'just now'}
                            </span>
                            {isMe && (
                              msg.is_read
                                ? <CheckCheck className="w-3 h-3 text-green-500" />
                                : <Check className="w-3 h-3 text-slate-300" />
                            )}
                          </div>
                        </div>
                        {isMe && (
                          <Avatar name={currentUser?.username || ''} size="sm" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messageEndRef} />
            </div>

            {/* Input bar */}
            <div className="bg-white border-t border-slate-100 p-3 shrink-0">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                {/* Emoji button + picker */}
                <div className="relative shrink-0 self-end mb-0.5">
                  <button
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                    aria-label="Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  {showEmoji && (
                    <EmojiPicker
                      onSelect={e => setText(prev => prev + e)}
                      onClose={() => setShowEmoji(false)}
                    />
                  )}
                </div>

                {/* Text area */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message @${activeRecipient.username}...`}
                    rows={1}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all placeholder-slate-400 resize-none max-h-32 overflow-y-auto"
                    style={{ height: 'auto' }}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                    }}
                  />
                  {/* Character counter */}
                  {text.length > MAX_CHARS * 0.7 && (
                    <span className={`absolute bottom-1.5 right-2 text-[9px] font-bold ${text.length >= MAX_CHARS ? 'text-red-500' : 'text-slate-400'}`}>
                      {MAX_CHARS - text.length}
                    </span>
                  )}
                </div>

                {/* Send button */}
                <button
                  type="submit"
                  disabled={!text.trim() || isSending || !isOnline}
                  className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm shadow-green-600/20 cursor-pointer shrink-0 self-end mb-0.5 active:scale-95"
                  aria-label="Send"
                >
                  {isSending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </form>
              <p className="text-[9px] text-slate-300 mt-1.5 px-1 font-medium">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
