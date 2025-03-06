import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Autenticación | T3 App",
  description: "Inicia sesión en tu cuenta de T3 App",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={GeistSans.className}>
      {children}
    </div>
  );
} 