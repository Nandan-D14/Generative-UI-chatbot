import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Sidebar } from './components/shared/Sidebar';
import { TopBar } from './components/shared/TopBar';
import { ChatPage } from './pages/Chat';
import { KnowledgeBasePage } from './pages/KnowledgeBase';
import { ArtifactsPage } from './pages/Artifacts';
import { RegistryPage } from './pages/Registry';
import { SettingsPage } from './pages/Settings';

export default function App() {
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
