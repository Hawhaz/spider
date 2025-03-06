import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrapeProperty, isValidPropertyUrl } from '../propertyScraper';
import { detectPortal } from '../portalDetector';
import { fetchHtmlWithRetries } from '../scraperUtils';
import { processImages } from '../imageProcessor';
import { PortalType } from '../portalDetector';

// Mock de las dependencias
vi.mock('../scraperUtils', () => ({
  fetchHtmlWithRetries: vi.fn(),
  extractJsonLd: vi.fn().mockReturnValue([]),
  extractMetadata: vi.fn().mockReturnValue({}),
  generateIdFromUrl: vi.fn().mockReturnValue('test-id'),
}));

vi.mock('../portalDetector', () => ({
  detectPortal: vi.fn(),
  getPortalName: vi.fn().mockImplementation((type: PortalType) => {
    const names: Record<string, string> = {
      'century21': 'Century 21 México',
      'unknown': 'Portal Desconocido'
    };
    return names[type] || 'Portal Desconocido';
  }),
}));

vi.mock('../imageProcessor', () => ({
  processImages: vi.fn(),
}));

// HTML de ejemplo para pruebas
const mockHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Casa en Venta en Coyoacán</title>
  <meta name="description" content="Hermosa casa en venta en Coyoacán">
</head>
<body>
  <h1>Casa en Venta en Coyoacán</h1>
  <div class="price">$5,000,000 MXN</div>
  <div class="location">Coyoacán, Ciudad de México</div>
  <div class="description">
    Hermosa casa con 3 recámaras, 2 baños, jardín y estacionamiento para 2 autos.
  </div>
  <div class="gallery">
    <img src="https://example.com/image1.jpg">
    <img src="https://example.com/image2.jpg">
  </div>
