'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>
        <p className="text-sm font-semibold text-white flex-1">Privacy Policy</p>
      </header>

      <div className="flex-1 px-5 py-8 space-y-8 pb-16">

        <section className="space-y-2">
          <p className="text-xs text-zinc-500">Last updated: May 2026</p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            This policy explains what data Ephemeral collects, why, and what happens to it. We have tried to keep it short and honest.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Who is responsible</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The data controller for Ephemeral is{' '}
            <span className="text-zinc-300">{process.env.NEXT_PUBLIC_OWNER_NAME}</span>, reachable at{' '}
            <span className="text-zinc-300">{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</span>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">What we collect</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            To provide the service, we store a minimum set of data:
          </p>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed list-none">
            <li className="pl-3 border-l border-zinc-700">Your email address and a hashed version of your password, used to identify your account.</li>
            <li className="pl-3 border-l border-zinc-700">A record of which conversations you have started (who you have exchanged messages with).</li>
            <li className="pl-3 border-l border-zinc-700">Your public encryption key, used to encrypt messages sent to you. Your private key never leaves your device.</li>
            <li className="pl-3 border-l border-zinc-700">When a message cannot be delivered instantly (because the recipient is offline), the encrypted message is held temporarily — for up to 48 hours — and deleted once delivered or expired.</li>
          </ul>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We do not store message content in readable form. We do not track your activity, behaviour, or usage patterns.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Why we collect it</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            All data listed above is collected solely to provide the messaging service. The legal basis is the performance of the contract between you and us (Art. 6(1)(b) GDPR).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Who we share it with</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We use two external services to operate Ephemeral:
          </p>
          <ul className="space-y-2 text-sm text-zinc-400 leading-relaxed list-none">
            <li className="pl-3 border-l border-zinc-700"><span className="text-zinc-300">Fly.io</span> — hosts the application and database. Servers are located in Frankfurt, Germany. Fly.io is a US-registered company and may be subject to US law.</li>
            <li className="pl-3 border-l border-zinc-700"><span className="text-zinc-300">Mailjet</span> — sends account verification and password reset emails. Mailjet is an EU-based provider and processes only your email address for this purpose.</li>
          </ul>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We do not sell, share, or otherwise disclose your data to any other party.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">How long we keep it</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Your data is kept for as long as your account exists. Deleting your account permanently removes all data we hold about you — your profile, your conversation records, and any messages waiting to be delivered.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Standard infrastructure logs (IP addresses, connection timestamps) may be retained briefly by Fly.io as part of normal operations. These are outside our direct control.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Your rights</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Under GDPR you have the right to access, correct, or delete your data, and to object to or restrict its processing. You can delete all data we hold about you directly from the app via Profile → Delete account.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            For any other request, contact us at{' '}
            <span className="text-zinc-300">{process.env.NEXT_PUBLIC_CONTACT_EMAIL}</span>. You also have the right to lodge a complaint with your local data protection authority.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Changes</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If we change this policy in a meaningful way, we will update the date at the top of this page. Continued use of the app after changes are posted constitutes acceptance.
          </p>
        </section>

      </div>
    </div>
  );
}
