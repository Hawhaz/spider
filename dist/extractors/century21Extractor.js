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
exports.century21Extractor = void 0;
var cheerio = require("cheerio");
var scraperUtils_1 = require("../scraperUtils");
/**
 * Extractor específico para Century21 México
 */
exports.century21Extractor = {
    name: 'Century 21 México',
    /**
     * Verifica si este extractor puede manejar la URL y el HTML proporcionados
     */
    canHandle: function (url, html) {
        // Verificar por URL
        if (url.includes('century21mexico.com') || url.includes('century21.com.mx')) {
            return true;
        }
        // Verificar por contenido HTML
        var $ = cheerio.load(html);
        // Buscar elementos específicos de Century21
        var hasCentury21Logo = $('img[src*="century21"], img[alt*="Century21"], img[alt*="CENTURY21"]').length > 0;
        var hasCentury21Meta = $('meta[content*="Century21"], meta[content*="CENTURY21"]').length > 0;
        var hasCentury21Text = html.includes('Century21') || html.includes('CENTURY21') || html.includes('Century 21');
        return hasCentury21Logo || hasCentury21Meta || hasCentury21Text;
    },
    /**
     * Extrae los datos de la propiedad del HTML
     */
    extract: function (html, url) {
        return __awaiter(this, void 0, void 0, function () {
            var $, metadata, jsonLdArray, jsonLd, imageSet, propertyImages, uniqueImagesMap, _i, propertyImages_1, imageUrl, urlObj, pathname, filename, uniqueImages, imagenes, precioMXN, precioUSD, precioElem, usdElem, lateralPrecio, ubicacion, ubicacionMapa, address, tipo, operacion, titulo, matchTipo, matchOperacion, descripcion, descripcionElem, descripcionParrafo, caracteristicas, detalles, resumen, resumenElem, amenidades;
            var _a, _b;
            return __generator(this, function (_c) {
                $ = cheerio.load(html);
                metadata = (0, scraperUtils_1.extractMetadata)(html);
                console.log('Metadatos extraídos para Century21:', Object.keys(metadata).length, 'entradas');
                // Si hay una imagen en el metadato og:image, la mostramos para depuración
                if (metadata['og:image']) {
                    console.log('Imagen encontrada en metadatos og:image:', metadata['og:image']);
                }
                jsonLdArray = (0, scraperUtils_1.extractJsonLd)(html);
                console.log('JSON-LD extraído para Century21, entradas:', jsonLdArray.length);
                jsonLd = jsonLdArray.find(function (item) { return item['@type'] === 'RealEstateListing'; }) || {};
                console.log('¿Se encontró JSON-LD de tipo RealEstateListing?', Object.keys(jsonLd).length > 0 ? 'Sí' : 'No');
                imageSet = new Set();
                console.log("Extractor Century21: Encontrados ".concat(jsonLdArray.length, " objetos JSON-LD"));
                // IMPLEMENTACIÓN MEJORADA: Extraer SOLO imágenes de propiedades del JSON-LD
                if (jsonLd && jsonLd['@type'] === 'RealEstateListing' && Array.isArray(jsonLd.image)) {
                    console.log("Extractor Century21: Encontradas ".concat(jsonLd.image.length, " im\u00E1genes en array JSON-LD"));
                    propertyImages = jsonLd.image
                        .filter(function (img) {
                        return typeof img === 'string' &&
                            img.includes('/propiedades/') &&
                            !img.includes('/logos/') &&
                            !img.includes('/usuarios/');
                    });
                    console.log("Despu\u00E9s de filtrar, quedan ".concat(propertyImages.length, " im\u00E1genes de propiedades"));
                    uniqueImagesMap = new Map();
                    for (_i = 0, propertyImages_1 = propertyImages; _i < propertyImages_1.length; _i++) {
                        imageUrl = propertyImages_1[_i];
                        try {
                            urlObj = new URL(imageUrl);
                            pathname = urlObj.pathname;
                            filename = pathname.substring(pathname.lastIndexOf('/') + 1);
                            // Solo agregamos si no existe ya este nombre de archivo
                            if (filename && !uniqueImagesMap.has(filename)) {
                                uniqueImagesMap.set(filename, imageUrl);
                            }
                        }
                        catch (e) {
                            // Si hay un error al procesar la URL, simplemente la saltamos
                            continue;
                        }
                    }
                    uniqueImages = Array.from(uniqueImagesMap.values());
                    uniqueImages.forEach(function (url) { return imageSet.add(url); });
                    console.log("Despu\u00E9s de eliminar duplicados, quedan ".concat(uniqueImages.length, " im\u00E1genes \u00FAnicas"));
                }
                else {
                    console.log('No se encontró JSON-LD de tipo RealEstateListing con array de imágenes');
                    // FALLBACK: Solo si no encontramos imágenes en el JSON-LD principal, usar Open Graph
                    if (metadata['og:image'] &&
                        typeof metadata['og:image'] === 'string' &&
                        metadata['og:image'].includes('/propiedades/') &&
                        !metadata['og:image'].includes('/logos/') &&
                        !metadata['og:image'].includes('/usuarios/')) {
                        console.log("A\u00F1adiendo imagen de Open Graph como fallback: ".concat(metadata['og:image']));
                        imageSet.add(metadata['og:image']);
                    }
                }
                imagenes = Array.from(imageSet)
                    .filter(function (url) { return !!url && url.trim().length > 0; })
                    .filter(function (url) { return url.startsWith('http'); });
                // Log de resultado final
                console.log("Total de im\u00E1genes encontradas: ".concat(imagenes.length));
                precioMXN = '';
                precioUSD = '';
                precioElem = $("h6.text-muted.fs-3.fw-bold");
                if (precioElem.length > 0) {
                    precioMXN = precioElem.contents().first().text().trim();
                    usdElem = precioElem.find("span.fs-5.small, span");
                    if (usdElem.length) {
                        precioUSD = usdElem.text().replace("/", "").trim();
                    }
                }
                // b) Si no se encontró, buscar en la sección de características
                if (!precioMXN) {
                    $("div.col-sm-12.col-md-6.my-1").each(function (_, elem) {
                        var text = $(elem).text();
                        if (text.includes("Precio de Venta:")) {
                            var match = text.match(/Precio de Venta:\s*([^<]+)/);
                            if (match && match[1]) {
                                precioMXN = match[1].trim();
                            }
                        }
                    });
                }
                // c) Si aún no se encontró, buscar en la tarjeta lateral
                if (!precioMXN) {
                    lateralPrecio = $("div.col-sm-12.h5").text().trim();
                    if (lateralPrecio) {
                        precioMXN = lateralPrecio;
                    }
                }
                // d) Si aún no se encontró, buscar en los metadatos
                if (!precioMXN && metadata['precio'] && metadata['moneda']) {
                    precioMXN = "".concat(metadata['precio'], " ").concat(metadata['moneda']);
                }
                // e) Si aún no se encontró, buscar en JSON-LD
                if (!precioMXN && ((_a = jsonLd.offers) === null || _a === void 0 ? void 0 : _a.price) && ((_b = jsonLd.offers) === null || _b === void 0 ? void 0 : _b.priceCurrency)) {
                    precioMXN = "".concat(jsonLd.offers.price, " ").concat(jsonLd.offers.priceCurrency);
                }
                ubicacion = '';
                ubicacionMapa = $("div#mapa div[itemprop='address'] span").text().trim();
                if (ubicacionMapa) {
                    ubicacion = ubicacionMapa;
                }
                // b) Si no se encontró, buscar en la sección de ubicación
                if (!ubicacion) {
                    $("h5.card-title").each(function (_, titulo) {
                        if ($(titulo).text().includes("Ubicación")) {
                            var nextElem = $(titulo).next();
                            if (nextElem.length) {
                                ubicacion = nextElem.text().trim();
                            }
                        }
                    });
                }
                // c) Si aún no se encontró, buscar en los metadatos
                if (!ubicacion && metadata['direccion']) {
                    ubicacion = metadata['direccion'];
                }
                // d) Si aún no se encontró, buscar en JSON-LD
                if (!ubicacion && jsonLd.address) {
                    address = jsonLd.address;
                    if (typeof address === 'string') {
                        ubicacion = address;
                    }
                    else if (address.streetAddress) {
                        ubicacion = [
                            address.streetAddress,
                            address.addressLocality,
                            address.addressRegion,
                            address.postalCode
                        ].filter(Boolean).join(', ');
                    }
                }
                tipo = '';
                operacion = '';
                // a) Buscar en las características
                $("div.col-sm-12.col-md-6.my-1").each(function (_, elem) {
                    var text = $(elem).text();
                    if (text.includes("Tipo:")) {
                        var match = text.match(/Tipo:\s*([^<]+)/);
                        if (match && match[1]) {
                            tipo = match[1].trim();
                        }
                    }
                });
                // b) Si no se encontró, buscar en el título
                if (!tipo) {
                    titulo = $("h1.card-title.text-primary.h5").text().trim();
                    if (titulo) {
                        matchTipo = titulo.match(/(?:Venta|Renta)\s+de\s+([^en]+)\s+en/i);
                        if (matchTipo && matchTipo[1]) {
                            tipo = matchTipo[1].trim();
                        }
                        matchOperacion = titulo.match(/^(\w+)\s+de/i);
                        if (matchOperacion && matchOperacion[1]) {
                            operacion = matchOperacion[1].toLowerCase();
                        }
                    }
                }
                // c) Si aún no se encontró, buscar en los metadatos
                if (!tipo && metadata['tipoInmueble']) {
                    tipo = metadata['tipoInmueble'];
                }
                if (!operacion && metadata['tipoOperacion']) {
                    operacion = metadata['tipoOperacion'];
                }
                descripcion = '';
                descripcionElem = $("div.card-body.pt-0 div.col-12.pt-4 p.text-muted[style*='white-space: pre-wrap'], div.card-body p.text-muted[style*='white-space: pre-wrap']");
                if (descripcionElem.length) {
                    descripcion = descripcionElem.text().trim();
                }
                // b) Si no se encontró, buscar en cualquier párrafo de la descripción
                if (!descripcion) {
                    descripcionParrafo = $("div.card-body.pt-0 div.col-12.pt-4 p.text-muted, div.card-body p.text-muted").first().text().trim();
                    if (descripcionParrafo) {
                        descripcion = descripcionParrafo;
                    }
                }
                // c) Si aún no se encontró, buscar en los metadatos
                if (!descripcion && metadata['descripcion']) {
                    descripcion = metadata['descripcion'];
                }
                // d) Si aún no se encontró, buscar en JSON-LD
                if (!descripcion && jsonLd.description) {
                    descripcion = jsonLd.description;
                }
                caracteristicas = {};
                // a) Extraer características principales
                $("div.card-body.pt-0 .row div.col-sm-12.col-md-6.my-1, div.card-body.pt-0 .row div.col-sm-12.col-md-6.col-lg-4.my-2, div.card-body .row div.col-sm-12.col-md-6.my-1").each(function (_, elem) {
                    var texto = $(elem).text().trim();
                    var partes = texto.split(":");
                    if (partes.length >= 2) {
                        var clave = (0, scraperUtils_1.cleanText)(partes[0]);
                        var valor = (0, scraperUtils_1.cleanText)(partes.slice(1).join(":"));
                        if (clave) {
                            caracteristicas[clave] = valor;
                        }
                    }
                    else {
                        // Para características sin valor (solo presencia)
                        var texto_1 = (0, scraperUtils_1.cleanText)($(elem).text());
                        if (texto_1) {
                            caracteristicas[texto_1] = "Sí";
                        }
                    }
                });
                detalles = {};
                $("div.row.fw-bold.my-4 div.col").each(function (_, elem) {
                    var texto = $(elem).text().trim();
                    if (texto.includes("Terreno")) {
                        detalles.terreno = texto.replace("Terreno", "").trim();
                    }
                    else if (texto.includes("Construcción")) {
                        detalles.construccion = texto.replace("Construcción", "").trim();
                    }
                    else if (texto.includes("Recámaras")) {
                        detalles.recamaras = texto.replace("Recámaras", "").trim();
                    }
                    else if (texto.includes("Baños")) {
                        detalles.banos = texto.replace("Baños", "").trim();
                    }
                    else if (texto.includes("Estacionamientos")) {
                        detalles.estacionamientos = texto.replace("Estacionamientos", "").trim();
                    }
                });
                // c) Si no se encontraron en la sección destacada, buscar en los metadatos
                if (!detalles.terreno && metadata['MT']) {
                    detalles.terreno = "".concat(metadata['MT'], " m\u00B2");
                }
                if (!detalles.construccion && metadata['MC']) {
                    detalles.construccion = "".concat(metadata['MC'], " m\u00B2");
                }
                if (!detalles.recamaras && metadata['recamaras']) {
                    detalles.recamaras = metadata['recamaras'];
                }
                if (!detalles.banos && metadata['banio']) {
                    detalles.banos = metadata['banio'];
                }
                if (!detalles.estacionamientos && metadata['estacionamiento']) {
                    detalles.estacionamientos = metadata['estacionamiento'];
                }
                resumen = '';
                resumenElem = $("div.card-body.pt-0 .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6, div.card-body .row div.col-sm-12.mt-4 h2.h5.fw-normal.fs-6");
                if (resumenElem.length) {
                    resumen = resumenElem.text().trim();
                }
                amenidades = [];
                $("div.col-sm-12.col-md-6.col-lg-4.my-2").each(function (_, elem) {
                    var texto = $(elem).text().trim();
                    if (texto) {
                        amenidades.push(texto);
                    }
                });
                // Construir y devolver el objeto Propiedad
                return [2 /*return*/, {
                        descripcion: descripcion,
                        caracteristicas: caracteristicas,
                        resumen: resumen,
                        imagenes: imagenes,
                        precio: {
                            mxn: precioMXN,
                            usd: precioUSD
                        },
                        ubicacion: ubicacion,
                        url: url,
                        tipo: tipo,
                        operacion: operacion,
                        detalles: detalles,
                        amenidades: amenidades,
                        portal: 'century21'
                    }];
            });
        });
    }
};