</body>
</html>
`;

describe('Property Scraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configurar mocks por defecto
    (fetchHtmlWithRetries as any).mockResolvedValue(mockHtml);
    (detectPortal as any).mockReturnValue('century21');
    (processImages as any).mockResolvedValue([
      { originalUrl: 'https://example.com/image1.jpg', storedPath: 'images/test1.jpg', success: true },
      { originalUrl: 'https://example.com/image2.jpg', storedPath: 'images/test2.jpg', success: true }
    ]);
  });
  
  afterEach(() => {
    vi.resetAllMocks();
  });
  
  describe('isValidPropertyUrl', () => {
    it('debería validar URLs correctas', () => {
      (detectPortal as any).mockReturnValue('century21');
      expect(isValidPropertyUrl('https://century21mexico.com/propiedades/casa-1')).toBe(true);
    });
    
    it('debería rechazar URLs inválidas', () => {
      (detectPortal as any).mockReturnValue('unknown');
      expect(isValidPropertyUrl('https://example.com/not-property')).toBe(false);
    });
    
    it('debería rechazar URLs no HTTP/HTTPS', () => {
      expect(isValidPropertyUrl('ftp://example.com/property')).toBe(false);
    });
    
    it('debería manejar errores en la URL', () => {
      expect(isValidPropertyUrl('invalid-url')).toBe(false);
    });
  });
  
  describe('scrapeProperty', () => {
    it('debería extraer datos correctamente de una propiedad', async () => {
      // Configurar mock del extractor
      const mockExtractor = {
        name: 'Test Extractor',
        canHandle: vi.fn().mockReturnValue(true),
        extract: vi.fn().mockResolvedValue({
          descripcion: 'Hermosa casa con 3 recámaras',
          caracteristicas: { 'Recámaras': '3', 'Baños': '2' },
          resumen: 'Casa en venta',
          imagenes: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
          precio: { mxn: '$5,000,000 MXN', usd: '' },
          ubicacion: 'Coyoacán, Ciudad de México',
          url: 'https://century21mexico.com/propiedades/casa-1',
          tipo: 'casa',
          operacion: 'venta',
          detalles: {
            recamaras: '3',
            banos: '2',
            estacionamientos: '2'
          },
          amenidades: ['Jardín', 'Seguridad'],
          portal: 'century21'
        })
      };
      
      // Reemplazar la lista de extractores con nuestro mock
      const originalExtractors = (global as any).extractors;
      (global as any).extractors = [mockExtractor];
      
      // Ejecutar el scraper
      const result = await scrapeProperty('https://century21mexico.com/propiedades/casa-1');
      
      // Restaurar extractores originales
      (global as any).extractors = originalExtractors;
      
      // Verificar resultado
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.portalDetected).toBe('Century 21 México');
      expect(result.imagePaths).toEqual(['images/test1.jpg', 'images/test2.jpg']);
      
      if (result.data) {
        expect(result.data.tipo).toBe('casa');
        expect(result.data.operacion).toBe('venta');
        expect(result.data.precio.mxn).toBe('$5,000,000 MXN');
        expect(result.data.ubicacion).toBe('Coyoacán, Ciudad de México');
      }
      
      // Verificar que se llamaron las funciones correctas
      expect(fetchHtmlWithRetries).toHaveBeenCalledWith(
        'https://century21mexico.com/propiedades/casa-1',
        expect.any(Object)
      );
      expect(detectPortal).toHaveBeenCalledWith('https://century21mexico.com/propiedades/casa-1', mockHtml);
      expect(mockExtractor.canHandle).toHaveBeenCalledWith('https://century21mexico.com/propiedades/casa-1', mockHtml);
      expect(mockExtractor.extract).toHaveBeenCalledWith(mockHtml, 'https://century21mexico.com/propiedades/casa-1');
      expect(processImages).toHaveBeenCalled();
    });
    
    it('debería manejar errores cuando no hay extractores compatibles', async () => {
      // Configurar mock para que ningún extractor sea compatible
      const mockExtractor = {
        name: 'Test Extractor',
        canHandle: vi.fn().mockReturnValue(false),
        extract: vi.fn()
      };
      
      // Reemplazar la lista de extractores con nuestro mock
      const originalExtractors = (global as any).extractors;
      (global as any).extractors = [mockExtractor];
      
      // Ejecutar el scraper
      const result = await scrapeProperty('https://example.com/property');
      
      // Restaurar extractores originales
      (global as any).extractors = originalExtractors;
      
      // Verificar resultado
      expect(result.success).toBe(false);
      expect(result.error).toContain('No se encontró un extractor compatible');
      expect(result.portalDetected).toBe('Century 21 México');
    });
    
    it('debería manejar errores en la descarga del HTML', async () => {
      // Simular error en la descarga
      (fetchHtmlWithRetries as any).mockRejectedValue(new Error('Error de conexión'));
      
      // Ejecutar el scraper
      const result = await scrapeProperty('https://example.com/property');
      
      // Verificar resultado
      expect(result.success).toBe(false);
      expect(result.error).toContain('Error al extraer datos: Error de conexión');
    });
    
    it('debería manejar errores en el procesamiento de imágenes', async () => {
      // Configurar mock del extractor
      const mockExtractor = {
        name: 'Test Extractor',
        canHandle: vi.fn().mockReturnValue(true),
        extract: vi.fn().mockResolvedValue({
          descripcion: 'Hermosa casa',
          caracteristicas: {},
          resumen: 'Casa en venta',
          imagenes: ['https://example.com/image1.jpg'],
          precio: { mxn: '$5,000,000 MXN', usd: '' },
          ubicacion: 'Coyoacán',
          url: 'https://example.com/property',
          portal: 'century21'
        })
      };
      
      // Simular error en el procesamiento de imágenes
      (processImages as any).mockRejectedValue(new Error('Error al procesar imágenes'));
      
      // Reemplazar la lista de extractores con nuestro mock
      const originalExtractors = (global as any).extractors;
      (global as any).extractors = [mockExtractor];
      
      // Ejecutar el scraper
      const result = await scrapeProperty('https://example.com/property');
      
      // Restaurar extractores originales
      (global as any).extractors = originalExtractors;
      
      // Verificar resultado
      expect(result.success).toBe(true); // El scraping sigue siendo exitoso
      expect(result.data).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Error al procesar imágenes: Error al procesar imágenes');
    });
  });
}); 