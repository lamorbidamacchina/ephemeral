'use client';

import { CryptoProvider } from '@/lib/crypto-context';
import { SocketProvider } from '@/lib/socket-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CryptoProvider>
      <SocketProvider>{children}</SocketProvider>
    </CryptoProvider>
  );
}
