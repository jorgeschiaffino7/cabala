import { supabaseAdmin } from '../config/supabase.js';
import { calculateGematria, normalizeHebrew } from '../utils/gematriaMap.js';

/**
 * Script de importación del diccionario BDB desde Sefaria API
 * Brown-Driver-Briggs Hebrew Lexicon
 */

const SEFARIA_BASE_URL = 'https://www.sefaria.org/api';
const BATCH_SIZE = 500;

/**
 * Fetch con retry y delay para respetar rate limits
 */
async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        console.log(`⏳ Rate limited, esperando ${delay * 2}ms...`);
        await sleep(delay * 2);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`⚠️ Retry ${i + 1}/${retries}: ${error.message}`);
      await sleep(delay);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Obtiene el índice del BDB para saber la estructura
 */
async function getBDBIndex() {
  console.log('📖 Obteniendo índice del BDB...');
  const data = await fetchWithRetry(`${SEFARIA_BASE_URL}/v2/index/BDB`);
  return data;
}

/**
 * Obtiene una sección específica del BDB
 */
async function getBDBSection(ref) {
  const encodedRef = encodeURIComponent(ref);
  const data = await fetchWithRetry(`${SEFARIA_BASE_URL}/texts/${encodedRef}?context=0`);
  return data;
}

/**
 * Extrae palabras hebreas de un texto
 * Busca patrones como palabras en hebreo al inicio de definiciones
 */
function extractHebrewWords(text) {
  if (!text || typeof text !== 'string') return [];
  
  const words = [];
  
  // Buscar palabras hebreas (secuencias de caracteres hebreos)
  const hebrewPattern = /[\u05D0-\u05EA]+/g;
  const matches = text.match(hebrewPattern);
  
  if (matches) {
    for (const word of matches) {
      const normalized = normalizeHebrew(word);
      // Solo palabras de 2+ letras para evitar prefijos sueltos
      if (normalized && normalized.length >= 2) {
        words.push({
          hebrew: word,
          normalized: normalized
        });
      }
    }
  }
  
  return words;
}

/**
 * Procesa las entradas del BDB y extrae palabras únicas
 */
