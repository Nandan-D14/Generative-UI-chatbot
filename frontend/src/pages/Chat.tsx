import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { InputBar } from '../components/chat/InputBar';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { useStream } from '../hooks/useStream';

export function ChatPage() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const { isStreaming, currentText, thinkingSteps, completeResponse, startStream, reset } = useStream();

  const handleSend = async (message: string) => {
    const token = await getToken();
    if (!token) return;

    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, text: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const response = await startStream(message, activeChat || '', []);

    if (response) {
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        text: response.text,
        visualData: response,
        thinkingSteps: [...thinkingSteps],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    }
  };

  const handleNewChat = () => { setActiveChat(null); setMessages([]); reset(); };

  return (
    <div className="flex h-screen">
      <ChatSidebar chats={chats} activeChat={activeChat} onSelectChat={setActiveChat} onNewChat={handleNewChat} />
      <div className="flex-1 flex flex-col">
        <ChatWindow messages={messages} />
        <InputBar onSend={handleSend} isLoading={isStreaming} />
      </div>
    </div>
  );
}
