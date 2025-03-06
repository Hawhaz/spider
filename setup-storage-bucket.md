# Configuración del Bucket de Almacenamiento en Supabase

Para que la aplicación funcione correctamente, necesitas crear un bucket de almacenamiento para las imágenes de las propiedades. Sigue estos pasos:

## 1. Accede al panel de control de Supabase

- Ve a [https://app.supabase.com](https://app.supabase.com) y accede a tu proyecto.

## 2. Navega a la sección de Storage

- En el menú lateral izquierdo, haz clic en "Storage".

## 3. Crea un nuevo bucket

- Haz clic en el botón "New Bucket".
- Nombra el bucket como `property-images`.
- Marca la opción "Public bucket" para que las imágenes sean accesibles públicamente.
- Haz clic en "Create bucket".

## 4. Configura las políticas de acceso

Para asegurarte de que los usuarios puedan acceder a las imágenes, configura las siguientes políticas:

### Para acceso público (lectura)

1. Selecciona el bucket `property-images`.
2. Ve a la pestaña "Policies".
3. Haz clic en "Add Policy".
4. Selecciona "Get objects (read)" en el tipo de política.
5. Selecciona "For users" y elige "anon, authenticated" para permitir acceso a usuarios anónimos y autenticados.
6. Haz clic en "Save Policy".

### Para subir imágenes (escritura)

1. Selecciona el bucket `property-images`.
2. Ve a la pestaña "Policies".
3. Haz clic en "Add Policy".
4. Selecciona "Insert objects (upload)" en el tipo de política.
5. Selecciona "For users" y elige "authenticated" para permitir solo a usuarios autenticados subir imágenes.
6. Haz clic en "Save Policy".

## 5. Verifica la configuración

- Asegúrate de que el bucket `property-images` aparece en la lista de buckets.
- Verifica que las políticas de acceso están configuradas correctamente.

Con estos pasos, habrás configurado correctamente el almacenamiento para las imágenes de las propiedades en tu aplicación. 