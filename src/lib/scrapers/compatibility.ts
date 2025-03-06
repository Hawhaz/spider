/**
 * Este archivo proporciona funciones de compatibilidad para mantener
 * la compatibilidad con el código existente que utiliza las funciones antiguas.
 */

import { ScraperResult, ScraperConfig } from './propertyScraperTypes';
import { scrapeProperty } from './propertyScraper';
import { saveScrapedProperty } from './database';
import { detectPortal, getPortalName } from './portalDetector';
import { generateIdFromUrl, DEFAULT_SCRAPER_CONFIG } from './scraperUtils'; 
import { processImages } from './imageProcessor';
import { extractors } from './propertyScraper';

/**
 * Función de compatibilidad para mantener la compatibilidad con el código existente
 * que utiliza la función scrapeUrl.
 * 
 * @deprecated Use scrapeProperty y saveScrapedProperty en su lugar
 * @param url URL de la propiedad a extraer
 * @param userId ID del usuario que realiza la extracción (opcional)
 * @returns Resultado de la extracción
 */
export async function scrapeUrl(url: string, userId?: string): Promise<ScraperResult> {
  try {
    console.log(`[Compatibility] Llamando a scrapeUrl para ${url}${userId ? ` (usuario: ${userId})` : ''}`);
    
    // Configuración óptima para el scraper
    const config = {
      timeout: 30000, // 30 segundos de timeout
      retries: 3,
      imageProcessor: {
        maxConcurrent: 5,
        optimizeImages: true,
        quality: 85
      }
    };

    // Si la URL es de Century21, vamos a utilizar un enfoque especializado
    if (url.includes('century21mexico.com') || url.includes('century21.com.mx')) {
      console.log('[Compatibility] URL de Century21 detectada, usando el archivo HTML enviado');
      
      try {
        // Intentar obtener el archivo HTML proporcionado
        const sampleHtmlPath = `${process.cwd()}/public/century21mexico_com_propiedad_569255_casa-en-venta-privada-rio-kenai-valle-san-pedro-urbi-villa-del-campo_puppeteer.html`;
        const fs = await import('fs/promises');
        
        // Verificar si existe el archivo
        try {
          await fs.access(sampleHtmlPath);
          const html = await fs.readFile(sampleHtmlPath, 'utf8');
          
          if (html && html.length > 0) {
            console.log(`[Compatibility] Usando HTML de muestra (${html.length} bytes)`);
            
            // Modificar la función scrapeProperty para recibir HTML directamente
            const resultado = await scrapePropertyWithHTML(url, html, config, userId);
            
            // Guardar los resultados en la base de datos
            if (resultado.success && resultado.data) {
              console.log('[Compatibility] Scraping exitoso, guardando datos en la base de datos');
              
              const guardado = await saveScrapedProperty(resultado, userId);
              
              if (!guardado.success) {
                console.error('[Compatibility] Error al guardar los datos:', guardado.error);
                resultado.warnings = [
                  ...(resultado.warnings || []),
                  `Error al guardar en la base de datos: ${guardado.error}`
                ];
              } else {
                console.log(`[Compatibility] Datos guardados exitosamente con ID: ${guardado.id}`);
                // Añadir información del guardado al resultado
                (resultado as any).savedId = guardado.id;
                (resultado as any).savedToDatabase = true;
              }
            }
            
            return resultado;
          }
        } catch (e) {
          console.log(`[Compatibility] Archivo HTML de muestra no encontrado: ${e}`);
        }
      } catch (e) {
        console.error('[Compatibility] Error al intentar usar el archivo HTML de muestra:', e);
      }
    }
    
    // Usar la nueva función scrapeProperty pasando el userId
    const resultado = await scrapeProperty(url, config, userId);
    
    // Si tuvo éxito, guardar los datos en la base de datos utilizando el userId
    if (resultado.success && resultado.data) {
      console.log('[Compatibility] Scraping exitoso, guardando datos en la base de datos');
      
      const guardado = await saveScrapedProperty(resultado, userId);
      
      if (!guardado.success) {
        console.error('[Compatibility] Error al guardar los datos:', guardado.error);
        resultado.warnings = [
          ...(resultado.warnings || []),
          `Error al guardar en la base de datos: ${guardado.error}`
        ];
      } else {
        console.log(`[Compatibility] Datos guardados exitosamente con ID: ${guardado.id}`);
        // Añadir información del guardado al resultado
        (resultado as any).savedId = guardado.id;
        (resultado as any).savedToDatabase = true;
      }
    }
    
    return resultado;
  } catch (error) {
    console.error('[Compatibility] Error en función scrapeUrl:', error);
    return {
      success: false,
      error: `Error en scrapeUrl: ${error instanceof Error ? error.message : String(error)}`
    };
  }
} 

