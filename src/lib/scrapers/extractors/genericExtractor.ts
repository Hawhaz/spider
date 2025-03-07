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
    
    // INICIO: IMPLEMENTACIÓN ESTRICTA DE EXTRACCIÓN DE IMÁGENES
    let imagenes: string[] = [];
    
    // Método principal: Extraer SOLO y EXCLUSIVAMENTE del array "image" del JSON-LD de tipo "RealEstateListing"
    const realEstateJsonLd = jsonLdArray.find(item => 
      typeof item === 'object' && 
      item !== null && 
      item['@type'] === 'RealEstateListing' &&
      Array.isArray(item.image)
    ) as JsonLdData | undefined;
    
    if (realEstateJsonLd && Array.isArray(realEstateJsonLd.image)) {
      // Filtrar rigurosamente para asegurar solo imágenes de propiedades
      const propertyImages = realEstateJsonLd.image
        .filter((url: unknown): url is string => {
          // Verificar que sea string
          if (typeof url !== 'string') return false;
          
          // Solo incluir URLs específicas de propiedades, excluir logos y perfiles
          return url.includes('/propiedades/') && 
                 !url.includes('/logos/') && 
                 !url.includes('/usuarios/');
        });
      
      // Crear un mapa para eliminar duplicados por nombre de archivo
      const uniqueImagesMap = new Map<string, string>();
      
      for (const imageUrl of propertyImages) {
        try {
          // Extraer el nombre base del archivo de la URL
          const urlObj = new URL(imageUrl);
          const pathname = urlObj.pathname;
          const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
          
          // Solo agregamos si no existe ya este nombre de archivo
          if (filename && !uniqueImagesMap.has(filename)) {
            uniqueImagesMap.set(filename, imageUrl);
          }
        } catch (e) {
          // Si hay un error al procesar la URL, simplemente la saltamos
          continue;
        }
      }
      
      // Convertir el mapa a array
      imagenes = Array.from(uniqueImagesMap.values());
      
      console.log(`[Extractor Genérico] Se extrajeron exactamente ${imagenes.length} imágenes únicas de propiedades.`);
    }
    
    // SOLO como fallback, si no se encontraron imágenes, usar Open Graph
    if (imagenes.length === 0 && typeof metadata['og:image'] === 'string') {
      const ogImage = metadata['og:image'];
      if (ogImage.includes('/propiedades/') && 
          !ogImage.includes('/logos/') && 
          !ogImage.includes('/usuarios/')) {
        imagenes.push(ogImage);
        console.log(`[Extractor Genérico] Fallback: Se extrajo 1 imagen de Open Graph metadata`);
      }
    }
    // FIN: IMPLEMENTACIÓN ESTRICTA DE EXTRACCIÓN DE IMÁGENES
    
    // 2. Extraer precio
    let precioMXN = '';
    let precioUSD = '';
    
    // a) Buscar en JSON-LD
    if (realEstateJsonLd?.offers?.price && realEstateJsonLd?.offers?.priceCurrency) {
      if (realEstateJsonLd.offers.priceCurrency === 'MXN') {
        precioMXN = `$${realEstateJsonLd.offers.price} MXN`;
      } else if (realEstateJsonLd.offers.priceCurrency === 'USD') {
        precioUSD = `$${realEstateJsonLd.offers.price} USD`;
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
    if (realEstateJsonLd?.address) {
      const address = realEstateJsonLd.address;
      if (typeof address === 'string') {
        ubicacion = address;
      } else if (typeof address === 'object' && address !== null) {
        const addressParts = [
          address.streetAddress,
          address.addressLocality,
          address.addressRegion,
          address.postalCode
        ].filter(part => typeof part === 'string' && part.trim() !== '');
        
        if (addressParts.length > 0) {
          ubicacion = addressParts.join(', ');
        }
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
    if (realEstateJsonLd?.description && typeof realEstateJsonLd.description === 'string') {
      descripcion = realEstateJsonLd.description;
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
      const elements = $(selector).find('li, div, span, p');
      if (elements.length) {
        elements.each((_, elem) => {
          const text = $(elem).text().trim();
          if (text) {
            // Detectar si es una característica con valor
            const match = text.match(/^(.+?):\s*(.+)$/);
            if (match) {
              const key = cleanText(match[1]);
              const value = cleanText(match[2]);
              
              // Asignar a detalles o características según el tipo
              if (['metros', 'área', 'superficie', 'm2', 'baños', 'recámaras', 'habitaciones', 'pisos'].some(keyword => 
                typeof key === 'string' && typeof keyword === 'string' && 
                key.toLowerCase().includes(keyword.toLowerCase())
              )) {
                detalles[key] = value;
              } else {
                caracteristicas[key] = value;
              }
            } else {
              // Es una característica sin valor
              caracteristicas[text] = 'Sí';
            }
          }
        });
      }
    }
    
    // b) Buscar elementos específicos de características comunes
    const specificFeatures = [
      { selector: '.bedrooms, [data-bedrooms], .habitaciones, .recamaras', key: 'Habitaciones' },
      { selector: '.bathrooms, [data-bathrooms], .banos', key: 'Baños' },
      { selector: '.garages, [data-garages], .estacionamientos', key: 'Estacionamientos' },
      { selector: '.area, [data-area], .superficie, .metros', key: 'Área' }
    ];
    
    for (const { selector, key } of specificFeatures) {
      const element = $(selector).first();
      if (element.length) {
        // Extraer solo números si es posible
        const numValue = extractNumber(element.text());
        if (numValue) {
          detalles[key] = numValue.toString();
        } else {
          detalles[key] = element.text().trim();
        }
      }
    }
    
    // c) Extraer cualquier dato adicional del JSON-LD
    if (realEstateJsonLd) {
      // Extraer detalles específicos que podrían estar en el JSON-LD
      const detailsMapping: Record<string, string> = {
        'numberOfRooms': 'Habitaciones',
        'numberOfBedrooms': 'Recámaras',
        'numberOfBathroomsTotal': 'Baños',
        'floorSize': 'Área Construida',
        'lotSize': 'Tamaño Terreno'
      };
      
      for (const [jsonKey, displayKey] of Object.entries(detailsMapping)) {
        // Usar aserción de tipo para evitar errores de TypeScript
        const value = (realEstateJsonLd as Record<string, any>)[jsonKey];
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null && 'value' in value) {
            detalles[displayKey] = value.value.toString();
          } else if (typeof value === 'number' || typeof value === 'string') {
            detalles[displayKey] = value.toString();
          }
        }
      }
    }
    
    // 6. Extraer título
    let titulo = '';
    
    // a) Buscar en JSON-LD
    if (realEstateJsonLd?.name && typeof realEstateJsonLd.name === 'string') {
      titulo = realEstateJsonLd.name;
    }
    
    // b) Buscar en metadatos
    if (!titulo && metadata['og:title']) {
      titulo = metadata['og:title'];
    }
    
    if (!titulo && metadata['title']) {
      titulo = metadata['title'];
    }
    
    // c) Buscar en elementos H1, H2
    if (!titulo) {
      const h1 = $('h1').first();
      if (h1.length) {
        titulo = h1.text().trim();
      } else {
        const h2 = $('h2').first();
        if (h2.length) {
          titulo = h2.text().trim();
        }
      }
    }
    
    // Construir el objeto de propiedad
    return {
      id: '', // Se generará después
      resumen: cleanText(titulo),
      descripcion: cleanText(descripcion),
      ubicacion: cleanText(ubicacion),
      precio: {
        mxn: precioMXN || '',
        usd: precioUSD || ''
      },
      caracteristicas,
      detalles,
      imagenes,
      url,
      portal: 'generic'
    };
  }
}; 