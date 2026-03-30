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
      <body className="min-h-screen antialiased [font-family:'PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei','Noto_Sans_CJK_SC',system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
