import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { env } from '@/env';

export async function GET(req: NextRequest) {
  try {
    // Recopilar información de diagnóstico
    const diagnosticInfo = {
      supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      hasAnonKey: Boolean(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
    
    // Verificar la conexión a Supabase con una consulta simple
    console.log('Verificando conexión a Supabase...');
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    // Verificar si la tabla properties existe
    console.log('Verificando si la tabla properties existe...');
    const { count, error: tableError } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true });
    
    // Intentar una inserción de prueba
    console.log('Intentando una inserción de prueba...');
    const testData = {
      descripcion: 'Prueba de diagnóstico',
      caracteristicas: { test: true },
      resumen: 'Registro de prueba para diagnóstico',
      imagenes: ['https://example.com/test.jpg'],
      stored_images: [],
      precio_mxn: 'Test',
      precio_usd: 'Test',
      ubicacion: 'Test',
      url: `https://test-diagnostic-${Date.now()}.com`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert([testData])
      .select();
    
    // Si la inserción fue exitosa, eliminar el registro de prueba
    let deleteResult = null;
    let deleteError = null;
    if (insertData && insertData.length > 0) {
      console.log('Eliminando registro de prueba...');
      const { data, error } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', insertData[0].id);
      
      deleteResult = data;
      deleteError = error;
    }
    
    // Preparar el resultado del diagnóstico
    const result = {
      success: !bucketsError && !tableError && !insertError,
      diagnosticInfo,
      storage: {
        buckets: buckets || [],
        error: bucketsError ? {
          message: bucketsError.message,
          errorString: JSON.stringify(bucketsError)
        } : null
      },
      table: {
        exists: !tableError,
        recordCount: count,
        error: tableError ? {
          message: tableError.message,
          code: tableError.code,
          details: tableError.details
        } : null
      },
      testInsert: {
        success: Boolean(insertData && insertData.length > 0),
        data: insertData,
        error: insertError ? {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        } : null
      },
      testDelete: {
        success: !deleteError,
        data: deleteResult,
        error: deleteError ? {
          message: deleteError.message,
          code: deleteError.code,
          details: deleteError.details
        } : null
      }
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error durante el diagnóstico de Supabase:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      },
      { status: 500 }
    );
  }
} 