'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>
        <p className="text-sm font-semibold text-white flex-1">Terms of Service</p>
      </header>

      <div className="flex-1 px-5 py-8 space-y-8 pb-16">

        <section className="space-y-2">
          <p className="text-xs text-zinc-500">Last updated: May 2026</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral is an experimental application, built as a proof of concept. It is provided as-is, with no guarantees of any kind.
            By using it, you accept the terms below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Use at your own risk</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral is an experiment, not a production service. It may be unavailable, slow, or behave unexpectedly at any time.
            We make no guarantees about uptime, reliability, message delivery, or the security of data in transit or at rest.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Do not rely on Ephemeral for anything critical. Do not use it to transmit information whose loss or exposure would cause you harm.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">No warranty</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This application is provided without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            To the fullest extent permitted by law, the developers of Ephemeral shall not be liable for any damages arising from the use or inability to use this service, including loss of data or communications.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Service availability</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We reserve the right to modify, suspend, or shut down Ephemeral at any time, with or without notice. As an experimental project, its future is not guaranteed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Acceptable use</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You agree not to use Ephemeral for any unlawful purpose, to harass or harm others, or to attempt to circumvent or compromise the security of the service or other users.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We reserve the right to terminate accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Changes</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            These terms may change at any time. Continued use of the app after changes are posted constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Contact</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Questions about these terms can be sent to{' '}
            <span className="text-zinc-300">{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</span>.
          </p>
        </section>

      </div>
    </div>
  );
}
