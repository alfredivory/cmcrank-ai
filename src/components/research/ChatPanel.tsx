'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import AuthGuard from '../auth/AuthGuard';

interface ChatMessageData {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
  suggestsReresearch?: boolean;
}

interface ChatPanelProps {
  researchId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ researchId, isOpen, onClose }: ChatPanelProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Load history when panel opens
  useEffect(() => {
    if (!isOpen || !session?.user || historyLoaded) return;

    setLoading(true);
    fetch(`/api/research/${researchId}/chat`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.data) {
          setMessages(body.data);
        }
        setHistoryLoaded(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, session?.user, researchId, historyLoaded]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSend(message: string) {
    setSending(true);

    // Optimistic add user message
    const tempUserMsg: ChatMessageData = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/research/${researchId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        // Remove temp message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        return;
      }

      const body = await res.json();
      const { userMessage, assistantMessage, suggestsReresearch } = body.data;

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMessage,
        { ...assistantMessage, suggestsReresearch },
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full lg:w-96 bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white">Chat with Research</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg transition-colors"
            aria-label="Close chat"
          >
            x
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">
          <AuthGuard action="chat with research" requireAllowlist>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  Ask questions about this research. The AI has full context of the findings and public comments.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessageComponent
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  suggestsReresearch={msg.suggestsReresearch}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </AuthGuard>
        </div>

        {/* Input */}
        {session?.user?.isAllowlisted && (
          <ChatInput onSend={handleSend} disabled={sending} />
        )}
      </div>
    </>
  );
}
