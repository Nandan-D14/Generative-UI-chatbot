import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Sidebar } from './components/shared/Sidebar';
import { TopBar } from './components/shared/TopBar';
import { ChatPage } from './pages/Chat';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { ArtifactsPage } from './pages/Artifacts';
import { RegistryPage } from './pages/Registry';
import { SettingsPage } from './pages/Settings';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

function SetupScreen() {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold mb-2">VisualMind</h1>
        <p className="text-neutral-500 mb-6">Complete setup to get started.</p>

        <div className="space-y-4">
          <Step num={1} title="Clerk Auth" done={false} detail="Create a Clerk project at clerk.com and add VITE_CLERK_PUBLISHABLE_KEY to frontend/.env" />
          <Step num={2} title="Cloudflare D1" done={false} detail="Run: wrangler d1 create visualmind" />
          <Step num={3} title="Cloudflare Vectorize" done={false} detail="Run: wrangler vectorize create visualmind-kb --dimensions=1536 --metric=cosine" />
          <Step num={4} title="Cloudflare R2" done={false} detail="Run: wrangler r2 bucket create visualmind-storage" />
          <Step num={5} title="API Keys" done={false} detail="Add LLM_API_KEY and SEARCH_API_KEY to worker/wrangler.toml" />
        </div>
      </div>
    </div>
  );
}

function Step({ num, title, done, detail }: { num: number; title: string; done: boolean; detail: string }) {
  return (
    <div className="flex gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? 'bg-green-500 text-white' : 'bg-neutral-200 text-neutral-500'}`}>
        {done ? '✓' : num}
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

  return (
    <>
      <SignedIn>
        <div className="flex h-screen bg-neutral-50">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/kb" element={<KnowledgeBasePage />} />
                <Route path="/artifacts" element={<ArtifactsPage />} />
                <Route path="/registry" element={<RegistryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<Navigate to="/chat" replace />} />
              </Routes>
            </main>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
