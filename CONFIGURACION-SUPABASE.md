# Configuración de Supabase para ListUp

Este documento proporciona instrucciones detalladas para configurar correctamente Supabase para la aplicación ListUp.

## Problema

Si estás viendo errores como:
```
Error: Error en el scraping: "Error al guardar datos: Error de permisos: permission denied for schema public. Asegúrate de haber configurado las políticas RLS."
```

Es porque la tabla `properties` no existe en tu base de datos Supabase o porque las políticas de seguridad no están configuradas correctamente.

## Solución

Sigue estos pasos para configurar correctamente Supabase:

### 1. Configurar la Base de Datos

1. **Accede al panel de control de Supabase**
   - Ve a [https://app.supabase.com](https://app.supabase.com) y accede a tu proyecto.

2. **Abre el Editor SQL**
   - En el menú lateral izquierdo, haz clic en "SQL Editor".
   - Selecciona "New Query" para crear una nueva consulta.

3. **Ejecuta el script SQL**
   - Copia y pega el contenido del archivo `setup-supabase-direct.sql` en el editor.
   - Haz clic en el botón "Run" para ejecutar el script.
   - Este script creará:
     - La tabla `properties`
     - Las políticas de seguridad RLS necesarias
     - Un registro de prueba para verificar que todo funciona

### 2. Configurar el Almacenamiento

1. **Navega a la sección de Storage**
   - En el menú lateral izquierdo, haz clic en "Storage".

2. **Crea un nuevo bucket**
   - Haz clic en el botón "New Bucket".
   - Nombra el bucket como `property-images`.
   - Marca la opción "Public bucket" para que las imágenes sean accesibles públicamente.
   - Haz clic en "Create bucket".

3. **Configura las políticas de acceso**

   **Para acceso público (lectura)**
   1. Selecciona el bucket `property-images`.
   2. Ve a la pestaña "Policies".
   3. Haz clic en "Add Policy".
   4. Selecciona "Get objects (read)" en el tipo de política.
   5. Selecciona "For users" y elige "anon, authenticated" para permitir acceso a usuarios anónimos y autenticados.
   6. Haz clic en "Save Policy".

   **Para subir imágenes (escritura)**
   1. Selecciona el bucket `property-images`.
   2. Ve a la pestaña "Policies".
   3. Haz clic en "Add Policy".
   4. Selecciona "Insert objects (upload)" en el tipo de política.
   5. Selecciona "For users" y elige "authenticated" para permitir solo a usuarios autenticados subir imágenes.
   6. Haz clic en "Save Policy".

### 3. Verificar la Configuración

1. **Verifica la tabla**
   - En el menú lateral izquierdo, haz clic en "Table Editor".
   - Deberías ver la tabla `properties` en la lista.
   - Haz clic en la tabla para ver su contenido. Debería haber al menos un registro de prueba.

2. **Verifica el bucket de almacenamiento**
   - En el menú lateral izquierdo, haz clic en "Storage".
   - Deberías ver el bucket `property-images` en la lista.
   - Verifica que las políticas de acceso están configuradas correctamente.

### 4. Prueba la Aplicación

Una vez completados los pasos anteriores, vuelve a la aplicación y prueba la funcionalidad de scraping. Ahora debería funcionar correctamente sin errores de permisos.

## Archivos de Configuración

- `setup-supabase-direct.sql`: Script SQL para crear la tabla y configurar las políticas RLS.
- `setup-storage-bucket.md`: Instrucciones detalladas para configurar el bucket de almacenamiento.

## Solución de Problemas

Si sigues teniendo problemas después de seguir estos pasos, verifica:

1. **Claves de API**: Asegúrate de que las claves de API en tu archivo `.env` son correctas.
2. **Permisos**: Verifica que las políticas RLS están configuradas correctamente.
3. **Estructura de la tabla**: Asegúrate de que la estructura de la tabla `properties` coincide con la esperada por la aplicación.

Para obtener ayuda adicional, consulta la [documentación de Supabase](https://supabase.com/docs) o contacta al equipo de soporte. 