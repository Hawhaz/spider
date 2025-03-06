import * as cheerio from 'cheerio';
import { Propiedad, PortalExtractor, JsonLdData } from '../propertyScraperTypes';
import { cleanText, extractJsonLd, extractMetadata, extractNumber, extractPrice } from '../scraperUtils';

/**
 * Extractor genérico para portales inmobiliarios no reconocidos específicamente
 * Intenta extraer información básica utilizando patrones comunes y metadatos
 */
export const genericExtractor: PortalExtractor = {
  name: 'Extractor Genérico',
  
  /**
   * Este extractor puede manejar cualquier URL/HTML como fallback
   */
  canHandle(_url: string, _html: string): boolean {
    // Siempre devuelve true como último recurso
    return true;
  },
  
  /**
   * Extrae los datos de la propiedad del HTML utilizando patrones genéricos
   */
  async extract(html: string, url: string): Promise<Propiedad> {
    const $ = cheerio.load(html);
    
    // Extraer metadatos y JSON-LD para tener información adicional
    const metadata = extractMetadata(html);
    const jsonLdArray = extractJsonLd(html);
    
    // Buscar JSON-LD relacionado con propiedades inmobiliarias
    const jsonLd = jsonLdArray.find(item => 
      item['@type'] === 'RealEstateListing' || 
      item['@type'] === 'Product' || 
      item['@type'] === 'Place' ||
      item['@type'] === 'Residence' ||
      item['@type'] === 'ApartmentComplex'
    ) as JsonLdData || {};
    
    // 1. Extraer imágenes
    let imagenes: string[] = [];
    
    // a) Extraer imágenes del JSON-LD
    if (jsonLd.image) {
      if (Array.isArray(jsonLd.image)) {
        // Si es un array, añadir cada URL de imagen
        jsonLd.image.forEach(img => {
          if (typeof img === 'string' && img.trim()) {
            imagenes.push(img.trim());
          } else if (typeof img === 'object' && img !== null) {
            // Algunos JSON-LD usan objetos con propiedad 'url' para imágenes
            const imgObj = img as Record<string, any>;
            if (typeof imgObj.url === 'string' && imgObj.url.trim()) {
              imagenes.push(imgObj.url.trim());
            }
          }
        });
      } else if (typeof jsonLd.image === 'string' && (jsonLd.image as string).trim()) {
        // Si es una sola string
        imagenes.push((jsonLd.image as string).trim());
      } else if (typeof jsonLd.image === 'object' && jsonLd.image !== null) {
        // Si es un objeto (algunos formatos usan esto)
        const imgObj = jsonLd.image as Record<string, any>;
        if (typeof imgObj.url === 'string' && imgObj.url.trim()) {
          imagenes.push(imgObj.url.trim());
        }
      }
    }
    
    // b) Extraer imágenes de metadatos Open Graph
    if (metadata['og:image']) {
      imagenes.push(metadata['og:image']);
    }
    
    // c) Extraer imágenes de metadatos Twitter
    if (metadata['twitter:image']) {
      imagenes.push(metadata['twitter:image']);
    }
    
    // d) Buscar imágenes en la galería (patrones comunes)
    $('div.gallery img, div.carousel img, div.slider img, .photos img, .images img, .property-images img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src') || $(img).attr('data-lazy-src');
      if (src) imagenes.push(src);
    });
    
    // e) Buscar imágenes con atributos específicos
    $('img[alt*="propiedad"], img[alt*="inmueble"], img[alt*="casa"], img[alt*="departamento"], img[alt*="property"]').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src) imagenes.push(src);
    });
    
    // f) Buscar imágenes grandes (probablemente son de la propiedad)
    $('img').each((_, img) => {
      const width = parseInt($(img).attr('width') || '0', 10);
      const height = parseInt($(img).attr('height') || '0', 10);
      
      // Si la imagen es grande, probablemente es de la propiedad
      if (width > 400 || height > 400) {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src) imagenes.push(src);
      }
    });
    
    // Eliminar duplicados
    imagenes = [...new Set(imagenes)];
    
    // 2. Extraer precio
    let precioMXN = '';
    let precioUSD = '';
    
    // a) Buscar en JSON-LD
    if (jsonLd.offers?.price && jsonLd.offers?.priceCurrency) {
      if (jsonLd.offers.priceCurrency === 'MXN') {
        precioMXN = `$${jsonLd.offers.price} MXN`;
      } else if (jsonLd.offers.priceCurrency === 'USD') {
        precioUSD = `$${jsonLd.offers.price} USD`;
      }
    }
    
    // b) Buscar en metadatos
    if (!precioMXN && metadata['precio'] && metadata['moneda'] === 'MXN') {
      precioMXN = `$${metadata['precio']} MXN`;
    }
    
    if (!precioUSD && metadata['precio'] && metadata['moneda'] === 'USD') {
      precioUSD = `$${metadata['precio']} USD`;
    }
    
    // c) Buscar en elementos con clases/IDs comunes para precios
    const precioSelectors = [
      '.price', '.precio', '#price', '#precio', 
      '[itemprop="price"]', '[data-price]',
      '.property-price', '.listing-price',
      'span.price', 'div.price', 'h2.price', 'h3.price'
    ];
    
    for (const selector of precioSelectors) {
      const precioElem = $(selector).first();
      if (precioElem.length) {
        const precioText = precioElem.text().trim();
        
        // Determinar si es MXN o USD
        if (precioText.includes('MXN') || precioText.includes('$') && !precioText.includes('USD')) {
          precioMXN = precioText;
        } else if (precioText.includes('USD') || precioText.includes('US$') || precioText.includes('U$D')) {
          precioUSD = precioText;
        }
        
        if (precioMXN || precioUSD) break;
      }
    }
    
    // d) Buscar texto que parezca un precio
    if (!precioMXN && !precioUSD) {
      const precioRegex = /\$\s*[\d,.]+\s*(MXN|USD|pesos|dólares)?/gi;
      const bodyText = $('body').text();
      const matches = bodyText.match(precioRegex);
      
      if (matches && matches.length > 0) {
        // Asignar el primer precio encontrado
        const firstPrice = matches[0];
        if (firstPrice.includes('USD') || firstPrice.includes('dólares')) {
          precioUSD = firstPrice;
        } else {
          precioMXN = firstPrice;
        }
      }
    }
    
    // 3. Extraer ubicación
    let ubicacion = '';
    
    // a) Buscar en JSON-LD
    if (jsonLd.address) {
      const address = jsonLd.address;
      if (typeof address === 'string') {
        ubicacion = address;
      } else if (address.streetAddress) {
        ubicacion = [
          address.streetAddress,
          address.addressLocality,
          address.addressRegion,
          address.postalCode
        ].filter(Boolean).join(', ');
      }
    }
    
    // b) Buscar en metadatos
    if (!ubicacion && metadata['direccion']) {
      ubicacion = metadata['direccion'];
    }
    
    if (!ubicacion && metadata['og:locality']) {
      ubicacion = metadata['og:locality'];
    }
    
    // c) Buscar en elementos con atributos de ubicación
    const ubicacionSelectors = [
      '[itemprop="address"]', '.address', '.location', '.ubicacion',
      '.property-address', '.listing-address', '#address', '#location'
    ];
    
    for (const selector of ubicacionSelectors) {
      const ubicacionElem = $(selector).first();
      if (ubicacionElem.length) {
        ubicacion = ubicacionElem.text().trim();
        if (ubicacion) break;
      }
    }
    
    // d) Buscar elementos que contengan palabras clave de ubicación
    if (!ubicacion) {
      $('h1, h2, h3, h4, h5, p').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.includes('Ubicación:') || text.includes('Dirección:') || text.includes('Localización:')) {
          ubicacion = text.replace(/Ubicación:|Dirección:|Localización:/i, '').trim();
          return false; // Salir del bucle
        }
      });
    }
    
    // 4. Extraer descripción
    let descripcion = '';
    
    // a) Buscar en JSON-LD
    if (jsonLd.description) {
      descripcion = jsonLd.description;
    }
    
    // b) Buscar en metadatos
    if (!descripcion && metadata['og:description']) {
      descripcion = metadata['og:description'];
    }
    
    if (!descripcion && metadata['description']) {
      descripcion = metadata['description'];
    }
    
    // c) Buscar en elementos con atributos de descripción
    const descripcionSelectors = [
      '[itemprop="description"]', '.description', '.descripcion',
      '.property-description', '.listing-description', '#description'
    ];
    
    for (const selector of descripcionSelectors) {
      const descripcionElem = $(selector).first();
      if (descripcionElem.length) {
        descripcion = descripcionElem.text().trim();
        if (descripcion) break;
      }
    }
    
    // d) Buscar párrafos largos que podrían ser la descripción
    if (!descripcion) {
      $('p').each((_, elem) => {
        const text = $(elem).text().trim();
        if (text.length > 100) { // Párrafos largos probablemente son descripciones
          descripcion = text;
          return false; // Salir del bucle
        }
      });
    }
    
    // 5. Extraer características y detalles
    const caracteristicas: Record<string, string> = {};
    const detalles: Record<string, string> = {};
    
    // a) Buscar en elementos con clases/IDs comunes para características
    const caracteristicasSelectors = [
      '.features', '.caracteristicas', '.specs', '.details',
      '.property-features', '.listing-features', '#features', '#details'
    ];
    
    for (const selector of caracteristicasSelectors) {
      const container = $(selector);
      if (container.length) {
        // Buscar elementos li o div dentro del contenedor
        container.find('li, div').each((_, elem) => {
          const text = $(elem).text().trim();
          if (text.includes(':')) {
            const [key, value] = text.split(':', 2);
            caracteristicas[key.trim()] = value.trim();
          } else if (text) {
            caracteristicas[text] = 'Sí';
          }
        });
      }
    }
    
    // b) Buscar elementos con atributos específicos
    $('[data-feature], [data-spec], [data-detail]').each((_, elem) => {
      const keyAttr = $(elem).attr('data-feature') || $(elem).attr('data-spec') || $(elem).attr('data-detail');
      if (keyAttr) {
        const value = $(elem).text().trim();
        caracteristicas[keyAttr] = value;
      }
    });
    
    // c) Extraer detalles específicos (terreno, construcción, recámaras, baños, etc.)
    const detailsMap: Record<string, string[]> = {
      'terreno': ['terreno', 'superficie', 'lote', 'lot', 'land', 'area'],
      'construccion': ['construcción', 'construido', 'built', 'construction'],
      'recamaras': ['recámaras', 'habitaciones', 'dormitorios', 'bedrooms', 'rooms'],
      'banos': ['baños', 'bathrooms', 'wc'],
      'estacionamientos': ['estacionamientos', 'cocheras', 'parking', 'garage'],
      'antiguedad': ['antigüedad', 'edad', 'año', 'age', 'year built'],
      'niveles': ['niveles', 'pisos', 'plantas', 'floors', 'stories']
    };
    
    // Buscar en metadatos
    if (metadata['MT']) detalles.terreno = `${metadata['MT']} m²`;
    if (metadata['MC']) detalles.construccion = `${metadata['MC']} m²`;
    if (metadata['recamaras']) detalles.recamaras = metadata['recamaras'];
    if (metadata['banio'] || metadata['banos']) {
      const banioValue = metadata['banio'] || metadata['banos'];
      if (banioValue) {
        detalles.banos = banioValue;
      }
    }
    if (metadata['estacionamiento']) detalles.estacionamientos = metadata['estacionamiento'];
    
    // Buscar en características
    for (const [key, value] of Object.entries(caracteristicas)) {
      for (const [detailKey, keywords] of Object.entries(detailsMap)) {
        if (keywords.some(keyword => key.toLowerCase().includes(keyword))) {
          detalles[detailKey] = value;
          break;
        }
      }
    }
    
    // 6. Extraer tipo de propiedad y operación
    let tipo = '';
    let operacion = '';
    
    // a) Buscar en metadatos
    if (metadata['tipoInmueble']) {
      tipo = metadata['tipoInmueble'];
    }
    
    if (metadata['tipoOperacion']) {
      operacion = metadata['tipoOperacion'];
    }
    
    // b) Buscar en el título de la página
    const title = $('title').text() || metadata['og:title'] || '';
    
    // Detectar tipo de propiedad
    const tipoPatterns = [
      { pattern: /casa/i, value: 'casa' },
      { pattern: /departamento|apartamento/i, value: 'departamento' },
      { pattern: /terreno|lote/i, value: 'terreno' },
      { pattern: /oficina/i, value: 'oficina' },
      { pattern: /local/i, value: 'local' },
      { pattern: /bodega/i, value: 'bodega' }
    ];
    
    for (const { pattern, value } of tipoPatterns) {
      if (pattern.test(title) && !tipo) {
        tipo = value;
        break;
      }
    }
    
    // Detectar tipo de operación
    const operacionPatterns = [
      { pattern: /venta|compra|comprar/i, value: 'venta' },
      { pattern: /renta|alquiler|rentar/i, value: 'renta' }
    ];
    
    for (const { pattern, value } of operacionPatterns) {
      if (pattern.test(title) && !operacion) {
        operacion = value;
        break;
      }
    }
    
    // 7. Extraer resumen
    let resumen = '';
    
    // Buscar elementos que podrían contener un resumen
    const resumenSelectors = [
      '.summary', '.resumen', '.overview', '.property-summary',
      'h2 + p', 'h3 + p', '.property-overview p'
    ];
    
    for (const selector of resumenSelectors) {
      const resumenElem = $(selector).first();
      if (resumenElem.length) {
        resumen = resumenElem.text().trim();
        if (resumen) break;
      }
    }
    
    // Si no hay resumen, usar las primeras líneas de la descripción
    if (!resumen && descripcion) {
      const lines = descripcion.split('\n');
      if (lines.length > 0) {
        resumen = lines[0];
        if (lines.length > 1) {
          resumen += ' ' + lines[1];
        }
      }
    }
    
    // 8. Extraer amenidades
    const amenidades: string[] = [];
    
    // Buscar elementos que podrían contener amenidades
    const amenidadesSelectors = [
      '.amenities', '.amenidades', '.features', '.property-amenities',
      '.listing-amenities', '#amenities'
    ];
    
    for (const selector of amenidadesSelectors) {
      const container = $(selector);
      if (container.length) {
        container.find('li, div').each((_, elem) => {
          const text = $(elem).text().trim();
          if (text && !text.includes(':')) {
            amenidades.push(text);
          }
        });
      }
    }
    
    // Construir y devolver el objeto Propiedad
    return {
      descripcion,
      caracteristicas,
      resumen,
      imagenes,
      precio: {
        mxn: precioMXN,
        usd: precioUSD
      },
      ubicacion,
      url,
      tipo,
      operacion,
      detalles,
      amenidades,
      portal: 'unknown'
    };
  }
}; 