# Scraper de Propiedades Inmobiliarias

Este módulo proporciona un scraper avanzado para extraer información de propiedades inmobiliarias de diferentes portales web. Está diseñado para ser modular, extensible y robusto, con capacidades para manejar diferentes portales inmobiliarios y procesar imágenes.

## Características

- **Detección automática de portales**: Identifica automáticamente el portal inmobiliario basado en la URL o el contenido HTML.
- **Extractores específicos por portal**: Implementa extractores especializados para cada portal inmobiliario soportado.
- **Extractor genérico**: Proporciona un extractor de fallback para portales no reconocidos específicamente.
- **Procesamiento de imágenes**: Descarga, valida, optimiza y almacena imágenes en Supabase.
- **Procesamiento en paralelo**: Permite procesar múltiples propiedades o imágenes en paralelo.
- **Manejo de errores robusto**: Implementa reintentos, timeouts y manejo de errores detallado.
- **Configuración flexible**: Permite personalizar el comportamiento del scraper según las necesidades.

## Estructura del Módulo

```
src/lib/scrapers/
├── index.ts                    # Punto de entrada y exportaciones
├── propertyScraper.ts          # Funciones principales del scraper
├── propertyScraperTypes.ts     # Definiciones de tipos
├── scraperUtils.ts             # Utilidades generales
├── portalDetector.ts           # Detector de portales inmobiliarios
├── imageProcessor.ts           # Procesador de imágenes
├── extractors/                 # Extractores específicos por portal
│   ├── century21Extractor.ts   # Extractor para Century21 México
│   └── genericExtractor.ts     # Extractor genérico (fallback)
└── examples/                   # Ejemplos de uso
    └── scrapeExample.ts        # Ejemplos de uso del scraper
```

## Portales Soportados

- Century21 México
- Soporte genérico para otros portales inmobiliarios

## Uso Básico

```typescript
import { scrapeProperty, isValidPropertyUrl } from '@/lib/scrapers';

async function example() {
  const url = 'https://century21mexico.com/propiedades/casa-en-venta...';
  
  // Verificar si la URL es válida
  if (!isValidPropertyUrl(url)) {
    console.error('URL inválida');
    return;
  }
  
  // Extraer datos de la propiedad
  const result = await scrapeProperty(url);
  
  if (result.success && result.data) {
    console.log('Propiedad extraída:', result.data);
    console.log('Imágenes procesadas:', result.imagePaths);
  } else {
    console.error('Error:', result.error);
  }
}
```

## Procesamiento de Múltiples Propiedades

```typescript
import { scrapeMultipleProperties } from '@/lib/scrapers';

async function example() {
  const urls = [
    'https://century21mexico.com/propiedades/casa-1',
    'https://century21mexico.com/propiedades/casa-2',
    'https://century21mexico.com/propiedades/casa-3'
  ];
  
  // Extraer datos de múltiples propiedades (3 en paralelo)
  const results = await scrapeMultipleProperties(urls, {}, 3);
  
  // Procesar resultados
  const exitosos = results.filter(r => r.success).length;
  console.log(`Propiedades procesadas: ${results.length}, Exitosas: ${exitosos}`);
}
```

## Configuración Personalizada

```typescript
import { scrapeProperty, ScraperConfig } from '@/lib/scrapers';

async function example() {
  const url = 'https://century21mexico.com/propiedades/casa-en-venta...';
  
  // Configuración personalizada
  const config: Partial<ScraperConfig> = {
    imageProcessor: {
      maxConcurrent: 5,        // Máximo de descargas concurrentes
      maxRetries: 3,           // Reintentos para imágenes fallidas
      optimizeImages: true,    // Optimizar imágenes
      maxWidth: 1200,          // Ancho máximo
      maxHeight: 1200,         // Alto máximo
      quality: 80              // Calidad de compresión
    },
    useCache: true,            // Usar caché
    cacheTTL: 86400000,        // TTL de caché (24 horas)
    userAgent: 'Mozilla/5.0...', // User agent personalizado
    timeout: 30000,            // Timeout para solicitudes (30s)
    retries: 3,                // Reintentos para solicitudes fallidas
    logLevel: 'info'           // Nivel de logging
  };
  
  // Extraer datos con configuración personalizada
  const result = await scrapeProperty(url, config);
  
  // Procesar resultado...
}
```

## Extendiendo el Scraper

Para añadir soporte para un nuevo portal inmobiliario:

1. Crear un nuevo archivo en la carpeta `extractors/` (ej: `lamudi.ts`)
2. Implementar la interfaz `PortalExtractor`
3. Añadir el nuevo extractor a la lista en `propertyScraper.ts`

Ejemplo:

```typescript
// extractors/lamudiExtractor.ts
import { Propiedad, PortalExtractor } from '../propertyScraperTypes';

export const lamudiExtractor: PortalExtractor = {
  name: 'Lamudi',
  
  canHandle(url: string, html: string): boolean {
    return url.includes('lamudi.com.mx') || html.includes('Lamudi');
  },
  
  async extract(html: string, url: string): Promise<Propiedad> {
    // Implementación específica para Lamudi
    // ...
    
    return propiedad;
  }
};

// Luego en propertyScraper.ts
const extractors = [
  century21Extractor,
  lamudiExtractor, // Añadir el nuevo extractor
  genericExtractor, // Siempre debe ser el último
];
```

## Manejo de Errores

El scraper implementa un manejo de errores robusto:

- Reintentos automáticos para solicitudes fallidas
- Timeouts configurables
- Advertencias para problemas no críticos
- Información detallada de errores

Los resultados incluyen:

- `success`: Indica si la extracción fue exitosa
- `error`: Mensaje de error detallado (si hubo un error)
- `warnings`: Advertencias no críticas
- `processingTime`: Tiempo de procesamiento en ms

## Rendimiento

El scraper está optimizado para rendimiento:

- Procesamiento en paralelo de múltiples propiedades
- Descarga concurrente de imágenes
- Optimización de imágenes para reducir tamaño
- Caché configurable para reducir solicitudes repetidas

## Dependencias

- cheerio: Para parsear y manipular HTML
- axios: Para realizar solicitudes HTTP
- sharp: Para procesamiento y optimización de imágenes
- Supabase: Para almacenamiento de imágenes y datos

## Licencia

Este módulo es parte del proyecto ListUp y está sujeto a sus términos de licencia. 