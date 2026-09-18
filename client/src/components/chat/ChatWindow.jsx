import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Check, CheckCheck, ShieldCheck, Sparkles, MessageSquare, Info, AlertTriangle } from 'lucide-react';

export default function ChatWindow({ activeUser, messages = [], onSendMessage, isPartnerTyping = false }) {
  const [text, setText] = useState('');
  const messageEndRef = useRef(null);

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

  if (!activeUser) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center justify-center text-center select-none h-[calc(100vh-2rem)]">
        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-600 shadow-sm mb-4">
          <MessageSquare className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
          Secure Escrow Chatroom <Sparkles className="w-3.5 h-3.5 text-green-500 fill-green-400 animate-pulse" />
        </h4>
        <p className="text-xs text-slate-400 max-w-xs mt-1 font-medium leading-normal">
          Select a verified producer partner from the left directory sidebar channel to initiate negotiation logs.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-2rem)] overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shadow-sm/5">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
            {activeUser.username ? activeUser.username.trim().charAt(0) : '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-slate-800 text-sm truncate">@{activeUser.username || "Trader"}</h3>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3 stroke-[2.5]" /> Verified
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Fulfillment: {activeUser.location || 'Rift Valley Region'}
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
        </div>
      </div>

      <div className="bg-amber-50/60 border-b border-amber-100/60 px-4 py-2 flex items-center gap-2 text-[11px] font-semibold text-amber-800 select-none shrink-0">
        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 stroke-[2.2]" />
        <p className="leading-tight">Keep all negotiations within Acreage to protect your escrow wallet.</p>
      </div>

      <div className="flex-1 p-5 space-y-3 overflow-y-auto bg-slate-50/20 max-h-[calc(100vh-12rem)] scrollbar-thin">
        {messages.length > 0 ? (
          messages.map((msg, i) => {
            const isMe = msg.sender_id !== activeUser.id;
            return (
              <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                    {activeUser.username ? activeUser.username.trim().charAt(0) : '?'}
                  </div>
                )}
                <div
                  className={`max-w-[75%] sm:max-w-md group ${
                    isMe
                      ? 'bg-green-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'
                  } px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm`}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                  <div className={`flex items-center justify-end gap-1 mt-1 ${isMe ? 'text-green-200/90' : 'text-slate-400'}`}>
                    <span className="text-[9px] font-bold">
                      {msg.created_at
                        ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'just now'}
                    </span>
                    {isMe && (
                      msg.is_read
                        ? <CheckCheck className="w-3 h-3 text-white stroke-[2.5]" />
                        : <Check className="w-3 h-3 text-green-200" />
                    )}
                  </div>
                </div>
                {isMe && (
                  <div className="w-7 h-7 rounded-xl bg-green-600 text-white flex items-center justify-center font-black text-xs uppercase shadow-sm shrink-0">
                    {'?'}
                  </div>
                )}
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
          <div className="flex justify-start animate-pulse">
            <div className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-100 rounded-tl-none flex items-center space-x-1 shadow-sm">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}

        <div ref={messageEndRef} />
      </div>

      <form className="bg-white border-t border-slate-100 p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={`Message @${activeUser.username}...`}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-slate-400 resize-none max-h-32 overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!text.trim() || !navigator.onLine}
            onClick={handleSubmit}
            className="p-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition shadow-sm shadow-green-600/20 shrink-0 active:scale-95"
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-300 mt-1.5 px-1 font-medium">
          Press Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
