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
exports.genericExtractor = void 0;
var cheerio = require("cheerio");
var scraperUtils_1 = require("../scraperUtils");
/**
 * Extractor genérico para portales inmobiliarios no reconocidos específicamente
 * Intenta extraer información básica utilizando patrones comunes y metadatos
 */
exports.genericExtractor = {
    name: 'Extractor Genérico',
    /**
     * Este extractor puede manejar cualquier URL/HTML como fallback
     */
    canHandle: function (_url, _html) {
        // Siempre devuelve true como último recurso
        return true;
    },
    /**
     * Extrae los datos de la propiedad del HTML utilizando patrones genéricos
     */
    extract: function (html, url) {
        return __awaiter(this, void 0, void 0, function () {
            var $, metadata, jsonLdArray, imagenes, realEstateJsonLd, propertyImages, uniqueImagesMap, _i, propertyImages_1, imageUrl, urlObj, pathname, filename, ogImage, precioMXN, precioUSD, precioSelectors, _a, precioSelectors_1, selector, precioElem, precioText, precioRegex, bodyText, matches, firstPrice, ubicacion, address, addressParts, ubicacionSelectors, _b, ubicacionSelectors_1, selector, ubicacionElem, descripcion, descripcionSelectors, _c, descripcionSelectors_1, selector, descripcionElem, caracteristicas, detalles, caracteristicasSelectors, _d, caracteristicasSelectors_1, selector, elements, specificFeatures, _e, specificFeatures_1, _f, selector, key, element, numValue, detailsMapping, _g, _h, _j, jsonKey, displayKey, value, titulo, h1, h2;
            var _k, _l;
            return __generator(this, function (_m) {
                $ = cheerio.load(html);
                metadata = (0, scraperUtils_1.extractMetadata)(html);
                jsonLdArray = (0, scraperUtils_1.extractJsonLd)(html);
                imagenes = [];
                realEstateJsonLd = jsonLdArray.find(function (item) {
                    return typeof item === 'object' &&
                        item !== null &&
                        item['@type'] === 'RealEstateListing' &&
                        Array.isArray(item.image);
                });
                if (realEstateJsonLd && Array.isArray(realEstateJsonLd.image)) {
                    propertyImages = realEstateJsonLd.image
                        .filter(function (url) {
                        // Verificar que sea string
                        if (typeof url !== 'string')
                            return false;
                        // Solo incluir URLs específicas de propiedades, excluir logos y perfiles
                        return url.includes('/propiedades/') &&
                            !url.includes('/logos/') &&
                            !url.includes('/usuarios/');
                    });
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
                    // Convertir el mapa a array
                    imagenes = Array.from(uniqueImagesMap.values());
                    console.log("[Extractor Gen\u00E9rico] Se extrajeron exactamente ".concat(imagenes.length, " im\u00E1genes \u00FAnicas de propiedades."));
                }
                // SOLO como fallback, si no se encontraron imágenes, usar Open Graph
                if (imagenes.length === 0 && typeof metadata['og:image'] === 'string') {
                    ogImage = metadata['og:image'];
                    if (ogImage.includes('/propiedades/') &&
                        !ogImage.includes('/logos/') &&
                        !ogImage.includes('/usuarios/')) {
                        imagenes.push(ogImage);
                        console.log("[Extractor Gen\u00E9rico] Fallback: Se extrajo 1 imagen de Open Graph metadata");
                    }
                }
                precioMXN = '';
                precioUSD = '';
                // a) Buscar en JSON-LD
                if (((_k = realEstateJsonLd === null || realEstateJsonLd === void 0 ? void 0 : realEstateJsonLd.offers) === null || _k === void 0 ? void 0 : _k.price) && ((_l = realEstateJsonLd === null || realEstateJsonLd === void 0 ? void 0 : realEstateJsonLd.offers) === null || _l === void 0 ? void 0 : _l.priceCurrency)) {
                    if (realEstateJsonLd.offers.priceCurrency === 'MXN') {
                        precioMXN = "$".concat(realEstateJsonLd.offers.price, " MXN");
                    }
                    else if (realEstateJsonLd.offers.priceCurrency === 'USD') {
                        precioUSD = "$".concat(realEstateJsonLd.offers.price, " USD");
                    }
                }
                // b) Buscar en metadatos
                if (!precioMXN && metadata['precio'] && metadata['moneda'] === 'MXN') {
                    precioMXN = "$".concat(metadata['precio'], " MXN");
                }
                if (!precioUSD && metadata['precio'] && metadata['moneda'] === 'USD') {
                    precioUSD = "$".concat(metadata['precio'], " USD");
                }
                precioSelectors = [
                    '.price', '.precio', '#price', '#precio',
                    '[itemprop="price"]', '[data-price]',
                    '.property-price', '.listing-price',
                    'span.price', 'div.price', 'h2.price', 'h3.price'
                ];
                for (_a = 0, precioSelectors_1 = precioSelectors; _a < precioSelectors_1.length; _a++) {
                    selector = precioSelectors_1[_a];
                    precioElem = $(selector).first();
                    if (precioElem.length) {
                        precioText = precioElem.text().trim();
                        // Determinar si es MXN o USD
                        if (precioText.includes('MXN') || precioText.includes('$') && !precioText.includes('USD')) {
                            precioMXN = precioText;
                        }
                        else if (precioText.includes('USD') || precioText.includes('US$') || precioText.includes('U$D')) {
                            precioUSD = precioText;
                        }
                        if (precioMXN || precioUSD)
                            break;
                    }
                }
                // d) Buscar texto que parezca un precio
                if (!precioMXN && !precioUSD) {
                    precioRegex = /\$\s*[\d,.]+\s*(MXN|USD|pesos|dólares)?/gi;
                    bodyText = $('body').text();
                    matches = bodyText.match(precioRegex);
                    if (matches && matches.length > 0) {
                        firstPrice = matches[0];
                        if (firstPrice.includes('USD') || firstPrice.includes('dólares')) {
                            precioUSD = firstPrice;
                        }
                        else {
                            precioMXN = firstPrice;
                        }
                    }
                }
                ubicacion = '';
                // a) Buscar en JSON-LD
                if (realEstateJsonLd === null || realEstateJsonLd === void 0 ? void 0 : realEstateJsonLd.address) {
                    address = realEstateJsonLd.address;
                    if (typeof address === 'string') {
                        ubicacion = address;
                    }
                    else if (typeof address === 'object' && address !== null) {
                        addressParts = [
                            address.streetAddress,
                            address.addressLocality,
                            address.addressRegion,
                            address.postalCode
                        ].filter(function (part) { return typeof part === 'string' && part.trim() !== ''; });
                        if (addressParts.length > 0) {
                            ubicacion = addressParts.join(', ');
                        }
                    }
                }
                // b) Buscar en metadatos
                if (!ubicacion && metadata['direccion']) {
                    ubicacion = metadata['direccion'];
                }
                if (!ubicacion && metadata['og:locality']) {
                    ubicacion = metadata['og:locality'];
                }
                ubicacionSelectors = [
                    '[itemprop="address"]', '.address', '.location', '.ubicacion',
                    '.property-address', '.listing-address', '#address', '#location'
                ];
                for (_b = 0, ubicacionSelectors_1 = ubicacionSelectors; _b < ubicacionSelectors_1.length; _b++) {
                    selector = ubicacionSelectors_1[_b];
                    ubicacionElem = $(selector).first();
                    if (ubicacionElem.length) {
                        ubicacion = ubicacionElem.text().trim();
                        if (ubicacion)
                            break;
                    }
                }
                // d) Buscar elementos que contengan palabras clave de ubicación
                if (!ubicacion) {
                    $('h1, h2, h3, h4, h5, p').each(function (_, elem) {
                        var text = $(elem).text().trim();
                        if (text.includes('Ubicación:') || text.includes('Dirección:') || text.includes('Localización:')) {
                            ubicacion = text.replace(/Ubicación:|Dirección:|Localización:/i, '').trim();
                            return false; // Salir del bucle
                        }
                    });
                }
                descripcion = '';
                // a) Buscar en JSON-LD
                if ((realEstateJsonLd === null || realEstateJsonLd === void 0 ? void 0 : realEstateJsonLd.description) && typeof realEstateJsonLd.description === 'string') {
                    descripcion = realEstateJsonLd.description;
                }
                // b) Buscar en metadatos
                if (!descripcion && metadata['og:description']) {
                    descripcion = metadata['og:description'];
                }
                if (!descripcion && metadata['description']) {
                    descripcion = metadata['description'];
                }
                descripcionSelectors = [
                    '[itemprop="description"]', '.description', '.descripcion',
                    '.property-description', '.listing-description', '#description'
                ];
                for (_c = 0, descripcionSelectors_1 = descripcionSelectors; _c < descripcionSelectors_1.length; _c++) {
                    selector = descripcionSelectors_1[_c];
                    descripcionElem = $(selector).first();
                    if (descripcionElem.length) {
                        descripcion = descripcionElem.text().trim();
                        if (descripcion)
                            break;
                    }
                }
                // d) Buscar párrafos largos que podrían ser la descripción
                if (!descripcion) {
                    $('p').each(function (_, elem) {
                        var text = $(elem).text().trim();
                        if (text.length > 100) { // Párrafos largos probablemente son descripciones
                            descripcion = text;
                            return false; // Salir del bucle
                        }
                    });
                }
                caracteristicas = {};
                detalles = {};
                caracteristicasSelectors = [
                    '.features', '.caracteristicas', '.specs', '.details',
                    '.property-features', '.listing-features', '#features', '#details'
                ];
                for (_d = 0, caracteristicasSelectors_1 = caracteristicasSelectors; _d < caracteristicasSelectors_1.length; _d++) {
                    selector = caracteristicasSelectors_1[_d];
                    elements = $(selector).find('li, div, span, p');
                    if (elements.length) {
                        elements.each(function (_, elem) {
                            var text = $(elem).text().trim();
                            if (text) {
                                // Detectar si es una característica con valor
                                var match = text.match(/^(.+?):\s*(.+)$/);
                                if (match) {
                                    var key_1 = (0, scraperUtils_1.cleanText)(match[1]);
                                    var value = (0, scraperUtils_1.cleanText)(match[2]);
                                    // Asignar a detalles o características según el tipo
                                    if (['metros', 'área', 'superficie', 'm2', 'baños', 'recámaras', 'habitaciones', 'pisos'].some(function (keyword) {
                                        return typeof key_1 === 'string' && typeof keyword === 'string' &&
                                            key_1.toLowerCase().includes(keyword.toLowerCase());
                                    })) {
                                        detalles[key_1] = value;
                                    }
                                    else {
                                        caracteristicas[key_1] = value;
                                    }
                                }
                                else {
                                    // Es una característica sin valor
                                    caracteristicas[text] = 'Sí';
                                }
                            }
                        });
                    }
                }
                specificFeatures = [
                    { selector: '.bedrooms, [data-bedrooms], .habitaciones, .recamaras', key: 'Habitaciones' },
                    { selector: '.bathrooms, [data-bathrooms], .banos', key: 'Baños' },
                    { selector: '.garages, [data-garages], .estacionamientos', key: 'Estacionamientos' },
                    { selector: '.area, [data-area], .superficie, .metros', key: 'Área' }
                ];
                for (_e = 0, specificFeatures_1 = specificFeatures; _e < specificFeatures_1.length; _e++) {
                    _f = specificFeatures_1[_e], selector = _f.selector, key = _f.key;
                    element = $(selector).first();
                    if (element.length) {
                        numValue = (0, scraperUtils_1.extractNumber)(element.text());
                        if (numValue) {
                            detalles[key] = numValue.toString();
                        }
                        else {
                            detalles[key] = element.text().trim();
                        }
                    }
                }
                // c) Extraer cualquier dato adicional del JSON-LD
                if (realEstateJsonLd) {
                    detailsMapping = {
                        'numberOfRooms': 'Habitaciones',
                        'numberOfBedrooms': 'Recámaras',
                        'numberOfBathroomsTotal': 'Baños',
                        'floorSize': 'Área Construida',
                        'lotSize': 'Tamaño Terreno'
                    };
                    for (_g = 0, _h = Object.entries(detailsMapping); _g < _h.length; _g++) {
                        _j = _h[_g], jsonKey = _j[0], displayKey = _j[1];
                        value = realEstateJsonLd[jsonKey];
                        if (value !== undefined) {
                            if (typeof value === 'object' && value !== null && 'value' in value) {
                                detalles[displayKey] = value.value.toString();
                            }
                            else if (typeof value === 'number' || typeof value === 'string') {
                                detalles[displayKey] = value.toString();
                            }
                        }
                    }
                }
                titulo = '';
                // a) Buscar en JSON-LD
                if ((realEstateJsonLd === null || realEstateJsonLd === void 0 ? void 0 : realEstateJsonLd.name) && typeof realEstateJsonLd.name === 'string') {
                    titulo = realEstateJsonLd.name;
                }
                // b) Buscar en metadatos
                if (!titulo && metadata['og:title']) {
                    titulo = metadata['og:title'];
                }
                if (!titulo && metadata['title']) {
                    titulo = metadata['title'];
                }
                // c) Buscar en elementos H1, H2
                if (!titulo) {
                    h1 = $('h1').first();
                    if (h1.length) {
                        titulo = h1.text().trim();
                    }
                    else {
                        h2 = $('h2').first();
                        if (h2.length) {
                            titulo = h2.text().trim();
                        }
                    }
                }
                // Construir el objeto de propiedad
                return [2 /*return*/, {
                        id: '', // Se generará después
                        resumen: (0, scraperUtils_1.cleanText)(titulo),
                        descripcion: (0, scraperUtils_1.cleanText)(descripcion),
                        ubicacion: (0, scraperUtils_1.cleanText)(ubicacion),
                        precio: {
                            mxn: precioMXN || '',
                            usd: precioUSD || ''
                        },
                        caracteristicas: caracteristicas,
                        detalles: detalles,
                        imagenes: imagenes,
                        url: url,
                        portal: 'generic'
                    }];
            });
        });
    }
};
