import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/chat', label: 'Chat' },
  { path: '/kb', label: 'Knowledge Base' },
  { path: '/artifacts', label: 'Artifacts' },
  { path: '/registry', label: 'Registry' },
  { path: '/settings', label: 'Settings' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-56 bg-neutral-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-neutral-800">
        <h1 className="text-lg font-bold">VisualMind</h1>
      </div>
      <nav className="flex-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block px-3 py-2 rounded-lg mb-1 text-sm transition-colors ${
              location.pathname === item.path ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
