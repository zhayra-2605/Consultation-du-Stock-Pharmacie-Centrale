const fs = require('fs');
const path = require('path');

const geojsonPath = 'c:/wamp64/www/Pharmacie Centrale/pharman-ui/src/assets/tunisia_gadm.json';
const outputPath = 'c:/wamp64/www/Pharmacie Centrale/pharman-ui/src/assets/tunisia_paths.js';

const HUB_MAPPING = {
  'Ariana': 'TUNIS', 'Bizerte': 'TUNIS', 'BenArous(TunisSud)': 'TUNIS', 'Manubah': 'TUNIS', 'Nabeul': 'TUNIS', 'Tunis': 'TUNIS', 'Zaghouan': 'TUNIS',
  'Béja': 'KEF', 'Jendouba': 'KEF', 'LeKef': 'KEF', 'Siliana': 'KEF',
  'Sousse': 'SOUSSE', 'Monastir': 'SOUSSE', 'Mahdia': 'SOUSSE', 'Kairouan': 'SOUSSE',
  'Gafsa': 'GAFSA', 'Kassérine': 'GAFSA', 'SidiBouZid': 'GAFSA', 'Tozeur': 'GAFSA',
  'Sfax': 'SFAX', 'Gabès': 'SFAX',
  'Médenine': 'MEDENINE', 'Tataouine': 'MEDENINE', 'Kebili': 'MEDENINE'
};

const HUB_INFO = {
  'TUNIS': { color: '#00A859', name: 'Hub Tunis', surface: '22 000 m²' },
  'KEF': { color: '#3b82f6', name: 'Hub El Kef', surface: '1 250 m²' },
  'SOUSSE': { color: '#a855f7', name: 'Hub Sousse', surface: '4 000 m²' },
  'GAFSA': { color: '#f59e0b', name: 'Hub Gafsa', surface: '1 450 m²' },
  'SFAX': { color: '#f97316', name: 'Hub Sfax', surface: '3 500 m²' },
  'MEDENINE': { color: '#854d0e', name: 'Hub Médenine', surface: '1 660 m²' }
};

async function convert() {
    const raw = fs.readFileSync(geojsonPath, 'utf8');
    const data = JSON.parse(raw);

    // 1. Find bounds
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    data.features.forEach(f => {
        const coords = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat(Infinity) : f.geometry.coordinates.flat(Infinity);
        // flat(Infinity) gives [lon, lat, lon, lat ...]
        for(let i=0; i<coords.length; i+=2) {
            const lon = coords[i];
            const lat = coords[i+1];
            if(lon < minLon) minLon = lon;
            if(lon > maxLon) maxLon = lon;
            if(lat < minLat) minLat = lat;
            if(lat > maxLat) maxLat = lat;
        }
    });

    const width = 230;
    const height = 600;
    const padding = 10;

    const lonRange = maxLon - minLon;
    const latRange = maxLat - minLat;
    const scale = Math.min((width - 2*padding) / lonRange, (height - 2*padding) / latRange);

    const project = (lon, lat) => {
        const x = padding + (lon - minLon) * scale;
        const y = height - padding - (lat - minLat) * scale; // Flip Y
        return `${x.toFixed(1)} ${y.toFixed(1)}`;
    };

    // 2. Process features
    const hubs = {};

    data.features.forEach(f => {
        const name = f.properties.NAME_1;
        const hubId = HUB_MAPPING[name];
        if(!hubId) return;

        if(!hubs[hubId]) {
            hubs[hubId] = {
                hub: hubId,
                ...HUB_INFO[hubId],
                governorates: []
            };
        }

        let pathStr = '';
        const polygons = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates];
        
        polygons.forEach(poly => {
            poly.forEach(ring => {
                const projected = ring.map(pt => project(pt[0], pt[1]));
                // Simplification: only keep points every 3 pixels or so to reduce size
                const simplified = [];
                let lastX = -999, lastY = -999;
                projected.forEach(pt => {
                    const [px, py] = pt.split(' ').map(Number);
                    if(Math.abs(px - lastX) > 0.5 || Math.abs(py - lastY) > 0.5) {
                        simplified.push(pt);
                        lastX = px; lastY = py;
                    }
                });
                if(simplified.length > 2) {
                    pathStr += `M${simplified[0]} L${simplified.slice(1).join('L')} Z `;
                }
            });
        });

        hubs[hubId].governorates.push({
            id: name.toLowerCase().replace(/\s/g, ''),
            name: name === 'BenArous(TunisSud)' ? 'Ben Arous' : (name === 'Manubah' ? 'Manouba' : (name === 'SidiBouZid' ? 'Sidi Bouzid' : name)),
            path: pathStr.trim()
        });
    });

    const finalResult = Object.values(hubs);
    const content = `export const TUNISIA_REGIONS = ${JSON.stringify(finalResult, null, 2)};`;
    fs.writeFileSync(outputPath, content);
    console.log('Conversion complete!');
}

convert();
