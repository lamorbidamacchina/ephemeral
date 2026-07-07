import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: "400",
});

const description =
  "Send messages that leave no trace. End-to-end encrypted, disappear after being read, no phone number required. Open source, hosted in Europe.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://sendephemeral.com"),
  title: {
    default: "Ephemeral — messages that leave no trace",
    template: "%s — Ephemeral",
  },
  description,
  applicationName: "Ephemeral",
  keywords: [
    "ephemeral messaging",
    "encrypted messaging",
    "disappearing messages",
    "private messenger",
    "end-to-end encryption",
    "EU messaging app",
    "GDPR",
    "open source messenger",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    siteName: "Ephemeral",
    title: "Ephemeral — messages that leave no trace",
    description,
    url: "/",
    images: ["/icon-512.png"],
  },
  twitter: {
    card: "summary",
    title: "Ephemeral — messages that leave no trace",
    description,
    images: ["/icon-512.png"],
  },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading headers forces dynamic rendering so Next.js stamps the CSP nonce
  // onto every <script> tag it generates — required for strict-dynamic CSP.
  await headers();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
