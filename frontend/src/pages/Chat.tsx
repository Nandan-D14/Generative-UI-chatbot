import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { InputBar } from '../components/chat/InputBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useStream, ReActStep } from '../hooks/useStream';
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
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset } = useStream();

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = useCallback(async () => {
    const token = await getToken();
    if (!token) return;
    setIsLoadingChats(true);
    try {
      const res = await fetch('/api/chat/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.map((c: any) => ({
          id: c.id,
          title: c.title || 'New Chat',
          updatedAt: new Date(c.updated_at * 1000)
        })));
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
    setIsLoadingChats(false);
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
      if (res.ok) {
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
          timestamp: new Date(msg.created_at * 1000)
        }));
        setMessages(parsed);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
    setIsLoadingMessages(false);
  }, [getToken]);

  const saveMessage = useCallback(async (chatId: string, role: string, text: string, visualData?: LLMResponse) => {
    const token = await getToken();
    if (!token) return;

    await fetch('/api/chat/save-message', {
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
  }, [getToken]);

  const handleSend = async (message: string) => {
    const token = await getToken();
    if (!token) return;

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
        return;
      }
    }

    // Save user message
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    await saveMessage(chatId, 'user', message);

    // Build chat history for context
    const history = messages.map(m => ({ role: m.role, content: m.text }));
    history.push({ role: 'user', content: message });

    // Start streaming
    const response = await startStream(message, chatId, history);

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
      await saveMessage(chatId, 'assistant', response.text, response);
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
    <div className="flex h-screen">
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
      />
      <div className="flex-1 flex flex-col">
        <ChatWindow messages={messages} />
        <InputBar onSend={handleSend} isLoading={isStreaming || isLoadingMessages} />
      </div>
    </div>
  );
}
