'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-[100dvh] w-full bg-[#080B10] text-[#F0F4F8] flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(99,102,241,0.08),transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <div className="relative w-16 h-16 mb-6">
          <Image
            src="/logo.png"
            alt="AnymChat"
            fill
            className="object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]"
          />
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-white mb-2">404</h1>
        <p className="text-sm font-medium text-[#8B98A5] mb-6">
          The chat room or page you are looking for does not exist or has expired.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href="/app"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20"
          >
            <MessageSquare size={16} />
            Back to AnymChat
          </Link>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-[#151C28] hover:bg-[#1C2536] active:scale-[0.98] text-[#8B98A5] hover:text-white text-sm font-medium transition-all border border-white/5"
          >
            <ArrowLeft size={16} />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
