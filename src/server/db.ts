import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Tipo para los datos de propiedad a guardar
export type PropertyData = {
  descripcion: string;
  caracteristicas: Record<string, string>;
  resumen: string;
  imagenes: string[];
  stored_images: string[];
  precio_mxn: string;
  precio_usd: string;
  ubicacion: string;
  url: string;
};

// Función para guardar datos de propiedad mediante Prisma
export async function savePropertyData(
  data: PropertyData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Intentar crear el registro usando Prisma
    // En el cliente de Prisma, los modelos se acceden con la primera letra en minúscula
    const result = await db.Property.create({
      data: {
        descripcion: data.descripcion,
        caracteristicas: data.caracteristicas,
        resumen: data.resumen,
        imagenes: data.imagenes,
        stored_images: data.stored_images,
        precio_mxn: data.precio_mxn,
        precio_usd: data.precio_usd,
        ubicacion: data.ubicacion,
        url: data.url,
      },
    });

    return {
      success: true,
      id: result.id,
    };
  } catch (error) {
    console.error('Error al guardar datos mediante Prisma:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: errorMessage,
    };
  }
}
