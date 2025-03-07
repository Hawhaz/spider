import * as cheerio from 'cheerio';
import { Propiedad, PortalExtractor, JsonLdData } from '../propertyScraperTypes';
import { cleanText, extractJsonLd, extractMetadata, extractNumber, extractPrice } from '../scraperUtils';

/**
 * Extractor específico para Century21 México
 */
export const century21Extractor: PortalExtractor = {
  name: 'Century 21 México',
  
  /**
   * Verifica si este extractor puede manejar la URL y el HTML proporcionados
   */
  canHandle(url: string, html: string): boolean {
    // Verificar por URL
    if (url.includes('century21mexico.com') || url.includes('century21.com.mx')) {
      return true;
    }
    
    // Verificar por contenido HTML
    const $ = cheerio.load(html);
    
    // Buscar elementos específicos de Century21
    const hasCentury21Logo = $('img[src*="century21"], img[alt*="Century21"], img[alt*="CENTURY21"]').length > 0;
    const hasCentury21Meta = $('meta[content*="Century21"], meta[content*="CENTURY21"]').length > 0;
    const hasCentury21Text = html.includes('Century21') || html.includes('CENTURY21') || html.includes('Century 21');
    
    return hasCentury21Logo || hasCentury21Meta || hasCentury21Text;
  },
  
  /**
   * Extrae los datos de la propiedad del HTML
   */
  async extract(html: string, url: string): Promise<Propiedad> {
    const $ = cheerio.load(html);
    
    // Extraer metadatos y JSON-LD para tener información adicional
    const metadata = extractMetadata(html);
    console.log('Metadatos extraídos para Century21:', Object.keys(metadata).length, 'entradas');
    
    // Si hay una imagen en el metadato og:image, la mostramos para depuración
    if (metadata['og:image']) {
      console.log('Imagen encontrada en metadatos og:image:', metadata['og:image']);
    }
    
    const jsonLdArray = extractJsonLd(html);
    console.log('JSON-LD extraído para Century21, entradas:', jsonLdArray.length);
    
    const jsonLd = jsonLdArray.find(item => item['@type'] === 'RealEstateListing') as JsonLdData || {};
    console.log('¿Se encontró JSON-LD de tipo RealEstateListing?', Object.keys(jsonLd).length > 0 ? 'Sí' : 'No');
    
    // 1. Extraer imágenes de todas las fuentes posibles
    const imageSet = new Set<string>(); // Usamos Set para evitar duplicados
    
    console.log(`Extractor Century21: Encontrados ${jsonLdArray.length} objetos JSON-LD`);
    
    // IMPLEMENTACIÓN MEJORADA: Extraer SOLO imágenes de propiedades del JSON-LD
    if (jsonLd && jsonLd['@type'] === 'RealEstateListing' && Array.isArray(jsonLd.image)) {
      console.log(`Extractor Century21: Encontradas ${jsonLd.image.length} imágenes en array JSON-LD`);
      
      // Filtrar para incluir solo URLs de propiedades
      const propertyImages = jsonLd.image
        .filter((img: unknown): img is string => {
          return typeof img === 'string' && 
                 img.includes('/propiedades/') && 
                 !img.includes('/logos/') && 
                 !img.includes('/usuarios/');
        });
      
      console.log(`Después de filtrar, quedan ${propertyImages.length} imágenes de propiedades`);
      
      // Crear un mapa para eliminar duplicados basados en el nombre del archivo
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
      
      // Convertir el mapa a array y añadir al conjunto
      const uniqueImages = Array.from(uniqueImagesMap.values());
      uniqueImages.forEach(url => imageSet.add(url));
      
      console.log(`Después de eliminar duplicados, quedan ${uniqueImages.length} imágenes únicas`);
    } else {
      console.log('No se encontró JSON-LD de tipo RealEstateListing con array de imágenes');
      
      // FALLBACK: Solo si no encontramos imágenes en el JSON-LD principal, usar Open Graph
      if (metadata['og:image'] && 
          typeof metadata['og:image'] === 'string' &&
          metadata['og:image'].includes('/propiedades/') && 
          !metadata['og:image'].includes('/logos/') && 
          !metadata['og:image'].includes('/usuarios/')) {
        console.log(`Añadiendo imagen de Open Graph como fallback: ${metadata['og:image']}`);
        imageSet.add(metadata['og:image']);
      }
    }
    
    // Convertir el Set a array y filtrar URLs vacías o inválidas
    const imagenes: string[] = Array.from(imageSet)
      .filter(url => !!url && url.trim().length > 0)
      .filter(url => url.startsWith('http')); // Asegurar que son URLs absolutas
    
    // Log de resultado final
    console.log(`Total de imágenes encontradas: ${imagenes.length}`);
    
    // 2. Extraer precio
    let precioMXN = '';
    let precioUSD = '';
    
    // a) Buscar en el elemento principal de precio
    const precioElem = $("h6.text-muted.fs-3.fw-bold");
    if (precioElem.length > 0) {
      precioMXN = precioElem.contents().first().text().trim();
      
      // Buscar precio en USD (generalmente en un span dentro del elemento de precio)
      const usdElem = precioElem.find("span.fs-5.small, span");
      if (usdElem.length) {
        precioUSD = usdElem.text().replace("/", "").trim();
      }
    }
    
    // b) Si no se encontró, buscar en la sección de características
    if (!precioMXN) {
      $("div.col-sm-12.col-md-6.my-1").each((_, elem) => {
        const text = $(elem).text();
        if (text.includes("Precio de Venta:")) {
          const match = text.match(/Precio de Venta:\s*([^<]+)/);
          if (match && match[1]) {
            precioMXN = match[1].trim();
          }
        }
      });
    }
    
    // c) Si aún no se encontró, buscar en la tarjeta lateral
    if (!precioMXN) {
      const lateralPrecio = $("div.col-sm-12.h5").text().trim();
      if (lateralPrecio) {
        precioMXN = lateralPrecio;
      }
    }
    
    // d) Si aún no se encontró, buscar en los metadatos
    if (!precioMXN && metadata['precio'] && metadata['moneda']) {
      precioMXN = `${metadata['precio']} ${metadata['moneda']}`;
    }
    
    // e) Si aún no se encontró, buscar en JSON-LD
    if (!precioMXN && jsonLd.offers?.price && jsonLd.offers?.priceCurrency) {
      precioMXN = `${jsonLd.offers.price} ${jsonLd.offers.priceCurrency}`;
    }
    
    // 3. Extraer ubicación
    let ubicacion = '';
    
    // a) Buscar en la sección de mapa
    const ubicacionMapa = $("div#mapa div[itemprop='address'] span").text().trim();
    if (ubicacionMapa) {
      ubicacion = ubicacionMapa;
    }
    
    // b) Si no se encontró, buscar en la sección de ubicación
    if (!ubicacion) {
      $("h5.card-title").each((_, titulo) => {
        if ($(titulo).text().includes("Ubicación")) {
          const nextElem = $(titulo).next();
          if (nextElem.length) {
            ubicacion = nextElem.text().trim();
          }
        }
      });
    }
    
    // c) Si aún no se encontró, buscar en los metadatos
    if (!ubicacion && metadata['direccion']) {
      ubicacion = metadata['direccion'];
    }
    
    // d) Si aún no se encontró, buscar en JSON-LD
    if (!ubicacion && jsonLd.address) {
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
    
    // 4. Extraer tipo de propiedad y operación
    let tipo = '';
    let operacion = '';
    
    // a) Buscar en las características
    $("div.col-sm-12.col-md-6.my-1").each((_, elem) => {
      const text = $(elem).text();
      if (text.includes("Tipo:")) {
        const match = text.match(/Tipo:\s*([^<]+)/);
        if (match && match[1]) {
          tipo = match[1].trim();
        }
      }
    });
    
    // b) Si no se encontró, buscar en el título
    if (!tipo) {
      const titulo = $("h1.card-title.text-primary.h5").text().trim();
      if (titulo) {
        // Extraer tipo y operación del título (ej: "Venta de Casa en Condominio en...")
        const matchTipo = titulo.match(/(?:Venta|Renta)\s+de\s+([^en]+)\s+en/i);
        if (matchTipo && matchTipo[1]) {
          tipo = matchTipo[1].trim();
        }
        
        const matchOperacion = titulo.match(/^(\w+)\s+de/i);
        if (matchOperacion && matchOperacion[1]) {
          operacion = matchOperacion[1].toLowerCase();
        }
      }
    }
    
    // c) Si aún no se encontró, buscar en los metadatos
    if (!tipo && metadata['tipoInmueble']) {
      tipo = metadata['tipoInmueble'];
    }
    
    if (!operacion && metadata['tipoOperacion']) {
      operacion = metadata['tipoOperacion'];
    }
    
    // 5. Extraer descripción completa
    let descripcion = '';
    
    // a) Buscar en el elemento con estilo white-space: pre-wrap
    const descripcionElem = $("div.card-body.pt-0 div.col-12.pt-4 p.text-muted[style*='white-space: pre-wrap'], div.card-body p.text-muted[style*='white-space: pre-wrap']");
    if (descripcionElem.length) {
      descripcion = descripcionElem.text().trim();
    }
    
    // b) Si no se encontró, buscar en cualquier párrafo de la descripción
    if (!descripcion) {
      const descripcionParrafo = $("div.card-body.pt-0 div.col-12.pt-4 p.text-muted, div.card-body p.text-muted").first().text().trim();
      if (descripcionParrafo) {
        descripcion = descripcionParrafo;
      }
    }
    
    // c) Si aún no se encontró, buscar en los metadatos
    if (!descripcion && metadata['descripcion']) {
      descripcion = metadata['descripcion'];
    }
    
    // d) Si aún no se encontró, buscar en JSON-LD
    if (!descripcion && jsonLd.description) {
      descripcion = jsonLd.description;
    }
    
    // 6. Extraer características detalladas
    const caracteristicas: Record<string, string> = {};
    
    // a) Extraer características principales
    $("div.card-body.pt-0 .row div.col-sm-12.col-md-6.my-1, div.card-body.pt-0 .row div.col-sm-12.col-md-6.col-lg-4.my-2, div.card-body .row div.col-sm-12.col-md-6.my-1").each((_, elem) => {
      const texto = $(elem).text().trim();
      const partes = texto.split(":");
      
      if (partes.length >= 2) {
        const clave = cleanText(partes[0]);
        const valor = cleanText(partes.slice(1).join(":"));
        
        if (clave) {
          caracteristicas[clave] = valor;
        }
      } else {
        // Para características sin valor (solo presencia)
        const texto = cleanText($(elem).text());
        if (texto) {
          caracteristicas[texto] = "Sí";
        }
      }
    });
    
    // b) Extraer características destacadas (terreno, construcción, recámaras, baños, estacionamientos)
    const detalles: Record<string, string> = {};
    
    $("div.row.fw-bold.my-4 div.col").each((_, elem) => {
      const texto = $(elem).text().trim();
      
      if (texto.includes("Terreno")) {
        detalles.terreno = texto.replace("Terreno", "").trim();
      } else if (texto.includes("Construcción")) {
        detalles.construccion = texto.replace("Construcción", "").trim();
      } else if (texto.includes("Recámaras")) {
        detalles.recamaras = texto.replace("Recámaras", "").trim();
      } else if (texto.includes("Baños")) {
        detalles.banos = texto.replace("Baños", "").trim();
      } else if (texto.includes("Estacionamientos")) {
        detalles.estacionamientos = texto.replace("Estacionamientos", "").trim();
      }
    });
    
    // c) Si no se encontraron en la sección destacada, buscar en los metadatos
    if (!detalles.terreno && metadata['MT']) {
      detalles.terreno = `${metadata['MT']} m²`;
    }
    
    if (!detalles.construccion && metadata['MC']) {
      detalles.construccion = `${metadata['MC']} m²`;
    }
    
    if (!detalles.recamaras && metadata['recamaras']) {
      detalles.recamaras = metadata['recamaras'];
    }
    
    if (!detalles.banos && metadata['banio']) {
      detalles.banos = metadata['banio'];
    }
    
    if (!detalles.estacionamientos && metadata['estacionamiento']) {
      detalles.estacionamientos = metadata['estacionamiento'];
    }
    
    // 7. Extraer resumen de características
    let resumen = '';
    
    const resumenElem = $("div.card-body.pt-0 .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6, div.card-body .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6");
    if (resumenElem.length) {
      resumen = resumenElem.text().trim();
    }
    
    // 8. Extraer amenidades
    const amenidades: string[] = [];
    
    $("div.col-sm-12.col-md-6.col-lg-4.my-2").each((_, elem) => {
      const texto = $(elem).text().trim();
      if (texto) {
        amenidades.push(texto);
      }
    });
    
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
      portal: 'century21'
    };
  }
}; 