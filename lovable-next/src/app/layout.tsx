import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BackgroundContainer } from "@/components/layout/BackgroundContainer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeyWe Pay | Swap & Pay on Stellar",
  description:
    "Seamlessly swap and pay using Stellar Network. Experience the future of fintech with KeyWe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <Providers>
          <BackgroundContainer>
            <Navbar />
            <div className="pt-24 min-h-[calc(100vh-80px)]">{children}</div>
            <Footer />
          </BackgroundContainer>
        </Providers>
      </body>
    </html>
  );
}
