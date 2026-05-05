import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Modern Web App",
  description: "A dynamic Next.js application built with Tailwind CSS and NextAuth",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <ToastProvider>
          <header className="bg-indigo-900 text-white shadow-md sticky top-0 z-50">
            <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
              <div className="font-bold text-lg tracking-tight">Roster<span className="text-indigo-400">Pro</span></div>
              <nav className="flex items-center gap-6 text-sm font-medium">
                <a href="/" className="hover:text-indigo-200 transition-colors">Tryout Events</a>
                <a href="/final-selection" className="hover:text-indigo-200 transition-colors">Final Selection</a>
                <a href="/print" className="hover:text-indigo-200 transition-colors">Print Sheets</a>
                <a href="/rankings" className="hover:text-indigo-200 transition-colors">Rankings</a>
              </nav>
            </div>
          </header>
          <main className="flex min-h-[calc(100vh-56px)] flex-col bg-gray-50/30">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
