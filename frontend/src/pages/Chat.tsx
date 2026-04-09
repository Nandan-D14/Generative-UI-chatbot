import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { InputBar } from '../components/chat/InputBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useStream, ReActStep } from '../hooks/useStream';
import { fromUnixish } from '../lib/time';
import type { LLMResponse } from '../../../shared/types';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  visualData?: LLMResponse;
  thinkingSteps?: ReActStep[];
  timestamp: Date;
};

type Chat = {
  id: string;
  title: string;
  updatedAt: Date;
};

export function ChatPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { isStreaming, thinkingSteps, startStream, reset } = useStream();

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/chat/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setApiError(await readApiError(res, 'Unable to load chats.'));
        return;
      }
      setApiError(null);
      const data = await res.json();
      setChats(data.map((c: any) => ({
        id: c.id,
        title: c.title || 'New Chat',
        updatedAt: fromUnixish(c.updated_at)
      })));
    } catch (err) {
      console.error('Failed to load chats:', err);
      setApiError('The worker API is unavailable. Start the worker on port 8787 and verify worker/.dev.vars contains real secrets.');
    }
  }, [getToken]);

  // Load messages when chat is selected
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }
    loadMessages(activeChat);
  }, [activeChat]);

  const loadMessages = useCallback(async (chatId: string) => {
    const token = await getToken();
    if (!token) return;
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/chat/${chatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setApiError(await readApiError(res, 'Unable to load chat messages.'));
        return;
      }
      setApiError(null);
      const data = await res.json();
      const parsed: Message[] = data.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        text: msg.text,
        visualData: msg.render_type !== 'none' && msg.code ? {
          text: msg.text,
          renderType: msg.render_type,
          componentName: msg.component_name,
          props: msg.component_props ? JSON.parse(msg.component_props) : undefined,
          code: msg.code
        } : undefined,
        thinkingSteps: [],
        timestamp: fromUnixish(msg.created_at)
      }));
      setMessages(parsed);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setApiError('The worker API is unavailable. Start the worker on port 8787 and verify worker/.dev.vars contains real secrets.');
    }
    setIsLoadingMessages(false);
  }, [getToken]);

  const saveMessage = useCallback(async (chatId: string, role: string, text: string, visualData?: LLMResponse) => {
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/chat/save-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        chatId,
        role,
        text,
        renderType: visualData?.renderType || 'none',
        componentName: visualData?.componentName,
        componentProps: visualData?.props,
        code: visualData?.code
      })
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, 'Unable to save the message.'));
    }
  }, [getToken]);

  const handleSend = async (message: string) => {
    const token = await getToken();
    if (!token) return;
    setApiError(null);

    let chatId = activeChat;

    // If no active chat, create one
    if (!chatId) {
      const res = await fetch('/api/chat/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: message.slice(0, 50) })
      });
      if (res.ok) {
        const data = await res.json();
        chatId = data.id;
        setActiveChat(chatId);
        await loadChats();
      } else {
        setApiError(await readApiError(res, 'Unable to create a new chat.'));
        return;
      }
    }

    if (!chatId) return;

    // Save user message
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    try {
      await saveMessage(chatId, 'user', message);
    } catch (error) {
      setApiError((error as Error).message);
      return;
    }

    // Build chat history for context
    const history = messages.map(m => ({ role: m.role, content: m.text }));
    history.push({ role: 'user', content: message });

    // Start streaming
    const response = await startStream(message, chatId, history, token);

    // Save assistant response
    if (response && chatId) {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.text,
        visualData: response,
        thinkingSteps: [...thinkingSteps],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      try {
        await saveMessage(chatId, 'assistant', response.text, response);
      } catch (error) {
        setApiError((error as Error).message);
      }
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setMessages([]);
    reset();
  };

  const handleSelectChat = (id: string) => {
    setActiveChat(id);
    reset();
  };

  return (
    <div className="flex h-full min-h-0 bg-[#ede7dc]">
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatWindow messages={messages} errorMessage={apiError} />
        <InputBar onSend={handleSend} isLoading={isStreaming || isLoadingMessages} />
      </div>
    </div>
  );
}

async function readApiError(response: Response, fallback: string) {
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string' && payload.error.trim()) {
      return payload.error;
    }
  } catch {}

  try {
    const text = await response.text();
    if (text.trim()) return text;
  } catch {}

  return fallback;
}
