import { UserButton } from '@clerk/clerk-react';

export function TopBar() {
  return (
    <div className="h-14 border-b border-neutral-200 bg-white px-6 flex items-center justify-between">
      <div></div>
      <UserButton afterSignOutUrl="/sign-in" />
    </div>
  );
}
