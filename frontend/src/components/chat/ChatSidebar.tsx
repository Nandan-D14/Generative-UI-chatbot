type Chat = {
  id: string;
  title: string;
  updatedAt: Date;
};

type Props = {
  chats: Chat[];
  activeChat: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
};

export function ChatSidebar({ chats, activeChat, onSelectChat, onNewChat }: Props) {
  return (
    <div className="w-64 border-r border-neutral-200 bg-white flex flex-col">
      <div className="p-4 border-b border-neutral-100">
        <button onClick={onNewChat} className="w-full py-2 px-4 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full text-left px-4 py-3 hover:bg-neutral-100 transition-colors ${activeChat === chat.id ? 'bg-neutral-100' : ''}`}
          >
            <p className="truncate text-sm font-medium">{chat.title}</p>
            <p className="text-xs text-neutral-400 mt-1">{chat.updatedAt.toLocaleDateString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
