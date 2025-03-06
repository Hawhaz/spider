import { JsonLdData, Propiedad, ScraperResult, ScraperConfig } from './propertyScraperTypes';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { uploadImageAsAdmin, saveScrapedDataAsAdmin } from '../supabase-admin';
import crypto from 'crypto';
import path from 'path';
import { fetchHtmlWithRetries, generateIdFromUrl } from './scraperUtils';
import { detectPortal, getPortalName } from './portalDetector';
import { processImages } from './imageProcessor';
import { century21Extractor } from './extractors/century21Extractor';
import { genericExtractor } from './extractors/genericExtractor';
import { performance } from 'perf_hooks';

// Nombre del bucket donde se guardarán las imágenes
const BUCKET_NAME = 'property-images';
// Nombre de la tabla donde se guardarán los datos (debe coincidir con la tabla creada en Supabase)
const TABLE_NAME = 'properties';

// Lista de extractores disponibles
export const extractors = [
  century21Extractor,
  // Aquí se pueden agregar más extractores específicos para otros portales
  genericExtractor, // Siempre debe ser el último (fallback)
];

/**
 * Configuración por defecto para el scraper
 */
export const DEFAULT_SCRAPER_CONFIG: Required<ScraperConfig> = {
  imageProcessor: {
    maxConcurrent: 5,
    maxRetries: 3,
    timeout: 30000,
    optimizeImages: true,
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 80
  },
  useCache: true,
  cacheTTL: 86400000, // 24 horas
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  timeout: 30000,
  retries: 3,
  logLevel: 'info'
};

/**
 * Genera un nombre de archivo único basado en el hash del URL original
 */
function generateUniqueFilename(imageUrl: string, index: number): string {
  const urlHash = crypto.createHash('md5').update(imageUrl).digest('hex');
  const ext = path.extname(imageUrl) || '.jpg'; // Usar .jpg como extensión por defecto
  return `${urlHash}_${index}${ext}`;
}

/**
 * Descarga una imagen y la guarda en Supabase
 */
