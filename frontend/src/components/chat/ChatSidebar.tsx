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
    <div className="flex w-72 flex-col border-r border-stone-200/80 bg-[linear-gradient(180deg,rgba(247,243,235,0.96),rgba(242,237,228,0.88))] backdrop-blur">
      <div className="border-b border-stone-200/80 px-5 pb-5 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">Chat workspace</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900">Conversations</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Jump across prompts, visuals, and saved reasoning without leaving the chat flow.
        </p>
        <button
          onClick={onNewChat}
          className="mt-5 w-full rounded-2xl bg-[linear-gradient(135deg,#111827_0%,#334155_100%)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition-transform duration-150 hover:-translate-y-0.5"
        >
          + New Chat
        </button>
      </div>
      <div className="px-5 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        Recent
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4 pt-3">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full rounded-[22px] border px-4 py-4 text-left transition-all ${
              activeChat === chat.id
                ? 'border-stone-300 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
                : 'border-transparent bg-transparent hover:border-stone-200 hover:bg-white/70'
            }`}
          >
            <p className="truncate text-sm font-semibold text-neutral-900">{chat.title}</p>
            <p className="mt-2 text-xs text-neutral-400">{chat.updatedAt.toLocaleDateString()}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
