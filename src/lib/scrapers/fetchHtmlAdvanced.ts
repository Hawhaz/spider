import puppeteer from 'puppeteer';
import { ScraperConfig } from './propertyScraperTypes';
import { fetchHtmlWithRetries } from './scraperUtils';

/**
 * Descarga HTML utilizando Puppeteer para sitios que requieren JavaScript
 * Especialmente útil para sitios como Century21 que cargan imágenes dinámicamente
 */
export async function fetchHtmlWithPuppeteer(
  url: string,
  config: Partial<ScraperConfig> = {}
): Promise<string> {
  console.log(`Descargando HTML con Puppeteer: ${url}`);
  
  // Por defecto, intentamos con métodos normales primero
  try {
    const htmlNormal = await fetchHtmlWithRetries(url, config);
    
    // Si el HTML contiene suficiente contenido, lo usamos
    if (htmlNormal.includes('application/ld+json') && 
        htmlNormal.includes('property-images') && 
        htmlNormal.length > 100000) {
      console.log('HTML descargado normalmente parece completo, no necesitamos Puppeteer');
      return htmlNormal;
    } else {
      console.log('HTML descargado normalmente parece incompleto, intentando con Puppeteer...');
    }
  } catch (error) {
    console.log(`Error al descargar HTML normalmente: ${error}, intentando con Puppeteer...`);
  }
  
  // Si llega aquí, usamos Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Configurar User-Agent y viewport
    await page.setUserAgent(config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Configurar timeout
    const timeout = config.timeout || 30000;
    await page.setDefaultNavigationTimeout(timeout);
    
    // Interceptar requests para acelerar la carga
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();
      
      // Bloquear recursos innecesarios
      if (['font', 'media', 'favicon'].includes(resourceType) ||
          url.includes('google-analytics') || 
          url.includes('facebook') || 
          url.includes('analytics')) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Navegar a la URL
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout 
    });
    
    // Esperar a que se carguen elementos importantes
    await page.waitForSelector('img', { timeout });
    
    // Hacer scroll para activar carga lazy
    await autoScroll(page);
    
    // Esperar un poco más para asegurar que todo se cargue
    await page.waitForTimeout(2000);
    
    // Extraer HTML completo
    const content = await page.content();
    console.log(`HTML obtenido con Puppeteer: ${content.length} bytes`);
    
    // Buscar si hay un script que contenga thumbnailUrls o similar
    const scriptData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script:not([src])'));
      let imagesData = null;
      
      for (const script of scripts) {
        const content = script.textContent || '';
        if (content.includes('thumbnailUrls') || 
            content.includes('imageUrls') || 
            content.includes('images')) {
          try {
            // Buscar objetos o arrays que contengan URLs de imágenes
            const matches = content.match(/\[\s*"https?:\/\/[^"]+\.(jpe?g|png|gif|webp)"[^\]]*\]/g);
            if (matches && matches.length > 0) {
              return { 
                type: 'image_array', 
                content: matches[0],
                source: 'script_content_match'
              };
            }
            
            // Buscar objeto JSON
            if (content.includes('{') && content.includes('}')) {
              return {
                type: 'json_object',
                content: content,
                source: 'script_full_content'
              };
            }
          } catch (e) {
            console.error('Error al extraer datos de script:', e);
          }
        }
      }
      
      return imagesData;
    });
    
    if (scriptData) {
      console.log(`Datos adicionales encontrados con Puppeteer: ${scriptData.type} desde ${scriptData.source}`);
      // Inyectar estos datos en el HTML para que estén disponibles para el extractor
      const scriptTag = `<script id="puppeteer-extracted-data" type="application/json">${JSON.stringify(scriptData)}</script>`;
      return content.replace('</head>', `${scriptTag}</head>`);
    }
    
    return content;
  } finally {
    await browser.close();
  }
}

/**
 * Función para hacer auto-scroll en la página para activar carga lazy
 */
async function autoScroll(page: puppeteer.Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
} 