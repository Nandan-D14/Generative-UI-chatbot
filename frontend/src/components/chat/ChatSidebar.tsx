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
    <div className="flex w-72 flex-col border-r border-neutral-200 bg-neutral-50/50">
      <div className="px-4 py-4">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </span>
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        <div className="space-y-0.5">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`group flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-left transition-colors ${
                activeChat === chat.id
                  ? 'bg-white shadow-sm ring-1 ring-neutral-200 text-neutral-900'
                  : 'text-neutral-600 hover:bg-neutral-200/50 hover:text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium leading-none">{chat.title}</p>
              </div>
              <p className={`text-[11px] font-medium ${activeChat === chat.id ? 'text-neutral-500' : 'text-neutral-400 group-hover:text-neutral-500'}`}>
                {chat.updatedAt.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
