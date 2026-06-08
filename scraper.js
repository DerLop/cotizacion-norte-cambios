const axios = require('axios');
const fs = require('fs');

async function scrape() {
    try {
        // Consumimos directamente el feed estructurado para Paraguay sin bloqueos de firewall
        const { data } = await axios.get('https://melizeche.com', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        // Extraemos las cotizaciones específicas mapeadas para Norte Cambios
        const norteCambiosData = data.disp_cambios?.norte_cambios;

        if (!norteCambiosData) {
            throw new Error('No se encontraron datos para la entidad Norte Cambios en el origen.');
        }

        // Estructuramos la lista en el formato exacto de tu API REST
        const cotizaciones = [
            {
                moneda: "Dólar Americano USD",
                compra: parseFloat(norteCambiosData.dolar?.compra || 0),
                venta: parseFloat(norteCambiosData.dolar?.venta || 0)
            },
            {
                moneda: "Real BRL",
                compra: parseFloat(norteCambiosData.real?.compra || 0),
                venta: parseFloat(norteCambiosData.real?.venta || 0)
            },
            {
                moneda: "Euro EUR",
                compra: parseFloat(norteCambiosData.euro?.compra || 0),
                venta: parseFloat(norteCambiosData.euro?.venta || 0)
            },
            {
                moneda: "Peso Argentino ARS",
                compra: parseFloat(norteCambiosData.peso?.compra || 0),
                venta: parseFloat(norteCambiosData.peso?.venta || 0)
            }
        ];

        const result = {
            success: true,
            fuente: 'https://www.nortecambios.com.py/',
            actualizado: new Date().toISOString(),
            data: cotizaciones
        };

        // Escribimos el JSON de tu API en la raíz del repositorio
        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡Archivo cotizaciones.json generado de forma exitosa!');

    } catch (error) {
        console.error('Error durante la extracción:', error.message);
        process.exit(1);
    }
}

scrape();
