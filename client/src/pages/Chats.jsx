import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ChatContext } from '../context/ChatContext';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';
import {
  Search, Send, Phone, MessageSquare, Users, ChevronLeft,
  Check, CheckCheck, ShieldCheck, AlertTriangle, Smile,
  Loader2, Wifi, WifiOff, User, Paperclip, Image, X,
  Clock, MoreVertical, Reply, Trash2, FileText, QrCode,
  Eye, EyeClosed
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/common/SEO';

const EMOJIS = ['😄','😊','🙏','👍','✅','🌿','🌾','🚜','💰','📦','🤝','❤️','🔥','👏','😂','😎','🤔','💪','🎉','📱'];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute bottom-16 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-3 z-30 w-60"
    >
      <div className="grid grid-cols-10 gap-1">
        {EMOJIS.map((e) => (
          <motion.button
            key={e}
            whileHover={{ scale: 1.25 }}
            onClick={() => { onSelect(e); onClose(); }}
            className="text-lg hover:text-green-600 dark:hover:text-emerald-400 transition-colors cursor-pointer leading-none p-1"
          >
            {e}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function Avatar({ name = '', size = 'md', online = false, role = null }) {
  const initial = name?.trim?.().charAt(0)?.toUpperCase() || '?';
  const sizeMap = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
  };
  const roleColors = {
    farmer: 'ring-2 ring-emerald-400 dark:ring-emerald-500',
    buyer: 'ring-2 ring-blue-400 dark:ring-blue-500',
  };

  return (
    <div className="relative shrink-0">
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center font-black uppercase shadow-sm border-2 border-white dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-all ${
          role ? roleColors[role] || '' : ''
        }`}
        style={{ backgroundColor: role === 'farmer' ? '#059669' : role === 'buyer' ? '#2563eb' : '#475569', color: '#ffffff' }}
      >
        {initial}
      </div>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800 shadow-sm" />
      )}
    </div>
  );
}

function MessageStatus({ isMe, isRead }) {
  if (!isMe) return null;
  return isRead ? (
    <CheckCheck className="w-3 h-3 text-emerald-300" />
  ) : (
    <Check className="w-3 h-3 text-emerald-100/70" />
  );
}

function TypingIndicator({ name = 'Someone' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm inline-flex items-end gap-1">
        <span className="text-[9px] text-slate-400 font-bold">{name} typing</span>
        <div className="flex items-end gap-0.5 mb-0.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 bg-green-600 dark:bg-emerald-400 rounded-full block"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatType: 'loop' }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ReplyPreview({ replyTo, onCancel }) {
  if (!replyTo) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-4 mb-2 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-start gap-2"
    >
      <div className="w-1 h-4 bg-emerald-500 rounded-full shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Replying to</p>
        <p className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate">
          {replyTo.text || 'message'}
        </p>
      </div>
      <button
        onClick={onCancel}
        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

function MessageMenu({ onReply, onDelete, onMarkRead, isRead, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-full right-0 mb-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[140px] z-30"
    >
      <button
        onClick={() => { onReply(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <Reply className="w-3 h-3" /> Reply
      </button>
      <button
        onClick={() => { onMarkRead(!isRead); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        {isRead ? <Eye className="w-3 h-3" /> : <EyeClosed className="w-3 h-3" />}
        {isRead ? 'Mark unread' : 'Mark read'}
      </button>
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
      >
        <Trash2 className="w-3 h-3" /> Delete
      </button>
    </motion.div>
  );
}

export default function Chats() {
  const {
    messages, activeRecipient, setActiveRecipient,
    conversations, allUsers, onlineUserIds, fetchConversations,
    fetchAllUsers, fetchOnlineUsers, unreadCount, fetchUnreadCount,
    fetchThread, markThreadRead, markMessageRead, sendMessage, typingContacts, setTyping,
    activeChatTab, setActiveChatTab,
  } = useContext(ChatContext);
  const { user: currentUser } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState('');
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedMsgId, setSelectedMsgId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showAttachment, setShowAttachment] = useState(false);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const MAX_CHARS = 500;

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchConversations();
      fetchUnreadCount();
      fetchAllUsers();
      fetchOnlineUsers();
    }
  }, [currentUser, fetchConversations, fetchUnreadCount, fetchAllUsers, fetchOnlineUsers]);

  useEffect(() => {
    if (!activeRecipient) return;
    fetchThread(activeRecipient.id);
    markThreadRead(activeRecipient.id);
    const interval = setInterval(() => fetchThread(activeRecipient.id), 4000);
    return () => clearInterval(interval);
  }, [activeRecipient, fetchThread, markThreadRead]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingContacts, replyTo]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeRecipient || isSending || !isOnline) return;
    setIsSending(true);
    try {
      await sendMessage(activeRecipient.id, text.trim(), replyTo?.id || null);
      setText('');
      setReplyTo(null);
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

  const selectContact = (contact) => {
    setActiveRecipient(contact);
    setPanelOpen(false);
    setReplyTo(null);
    setSelectedMsgId(null);
  };

  const handleReply = (msg) => {
    setReplyTo(msg);
    setSelectedMsgId(null);
    inputRef.current?.focus();
  };

  const handleDelete = (msg) => {
    if (window.confirm('Delete this message?')) {
      API.delete(`/chat/${msg.id}`).catch(() => {});
      setSelectedMsgId(null);
    }
  };

  const handleMarkRead = (msg, read) => {
    markMessageRead(msg.id, read);
    setSelectedMsgId(null);
  };

  const handleAttachment = (e) => {
    const file = e.target.files?.[0];
    if (file && activeRecipient) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        sendMessage(activeRecipient.id, `[📎 ${file.name}]`, replyTo?.id || null);
        setShowAttachment(false);
      };
      reader.readAsDataURL(file.slice(0, 100));
    }
  };

  const filteredConversations = conversations.filter((c) =>
    (c.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isPartnerTyping = typingContacts.includes(activeRecipient?.id);

  return (
    <div className="flex h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] w-full gap-0 overflow-hidden rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
      <SEO title="Messages | Acreage" description="Secure messaging with verified farmers and buyers on the Acreage marketplace." />

      {/* ── LEFT PANEL: Conversation List ── */}
      <div className={`
        flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900
        w-full md:w-72 lg:w-80 shrink-0
        ${panelOpen ? 'flex' : 'hidden md:flex'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-600 dark:text-emerald-400" /> Messages
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                {conversations.length} conversations · {unreadCount} unread
              </p>
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${
              isOnline
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 border-red-100 dark:border-rose-900'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all placeholder-slate-400"
            />
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setActiveChatTab('conversations')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChatTab === 'conversations'
                  ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveChatTab('users')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeChatTab === 'users'
                  ? 'bg-white dark:bg-slate-700 text-green-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All Users
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5 custom-scrollbar">
          {activeChatTab === 'conversations' ? (
            conversations.length > 0 ? (
              filteredConversations.map((contact) => {
                const isActive = String(activeRecipient?.id) === String(contact.id);
                const unread = contact.unread_count || 0;
                const isTyping = typingContacts.includes(contact.id);

                return (
                  <motion.div
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-emerald-50/70 dark:bg-slate-800 border-emerald-200 dark:border-slate-700'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={contact.username} size="md" role={contact.role} online={contact.is_incoming} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className={`text-xs font-black truncate ${isActive ? 'text-green-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              @{contact.username}
                            </p>
                            {contact.role && (
                              <span className={`text-[8px] font-black uppercase px-1 py-0.25 rounded ${
                                contact.role === 'farmer'
                                  ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                              }`}>
                                {contact.role.slice(0, 4)}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
                            {contact.last_message_at
                              ? new Date(contact.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-0.5 gap-1">
                          {isTyping ? (
                            <div className="flex items-end gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <motion.span
                                  key={i}
                                  className="w-1 h-1 bg-green-600 dark:bg-emerald-400 rounded-full block"
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatType: 'loop' }}
                                />
                              ))}
                              <span className="text-[10px] text-green-600 dark:text-emerald-400 font-bold">typing</span>
                            </div>
                          ) : (
                            <p className={`text-[10px] font-medium truncate ${
                              unread > 0 && !isActive ? 'text-slate-900 dark:text-white font-black' : 'text-slate-500 dark:text-slate-400'
                            }`}>
                              {contact.last_message || 'No messages yet'}
                            </p>
                          )}

                          {unread > 0 && !isActive && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="min-w-[18px] h-4 px-1 bg-green-600 dark:bg-emerald-500 text-white dark:text-emerald-950 font-black text-[9px] rounded-full flex items-center justify-center shrink-0"
                            >
                              {unread > 99 ? '99+' : unread}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider">
                  {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-[10px] mt-1">Switch to the All Users tab to start chatting</p>
              </div>
            )
          ) : (
            allUsers.length > 0 ? (
              <div className="space-y-0.5">
                {[...allUsers]
                  .sort((a, b) => {
                    const aOnline = onlineUserIds.includes(a.id);
                    const bOnline = onlineUserIds.includes(b.id);
                    if (aOnline && !bOnline) return -1;
                    if (!aOnline && bOnline) return 1;
                    return 0;
                  })
                  .filter((u) =>
                    (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (u.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (u.role || '').toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((user) => {
                    const isActive = String(activeRecipient?.id) === String(user.id);
                    const isOnline = onlineUserIds.includes(user.id);

                    return (
                      <motion.div
                        key={user.id}
                        onClick={() => selectContact(user)}
                        className={`relative p-3 rounded-xl cursor-pointer transition-all border ${
                          isActive
                            ? 'bg-emerald-50/70 dark:bg-slate-800 border-emerald-200 dark:border-slate-700'
                            : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={user.username} size="md" role={user.role} online={isOnline} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-black truncate ${isActive ? 'text-green-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                @{user.username}
                              </p>
                              {user.role && (
                                <span className={`text-[8px] font-black uppercase px-1 py-0.25 rounded ${
                                  user.role === 'farmer'
                                    ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                                }`}>
                                  {user.role.slice(0, 4)}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {user.location || 'No location set'}
                            </p>
                          </div>
                          {isOnline && (
                            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 animate-pulse" />
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5] mb-2" />
                <p className="text-[10px] font-black uppercase tracking-wider">No users available</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat Window ── */}
      <div className="flex-1 flex flex-col bg-slate-50/40 dark:bg-[#0b1120] overflow-hidden">
        {!activeRecipient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full mb-4">
              <MessageSquare className="w-10 h-10 stroke-[1.5]" />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
              Acreage Messenger
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mt-2 font-medium leading-relaxed">
              {activeRecipient
                ? `Messaging @${activeRecipient.username}`
                : 'Select a conversation or browse all users to start messaging. All communications are secured within the Acreage escrow platform.'}
            </p>
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden mt-4 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" /> Browse Conversations
            </button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  aria-label="Back to conversations"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <Avatar name={activeRecipient.username} size="md" role={activeRecipient.role} online={onlineUserIds.includes(activeRecipient.id)} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm truncate">
                      @{activeRecipient.username}
                    </h3>
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    {isPartnerTyping ? 'typing...' : `${activeRecipient.role || 'member'}`}
                    {activeRecipient.location && <span className="text-slate-400 dark:text-slate-500">· 📍 {activeRecipient.location}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => alert(`Calling @${activeRecipient.username}...`)}
                  className="p-2 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300 rounded-xl transition cursor-pointer active:scale-95"
                  aria-label="Call"
                >
                  <Phone className="w-4 h-4 stroke-[2.2]" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowAttachment(!showAttachment)}
                    className="p-2 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300 rounded-xl transition cursor-pointer active:scale-95"
                    aria-label="Attach"
                  >
                    <Paperclip className="w-4 h-4 stroke-[2.2]" />
                  </button>
                  <AnimatePresence>
                    {showAttachment && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full right-0 mb-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 min-w-[130px] z-30"
                      >
                        <label
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <Image className="w-3 h-3" /> Photo
                        </label>
                        <label
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Document
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          onChange={handleAttachment}
                          className="hidden"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {showAttachment && (
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowAttachment(false)}
                    />
                  )}
                </div>
                <button
                  onClick={() => setShowEmoji(v => !v)}
                  className="p-2 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300 rounded-xl transition cursor-pointer active:scale-95 relative"
                  aria-label="Emoji"
                >
                  <Smile className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200/60 dark:border-amber-900/60 px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200 select-none shrink-0">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              Keep all negotiations within Acreage to protect your escrow wallet.
            </div>

            {/* Messages feed */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center select-none gap-3 text-slate-300 dark:text-slate-600 pt-16">
                  <MessageSquare className="w-10 h-10 stroke-[1]" />
                  <p className="text-[10px] font-black uppercase tracking-wider">No messages yet</p>
                  <p className="text-[9px]">Say hello to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id !== activeRecipient.id;
                  const isRead = msg.is_read;
                  const showDate = i === 0 || (
                    msg.created_at && messages[i - 1]?.created_at &&
                    new Date(msg.created_at).toDateString() !==
                      new Date(messages[i - 1].created_at).toDateString()
                  );

                  return (
                    <div key={msg.id || i}>
                      {showDate && msg.created_at && (
                        <div className="flex items-center gap-2 my-3">
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-2">
                            {new Date(msg.created_at).toLocaleDateString([], {
                              weekday: 'short', month: 'short', day: 'numeric'
                            })}
                          </span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                        </div>
                      )}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                        {!isMe && <Avatar name={activeRecipient.username} size="sm" />}
                        <div className="relative group max-w-[80%] sm:max-w-md">
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                              isMe
                                ? 'bg-green-600 dark:bg-emerald-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none'
                            }`}
                          >
                            {msg.reply_to && (
                              <div className="mb-1.5 pb-1.5 border-b border-white/20 dark:border-white/10">
                                <p className="text-[9px] font-black opacity-80 truncate">
                                  ↳ {msg.reply_to}
                                </p>
                              </div>
                            )}
                            <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                isMe ? 'text-emerald-100' : 'text-slate-400'
                              }`}
                            >
                              <span className="text-[9px] font-bold">
                                {msg.created_at
                                  ? new Date(msg.created_at).toLocaleTimeString([], {
                                      hour: '2-digit', minute: '2-digit'
                                    })
                                  : 'just now'}
                              </span>
                              <MessageStatus isMe={isMe} isRead={isRead} />
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedMsgId(msg.id)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer z-10"
                            aria-label="Message options"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                        {isMe && <Avatar name={currentUser?.username || ''} size="sm" role={currentUser?.role} />}
                      </div>

                      {selectedMsgId === msg.id && (
                        <MessageMenu
                          onReply={() => handleReply(msg)}
                          onDelete={() => handleDelete(msg)}
                          onMarkRead={(read) => handleMarkRead(msg, read)}
                          isRead={msg.is_read}
                          onClose={() => setSelectedMsgId(null)}
                        />
                      )}
                    </div>
                  );
                })
              )}

              {isPartnerTyping && <TypingIndicator name={activeRecipient.username} />}

              <div ref={messageEndRef} />
            </div>

            {/* Reply preview */}
            <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />

            {/* Input bar */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 p-3 shrink-0 relative">
              <form onSubmit={handleSend} className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                  onKeyDown={handleKeyDown}
                  placeholder={isOnline ? `Message @${activeRecipient.username}...` : 'Offline — messages will send when you reconnect'}
                  rows={1}
                  disabled={!isOnline}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all placeholder-slate-400 resize-none max-h-32 overflow-y-auto disabled:opacity-50"
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                  }}
                />
                {text.length > MAX_CHARS * 0.7 && (
                  <span className={`absolute bottom-2 right-14 text-[9px] font-bold ${text.length >= MAX_CHARS ? 'text-red-500' : 'text-slate-400'}`}>
                    {MAX_CHARS - text.length}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={!text.trim() || isSending || !isOnline}
                  className="p-2.5 bg-green-600 hover:bg-green-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm shadow-green-600/20 shrink-0 active:scale-95 cursor-pointer"
                  aria-label="Send"
                >
                  {isSending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </form>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 px-1 font-medium">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
