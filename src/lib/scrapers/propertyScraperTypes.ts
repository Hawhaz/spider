export interface Propiedad {
  descripcion: string;
  caracteristicas: Record<string, string>;
  resumen: string;
  imagenes: string[];
  precio: {
    mxn: string;
    usd: string;
  };
  ubicacion: string;
  url: string;
  id?: string; // Identificador único de la propiedad (generalmente derivado de la URL)
  tipo?: string; // Tipo de propiedad (casa, departamento, etc.)
  operacion?: string; // Tipo de operación (venta, renta, etc.)
  detalles?: {
    terreno?: string;
    construccion?: string;
    recamaras?: string;
    banos?: string;
    estacionamientos?: string;
    antiguedad?: string;
    niveles?: string;
  };
  amenidades?: string[]; // Lista de amenidades
  portal?: string; // Portal inmobiliario de donde se extrajo
}

export interface JsonLdData {
  "@context"?: string;
  "@type"?: string;
  image?: string[];
  name?: string;
  description?: string;
  address?: {
    "@type"?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    streetAddress?: string;
  };
  geo?: {
    "@type"?: string;
    latitude?: string;
    longitude?: string;
  };
  offers?: {
    "@type"?: string;
    price?: string;
    priceCurrency?: string;
  };
}

export interface ScraperResult {
  success: boolean;
  data?: Propiedad;
  error?: string;
  imagePaths?: string[]; // Rutas de las imágenes guardadas en Supabase
  portalDetected?: string; // Portal inmobiliario detectado
  processingTime?: number; // Tiempo de procesamiento en ms
  warnings?: string[]; // Advertencias durante el proceso
}

// Interfaces para los extractores específicos
export interface PortalExtractor {
  canHandle: (url: string, html: string) => boolean;
  extract: (html: string, url: string) => Promise<Propiedad>;
  name: string;
}

// Configuración para el procesamiento de imágenes
export interface ImageProcessorConfig {
  maxConcurrent?: number; // Máximo número de descargas concurrentes
  maxRetries?: number; // Máximo número de reintentos
  timeout?: number; // Timeout en ms
  optimizeImages?: boolean; // Si se deben optimizar las imágenes
  maxWidth?: number; // Ancho máximo para optimización
  maxHeight?: number; // Alto máximo para optimización
  quality?: number; // Calidad de compresión (0-100)
}

// Resultado del procesamiento de una imagen
export interface ImageProcessResult {
  originalUrl: string;
  storedPath?: string;
  success: boolean;
  error?: string;
  size?: number; // Tamaño en bytes
  format?: string; // Formato de la imagen
  width?: number; // Ancho de la imagen
  height?: number; // Alto de la imagen
}

// Configuración para el scraper
export interface ScraperConfig {
  imageProcessor?: ImageProcessorConfig;
  useCache?: boolean; // Si se debe usar caché
  cacheTTL?: number; // Tiempo de vida de la caché en ms
  userAgent?: string; // User agent para las solicitudes
  timeout?: number; // Timeout para las solicitudes en ms
  retries?: number; // Número de reintentos para solicitudes fallidas
  logLevel?: 'debug' | 'info' | 'warn' | 'error'; // Nivel de logging
} 