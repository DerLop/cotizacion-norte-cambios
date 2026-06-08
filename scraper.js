const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrape() {
    try {
        // Cabeceras completas de un navegador real para evadir bloqueos básicos de seguridad
        const { data } = await axios.get('https://nortecambios.com.py', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.8,en;q=0.6',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000 // Tiempo de espera de 15 segundos máximo
        });

        const $ = cheerio.load(data);
        const cotizaciones = [];

        $('table tr').each((index, element) => {
            if (index === 0) return; 

            const cells = $(element).find('td');
            if (cells.length >= 3) {
                let moneda = cells.eq(0).text()
                    .replace(/flag/gi, '')
                    .replace(/•/g, ' • ')
                    .replace(/\s+/g, ' ')
                    .trim();

                let compraTexto = cells.eq(1).text().replace(/(arrow_upward|arrow_downward|drag_handle)/gi, '').trim();
                let ventaTexto = cells.eq(2).text().replace(/(arrow_upward|arrow_downward|drag_handle)/gi, '').trim();

                const parseNum = (str) => {
                    if (!str) return 0;
                    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
                };

                if (moneda) {
                    cotizaciones.push({
                        moneda: moneda,
                        compra: parseNum(compraTexto),
                        venta: parseNum(cleanVenta = ventaTexto)
                    });
                }
            }
        });

        if (cotizaciones.length === 0) {
            throw new Error('La estructura de la tabla cambió o no se encontraron filas válidas.');
        }

        const result = {
            success: true,
            fuente: 'https://nortecambios.com.py',
            actualizado: new Date().toISOString(),
            data: cotizaciones
        };

        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡Archivo cotizaciones.json generado correctamente!');

    } catch (error) {
        console.error('Error durante la extracción:', error.message);
        process.exit(1);
    }
}

scrape();
