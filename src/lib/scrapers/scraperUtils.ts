import { ScraperConfig } from './propertyScraperTypes';
import axios, { AxiosRequestConfig } from 'axios';

// Configuración por defecto para el scraper
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  imageProcessor: {
    maxConcurrent: 5,
    maxRetries: 3,
    timeout: 15000,
    optimizeImages: false,
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85
  },
  useCache: true,
  cacheTTL: 3600000, // 1 hora
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  timeout: 30000, // 30 segundos
  retries: 3,
  logLevel: 'info'
};

// Función para normalizar URLs
export function normalizeUrl(url: string): string {
  try {
    // Asegurarse de que la URL tenga protocolo
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    const urlObj = new URL(url);
    
    // Eliminar parámetros de seguimiento comunes
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Normalizar el hostname (quitar www si existe)
    if (urlObj.hostname.startsWith('www.')) {
      urlObj.hostname = urlObj.hostname.substring(4);
    }
    
    // Eliminar slash final si existe
    let path = urlObj.pathname;
    if (path.endsWith('/') && path.length > 1) {
      urlObj.pathname = path.slice(0, -1);
    }
    
    return urlObj.toString();
  } catch (error) {
    // Si hay un error, devolver la URL original
    console.error('Error al normalizar URL:', error);
    return url;
  }
}

// Función para extraer el dominio de una URL
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(normalizeUrl(url));
    return urlObj.hostname;
  } catch (error) {
    console.error('Error al extraer dominio:', error);
    return '';
  }
}

// Función para convertir una URL relativa a absoluta
export function toAbsoluteUrl(relativeUrl: string, baseUrl: string): string {
  try {
    // Si ya es una URL absoluta, devolverla
    if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
      return relativeUrl;
    }
    
    // Si comienza con //, añadir https:
    if (relativeUrl.startsWith('//')) {
      return 'https:' + relativeUrl;
    }
    
    // Crear la URL absoluta
    const base = new URL(baseUrl);
    
    // Si comienza con /, es relativa al dominio
    if (relativeUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${relativeUrl}`;
    }
    
    // Si no, es relativa a la ruta actual
    const path = base.pathname.endsWith('/') ? base.pathname : base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
    return `${base.protocol}//${base.host}${path}${relativeUrl}`;
  } catch (error) {
    console.error('Error al convertir a URL absoluta:', error);
    return relativeUrl;
  }
}

// Función para limpiar texto (eliminar espacios extra, saltos de línea, etc.)
export function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
    .replace(/\n+/g, '\n') // Reemplazar múltiples saltos de línea por uno solo
    .trim(); // Eliminar espacios al inicio y final
}

// Función para extraer números de un texto
export function extractNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  
  const matches = text.match(/[\d,.]+/);
  if (!matches) return null;
  
  // Limpiar el número (quitar comas, puntos, etc.)
  const numberStr = matches[0].replace(/[,.]/g, '');
  const number = parseInt(numberStr, 10);
  
  return isNaN(number) ? null : number;
}

// Función para extraer precio de un texto
export function extractPrice(text: string | null | undefined): { value: number | null, currency: string | null } {
  if (!text) return { value: null, currency: null };
  
  // Detectar moneda
  let currency = null;
  if (text.includes('$')) currency = 'MXN';
  if (text.toLowerCase().includes('mxn')) currency = 'MXN';
  if (text.toLowerCase().includes('usd') || text.includes('USD') || text.includes('US$') || text.includes('U$')) currency = 'USD';
  if (text.includes('€')) currency = 'EUR';
  
  // Extraer el número
  const value = extractNumber(text);
  
  return { value, currency };
}

