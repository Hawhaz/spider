import { DatabaseSetup } from "@/app/_components/DatabaseSetup";

export const metadata = {
  title: 'Configuración de Base de Datos - ListUp',
  description: 'Configura la base de datos y permisos necesarios para el funcionamiento de la aplicación',
};

export default function SetupPage() {
  return (
    <main className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <div className="container mx-auto py-12 px-4">
        <h1 className="text-3xl font-extrabold mb-8 text-center text-violet-400">
          Configuración de Base de Datos
        </h1>
        
        <div className="max-w-4xl mx-auto">
          <p className="text-lg mb-8 text-gray-300 text-center">
            Esta herramienta te permite configurar automáticamente la base de datos y los permisos necesarios
            para el correcto funcionamiento de ListUp, especialmente para el scraper de propiedades.
          </p>
          
          <DatabaseSetup />
          
          <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-violet-400">Instrucciones</h2>
            
            <div className="space-y-4 text-gray-300">
              <p>
                Si estás experimentando errores de permisos o problemas de configuración con Supabase,
                sigue estos pasos:
              </p>
              
              <ol className="list-decimal pl-5 space-y-2">
                <li>Haz clic en el botón "Configurar Base de Datos" para intentar la configuración automática.</li>
                <li>Si la configuración automática no funciona, puedes ejecutar manualmente el script SQL mostrado.</li>
                <li>
                  Ve al <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">
                    Dashboard de Supabase
                  </a>, selecciona tu proyecto, y luego ve a "SQL Editor".
                </li>
                <li>Pega el script SQL proporcionado y ejecútalo.</li>
                <li>Vuelve aquí y prueba nuevamente la configuración para confirmar que todo funciona correctamente.</li>
              </ol>
              
              <p className="mt-4 text-gray-400 text-sm">
                Nota: Este proceso solamente necesita realizarse una vez. Una vez configurada la base de datos 
                correctamente, el scraper y otras funcionalidades deberían funcionar sin problemas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 