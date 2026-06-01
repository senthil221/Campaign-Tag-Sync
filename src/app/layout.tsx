import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Smartlead Sender Sync",
  description: "Sync email account tags to campaigns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%', overflow: 'hidden' }}>
      <body style={{ height: '100%', overflow: 'hidden', margin: 0 }}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface-2)',
              border: '1px solid var(--border-bright)',
              color: 'var(--text)',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
