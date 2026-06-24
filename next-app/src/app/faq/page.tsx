'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FaqPage() {
  return (
    <div className="min-h-full flex flex-col w-full max-w-sm mx-auto">

      <header className="px-3 py-3 border-b border-zinc-800 flex items-center gap-3 sticky top-0 z-10 bg-zinc-950">
        <Link href="/" className="text-zinc-400 hover:text-zinc-200 transition">
          <ArrowLeft size={20} />
        </Link>
        <p className="text-sm font-semibold text-white flex-1">FAQ</p>
      </header>

      <div className="flex-1 px-5 py-8 space-y-8">

        {/* Getting started */}
        <section className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2">Getting started</p>

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">How do I create an account?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Go to the register page, enter an email address and a password. We'll send you a verification email — click the link and you're in. No phone number, no real name required. A temporary or alias email works fine.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Does Ephemeral work on mobile?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Yes. Ephemeral is a web app — it runs in any browser, including on your phone. Open it in your mobile browser and optionally add it to your home screen for a native-app feel (Safari → Share → Add to Home Screen on iOS; Chrome → Install app on Android). No app store needed.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Do I need to install anything?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                No. Ephemeral runs in the browser. On iOS, push notifications only work when the app is installed to your Home Screen. On Android and desktop it works without any extra steps.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2">How it works</p>

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">How does a message disappear?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Once the recipient opens the message, a 60-second countdown starts. When it reaches zero the message fades out on both screens — permanently. There is no way to extend or disable this timer. That's not a bug; it's the whole point.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">What happens if the other person isn't online when I send?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The message is held securely until they open the app, for up to 48 hours. Once they open the conversation the 60-second timer starts. If 48 hours pass without delivery, the message is deleted and you'll see a notice that it was never delivered.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Can I use Ephemeral on more than one device or browser?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                You can — but each browser and device is treated as a separate identity, so there are a few things to know. Your encryption key is generated on the device and never leaves it, which means it can't be synced. As a result:
              </p>
              <ul className="text-sm text-zinc-400 leading-relaxed space-y-2 pl-4 pt-1">
                <li>— Messages are <span className="text-zinc-300">not synced across devices</span>. A message you read on your laptop won't also appear on your phone.</li>
                <li>— The first time you open Ephemeral in a <span className="text-zinc-300">new browser or device</span>, a fresh key is created. From that moment, that becomes the device that can receive your messages.</li>
                <li>— Any message sent to you <span className="text-zinc-300">while you were offline</span> can only be read on the device that was active when it was sent. If you next come online on a <em>different</em> device, that message can no longer be decrypted — it's dropped, you'll see a "new session" notice, and the sender is told it wasn't delivered. Just ask them to send it again.</li>
                <li>— Clearing your browser data has the same effect as switching devices — it discards the key and starts a new session. Some browsers (notably Safari) also clear it automatically after a period of inactivity.</li>
              </ul>
              <p className="text-sm text-zinc-400 leading-relaxed pt-1">
                In short: for a given contact, stick to one browser on one device when you can. Switching is fine, but anything in flight at that moment may need to be re-sent. Full multi-device support is on the list for a future version.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Can the other person take a screenshot?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Ephemeral can't technically prevent screenshots. If this is a concern, only exchange sensitive information with someone you trust.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Is Ephemeral end-to-end encrypted?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Yes. Messages are encrypted on your device before they're sent. Our server only ever sees encrypted data it cannot read. Your private key never leaves your device.
              </p>
            </div>
          </div>
        </section>

        {/* What it's good for */}
        <section className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2">What it's good for</p>

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">What is Ephemeral good for?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">Sharing things that are sensitive now but don't need to exist tomorrow:</p>
              <ul className="text-sm text-zinc-400 leading-relaxed space-y-1 pl-4">
                <li>— A credit card number or CVV when helping a family member book something</li>
                <li>— A temporary password or PIN for a shared account</li>
                <li>— An API key, <code className="text-zinc-300 bg-zinc-800 px-1 rounded text-xs">.env</code> secret, or SSH credential you need to pass to a developer</li>
                <li>— A Wi-Fi password for a guest</li>
                <li>— Any piece of information that's private enough to matter but not sensitive enough to justify a full secure channel</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Is it good for ongoing conversations?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Not really — that's not what it's for. If you want secure day-to-day messaging, use Signal. Ephemeral is a sharp tool for a specific job: sharing something sensitive with someone you trust, without leaving a trace.
              </p>
            </div>
          </div>
        </section>

        {/* Experimental status */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Experimental service</p>
          <div className="rounded-xl bg-amber-950/40 border border-amber-800/40 px-4 py-4 space-y-2">
            <p className="text-sm font-semibold text-amber-400">You said this is experimental — what does that mean?</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Ephemeral is an independent project built by a solo developer. It is not backed by a security company and has not been independently audited. The cryptographic design follows established best practices (ECDH key agreement + AES-GCM encryption — the same algorithms used by Signal), but "best practices" is not the same as "audited at scale."
            </p>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Use it with that in mind. For anything where the stakes are very high, treat Ephemeral as one layer of protection, not the only one.
            </p>
          </div>
        </section>

        {/* Why not WhatsApp */}
        <section className="space-y-1">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pb-2">Comparisons</p>

          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">WhatsApp has disappearing messages — why not use that?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">A few reasons:</p>
              <ul className="text-sm text-zinc-400 leading-relaxed space-y-3 pl-1">
                <li>
                  <span className="text-zinc-300 font-medium">Not ephemeral by design.</span>{' '}
                  Disappearing messages are an opt-in setting bolted onto a platform built to store and sync everything. Messages can still be included in cloud backups (iCloud, Google Drive) before or after the timer runs. Ephemerality is not the default — it's an afterthought.
                </li>
                <li>
                  <span className="text-zinc-300 font-medium">Meta owns it.</span>{' '}
                  Even if message content is encrypted, metadata — who you talk to, when, how often — is collected and feeds into Meta's advertising infrastructure.
                </li>
                <li>
                  <span className="text-zinc-300 font-medium">Not open source.</span>{' '}
                  You can't inspect what the WhatsApp client actually does. You're taking their word for it. Ephemeral's source is available to read.
                </li>
                <li>
                  <span className="text-zinc-300 font-medium">Requires a phone number.</span>{' '}
                  WhatsApp ties your identity to a SIM-linked mobile number — something not everyone wants or has.
                </li>
              </ul>
              <p className="text-sm text-zinc-400 leading-relaxed pt-1">
                Ephemeral requires only an email address, keeps no permanent chat history, and there is no conversation log to export or restore.
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-semibold text-white">Signal is the gold standard — why not just use that?</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Signal is excellent and we genuinely recommend it for secure day-to-day communication. But a couple of things make it a poor fit in some situations:
              </p>
              <ul className="text-sm text-zinc-400 leading-relaxed space-y-3 pl-1">
                <li>
                  <span className="text-zinc-300 font-medium">It's a native app, not a web app.</span>{' '}
                  Signal requires downloading and installing an app. In some countries or corporate environments app stores are restricted, managed devices block installs, or a colleague simply doesn't want another app on their phone. Ephemeral opens in any browser — nothing to install, nothing to configure. A native app is generally more secure than a web app, but sometimes installing one simply isn't an option.
                </li>
                <li>
                  <span className="text-zinc-300 font-medium">It requires a phone number.</span>{' '}
                  Signal ties your identity to a mobile number. Not everyone has one available, not everyone wants to share one, and in some contexts a SIM card is hard to come by.
                </li>
              </ul>
              <p className="text-sm text-zinc-400 leading-relaxed pt-1">
                Ephemeral is not a Signal replacement — it's a much simpler tool for a much narrower job. If you can use Signal, use Signal. Ephemeral is for the moments when you can't.
              </p>
            </div>
          </div>
        </section>

      </div>

    </div>
  );
}
