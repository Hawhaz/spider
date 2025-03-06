-- Script de configuración simplificado para Supabase
-- Este script debe ejecutarse directamente en el SQL Editor de Supabase
-- URL: https://app.supabase.com/project/_/sql

-- Crear extensión para UUID si aún no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Crear la tabla properties si no existe
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  descripcion TEXT,
  caracteristicas JSONB,
  resumen TEXT,
  imagenes TEXT[],
  stored_images TEXT[],
  precio_mxn TEXT,
  precio_usd TEXT,
  ubicacion TEXT,
  url TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- 3. Crear las políticas RLS para controlar el acceso a la tabla
-- Primero eliminamos las políticas si ya existen
DROP POLICY IF EXISTS "properties_insert_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_select_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_update_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_policy" ON public.properties;
DROP POLICY IF EXISTS "properties_anon_select_policy" ON public.properties;

-- Crear nuevas políticas
CREATE POLICY "properties_insert_policy" ON public.properties 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "properties_select_policy" ON public.properties 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "properties_update_policy" ON public.properties 
FOR UPDATE TO authenticated 
USING (created_by = auth.uid() OR created_by IS NULL)
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "properties_delete_policy" ON public.properties 
FOR DELETE TO authenticated 
USING (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "properties_anon_select_policy" ON public.properties 
FOR SELECT TO anon USING (true);

-- 4. Dar permisos al rol service_role (usado por el cliente admin)
GRANT ALL ON public.properties TO service_role;
GRANT ALL ON public.properties TO authenticated;
GRANT SELECT ON public.properties TO anon;

-- 5. Insertar un registro de prueba para verificar que todo funciona
INSERT INTO public.properties (
  descripcion,
  caracteristicas,
  resumen,
  imagenes,
  stored_images,
  precio_mxn,
  precio_usd,
  ubicacion,
  url
) VALUES (
  'Registro de prueba creado durante la configuración',
  '{"test": true, "habitaciones": "2", "baños": "1", "estacionamiento": "1"}'::jsonb,
  'Este es un registro de prueba para verificar que la tabla fue creada correctamente',
  ARRAY['https://example.com/test.jpg'],
  ARRAY[]::text[],
  '$2,500,000 MXN',
  '$125,000 USD',
  'Ciudad de México, México',
  'https://test-setup-' || extract(epoch from now())::text || '.com'
);

-- 6. Verificar que la tabla se creó correctamente
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
     AND table_name = 'properties'
);

-- 7. Contar registros para verificar la inserción
SELECT count(*) FROM public.properties; 