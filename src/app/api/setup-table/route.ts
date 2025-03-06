import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    // Script SQL para crear la tabla y establecer las políticas
    const sqlScript = `
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
    `;

    // Ejecutar el script SQL directamente
    const { error } = await supabaseAdmin.rpc('exec_sql', {
      query: sqlScript
    });

    if (error) {
      console.error('Error al ejecutar el script SQL:', error);
      return NextResponse.json(
        {
          success: false,
          error: `Error al ejecutar el script SQL: ${error.message}`,
          details: error,
        },
        { status: 500 }
      );
    }

    // Verificar si la tabla se creó correctamente
    const { count, error: countError } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return NextResponse.json(
        {
          success: false,
          error: `Error al verificar la tabla: ${countError.message}`,
          details: countError,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tabla properties creada correctamente',
      recordCount: count
    });
  } catch (error) {
    console.error('Error al configurar la tabla:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      {
        success: false,
        error: `Error general: ${errorMessage}`,
        details: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      },
      { status: 500 }
    );
  }
} 