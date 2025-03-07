'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Propiedad, ScraperResult } from '@/lib/scrapers/propertyScraperTypes';
import React from 'react';
import { DESCRIPTION_STYLES, DEFAULT_STYLE_ID, DescriptionStyle, getAllStyles } from '@/lib/descriptionStyles';

// Función de debounce para mejorar el rendimiento
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Componente de textarea autoexpandible que se ajusta al contenido
const AutoExpandingTextarea = ({ 
  value, 
  onChange,
  className,
  style
}: { 
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [forceUpdate, setForceUpdate] = React.useState(0);
  
  // Función para ajustar la altura
  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Resetear la altura
    textarea.style.height = '0';
    
    // Establecer la altura basada en el contenido
    const scrollHeight = textarea.scrollHeight;
    textarea.style.height = `${scrollHeight}px`;
    
    // Verificar si la altura se aplicó correctamente
    if (textarea.clientHeight < scrollHeight) {
      // Si no se aplicó correctamente, intentar de nuevo con un valor mayor
      textarea.style.height = `${scrollHeight + 5}px`;
    }
  }, []);
  
  // Ajustar altura cuando cambia el valor o se fuerza una actualización
  React.useEffect(() => {
    adjustHeight();
    // Ajustar también después de un breve retraso para asegurar que todo esté renderizado
    const timer = setTimeout(adjustHeight, 10);
    return () => clearTimeout(timer);
  }, [value, forceUpdate, adjustHeight]);
  
  // Ajustar altura al montar y cuando cambia el tamaño de la ventana
  React.useEffect(() => {
    // Ajustar al montar
    adjustHeight();
    
    // Ajustar también después de un breve retraso para asegurar que todo esté renderizado
    const initialTimer = setTimeout(adjustHeight, 100);
    
    // Crear un listener para el evento resize
    const handleResize = () => {
      // Forzar una actualización para recalcular la altura
      setForceUpdate(prev => prev + 1);
    };
    
    // Añadir listener para el evento resize
    window.addEventListener('resize', handleResize);
    
    // Limpiar timers y listeners
    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [adjustHeight]);
  
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{
        ...style,
        overflow: 'hidden',
        resize: 'none',
      }}
    />
  );
};

