import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn } from '@clerk/clerk-react';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
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

  return (
    <SidebarProvider>
      <Routes>
        <Route path="/" element={<AuthLanding />} />
        <Route path="/sign-in/*" element={<AuthLanding />} />
        <Route path="/chat" element={
          <SignedIn>
            <AppLayout>
              <ChatPage />
            </AppLayout>
          </SignedIn>
        } />
        <Route path="/kb" element={
          <SignedIn>
            <AppLayout>
              <KnowledgeBasePage />
            </AppLayout>
          </SignedIn>
        } />
        <Route path="/artifacts" element={
          <SignedIn>
            <AppLayout>
              <ArtifactsPage />
            </AppLayout>
          </SignedIn>
        } />
        <Route path="/registry" element={
          <SignedIn>
            <AppLayout>
              <RegistryPage />
            </AppLayout>
          </SignedIn>
        } />
        <Route path="/settings" element={
          <SignedIn>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </SignedIn>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SidebarProvider>
  );
}

function AuthLanding() {
  return (
    <>
      <SignedIn>
        <Navigate to="/chat" replace />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
          <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/chat" forceRedirectUrl="/chat" />
        </div>
      </SignedOut>
    </>
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
