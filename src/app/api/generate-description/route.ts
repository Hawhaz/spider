import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import z from 'zod';
import { DESCRIPTION_STYLES, DEFAULT_STYLE_ID, getStyleById } from '@/lib/descriptionStyles';

// Esquema más flexible que puede manejar tanto strings como arrays
const propertySchema = z.object({
  descripcion: z.union([z.string(), z.array(z.string())]),
  caracteristicas: z.record(z.union([z.string(), z.array(z.string())])),
  resumen: z.union([z.string(), z.array(z.string())]),
  precio: z.object({
    mxn: z.union([z.string(), z.array(z.string())]),
    usd: z.union([z.string(), z.array(z.string())]).optional(),
  }),
  ubicacion: z.union([z.string(), z.array(z.string())]),
  tipo: z.string().optional(),
  operacion: z.string().optional(),
  detalles: z.object({
    terreno: z.string().optional(),
    construccion: z.string().optional(),
    recamaras: z.string().optional(),
    banos: z.string().optional(),
    estacionamientos: z.string().optional(),
    antiguedad: z.string().optional(),
    niveles: z.string().optional(),
  }).optional(),
  amenidades: z.array(z.string()).optional(),
});

const requestSchema = z.object({
  property: propertySchema,
  styleId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('Recibida solicitud para generar descripción');
    
    // Obtener el cuerpo de la solicitud como texto para depuración
    const bodyText = await req.text();
    console.log('Cuerpo de la solicitud como texto:', bodyText);
    
    let requestBody;
    try {
      requestBody = JSON.parse(bodyText);
      console.log('Cuerpo de la solicitud parseado:', requestBody);
    } catch (e) {
      console.error('Error al parsear el cuerpo de la solicitud:', e);
      return NextResponse.json(
        { 
          success: false,
          error: `Error al parsear el cuerpo de la solicitud: ${(e as Error).message}` 
        },
        { status: 400 }
      );
    }
    
    // Validar el cuerpo de la solicitud con el esquema
    const validation = requestSchema.safeParse(requestBody);
    
    if (!validation.success) {
      console.error('Error de validación:', validation.error.format());
      return NextResponse.json(
        { 
          success: false,
          error: `Error de validación: ${validation.error.errors.map(e => e.message).join(', ')}` 
        },
        { status: 400 }
      );
    }
    
    const { property, styleId = DEFAULT_STYLE_ID } = validation.data;
    
    // Limpiar y normalizar los datos para asegurar que son strings
    const cleanedProperty = {
      ...property,
      descripcion: Array.isArray(property.descripcion) ? property.descripcion.join('\n') : property.descripcion,
      resumen: Array.isArray(property.resumen) ? property.resumen.join('\n') : property.resumen,
      ubicacion: Array.isArray(property.ubicacion) ? property.ubicacion.join(', ') : property.ubicacion,
      precio: {
        mxn: Array.isArray(property.precio.mxn) ? property.precio.mxn.join(' ') : property.precio.mxn,
        usd: property.precio.usd ? (Array.isArray(property.precio.usd) ? property.precio.usd.join(' ') : property.precio.usd) : '',
      },
      caracteristicas: Object.entries(property.caracteristicas).reduce((acc, [key, value]) => {
        acc[key] = Array.isArray(value) ? value.join(' ') : String(value);
        return acc;
      }, {} as Record<string, string>),
    };
    
    console.log('Propiedad limpia para procesar:', cleanedProperty);
    
    // Obtener el estilo seleccionado
    const selectedStyle = getStyleById(styleId);
    console.log('Estilo seleccionado:', selectedStyle.name);
    
    // Crear un prompt estructurado para OpenAI
    const prompt = createPropertyPrompt(cleanedProperty, selectedStyle.prompt);
    console.log('Prompt generado:', prompt);
    
    // Llamar a la API de OpenAI
    const generatedDescription = await generatePropertyDescription(prompt);
    console.log('Descripción generada con éxito');
    
    // Devolver la descripción generada
    return NextResponse.json({
      success: true,
      description: generatedDescription,
    });
  } catch (error) {
    console.error('Error al generar la descripción:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: `Error al generar la descripción: ${(error as Error).message}` 
      },
      { status: 500 }
    );
  }
}

/**
 * Crea un prompt estructurado para enviar a OpenAI basado en los datos de la propiedad
 */
function createPropertyPrompt(property: any, stylePrompt: string): string {
  // Crear un texto con los detalles relevantes de la propiedad
  let caracteristicasTexto = '';
  for (const [key, value] of Object.entries(property.caracteristicas)) {
    caracteristicasTexto += `- ${key}: ${value}\n`;
  }
  
  // Crear texto de detalles
  let detallesTexto = '';
  if (property.detalles) {
    for (const [key, value] of Object.entries(property.detalles)) {
      if (value) {
        detallesTexto += `- ${key}: ${value}\n`;
      }
    }
  }
  
  // Crear texto de amenidades
  let amenidadesTexto = '';
  if (property.amenidades && property.amenidades.length > 0) {
    amenidadesTexto = 'Amenidades:\n' + property.amenidades.map((a: string) => `- ${a}`).join('\n');
  }
  
  // Construir el prompt base con los datos de la propiedad
  const propertyDataPrompt = `
Tipo: ${property.tipo || 'No especificado'}
Operación: ${property.operacion || 'No especificada'}
Ubicación: ${property.ubicacion}
Precio: ${property.precio.mxn} MXN ${property.precio.usd ? `/ ${property.precio.usd} USD` : ''}

Resumen:
${property.resumen}

Características:
${caracteristicasTexto}

${detallesTexto ? `Detalles:\n${detallesTexto}` : ''}

${amenidadesTexto}

Descripción original:
${property.descripcion}
`.trim();

  // Combinar el prompt de estilo con los datos de la propiedad
  return `${stylePrompt}

La propiedad tiene los siguientes datos:
${propertyDataPrompt}`;
}

/**
 * Llama a la API de OpenAI para generar una descripción de la propiedad
 */
async function generatePropertyDescription(prompt: string): Promise<string> {
  try {
    // Obtener la API key desde las variables de entorno
    const apiKey = env.GPT_API_KEY;
    const apiUrl = env.GPT_API_URL;
    
    if (!apiKey) {
      throw new Error('API key de OpenAI no configurada en las variables de entorno');
    }
    
    console.log('Enviando solicitud a OpenAI');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experimentado agente inmobiliario especializado en crear descripciones atractivas y profesionales para propiedades inmobiliarias premium.'
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    
    console.log('Respuesta recibida de OpenAI, status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en la respuesta de OpenAI:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Error en la API de OpenAI: ${JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`Error en la API de OpenAI (status ${response.status}): ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('Datos recibidos de OpenAI:', data);
    
    if (!data.choices || !data.choices.length || !data.choices[0].message) {
      throw new Error('Formato de respuesta de OpenAI inesperado');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error al generar la descripción con OpenAI:', error);
    throw error;
  }
} 