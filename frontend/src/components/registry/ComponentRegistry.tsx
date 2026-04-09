type Component = {
  id: string;
  name: string;
  description: string;
  render_type: 'html' | 'react';
  use_count: number;
  created_at: number;
};

type Props = {
  components: Component[];
  isLoading: boolean;
  onDelete: (name: string) => void;
  onTest: (component: Component) => void;
};

export function ComponentRegistry({ components, isLoading, onDelete, onTest }: Props) {
  return (
    <div>
      {isLoading ? (
        <p className="text-center text-neutral-400 py-8">Loading...</p>
      ) : components.length === 0 ? (
        <p className="text-center text-neutral-400 py-8">
          No components in registry yet. Components are saved when VisualMind generates new UI patterns.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200">
            <tr>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Name</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Description</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Type</th>
              <th className="text-left py-3 px-4 text-neutral-500 font-medium">Uses</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => (
              <tr key={comp.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-3 px-4 font-medium">{comp.name}</td>
                <td className="py-3 px-4 text-neutral-500 truncate max-w-xs">{comp.description}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${comp.render_type === 'react' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {comp.render_type}
                  </span>
                </td>
                <td className="py-3 px-4 text-neutral-500">{comp.use_count}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button onClick={() => onTest(comp)} className="text-xs text-blue-600 hover:text-blue-800">Test</button>
                    <button onClick={() => onDelete(comp.name)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
