import { useState } from 'react';

export function SettingsPage() {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [topK, setTopK] = useState(5);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Retrieval Top-K</label>
          <input
            type="number"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="w-24 border border-neutral-300 rounded-lg px-3 py-2"
            min={1}
            max={20}
          />
          <p className="text-xs text-neutral-400 mt-1">Number of document chunks to retrieve per query</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-64 border border-neutral-300 rounded-lg px-3 py-2 font-mono text-sm"
            placeholder="Customize the system prompt..."
          />
          <p className="text-xs text-neutral-400 mt-1">
            Override the default system prompt.
          </p>
        </div>
      </div>
    </div>
  );
}
