import { scrapeProperty, scrapeMultipleProperties, isValidPropertyUrl } from '../index';

/**
 * Ejemplo de uso del scraper para una sola propiedad
 */
async function singlePropertyExample() {
  console.log('=== EJEMPLO DE SCRAPING DE UNA PROPIEDAD ===');
  
  // URL de ejemplo de Century21 México
  const url = 'https://century21mexico.com/propiedades/casa-en-venta-en-coyoacan-ciudad-de-mexico-1';
  
  // Verificar si la URL es válida
  if (!isValidPropertyUrl(url)) {
    console.error('La URL proporcionada no es válida para scraping');
    return;
  }
  
  console.log(`Iniciando scraping de: ${url}`);
  
  try {
    // Configuración personalizada (opcional)
    const config = {
      timeout: 60000, // 60 segundos
      imageProcessor: {
        maxConcurrent: 3,
        optimizeImages: true
      }
    };
    
    // Ejecutar el scraper
    const result = await scrapeProperty(url, config);
    
    if (result.success && result.data) {
      console.log('=== SCRAPING EXITOSO ===');
      console.log(`Portal detectado: ${result.portalDetected}`);
      console.log(`Tiempo de procesamiento: ${result.processingTime?.toFixed(2)} ms`);
      
      const propiedad = result.data;
      
      console.log('\nDatos extraídos:');
      console.log(`- Tipo: ${propiedad.tipo || 'No disponible'}`);
      console.log(`- Operación: ${propiedad.operacion || 'No disponible'}`);
      console.log(`- Ubicación: ${propiedad.ubicacion}`);
      console.log(`- Precio MXN: ${propiedad.precio.mxn || 'No disponible'}`);
      console.log(`- Precio USD: ${propiedad.precio.usd || 'No disponible'}`);
      console.log(`- Imágenes: ${propiedad.imagenes.length}`);
      
      if (propiedad.detalles) {
        console.log('\nDetalles:');
        Object.entries(propiedad.detalles).forEach(([key, value]) => {
          console.log(`- ${key}: ${value}`);
        });
      }
      
      console.log('\nResumen:');
      console.log(propiedad.resumen);
      
      if (result.imagePaths && result.imagePaths.length > 0) {
        console.log('\nImágenes procesadas:');
        result.imagePaths.forEach((path, index) => {
          console.log(`- Imagen ${index + 1}: ${path}`);
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('\nAdvertencias:');
        result.warnings.forEach(warning => {
          console.log(`- ${warning}`);
        });
      }
    } else {
      console.error('=== ERROR EN EL SCRAPING ===');
      console.error(`Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

/**
 * Ejemplo de uso del scraper para múltiples propiedades
 */
async function multiplePropertiesExample() {
  console.log('=== EJEMPLO DE SCRAPING DE MÚLTIPLES PROPIEDADES ===');
  
  // URLs de ejemplo
  const urls = [
    'https://century21mexico.com/propiedades/casa-en-venta-en-coyoacan-ciudad-de-mexico-1',
    'https://century21mexico.com/propiedades/departamento-en-venta-en-polanco-ciudad-de-mexico-2',
    'https://century21mexico.com/propiedades/casa-en-renta-en-jardines-del-pedregal-ciudad-de-mexico-3'
  ];
  
  console.log(`Iniciando scraping de ${urls.length} propiedades...`);
  
  try {
    // Ejecutar el scraper para múltiples propiedades
    const results = await scrapeMultipleProperties(urls, {}, 2); // Procesar 2 en paralelo
    
    console.log(`\nResultados (${results.length} propiedades):`);
    
    results.forEach((result, index) => {
      console.log(`\n--- Propiedad ${index + 1} ---`);
      
      if (result.success && result.data) {
        const propiedad = result.data;
        console.log(`URL: ${propiedad.url}`);
        console.log(`Portal: ${result.portalDetected}`);
        console.log(`Tipo: ${propiedad.tipo || 'No disponible'}`);
        console.log(`Operación: ${propiedad.operacion || 'No disponible'}`);
        console.log(`Ubicación: ${propiedad.ubicacion}`);
        console.log(`Precio: ${propiedad.precio.mxn || propiedad.precio.usd || 'No disponible'}`);
        console.log(`Imágenes: ${propiedad.imagenes.length} encontradas, ${result.imagePaths?.length || 0} procesadas`);
      } else {
        console.log(`Error: ${result.error}`);
      }
    });
    
    // Estadísticas
    const exitosos = results.filter(r => r.success).length;
    const fallidos = results.filter(r => !r.success).length;
    
    console.log('\n=== RESUMEN ===');
    console.log(`Total procesados: ${results.length}`);
    console.log(`Exitosos: ${exitosos}`);
    console.log(`Fallidos: ${fallidos}`);
    
  } catch (error) {
    console.error('Error inesperado:', error);
  }
}

// Ejecutar ejemplos
async function runExamples() {
  await singlePropertyExample();
  console.log('\n' + '-'.repeat(50) + '\n');
  await multiplePropertiesExample();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runExamples().catch(console.error);
}

export { singlePropertyExample, multiplePropertiesExample }; 