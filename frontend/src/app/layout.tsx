import type { Metadata } from "next";
import "./globals.css";
import { TimeProvider } from "@/contexts/TimeContext";

export const metadata: Metadata = {
  title: "TOTP Manager",
  description: "Manage your TOTP codes locally in one place!",
};

// Applies the stored theme before first paint so dark mode does not flash light.
const themeScript = `
  (function() {
    try {
      if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      console.error('Failed to load dark mode preference:', e);
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <TimeProvider>{children}</TimeProvider>
      </body>
    </html>
  );
}
