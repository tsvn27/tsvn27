import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Layout from "@/components/Layout";
import AuthProvider from "@/components/AuthProvider";
import { CartProvider } from "@/contexts/CartContext"; // Importa o CartProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NomeDoServiço - Autenticação e Planos",
  description: "Plataforma de autenticação e gerenciamento de planos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CartProvider> {/* CartProvider envolve o Layout, dentro do AuthProvider */}
            <Layout>{children}</Layout>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
