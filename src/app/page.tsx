import Link from "next/link";

import { auth, signOut } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";

export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            <span className="text-[hsl(280,100%,70%)]">ListUp</span> App
          </h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="/url"
            >
              <h3 className="text-2xl font-bold">URL Scraper →</h3>
              <div className="text-lg">
                Extrae información de propiedades inmobiliarias a partir de URLs y guárdalas en tu base de datos.
              </div>
            </Link>
            <Link
              className="flex max-w-xs flex-col gap-4 rounded-xl bg-white/10 p-4 hover:bg-white/20"
              href="/setup"
            >
              <h3 className="text-2xl font-bold">Configuración →</h3>
              <div className="text-lg">
                Configura tu base de datos de Supabase para habilitar todas las funcionalidades de la aplicación.
              </div>
            </Link>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-2xl text-white">
              {hello ? hello.greeting : "Loading tRPC query..."}
            </p>

            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-2xl text-white">
                {session && <span>Logged in as {session.user?.name}</span>}
              </p>
              {session ? (
                <form
                  action={async () => {
                    "use server";
                    await signOut();
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                  >
                    Cerrar sesión
                  </button>
                </form>
              ) : (
                <Link
                  href="/auth/signin"
                  className="rounded-lg bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