async function processBDBEntries() {
  console.log('\n📚 Procesando entradas del BDB...\n');
  
  const uniqueWords = new Map(); // normalized -> { hebrew, definition, reference }
  let totalProcessed = 0;
  
  try {
    // Obtener el índice primero
    const index = await getBDBIndex();
    console.log('✅ Índice obtenido');
    
    // El BDB está organizado por letras del alefbet
    // Intentamos obtener las secciones principales
    const letters = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 
                     'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];
    
    for (const letter of letters) {
      try {
        console.log(`\n📖 Procesando letra: ${letter}`);
        
        // Intentar obtener la sección de esta letra
        const ref = `BDB, ${letter}`;
        const section = await getBDBSection(ref);
        
        if (section && section.he) {
          const texts = Array.isArray(section.he) ? section.he : [section.he];
          
          for (const text of texts) {
            if (typeof text === 'string') {
              const words = extractHebrewWords(text);
              for (const word of words) {
                if (!uniqueWords.has(word.normalized)) {
                  uniqueWords.set(word.normalized, {
                    hebrew: word.hebrew,
                    normalized: word.normalized,
                    reference: ref,
                    context: text.substring(0, 200) // Guardar contexto corto
                  });
                }
              }
            } else if (Array.isArray(text)) {
              // Recursivamente procesar arrays anidados
              for (const subtext of text.flat(5)) {
                if (typeof subtext === 'string') {
                  const words = extractHebrewWords(subtext);
                  for (const word of words) {
                    if (!uniqueWords.has(word.normalized)) {
                      uniqueWords.set(word.normalized, {
                        hebrew: word.hebrew,
                        normalized: word.normalized,
                        reference: ref,
                        context: subtext.substring(0, 200)
                      });
                    }
                  }
                }
              }
            }
          }
          
          totalProcessed++;
          console.log(`   ✅ Palabras únicas hasta ahora: ${uniqueWords.size}`);
        }
        
        // Pequeña pausa para no saturar la API
        await sleep(500);
        
      } catch (error) {
        console.log(`   ⚠️ Error en letra ${letter}: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo datos de Sefaria:', error.message);
  }
  
  return uniqueWords;
}

/**
 * Inserta las palabras en Supabase
 */
async function insertWords(wordsMap) {
  console.log(`\n📊 Preparando inserción de ${wordsMap.size} palabras...`);
  
  const rows = [];
  
  for (const [normalized, data] of wordsMap) {
    const gematriaValue = calculateGematria(normalized);
    
    if (gematriaValue > 0 && gematriaValue <= 10000) {
      rows.push({
        source: 'BDB',
        book: 'Hebrew Lexicon',
        chapter: null,
        verse: null,
        section: data.reference,
        text_hebrew: data.hebrew,
        gematria_value: gematriaValue,
        metadata: {
          normalized: normalized,
          context: data.context,
          type: 'word'
        }
      });
    }
  }
  
  console.log(`📊 Insertando ${rows.length} palabras válidas en lotes de ${BATCH_SIZE}...`);
  
  let insertedCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabaseAdmin
        .from('texts')
        .upsert(batch, { 
          onConflict: 'source,text_hebrew',
          ignoreDuplicates: true 
        });
      
      if (error) {
        // Si falla upsert, intentar insert ignorando duplicados
        const { error: insertError } = await supabaseAdmin
          .from('texts')
          .insert(batch);
        
        if (insertError) {
          console.error(`\n⚠️ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, insertError.message);
          errorCount += batch.length;
        } else {
          insertedCount += batch.length;
        }
      } else {
        insertedCount += batch.length;
      }
      
      process.stdout.write(`\r   Progreso: ${insertedCount}/${rows.length} insertadas`);
      
    } catch (err) {
      console.error(`\n❌ Error crítico:`, err.message);
      errorCount += batch.length;
    }
  }
  
  console.log(`\n\n✅ Inserción completa: ${insertedCount} palabras, ${errorCount} errores`);
  return insertedCount;
}

/**
 * Método alternativo: obtener palabras del índice de términos
 */
async function getTermsFromIndex() {
  console.log('\n📖 Intentando método alternativo: términos del índice...');
  
  const uniqueWords = new Map();
  
  try {
    // Obtener lista de títulos/términos
    const titles = await fetchWithRetry(`${SEFARIA_BASE_URL}/index/titles`);
    
    if (titles && Array.isArray(titles)) {
      for (const title of titles) {
        if (typeof title === 'string') {
          const words = extractHebrewWords(title);
          for (const word of words) {
            if (!uniqueWords.has(word.normalized)) {
              uniqueWords.set(word.normalized, {
                hebrew: word.hebrew,
                normalized: word.normalized,
                reference: 'Sefaria Index',
                context: title
              });
            }
          }
        }
      }
    }
    
    console.log(`   ✅ Encontradas ${uniqueWords.size} palabras de títulos`);
  } catch (error) {
    console.log(`   ⚠️ Error: ${error.message}`);
  }
  
  return uniqueWords;
}

/**
 * Genera palabras comunes del hebreo bíblico como fallback
 */
