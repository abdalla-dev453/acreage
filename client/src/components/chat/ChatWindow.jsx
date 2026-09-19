import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Check, CheckCheck, ShieldCheck, Sparkles, MessageSquare, Info, AlertTriangle, Smile, Paperclip, MoreVertical, Reply, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJIS = ['😄','😊','🙏','👍','✅','🌿','🌾','🚜','💰','📦','🤝','❤️','🔥','👏','😂','😎','🤔','💪','🎉','📱'];

export default function ChatWindow({
  activeUser,
  messages = [],
  onSendMessage,
  isPartnerTyping = false,
  onDeleteMessage = null,
  currentUser = null,
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const emojiPickerRef = useRef(null);
  const messageEndRef = useRef(null);

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping, replyTo]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyTo?.id || null);
    setText('');
    setReplyTo(null);
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmoji(false);
  };

  const formatTime = (ts) => {
    if (!ts) return 'just now';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!activeUser) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center select-none h-[calc(100vh-2rem)]">
        <div className="p-4 bg-green-50 border border-green-100 rounded-full text-green-600 mb-4">
          <MessageSquare className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          Secure Escrow Chatroom <Sparkles className="w-3.5 h-3.5 text-green-500 fill-green-400 animate-pulse" />
        </h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium leading-normal">
          Select a verified producer partner to start a secure negotiation thread.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-2rem)] overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-green-600 text-white font-black text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
            {activeUser.username ? activeUser.username.trim().charAt(0) : '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-800 text-sm truncate">@{activeUser.username || "Trader"}</h3>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3 stroke-[2.5]" /> Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPartnerTyping ? 'bg-green-500' : 'bg-slate-300'}`} />
              {isPartnerTyping ? 'typing...' : (activeUser.location || 'Rift Valley Region')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-slate-400 shrink-0">
          <button
            onClick={() => alert(`Dialing safe proxy routing line to track escrow terms directly.`)}
            className="p-2.5 border border-slate-200/60 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition shadow-sm cursor-pointer active:scale-95"
            aria-label="Secure Voice Call"
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </button>
          <button
            onClick={() => {}}
            className="p-2.5 border border-slate-200/60 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition cursor-pointer active:scale-95"
            aria-label="Info"
          >
            <Info className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Security notice */}
      <div className="bg-amber-50/60 border-b border-amber-100/60 px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-amber-800 select-none shrink-0">
        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
        <p className="leading-tight">Keep all negotiations within Acreage to protect your escrow wallet.</p>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 space-y-3 overflow-y-auto bg-slate-50/20 max-h-[calc(100vh-12rem)] custom-scrollbar">
        {messages.length > 0 ? (
          messages.map((msg, i) => {
            const isMe = msg.sender_id !== activeUser.id;
            const showDate = i === 0 || (
              msg.created_at && messages[i - 1]?.created_at &&
              new Date(msg.created_at).toDateString() !== new Date(messages[i - 1].created_at).toDateString()
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
                  {!isMe && (
                    <div className="w-7 h-7 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                      {activeUser.username ? activeUser.username.trim().charAt(0) : '?'}
                    </div>
                  )}
                  <div className="relative group">
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm max-w-[75%] sm:max-w-md ${
                        isMe
                          ? 'bg-green-600 text-white rounded-br-none'
                          : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {msg.reply_to && (
                        <div className="mb-1.5 pb-1 border-b border-white/10 last:border-green-200/20">
                          <p className="text-[9px] font-black opacity-80 truncate">
                            ↳ {msg.reply_to}
                          </p>
                        </div>
                      )}
                      <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                      <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-green-200/90' : 'text-slate-400'}`}>
                        <span className="text-[9px] font-bold">
                          {msg.created_at ? formatTime(msg.created_at) : 'just now'}
                        </span>
                        {isMe && (
                          msg.is_read ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Check className="w-3 h-3 text-green-200/60" />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedMsg(msg)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 rounded-lg p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer z-10"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>
                  {isMe && currentUser && (
                    <div className="w-7 h-7 rounded-xl bg-green-600 text-white flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                      {currentUser.username ? currentUser.username.trim().charAt(0) : '?'}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center select-none gap-2 text-slate-300">
            <MessageSquare className="w-8 h-8 stroke-[1.5]" />
            <p className="text-[10px] font-black uppercase tracking-wider">Start your conversation</p>
          </div>
        )}

        {isPartnerTyping && (
          <div className="flex justify-start">
            <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 rounded-tl-none shadow-sm inline-flex items-end gap-1 max-w-[75%] sm:max-w-md">
              <span className="text-[9px] text-slate-400 font-bold">typing...</span>
              <div className="flex items-end gap-0.5 mb-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 bg-green-600 rounded-full block"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity, repeatType: 'loop' }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* Reply preview inline above input */}
      {replyTo && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
          <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 flex items-start gap-2">
            <Reply className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase text-green-600 tracking-wider">Replying to message</p>
              <p className="text-[10px] text-slate-600 font-medium truncate">
                {replyTo.text || 'message'}
              </p>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded shrink-0"
            >
              <AlertTriangle className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <form className="bg-white border-t border-slate-100 p-3 shrink-0">
        <div className="relative flex items-end gap-2">
          {/* Attachment picker */}
          <div ref={emojiPickerRef} className="relative shrink-0 self-end mb-0.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                aria-label="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowAttachment(!showAttachment)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                aria-label="Attach"
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            <AnimatePresence>
              {showEmoji && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-30 w-60"
                >
                  <div className="grid grid-cols-10 gap-1">
                    {EMOJIS.map((e) => (
                      <motion.button
                        key={e}
                        whileHover={{ scale: 1.25 }}
                        type="button"
                        onClick={() => handleEmojiSelect(e)}
                        className="text-lg hover:text-green-600 transition-colors cursor-pointer leading-none p-1"
                      >
                        {e}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showAttachment && (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-10 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 min-w-[130px] z-30"
                  >
                    <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <Paperclip className="w-3 h-3" /> Attach file
                    </label>
                  </motion.div>
                  <div className="fixed inset-0 z-20" onClick={() => setShowAttachment(false)} />
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Text area */}
          <div className="flex-1 relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={`Message @${activeUser.username}...`}
              rows={1}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 transition-all placeholder-slate-400 resize-none max-h-32 overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
              }}
            />
            {text.length > 350 && (
              <span className={`absolute bottom-1.5 right-2 text-[9px] font-bold ${text.length >= 500 ? 'text-red-500' : 'text-slate-400'}`}>
                {500 - text.length}
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim()}
            onClick={handleSubmit}
            className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm shadow-green-600/20 shrink-0 active:scale-95"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-300 mt-1.5 px-1 font-medium">
          Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
