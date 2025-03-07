import { UrlScraper } from '../_components/UrlScraper';
import Link from 'next/link';

export const metadata = {
  title: 'URL Scraper | ListUp',
  description: 'Herramienta para extraer información de propiedades inmobiliarias a partir de URLs',
};

export default function UrlScraperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1219] via-[#111827] to-[#0d1117] text-white">
      <div className="container mx-auto py-10 px-4">
        <header className="mb-10 text-center">
          <div className="flex justify-center items-center mb-4">
            {/* Configuration button removed */}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            URL Scraper
          </h1>
          <p className="mt-3 text-zinc-400 max-w-2xl mx-auto">
            Extrae información detallada de propiedades inmobiliarias a partir de una URL.
            Las imágenes y datos se guardarán automáticamente en la base de datos.
          </p>
        </header>
        
        <main>
          <UrlScraper />
        </main>
      </div>
    </div>
  );
} 