function generateCommonBiblicalWords() {
  console.log('\n📖 Generando diccionario de palabras bíblicas comunes...');
  
  // Palabras hebreas comunes con sus significados
  const commonWords = [
    // Sustantivos fundamentales
    { hebrew: 'אור', meaning: 'luz' },
    { hebrew: 'חשך', meaning: 'oscuridad' },
    { hebrew: 'שמים', meaning: 'cielos' },
    { hebrew: 'ארץ', meaning: 'tierra' },
    { hebrew: 'מים', meaning: 'agua' },
    { hebrew: 'אש', meaning: 'fuego' },
    { hebrew: 'רוח', meaning: 'espíritu/viento' },
    { hebrew: 'נפש', meaning: 'alma' },
    { hebrew: 'לב', meaning: 'corazón' },
    { hebrew: 'אדם', meaning: 'hombre/Adán' },
    { hebrew: 'חוה', meaning: 'Eva/vida' },
    { hebrew: 'איש', meaning: 'varón' },
    { hebrew: 'אשה', meaning: 'mujer' },
    { hebrew: 'בן', meaning: 'hijo' },
    { hebrew: 'בת', meaning: 'hija' },
    { hebrew: 'אב', meaning: 'padre' },
    { hebrew: 'אם', meaning: 'madre' },
    { hebrew: 'אח', meaning: 'hermano' },
    { hebrew: 'אחות', meaning: 'hermana' },
    { hebrew: 'מלך', meaning: 'rey' },
    { hebrew: 'מלכה', meaning: 'reina' },
    { hebrew: 'כהן', meaning: 'sacerdote' },
    { hebrew: 'נביא', meaning: 'profeta' },
    { hebrew: 'עבד', meaning: 'siervo' },
    { hebrew: 'אדון', meaning: 'señor' },
    
    // Nombres divinos y espirituales
    { hebrew: 'אל', meaning: 'Dios' },
    { hebrew: 'אלהים', meaning: 'Dios (plural mayestático)' },
    { hebrew: 'שדי', meaning: 'Todopoderoso' },
    { hebrew: 'מלאך', meaning: 'ángel/mensajero' },
    { hebrew: 'קדוש', meaning: 'santo' },
    { hebrew: 'ברוך', meaning: 'bendito' },
    { hebrew: 'שלום', meaning: 'paz' },
    { hebrew: 'אמת', meaning: 'verdad' },
    { hebrew: 'חסד', meaning: 'misericordia/bondad' },
    { hebrew: 'צדק', meaning: 'justicia' },
    { hebrew: 'משפט', meaning: 'juicio' },
    { hebrew: 'תורה', meaning: 'Torá/ley' },
    { hebrew: 'מצוה', meaning: 'mandamiento' },
    { hebrew: 'ברית', meaning: 'pacto' },
    { hebrew: 'קרבן', meaning: 'ofrenda/sacrificio' },
    { hebrew: 'תפלה', meaning: 'oración' },
    { hebrew: 'תשובה', meaning: 'arrepentimiento' },
    
    // Sefirot (Cabalá)
    { hebrew: 'כתר', meaning: 'corona (Keter)' },
    { hebrew: 'חכמה', meaning: 'sabiduría (Jojmá)' },
    { hebrew: 'בינה', meaning: 'entendimiento (Biná)' },
    { hebrew: 'דעת', meaning: 'conocimiento (Daat)' },
    { hebrew: 'גדולה', meaning: 'grandeza (Gedulá)' },
    { hebrew: 'גבורה', meaning: 'fortaleza (Gevurá)' },
    { hebrew: 'תפארת', meaning: 'belleza (Tiferet)' },
    { hebrew: 'נצח', meaning: 'eternidad (Netzaj)' },
    { hebrew: 'הוד', meaning: 'gloria (Hod)' },
    { hebrew: 'יסוד', meaning: 'fundamento (Yesod)' },
    { hebrew: 'מלכות', meaning: 'reino (Maljut)' },
    
    // Tiempo y espacio
    { hebrew: 'יום', meaning: 'día' },
    { hebrew: 'לילה', meaning: 'noche' },
    { hebrew: 'שבת', meaning: 'Shabat/descanso' },
    { hebrew: 'חדש', meaning: 'mes/nuevo' },
    { hebrew: 'שנה', meaning: 'año' },
    { hebrew: 'עולם', meaning: 'mundo/eternidad' },
    { hebrew: 'מקום', meaning: 'lugar' },
    { hebrew: 'בית', meaning: 'casa' },
    { hebrew: 'היכל', meaning: 'templo/palacio' },
    { hebrew: 'עיר', meaning: 'ciudad' },
    { hebrew: 'דרך', meaning: 'camino' },
    { hebrew: 'שער', meaning: 'puerta' },
    
    // Verbos/acciones (raíces)
    { hebrew: 'ברא', meaning: 'crear' },
    { hebrew: 'אמר', meaning: 'decir' },
    { hebrew: 'עשה', meaning: 'hacer' },
    { hebrew: 'נתן', meaning: 'dar' },
    { hebrew: 'לקח', meaning: 'tomar' },
    { hebrew: 'הלך', meaning: 'ir/caminar' },
    { hebrew: 'בא', meaning: 'venir' },
    { hebrew: 'ישב', meaning: 'sentarse/habitar' },
    { hebrew: 'קום', meaning: 'levantarse' },
    { hebrew: 'שמע', meaning: 'escuchar' },
    { hebrew: 'ראה', meaning: 'ver' },
    { hebrew: 'ידע', meaning: 'conocer' },
    { hebrew: 'אהב', meaning: 'amar' },
    { hebrew: 'שמר', meaning: 'guardar' },
    { hebrew: 'זכר', meaning: 'recordar' },
    { hebrew: 'כתב', meaning: 'escribir' },
    { hebrew: 'קרא', meaning: 'llamar/leer' },
    { hebrew: 'חיה', meaning: 'vivir' },
    { hebrew: 'מות', meaning: 'morir' },
    
    // Números
    { hebrew: 'אחד', meaning: 'uno' },
    { hebrew: 'שנים', meaning: 'dos' },
    { hebrew: 'שלש', meaning: 'tres' },
    { hebrew: 'ארבע', meaning: 'cuatro' },
    { hebrew: 'חמש', meaning: 'cinco' },
    { hebrew: 'שש', meaning: 'seis' },
    { hebrew: 'שבע', meaning: 'siete' },
    { hebrew: 'שמונה', meaning: 'ocho' },
    { hebrew: 'תשע', meaning: 'nueve' },
    { hebrew: 'עשר', meaning: 'diez' },
    { hebrew: 'מאה', meaning: 'cien' },
    { hebrew: 'אלף', meaning: 'mil' },
    
    // Naturaleza y animales
    { hebrew: 'עץ', meaning: 'árbol' },
    { hebrew: 'פרי', meaning: 'fruto' },
    { hebrew: 'זרע', meaning: 'semilla' },
    { hebrew: 'שמש', meaning: 'sol' },
    { hebrew: 'ירח', meaning: 'luna' },
    { hebrew: 'כוכב', meaning: 'estrella' },
    { hebrew: 'ים', meaning: 'mar' },
    { hebrew: 'נהר', meaning: 'río' },
    { hebrew: 'הר', meaning: 'montaña' },
    { hebrew: 'אבן', meaning: 'piedra' },
    { hebrew: 'חי', meaning: 'vivo/animal' },
    { hebrew: 'נחש', meaning: 'serpiente' },
    { hebrew: 'יונה', meaning: 'paloma' },
    { hebrew: 'אריה', meaning: 'león' },
    { hebrew: 'כבש', meaning: 'cordero' },
    
    // Cuerpo humano
    { hebrew: 'ראש', meaning: 'cabeza' },
    { hebrew: 'פנים', meaning: 'rostro' },
    { hebrew: 'עין', meaning: 'ojo' },
    { hebrew: 'אזן', meaning: 'oído' },
    { hebrew: 'פה', meaning: 'boca' },
    { hebrew: 'לשון', meaning: 'lengua' },
    { hebrew: 'יד', meaning: 'mano' },
    { hebrew: 'רגל', meaning: 'pie' },
    { hebrew: 'דם', meaning: 'sangre' },
    { hebrew: 'בשר', meaning: 'carne' },
    { hebrew: 'עצם', meaning: 'hueso' },
    
    // Conceptos abstractos
    { hebrew: 'טוב', meaning: 'bueno' },
    { hebrew: 'רע', meaning: 'malo' },
    { hebrew: 'חכם', meaning: 'sabio' },
    { hebrew: 'גדול', meaning: 'grande' },
    { hebrew: 'קטן', meaning: 'pequeño' },
    { hebrew: 'חדש', meaning: 'nuevo' },
    { hebrew: 'ישן', meaning: 'viejo/antiguo' },
    { hebrew: 'חזק', meaning: 'fuerte' },
    { hebrew: 'רב', meaning: 'mucho/grande' },
    { hebrew: 'כל', meaning: 'todo' },
    { hebrew: 'סוד', meaning: 'secreto/misterio' },
    { hebrew: 'רז', meaning: 'misterio' },
    
    // Patriarcas y personajes
    { hebrew: 'אברהם', meaning: 'Abraham' },
    { hebrew: 'יצחק', meaning: 'Isaac' },
    { hebrew: 'יעקב', meaning: 'Jacob' },
    { hebrew: 'ישראל', meaning: 'Israel' },
    { hebrew: 'משה', meaning: 'Moisés' },
    { hebrew: 'אהרן', meaning: 'Aarón' },
    { hebrew: 'דוד', meaning: 'David' },
    { hebrew: 'שלמה', meaning: 'Salomón' },
    
    // Lugares sagrados
    { hebrew: 'ירושלים', meaning: 'Jerusalén' },
    { hebrew: 'ציון', meaning: 'Sión' },
    { hebrew: 'סיני', meaning: 'Sinaí' },
    { hebrew: 'מצרים', meaning: 'Egipto' },
    { hebrew: 'בבל', meaning: 'Babilonia' },
    { hebrew: 'גן', meaning: 'jardín' },
    { hebrew: 'עדן', meaning: 'Edén' },
  ];
  
  const wordsMap = new Map();
  
  for (const word of commonWords) {
    const normalized = normalizeHebrew(word.hebrew);
    wordsMap.set(normalized, {
      hebrew: word.hebrew,
      normalized: normalized,
      reference: 'Biblical Hebrew Dictionary',
      context: word.meaning
    });
  }
  
  console.log(`   ✅ Generadas ${wordsMap.size} palabras bíblicas comunes`);
  return wordsMap;
}

