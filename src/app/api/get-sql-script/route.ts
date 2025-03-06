import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Script SQL para crear la tabla y establecer las políticas
  const sqlScript = `
-- Crear extensión para UUID si aún no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear la tabla properties si no existe
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

-- Habilitar Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Crear las políticas RLS
-- Política para permitir a cualquier usuario autenticado insertar datos
CREATE POLICY IF NOT EXISTS "properties_insert_policy"
ON public.properties FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir a cualquier usuario autenticado leer todas las propiedades
CREATE POLICY IF NOT EXISTS "properties_select_policy"
ON public.properties FOR SELECT
TO authenticated
USING (true);

-- Política para permitir al creador actualizar sus propiedades
CREATE POLICY IF NOT EXISTS "properties_update_policy"
ON public.properties FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR created_by IS NULL)
WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

-- Política para permitir al creador eliminar sus propiedades
CREATE POLICY IF NOT EXISTS "properties_delete_policy"
ON public.properties FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR created_by IS NULL);

-- Permitir acceso anónimo para operaciones SELECT
CREATE POLICY IF NOT EXISTS "properties_anon_select_policy"
ON public.properties FOR SELECT
TO anon
USING (true);

-- Dar permisos al rol service_role (usado por el cliente admin)
GRANT ALL ON public.properties TO service_role;

-- Crear un registro de prueba para verificar que todo funciona
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
  '{"test": true}'::jsonb,
  'Este es un registro de prueba para verificar que la tabla fue creada correctamente',
  ARRAY['https://example.com/test.jpg'],
  ARRAY[]::text[],
  'Test MXN',
  'Test USD',
  'Test Location',
  'https://test-setup-' || extract(epoch from now())::text || '.com'
);
  `;

  // Devuelve el script SQL en formato de texto plano
  return new NextResponse(sqlScript, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
} 