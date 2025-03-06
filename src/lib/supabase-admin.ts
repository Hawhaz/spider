import { createClient } from '@supabase/supabase-js';
import { env } from '../env';
import { randomUUID } from 'crypto';
import path from 'path';

// Cliente Supabase con rol de servicio para operaciones administrativas
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Función para subir una imagen como administrador a un bucket de Supabase
export async function uploadImageAsAdmin(
  bucketName: string,
  filePath: string,
  fileContent: Buffer | Blob | File,
  contentType: string,
  userId?: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    // Si hay un userId y la ruta NO incluye ya al usuario, incluirlo
    let finalFilePath = filePath;
    if (userId && !filePath.includes(`users/${userId}`)) {
      // Extraer el nombre de archivo de la ruta
      const fileName = path.basename(filePath);
      
      // Si la ruta tiene estructura de carpetas, preservarla bajo la carpeta del usuario
      if (path.dirname(filePath) !== '.' && !path.dirname(filePath).includes(`users/${userId}`)) {
        // Mantener la estructura de carpetas existente pero bajo la carpeta del usuario
        const dirName = path.dirname(filePath);
        finalFilePath = `users/${userId}/${dirName}/${fileName}`;
      } else {
        // Simplemente poner el archivo en la carpeta del usuario
        finalFilePath = `users/${userId}/${fileName}`;
      }
      
      console.log(`Reasignando ruta para incluir userId: ${finalFilePath}`);
    }
    
    console.log(`Subiendo imagen a bucket ${bucketName}, ruta: ${finalFilePath}`);
    
    // Agregar metadata del usuario si está disponible
    const options: any = {
      contentType,
      upsert: true
    };
    
    if (userId) {
      options.metadata = { 
        userId,
        uploadedAt: new Date().toISOString()
      };
    }
    
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(finalFilePath, fileContent, options);

    if (error) {
      console.error('Error al subir archivo a Supabase Storage:', error);
      return { success: false, error: error.message || 'Error desconocido de Storage' };
    }

    if (!data) {
      return { success: false, error: 'No se recibió respuesta del servidor de almacenamiento' };
    }

    // Obtener la URL pública del archivo
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(finalFilePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return { success: false, error: 'No se pudo obtener la URL pública del archivo' };
    }

    console.log(`Imagen subida correctamente, URL pública: ${publicUrlData.publicUrl}`);
    return {
      success: true,
      path: publicUrlData.publicUrl,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error al subir imagen a Supabase:', error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Función para guardar los datos de una propiedad en la base de datos como administrador
export async function saveScrapedDataAsAdmin(
  tableName: string,
  data: Record<string, any>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    console.log(`[DEBUG] Intentando insertar datos en tabla ${tableName}`);
    console.log(`[DEBUG] Datos a insertar:`, JSON.stringify(data, null, 2));
    console.log(`[DEBUG] URL de Supabase: ${env.NEXT_PUBLIC_SUPABASE_URL}`);
    console.log(`[DEBUG] ¿Hay clave de servicio?: ${Boolean(env.SUPABASE_SERVICE_ROLE_KEY)}`);
    
    // Verificar que los datos tengan la estructura esperada
    const requiredFields = ['url', 'descripcion', 'caracteristicas', 'resumen', 'imagenes', 'stored_images', 'precio_mxn', 'precio_usd', 'ubicacion'];
    const missingFields = requiredFields.filter(field => !Object.prototype.hasOwnProperty.call(data, field));
    
    if (missingFields.length > 0) {
      console.error(`[ERROR] Faltan campos requeridos: ${missingFields.join(', ')}`);
      return {
        success: false,
        error: `Faltan campos requeridos: ${missingFields.join(', ')}`
      };
    }
    
    // Intenta insertar directamente (ahora siempre debe ser 'properties')
    if (tableName !== 'properties') {
      console.warn(`[ADVERTENCIA] Se está intentando usar una tabla diferente a 'properties': ${tableName}`);
    }
    
    // Verificar si la tabla existe antes de intentar insertar
    console.log(`[DEBUG] Verificando si la tabla ${tableName} existe...`);
    const { count, error: countError } = await supabaseAdmin
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error(`[ERROR] Error al verificar si la tabla existe:`, countError);
      if (countError.code === '42P01') {
        return {
          success: false,
          error: `La tabla '${tableName}' no existe. Usa /api/setup-db para obtener instrucciones.`
        };
      }
    } else {
      console.log(`[DEBUG] Tabla ${tableName} verificada con éxito. Registros: ${count}`);
    }
    
    // Verificar si ya existe un registro con la misma URL
    console.log(`[DEBUG] Verificando si ya existe un registro con la URL: ${data.url}`);
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from(tableName)
      .select('id, created_by')
      .eq('url', data.url)
      .maybeSingle();
    
    if (existingError && existingError.code !== 'PGRST116') {
      console.error(`[ERROR] Error al verificar registros existentes:`, existingError);
      return {
        success: false,
        error: `Error al verificar registros existentes: ${existingError.message}`
      };
    }
    
    // Si existe un registro con la misma URL y el mismo usuario (o si no hay usuario especificado)
    if (existingData) {
      const userId = data.created_by;
      
      // Si el registro existente pertenece al mismo usuario o si no hay usuario especificado
      if (!userId || existingData.created_by === userId) {
        console.log(`[DEBUG] Encontrado registro existente con la misma URL y usuario. ID: ${existingData.id}`);
        console.log(`[DEBUG] Eliminando registro existente antes de insertar el nuevo...`);
        
        // Eliminar el registro existente
        const { error: deleteError } = await supabaseAdmin
          .from(tableName)
          .delete()
          .eq('id', existingData.id);
        
        if (deleteError) {
          console.error(`[ERROR] Error al eliminar registro existente:`, deleteError);
          return {
            success: false,
            error: `Error al eliminar registro existente: ${deleteError.message}`
          };
        }
        
        console.log(`[DEBUG] Registro existente eliminado con éxito.`);
      } else {
        console.log(`[DEBUG] El registro existente pertenece a otro usuario. No se eliminará.`);
        return {
          success: false,
          error: `Ya existe un registro con esta URL que pertenece a otro usuario.`
        };
      }
    }
    
    // Generar un UUID para el campo id
    const uuid = randomUUID();
    console.log(`[DEBUG] UUID generado para el campo id: ${uuid}`);
    
    // Agregar el UUID al objeto de datos
    const dataWithId = {
      id: uuid,
      ...data
    };
    
    // Insertar los datos con el id generado
    console.log(`[DEBUG] Ejecutando insert en tabla ${tableName} con id generado...`);
    const { data: insertedData, error } = await supabaseAdmin
      .from(tableName)
      .insert([dataWithId])
      .select();

    if (error) {
      console.error('[ERROR] Error específico de Supabase:', error);
      console.error('[ERROR] Detalles adicionales:', {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message
      });
      
      // Verificar si el error está relacionado con restricciones de la tabla
      if (error.code === '23502') {
        return {
          success: false,
          error: `Campo obligatorio faltante: ${error.details || error.message}`
        };
      } else if (error.code === '23505') {
        return {
          success: false,
          error: `Violación de restricción única: ${error.details || error.message}`
        };
      } else if (error.code === '42P01') {
        return {
          success: false,
          error: `La tabla '${tableName}' no existe. Usa /api/setup-db para obtener instrucciones.`
        };
      } else if (error.code === '42501') {
        // Error de permisos
        return {
          success: false,
          error: `Error de permisos: ${error.message}. Asegúrate de haber configurado las políticas RLS.`
        };
      } else if (error.code === '22P02') {
        // Error de tipo de datos
        return {
          success: false,
          error: `Error de tipo de datos: ${error.message}. Verifica que los tipos de datos sean correctos.`
        };
      }
      
      return { 
        success: false, 
        error: `Error específico de Supabase (${error.code}): ${error.message || 'Error desconocido'}` 
      };
    }

    if (!insertedData || insertedData.length === 0) {
      console.error('[ERROR] No se obtuvieron datos de retorno después de la inserción');
      return { 
        success: false, 
        error: 'No se pudo insertar el registro (sin error específico, pero tampoco hay datos retornados)' 
      };
    }

    console.log('[DEBUG] Datos guardados con éxito, ID:', insertedData[0]?.id);
    return {
      success: true,
      id: insertedData[0]?.id,
    };
  } catch (error) {
    const errorObject = error as Error;
    console.error('[ERROR] Excepción no controlada al guardar datos en Supabase:', error);
    console.error('[ERROR] Stack trace:', errorObject.stack);
    
    // Intentar extraer información más detallada del error
    const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    console.error('[ERROR] Detalles completos del error:', errorDetails);
    
    return {
      success: false,
      error: `Excepción: ${errorObject.message || 'Error desconocido'}. Ver consola para más detalles.`,
    };
  }
} 