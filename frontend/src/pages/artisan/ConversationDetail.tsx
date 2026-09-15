import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import api from '../../lib/api';

export default function ConversationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/conversations/${id}/messages`);
      setMessages(res.data.messages || []);
      // Mark as read
      await api.put(`/conversations/${id}/read`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 10 seconds for new messages
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await api.post(`/conversations/${id}/messages`, { content: content.trim(), message: content.trim() });
      setContent('');
      await fetchMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col pb-safe">
      <header className="fixed top-0 w-full z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-on-surface rounded-full hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <h1 className="font-bold text-lg text-on-surface tracking-tight truncate ml-1">Thread</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-24 pb-24 w-full max-w-lg mx-auto flex flex-col gap-4 overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center p-8"><span className="text-on-surface-variant font-medium">Loading messages...</span></div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                  isMe ? 'bg-primary text-on-primary rounded-br-sm' : 'bg-surface-container-high text-on-surface rounded-bl-sm'
                }`}>
                  <p className="text-[15px] leading-relaxed break-words">{msg.content || msg.message}</p>
                </div>
                <span className="text-[10px] font-semibold text-on-surface-variant mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-0 w-full max-w-lg left-1/2 -translate-x-1/2 bg-surface border-t border-outline-variant/20 p-4 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-end gap-2 bg-surface-container-lowest border border-outline rounded-3xl p-1.5 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-sm">
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] py-3 px-4 text-sm font-medium text-on-surface placeholder:text-outline"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!content.trim() || sending}
            className="w-11 h-11 min-w-[44px] shrink-0 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-50 disabled:bg-surface-container-high disabled:text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
