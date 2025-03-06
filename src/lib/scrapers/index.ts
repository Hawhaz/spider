// Exportar tipos
export * from './propertyScraperTypes';

// Exportar funciones principales
export { 
  scrapeProperty, 
  scrapeMultipleProperties, 
  isValidPropertyUrl,
  DEFAULT_SCRAPER_CONFIG
} from './propertyScraper';

// Exportar función de compatibilidad
export { scrapeUrl } from './compatibility';

// Exportar utilidades
export {
  detectPortal,
  getPortalName
} from './portalDetector';

// Exportar procesador de imágenes
export {
  processImages
} from './imageProcessor';

// Exportar funciones de base de datos
export {
  saveScrapedProperty
} from './database';

// Exportar utilidades generales
export {
  fetchHtmlWithRetries,
  cleanText,
  extractNumber,
  extractPrice,
  extractDomain,
  normalizeUrl,
  toAbsoluteUrl,
  extractMetadata,
  extractJsonLd,
  generateIdFromUrl
} from './scraperUtils'; 