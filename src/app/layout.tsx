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
      <body style={{ height: '100%', overflow: 'hidden' }}>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1C2130',
              border: '1px solid #2E3647',
              color: '#E6EAF2',
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              borderRadius: '10px',
            },
          }}
        />
      </body>
    </html>
  );
}
