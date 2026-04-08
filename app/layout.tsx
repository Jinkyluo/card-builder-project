import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "名片制作",
  description: "在线名片编辑",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="relative min-h-screen antialiased">
        <div className="isolate relative flex min-h-svh flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
