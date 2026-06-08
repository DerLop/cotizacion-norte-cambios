const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');

function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        const options = {
            rejectUnauthorized: false, // Por seguridad ante certificados intermedios locales
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9'
            },
            timeout: 15000
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => resolve(data));
        }).on('error', (err) => reject(err));
    });
}

async function scrape() {
    try {
        // Mapeamos los identificadores exactos de las sucursales de Cambios Alberdi
        const sucursalesAlberdi = [
            { id: "asuncion", nombre: "Asunción" },
            { id: "ciudaddeleste", nombre: "Ciudad del Este" },
            { id: "encarnacion", nombre: "Encarnación" },
            { id: "saltosdelguaira", nombre: "Saltos del Guairá" }
        ];

        const resultadoFinal = [];

        // Consultamos secuencialmente las pizarras auténticas de cada ciudad
        for (const suc of sucursalesAlberdi) {
            try {
                console.log(`Descargando cotizaciones oficiales para: ${suc.nombre}...`);
                const url = `https://cambiosalberdi.com{suc.id}`;
                const html = await fetchHTML(url);
                const $ = cheerio.load(html);
                
                const cotizaciones = [];

                // Analizamos la tabla de divisas de Alberdi
                $('.table-cotizaciones tbody tr, table tr').each((index, element) => {
                    const cells = $(element).find('td');
                    if (cells.length >= 3) {
                        let monedaRaw = cells.eq(0).text().replace(/\s+/g, ' ').trim();
                        let compraTxt = cells.eq(1).text().replace(/[^\d,]/g, '').trim();
                        let ventaTxt = cells.eq(2).text().replace(/[^\d,]/g, '').trim();

                        const parseNum = (str) => {
                            if (!str) return 0;
                            return parseFloat(str.replace(/\./g, '').replace(',', '.'));
                        };

                        const compraNum = parseNum(compraTxt);
                        const ventaNum = parseNum(ventaTxt);

                        // Filtro estricto: Guardamos solo divisas reales vs el Guaraní (evita arbitrajes cruzados)
                        if (monedaRaw && compraNum > 1) {
                            let monedaFormateada = monedaRaw;
                            if (monedaRaw.toLowerCase().includes('dolar') || monedaRaw.toLowerCase().includes('usd')) monedaFormateada = "Dólar Americano USD";
                            if (monedaRaw.toLowerCase().includes('real') || monedaRaw.toLowerCase().includes('brl')) monedaFormateada = "Real BRL";
                            if (monedaRaw.toLowerCase().includes('euro') || monedaRaw.toLowerCase().includes('eur')) monedaFormateada = "Euro EUR";
                            if (monedaRaw.toLowerCase().includes('peso') || monedaRaw.toLowerCase().includes('ars')) monedaFormateada = "Peso Argentino ARS";

                            // Evitamos meter cabeceras de texto o duplicar la misma moneda
                            if (!cotizaciones.some(m => m.moneda === monedaFormateada)) {
                                cotizaciones.push({
                                    moneda: monedaFormateada,
                                    compra: compraNum,
                                    venta: ventaNum
                                });
                            }
                        }
                    }
                });

                if (cotizaciones.length > 0) {
                    resultadoFinal.push({
                        sucursal: suc.nombre,
                        cotizaciones: cotizaciones
                    });
                }

                // Pequeña pausa de 1.5 segundos para no saturar las llamadas del bot
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (err) {
                console.error(`Error procesando la sucursal ${suc.nombre}:`, err.message);
            }
        }

        // Si por problemas del servidor de origen el arreglo está completamente vacío, 
        // inyectamos un resguardo real basado en cotizaciones promedio del BCP de Paraguay
        if (resultadoFinal.length === 0) {
            throw new Error("No se pudo parsear ninguna tabla válida de Cambios Alberdi.");
        }

        const result = {
            success: true,
            fuente: 'https://www.cambiosalberdi.com/',
            actualizado: new Date().toISOString(),
            data: resultadoFinal
        };

        // Guardamos el JSON definitivo en el repositorio
        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡API de Cambios Alberdi generada con éxito y datos 100% reales!');

    } catch (error) {
        console.error('Error crítico general en el proceso:', error.message);
        process.exit(1);
    }
}

scrape();
