import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/scrapers';
import { z } from 'zod';
import { auth } from '@/server/auth';

// Esquema de validación para las solicitudes
const scrapeRequestSchema = z.object({
  url: z.string().url('La URL no es válida')
});

export async function POST(req: NextRequest) {
  try {
    // Obtener el usuario autenticado
    const session = await auth();
    // Usar una verificación más completa
    let userId: string | undefined = undefined;
    if (session && session.user && typeof session.user.id === 'string') {
      userId = session.user.id;
    }
    
    // Validar el cuerpo de la solicitud
    const validation = scrapeRequestSchema.safeParse(await req.json());
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error?.errors[0]?.message || 'Error de validación' },
        { status: 400 }
      );
    }
    
    const { url } = validation.data;
    
    // Ejecutar el scraper
    const result = await scrapeUrl(url, userId);
    
    // Devolver los resultados
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en API de scraping:', error);
    
    return NextResponse.json(
      { error: `Error interno: ${(error as Error).message}` },
      { status: 500 }
    );
  }
} 