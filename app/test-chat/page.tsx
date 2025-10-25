'use client';

import { useEffect, useState } from 'react';

export default function TestChat() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8" suppressHydrationWarning={true}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Test Chat - No Hydration Issues</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p>This is a minimal test page to check for hydration issues.</p>
          <p>Current time: {new Date().toLocaleTimeString()}</p>
          <button className="bg-red-500 text-white px-4 py-2 rounded mt-4">
            Red Button (Test)
          </button>
        </div>
      </div>
    </div>
  );
}