/**
 * Script principal
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   📚 IMPORTADOR DE DICCIONARIO HEBREO                 ║
║   🕎 Gematria Bot - Sefaria BDB Import                ║
╚═══════════════════════════════════════════════════════╝
  `);

  // Verificar conexión a Supabase
  try {
    const { count, error } = await supabaseAdmin
      .from('texts')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Conexión a Supabase establecida (${count} registros actuales)\n`);
  } catch (error) {
    console.error('❌ Error conectando a Supabase:', error.message);
    process.exit(1);
  }

  let allWords = new Map();

  // Intentar obtener del BDB via Sefaria
  try {
    const bdbWords = await processBDBEntries();
    for (const [key, value] of bdbWords) {
      allWords.set(key, value);
    }
  } catch (error) {
    console.log(`⚠️ Error con BDB: ${error.message}`);
  }

  // Si obtuvimos pocas palabras, agregar términos del índice
  if (allWords.size < 100) {
    const indexWords = await getTermsFromIndex();
    for (const [key, value] of indexWords) {
      if (!allWords.has(key)) {
        allWords.set(key, value);
      }
    }
  }

  // Siempre agregar el diccionario de palabras comunes como base
  const commonWords = generateCommonBiblicalWords();
  for (const [key, value] of commonWords) {
    if (!allWords.has(key)) {
      allWords.set(key, value);
    }
  }

  console.log(`\n📊 Total de palabras únicas recolectadas: ${allWords.size}`);

  if (allWords.size > 0) {
    await insertWords(allWords);
  } else {
    console.log('⚠️ No se encontraron palabras para importar');
  }

  // Mostrar estadísticas finales
  const { data: stats } = await supabaseAdmin
    .from('texts')
    .select('source')
    .eq('source', 'BDB');

  console.log(`
╔═══════════════════════════════════════════════════════╗
║   ✅ IMPORTACIÓN COMPLETADA                           ║
║   📊 Registros BDB en DB: ${(stats?.length || 0).toString().padEnd(27)}║
╚═══════════════════════════════════════════════════════╝
  `);

  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
