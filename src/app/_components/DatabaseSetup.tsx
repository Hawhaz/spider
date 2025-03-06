'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { AlertCircle, CheckCircle, Database, Server } from 'lucide-react';

interface SetupResult {
  success: boolean;
  message?: string;
  error?: string;
  warning?: string;
}

interface SetupResults {
  storage: SetupResult;
  table: SetupResult;
}

interface SetupResponse {
  success: boolean;
  results: SetupResults;
  instructions: string;
  error?: string;
}

export function DatabaseSetup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<SetupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);

  const handleCheckConnection = async () => {
    try {
      setStatus('loading');
      setError(null);
      
      const response = await fetch('/api/setup-db');
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus('success');
        setResult(data);
      } else {
        console.error('Error al verificar conexión:', data);
        setStatus('error');
        setError(data.error || 'Error al verificar conexión: Verifica los logs para más detalles');
        setResult(data);
      }
    } catch (err) {
      console.error('Error al verificar conexión:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Error desconocido');
    }
  };

  const handleToggleSql = () => {
    setShowSql(!showSql);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-gray-900 rounded-lg shadow-xl border border-gray-800">
      <div className="mb-6 flex items-center gap-3">
        <Database className="h-6 w-6 text-violet-500" />
        <h2 className="text-xl font-semibold text-white">Configuración de la Base de Datos</h2>
      </div>
      
      <div className="space-y-4 mb-6">
        <p className="text-gray-300">
          Si estás teniendo problemas con el scraper debido a permisos o errores de configuración,
          puedes utilizar esta herramienta para configurar automáticamente la base de datos de Supabase.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button 
            onClick={handleCheckConnection}
            disabled={status === 'loading'}
            variant="primary"
            className="bg-violet-700 hover:bg-violet-600 text-white"
          >
            <Server className="mr-2 h-4 w-4" />
            {status === 'loading' ? 'Configurando...' : 'Configurar Base de Datos'}
          </Button>
        </div>
      </div>
      
      {status === 'error' && (
        <div className="bg-red-950 border border-red-800 p-4 rounded-md mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-red-400 font-medium">Error al configurar la base de datos</h3>
              <p className="text-red-300 mt-1">{error}</p>
              
              {result && !result.success && (
                <div className="mt-4">
                  <h4 className="text-red-400 font-medium mb-2">Resultados detallados:</h4>
                  
                  {result.results && (
                    <div className="space-y-3">
                      <div className="border border-red-800 bg-red-900/30 p-3 rounded">
                        <h5 className="font-medium mb-1 flex items-center">
                          {result.results.storage.success 
                            ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                            : <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
                          Configuración de Almacenamiento
                        </h5>
                        {result.results.storage.error && (
                          <p className="text-red-300 text-sm">{result.results.storage.error}</p>
                        )}
                        {result.results.storage.message && (
                          <p className="text-gray-300 text-sm">{result.results.storage.message}</p>
                        )}
                      </div>
                      
                      <div className="border border-red-800 bg-red-900/30 p-3 rounded">
                        <h5 className="font-medium mb-1 flex items-center">
                          {result.results.table.success 
                            ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                            : <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
                          Configuración de Tabla y Políticas RLS
                        </h5>
                        {result.results.table.error && (
                          <p className="text-red-300 text-sm">{result.results.table.error}</p>
                        )}
                        {result.results.table.message && (
                          <p className="text-gray-300 text-sm">{result.results.table.message}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mt-4">
                <p className="text-red-300">Probablemente necesites ejecutar el SQL manualmente en el SQL Editor de Supabase.</p>
                <Button 
                  onClick={handleToggleSql}
                  variant="secondary"
                  className="mt-2 bg-gray-800 hover:bg-gray-700 text-white"
                  size="sm"
                >
                  {showSql ? 'Ocultar SQL' : 'Mostrar SQL'}
                </Button>
                
                {showSql && (
                  <pre className="bg-gray-950 p-3 rounded mt-2 overflow-x-auto text-xs text-gray-300 border border-gray-800">
                    {`-- Ve al SQL Editor de Supabase y ejecuta este código:
                    
-- Función para crear la tabla properties si no existe
CREATE OR REPLACE FUNCTION create_properties_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que existe la extensión uuid-ossp
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Crear la tabla properties si no existe
  CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    descripcion TEXT NOT NULL,
    caracteristicas JSONB NOT NULL,
    resumen TEXT NOT NULL,
    imagenes TEXT[] NOT NULL,
    stored_images TEXT[] NOT NULL,
    precio_mxn TEXT NOT NULL,
    precio_usd TEXT NOT NULL,
    ubicacion TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
  );
  
  -- Otorgar permisos a los roles
  GRANT ALL ON public.properties TO authenticated, service_role;
  
  -- Otorgar permisos al esquema public
  GRANT USAGE ON SCHEMA public TO service_role, authenticated, anon;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
  GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
  
  -- Permitir a roles autenticados operaciones CRUD en la tabla
  GRANT INSERT, SELECT, UPDATE, DELETE ON public.properties TO authenticated;
  
  -- También otorgar permisos al rol anónimo para operaciones de lectura
  GRANT SELECT ON public.properties TO anon;
END;
$$;

-- Ejecutar la función para crear la tabla
SELECT create_properties_table();

-- Habilitar RLS en la tabla properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Allow SELECT for all users" ON public.properties;
DROP POLICY IF EXISTS "Allow INSERT for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Allow UPDATE for owners" ON public.properties;
DROP POLICY IF EXISTS "Allow DELETE for owners" ON public.properties;

-- Política para permitir SELECT a todos los usuarios
CREATE POLICY "Allow SELECT for all users"
ON public.properties FOR SELECT
USING (true);

-- Política para permitir INSERT a usuarios autenticados
CREATE POLICY "Allow INSERT for authenticated users"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir UPDATE a propietarios
CREATE POLICY "Allow UPDATE for owners"
ON public.properties FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Política para permitir DELETE a propietarios
CREATE POLICY "Allow DELETE for owners"
ON public.properties FOR DELETE
TO authenticated
USING (auth.uid() = created_by);`}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {status === 'success' && (
        <div className="bg-green-950 border border-green-800 p-4 rounded-md mb-4">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-green-400 font-medium">Base de datos configurada correctamente</h3>
              <p className="text-green-300 mt-1">
                {result?.instructions || 'La configuración se ha realizado correctamente. Ahora puedes usar el scraper sin problemas.'}
              </p>
              
              {result && result.results && (
                <div className="mt-4 space-y-3">
                  <div className="border border-green-800 bg-green-900/30 p-3 rounded">
                    <h5 className="font-medium mb-1 flex items-center">
                      {result.results.storage.success 
                        ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                        : <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />}
                      Configuración de Almacenamiento
                    </h5>
                    {result.results.storage.message && (
                      <p className="text-gray-300 text-sm">{result.results.storage.message}</p>
                    )}
                    {result.results.storage.warning && (
                      <p className="text-yellow-300 text-sm">{result.results.storage.warning}</p>
                    )}
                  </div>
                  
                  <div className="border border-green-800 bg-green-900/30 p-3 rounded">
                    <h5 className="font-medium mb-1 flex items-center">
                      {result.results.table.success 
                        ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> 
                        : <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />}
                      Configuración de Tabla y Políticas RLS
                    </h5>
                    {result.results.table.message && (
                      <p className="text-gray-300 text-sm">{result.results.table.message}</p>
                    )}
                    {result.results.table.warning && (
                      <p className="text-yellow-300 text-sm">{result.results.table.warning}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 