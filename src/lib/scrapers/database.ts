import { Propiedad, ScraperResult } from './propertyScraperTypes';
import { saveScrapedDataAsAdmin } from '../supabase-admin';

// Nombre de la tabla donde se guardarán los datos
const TABLE_NAME = 'properties';

/**
 * Guarda los datos extraídos por el scraper en la base de datos
 * @param result Resultado del scraper
 * @param userId ID del usuario que realizó el scraping (opcional)
 * @returns Resultado de la operación
 */
export async function saveScrapedProperty(
  result: ScraperResult,
  userId?: string
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    if (!result.success || !result.data) {
      return {
        success: false,
        error: 'No hay datos para guardar'
      };
    }

    const propiedad = result.data;
    
    // Si la propiedad tiene amenidades, incluirlas en el objeto de características
    if (propiedad.amenidades && propiedad.amenidades.length > 0) {
      // Convertir a any para poder asignar arrays como valores
      (propiedad.caracteristicas as any).amenidades = propiedad.amenidades;
    }
    
    // Adaptar la estructura para que coincida con el esquema de la tabla
    // Solo incluir los campos que sabemos que existen en la tabla
    const dataToSave = {
      descripcion: propiedad.descripcion || '',
      caracteristicas: propiedad.caracteristicas || {}, // Guardar las características como JSON
      resumen: propiedad.resumen || '',
      imagenes: propiedad.imagenes || [], // URLs originales
      stored_images: result.imagePaths || [], // URLs en Supabase
      precio_mxn: propiedad.precio.mxn || '',
      precio_usd: propiedad.precio.usd || '',
      ubicacion: propiedad.ubicacion || '',
      url: propiedad.url,
      tipo: propiedad.tipo || '',
      operacion: propiedad.operacion || '',
      portal: propiedad.portal || 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Campos relacionados con el usuario
      user_id: userId || null, // Campo explícito para la relación con el usuario
      created_by: userId || null, // Para compatibilidad con posibles campos existentes
      // Campos adicionales que pueden ser útiles
      processing_time_ms: result.processingTime || 0,
      scraping_warnings: result.warnings || [],
      // Si la propiedad tiene un ID, incluirlo
      ...(propiedad.id ? { external_id: propiedad.id } : {})
    };
    
    // Si tenemos los detalles, agregarlos como campos separados (si existen en la BD)
    if (propiedad.detalles) {
      if (propiedad.detalles.terreno) {
        (dataToSave as any).terreno = propiedad.detalles.terreno;
      }
      if (propiedad.detalles.construccion) {
        (dataToSave as any).construccion = propiedad.detalles.construccion;
      }
      if (propiedad.detalles.recamaras) {
        (dataToSave as any).recamaras = propiedad.detalles.recamaras;
      }
      if (propiedad.detalles.banos) {
        (dataToSave as any).banos = propiedad.detalles.banos;
      }
      if (propiedad.detalles.estacionamientos) {
        (dataToSave as any).estacionamientos = propiedad.detalles.estacionamientos;
      }
    }
    
    console.log(`Guardando propiedad en base de datos${userId ? ` para usuario ${userId}` : ''}`);
    
    // Guardar en Supabase usando el cliente admin
    const saveResult = await saveScrapedDataAsAdmin(TABLE_NAME, dataToSave);
    
    if (!saveResult.success) {
      return {
        success: false,
        error: `Error al guardar datos: ${saveResult.error || 'Error desconocido'}`
      };
    }
    
    return {
      success: true,
      id: saveResult.id
    };
  } catch (error) {
    return {
      success: false,
      error: `Error al guardar en la base de datos: ${(error as Error).message}`
    };
  }
} 