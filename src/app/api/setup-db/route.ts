import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Función para configurar el bucket de imágenes
async function setupStorageBucket() {
  try {
    // Verificar si el bucket ya existe
    const { data: buckets, error: bucketsError } = await supabaseAdmin
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error('Error al listar buckets:', bucketsError);
      return { success: false, error: bucketsError.message };
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'property-images');
    
    if (bucketExists) {
      console.log('El bucket "property-images" ya existe');
      return { success: true, message: 'El bucket ya existe' };
    }
    
    // Crear el bucket si no existe
    const { data, error } = await supabaseAdmin
      .storage
      .createBucket('property-images', {
        public: false, // No hacer público por defecto
      });
    
    if (error) {
      console.error('Error al crear bucket:', error);
      return { success: false, error: error.message };
    }
    
    // Configurar políticas de acceso al bucket
    const { error: policyError } = await supabaseAdmin
      .storage
      .from('property-images')
      .createSignedUploadUrl('test.txt');
    
    if (policyError) {
      console.log('Error al verificar políticas de bucket:', policyError);
    }
    
    // Configurar política para permitir acceso público a las imágenes
    const { error: publicPolicyError } = await supabaseAdmin.rpc(
      'create_storage_policy',
      {
        bucket_name: 'property-images',
        policy_name: 'Public Read Access',
        definition: `bucket_id = 'property-images'`,
        policy_type: 'SELECT'
      }
    );
    
    if (publicPolicyError) {
      console.log('Error al crear política de acceso público:', publicPolicyError);
      return { success: true, warning: 'Bucket creado pero con posibles problemas de política de acceso' };
    }
    
    return { success: true, message: 'Bucket creado correctamente' };
  } catch (error) {
    console.error('Error inesperado al configurar bucket:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Función para configurar las políticas RLS para la tabla properties
async function setupPropertiesTable() {
  try {
    // 1. Verificar si la tabla existe
    const { count, error: countError } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    if (countError && countError.code === '42P01') {
      console.log('La tabla properties no existe, ejecutando SQL para crearla');
      
      // Crear la tabla si no existe
      const { error: createTableError } = await supabaseAdmin.rpc('create_properties_table');
      
      if (createTableError) {
        console.error('Error al crear tabla:', createTableError);
        return { success: false, error: `Error al crear tabla: ${createTableError.message}` };
      }
    } else if (countError) {
      console.error('Error al verificar tabla:', countError);
      return { success: false, error: countError.message };
    } else {
      console.log(`La tabla properties ya existe con ${count} registros`);
    }
    
    // 2. Configurar las políticas RLS
    
    // Primero activamos RLS en la tabla si no está activada
    const { error: rpcError } = await supabaseAdmin.rpc('enable_rls_on_properties');
    
    if (rpcError) {
      console.error('Error al activar RLS:', rpcError);
      return { success: false, error: `Error al activar RLS: ${rpcError.message}` };
    }
    
    // Políticas para permitir SELECT a todos los usuarios
    const { error: selectPolicyError } = await supabaseAdmin.rpc(
      'create_properties_policy',
      {
        policy_name: 'Allow SELECT for all users',
        operation: 'SELECT',
        definition: 'true',
        check_expression: 'true'
      }
    );
    
    if (selectPolicyError) {
      console.warn('Error al crear política SELECT:', selectPolicyError);
    }
    
    // Políticas para permitir INSERT a usuarios autenticados
    const { error: insertPolicyError } = await supabaseAdmin.rpc(
      'create_properties_policy',
      {
        policy_name: 'Allow INSERT for authenticated users',
        operation: 'INSERT',
        definition: 'auth.role() = \'authenticated\'',
        check_expression: 'true'
      }
    );
    
    if (insertPolicyError) {
      console.warn('Error al crear política INSERT:', insertPolicyError);
    }
    
    // Políticas para permitir UPDATE a propietarios
    const { error: updatePolicyError } = await supabaseAdmin.rpc(
      'create_properties_policy',
      {
        policy_name: 'Allow UPDATE for owners',
        operation: 'UPDATE',
        definition: 'auth.uid() = created_by',
        check_expression: 'auth.uid() = created_by'
      }
    );
    
    if (updatePolicyError) {
      console.warn('Error al crear política UPDATE:', updatePolicyError);
    }
    
    // Políticas para permitir DELETE a propietarios
    const { error: deletePolicyError } = await supabaseAdmin.rpc(
      'create_properties_policy',
      {
        policy_name: 'Allow DELETE for owners',
        operation: 'DELETE',
        definition: 'auth.uid() = created_by',
        check_expression: 'auth.uid() = created_by'
      }
    );
    
    if (deletePolicyError) {
      console.warn('Error al crear política DELETE:', deletePolicyError);
    }
    
    return { success: true, message: 'Políticas RLS configuradas correctamente' };
  } catch (error) {
    console.error('Error inesperado al configurar tabla:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
  }
}

// Endpoint principal
export async function GET(req: NextRequest) {
  try {
    const results = {
      storage: await setupStorageBucket(),
      table: await setupPropertiesTable(),
    };
    
    const allSuccess = results.storage.success && results.table.success;
    
    return NextResponse.json({
      success: allSuccess,
      results: results,
      instructions: !allSuccess
        ? 'Hubo errores configurando la base de datos. Revisa los detalles y los logs para más información.'
        : 'Base de datos configurada correctamente. Ahora puedes usar el scraper sin problemas.'
    });
  } catch (error) {
    console.error('Error general en setup-db:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
} 