import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Smartlead Sender Sync",
  description: "Sync email account tags to campaigns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
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
