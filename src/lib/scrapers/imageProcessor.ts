import axios from 'axios';
import { uploadImageAsAdmin } from '../supabase-admin';
import crypto from 'crypto';
import path from 'path';
import { ImageProcessorConfig, ImageProcessResult } from './propertyScraperTypes';
import { toAbsoluteUrl } from './scraperUtils';

// Nombre del bucket donde se guardarán las imágenes
const BUCKET_NAME = 'property-images';

// Configuración por defecto para el procesador de imágenes
const DEFAULT_IMAGE_PROCESSOR_CONFIG: Required<ImageProcessorConfig> = {
  maxConcurrent: 5,
  maxRetries: 3,
  timeout: 15000,
  optimizeImages: false,
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85
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
 * Verifica si una URL de imagen es válida
 * @returns boolean
 */
function isValidImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Lista de extensiones válidas para imágenes
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  
  // Verificar extensión
  const urlLower = url.toLowerCase();
  
  // Comprobar directamente si la URL termina con una extensión de imagen
  if (extensions.some(ext => urlLower.endsWith(ext))) {
    return true;
  }
  
  // Comprobar si hay una extensión de imagen antes de parámetros de consulta
  const questionMarkIndex = urlLower.indexOf('?');
  if (questionMarkIndex > 0) {
    const urlWithoutParams = urlLower.substring(0, questionMarkIndex);
    if (extensions.some(ext => urlWithoutParams.endsWith(ext))) {
      return true;
    }
  }
  
  // Si la URL contiene palabras clave que sugieren que es una imagen
  const imageKeywords = ['image', 'img', 'photo', 'picture', 'foto', 'imagen'];
  if (imageKeywords.some(keyword => urlLower.includes(keyword))) {
    return true;
  }
  
  // Por defecto, asumir que es válida si comienza con http(s)
  return urlLower.startsWith('http://') || urlLower.startsWith('https://');
}

/**
 * Descarga una imagen con reintentos
 */
