'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Propiedad, ScraperResult } from '@/lib/scrapers/propertyScraperTypes';

type ScrapeStatus = 'idle' | 'loading' | 'success' | 'error';

// Actualizada para coincidir con la respuesta real de la API
interface ApiResponse extends ScraperResult {
  // Ya contiene: success, data, error, imagePaths, etc.
}

export function UrlScraper() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<ScrapeStatus>('idle');
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Validación de URL
  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setUrlError('Por favor, ingresa una URL');
      return false;
    }
    
    try {
      new URL(value);
      setUrlError(null);
      return true;
    } catch (err) {
      setUrlError('URL inválida. Debe incluir http:// o https://');
      return false;
    }
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if (urlError) validateUrl(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateUrl(url)) {
      return;
    }
    
    setStatus('loading');
    setError(null);
    setResult(null);
    
    try {
      console.log('Enviando solicitud de scraping para URL:', url);
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      console.log('Respuesta recibida, status:', response.status);
      const data = await response.json();
      console.log('Datos de respuesta:', data);
      console.log('¿Tiene imagePaths?', data.imagePaths ? `Sí, ${data.imagePaths.length} imágenes` : 'No');
      console.log('Estructura de data:', JSON.stringify(data, null, 2));
      
      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.details?.map((e: any) => e.message).join(', ') || 'Error desconocido';
        console.error('Error en el scraping:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Guardar la respuesta completa 
      setResult(data);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error en el scraping:', errorMessage);
      console.error('Error completo:', err);
      setError(errorMessage);
      setStatus('error');
    }
  };
  
  return (
    <div className="backdrop-blur-sm bg-[#0f1219]/40 border border-zinc-800/50 rounded-xl shadow-xl p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-2">Web Scraper de URLs</h2>
        <p className="text-zinc-400">
          Introduce una URL para extraer información y guardarla en la base de datos.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="URL"
          type="text"
          placeholder="https://ejemplo.com/pagina-a-scrapear"
          value={url}
          onChange={handleUrlChange}
          fullWidth
          error={urlError || undefined}
        />
        
        <Button 
          type="submit" 
          fullWidth 
          isLoading={status === 'loading'}
          disabled={status === 'loading'}
          className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 border-0"
        >
          {status === 'loading' ? 'Procesando...' : 'Iniciar Scraping'}
        </Button>
      </form>
      
      {status === 'error' && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg backdrop-blur-sm">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error</h3>
          <p className="text-zinc-300">{error}</p>
          
          {error?.includes('no existe') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Configuración necesaria</h4>
              <p className="text-zinc-400 text-sm mb-3">
                Es necesario crear la tabla en Supabase para que la aplicación funcione correctamente.
              </p>
              <div className="flex flex-col md:flex-row gap-3 mt-4">
                <a 
                  href="/setup" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium text-center transition-colors duration-200"
                >
                  Ir a la página de configuración
                </a>
                <a 
                  href="/api/get-sql-script" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm font-medium text-center transition-colors duration-200"
                >
                  Descargar script SQL
                </a>
              </div>
            </div>
          )}
          
          {error?.includes('pertenece a otro usuario') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">URL ya registrada por otro usuario</h4>
              <p className="text-zinc-400 text-sm">
                Esta URL ya ha sido scrapeada por otro usuario. Por motivos de seguridad, no puedes sobrescribir 
                datos que pertenecen a otros usuarios. Intenta con una URL diferente.
              </p>
            </div>
          )}
          
          {error?.includes('Violación de restricción única') && !error?.includes('pertenece a otro usuario') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Error al actualizar datos</h4>
              <p className="text-zinc-400 text-sm">
                Hubo un problema al actualizar los datos de esta URL. El sistema intentó eliminar el registro 
                anterior pero ocurrió un error. Intenta nuevamente o contacta al administrador si el problema persiste.
              </p>
            </div>
          )}
          
          {error?.includes('permisos') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Problema de permisos</h4>
              <p className="text-zinc-400 text-sm">
                Existe un problema con los permisos de la tabla en Supabase. Es necesario configurar las políticas RLS 
                para permitir inserciones. 
              </p>
              <div className="mt-4">
                <a 
                  href="/setup" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium text-center inline-block transition-colors duration-200"
                >
                  Ir a la página de configuración
                </a>
              </div>
            </div>
          )}
          
          {error?.includes('Error tipo de datos') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Problema de tipo de datos</h4>
              <p className="text-zinc-400 text-sm">
                El formato de los datos extraídos no coincide con la estructura esperada por la base de datos.
                Verifica que la estructura de la página web coincida con el scraper.
              </p>
            </div>
          )}
          
          {error?.includes('Error desconocido de Supabase') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Error de Supabase</h4>
              <p className="text-zinc-400 text-sm">
                Ha ocurrido un error desconocido al comunicarse con Supabase. Verifica:
              </p>
              <ul className="list-disc list-inside text-zinc-400 text-sm mt-2 space-y-1">
                <li>Que las variables de entorno NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas correctamente</li>
                <li>Que el servicio de Supabase esté funcionando</li>
                <li>Que la tabla 'properties' exista y tenga la estructura correcta</li>
                <li>Que las políticas RLS estén configuradas para permitir inserciones</li>
              </ul>
              <div className="mt-4">
                <a 
                  href="/setup" 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium text-center inline-block transition-colors duration-200"
                >
                  Ir a la página de configuración
                </a>
              </div>
            </div>
          )}
          
          {error?.includes('Error HTTP') && (
            <div className="mt-4 p-3 bg-zinc-900/40 rounded border border-zinc-800/40">
              <h4 className="text-amber-400 text-sm font-medium mb-2">Error de acceso a la página</h4>
              <p className="text-zinc-400 text-sm">
                No se pudo acceder a la página web correctamente. Esto puede deberse a:
              </p>
              <ul className="list-disc list-inside text-zinc-400 text-sm mt-2 space-y-1">
                <li>La página requiere autenticación</li>
                <li>La página bloquea accesos automatizados (scraping)</li>
                <li>La URL no es accesible desde el servidor</li>
              </ul>
            </div>
          )}
          
          <p className="mt-4 text-sm text-zinc-400">
            Intenta nuevamente o verifica que la URL sea accesible. Si el problema persiste, 
            podría haber un problema con la estructura de la página o con la conexión al servidor.
          </p>
        </div>
      )}
      
      {status === 'success' && result && result.data && (
        <div className="mt-8 space-y-6">
          <div className="p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-lg backdrop-blur-sm">
            <h3 className="text-lg font-medium text-emerald-400 mb-2">¡Scraping completado con éxito!</h3>
          </div>
          
          <div className="bg-[#0d1117]/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
            <h3 className="text-xl font-medium bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-6">Datos extraídos</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-1">Ubicación</h4>
                <p className="text-zinc-300">{result.data.ubicacion || 'No disponible'}</p>
              </div>
              
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-1">Precio</h4>
                <div className="flex gap-4">
                  <span className="text-zinc-300">MXN: {result.data.precio.mxn || 'No disponible'}</span>
                  <span className="text-zinc-300">USD: {result.data.precio.usd || 'No disponible'}</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-1">Resumen</h4>
                <p className="text-zinc-300">{result.data.resumen || 'No disponible'}</p>
              </div>
              
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-1">Características</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(result.data.caracteristicas).map(([key, value]) => (
                    <div key={key} className="flex flex-col p-2 rounded-md bg-[#111827]/40 border border-zinc-800/30">
                      <span className="text-purple-300 text-xs">{key}</span>
                      <span className="text-zinc-300">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-2">Imágenes encontradas</h4>
                {result.data && result.data.imagenes && result.data.imagenes.length > 0 ? (
                  <div className="mb-4">
                    <div className="mb-2 text-sm text-green-400">
                      {result.data.imagenes.length} imágenes encontradas en el scraper
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto p-2">
                      {result.data.imagenes.map((imagen, index) => (
                        <div key={`source-${index}`} className="rounded-lg overflow-hidden aspect-video bg-[#0f1219] border border-zinc-800/50 shadow-md">
                          <img 
                            src={imagen} 
                            alt={`Imagen original ${index+1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 mb-4 text-center text-sm text-amber-400">
                    No se encontraron imágenes originales en el scraping
                  </div>
                )}
                
                <h4 className="text-indigo-300 text-sm font-medium mb-2">Imágenes guardadas</h4>
                {result.imagePaths && result.imagePaths.length > 0 ? (
                  <div>
                    <div className="mb-2 text-sm text-green-400">
                      {result.imagePaths.length} imágenes procesadas y guardadas
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {result.imagePaths.map((imagen, index) => (
                        <div key={index} className="rounded-lg overflow-hidden aspect-video bg-[#0f1219] border border-zinc-800/50 shadow-md">
                          <img 
                            src={imagen} 
                            alt={`Imagen ${index+1}`} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-center text-sm text-amber-400">
                    No se pudieron procesar imágenes. Revisa los registros de la consola para más detalles.
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-indigo-300 text-sm font-medium mb-1">Descripción</h4>
                <p className="text-zinc-300 whitespace-pre-wrap text-sm bg-[#111827]/40 p-4 rounded-md border border-zinc-800/30">
                  {result.data.descripcion || 'No disponible'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 