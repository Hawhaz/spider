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
  
  -- Eliminar políticas existentes para evitar duplicados
  DROP POLICY IF EXISTS "Allow SELECT for all users" ON public.properties;
  DROP POLICY IF EXISTS "Allow INSERT for authenticated users" ON public.properties;
  DROP POLICY IF EXISTS "Allow UPDATE for owners" ON public.properties;
  DROP POLICY IF EXISTS "Allow DELETE for owners" ON public.properties;
  
  -- Asegurarse que RLS está habilitado
  ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
  
  -- Política para permitir SELECT a todos los usuarios
  CREATE POLICY "Allow SELECT for all users"
  ON public.properties FOR SELECT
  TO anon, authenticated, service_role
  USING (true);
  
  -- Política para permitir INSERT a usuarios autenticados y al rol de servicio
  CREATE POLICY "Allow INSERT for authenticated users"
  ON public.properties FOR INSERT
  TO authenticated, service_role
  WITH CHECK (true);
  
  -- Política para permitir UPDATE a propietarios y al rol de servicio
  CREATE POLICY "Allow UPDATE for owners"
  ON public.properties FOR UPDATE
  TO authenticated, service_role
  USING (auth.uid() = created_by OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = created_by OR auth.role() = 'service_role');
  
  -- Política para permitir DELETE a propietarios y al rol de servicio
  CREATE POLICY "Allow DELETE for owners"
  ON public.properties FOR DELETE
  TO authenticated, service_role
  USING (auth.uid() = created_by OR auth.role() = 'service_role');
  
END;
$$;

-- Función para activar RLS en la tabla properties
CREATE OR REPLACE FUNCTION enable_rls_on_properties()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Habilitar RLS en la tabla properties
  ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
END;
$$;

-- Función para crear políticas RLS en la tabla properties
CREATE OR REPLACE FUNCTION create_properties_policy(
  policy_name TEXT,
  operation TEXT,
  definition TEXT,
  check_expression TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sql_statement TEXT;
  policy_exists BOOLEAN;
BEGIN
  -- Verificar si la política ya existe
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'properties' 
    AND policyname = policy_name
  ) INTO policy_exists;
  
  -- Si la política ya existe, eliminarla para recrearla
  IF policy_exists THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', policy_name);
  END IF;
  
  -- Construir la sentencia SQL para crear la política
  sql_statement := format(
    'CREATE POLICY %I ON public.properties FOR %s USING (%s)',
    policy_name,
    operation,
    definition
  );
  
  -- Agregar la cláusula WITH CHECK si es necesaria y se proporcionó
  IF operation IN ('INSERT', 'UPDATE', 'ALL') AND check_expression IS NOT NULL THEN
    sql_statement := sql_statement || format(' WITH CHECK (%s)', check_expression);
  END IF;
  
  -- Ejecutar la sentencia SQL
  EXECUTE sql_statement;
END;
$$;

-- Función para crear políticas de almacenamiento
CREATE OR REPLACE FUNCTION create_storage_policy(
  bucket_name TEXT,
  policy_name TEXT,
  definition TEXT,
  policy_type TEXT -- 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_exists BOOLEAN;
  bucket_id TEXT;
BEGIN
  -- Obtener el ID del bucket
  SELECT id INTO bucket_id FROM storage.buckets WHERE name = bucket_name;
  
  IF bucket_id IS NULL THEN
    RAISE EXCEPTION 'Bucket % no encontrado', bucket_name;
    RETURN;
  END IF;
  
  -- Verificar si la política ya existe
  SELECT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = bucket_id 
    AND name = policy_name
  ) INTO policy_exists;
  
  -- Si la política ya existe, eliminarla para recrearla
  IF policy_exists THEN
    DELETE FROM storage.policies 
    WHERE bucket_id = bucket_id AND name = policy_name;
  END IF;
  
  -- Insertar la nueva política
  INSERT INTO storage.policies (name, bucket_id, definition)
  VALUES (policy_name, bucket_id, definition);
END;
$$; 