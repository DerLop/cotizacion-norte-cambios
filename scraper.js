const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrape() {
    try {
        const { data } = await axios.get('https://www.nortecambios.com.py/', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const $ = cheerio.load(data);
        const cotizaciones = [];

        // Filtramos y recorremos las filas de la tabla de cotizaciones
        $('table tr').each((index, element) => {
            if (index === 0) return; // Omitir encabezado (Moneda, Compra, Venta)

            const cells = $(element).find('td');
            if (cells.length >= 3) {
                // Limpiamos los textos arrastrados por los iconos/flags del HTML
                let moneda = cells.eq(0).text()
                    .replace(/flag/gi, '')
                    .replace(/•/g, ' • ')
                    .replace(/\s+/g, ' ')
                    .trim();

                let compraTexto = cells.eq(1).text().replace(/(arrow_upward|arrow_downward|drag_handle)/gi, '').trim();
                let ventaTexto = cells.eq(2).text().replace(/(arrow_upward|arrow_downward|drag_handle)/gi, '').trim();

                // Conversión limpia a números flotantes respetando el formato local
                const parseNum = (str) => {
                    if (!str) return 0;
                    // Maneja formatos con puntos de miles (6.030) o comas decimales (5,11)
                    return parseFloat(str.replace(/\./g, '').replace(',', '.'));
                };

                if (moneda) {
                    cotizaciones.push({
                        moneda: moneda,
                        compra: parseNum(compraTexto),
                        venta: parseNum(ventaTexto)
                    });
                }
            }
        });

        const result = {
            success: true,
            fuente: 'https://www.nortecambios.com.py/',
            actualizado: new Date().toISOString(),
            data: cotizaciones
        };

        // Guarda de forma síncrona el archivo JSON estático en el repositorio
        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡Archivo cotizaciones.json generado correctamente!');

    } catch (error) {
        console.error('Error durante la extracción:', error.message);
        process.exit(1);
    }
}

scrape();
