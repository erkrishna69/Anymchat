'use client';

import React from 'react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#080B10] text-[#F0F4F8] h-[100dvh] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-semibold text-white mb-2">AnymChat Service Error</h2>
          <p className="text-xs text-[#8B98A5] mb-4">A critical error occurred while loading the application.</p>
          <button
            onClick={() => reset()}
            className="py-2.5 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Refresh App
          </button>
        </div>
      </body>
    </html>
  );
}
