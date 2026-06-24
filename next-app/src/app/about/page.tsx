'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>
        <p className="text-sm font-semibold text-white flex-1">About</p>
      </header>

      <div className="flex-1 px-5 py-8 space-y-8">

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">What is Ephemeral?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral is a messaging app built around one idea: conversations that leave no trace.
            Messages are encrypted on your device and disappear 60 seconds after being read. When both people are online, they pass through our server without ever being written to disk.
          </p>
        </section>

        <section className="space-y-3">
          <div className="rounded-xl bg-emerald-950/50 border border-emerald-800/40 px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-emerald-400">The safest way to use Ephemeral</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Think of it like a walkie-talkie: both you and the other person have the app open at the same time.
              When that happens, your message goes directly from your device to theirs — it is never written anywhere, not even temporarily.
              It exists only for the seconds it takes to travel between you.
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              For anything truly sensitive, this is the mode we recommend.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">When the other person is offline</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            If the recipient is not currently online, Ephemeral can still deliver your message — it will be held until they open the app, for up to 48 hours.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            To make this possible, your message needs to be stored somewhere temporarily.
            We do everything we can to keep it private and secure, but this introduces a step that the walkie-talkie mode does not have.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            For information that is extremely private, we recommend waiting until you are both online.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">What we store</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            To keep the app running, we store a minimum set of metadata: your email address, a list of who you have conversations with, and — when a message could not be delivered instantly — the encrypted message itself, held temporarily until the recipient comes online.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            We never store message content in readable form. We do not store when you sent a message, what you said, or how often you write.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            <span className="text-zinc-300">Deleting your account removes all of this immediately</span> — your profile, your conversations, and any messages waiting to be delivered.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Standard infrastructure logs (connection timestamps, IP addresses) may be retained briefly by our hosting provider. These are outside our direct control and are not linked to your account or message content.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Why not just use WhatsApp's disappearing messages?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Most messaging apps offer a "disappearing messages" mode as an opt-in feature layered on top of a platform that was built to store everything. The messages still pass through their servers, may be included in cloud backups, and the feature can be turned off at any time.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral is different: ephemerality is not a setting — it is the only mode the app has. Every message is encrypted before it leaves your device, and the server never sees plaintext. Messages are held for the minimum time technically necessary and no longer. There is no chat history, no archive, no backup. There is nothing to hand over, because there is nothing to keep.
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral also does not require a phone number or SIM card. An email address — even a temporary one — is all you need to create an account and start communicating.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">Where we stand</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Ephemeral is built in the EU and hosted in Europe. We do not sell data, show ads, or build profiles.
            The app has no interest in knowing what you talk about — and by design, it cannot.
          </p>
        </section>


      </div>

    </div>
  );
}