// Componente que mantiene exactamente 41 caracteres 'a' visibles por línea
const CharacterWidthDescription = ({ 
  text, 
  onChange 
}: { 
  text: string; 
  onChange?: (newText: string) => void;
}) => {
  const isEditable = !!onChange;
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  
  // Función para medir el ancho exacto de 41 caracteres 'a'
  const measureExactWidth = React.useCallback(() => {
    try {
      if (!measureRef.current) return;
      
      // Crear un span con 41 'a's
      const testSpan = document.createElement('span');
      testSpan.style.visibility = 'hidden';
      testSpan.style.position = 'absolute';
      testSpan.style.whiteSpace = 'nowrap';
      testSpan.style.fontSize = window.getComputedStyle(measureRef.current).fontSize;
      testSpan.style.fontFamily = window.getComputedStyle(measureRef.current).fontFamily;
      testSpan.style.fontWeight = window.getComputedStyle(measureRef.current).fontWeight;
      testSpan.style.letterSpacing = window.getComputedStyle(measureRef.current).letterSpacing;
      
      // Usar 44 caracteres en lugar de 41 para compensar la diferencia observada (3 caracteres)
      testSpan.textContent = 'a'.repeat(44);
      
      // Añadir al DOM para medir
      document.body.appendChild(testSpan);
      const exactWidth = testSpan.getBoundingClientRect().width;
      document.body.removeChild(testSpan);
      
      // Actualizar el estado con el ancho exacto
      setContainerWidth(exactWidth);
      
      // Verificación adicional (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        console.log('Ancho medido para 44 caracteres:', exactWidth, 'px');
      }
    } catch (error) {
      console.error('Error al medir el ancho de caracteres:', error);
      // Fallback a un valor aproximado basado en el tamaño de fuente actual
      if (measureRef.current) {
        const fontSize = parseFloat(window.getComputedStyle(measureRef.current).fontSize);
        // Aproximadamente 0.6em por carácter 'a' en la mayoría de las fuentes, ajustado para 44 caracteres
        setContainerWidth(fontSize * 0.6 * 44);
      }
    }
  }, []);
  
  // Versión con debounce para eventos frecuentes
  const debouncedMeasure = React.useMemo(
    () => debounce(measureExactWidth, 100),
    [measureExactWidth]
  );
  
  // Medir al montar y cuando cambia el tamaño de la ventana
  React.useEffect(() => {
    // Medir inicialmente
    measureExactWidth();
    
    // Configurar un observer para detectar cambios en el tamaño de fuente
    let resizeObserver: ResizeObserver | null = null;
    
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        debouncedMeasure();
      });
      
      if (measureRef.current) {
        resizeObserver.observe(measureRef.current);
      }
    }
    
    // Medir cuando cambia el tamaño de la ventana
    window.addEventListener('resize', debouncedMeasure);
    
    // Limpiar
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', debouncedMeasure);
    };
  }, [measureExactWidth, debouncedMeasure]);
  
  // Estilos comunes para el texto
  const textStyles = {
    fontVariantLigatures: 'none',
    fontVariantNumeric: 'tabular-nums',
    fontFeatureSettings: "'tnum' on, 'calt' off",
    wordSpacing: 'normal',
    wordBreak: 'break-word',
    textSizeAdjust: '100%',
    width: containerWidth ? `${containerWidth}px` : 'auto',
    maxWidth: '100%',
  } as React.CSSProperties;
  
  const textClasses = `text-zinc-200 whitespace-pre-wrap
                     text-[clamp(0.875rem,2vw,1.125rem)] 
                     leading-[1.8] 
                     font-medium 
                     tracking-normal
                     sm:text-[clamp(0.875rem,1.5vw,1.125rem)]
                     md:text-[clamp(0.938rem,1.2vw,1.25rem)]
                     lg:text-[clamp(1rem,1vw,1.25rem)]
                     overflow-hidden
                     text-justify
                     hyphens-auto`;
  
  return (
    <div className="flex justify-center items-center w-full">
      {/* Elemento invisible para medir */}
      <div 
        ref={measureRef} 
        className={textClasses} 
        style={{ 
          position: 'absolute', 
          visibility: 'hidden', 
          height: 0, 
          overflow: 'hidden' 
        }}
      >
        {'a'.repeat(44)}
      </div>
      
      <div className="w-full mx-auto bg-[#111827]/40 p-5 rounded-lg border border-zinc-700/50 shadow-inner" style={{ maxWidth: containerWidth ? `${containerWidth}px` : '100%' }}>
        {isEditable ? (
          <AutoExpandingTextarea
            value={text}
            onChange={onChange}
            className={`${textClasses} bg-transparent border-none outline-none focus:ring-0 focus:border-none`}
            style={textStyles}
          />
        ) : (
          <p 
            className={textClasses}
            style={textStyles}
          >
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

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
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [editedDescription, setEditedDescription] = useState<string | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string>(DEFAULT_STYLE_ID);

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
    setGeneratedDescription(null);
    
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
      
      // Si tenemos datos de propiedad, generamos la descripción con IA
      if (data.success && data.data) {
        await generateDescription(data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error en el scraping:', errorMessage);
      console.error('Error completo:', err);
      setError(errorMessage);
      setStatus('error');
    }
  };
  
  /**
   * Genera una descripción de la propiedad utilizando la API de GPT
   */
  const generateDescription = async (property: Propiedad) => {
    try {
      setIsGeneratingDescription(true);
      setEditedDescription(null);
      
      console.log('Generando descripción para propiedad, estructura completa:', property);
      
      // Revisar tipos de datos de cada campo para identificar el problema
      Object.entries(property).forEach(([key, value]) => {
        console.log(`Campo '${key}' es de tipo: ${typeof value}, valor:`, value);
        if (Array.isArray(value)) {
          console.log(`  ¡ATENCIÓN! '${key}' es un array con ${value.length} elementos`);
        }
      });
      
      // Crear una copia limpia de la propiedad, asegurando que los arrays se manejen correctamente
      const cleanedProperty = { ...property };
      
      // Asegurar que la descripción es un string, no un array
      if (Array.isArray(cleanedProperty.descripcion)) {
        console.log('Corrigiendo campo descripcion que es un array en lugar de string');
        cleanedProperty.descripcion = (cleanedProperty.descripcion as unknown as string[]).join('\n');
      }
      
      // Asegurar que el resumen es un string, no un array
      if (Array.isArray(cleanedProperty.resumen)) {
        console.log('Corrigiendo campo resumen que es un array en lugar de string');
        cleanedProperty.resumen = (cleanedProperty.resumen as unknown as string[]).join('\n');
      }
      
      // Verificar el tipo de datos en el precio
      if (typeof cleanedProperty.precio !== 'object' || cleanedProperty.precio === null) {
        console.log('Corrigiendo campo precio que no es un objeto:', cleanedProperty.precio);
        cleanedProperty.precio = {
          mxn: typeof cleanedProperty.precio === 'string' ? cleanedProperty.precio : 'Precio no disponible',
          usd: ''
        };
      } else if (Array.isArray(cleanedProperty.precio.mxn)) {
        console.log('Corrigiendo campo precio.mxn que es un array:', cleanedProperty.precio.mxn);
        cleanedProperty.precio.mxn = (cleanedProperty.precio.mxn as unknown as string[]).join(' ');
      }
      
      // Verificar la ubicación
      if (Array.isArray(cleanedProperty.ubicacion)) {
        console.log('Corrigiendo campo ubicacion que es un array:', cleanedProperty.ubicacion);
        cleanedProperty.ubicacion = (cleanedProperty.ubicacion as unknown as string[]).join(', ');
      }
      
      console.log('Propiedad limpia lista para enviar a la API:', cleanedProperty);
      console.log('Estilo seleccionado:', selectedStyleId);
      
      const response = await fetch('/api/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          property: cleanedProperty,
          styleId: selectedStyleId
        }),
      });
      
      const responseText = await response.text();
      console.log('Respuesta texto completo:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Datos de respuesta parseados:', data);
      } catch (e) {
        console.error('Error al parsear la respuesta JSON:', e);
        throw new Error(`Error al parsear la respuesta: ${responseText}`);
      }
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al generar la descripción');
      }
      
      console.log('Descripción generada:', data.description);
      setGeneratedDescription(data.description);
    } catch (error) {
      console.error('Error al generar la descripción:', error);
      setGeneratedDescription('No se pudo generar una descripción. Por favor, intenta nuevamente.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };
  
  // Componente para seleccionar el estilo de descripción
  const StyleSelector = () => {
    const styles = getAllStyles();
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-medium text-zinc-200 mb-2">Estilo de descripción</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {styles.map((style) => (
            <div
              key={style.id}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                selectedStyleId === style.id
                  ? 'bg-indigo-900/40 border-indigo-500'
                  : 'bg-[#111827]/40 border-zinc-700/50 hover:bg-[#1a2234]/40'
              }`}
              onClick={() => setSelectedStyleId(style.id)}
            >
              <div className="text-sm font-medium text-zinc-200 mb-1">{style.name}</div>
              <div className="text-xs text-zinc-400">{style.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="backdrop-blur-sm bg-[#0f1219]/40 border border-zinc-800/50 rounded-xl shadow-xl p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-2">Web Scraper de URLs</h2>
        <p className="text-zinc-400">
          Introduce una URL para extraer información y guardarla en la base de datos.
          Usamos IA para generar descripciones profesionales.
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
        
        {/* Selector de estilo de descripción */}
        <StyleSelector />
        
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
          
          {/* Descripción generada por IA */}
          {isGeneratingDescription && (
            <div className="bg-[#0d1117]/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
                <h3 className="text-xl font-medium bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  Generando descripción con GPT...
                </h3>
              </div>
            </div>
          )}
          
          {generatedDescription && (
            <div className="bg-[#0d1117]/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
              <h3 className="text-xl font-medium bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-4 flex justify-between items-center">
                <span>Descripción generada con IA</span>
                <span className="text-xs text-zinc-400">(Editable)</span>
              </h3>
              
              <CharacterWidthDescription 
                text={editedDescription !== null ? editedDescription : generatedDescription} 
                onChange={(newText) => setEditedDescription(newText)}
              />
              
              <div className="mt-4 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      const textToCopy = editedDescription !== null ? editedDescription : generatedDescription;
                      // Usar una función personalizada para copiar sin mostrar alerta del navegador
                      const copyToClipboard = async (text: string) => {
                        try {
                          await navigator.clipboard.writeText(text);
                          // Crear un elemento de notificación personalizado en lugar de usar alert
                          const notification = document.createElement('div');
                          notification.className = 'fixed bottom-4 right-4 bg-zinc-800 text-zinc-200 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in-out';
                          notification.textContent = 'Texto copiado al portapapeles';
                          notification.style.animation = 'fadeInOut 2s ease-in-out forwards';
                          document.body.appendChild(notification);
                          
                          // Crear la animación si no existe
                          if (!document.querySelector('style#copy-animation')) {
                            const style = document.createElement('style');
                            style.id = 'copy-animation';
                            style.textContent = `
                              @keyframes fadeInOut {
                                0% { opacity: 0; transform: translateY(10px); }
                                10% { opacity: 1; transform: translateY(0); }
                                90% { opacity: 1; transform: translateY(0); }
                                100% { opacity: 0; transform: translateY(-10px); }
                              }
                            `;
                            document.head.appendChild(style);
                          }
                          
                          // Eliminar la notificación después de 2 segundos
                          setTimeout(() => {
                            document.body.removeChild(notification);
                          }, 2000);
                        } catch (err) {
                          console.error('Error al copiar al portapapeles:', err);
                          // Fallback silencioso
                          const textarea = document.createElement('textarea');
                          textarea.value = text;
                          textarea.style.position = 'fixed';
                          textarea.style.opacity = '0';
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textarea);
                        }
                      };
                      
                      copyToClipboard(textToCopy);
                    }}
                    className="px-3 py-1 text-xs bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 rounded-md transition-colors"
                  >
                    Copiar texto
                  </button>
                  
                  {editedDescription !== null && editedDescription !== generatedDescription && (
                    <>
                      <button 
                        onClick={() => setEditedDescription(generatedDescription)}
                        className="px-3 py-1 text-xs bg-indigo-800/40 hover:bg-indigo-700/40 text-indigo-300 rounded-md transition-colors"
                      >
                        Restaurar original
                      </button>
                      <button 
                        onClick={() => {
                          // Aquí podrías implementar la lógica para guardar la descripción editada
                          // Crear un elemento de notificación personalizado en lugar de usar alert
                          const notification = document.createElement('div');
                          notification.className = 'fixed bottom-4 right-4 bg-emerald-800/80 text-emerald-200 px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in-out';
                          notification.textContent = 'Descripción guardada';
                          notification.style.animation = 'fadeInOut 2s ease-in-out forwards';
                          document.body.appendChild(notification);
                          
                          // Eliminar la notificación después de 2 segundos
                          setTimeout(() => {
                            document.body.removeChild(notification);
                          }, 2000);
                        }}
                        className="px-3 py-1 text-xs bg-emerald-800/40 hover:bg-emerald-700/40 text-emerald-300 rounded-md transition-colors"
                      >
                        Guardar cambios
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-[#0d1117]/60 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-6">
            <h3 className="text-xl font-medium bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-6">Imágenes</h3>
            
            <div className="space-y-6">
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
          </div>
        </div>
      )}
    </div>
  );
} 