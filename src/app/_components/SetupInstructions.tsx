'use client';

import { useState } from 'react';
import { Button } from './ui/Button';

export function SetupInstructions() {
  const [sqlScript, setSqlScript] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGetScript = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/get-sql-script');
      if (!response.ok) {
        throw new Error(`Error al obtener el script: ${response.statusText}`);
      }
      
      const script = await response.text();
      setSqlScript(script);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error al obtener el script SQL:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCheckConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/check-supabase');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(`Error al verificar conexión: ${data.error || 'Verifica los logs para más detalles'}`);
      }
      
      alert('¡Conexión exitosa! La tabla está configurada correctamente.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error al verificar conexión:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="backdrop-blur-sm bg-[#0f1219]/40 border border-zinc-800/50 rounded-xl shadow-xl p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-2">
          Configuración de Supabase
        </h2>
        <p className="text-zinc-400">
          Sigue estas instrucciones para configurar correctamente la base de datos de Supabase.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
          <h3 className="text-lg font-medium text-purple-400 mb-3">1. Obtener script SQL</h3>
          <p className="text-zinc-400 mb-4">
            Primero, obtén el script SQL que necesitas ejecutar en el SQL Editor de Supabase para crear la tabla y configurar las políticas RLS.
          </p>
          <Button 
            onClick={handleGetScript}
            isLoading={isLoading && !sqlScript}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Obtener Script SQL
          </Button>
          
          {sqlScript && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-zinc-300">Script SQL</h4>
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(sqlScript);
                    alert('Script copiado al portapapeles');
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                >
                  Copiar al portapapeles
                </Button>
              </div>
              <pre className="bg-[#111827] p-3 rounded-md text-xs text-blue-300 overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                {sqlScript}
              </pre>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
          <h3 className="text-lg font-medium text-purple-400 mb-3">2. Ejecutar el script en Supabase</h3>
          <p className="text-zinc-400 mb-3">
            Copia el script SQL de arriba y sigue estos pasos:
          </p>
          <ol className="list-decimal list-inside text-zinc-400 space-y-2 mb-4">
            <li>Accede al <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Dashboard de Supabase</a></li>
            <li>Selecciona tu proyecto</li>
            <li>En el menú lateral, haz clic en "SQL Editor"</li>
            <li>Crea un nuevo script</li>
            <li>Pega el código SQL completo</li>
            <li>Haz clic en "Run" para ejecutar el script</li>
          </ol>
        </div>
        
        <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800/80">
          <h3 className="text-lg font-medium text-purple-400 mb-3">3. Verificar la configuración</h3>
          <p className="text-zinc-400 mb-4">
            Una vez ejecutado el script, verifica que la conexión y la tabla estén configuradas correctamente:
          </p>
          <Button 
            onClick={handleCheckConnection}
            isLoading={isLoading && !!sqlScript}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Verificar Conexión
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-800/50 rounded-lg backdrop-blur-sm">
          <h3 className="text-lg font-medium text-red-400 mb-2">Error</h3>
          <p className="text-zinc-300">{error}</p>
        </div>
      )}
    </div>
  );
} 