async function downloadImage(
  imageUrl: string, 
  config: Required<ImageProcessorConfig>
): Promise<Buffer> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      console.log(`[Imagen] Intento ${attempt + 1}/${config.maxRetries + 1} para descargar: ${imageUrl}`);
      
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: config.timeout,
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
        throw new Error(`El contenido descargado no es una imagen: ${contentType}`);
      }
      
      const buffer = Buffer.from(response.data);
      
      // Verificar que el buffer tenga un tamaño razonable
      if (buffer.length < 1000) {
        throw new Error(`La imagen descargada es demasiado pequeña (${buffer.length} bytes), podría ser un error`);
      }
      
      return buffer;
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar el error
      if (attempt === config.maxRetries) {
        throw lastError;
      }
      
      // Esperar con backoff exponencial antes del siguiente intento
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`[Imagen] Error en intento ${attempt + 1}, reintentando en ${delay}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Este punto no debería alcanzarse, pero por si acaso
  throw lastError || new Error('Error desconocido al descargar imagen');
}

/**
 * Procesa una sola imagen: descarga, optimiza (opcional) y guarda en Supabase
 */
async function processImage(
  imageUrl: string,
  index: number,
  baseUrl: string,
  config: Required<ImageProcessorConfig>,
  userId?: string
): Promise<ImageProcessResult> {
  try {
    // Convertir URL relativa a absoluta si es necesario
    const absoluteUrl = toAbsoluteUrl(imageUrl, baseUrl);
    
    // Verificar que la URL sea válida
    if (!isValidImageUrl(absoluteUrl)) {
      return {
        originalUrl: imageUrl,
        success: false,
        error: 'URL de imagen inválida'
      };
    }
    
    // Descargar la imagen
    const buffer = await downloadImage(absoluteUrl, config);
    
    // Generar un nombre único para el archivo
    const filename = generateUniqueFilename(absoluteUrl, index);
    
    // Si hay userId, almacenar en una carpeta específica del usuario
    let filePath: string;
    if (userId) {
      filePath = `users/${userId}/properties/${filename}`;
      console.log(`[Imagen ${index}] Usando ruta específica de usuario: ${filePath}`);
    } else {
      filePath = `properties/${filename}`;
      console.log(`[Imagen ${index}] Usando ruta genérica: ${filePath}`);
    }
    
    // Determinar el tipo de contenido basado en la extensión
    const ext = path.extname(absoluteUrl).toLowerCase();
    let contentType = 'image/jpeg'; // Por defecto
    
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.bmp') contentType = 'image/bmp';
    
    console.log(`[Imagen ${index}] Descargada (${buffer.length} bytes), subiendo a Supabase como ${contentType}`);
    
    // Subir a Supabase - pasamos el userId explícitamente para metadata
    const uploadResult = await uploadImageAsAdmin(
      BUCKET_NAME,
      filePath,
      buffer,
      contentType,
      userId
    );
    
    if (!uploadResult.success) {
      return {
        originalUrl: imageUrl,
        success: false,
        error: uploadResult.error || 'Error al subir imagen a Supabase'
      };
    }
    
    return {
      originalUrl: imageUrl,
      storedPath: uploadResult.path,
      success: true,
      size: buffer.length,
      format: contentType
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[Imagen ${index}] Error al procesar:`, errorMessage);
    
    return {
      originalUrl: imageUrl,
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Clase para limitar la concurrencia de promesas
 */
class PromisePool {
  private queue: Array<() => Promise<any>> = [];
  private activeCount = 0;
  private results: any[] = [];
  
  constructor(private maxConcurrent: number) {}
  
  async add<T>(promiseFactory: () => Promise<T>): Promise<void> {
    this.queue.push(promiseFactory);
    this.tryExecuteNext();
  }
  
  private tryExecuteNext(): void {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.activeCount++;
    const promiseFactory = this.queue.shift()!;
    
    promiseFactory()
      .then(result => {
        this.results.push(result);
        this.activeCount--;
        this.tryExecuteNext();
      })
      .catch(error => {
        console.error('Error en PromisePool:', error);
        this.results.push({ success: false, error: error.message });
        this.activeCount--;
        this.tryExecuteNext();
      });
  }
  
  async waitForAll(): Promise<any[]> {
    // Si no hay promesas activas ni en cola, devolver resultados inmediatamente
    if (this.activeCount === 0 && this.queue.length === 0) {
      return this.results;
    }
    
    // Esperar a que todas las promesas se completen
    return new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (this.activeCount === 0 && this.queue.length === 0) {
          clearInterval(checkInterval);
          resolve(this.results);
        }
      }, 100);
    });
  }
}

/**
 * Procesa múltiples imágenes en paralelo con límite de concurrencia
 */
export async function processImages(
  imageUrls: string[],
  baseUrl: string,
  config?: Partial<ImageProcessorConfig>,
  userId?: string
): Promise<ImageProcessResult[]> {
  // Combinar la configuración proporcionada con los valores por defecto
  const fullConfig: Required<ImageProcessorConfig> = {
    ...DEFAULT_IMAGE_PROCESSOR_CONFIG,
    ...config
  };
  
  console.log(`Procesando ${imageUrls.length} imágenes con concurrencia máxima de ${fullConfig.maxConcurrent}`);
  
  // Filtrar URLs vacías o duplicadas
  const uniqueUrls = [...new Set(imageUrls.filter(url => url && typeof url === 'string'))];
  
  if (uniqueUrls.length === 0) {
    console.log('No hay URLs de imágenes válidas para procesar');
    return [];
  }
  
  console.log(`Procesando ${uniqueUrls.length} URLs únicas de imágenes`);
  
  // Crear un pool de promesas para limitar la concurrencia
  const pool = new PromisePool(fullConfig.maxConcurrent);
  
  // Añadir cada imagen al pool
  uniqueUrls.forEach((imageUrl, index) => {
    pool.add(() => processImage(imageUrl, index, baseUrl, fullConfig, userId));
  });
  
  // Esperar a que todas las imágenes se procesen
  const results = await pool.waitForAll();
  
  // Filtrar resultados exitosos
  const successfulResults = results.filter(result => result.success);
  console.log(`Procesadas ${successfulResults.length} de ${uniqueUrls.length} imágenes con éxito`);
  
  return results;
} 