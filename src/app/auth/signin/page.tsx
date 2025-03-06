"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { GoogleButton } from "@/app/_components/auth/GoogleButton";

export default function SignIn() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <Link href="/" className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          <h1>
            <span className="text-[hsl(280,100%,70%)]">T3</span> App
          </h1>
        </Link>
        
        <div className="flex flex-col items-center justify-center gap-6 rounded-xl bg-white/10 p-8 backdrop-blur-sm">
          <h2 className="text-3xl font-bold">Iniciar sesión</h2>
          
          <GoogleButton callbackUrl={callbackUrl} />
          
          <div className="text-sm text-gray-300">
            Al iniciar sesión, aceptas nuestros{" "}
            <Link href="/terms" className="text-[hsl(280,100%,70%)] hover:underline">
              Términos de servicio
            </Link>{" "}
            y{" "}
            <Link href="/privacy" className="text-[hsl(280,100%,70%)] hover:underline">
              Política de privacidad
            </Link>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-300">
          <p>
            ¿Necesitas ayuda?{" "}
            <Link href="/contact" className="text-[hsl(280,100%,70%)] hover:underline">
              Contáctanos
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
} 