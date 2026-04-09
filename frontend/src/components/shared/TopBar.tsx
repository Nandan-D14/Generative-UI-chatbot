import { UserButton } from '@clerk/clerk-react';
import { useSidebar } from '../../contexts/SidebarContext';

export function TopBar() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <div className="h-14 border-b border-neutral-200 bg-white px-6 flex items-center justify-between">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        <svg
          className="w-5 h-5 text-neutral-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          )}
        </svg>
      </button>
      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
