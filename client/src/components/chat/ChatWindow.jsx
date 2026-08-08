import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Check, CheckCheck, ShieldCheck, Sparkles, MessageCircleSquare, Info, AlertTriangle } from 'lucide-react';

export default function ChatWindow({ activeUser, messages = [], onSendMessage, isPartnerTyping = false }) {
  const [text, setText] = useState('');
  const messageEndRef = useRef(null);

  // Automatically track and lock viewport scroller directly onto newest incoming message bubbles
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  // 1. HIGH-UX FALLBACK: Empty inbox default layout view state
  if (!activeUser) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center select-none h-[calc(100vh-2rem)]">
        <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-orange-600 shadow-sm animate-bounce mb-4">
          <MessageCircleSquare className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          Secure Escrow Chatroom <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-400 animate-pulse" />
        </h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium leading-normal">
          Select a verified producer partner from the left directory sidebar channel to initiate negotiation logs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-2rem)] overflow-hidden animate-fade-in">
      
      {/* 2. Top Banner Control Header with Verified Badges */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm/5">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
            {activeUser.username ? activeUser.username.trim().charAt(0) : '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-800 text-sm truncate">@{activeUser.username || "Trader"}</h3>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3 stroke-[2.5]" /> Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Fulfillment: {activeUser.location || 'Rift Valley Region'}
            </p>
          </div>
        </div>
        
        {/* Call Trigger proxy notification button hook */}
        <div className="flex items-center space-x-2 text-slate-400 shrink-0">
          <button 
            onClick={() => alert(`Dialing safe proxy routing line to track escrow terms directly.`)}
            className="p-2.5 border border-slate-200/60 hover:bg-slate-50 hover:text-slate-700 rounded-xl transition shadow-sm cursor-pointer active:scale-95"
            aria-label="Secure Voice Call"
          >
            <Phone className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* 3. Escrow Security Advisory Banner Note */}
      <div className="bg-amber-50/60 border-b border-amber-100/50 p-2.5 px-4 flex items-center gap-2 text-[11px] font-semibold text-amber-800 select-none">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 stroke-[2.2]" />
        <p className="leading-tight">Keep communication within Acreage to protect checkout claims and escrow wallet balance assurances.</p>
      </div>

      {/* 4. Main Conversation Feed Area Container */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto bg-slate-50/20 max-h-[calc(100vh-12rem)] scrollbar-thin">
        {messages.length > 0 ? (
          messages.map((msg, i) => {
            // Checks token properties: if message sender matches active user, it's incoming
            const isMe = msg.sender_id !== activeUser.id;
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-scale-up`}>
                <div 
                  className={`max-w-md p-3.5 rounded-2xl text-xs font-semibold leading-relaxed border shadow-sm/5 ${
                    isMe 
                      ? 'bg-orange-600 text-white border-transparent rounded-tr-none' 
                      : 'bg-white border-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <p className="break-words font-medium">{msg.message}</p>
                  
                  {/* Dynamic timestamps and dual checkmark receipt icons validation block */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-bold ${isMe ? 'text-orange-200/90' : 'text-slate-400'}`}>
                    <span>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                    {isMe && (
                      msg.is_read ? <CheckCheck className="w-3 h-3 text-white stroke-[2.5]" /> : <Check className="w-3 h-3 text-orange-200" />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-1.5 select-none">
            <Info className="w-4 h-4 text-slate-200 stroke-[2.2]" />
            <span>Beginning secure transaction record ledger</span>
          </div>
        )}

        {/* HIGH-UX: Dynamic Partner Typing Indicator Animation */}
        {isPartnerTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-100 rounded-tl-none flex items-center space-x-1 shadow-sm">
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-orange-600 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      {/* 5. Interactive Message Input Bar Form Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 flex items-center space-x-3 bg-white rounded-b-2xl sticky bottom-0">
        <input
          type="text"
          placeholder={`Type an encrypted reply to @${activeUser.username || 'trader'}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder-slate-400"
          required
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="p-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:hover:bg-orange-600 text-white rounded-xl transition shadow-md shadow-orange-600/10 cursor-pointer shrink-0 active:scale-95"
          aria-label="Send Message"
        >
          <Send className="w-4 h-4 stroke-[2.2]" />
        </button>
      </form>
    </div>
  );
}
