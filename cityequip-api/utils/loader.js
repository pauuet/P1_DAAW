const fs = require('fs');
const Equipment = require('../models/Equipment');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../../OpenDataTGN_equipamientos.csv');

async function loadData() {
    try {
        const count = await Equipment.countDocuments();
        if (count > 0) {
            console.log('Database already populated. Skipping CSV load.');
            return;
        }

        console.log('Loading data from CSV...', CSV_PATH);

        // Read file synchronously as text
        const content = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = content.split(/\r?\n/);

        const equipments = [];
        let headers = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            // 1. Remove outer quotes if present (e.g. "content")
            if (line.startsWith('"') && line.endsWith('"')) {
                line = line.substring(1, line.length - 1);
            }

            // 2. Split by separator used in this file: ","
            // The format seems to be: field1,"field2","field3"
            // Or: nom,"horari"...
            // The split `","` is a strong heuristic for this specific file format
            // But first field `nom` might not have quotes? 
            // Let's use a regex to match CSV fields respecting quotes.
            // Or simpler: replace `""` with a placeholder, then split?
            // Given the debug output: 'nom,""horari"",""tipus""...'
            // It suggests internal quotes are DOUBLE double quotes.

            // LET'S PARSE MANUALLY:
            // We want to replace `""` with `"` (unescape) AND split by `,` ignoring quotes.
            // Actually, if we look at the debug output: nom,""horari"" 
            // It seems fields are separated by `,`
            // and fields that contain commas or special chars are quoted with `""`?
            // NO, `""` is the escape for `"` inside a quoted string. 
            // BUT here it looks like the quotes ARE the delimiters?

            // Let's try a custom split:
            // The file seems to use `","` as a separator for most fields? 
            // or simply `,` but values are quoted?

            // ROBUST PARSING STRATEGY:
            // Split by `,` BUT only if not inside quotes.
            // Since the file format is tricky, let's use a regex that matches CSV pattern
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            // This is too complex to get right blindly.

            // ALTERNATIVE: Use the specific knowledge of THIS file.
            // It looks like: value1,value2,value3...
            // UNLESS it's the `nom,"horari"`...
            // Let's just blindly replace `""` with nothing to clean up first? No.

            // Let's go with a simple split by `,` and then clean quotes from each piece.
            // This will fail if a value contains a comma (e.g. address).
            // BUT, usually address is quoted: "C/ Major, 15".

            // Let's use the regex for standard CSV splitting:
            // matches: quoted string OR anything else, followed by comma or end
            // Regex source: https://stackoverflow.com/questions/11456850/split-a-string-by-commas-but-ignore-commas-within-double-quotes-using-javascrip
            // But we need to handle the `""` unescaping.

            // Implementation of a mini-parser
            const rowValues = [];
            let currentVal = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                const nextChar = line[j + 1];

                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        // Escaped quote: "" -> literal "
                        currentVal += '"';
                        j++; // skip next quote
                    } else {
                        // Toggle state
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    // Field separator
                    rowValues.push(currentVal);
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            rowValues.push(currentVal); // Push last field

            // Clean values (trim)
            const cleanedRow = rowValues.map(v => v.trim());

            if (i === 0) {
                // Header row
                // "nom","horari","tipus"...
                // Cleaned row should be: [nom, horari, tipus...]
                // We normalize headers to lowercase/clean
                headers = cleanedRow.map(h => h.replace(/^"|"$/g, '').replace('""', '"'));
                // The headers logic above might leave quotes if my parser didn't strip them?
                // My parser INCLUDES quotes in `currentVal`. So `nom` -> `nom`. `"horari"` -> `"horari"`.
                // So we strip them now.
                headers = headers.map(h => h.replace(/^"|"$/g, ''));
                continue;
            }

            // Data row
            if (cleanedRow.length < 2) continue; // Skip empty

            // Map to object
            const row = {};
            headers.forEach((h, idx) => {
                let val = cleanedRow[idx] || '';
                // Strip surrounding quotes if present
                if (val.startsWith('"') && val.endsWith('"')) val = val.substring(1, val.length - 1);
                row[h] = val;
            });

            // Parse fields
            let lat = parseFloat(row.latitud);
            let lng = parseFloat(row.longitud);

            // Fallback for commas
            if (isNaN(lat) && row.latitud) lat = parseFloat(row.latitud.replace(',', '.'));
            if (isNaN(lng) && row.longitud) lng = parseFloat(row.longitud.replace(',', '.'));

            if (!isNaN(lat) && !isNaN(lng)) {
                equipments.push({
                    name: row.nom,
                    schedule: row.horari,
                    type: row.tipus,
                    isMunicipal: (row.municipal === 'Sí'),
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    address: row.localitzacio,
                    phone: row.telefon,
                    district: row.districte,
                    agencyCode: row.CODI_ENS,
                    agencyName: row.NOM_ENS
                });
            }
        }

        if (equipments.length > 0) {
            await Equipment.insertMany(equipments);
            console.log(`Successfully loaded ${equipments.length} equipments.`);
        } else {
            console.log('No valid equipments found in CSV.');
            console.log('DEBUG First parsed row:', equipments[0] || 'None');
        }

    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

module.exports = loadData;
