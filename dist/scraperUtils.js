"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SCRAPER_CONFIG = void 0;
exports.normalizeUrl = normalizeUrl;
exports.extractDomain = extractDomain;
exports.toAbsoluteUrl = toAbsoluteUrl;
exports.cleanText = cleanText;
exports.extractNumber = extractNumber;
exports.extractPrice = extractPrice;
exports.fetchHtmlWithRetries = fetchHtmlWithRetries;
exports.generateIdFromUrl = generateIdFromUrl;
exports.extractMetadata = extractMetadata;
exports.extractJsonLd = extractJsonLd;
var axios_1 = require("axios");
// Configuración por defecto para el scraper
exports.DEFAULT_SCRAPER_CONFIG = {
    imageProcessor: {
        maxConcurrent: 5,
        maxRetries: 3,
        timeout: 15000,
        optimizeImages: false,
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 85
    },
    useCache: true,
    cacheTTL: 3600000, // 1 hora
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 30000, // 30 segundos
    retries: 3,
    logLevel: 'info'
};
// Función para normalizar URLs
function normalizeUrl(url) {
    try {
        // Asegurarse de que la URL tenga protocolo
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        var urlObj_1 = new URL(url);
        // Eliminar parámetros de seguimiento comunes
        var paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
        paramsToRemove.forEach(function (param) {
            urlObj_1.searchParams.delete(param);
        });
        // Normalizar el hostname (quitar www si existe)
        if (urlObj_1.hostname.startsWith('www.')) {
            urlObj_1.hostname = urlObj_1.hostname.substring(4);
        }
        // Eliminar slash final si existe
        var path = urlObj_1.pathname;
        if (path.endsWith('/') && path.length > 1) {
            urlObj_1.pathname = path.slice(0, -1);
        }
        return urlObj_1.toString();
    }
    catch (error) {
        // Si hay un error, devolver la URL original
        console.error('Error al normalizar URL:', error);
        return url;
    }
}
// Función para extraer el dominio de una URL
function extractDomain(url) {
    try {
        var urlObj = new URL(normalizeUrl(url));
        return urlObj.hostname;
    }
    catch (error) {
        console.error('Error al extraer dominio:', error);
        return '';
    }
}
// Función para convertir una URL relativa a absoluta
function toAbsoluteUrl(relativeUrl, baseUrl) {
    try {
        // Si ya es una URL absoluta, devolverla
        if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
            return relativeUrl;
        }
        // Si comienza con //, añadir https:
        if (relativeUrl.startsWith('//')) {
            return 'https:' + relativeUrl;
        }
        // Crear la URL absoluta
        var base = new URL(baseUrl);
        // Si comienza con /, es relativa al dominio
        if (relativeUrl.startsWith('/')) {
            return "".concat(base.protocol, "//").concat(base.host).concat(relativeUrl);
        }
        // Si no, es relativa a la ruta actual
        var path = base.pathname.endsWith('/') ? base.pathname : base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
        return "".concat(base.protocol, "//").concat(base.host).concat(path).concat(relativeUrl);
    }
    catch (error) {
        console.error('Error al convertir a URL absoluta:', error);
        return relativeUrl;
    }
}
// Función para limpiar texto (eliminar espacios extra, saltos de línea, etc.)
function cleanText(text) {
    if (!text)
        return '';
    return text
        .replace(/\s+/g, ' ') // Reemplazar múltiples espacios por uno solo
        .replace(/\n+/g, '\n') // Reemplazar múltiples saltos de línea por uno solo
        .trim(); // Eliminar espacios al inicio y final
}
// Función para extraer números de un texto
function extractNumber(text) {
    if (!text)
        return null;
    var matches = text.match(/[\d,.]+/);
    if (!matches)
        return null;
    // Limpiar el número (quitar comas, puntos, etc.)
    var numberStr = matches[0].replace(/[,.]/g, '');
    var number = parseInt(numberStr, 10);
    return isNaN(number) ? null : number;
}
// Función para extraer precio de un texto
function extractPrice(text) {
    if (!text)
        return { value: null, currency: null };
    // Detectar moneda
    var currency = null;
    if (text.includes('$'))
        currency = 'MXN';
    if (text.toLowerCase().includes('mxn'))
        currency = 'MXN';
    if (text.toLowerCase().includes('usd') || text.includes('USD') || text.includes('US$') || text.includes('U$'))
        currency = 'USD';
    if (text.includes('€'))
        currency = 'EUR';
    // Extraer el número
    var value = extractNumber(text);
    return { value: value, currency: currency };
}
// Función para descargar HTML con reintentos
function fetchHtmlWithRetries(url_1) {
    return __awaiter(this, arguments, void 0, function (url, config) {
        var retries, timeout, userAgent, axiosConfig, lastError, _loop_1, attempt, state_1;
        var _a, _b, _c, _d, _e, _f;
        if (config === void 0) { config = exports.DEFAULT_SCRAPER_CONFIG; }
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    retries = (_b = (_a = config.retries) !== null && _a !== void 0 ? _a : exports.DEFAULT_SCRAPER_CONFIG.retries) !== null && _b !== void 0 ? _b : 3;
                    timeout = (_d = (_c = config.timeout) !== null && _c !== void 0 ? _c : exports.DEFAULT_SCRAPER_CONFIG.timeout) !== null && _d !== void 0 ? _d : 30000;
                    userAgent = (_f = (_e = config.userAgent) !== null && _e !== void 0 ? _e : exports.DEFAULT_SCRAPER_CONFIG.userAgent) !== null && _f !== void 0 ? _f : 'Mozilla/5.0';
                    axiosConfig = {
                        timeout: timeout,
                        headers: {
                            'User-Agent': userAgent,
                            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                            'Accept-Language': 'es-ES,es;q=0.8,en-US;q=0.5,en;q=0.3',
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                        }
                    };
                    lastError = null;
                    _loop_1 = function (attempt) {
                        var response, error_1, delay_1;
                        return __generator(this, function (_h) {
                            switch (_h.label) {
                                case 0:
                                    _h.trys.push([0, 2, , 4]);
                                    console.log("Intento ".concat(attempt + 1, "/").concat(retries + 1, " para descargar HTML de ").concat(url));
                                    return [4 /*yield*/, axios_1.default.get(url, axiosConfig)];
                                case 1:
                                    response = _h.sent();
                                    if (response.status === 200) {
                                        return [2 /*return*/, { value: response.data }];
                                    }
                                    throw new Error("Respuesta HTTP no exitosa: ".concat(response.status, " ").concat(response.statusText));
                                case 2:
                                    error_1 = _h.sent();
                                    lastError = error_1;
                                    // Si es el último intento, lanzar el error
                                    if (attempt === retries) {
                                        throw lastError;
                                    }
                                    delay_1 = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                                    console.log("Error en intento ".concat(attempt + 1, ", reintentando en ").concat(delay_1, "ms:"), lastError.message);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 3:
                                    _h.sent();
                                    return [3 /*break*/, 4];
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _g.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _g.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _g.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: 
                // Este punto no debería alcanzarse, pero por si acaso
                throw lastError || new Error('Error desconocido al descargar HTML');
            }
        });
    });
}
// Función para generar un ID único basado en la URL
function generateIdFromUrl(url) {
    var normalizedUrl = normalizeUrl(url);
    // Crear un hash simple de la URL
    var hash = 0;
    for (var i = 0; i < normalizedUrl.length; i++) {
        var char = normalizedUrl.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir a entero de 32 bits
    }
    // Convertir a string hexadecimal y asegurarse de que sea positivo
    var hashHex = Math.abs(hash).toString(16);
    return hashHex;
}
// Función para extraer metadatos de Open Graph y otros
function extractMetadata(html) {
    var metadata = {};
    // Extraer metadatos de etiquetas meta
    var metaRegex = /<meta\s+(?:[^>]*?\s+)?(?:name|property)=["']([^"']*)["']\s+(?:[^>]*?\s+)?content=["']([^"']*)["']|<meta\s+(?:[^>]*?\s+)?content=["']([^"']*)["']\s+(?:[^>]*?\s+)?(?:name|property)=["']([^"']*)["']/gi;
    var match;
    while ((match = metaRegex.exec(html)) !== null) {
        var name_1 = match[1] || match[4];
        var content = match[2] || match[3];
        if (name_1 && content) {
            metadata[name_1] = content;
        }
    }
    return metadata;
}
// Función para extraer JSON-LD de una página
function extractJsonLd(html) {
    var results = [];
    // Extraer scripts de tipo application/ld+json
    var jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    var match;
    var matchCount = 0;
    while ((match = jsonLdRegex.exec(html)) !== null) {
        matchCount++;
        try {
            if (match && match[1]) {
                var jsonContent = match[1].trim();
                var parsedJson = JSON.parse(jsonContent);
                // Log para depuración
                console.log("JSON-LD #".concat(matchCount, " encontrado:"), parsedJson['@type'] ? "Tipo: ".concat(parsedJson['@type']) : 'Sin tipo');
                // Si tiene propiedad image, analizar su estructura
                if (parsedJson && typeof parsedJson === 'object') {
                    if ('image' in parsedJson) {
                        console.log("JSON-LD #".concat(matchCount, " tiene propiedad 'image':"), "Tipo: ".concat(typeof parsedJson.image), Array.isArray(parsedJson.image) ? "(Array de ".concat(parsedJson.image.length, " elementos)") : '');
                    }
                }
                // Puede ser un objeto o un array
                if (Array.isArray(parsedJson)) {
                    results.push.apply(results, parsedJson);
                }
                else {
                    results.push(parsedJson);
                }
            }
        }
        catch (error) {
            console.error('Error al parsear JSON-LD:', error);
        }
    }
    // Si no se encontró ningún JSON-LD, intentar con un método alternativo para Century21
    if (results.length === 0 && html.includes('century21')) {
        console.log('No se encontró JSON-LD con el método regular, intentando método alternativo para Century21...');
        // Buscar patrón específico de Century21
        var century21Regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        // Intentar nuevamente con el patrón específico
        while ((match = century21Regex.exec(html)) !== null) {
            try {
                if (match && match[1]) {
                    // Intentar encontrar un objeto JSON dentro del contenido
                    var content = match[1];
                    if (content) {
                        var jsonStart = content.indexOf('{');
                        var jsonEnd = content.lastIndexOf('}') + 1;
                        if (jsonStart >= 0 && jsonEnd > jsonStart) {
                            var possibleJson = content.substring(jsonStart, jsonEnd);
                            try {
                                var parsed = JSON.parse(possibleJson);
                                console.log('Encontrado posible JSON-LD manualmente:', parsed['@type'] || 'Sin tipo');
                                // Verificar si contiene información relevante
                                if (parsed['@type'] === 'RealEstateListing' ||
                                    parsed.image ||
                                    parsed.address ||
                                    parsed.offers) {
                                    results.push(parsed);
                                }
                            }
                            catch (e) {
                                console.log('Error al parsear JSON-LD manual:', e);
                            }
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error en extracción alternativa:', error);
            }
        }
        // Intentar un tercer método: buscar directamente en el HTML
        if (results.length === 0) {
            console.log('Intentando tercer método para extraer JSON-LD...');
            var metaTags = html.match(/<meta\s+property=["']og:image["']\s+content=["'](https?:\/\/[^"']+)["']/gi);
            if (metaTags && metaTags.length > 0) {
                console.log("Encontradas ".concat(metaTags.length, " etiquetas meta de imagen"));
                // Crear un JSON-LD básico con las imágenes encontradas
                var images = metaTags.map(function (tag) {
                    var match = tag.match(/content=["'](https?:\/\/[^"']+)["']/i);
                    return match ? match[1] : null;
                }).filter(Boolean);
                if (images.length > 0) {
                    console.log("Creando JSON-LD sint\u00E9tico con ".concat(images.length, " im\u00E1genes"));
                    results.push({
                        '@type': 'RealEstateListing',
                        'image': images
                    });
                }
            }
        }
    }
    console.log("Se encontraron ".concat(matchCount, " bloques JSON-LD. Resultados procesados: ").concat(results.length));
    return results;
}
