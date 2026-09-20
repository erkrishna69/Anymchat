'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { RotateCw, Home } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error without crashing
    console.error('AnymChat Client Error Boundary Caught:', error);
  }, [error]);

  return (
    <div className="h-[100dvh] w-full bg-[#080B10] text-[#F0F4F8] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <div className="relative w-14 h-14 mb-5">
          <Image
            src="/logo.png"
            alt="AnymChat"
            fill
            className="object-contain opacity-80"
          />
        </div>

        <h2 className="text-xl font-bold tracking-tight text-white mb-2">Something went wrong</h2>
        <p className="text-xs text-[#8B98A5] mb-6 leading-relaxed">
          An unexpected navigation or rendering error occurred. Your session and messages remain safe.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            onClick={() => reset()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20"
          >
            <RotateCw size={15} />
            Try Again
          </button>
          <a
            href="/app"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#151C28] hover:bg-[#1C2536] active:scale-[0.98] text-[#8B98A5] hover:text-white text-xs font-medium transition-all border border-white/5"
          >
            <Home size={15} />
            Reload App
          </a>
        </div>
      </div>
    </div>
  );
}