async function downloadAndStoreImage(
  imageUrl: string,
  index: number
): Promise<string | null> {
  try {
    console.log(`[Imagen ${index}] Intentando descargar: ${imageUrl}`);
    
    // Validar la URL antes de intentar descargarla
    if (!imageUrl || !imageUrl.startsWith('http')) {
      console.error(`[Imagen ${index}] URL inválida: ${imageUrl}`);
      return null;
    }
    
    // Descargar la imagen con timeout y headers adecuados
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 15000, // Aumentar timeout a 15 segundos
      maxContentLength: 15 * 1024 * 1024, // Limitar a 15MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });
    
    // Verificar que la respuesta sea una imagen
    const contentType = response.headers['content-type'] || '';
    if (!contentType.startsWith('image/')) {
      console.error(`[Imagen ${index}] El contenido descargado no es una imagen: ${contentType}`);
      return null;
    }
    
    const buffer = Buffer.from(response.data);
    
    // Verificar que el buffer tenga un tamaño razonable
    if (buffer.length < 1000) {
      console.error(`[Imagen ${index}] La imagen descargada es demasiado pequeña (${buffer.length} bytes), podría ser un error`);
      return null;
    }
    
    // Generar un nombre único para el archivo
    const filename = generateUniqueFilename(imageUrl, index);
    const filePath = `properties/${filename}`;
    
    console.log(`[Imagen ${index}] Descargada (${buffer.length} bytes), subiendo a Supabase como ${contentType}`);
    
    // Subir a Supabase usando el cliente admin
    const uploadResult = await uploadImageAsAdmin(
      BUCKET_NAME,
      filePath,
      buffer,
      contentType
    );
    
    if (!uploadResult.success) {
      console.error(`[Imagen ${index}] Error al subir imagen: ${uploadResult.error}`);
      return null;
    }
    
    console.log(`[Imagen ${index}] Guardada exitosamente en Supabase: ${uploadResult.path}`);
    return uploadResult.path || null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[Imagen ${index}] Error al procesar imagen: ${errorMessage}`);
    
    // Proporcionar más detalles si es un error de Axios
    if (axios.isAxiosError(error)) {
      const axiosError = error as unknown as import('axios').AxiosError;
      console.error(`[Imagen ${index}] Detalles del error de Axios:`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        headers: axiosError.response?.headers,
      });
    }
    
    // Continuar con las demás imágenes en lugar de fallar por completo
    return null;
  }
}

/**
 * Extrae datos de una propiedad a partir del HTML de una página
 */
export async function extraerDatosPropiedad(html: string, url: string): Promise<Propiedad> {
  const $ = cheerio.load(html);
  
  // 1. Extraer la descripción completa del CondoHotel
  let descripcionElem = $("div.card-body.pt-0 div.col-12.pt-4 p.text-muted[style*='white-space: pre-wrap']");
  if (!descripcionElem.length) {
    descripcionElem = $("div.card-body p.text-muted");
  }
  const descripcion = descripcionElem.text().trim() || "";

  // 2. Extraer características y amenidades
  const caracteristicas: Record<string, string> = {};
  $("div.card-body.pt-0 .row div.col-sm-12.col-md-6.my-1, div.card-body.pt-0 .row div.col-sm-12.col-md-6.col-lg-4.my-2, div.card-body .row div.col-sm-12.col-md-6.my-1").each((_, elem) => {
    const texto = $(elem).text() || "";
    const partes = texto.split(":");
    if (partes.length >= 2) {
      const clave = partes[0]?.trim();
      const valor = partes.slice(1).join(":").trim();
      if (clave) {
        caracteristicas[clave] = valor;
      }
    }
  });

  // 3. Extraer el resumen de características
  let resumenElem = $("div.card-body.pt-0 .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6");
  if (!resumenElem.length) {
    resumenElem = $("div.card-body .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6");
  }
  const resumen = resumenElem.text().trim() || "";

  // 4. Extraer las imágenes de la propiedad
  let imagenes: string[] = [];
  // a) Extraer la imagen del meta tag 'og:image'
  const metaImg = $('meta[property="og:image"]');
  const metaImgUrl = metaImg.attr("content");
  if (metaImgUrl) {
    imagenes.push(metaImgUrl);
  }

  // b) Procesar el script con JSON-LD para extraer el array de imágenes
  const scriptJson = $('script[type="application/ld+json"]');
  if (scriptJson.length > 0) {
    try {
      const jsonLd = JSON.parse(scriptJson.text()) as JsonLdData;
      if (jsonLd.image && Array.isArray(jsonLd.image)) {
        imagenes = imagenes.concat(jsonLd.image);
      }
    } catch (error) {
      console.error("Error al parsear JSON-LD:", error);
    }
  }

  // 5. Extraer el precio en MXN y USD
  let precioMXN = "";
  let precioUSD = "";
  const precioElem = $("h6.text-muted.fs-3.fw-bold");
  if (precioElem.length > 0) {
    precioMXN = precioElem.contents().first().text().trim() || "";
    const usdElem = precioElem.find("span.fs-5.small");
    if (usdElem.length) {
      precioUSD = usdElem.text().replace("/", "").trim() || "";
    } else {
      precioUSD = precioElem.find("span").text().replace("/", "").trim() || "";
    }
  }

  // 6. Extraer la ubicación
  let ubicacion = "";
  $("h5.card-title").each((_, titulo) => {
    if ($(titulo).text().includes("Ubicación")) {
      const nextElem = $(titulo).next();
      if (nextElem.length) {
        ubicacion = nextElem.text().trim() || "";
      } else if ($(titulo).parent().length) {
        ubicacion = $(titulo).parent().text().replace($(titulo).text(), "").trim() || "";
      }
    }
  });

  return {
    descripcion,
    caracteristicas,
    resumen,
    imagenes,
    precio: {
      mxn: precioMXN,
      usd: precioUSD,
    },
    ubicacion,
    url
  };
}

/**
 * Función principal para extraer datos de una propiedad inmobiliaria
 * @param url URL de la propiedad a extraer
 * @param config Configuración opcional para el scraper
 * @param userId ID del usuario asociado a la extracción (para almacenar las imágenes en carpetas específicas)
 * @returns Resultado de la extracción
 */
export async function scrapeProperty(
  url: string,
  config: Partial<ScraperConfig> = {},
  userId?: string
): Promise<ScraperResult> {
  // Combinar configuración por defecto con la proporcionada
  const mergedConfig: Required<ScraperConfig> = {
    ...DEFAULT_SCRAPER_CONFIG,
    ...config,
    imageProcessor: {
      ...DEFAULT_SCRAPER_CONFIG.imageProcessor,
      ...(config.imageProcessor || {})
    }
  };

  const startTime = performance.now();
  const warnings: string[] = [];
  
  try {
    // 1. Descargar el HTML de la página
    const html = await fetchHtmlWithRetries(url, mergedConfig);
    
    // 2. Detectar el portal inmobiliario
    const portalType = detectPortal(url, html);
    const portalName = getPortalName(portalType);
    
    // 3. Encontrar el extractor adecuado
    const extractor = extractors.find(ext => ext.canHandle(url, html));
    
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

/**
 * Función para extraer datos de múltiples propiedades en paralelo
 * @param urls Lista de URLs a procesar
 * @param config Configuración opcional para el scraper
 * @param concurrency Número de propiedades a procesar en paralelo
 * @param userId ID del usuario asociado a la extracción (para almacenar las imágenes en carpetas específicas)
 * @returns Lista de resultados de extracción
 */
export async function scrapeMultipleProperties(
  urls: string[],
  config: Partial<ScraperConfig> = {},
  concurrency = 3,
  userId?: string
): Promise<ScraperResult[]> {
  const results: ScraperResult[] = [];
  const uniqueUrls = [...new Set(urls)]; // Eliminar duplicados
  
  // Procesar en lotes para controlar la concurrencia
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => scrapeProperty(url, config, userId));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Función para validar una URL de propiedad
 * @param url URL a validar
 * @returns true si la URL es válida para scraping
 */
export function isValidPropertyUrl(url: string): boolean {
  try {
    // Verificar que sea una URL válida
    new URL(url);
    
    // Verificar que sea HTTP o HTTPS
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    
    // Detectar el portal
    const portalType = detectPortal(url, '');
    
    // Si no se pudo detectar el portal por URL, no es válida
    return portalType !== 'unknown';
  } catch (error) {
    return false;
  }
} 