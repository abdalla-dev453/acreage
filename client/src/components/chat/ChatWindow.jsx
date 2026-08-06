import { useState, useEffect, useRef } from 'react';
import { Send, Phone, Video, MoreVertical } from 'lucide-react';

export default function ChatWindow({ activeUser, messages = [], onSendMessage }) {
  const [text, setText] = useState('');
  
  // 1. Reference pointer to target the message container box
  const messageEndRef = useRef(null);

  // 2. Automatically scroll down whenever the message history changes
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  // Fallback screen for empty state selection
  if (!activeUser) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-8 flex items-center justify-center text-slate-400 font-medium">
        Select a conversation to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[calc(100vh-2rem)]">
      {/* Top Banner Control Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-800">{activeUser.username || "User"}</h3>
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            Active now
          </span>
        </div>
        <div className="flex items-center space-x-2 text-slate-400">
          <button className="p-2 hover:bg-slate-50 rounded-lg transition"><Phone className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 rounded-lg transition"><Video className="w-4 h-4" /></button>
          <button className="p-2 hover:bg-slate-50 rounded-lg transition"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Main Conversation Feed Area */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-slate-50/30">
        {messages.map((msg, i) => {
          // Correctly maps using your Flask model attribute keys
          const isMe = msg.sender_id !== activeUser.id;
          return (
            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-md p-3.5 rounded-2xl text-sm shadow-sm ${
                  isMe 
                    ? 'bg-purple-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}
              >
                <p className="leading-relaxed break-words">{msg.message}</p>
                {/* Optional metadata timestamp layout */}
                {msg.created_at && (
                  <p className={`text-[10px] mt-1.5 text-right ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {/* Anchor point target container for our window auto-scroller */}
        <div ref={messageEndRef} />
      </div>

      {/* Interactive Messaging Submission Action Form Bar */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 flex items-center space-x-2 bg-white rounded-b-2xl">
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder-slate-400"
        />
        <button 
          type="submit" 
          disabled={!text.trim()}
          className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl transition shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