// Función para descargar HTML con reintentos
export async function fetchHtmlWithRetries(
  url: string, 
  config: ScraperConfig = DEFAULT_SCRAPER_CONFIG
): Promise<string> {
  const retries = config.retries ?? DEFAULT_SCRAPER_CONFIG.retries ?? 3;
  const timeout = config.timeout ?? DEFAULT_SCRAPER_CONFIG.timeout ?? 30000;
  const userAgent = config.userAgent ?? DEFAULT_SCRAPER_CONFIG.userAgent ?? 'Mozilla/5.0';
  
  const axiosConfig: AxiosRequestConfig = {
    timeout: timeout,
    headers: {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    }
  };
  
  let lastError: Error | null = null;
  
  // Intentar la solicitud con reintentos
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Intento ${attempt + 1}/${retries + 1} para descargar HTML de ${url}`);
      
      const response = await axios.get(url, axiosConfig);
      
      if (response.status === 200) {
        return response.data;
      }
      
      throw new Error(`Respuesta HTTP no exitosa: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar el error
      if (attempt === retries) {
        throw lastError;
      }
      
      // Esperar con backoff exponencial antes del siguiente intento
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      console.log(`Error en intento ${attempt + 1}, reintentando en ${delay}ms:`, lastError.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Este punto no debería alcanzarse, pero por si acaso
  throw lastError || new Error('Error desconocido al descargar HTML');
}

// Función para generar un ID único basado en la URL
export function generateIdFromUrl(url: string): string {
  const normalizedUrl = normalizeUrl(url);
  
  // Crear un hash simple de la URL
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  
  // Convertir a string hexadecimal y asegurarse de que sea positivo
  const hashHex = Math.abs(hash).toString(16);
  
  return hashHex;
}

// Función para extraer metadatos de Open Graph y otros
export function extractMetadata(html: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  
  // Extraer metadatos de etiquetas meta
  const metaRegex = /<meta\s+(?:[^>]*?\s+)?(?:name|property)=["']([^"']*)["']\s+(?:[^>]*?\s+)?content=["']([^"']*)["']|<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["']\s+(?:[^>]*?\s+)?(?:name|property)=["']([^"']*)["']/gi;
  
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const name = match[1] || match[4];
    const content = match[2] || match[3];
    
    if (name && content) {
      metadata[name] = content;
    }
  }
  
  return metadata;
}

// Función para extraer JSON-LD de una página
export function extractJsonLd(html: string): any[] {
  const results: any[] = [];
  
  // Extraer scripts de tipo application/ld+json
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  
  let match;
  let matchCount = 0;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    matchCount++;
    try {
      if (match && match[1]) {
        const jsonContent = match[1].trim();
        const parsedJson = JSON.parse(jsonContent);
        
        // Log para depuración
        console.log(`JSON-LD #${matchCount} encontrado:`, 
                    parsedJson['@type'] ? `Tipo: ${parsedJson['@type']}` : 'Sin tipo');
        
        // Si tiene propiedad image, analizar su estructura
        if (parsedJson && typeof parsedJson === 'object') {
          if ('image' in parsedJson) {
            console.log(`JSON-LD #${matchCount} tiene propiedad 'image':`, 
                        `Tipo: ${typeof parsedJson.image}`, 
                        Array.isArray(parsedJson.image) ? `(Array de ${parsedJson.image.length} elementos)` : '');
          }
        }
        
        // Puede ser un objeto o un array
        if (Array.isArray(parsedJson)) {
          results.push(...parsedJson);
        } else {
          results.push(parsedJson);
        }
      }
    } catch (error) {
      console.error('Error al parsear JSON-LD:', error);
    }
  }
  
  // Si no se encontró ningún JSON-LD, intentar con un método alternativo para Century21
  if (results.length === 0 && html.includes('century21')) {
    console.log('No se encontró JSON-LD con el método regular, intentando método alternativo para Century21...');
    
    // Buscar patrón específico de Century21
    const century21Regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    
    // Intentar nuevamente con el patrón específico
    while ((match = century21Regex.exec(html)) !== null) {
      try {
        if (match && match[1]) {
          // Intentar encontrar un objeto JSON dentro del contenido
          const content = match[1];
          if (content) {
            const jsonStart = content.indexOf('{');
            const jsonEnd = content.lastIndexOf('}') + 1;
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
              const possibleJson = content.substring(jsonStart, jsonEnd);
              try {
                const parsed = JSON.parse(possibleJson);
                console.log('Encontrado posible JSON-LD manualmente:', parsed['@type'] || 'Sin tipo');
                
                // Verificar si contiene información relevante
                if (parsed['@type'] === 'RealEstateListing' || 
                    parsed.image || 
                    parsed.address || 
                    parsed.offers) {
                  results.push(parsed);
                }
              } catch (e) {
                console.log('Error al parsear JSON-LD manual:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error en extracción alternativa:', error);
      }
    }
    
    // Intentar un tercer método: buscar directamente en el HTML
    if (results.length === 0) {
      console.log('Intentando tercer método para extraer JSON-LD...');
      const metaTags = html.match(/<meta\s+property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)["']/gi);
      
      if (metaTags && metaTags.length > 0) {
        console.log(`Encontradas ${metaTags.length} etiquetas meta de imagen`);
        
        // Crear un JSON-LD básico con las imágenes encontradas
        const images = metaTags.map(tag => {
          const match = tag.match(/content=["'](https?:\/\/[^"']+)["']/i);
          return match ? match[1] : null;
        }).filter(Boolean);
        
        if (images.length > 0) {
          console.log(`Creando JSON-LD sintético con ${images.length} imágenes`);
          results.push({
            '@type': 'RealEstateListing',
            'image': images
          });
        }
      }
    }
  }
  
  console.log(`Se encontraron ${matchCount} bloques JSON-LD. Resultados procesados: ${results.length}`);
  return results;
} 