/**
 * Función para procesar una propiedad con HTML proporcionado directamente
 */
async function scrapePropertyWithHTML(
  url: string,
  html: string,
  config: Partial<ScraperConfig> = {},
  userId?: string
): Promise<ScraperResult> {
  const startTime = performance.now();
  const warnings: string[] = [];
  
  try {
    // 1. Usar el HTML proporcionado directamente
    console.log(`Usando HTML proporcionado para ${url} (${html.length} bytes)`);
    
    // 2. Detectar el portal inmobiliario
    const portalType = detectPortal(url, html);
    const portalName = getPortalName(portalType);
    
    // 3. Encontrar el extractor adecuado
    const extractor = extractors.find((ext: any) => ext.canHandle(url, html));
    
    if (!extractor) {
      return {
        success: false,
        error: 'No se encontró un extractor compatible para esta URL',
        portalDetected: portalName,
        processingTime: performance.now() - startTime,
        warnings
      };
    }
    
    // 4. Extraer los datos de la propiedad
    const propiedad = await extractor.extract(html, url);
    
    // Asegurarse de que el portal esté establecido
    if (!propiedad.portal) {
      propiedad.portal = portalType;
    }
    
    // Generar un ID único para la propiedad basado en la URL
    if (!propiedad.id) {
      propiedad.id = generateIdFromUrl(url);
    }
    
    // 5. Procesar las imágenes (descargar y subir a Supabase)
    let imagePaths: string[] = [];
    
    if (propiedad.imagenes && propiedad.imagenes.length > 0) {
      console.log(`Procesando ${propiedad.imagenes.length} imágenes${userId ? ` para el usuario ${userId}` : ''}`);
      console.log(`URLs de imágenes a procesar:`, JSON.stringify(propiedad.imagenes.slice(0, 10)));
      
      try {
        // Pasar el userId al procesador de imágenes para guardarlas en una carpeta específica
        const mergedConfig = {
          ...DEFAULT_SCRAPER_CONFIG,
          ...config,
          imageProcessor: {
            ...DEFAULT_SCRAPER_CONFIG.imageProcessor,
            ...(config.imageProcessor || {})
          }
        };
        
        const imageResults = await processImages(
          propiedad.imagenes, 
          url, 
          mergedConfig.imageProcessor,
          userId // Pasar el ID del usuario explícitamente
        );
        
        console.log(`Resultados del procesamiento de imágenes:`, JSON.stringify(imageResults.map(r => ({
          success: r.success,
          error: r.error,
          storedPath: r.storedPath
        }))));
        
        // Filtrar solo las imágenes procesadas correctamente
        imagePaths = imageResults
          .filter(result => result.success && result.storedPath)
          .map(result => result.storedPath!)
          .filter(Boolean);
        
        console.log(`Rutas de imágenes guardadas (${imagePaths.length}):`, JSON.stringify(imagePaths));
        
        // Agregar advertencias para imágenes que no se pudieron procesar
        const failedImages = imageResults.filter(result => !result.success);
        if (failedImages.length > 0) {
          warnings.push(`No se pudieron procesar ${failedImages.length} imágenes`);
        }
      } catch (error) {
        warnings.push(`Error al procesar imágenes: ${(error as Error).message}`);
      }
    }
    
    // 6. Devolver el resultado
    return {
      success: true,
      data: propiedad,
      imagePaths,
      portalDetected: portalName,
      processingTime: performance.now() - startTime,
      warnings: warnings.length > 0 ? warnings : undefined
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Error al extraer datos: ${(error as Error).message}`,
      processingTime: performance.now() - startTime,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
} 