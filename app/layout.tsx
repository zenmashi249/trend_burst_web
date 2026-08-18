import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TQQQ Trend_burst",
  description: "TQQQ 厳格モード バックテスト & 現在シグナル",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
