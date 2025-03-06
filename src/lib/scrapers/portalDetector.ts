import { extractDomain } from './scraperUtils';

// Tipos de portales inmobiliarios soportados
export type PortalType = 'century21' | 'inmuebles24' | 'lamudi' | 'vivanuncios' | 'propiedades.com' | 'unknown';

// Mapeo de dominios a tipos de portales
const PORTAL_DOMAINS: Record<string, PortalType> = {
  'century21mexico.com': 'century21',
  'century21.com.mx': 'century21',
  'inmuebles24.com': 'inmuebles24',
  'lamudi.com.mx': 'lamudi',
  'vivanuncios.com.mx': 'vivanuncios',
  'propiedades.com': 'propiedades.com'
};

// Patrones para detectar portales por contenido HTML
const PORTAL_PATTERNS: Record<PortalType, RegExp[]> = {
  'century21': [
    /century\s*21/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:site_name["']\s+(?:[^>]*?\s+)?content=["']Century\s*21["']/i
  ],
  'inmuebles24': [
    /inmuebles\s*24/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:site_name["']\s+(?:[^>]*?\s+)?content=["']Inmuebles24["']/i
  ],
  'lamudi': [
    /lamudi/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:site_name["']\s+(?:[^>]*?\s+)?content=["']Lamudi["']/i
  ],
  'vivanuncios': [
    /vivanuncios/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:site_name["']\s+(?:[^>]*?\s+)?content=["']Vivanuncios["']/i
  ],
  'propiedades.com': [
    /propiedades\.com/i,
    /<meta\s+(?:[^>]*?\s+)?property=["']og:site_name["']\s+(?:[^>]*?\s+)?content=["']Propiedades\.com["']/i
  ],
  'unknown': []
};

/**
 * Detecta el portal inmobiliario basado en la URL
 */
function detectPortalByUrl(url: string): PortalType {
  const domain = extractDomain(url);
  
  // Buscar coincidencias exactas
  if (PORTAL_DOMAINS[domain]) {
    return PORTAL_DOMAINS[domain];
  }
  
  // Buscar coincidencias parciales
  for (const [portalDomain, portalType] of Object.entries(PORTAL_DOMAINS)) {
    if (domain.includes(portalDomain) || portalDomain.includes(domain)) {
      return portalType;
    }
  }
  
  return 'unknown';
}

/**
 * Detecta el portal inmobiliario basado en el contenido HTML
 */
function detectPortalByHtml(html: string): PortalType {
  // Verificar cada portal
  for (const [portalType, patterns] of Object.entries(PORTAL_PATTERNS)) {
    if (portalType === 'unknown') continue;
    
    // Si algún patrón coincide, devolver el tipo de portal
    if (patterns.some(pattern => pattern.test(html))) {
      return portalType as PortalType;
    }
  }
  
  return 'unknown';
}

/**
 * Detecta el portal inmobiliario basado en la URL y el contenido HTML
 */
export function detectPortal(url: string, html: string): PortalType {
  // Primero intentar detectar por URL (más rápido y confiable)
  const portalByUrl = detectPortalByUrl(url);
  
  if (portalByUrl !== 'unknown') {
    return portalByUrl;
  }
  
  // Si no se pudo detectar por URL, intentar por contenido HTML
  return detectPortalByHtml(html);
}

/**
 * Obtiene el nombre amigable del portal
 */
export function getPortalName(portalType: PortalType): string {
  switch (portalType) {
    case 'century21':
      return 'Century 21 México';
    case 'inmuebles24':
      return 'Inmuebles24';
    case 'lamudi':
      return 'Lamudi México';
    case 'vivanuncios':
      return 'Vivanuncios';
    case 'propiedades.com':
      return 'Propiedades.com';
    default:
      return 'Portal Desconocido';
  }
} 