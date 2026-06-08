const https = require('https');
const fs = require('fs');

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const options = {
            rejectUnauthorized: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Cache-Control': 'no-cache'
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
        console.log("Descargando API interna de Cambios Chaco...");
        // Consumimos directamente el endpoint de datos unificados de su web principal
        const rawData = await fetchJSON('https://cambioschaco.com.py');
        const apiData = JSON.parse(rawData);

        if (!apiData || !apiData.branches) {
            throw new Error("Formato de respuesta desconocido o vacío en el origen.");
        }

        const resultadoFinal = [];

        // Filtramos las sucursales principales para estructurar tu API REST
        apiData.branches.forEach(branch => {
            const nombreSucursal = branch.name || "Sucursal";
            const cotizaciones = [];

            // Si la sucursal contiene un mapa válido de monedas en tiempo real
            if (branch.exchange_rates && typeof branch.exchange_rates === 'object') {
                Object.keys(branch.exchange_rates).forEach(keyKey => {
                    const item = branch.exchange_rates[keyKey];
                    let monedaFormateada = keyKey.toUpperCase();

                    if (monedaFormateada.includes('DOLAR') || monedaFormateada.includes('USD')) monedaFormateada = "Dólar Americano USD";
                    if (monedaFormateada.includes('REAL') || monedaFormateada.includes('BRL')) monedaFormateada = "Real BRL";
                    if (monedaFormateada.includes('EURO') || monedaFormateada.includes('EUR')) monedaFormateada = "Euro EUR";
                    if (monedaFormateada.includes('PESO') || monedaFormateada.includes('ARS')) monedaFormateada = "Peso Argentino ARS";

                    // Almacenamos únicamente monedas puras (descartando los arbitrajes)
                    if (item.purchase && item.sale && !keyKey.includes('x')) {
                        cotizaciones.push({
                            moneda: monedaFormateada,
                            compra: parseFloat(item.purchase),
                            venta: parseFloat(item.sale)
                        });
                    }
                });
            }

            if (cotizaciones.length > 0) {
                resultadoFinal.push({
                    sucursal: nombreSucursal,
                    cotizaciones: cotizaciones
                });
            }
        });

        const result = {
            success: true,
            fuente: 'https://www.cambioschaco.com.py/',
            actualizado: new Date().toISOString(),
            data: resultadoFinal
        };

        // Guardamos el JSON con precios de pizarra reales de cada ciudad
        fs.writeFileSync('cotizaciones.json', JSON.stringify(result, null, 2));
        console.log('¡API unificada de Cambios Chaco generada con éxito rotundo!');

    } catch (error) {
        console.error('Error crítico general en el proceso:', error.message);
        process.exit(1);
    }
}

scrape();
