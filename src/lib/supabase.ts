import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

// Crear el cliente de Supabase
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Función para subir una imagen a un bucket de Supabase
export async function uploadImage(
  bucketName: string,
  filePath: string,
  fileContent: Buffer | Blob | File,
  contentType: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileContent, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      path: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error('Error al subir imagen a Supabase:', error);
    return {
      success: false,
      error: 'Error al subir imagen a Supabase',
    };
  }
}

// Función para guardar los datos de una propiedad en la base de datos
export async function saveScrapedData(
  tableName: string,
  data: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { data: insertedData, error } = await supabase
      .from(tableName)
      .insert([data])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      id: insertedData?.[0]?.id,
    };
  } catch (error) {
    console.error('Error al guardar datos en Supabase:', error);
    return {
      success: false,
      error: 'Error al guardar datos en Supabase',
    };
  }
} 