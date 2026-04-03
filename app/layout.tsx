import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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
    <html lang="zh-CN" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen antialiased [font-family:'PingFang_SC','Hiragino_Sans_GB','Microsoft_YaHei','Noto_Sans_CJK_SC',system-ui,sans-serif]">
        {children}
      </body>
    </html>
  );
}
