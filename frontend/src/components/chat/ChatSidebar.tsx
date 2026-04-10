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
  onDeleteChat?: (id: string) => void;
};

export function ChatSidebar({ chats, activeChat, onSelectChat, onNewChat, onDeleteChat }: Props) {
  return (
    <div className="flex w-full flex-col h-full bg-transparent">
      <div className="px-4 py-2 shrink-0">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium text-white shadow-sm ring-1 ring-inset ring-white/10 hover:bg-white/20 transition-all duration-200"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="tracking-tight">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2 px-2">Recent Chats</div>
        <div className="space-y-0.5">
          {chats.map((chat) => (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => onSelectChat(chat.id)}
                className={`flex w-full flex-col gap-[2px] rounded-lg px-3 py-2.5 text-left transition-all duration-200 pr-8 ${
                  activeChat === chat.id
                    ? 'bg-neutral-800/80 text-white shadow-sm ring-1 ring-white/5'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <p className="truncate text-sm font-medium leading-tight">{chat.title}</p>
                </div>
                <p className={`text-[10px] leading-none ${activeChat === chat.id ? 'text-neutral-400' : 'text-neutral-500 group-hover:text-neutral-400'}`}>
                  {chat.updatedAt.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </p>
              </button>
              {onDeleteChat && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-all group-hover:opacity-100"
                  title="Delete chat"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
