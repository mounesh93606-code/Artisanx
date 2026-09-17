import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message {
    id: string;
    sender_id: string;
    content?: string;
    message?: string;
    created_at: string;
}

export default function MessagingUI({ enquiryId, orderId, currentUserId }: { enquiryId?: string, orderId?: string, currentUserId?: string }) {
    const { token, user } = useAuthStore();
    const effectiveUserId = currentUserId || user?.id || '';
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isMounted = true;

        async function fetchMessages(silently = false) {
            if ((!enquiryId && !orderId) || !token) {
                if (!silently && isMounted) setLoading(false);
                return;
            }
            try {
                let targetConvId = conversationId;
                if (!targetConvId) {
                    try {
                        const url = orderId 
                            ? `${API_URL}/conversations/by-order/${orderId}`
                            : `${API_URL}/conversations/by-enquiry/${enquiryId}`;
                        const convRes = await axios.get(url, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        targetConvId = convRes.data.conversation?.id;
                    } catch (e) {
                        // Fallback to searching conversation list
                        const listRes = await axios.get(`${API_URL}/conversations/`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        const found = listRes.data.conversations?.find((c: any) => 
                            (orderId && c.order_id === orderId) || (enquiryId && c.enquiry_id === enquiryId)
                        );
                        targetConvId = found?.id;
                    }
                }

                if (targetConvId && isMounted) {
                    setConversationId(targetConvId);
                    const msgRes = await axios.get(`${API_URL}/conversations/${targetConvId}/messages`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (isMounted) {
                        setMessages(msgRes.data.messages || []);
                    }
                }
            } catch (err) {
                console.error("Failed to load messages", err);
            } finally {
                if (!silently && isMounted) {
                    setLoading(false);
                }
            }
        }
        
        fetchMessages(false);
        const pollInterval = setInterval(() => {
            fetchMessages(true);
        }, 5000);

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [enquiryId, orderId, token, conversationId]);

    useEffect(() => {
        // Scroll only the internal message container, NEVER the window/page
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || isSending || !token) return;

        setIsSending(true);
        setSendError(null);

        try {
            let targetConvId = conversationId;
            if (!targetConvId) {
                const convRes = await axios.get(`${API_URL}/conversations/by-enquiry/${enquiryId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                targetConvId = convRes.data.conversation?.id;
                if (targetConvId) setConversationId(targetConvId);
            }

            if (!targetConvId) {
                throw new Error("Unable to establish conversation for this enquiry.");
            }

            const res = await axios.post(`${API_URL}/conversations/${targetConvId}/messages`, {
                content: trimmed,
                message: trimmed
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const savedMessage = res.data.message;
            setMessages(prev => [...prev, savedMessage]);
            setNewMessage("");
        } catch (err: any) {
            console.error("Failed to send message", err);
            setSendError(err.response?.data?.detail || "Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-surface rounded-2xl flex flex-col h-[480px] sm:h-[520px] shadow-sm border border-outline-variant overflow-hidden">
            {/* Card Header */}
            <div className="bg-surface-container-high px-4 py-3 flex items-center justify-between border-b border-outline-variant shrink-0">
                <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-on-surface">Conversation</h3>
                </div>
                {messages.length > 0 && (
                    <span className="text-xs text-stone-500 font-medium">
                        {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                    </span>
                )}
            </div>
            
            {/* Messages Scroll Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60 max-h-[350px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="animate-pulse flex items-center gap-2 text-stone-400 text-sm">
                            <div className="w-4 h-4 bg-stone-300 rounded-full animate-bounce"></div>
                            <span>Loading conversation...</span>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center">
                        <MessageCircle className="w-12 h-12 mb-2 opacity-25 text-primary" />
                        <p className="text-sm font-medium text-stone-600">No messages yet</p>
                        <p className="text-xs text-stone-400 mt-1 max-w-xs">
                            Start the conversation by typing your message below.
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === effectiveUserId;
                        const text = msg.content || msg.message || "";
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                                    isMe 
                                        ? 'bg-primary text-on-primary rounded-tr-none' 
                                        : 'bg-surface text-on-surface border border-outline-variant rounded-tl-none'
                                }`}>
                                    <div className="break-words whitespace-pre-wrap leading-relaxed">
                                        {text || <span className="italic opacity-60">(Empty message)</span>}
                                    </div>
                                    <div className={`text-[10px] mt-1 text-right font-medium ${
                                        isMe ? 'text-on-primary/80' : 'text-stone-400'
                                    }`}>
                                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Error banner if send failed */}
            {sendError && (
                <div className="px-4 py-2 bg-red-50 text-red-700 text-xs border-t border-red-200 flex items-center justify-between">
                    <span>{sendError}</span>
                    <button onClick={() => setSendError(null)} className="text-red-900 font-bold ml-2 hover:opacity-75">✕</button>
                </div>
            )}

            {/* Message Composer Form */}
            <form onSubmit={sendMessage} className="p-3 bg-surface border-t border-outline-variant flex gap-2 items-end shrink-0">
                <textarea 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type here..."
                    rows={1}
                    disabled={isSending}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                    className="flex-1 bg-surface-container rounded-xl px-3.5 py-2.5 text-base sm:text-sm border border-outline-variant/50 focus:border-primary focus:ring-1 focus:ring-primary min-h-[44px] max-h-[120px] resize-none outline-none transition-all placeholder:text-stone-400 disabled:opacity-60 text-on-surface"
                />
                <button 
                    type="submit" 
                    disabled={!newMessage.trim() || isSending}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] bg-primary text-on-primary rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 active:scale-95 transition-all shrink-0 shadow-sm"
                    title="Send message"
                    aria-label="Send message"
                >
                    {isSending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Send className="w-5 h-5" />
                    )}
                </button>
            </form>
        </div>
    );
}
