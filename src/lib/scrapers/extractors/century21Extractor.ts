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
    
    // a) Extraer imágenes del JSON-LD (fuente más completa generalmente)
    if (jsonLd.image) {
      if (Array.isArray(jsonLd.image)) {
        console.log(`Extractor Century21: Encontradas ${jsonLd.image.length} imágenes en array JSON-LD`);
        jsonLd.image.forEach((img: any) => {
          if (typeof img === 'string' && img.trim()) {
            console.log(`Añadiendo imagen de JSON-LD array: ${img.substring(0, 100)}...`);
            imageSet.add(img.trim());
          } else if (typeof img === 'object' && img !== null) {
            // Algunos JSON-LD usan objetos con propiedad 'url' para imágenes
            const imgObj = img as Record<string, any>;
            if (typeof imgObj.url === 'string' && imgObj.url.trim()) {
              console.log(`Añadiendo imagen de JSON-LD objeto: ${imgObj.url.substring(0, 100)}...`);
              imageSet.add(imgObj.url.trim());
            }
          }
        });
      } else if (typeof jsonLd.image === 'string' && (jsonLd.image as string).trim()) {
        // Si es una sola string
        console.log(`Añadiendo imagen única de JSON-LD: ${(jsonLd.image as string).substring(0, 100)}...`);
        imageSet.add((jsonLd.image as string).trim());
      } else if (typeof jsonLd.image === 'object' && jsonLd.image !== null) {
        // Si es un objeto (algunos formatos usan esto)
        const imgObj = jsonLd.image as Record<string, any>;
        if (typeof imgObj.url === 'string' && imgObj.url.trim()) {
          console.log(`Añadiendo imagen de objeto JSON-LD: ${imgObj.url.substring(0, 100)}...`);
          imageSet.add(imgObj.url.trim());
        }
      }
    } else {
      console.log('No se encontraron imágenes en el JSON-LD principal');
    }
    
    // Si no encontramos imágenes en el JSON-LD principal, buscar en todos los objetos JSON-LD
    if (imageSet.size === 0 && jsonLdArray.length > 0) {
      console.log('Buscando imágenes en todos los objetos JSON-LD disponibles...');
      
      for (const obj of jsonLdArray) {
        if (obj.image) {
          console.log(`Encontrado objeto JSON-LD con propiedad image de tipo ${typeof obj.image}`);
          
          if (Array.isArray(obj.image)) {
            obj.image.forEach((img: any) => {
              if (typeof img === 'string' && img.trim()) {
                console.log(`Añadiendo imagen de array: ${img.substring(0, 100)}...`);
                imageSet.add(img.trim());
              }
            });
          } else if (typeof obj.image === 'string') {
            console.log(`Añadiendo imagen string: ${obj.image.substring(0, 100)}...`);
            imageSet.add(obj.image);
          }
        }
      }
    }
    
    // b) Buscar en todas las galerías y sliders de la página
    // Galería principal
    $('#fotos img, #fotosDestacadas img, .carousel-item img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && src.trim()) {
        console.log(`Añadiendo imagen de galería: ${src}`);
        imageSet.add(src);
      }
    });
    
    // Galería secundaria
    $('.row.gx-1.gy-1.rcol img, .property-image img, .property-thumbs img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && src.trim()) {
        console.log(`Añadiendo imagen de galería secundaria: ${src}`);
        imageSet.add(src);
      }
    });
    
    // c) Buscar en cualquier contenedor de imágenes con clases comunes
    $('.gallery img, .slider img, .carousel img, .photos img').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src');
      if (src && src.trim()) {
        console.log(`Añadiendo imagen de contenedor común: ${src}`);
        imageSet.add(src);
      }
    });
    
    // d) Revisar imágenes desde los metadatos
    if (metadata['og:image']) {
      console.log(`Añadiendo imagen de Open Graph: ${metadata['og:image']}`);
      imageSet.add(metadata['og:image']);
    }
    
    // e) Buscar cualquier otro tag de imagen que pueda contener propiedad
    $('img[alt*="propiedad"], img[alt*="inmueble"], img[alt*="casa"], img[alt*="departamento"]').each((_, img) => {
      const src = $(img).attr('src');
      if (src && src.trim() && !src.includes('logo') && !src.includes('icon')) {
        console.log(`Añadiendo imagen con alt relevante: ${src}`);
        imageSet.add(src);
      }
    });
    
    // f) Verificar si hay un indicador del número total de fotos en la página
    const fotosCountText = $('.btn.btn-primary').text().trim();
    const fotosCountMatch = fotosCountText.match(/(\d+)\s+Fotos/i);
    const expectedFotosCount = fotosCountMatch && fotosCountMatch[1] ? parseInt(fotosCountMatch[1]) : 0;
    console.log(`Indicador de cantidad de fotos en HTML: "${fotosCountText}", número esperado: ${expectedFotosCount}`);
    
    // g) Si tenemos pocas imágenes, buscar en todas las etiquetas img dentro de ciertos contenedores
    if (imageSet.size < 5) {
      console.log('Pocas imágenes encontradas, buscando en todas las etiquetas img...');
      
      // Extensiones comunes de imágenes
      const imageExtensionsPattern = /\.(jpe?g|png|gif|webp|bmp)(\?[^?]*)?$/i;
      
      $('img').each((_, img) => {
        const src = $(img).attr('src');
        if (src && src.trim() && (src.startsWith('http://') || src.startsWith('https://'))) {
          if (src.includes('cdn.21online.lat') && src.includes('propiedades') && imageExtensionsPattern.test(src)) {
            console.log(`Añadiendo imagen del tag <img>: ${src}`);
            imageSet.add(src);
          }
        }
      });
    }
    
    // h) Buscar patrones específicos de URLs de imágenes en Century21 en todo el HTML
    const c21UrlPattern = /https?:\/\/cdn\.21online\.lat\/mexico\/cache\/[^"']+\/propiedades\/[^"']+\.(jpe?g|png|gif|webp)/gi;
    const htmlAsString = $.html();
    const c21UrlMatches = htmlAsString.match(c21UrlPattern);
    
    if (c21UrlMatches && c21UrlMatches.length > 0) {
      console.log(`Encontradas ${c21UrlMatches.length} URLs específicas de imágenes Century21`);
      c21UrlMatches.forEach(imgUrl => {
        if (imgUrl) {
          console.log(`Añadiendo URL específica de Century21: ${imgUrl}`);
          imageSet.add(imgUrl);
        }
      });
    }
    
    // i) Buscar ALL posibles urls de imágenes de Century21 directamente en el HTML
    console.log("Intentando extraer TODAS las imágenes posibles del HTML completo...");
    
    // Patrón más amplio para capturar todas las URLs de imágenes en todo el HTML
    const allImgUrlPattern = /["'](https?:\/\/[^"']+?\/(?:propiedades|uploads)\/[^"']+?\/[^"']+?\.(jpe?g|png|gif|webp))["']/gi;
    let allMatches;
    const foundUrls = new Set<string>();
    
    // Recolectar todas las URLs que coincidan con el patrón
    while ((allMatches = allImgUrlPattern.exec(htmlAsString)) !== null) {
      if (allMatches[1] && !foundUrls.has(allMatches[1])) {
        foundUrls.add(allMatches[1]);
      }
    }
    
    console.log(`Encontradas ${foundUrls.size} URLs únicas de imágenes en el HTML bruto`);
    
    // Añadir cada URL encontrada al set de imágenes
    foundUrls.forEach(url => {
      console.log(`Añadiendo URL encontrada en HTML bruto: ${url}`);
      imageSet.add(url);
    });
    
    // j) Intentar extraer JSON directamente del HTML si tenemos pocas imágenes
    if (imageSet.size < 10) {
      console.log("Pocas imágenes encontradas, buscando bloques JSON en scripts...");
      
      // Buscar objetos JSON en scripts que contengan arrays de imágenes
      const scriptBlocks = htmlAsString.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
      console.log(`Analizando ${scriptBlocks.length} bloques de script en busca de arrays JSON...`);
      
      for (const scriptBlock of scriptBlocks) {
        // Buscar posibles arrays JSON que contengan URLs de imágenes
        const arrayMatches = scriptBlock.match(/\[\s*"https?:\/\/[^"]+\.(jpe?g|png|gif|webp)"/gi);
        if (arrayMatches && arrayMatches.length > 0) {
          console.log(`Encontrado posible array JSON con URLs de imágenes: ${arrayMatches[0].substring(0, 100)}...`);
          
          try {
            // Intentar extraer el array completo
            const arrayStart = scriptBlock.indexOf(arrayMatches[0]);
            if (arrayStart >= 0) {
              let bracketCount = 0;
              let inQuote = false;
              let escapeNext = false;
              let endPos = -1;
              
              for (let i = arrayStart; i < scriptBlock.length; i++) {
                const char = scriptBlock[i];
                
                if (escapeNext) {
                  escapeNext = false;
                  continue;
                }
                
                if (char === '\\') {
                  escapeNext = true;
                  continue;
                }
                
                if (char === '"' && !escapeNext) {
                  inQuote = !inQuote;
                  continue;
                }
                
                if (!inQuote) {
                  if (char === '[') bracketCount++;
                  else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                      endPos = i + 1;
                      break;
                    }
                  }
                }
              }
              
              if (endPos > arrayStart) {
                const jsonArray = scriptBlock.substring(arrayStart, endPos);
                console.log(`Extrayendo array JSON: ${jsonArray.substring(0, 100)}...`);
                
                try {
                  const parsed = JSON.parse(jsonArray);
                  console.log(`¡Array JSON parseado con éxito! Contiene ${parsed.length} elementos`);
                  
                  // Añadir todas las URLs al set de imágenes
                  parsed.forEach((url: string) => {
                    if (typeof url === 'string' && url.match(/https?:\/\/.*\.(jpe?g|png|gif|webp)/i)) {
                      console.log(`Añadiendo URL de array JSON: ${url}`);
                      imageSet.add(url);
                    }
                  });
                } catch (e) {
                  console.log(`Error al parsear array JSON: ${e}`);
                }
              }
            }
          } catch (e) {
            console.log(`Error al procesar posible array JSON: ${e}`);
          }
        }
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