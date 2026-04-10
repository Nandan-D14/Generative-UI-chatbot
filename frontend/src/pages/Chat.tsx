import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { InputBar } from '../components/chat/InputBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { deleteChat } from '../lib/api';
import { useStream } from '../hooks/useStream';
import { fromUnixish } from '../lib/time';
import { useSidebar } from '../contexts/SidebarContext';
import type { LLMResponse, ReActStep } from '../../../shared/types';

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
  const { setSidebarSlot } = useSidebar();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset } = useStream();

  const handleNewChat = useCallback(() => {
    setActiveChat(null);
    setMessages([]);
    reset();
  }, [reset]);

  const handleSelectChat = useCallback((id: string) => {
    setActiveChat(id);
    reset();
  }, [reset]);

  const handleDeleteChat = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const token = await getToken();
      if (!token) return;
      await deleteChat(id, token);
      setChats(prev => prev.filter(c => c.id !== id));
      if (activeChat === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  }, [activeChat, handleNewChat, getToken]);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, []);

  // Update sidebar slot with the chat list
  useEffect(() => {
    setSidebarSlot(
      <ChatSidebar
        chats={chats}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
    );
    return () => setSidebarSlot(null);
  }, [chats, activeChat, handleSelectChat, handleNewChat, handleDeleteChat, setSidebarSlot]);

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
        thinkingSteps: parseThinkingSteps(msg.thinking_steps),
        timestamp: fromUnixish(msg.created_at)
      }));
      setMessages(parsed);
    } catch (err) {
      console.error('Failed to load messages:', err);
      setApiError('The worker API is unavailable. Start the worker on port 8787 and verify worker/.dev.vars contains real secrets.');
    }
    setIsLoadingMessages(false);
  }, [getToken]);

  const saveMessage = useCallback(async (
    chatId: string,
    role: string,
    text: string,
    visualData?: LLMResponse,
    thinkingSteps?: ReActStep[]
  ) => {
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
        code: visualData?.code,
        thinkingSteps
      })
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, 'Unable to save the message.'));
    }
  }, [getToken]);

  const handleSend = async (message: string, options: { useWebSearch: boolean }) => {
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
    const streamResult = await startStream(message, chatId, history, token, options);

    // Save assistant response
    if (streamResult?.response && chatId) {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: streamResult.response.text,
        visualData: streamResult.response,
        thinkingSteps: streamResult.steps,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
      try {
        await saveMessage(
          chatId,
          'assistant',
          streamResult.response.text,
          streamResult.response,
          streamResult.steps
        );
      } catch (error) {
        setApiError((error as Error).message);
      }
    }
  };

  const pendingAssistantMessage: Message | null = isStreaming
    ? {
        id: '__pending__',
        role: 'assistant',
        text: currentText,
        visualData: completeResponse ?? undefined,
        thinkingSteps: [...thinkingSteps],
        timestamp: new Date()
      }
    : null;

  const displayMessages = pendingAssistantMessage
    ? [...messages, pendingAssistantMessage]
    : messages;

  return (
    <div className="flex h-full min-h-0 bg-neutral-50/50 dark:bg-neutral-900/50 transition-colors duration-300">
      <div className="flex min-w-0 flex-1 flex-col h-full bg-white dark:bg-neutral-900 ml-2 mt-2 mr-2 rounded-tl-2xl rounded-tr-2xl border border-neutral-200/50 dark:border-neutral-800 shadow-sm overflow-hidden transition-colors duration-300">
        <ChatWindow messages={displayMessages} errorMessage={apiError} />
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

function parseThinkingSteps(raw: unknown): ReActStep[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isReActStep);
  } catch {
    return [];
  }
}

function isReActStep(value: unknown): value is ReActStep {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ReActStep).id === 'string' &&
    typeof (value as ReActStep).thought === 'string' &&
    typeof (value as ReActStep).action === 'string' &&
    typeof (value as ReActStep).actionInput === 'string' &&
    (
      (value as ReActStep).status === 'running' ||
      (value as ReActStep).status === 'completed' ||
      (value as ReActStep).status === 'error'
    )
  );
}
