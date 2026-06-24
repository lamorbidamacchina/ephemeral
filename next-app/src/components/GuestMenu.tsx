'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';

export default function GuestMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-zinc-400 hover:text-zinc-200 transition p-1"
        title="More options"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl overflow-hidden min-w-[180px]">
            <Link href="/about" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
              About
            </Link>
            <Link href="/faq" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
              FAQ
            </Link>
            <Link href="/terms" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
              Terms of Service
            </Link>
            <Link href="/privacy" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm text-zinc-200 hover:bg-zinc-800 transition">
              Privacy Policy
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
