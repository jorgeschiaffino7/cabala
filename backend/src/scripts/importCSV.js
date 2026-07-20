import fs from 'fs';
import csv from 'csv-parser';
import { supabaseAdmin } from '../config/supabase.js';
import { calculateGematria, normalizeHebrew } from '../utils/gematriaMap.js';

/**
 * Script de importación de CSVs
 * Procesa archivos y calcula gematría automáticamente
 */

const BATCH_SIZE = 500; // Insertar en lotes de 500

/**
 * Función genérica de importación
 * @param {Object} config - Configuración del archivo
 */
async function importCSV({ filePath, source, book = null }) {
  console.log(`\n📂 Procesando: ${filePath}`);
  console.log(`   Fuente: ${source}${book ? ` - ${book}` : ''}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }

  const rows = [];
  let processedCount = 0;
  let skippedCount = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        try {
          // Detectar columnas automáticamente
          const keys = Object.keys(data);
          
          // La primera columna suele ser la referencia (Index Title)
          // La segunda columna suele ser el texto hebreo
          const reference = data[keys[0]];
          const hebrewText = data[keys[1]];

          if (!hebrewText || hebrewText.trim() === '') {
            skippedCount++;
            return;
          }

          // Calcular gematría
          const normalized = normalizeHebrew(hebrewText);
          if (!normalized) {
            skippedCount++;
            return;
          }

          const gematriaValue = calculateGematria(normalized);

          // Parsear referencia (si tiene formato "Genesis 1:1")
          const refParts = parseReference(reference, source);

          rows.push({
            source,
            book: book || refParts.book,
            chapter: refParts.chapter,
            verse: refParts.verse,
            section: refParts.section,
            text_hebrew: hebrewText.trim(),
            gematria_value: gematriaValue,
            metadata: {
              original_reference: reference
            }
          });

          processedCount++;

          // Progress indicator cada 100 filas
          if (processedCount % 100 === 0) {
            process.stdout.write(`\r   Procesadas: ${processedCount} filas...`);
          }

        } catch (error) {
          console.error(`\n⚠️  Error procesando fila:`, error.message);
          skippedCount++;
        }
      })
      .on('end', async () => {
        console.log(`\n✅ Lectura completa: ${processedCount} filas procesadas, ${skippedCount} omitidas`);

        if (rows.length === 0) {
          console.log('⚠️  No hay datos para insertar');
          resolve();
          return;
        }

        // Insertar en lotes
        console.log(`📊 Insertando ${rows.length} filas en lotes de ${BATCH_SIZE}...`);

        let insertedCount = 0;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          
          try {
            const { error } = await supabaseAdmin
              .from('texts')
              .insert(batch);

            if (error) {
              console.error(`\n❌ Error insertando lote ${i / BATCH_SIZE + 1}:`, error.message);
              // Continuar con siguiente lote
            } else {
              insertedCount += batch.length;
              process.stdout.write(`\r   Insertadas: ${insertedCount}/${rows.length} filas`);
            }
          } catch (err) {
            console.error(`\n❌ Error crítico en lote:`, err);
          }
        }

        console.log(`\n✅ Importación completa: ${insertedCount} filas insertadas\n`);
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Error leyendo CSV:', error);
        reject(error);
      });
  });
}

/**
 * Parsea referencia (ej: "Genesis 1:1" o "Zohar I:15a")
 */
function parseReference(reference, source) {
  const result = {
    book: null,
    chapter: null,
    verse: null,
    section: null
  };

  if (!reference) return result;

  try {
    // Para Torah: "Genesis 1:1"
    if (source === 'Torah') {
      const match = reference.match(/^([A-Za-z]+)\s+(\d+):(\d+)$/);
      if (match) {
        result.book = match[1];
        result.chapter = parseInt(match[2]);
        result.verse = parseInt(match[3]);
      }
    }
    // Para Zohar: puede tener formato "I:15a" o similar
    else if (source === 'Zohar') {
      result.section = reference;
    }
    // Para Sefer Yetzirah: guardar como sección
    else {
      result.section = reference;
    }
  } catch (error) {
    console.error('Error parseando referencia:', reference);
  }

  return result;
}

/**
 * Script principal
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════╗
║   📚 IMPORTADOR DE TEXTOS SAGRADOS        ║
║   🕎 Gematria Bot Database                ║
╚═══════════════════════════════════════════╝
  `);

  // Verificar conexión a Supabase
  try {
    const { data, error } = await supabaseAdmin
      .from('texts')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;
    console.log('✅ Conexión a Supabase establecida\n');
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    process.exit(1);
  }

  // Definir archivos a importar
  const imports = [
    // Torah
    { filePath: './data/Genesis.csv', source: 'Torah', book: 'Genesis' },
    { filePath: './data/Exodus.csv', source: 'Torah', book: 'Exodus' },
    { filePath: './data/Leviticus.csv', source: 'Torah', book: 'Leviticus' },
    { filePath: './data/Numbers.csv', source: 'Torah', book: 'Numbers' },
    { filePath: './data/Deuteronomy.csv', source: 'Torah', book: 'Deuteronomy' },
    
    // Zohar
    { filePath: './data/Zohar.csv', source: 'Zohar' },
    
    // Sefer Yetzirah
    { filePath: './data/SeferYetzirah.csv', source: 'Sefer Yetzirah' }
  ];

  // Importar cada archivo
  for (const config of imports) {
    try {
      await importCSV(config);
    } catch (error) {
      console.error(`❌ Error en ${config.filePath}:`, error);
    }
  }

  console.log(`
╔═══════════════════════════════════════════╗
║   ✅ IMPORTACIÓN COMPLETADA               ║
╚═══════════════════════════════════════════╝
  `);

  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});