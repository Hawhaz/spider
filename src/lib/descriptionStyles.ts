export interface DescriptionStyle {
  id: string;
  name: string;
  prompt: string;
  description: string;
}

export const DESCRIPTION_STYLES: Record<string, DescriptionStyle> = {
  floral: {
    id: 'floral',
    name: 'Floral',
    description: 'Estilo decorativo con emojis de flores y formato elegante',
    prompt: `IMPORTANTE: El siguiente es solo un ejemplo del FORMATO y ESTILO que debes usar. NO copies los datos del ejemplo, usa los datos proporcionados en el prompt.

Las publicacion que crearas debe ser como la de este estilo:

✿⋆⋆⋆⋆⋆✿
🌸 ℂ𝒶𝓈𝒶 𝑒𝓃 𝒱𝑒𝓃𝓉𝒶 🌸
✿⋆⋆⋆⋆⋆✿

📍 𝒰𝒷𝒾𝒸𝒶𝒸𝒾𝑜́𝓃: Villas del Sol II, Ensenada, B.C.
💰 𝒫𝓇𝑒𝒸𝒾𝑜 𝒹𝑒 𝓋𝑒𝓃𝓉𝒶: $1,650,000 Pesos M.N.

𝒞𝒶𝓇𝒶𝒸𝓉𝑒𝓇𝒾́𝓈𝓉𝒾𝒸𝒶𝓈:
✿ 3 Habitaciones
✿ 1.5 Baños
✿ Sala
✿ Comedor
✿ Cocina
✿ Estacionamiento para 2 carros

Libertad de Gravamen: ✅
Se aceptan todos los créditos: ✅

¡Aprovecha esta oportunidad! Nuestros agentes estarán disponibles para guiarte paso a paso hacia tu nuevo hogar. 🤓

ℳ𝑒𝓇𝑒𝒸𝑒𝓈 𝑒𝓁 ℋ𝑜𝑔𝒶𝓇 𝓆𝓊𝑒 𝓉𝒶𝓃𝓉𝑜 𝓈𝓊𝑒𝓃̃𝒶𝓈 🏡✨

Haz una sección de hashtags (#) para la optimización SEO de la propiedad para tener más alcance, donde estén todos los datos importantes de la propiedad y más hashtags de valor`
  },
  elegante: {
    id: 'elegante',
    name: 'Elegante',
    description: 'Estilo sofisticado con formato estructurado y detalles premium',
    prompt: `IMPORTANTE: El siguiente es solo un ejemplo del FORMATO y ESTILO que debes usar. NO copies los datos del ejemplo, usa los datos proporcionados en el prompt.

Las publicacion que crearas debe ser como la de este estilo:

————————————
🏡 𝐂𝐀𝐒𝐀 𝐄𝐍 𝐕𝐄𝐍𝐓𝐀 𝐄𝐍 𝐄𝐍𝐒𝐄𝐍𝐀𝐃𝐀, 𝐁𝐂! 🏡
————————————

📍 Ubicación: Col. Hidalgo

Descubre el hogar de tus sueños en una de las mejores zonas de Ensenada. Esta hermosa propiedad, totalmente amueblada y equipada, es perfecta para quienes buscan comodidad, espacio y estilo. ✨

🔑 Características:

    🛏 3 amplias habitaciones
    🚿 3 baños completos
    🛋 Sala, comedor y cocina de concepto abierto
    🚗 Garage para 5 autos
    🌿 Patio trasero con pérgola, sala de exterior y asador
    🏠 2 plantas llenas de confort
    📐 Terreno: 207 m² (10m x 27m)
    🛠 Construcción: 200 m²
    📅 Año de construcción: 2022

¡No pierdas esta oportunidad única de vivir en el hogar que siempre soñaste! ❤


Haz una sección de hashtags (#) para la optimización SEO de la propiedad para tener más alcance, donde estén todos los datos importantes de la propiedad y más hashtags de valor`
  },
  minimalista: {
    id: 'minimalista',
    name: 'Minimalista',
    description: 'Estilo simple y directo, sin adornos innecesarios',
    prompt: `IMPORTANTE: El siguiente es solo un ejemplo del FORMATO y ESTILO que debes usar. NO copies los datos del ejemplo, usa los datos proporcionados en el prompt.

Las publicacion que crearas debe ser como la de este estilo:

🔵 CASA EN VENTA, ENSENADA BC

Ubicación: Villa Residencial del Rey II

Características:
• 2 cuartos
• Sala
• Cocina
• 1.5 baños
• Estacionamiento para 2 carros

Precio: $1,800,000 MN
Créditos: Se acepta crédito Infonavit y bancario

¡Llama ahora y conoce tu próximo hogar!

Haz una sección de hashtags (#) para la optimización SEO de la propiedad para tener más alcance, donde estén todos los datos importantes de la propiedad y más hashtags de valor`
  },
  estrella: {
    id: 'estrella',
    name: 'Estrella',
    description: 'Estilo con símbolos de estrellas y formato elegante',
    prompt: `IMPORTANTE: El siguiente es solo un ejemplo del FORMATO y ESTILO que debes usar. NO copies los datos del ejemplo, usa los datos proporcionados en el prompt.

Las publicacion que crearas debe ser como la de este estilo:

───── ✦ ─────
𝐂𝐀𝐒𝐀 𝐄𝐍 𝐕𝐄𝐍𝐓𝐀, 𝐄𝐍𝐒𝐄𝐍𝐀𝐃𝐀 𝐁𝐂 🏠
───── ✦ ─────

𝑈𝑏𝑖𝑐𝑎𝑐𝑖𝑜́𝑛: 𝐕𝐢𝐥𝐥𝐚 𝐑𝐞𝐬𝐢𝐝𝐞𝐧𝐜𝐢𝐚𝐥 𝐝𝐞𝐥 𝐑𝐞𝐲 𝐈𝐈

Características:
◆ 2 cuartos
◆ Sala
◆ Cocina
◆ 1.5 baños
◆ Estacionamiento para 2 carros

Precio: $1,800,000 MN

Se acepta crédito Infonavit y bancario.

Para mayor información o agendar una cita:
☎ 

¡Conozca este hogar de ensueño con encanto atemporal!

Haz una sección de hashtags (#) para la optimización SEO de la propiedad para tener más alcance, donde estén todos los datos importantes de la propiedad y más hashtags de valor`
  },
  profesional: {
    id: 'profesional',
    name: 'Profesional',
    description: 'Estilo orientado a la venta con detalles completos y verificaciones',
    prompt: `IMPORTANTE: El siguiente es solo un ejemplo del FORMATO y ESTILO que debes usar. NO copies los datos del ejemplo, usa los datos proporcionados en el prompt.

Las publicacion que crearas debe ser como la de este estilo:

🏡Casa en venta en Loma Dorada, Ensenada, Baja California

📌Características:
✅3 Habitaciones (Principal con walk-in closet y baño completo)
✅2.5 Baños
✅Sala
✅Cocina
✅Comedor
✅Cuarto de TV
✅Cuarto de lavar
✅Estudio
✅Estacionamiento para 1 auto

📌La casa está lista para remodelar al gusto del comprador.
Incluye:
✅Fotos con renders de la propuesta de remodelación
✅Planos originales del arquitecto que construyó la casa

📍Ubicación:
✅A 3 cuadras de Ave. Reforma
✅A 4 cuadras de Ave. Pedro Loyola
✅A 800 mts de Macroplaza

🏦Acepta créditos
💵Precio: $4,300,000 MXN


Haz una sección de hashtags (#) para la optimización SEO de la propiedad para tener más alcance, donde estén todos los datos importantes de la propiedad y más hashtags de valor`
  }
};

export const DEFAULT_STYLE_ID = 'elegante';

export function getStyleById(id: string): DescriptionStyle {
  // Aseguramos que el estilo por defecto siempre existe
  const defaultStyle = DESCRIPTION_STYLES[DEFAULT_STYLE_ID] as DescriptionStyle;
  
  // Intentamos obtener el estilo solicitado
  return id in DESCRIPTION_STYLES 
    ? DESCRIPTION_STYLES[id] as DescriptionStyle 
    : defaultStyle;
}

export function getAllStyles(): DescriptionStyle[] {
  return Object.values(DESCRIPTION_STYLES);
} 