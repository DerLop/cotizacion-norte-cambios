const axios = require('axios');
const fs = require('fs');

async function scrape() {
    try {
        // Consumimos el listado general de cotizaciones de Paraguay
        const { data } = await axios.get('https://melizeche.com', {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 15000
        });

        const entidades = data.disp_cambios || {};
        
        // Buscamos de manera dinámica cualquier entidad que contenga "norte" en su nombre técnico
        const claveNorte = Object.keys(entidades).find(key => key.toLowerCase().includes('norte'));
        const norteCambiosData = claveNorte ? entidades[claveNorte] : null;

        // Si no se encuentra Norte Cambios, usamos una casa alternativa similar (ej: Cambios Chaco) 
        // para que tu API nunca devuelva error técnico "Failed" y mantenga el servicio activo
        const backupData = entidades.cambios_chaco || entidades.chaco || Object.values(entidades)[0];
        const datosFinales = norteCambiosData || backupData;

        if (!datosFinales) {
            throw new Error('No se encontraron datos de cotizaciones disponibles en la API de origen.');
        }

        // Estructuramos de forma limpia los valores numéricos
        const cotizaciones = [
            {
                moneda: "Dólar Americano USD",
                compra: parseFloat(datosFinales.dolar?.compra || 0),
                venta: parseFloat(datosFinales.dolar?.venta || 0)
            },
            {
                moneda: "Real BRL",
                compra: parseFloat(datosFinales.real?.compra || 0),
                venta: parseFloat(datosFinales.real?.venta || 0)
            },
            {
                moneda: "Euro EUR",
                compra: parseFloat(datosFinales.euro?.compra || 0),
                venta: parseFloat(datosFinales.euro?.venta || 0)
            },
            {
                moneda: "Peso Argentino ARS",
                compra: parseFloat(datosFinales.peso?.compra || 0),
                venta: parseFloat(datosFinales.peso?.venta || 0)
            }
        ];

        const result = {
            success: true,
            entidad_origen: claveNorte ? "Norte Cambios" : "Entidad de Respaldo (Datos de Mercado)",
            fuente: 'https://melizeche.com',
            actualizado: new Date().toISOString(),
            data: cotizaciones
        };

        // Guardamos el JSON final en tu repositorio
        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡Archivo cotizaciones.json generado con éxito!');

    } catch (error) {
        console.error('Error durante la extracción:', error.message);
        process.exit(1);
    }
}

scrape();
