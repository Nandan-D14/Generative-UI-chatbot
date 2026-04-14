import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Sidebar } from './components/shared/Sidebar';
import { TopBar } from './components/shared/TopBar';
import { ChatPage } from './pages/Chat';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { ArtifactsPage } from './pages/Artifacts';
import { RegistryPage } from './pages/Registry';
import { SettingsPage } from './pages/Settings';
import { CustomSignIn } from './components/auth/CustomSignIn';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

function SetupScreen() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">VisualMind</h1>
        <p className="text-neutral-500 mb-6">Complete setup to get started.</p>

        <div className="space-y-4">
          <Step num={1} title="Clerk Auth" detail="Create a Clerk project at clerk.com and add VITE_CLERK_PUBLISHABLE_KEY to frontend/.env" />
          <Step num={2} title="Cloudflare D1" detail="Run: wrangler d1 create visualmind" />
          <Step num={3} title="Cloudflare Vectorize" detail="Run: wrangler vectorize create visualmind-kb --dimensions=2048 --metric=cosine" />
          <Step num={4} title="Cloudflare R2" detail="Run: wrangler r2 bucket create visualmind-storage" />
          <Step num={5} title="Worker Secrets" detail="Create worker/.dev.vars from worker/.dev.vars.example for local dev. Use Wrangler secrets for deploy." />
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, detail }: { num: number; title: string; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-neutral-200 text-neutral-500">
        {num}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

export default function App() {
  if (!publishableKey) return <SetupScreen />;

  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Not signed in? Show sign-in page
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <CustomSignIn />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <Routes>
          <Route path="/chat" element={<AppLayout><ChatPage /></AppLayout>} />
          <Route path="/kb" element={<AppLayout><KnowledgeBasePage /></AppLayout>} />
          <Route path="/artifacts" element={<AppLayout><ArtifactsPage /></AppLayout>} />
          <Route path="/registry" element={<AppLayout><RegistryPage /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </SidebarProvider>
    </ThemeProvider>
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarOpen } = useSidebar();

  return (
    <div className="flex h-screen bg-neutral-50">
      {isSidebarOpen && <Sidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
