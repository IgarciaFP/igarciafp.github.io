(() => {
'use strict';
// Adapted from tmp/examen.js; the laboratory keeps its original exercise order.
const $=id=>document.getElementById(id);
const fields=[{"id": "t1", "label": "1. Tiempo expresado en segundos", "answer": 120, "kind": "number", "section": "transmision"}, {"id": "t2", "label": "2. Operación para calcular MB/s (con unidades)", "answer": null, "kind": "open", "section": "transmision"}, {"id": "t3", "label": "3. Velocidad en MB/s", "answer": 6.25, "kind": "number", "section": "transmision"}, {"id": "t4", "label": "4. Operación para pasar de MB/s a Mbit/s", "answer": null, "kind": "open", "section": "transmision"}, {"id": "t5", "label": "5. Velocidad en Mbit/s", "answer": 50, "kind": "number", "section": "transmision"}, {"id": "t6", "label": "1. Tamaño en MB", "answer": 1800, "kind": "number", "section": "transmision"}, {"id": "t7", "label": "2. Velocidad en MB/s", "answer": 10, "kind": "number", "section": "transmision"}, {"id": "t8", "label": "3. División que relaciona tamaño y velocidad, con unidades", "answer": null, "kind": "open", "section": "transmision"}, {"id": "t9", "label": "4. Tiempo en segundos", "answer": 180, "kind": "number", "section": "transmision"}, {"id": "t10", "label": "5. Tiempo en minutos", "answer": 3, "kind": "number", "section": "transmision"}, {"id": "s1", "label": "1. Espacio disponible en MB", "answer": 2000, "kind": "number", "section": "almacenamiento"}, {"id": "s2", "label": "2. Tamaño de cada foto en MB", "answer": 1.6, "kind": "number", "section": "almacenamiento"}, {"id": "s3", "label": "3. Multiplicaciones para el total de vídeos y fotos (con unidades)", "answer": null, "kind": "open", "section": "almacenamiento"}, {"id": "s4", "label": "4. Total de vídeos en MB", "answer": 1350, "kind": "number", "section": "almacenamiento"}, {"id": "s5", "label": "5. Total de fotos en MB", "answer": 400, "kind": "number", "section": "almacenamiento"}, {"id": "s6", "label": "6. Suma de los tres grupos de archivos, en MB", "answer": null, "kind": "open", "section": "almacenamiento"}, {"id": "s7", "label": "7. Total que quieres guardar en MB", "answer": 1950, "kind": "number", "section": "almacenamiento"}, {"id": "s8", "label": "8. ¿Cabe todo?", "answer": "Sí", "kind": "choice", "section": "almacenamiento"}, {"id": "s9", "label": "9. Espacio que sobra en MB", "answer": 50, "kind": "number", "section": "almacenamiento"}, {"id": "s10", "label": "1. Primera carpeta en MiB", "answer": 1536, "kind": "number", "section": "almacenamiento"}, {"id": "s11", "label": "2. Suma y conversión para obtener el total en GiB", "answer": null, "kind": "open", "section": "almacenamiento"}, {"id": "s12", "label": "3. Total en MiB", "answer": 2304, "kind": "number", "section": "almacenamiento"}, {"id": "s13", "label": "4. Total en GiB", "answer": 2.25, "kind": "number", "section": "almacenamiento"}, {"id": "b0", "label": "1 × 2^7", "answer": 128, "kind": "number", "section": "binario"}, {"id": "b1", "label": "0 × 2^6", "answer": 0, "kind": "number", "section": "binario"}, {"id": "b2", "label": "1 × 2^5", "answer": 32, "kind": "number", "section": "binario"}, {"id": "b3", "label": "0 × 2^4", "answer": 0, "kind": "number", "section": "binario"}, {"id": "b4", "label": "1 × 2^3", "answer": 8, "kind": "number", "section": "binario"}, {"id": "b5", "label": "1 × 2^2", "answer": 4, "kind": "number", "section": "binario"}, {"id": "b6", "label": "0 × 2^1", "answer": 0, "kind": "number", "section": "binario"}, {"id": "b7", "label": "1 × 2^0", "answer": 1, "kind": "number", "section": "binario"}, {"id": "bsum", "label": "Suma de los valores de las posiciones", "answer": null, "kind": "open", "section": "binario"}, {"id": "btotal", "label": "Resultado decimal", "answer": 173, "kind": "number", "section": "binario"}, {"id": "q0", "label": "Cociente de la división 1", "answer": 22, "kind": "number", "section": "binario"}, {"id": "r0", "label": "Resto de la división 1", "answer": 1, "kind": "number", "section": "binario"}, {"id": "q1", "label": "Cociente de la división 2", "answer": 11, "kind": "number", "section": "binario"}, {"id": "r1", "label": "Resto de la división 2", "answer": 0, "kind": "number", "section": "binario"}, {"id": "q2", "label": "Cociente de la división 3", "answer": 5, "kind": "number", "section": "binario"}, {"id": "r2", "label": "Resto de la división 3", "answer": 1, "kind": "number", "section": "binario"}, {"id": "q3", "label": "Cociente de la división 4", "answer": 2, "kind": "number", "section": "binario"}, {"id": "r3", "label": "Resto de la división 4", "answer": 1, "kind": "number", "section": "binario"}, {"id": "q4", "label": "Cociente de la división 5", "answer": 1, "kind": "number", "section": "binario"}, {"id": "r4", "label": "Resto de la división 5", "answer": 0, "kind": "number", "section": "binario"}, {"id": "q5", "label": "Cociente de la división 6", "answer": 0, "kind": "number", "section": "binario"}, {"id": "r5", "label": "Resto de la división 6", "answer": 1, "kind": "number", "section": "binario"}, {"id": "border", "label": "¿En qué orden lees los restos y por qué?", "answer": null, "kind": "open", "section": "binario"}, {"id": "bbin", "label": "Resultado binario", "answer": "101101", "kind": "digits", "section": "binario"}, {"id": "bridge", "label": "Paso previo: 45 en binario", "answer": "101101", "kind": "digits", "section": "bases"}, {"id": "hgroup", "label": "1. Grupos de 4 bits (separados por espacios)", "answer": "0010 1101", "kind": "groups", "section": "bases"}, {"id": "hdigits", "label": "2. Dígito hexadecimal de cada grupo, en el mismo orden", "answer": "2 D", "kind": "groups", "section": "bases"}, {"id": "hfinal", "label": "3. Resultado hexadecimal", "answer": "2D", "kind": "digits", "section": "bases"}, {"id": "ogroup", "label": "4. Grupos de 3 bits (completa el grupo izquierdo)", "answer": "101 101", "kind": "groups", "section": "bases"}, {"id": "odigits", "label": "5. Dígito octal de cada grupo, en el mismo orden", "answer": "5 5", "kind": "groups", "section": "bases"}, {"id": "ofinal", "label": "6. Resultado octal", "answer": "55", "kind": "digits", "section": "bases"}, {"id": "hb", "label": "1. B en cuatro bits", "answer": "1011", "kind": "digits", "section": "bases"}, {"id": "h6", "label": "2. 6 en cuatro bits", "answer": "0110", "kind": "digits", "section": "bases"}, {"id": "hbin", "label": "3. Unión de ambos grupos", "answer": "10110110", "kind": "digits", "section": "bases"}, {"id": "hweights", "label": "4. Descomposición en potencias de 2 y suma", "answer": null, "kind": "open", "section": "bases"}, {"id": "hdec", "label": "5. Resultado decimal", "answer": 182, "kind": "number", "section": "bases"}, {"id": "o2", "label": "1. 2 en tres bits", "answer": "010", "kind": "digits", "section": "bases"}, {"id": "o6", "label": "2. 6 en tres bits", "answer": "110", "kind": "digits", "section": "bases"}, {"id": "o5", "label": "3. 5 en tres bits", "answer": "101", "kind": "digits", "section": "bases"}, {"id": "obin", "label": "4. Unión de los tres grupos (conserva los 9 bits)", "answer": "010110101", "kind": "digits", "section": "bases"}, {"id": "oweights", "label": "5. Descomposición en potencias de 2 y suma", "answer": null, "kind": "open", "section": "bases"}, {"id": "odec", "label": "6. Resultado decimal", "answer": 181, "kind": "number", "section": "bases"}, {"id": "p1", "label": "1. Una CPU a 4 GHz y otra a 3 GHz: ¿puedes afirmar que la primera es más rápida? Justifica con dos factores del tema.", "answer": null, "kind": "open", "section": "hardware"}, {"id": "p2", "label": "2. Ejecuta operaciones aritméticas y lógicas", "answer": "ALU", "kind": "choice", "section": "hardware"}, {"id": "p3", "label": "3. Coordina la ejecución de instrucciones", "answer": "Unidad de control", "kind": "choice", "section": "hardware"}, {"id": "m1", "label": "4. Ordena de mayor a menor rapidez típica", "answer": "Registros → caché → RAM → SSD", "kind": "choice", "section": "hardware"}, {"id": "m2", "label": "5. ¿Qué pasa al cortar la alimentación?", "answer": "La RAM pierde su contenido; el SSD lo conserva", "kind": "choice", "section": "hardware"}, {"id": "m3", "label": "6. Un documento se editó en RAM, pero no se guardó: explica qué podría perderse al apagar el equipo.", "answer": null, "kind": "open", "section": "hardware"}, {"id": "bus1", "label": "1. Transporta la dirección 20", "answer": "Bus de direcciones", "kind": "choice", "section": "hardware"}, {"id": "bus2", "label": "2. Transporta el valor 7", "answer": "Bus de datos", "kind": "choice", "section": "hardware"}, {"id": "bus3", "label": "3. Lleva la orden de lectura", "answer": "Bus de control", "kind": "choice", "section": "hardware"}, {"id": "busformula", "label": "4. Potencia para calcular posiciones y operación para obtener bytes", "answer": null, "kind": "open", "section": "hardware"}, {"id": "positions", "label": "5. Número de posiciones", "answer": 4096, "kind": "number", "section": "hardware"}, {"id": "bytes", "label": "6. Capacidad en bytes", "answer": 4096, "kind": "number", "section": "hardware"}, {"id": "kib", "label": "7. Capacidad en KiB", "answer": 4, "kind": "number", "section": "hardware"}, {"id": "cycle1", "label": "1. Primera fase", "answer": "Buscar la instrucción", "kind": "choice", "section": "ciclo"}, {"id": "cycle2", "label": "2. Segunda fase", "answer": "Decodificar la operación", "kind": "choice", "section": "ciclo"}, {"id": "cycle3", "label": "3. Tercera fase", "answer": "Ejecutar y guardar el resultado", "kind": "choice", "section": "ciclo"}, {"id": "ir", "label": "4. Registro que recibe la instrucción", "answer": "IR", "kind": "choice", "section": "ciclo"}, {"id": "pc", "label": "5. PC tras avanzar a la siguiente instrucción", "answer": 21, "kind": "number", "section": "ciclo"}, {"id": "result", "label": "6. Valor final de R", "answer": 12, "kind": "number", "section": "ciclo"}, {"id": "cyclewhy", "label": "7. Describe qué hacen la UC y la ALU en este ejemplo y dónde queda el resultado.", "answer": null, "kind": "open", "section": "ciclo"}, {"id": "sw1", "label": "1. Sistema operativo", "answer": "Software de sistema", "kind": "choice", "section": "software"}, {"id": "sw2", "label": "2. Depurador de programas", "answer": "Software de programación", "kind": "choice", "section": "software"}, {"id": "sw3", "label": "3. Aplicación de facturación", "answer": "Software de aplicación", "kind": "choice", "section": "software"}, {"id": "sw4", "label": "4. Gestionar contactos y seguimientos de clientes", "answer": "CRM", "kind": "choice", "section": "software"}, {"id": "sw5", "label": "5. Integrar ventas, inventario y facturas", "answer": "ERP", "kind": "choice", "section": "software"}, {"id": "sw6", "label": "6. Comparar escenarios de compra de existencias", "answer": "DSS", "kind": "choice", "section": "software"}, {"id": "sw7", "label": "7. Un programa sin coste prohíbe modificarlo y redistribuirlo", "answer": "Gratuito y propietario", "kind": "choice", "section": "software"}, {"id": "sw8", "label": "8. Una tienda quiere un programa a medida. ¿Qué alternativa estudiarías primero y cuándo justificarías desarrollarlo?", "answer": null, "kind": "open", "section": "software"}, {"id": "sw9", "label": "9. Explica por qué compilar sin errores no demuestra que un programa calcule bien un descuento.", "answer": null, "kind": "open", "section": "software"}], sections=[{"id": "transmision", "title": "Transmisión: velocidad y tiempo", "time": 10}, {"id": "almacenamiento", "title": "Almacenamiento: ¿cabe todo?", "time": 8}, {"id": "binario", "title": "Binario y decimal, paso a paso", "time": 10}, {"id": "bases", "title": "Hexadecimal y octal con puente binario", "time": 12}, {"id": "hardware", "title": "Procesadores, buses y memoria", "time": 8}, {"id": "ciclo", "title": "El ciclo de instrucción", "time": 5}, {"id": "software", "title": "Tipos de software", "time": 7}];


const hintNodes=[...document.querySelectorAll('.exercise details')];
let checked={},hints={};
const ids=[...fields.map(f=>f.id),'student','fullname','group','reflection'];
const FORM='https://docs.google.com/forms/d/e/1FAIpQLSe0iRrYhaOF0WL5lwjWeFheZbz1jKhz8vkG45E1i3psjfKK-w/viewform';
const RECOVERY='ssii-repaso-ud01-ultima-entrega-v2';
let language=null,guard=null,elapsed=0,started=null,phase='ready',delivering=false,lastDelivery=null,recoveryMode=false;

const workbookTranslations={"Tu recorrido":"Your progress","0 de 7 bloques completos":"0 of 7 blocks completed","01 · Transmisión ":"01 · Transmission ","10 min":"10 min","02 · Almacenamiento ":"02 · Storage ","8 min":"8 min","03 · Binario y decimal ":"03 · Binary and decimal ","04 · Hexadecimal y octal ":"04 · Hexadecimal and octal ","12 min":"12 min","05 · Hardware ":"05 · Hardware ","06 · Ciclo de instrucción ":"06 · Instruction cycle ","5 min":"5 min","07 · Software ":"07 · Software ","7 min":"7 min","✓ Informe final":"✓ Final report","Tiempo total desde el inicio. El reloj no se pausa y se incluirá en el TXT final.":"Total time since starting. The timer does not pause and is included in the final TXT.","Las respuestas se guardan en este navegador.":"Answers are saved in this browser.","Antes de empezar":"Before you begin","Escribe ":"Write ","las operaciones y sus unidades":"the calculations and their units",", no solo el resultado. En las conversiones de bases, muestra las divisiones o agrupaciones solicitadas. Realiza los cálculos y cambios de base en este cuaderno. Durante el intento no abandones la práctica.":", not just the result. For base conversions, show the requested divisions or groups. Perform calculations and base conversions in this workbook. Stay on this page during the attempt.","Escribe tus respuestas directamente: copiar, cortar, pegar y arrastrar texto están deshabilitados. Al confirmar la finalización se descargará el TXT y las respuestas quedarán bloqueadas.":"Type your answers directly: copying, cutting, pasting and dragging text are disabled. Confirming completion downloads the TXT and locks your answers.","Grupo (opcional)":"Group (optional)","Convenciones:":"Conventions:"," 1 B = 8 bits. En decimal: 1 GB = 1000 MB; 1 MB = 1000 kB. En binario: 1 GiB = 1024 MiB; 1 MiB = 1024 KiB; 1 KiB = 1024 B. Usa coma o punto decimal, sin separadores de miles, y escribe la unidad solo en los campos de explicación.":" 1 B = 8 bits. Decimal: 1 GB = 1000 MB; 1 MB = 1000 kB. Binary: 1 GiB = 1024 MiB; 1 MiB = 1024 KiB; 1 KiB = 1024 B. Use a decimal comma or point without thousands separators; write units only in explanation fields.","Los resultados cerrados se comprueban automáticamente. Las operaciones y explicaciones se incluyen en la entrega para revisión del profesor; escribir cualquier texto no demuestra que el procedimiento sea correcto.":"Closed answers are checked automatically. Calculations and explanations are included for teacher review; entering text does not prove the method is correct.","10 minutos":"10 minutes","Transmisión: velocidad y tiempo":"Transmission: speed and time","Dos situaciones para practicar bits, bytes, tamaños y tiempos.":"Two situations to practise bits, bytes, sizes and times.","A. ¿A qué velocidad llegó?":"A. How fast did it arrive?","Un archivo de ":"A file of ","750 MB":"750 MB"," tarda ":" takes ","2 minutos":"2 minutes"," en descargarse. Calcula la velocidad media en MB/s y Mbit/s.":" to download. Calculate the average speed in MB/s and Mbit/s.","1. Tiempo expresado en segundos":"1. Time in seconds","2. Operación para calcular MB/s (con unidades)":"2. Calculation for MB/s (with units)","3. Velocidad en MB/s":"3. Speed in MB/s","4. Operación para pasar de MB/s a Mbit/s":"4. Calculation to convert MB/s to Mbit/s","5. Velocidad en Mbit/s":"5. Speed in Mbit/s","Una pista, sin resolverlo":"A hint without solving it","Primero convierte minutos a segundos. Velocidad = tamaño ÷ tiempo. Un byte tiene 8 bits.":"First convert minutes to seconds. Speed = size ÷ time. A byte contains 8 bits.","B. ¿Cuánto tardará?":"B. How long will it take?","Debes subir ":"You need to upload ","1,8 GB":"1.8 GB"," a ":" at ","80 Mbit/s":"80 Mbit/s",". Supón que la velocidad permanece constante y no hay sobrecarga. Calcula el tiempo ideal.":". Assume constant speed and no overhead. Calculate the ideal time.","1. Tamaño en MB":"1. Size in MB","2. Velocidad en MB/s":"2. Speed in MB/s","3. División que relaciona tamaño y velocidad, con unidades":"3. Division relating size and speed, with units","4. Tiempo en segundos":"4. Time in seconds","5. Tiempo en minutos":"5. Time in minutes","Iguala las unidades: expresa tamaño en MB y velocidad en MB/s. Tiempo = tamaño ÷ velocidad.":"Use matching units: size in MB and speed in MB/s. Time = size ÷ speed.","Comprobar este bloque":"Check this block","8 minutos":"8 minutes","Almacenamiento: ¿cabe todo?":"Storage: will everything fit?","Convierte antes de sumar. Usa la escala que indica cada enunciado.":"Convert before adding. Use the scale specified in each question.","A. Prepara la copia de seguridad":"A. Prepare the backup","En una memoria USB quedan ":"A USB drive has ","2 GB libres":"2 GB free",". Quieres guardar ":". You want to save ","3 vídeos de 450 MB":"3 videos of 450 MB"," cada uno, ":" each, ","250 fotos de 1 600 kB":"250 photos of 1,600 kB"," cada una y ":" each and ","200 MB":"200 MB"," de documentos. ¿Cabe todo?":" of documents. Will everything fit?","1. Espacio disponible en MB":"1. Available space in MB","2. Tamaño de cada foto en MB":"2. Size of each photo in MB","3. Multiplicaciones para el total de vídeos y fotos (con unidades)":"3. Multiplications for total video and photo sizes (with units)","4. Total de vídeos en MB":"4. Total video size in MB","5. Total de fotos en MB":"5. Total photo size in MB","6. Suma de los tres grupos de archivos, en MB":"6. Sum of the three groups of files, in MB","7. Total que quieres guardar en MB":"7. Total size to save in MB","8. ¿Cabe todo?":"8. Will everything fit?","Elige…":"Choose…","Sí":"Yes","No":"No","9. Espacio que sobra en MB":"9. Space remaining in MB","Usa MB como unidad común. En escala decimal, 1 GB = 1000 MB y 1 MB = 1000 kB. Suma solo después de convertir.":"Use MB as the common unit. Decimal scale: 1 GB = 1000 MB and 1 MB = 1000 kB. Add only after converting.","B. Ojo al prefijo: MiB no es MB":"B. Watch the prefix: MiB is not MB","Una carpeta ocupa ":"One folder occupies ","1,5 GiB":"1.5 GiB"," y otra ":" and another ","768 MiB":"768 MiB",". Necesitas almacenarlas juntas. En este caso usa prefijos binarios.":". You need to store them together. Use binary prefixes in this case.","1. Primera carpeta en MiB":"1. First folder in MiB","2. Suma y conversión para obtener el total en GiB":"2. Addition and conversion for the total in GiB","3. Total en MiB":"3. Total in MiB","4. Total en GiB":"4. Total in GiB","En escala binaria, 1 GiB = 1024 MiB. No mezcles el factor 1000 con el factor 1024.":"In the binary scale, 1 GiB = 1024 MiB. Do not mix factors of 1000 and 1024.","Binario y decimal, paso a paso":"Binary and decimal, step by step","Muestra el procedimiento: los resultados aislados no bastan.":"Show your method: results alone are not enough.","A. Cada posición tiene un peso":"A. Each position has a weight","Convierte ":"Convert ","10101101₂":"10101101₂"," a decimal. Escribe cuánto aporta cada bit y después suma.":" to decimal. Write each bit's contribution, then add.","1 × 2^7":"1 × 2^7","0 × 2^6":"0 × 2^6","1 × 2^5":"1 × 2^5","0 × 2^4":"0 × 2^4","1 × 2^3":"1 × 2^3","1 × 2^2":"1 × 2^2","0 × 2^1":"0 × 2^1","1 × 2^0":"1 × 2^0","Suma de los valores de las posiciones":"Sum of the positional values","Resultado decimal":"Decimal result","El bit situado a la derecha tiene peso 2⁰. Multiplica cada bit por su potencia de 2.":"The rightmost bit has weight 2⁰. Multiply each bit by its power of 2.","B. Divide, anota y lee":"B. Divide, record and read","45₁₀":"45₁₀"," a binario por divisiones sucesivas entre 2. Completa cada cociente y resto hasta obtener cociente cero.":" to binary by repeated division by 2. Enter each quotient and remainder until the quotient is zero.","Dividendo ÷ 2":"Dividend ÷ 2","Cociente":"Quotient","Resto":"Remainder","45 ÷ 2":"45 ÷ 2","Cociente de la división 1":"Quotient of division 1","Resto de la división 1":"Remainder of division 1","Cociente anterior ÷ 2":"Previous quotient ÷ 2","Cociente de la división 2":"Quotient of division 2","Resto de la división 2":"Remainder of division 2","Cociente de la división 3":"Quotient of division 3","Resto de la división 3":"Remainder of division 3","Cociente de la división 4":"Quotient of division 4","Resto de la división 4":"Remainder of division 4","Cociente de la división 5":"Quotient of division 5","Resto de la división 5":"Remainder of division 5","Cociente de la división 6":"Quotient of division 6","Resto de la división 6":"Remainder of division 6","¿En qué orden lees los restos y por qué?":"In what order do you read the remainders, and why?","Resultado binario":"Binary result","En cada fila, dividendo = 2 × cociente + resto. Para reconstruir el número, lee los restos desde la última división hacia la primera.":"In each row, dividend = 2 × quotient + remainder. Reconstruct the number by reading remainders from the last division to the first.","12 minutos":"12 minutes","Hexadecimal y octal con puente binario":"Hexadecimal and octal through binary","Agrupa y desagrupa bits: cuatro para hexadecimal, tres para octal.":"Group and ungroup bits: four for hexadecimal, three for octal.","A. Del binario a dos bases":"A. From binary to two bases"," a hexadecimal y octal pasando por binario. Recupera el resultado binario que obtuviste en el bloque anterior y agrúpalo desde la derecha. Añade ceros solo a la izquierda cuando hagan falta.":" to hexadecimal and octal through binary. Use the binary result from the previous block and group it from the right. Add leading zeros only when needed.","Paso previo: 45 en binario":"Previous step: 45 in binary","1. Grupos de 4 bits (separados por espacios)":"1. Groups of 4 bits (separated by spaces)","2. Dígito hexadecimal de cada grupo, en el mismo orden":"2. Hexadecimal digit for each group, in the same order","3. Resultado hexadecimal":"3. Hexadecimal result","4. Grupos de 3 bits (completa el grupo izquierdo)":"4. Groups of 3 bits (complete the leftmost group)","5. Dígito octal de cada grupo, en el mismo orden":"5. Octal digit for each group, in the same order","6. Resultado octal":"6. Octal result","Un dígito hexadecimal representa 4 bits; un dígito octal representa 3 bits. En hexadecimal, A representa diez y B representa once.":"A hexadecimal digit represents 4 bits; an octal digit represents 3 bits. In hexadecimal, A represents ten and B represents eleven.","B. Vuelta desde hexadecimal":"B. Back from hexadecimal","B6₁₆":"B6₁₆"," a binario y después a decimal. Escribe cuatro bits por cada dígito hexadecimal.":" to binary, then decimal. Write four bits for each hexadecimal digit.","1. B en cuatro bits":"1. B in four bits","2. 6 en cuatro bits":"2. 6 in four bits","3. Unión de ambos grupos":"3. Join both groups","4. Descomposición en potencias de 2 y suma":"4. Expansion in powers of 2 and sum","5. Resultado decimal":"5. Decimal result","Sustituye cada dígito por cuatro bits; conserva los ceros iniciales de cada grupo antes de unirlos.":"Replace each digit with four bits; keep each group's leading zeros before joining them.","C. Vuelta desde octal":"C. Back from octal","265₈":"265₈"," a binario y después a decimal. Escribe tres bits por cada dígito octal.":" to binary, then decimal. Write three bits for each octal digit.","1. 2 en tres bits":"1. 2 in three bits","2. 6 en tres bits":"2. 6 in three bits","3. 5 en tres bits":"3. 5 in three bits","4. Unión de los tres grupos (conserva los 9 bits)":"4. Join all three groups (keep all 9 bits)","5. Descomposición en potencias de 2 y suma":"5. Expansion in powers of 2 and sum","6. Resultado decimal":"6. Decimal result","Sustituye cada dígito por tres bits. Al calcular el valor decimal, empieza las potencias por la derecha.":"Replace each digit with three bits. When calculating the decimal value, start the powers from the right.","Procesadores, buses y memoria":"Processors, buses and memory","Relaciona los componentes con sus funciones y calcula una capacidad direccionable.":"Match components to their functions and calculate addressable capacity.","A. Lo que hay dentro del equipo":"A. Inside the computer","1. Una CPU a 4 GHz y otra a 3 GHz: ¿puedes afirmar que la primera es más rápida? Justifica con dos factores del tema.":"1. One CPU runs at 4 GHz and another at 3 GHz: can you say the first is faster? Justify using two factors from this unit.","2. Ejecuta operaciones aritméticas y lógicas":"2. Performs arithmetic and logical operations","ALU":"ALU","Unidad de control":"Control unit","RAM":"RAM","3. Coordina la ejecución de instrucciones":"3. Coordinates instruction execution","SSD":"SSD","4. Ordena de mayor a menor rapidez típica":"4. Order from typically fastest to slowest","RAM → registros → SSD → caché":"RAM → registers → SSD → cache","Registros → caché → RAM → SSD":"Registers → cache → RAM → SSD","SSD → RAM → caché → registros":"SSD → RAM → cache → registers","5. ¿Qué pasa al cortar la alimentación?":"5. What happens when power is cut?","La RAM conserva todos los cambios":"RAM retains all changes","La RAM pierde su contenido; el SSD lo conserva":"RAM loses its contents; the SSD retains them","La caché guarda automáticamente el documento":"The cache automatically saves the document","6. Un documento se editó en RAM, pero no se guardó: explica qué podría perderse al apagar el equipo.":"6. A document was edited in RAM but not saved: explain what could be lost when the computer shuts down.","Distingue frecuencia, rendimiento y función. Piensa qué memorias son volátiles y cuáles conservan los datos.":"Distinguish frequency, performance and function. Consider which memories are volatile and which retain data.","B. Dirección, contenido y orden":"B. Address, content and command","En un modelo didáctico, la CPU lee la dirección 20 y recibe el valor 7. Después calcula la capacidad de una memoria con ":"In a teaching model, the CPU reads address 20 and receives the value 7. Then calculate the capacity of a memory with ","12 bits de dirección":"12 address bits"," y ":" and ","1 byte por posición":"1 byte per location",".":".","1. Transporta la dirección 20":"1. Carries address 20","Bus de datos":"Data bus","Bus de direcciones":"Address bus","Bus de control":"Control bus","2. Transporta el valor 7":"2. Carries the value 7","3. Lleva la orden de lectura":"3. Carries the read command","4. Potencia para calcular posiciones y operación para obtener bytes":"4. Power for calculating locations and operation for obtaining bytes","5. Número de posiciones":"5. Number of locations","6. Capacidad en bytes":"6. Capacity in bytes","7. Capacidad en KiB":"7. Capacity in KiB","Con n bits se pueden identificar 2ⁿ posiciones. Multiplica por los bytes de cada posición; 1 KiB = 1024 bytes.":"With n bits you can identify 2ⁿ locations. Multiply by the bytes per location; 1 KiB = 1024 bytes.","5 minutos":"5 minutes","El ciclo de instrucción":"The instruction cycle","Ordena las fases y sigue los cambios de los registros.":"Order the phases and track changes to the registers.","Sigue una instrucción de principio a fin":"Follow an instruction from beginning to end","Modelo simplificado: el ":"Simplified model: ","PC vale 20":"PC is 20"," y allí está la instrucción ":" and that location holds the instruction ","«sumar 5 al registro R»":"“add 5 to register R”",". R contiene 7. La siguiente instrucción está en la dirección 21 y no hay saltos.":". R contains 7. The next instruction is at address 21 and there are no jumps.","1. Primera fase":"1. First phase","Buscar la instrucción":"Fetch the instruction","Decodificar la operación":"Decode the operation","Ejecutar y guardar el resultado":"Execute and store the result","2. Segunda fase":"2. Second phase","3. Tercera fase":"3. Third phase","4. Registro que recibe la instrucción":"4. Register that receives the instruction","PC":"PC","IR":"IR","R":"R","5. PC tras avanzar a la siguiente instrucción":"5. PC after advancing to the next instruction","6. Valor final de R":"6. Final value of R","7. Describe qué hacen la UC y la ALU en este ejemplo y dónde queda el resultado.":"7. Describe what the control unit and ALU do in this labple and where the result is stored.","El PC indica dónde buscar; el IR conserva la instrucción actual. La UC interpreta y coordina; la ALU realiza la suma.":"PC indicates where to fetch; IR holds the current instruction. The control unit interprets and coordinates; the ALU performs the addition.","7 minutos":"7 minutes","Tipos de software":"Types of software","Clasifica herramientas y justifica tus decisiones.":"Classify tools and justify your decisions.","Cada necesidad, su herramienta":"A tool for each need","1. Sistema operativo":"1. Operating system","Software de sistema":"System software","Software de programación":"Programming software","Software de aplicación":"Application software","2. Depurador de programas":"2. Program debugger","3. Aplicación de facturación":"3. Billing application","4. Gestionar contactos y seguimientos de clientes":"4. Manage customer contacts and follow-ups","CRM":"CRM","ERP":"ERP","DSS":"DSS","5. Integrar ventas, inventario y facturas":"5. Integrate sales, inventory and invoices","6. Comparar escenarios de compra de existencias":"6. Compare inventory purchasing scenarios","7. Un programa sin coste prohíbe modificarlo y redistribuirlo":"7. A free-of-charge program prohibits modification and redistribution","Gratuito y libre":"Free of charge and free software","Gratuito y propietario":"Free of charge and proprietary","Libre y necesariamente de pago":"Free software and necessarily paid","8. Una tienda quiere un programa a medida. ¿Qué alternativa estudiarías primero y cuándo justificarías desarrollarlo?":"8. A shop wants custom software. Which alternative would you examine first, and when would you justify developing it?","9. Explica por qué compilar sin errores no demuestra que un programa calcule bien un descuento.":"9. Explain why compiling without errors does not prove that a program calculates a discount correctly.","Separa función, licencia y precio. Un ERP puede incluir funciones de CRM. Los programas compilados también necesitan pruebas.":"Separate function, licence and price. An ERP may include CRM features. Compiled programs also need testing."};
const workbookNodes=[];
document.querySelectorAll('#cuaderno option').forEach(option=>{option.value=option.value;});
const walker=document.createTreeWalker($('cuaderno'),NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
 const node=walker.currentNode;
 if(Object.prototype.hasOwnProperty.call(workbookTranslations,node.data))workbookNodes.push([node,node.data]);
}
function translateWorkbook(){
 for(const [node,original]of workbookNodes)node.data=language==='en'?workbookTranslations[original]:original;
 $('progress').setAttribute('aria-label',language==='en'?'Completed blocks':'Bloques completos');
}
function encodeLegacyReport(text){let binary='';for(const b of new TextEncoder().encode(text))binary+=String.fromCharCode(b);return btoa(binary);}


const variants=window.SSIIParameters;
let parameters=variants.sanitize(variants.defaults),parameterLocks={},randomized=false;
function applyParameters(){
 const derived=variants.derive(parameters),idx=language==='en'?1:0;
 for(const f of fields)if(Object.prototype.hasOwnProperty.call(derived.answers,f.id))f.answer=derived.answers[f.id];
 for(const [key,strings]of Object.entries(derived.prompts))$('variant-'+key).textContent=strings[idx];
 for(const [id,strings]of Object.entries(derived.labels))$('variant-label-'+id).textContent=strings[idx];
 $('variant-dividend').textContent=derived.firstDividend+' ÷ 2';
}
function lockStartedParameters(values){
 for(const [key,group]of Object.entries(variants.groups)){
   if(group.some(id=>(values?values[id]:$(id).value)?.trim()))parameterLocks[key]=true;
 }
}
function refreshPendingParameters(){
 lockStartedParameters();
 let changed=0;
 for(const [key,group]of Object.entries(variants.groups)){
   if(parameterLocks[key])continue;
   parameters[key]=variants.create(key,parameters[key]);changed++;
   for(const id of group){const f=fields.find(f=>f.id===id);clearFeedback(f);checked[f.section]=false;$('status-'+f.section).textContent='';}
 }
 randomized=true;applyParameters();progress();
 return changed;
}

const texts={
step:['Antes de empezar','Before you begin'],
procedure:['Procedimiento del laboratorio','Exam procedure'],
 instructions:["Este laboratorio práctico contiene medidas de seguridad para garantizar su correcta realización. Los intentos de utilización de IA, copia, plugins,etc son registrados y penalizados.","This practical lab includes security measures to ensure it is completed correctly. Attempts to use AI, copy, use plugins, etc. are recorded and penalized."],
rules:['Mantén la página visible, con foco y en pantalla completa. Las dos primeras salidas generan avisos; la tercera borra las respuestas y reinicia el proceso. Copiar, cortar, pegar, arrastrar, Control y el botón derecho están bloqueados durante el laboratorio.','Keep this page visible, focused and in fullscreen. The first two departures trigger warnings; the third deletes your answers and restarts the process. Copy, cut, paste, drag, Control shortcuts and right-click are blocked during the lab.'],
privacy:['El intento y el tiempo se guardan en este navegador. Al entregar, el código contiene tu nombre, correo, respuestas y registro de incidencias y se pasa al formulario indicado por el profesor. Los controles son disuasorios; una incidencia no demuestra copia.','Your attempt and elapsed time are saved in this browser. On delivery, the code contains your name, email, answers and incident log and is passed to the teacher’s form. These controls are deterrents; an incident does not prove cheating.'],
terms:['He leído y acepto el procedimiento y las condiciones.','I have read and accept the procedure and conditions.'],
name:['Nombre y apellidos','Full name'],email:['Correo del centro','School email'],domain:['Solo se admite el dominio @g.educaand.es.','Only the @g.educaand.es domain is accepted.'],
back:['Cambiar idioma','Change language'],retrySave:['Reintentar guardado','Retry saving'],eventLog:['Registro del intento','Attempt log'],
yourExam:['Tu examen','Your exam'],elapsed:['Tiempo transcurrido','Elapsed time'],goDelivery:['Ir a la entrega ↓','Go to submission ↓'],
scenario:['El supuesto','The scenario'],
scenarioText:['El navegador web realiza una petición GET contra la IP 127.0.0.1. El servidor web contiene el siguiente fichero index.html en su directorio raíz:','The browser makes a GET request to IP address 127.0.0.1. The web server contains the following index.html file in its root directory:'],
written:['Responde las cuestiones sobre DevTools por escrito. No abras herramientas ni abandones esta página durante el intento.','Answer the DevTools questions in writing. Do not open tools or leave this page during the attempt.'],
question:['Pregunta','Question'],finishTitle:['Generar entrega','Generate submission'],
finishInfo:['Revisa tus respuestas. Al confirmar, se cerrará la edición, se copiará el código y se abrirá el formulario de entrega. Puedes finalizar con preguntas sin responder.','Review your answers. Confirmation closes editing, copies the code and opens the submission form. You may finish with unanswered questions.'],
notes:['Observaciones (opcional)','Comments (optional)'],generate:['Generar entrega','Generate submission'],
deliveryTitle:['Tu entrega está preparada','Your submission is ready'],copyOpen:['Copiar código y abrir Google Forms','Copy code and open Google Forms'],
deliveryNote:['La entrega solo se registra cuando pulsas Enviar en Google Forms. Si el código es demasiado largo para el enlace, pégalo en el campo del contenido.','Your submission is only recorded when you click Submit in Google Forms. If the code is too long for the link, paste it into the content field.'],
recover:['Volver a copiar y abrir la última entrega','Copy and open the last submission again'],
cancel:['Cancelar','Cancel'],confirm:['Confirmar y generar entrega','Confirm and generate submission'],
start:['Aceptar e iniciar en pantalla completa','Start in fullscreen'],
identityError:['Introduce tu nombre y un correo válido terminado exactamente en @g.educaand.es.','Enter your name and a valid email ending exactly in @g.educaand.es.'],
ready:['Pendiente de comenzar','Ready to start'],active:['En curso','In progress'],blocked:['Respuestas bloqueadas · reloj en marcha','Answers locked · timer running'],
submitted:['Intento finalizado','Attempt finished'],reset:['Intento invalidado','Attempt invalidated'],
saved:['Respuestas guardadas: ','Answers saved: '],saveReady:['Guardado local preparado.','Local saving ready.'],
saveError:['Guardado bloqueado. Revisa el aviso superior.','Saving blocked. Check the warning above.'],
answered:['Respuesta escrita','Answer entered'],unanswered:['Sin responder','Not answered'],
progress:[' de 14 preguntas respondidas.',' of 14 questions answered.'],chars:[' caracteres',' characters'],
first:['Primer aviso','First warning'],last:['Último aviso','Final warning'],resetTitle:['Intento reiniciado','Attempt reset'],resume:['Reanudar el intento','Resume attempt'],
firstText:['El laboratorio perdió visibilidad, foco o pantalla completa. Las respuestas se conservan. A la tercera incidencia se vaciarán.','The lab lost visibility, focus or fullscreen. Your answers are retained. The third incident deletes them.'],
lastText:['Segunda incidencia. La próxima salida borrará las respuestas y reiniciará el proceso.','Second incident. The next departure will delete your answers and restart the process.'],
resetText:['Tercera incidencia. Se han borrado las respuestas. Volverás a elegir idioma y a identificarte.','Third incident. Your answers have been deleted. You will choose a language and enter your details again.'],
resumeText:['Se han recuperado las respuestas y el contador. El reloj sigue contando. Recupera la pantalla completa para continuar.','Your answers and incident count have been restored. The timer is still running. Return to fullscreen to continue.'],
continue:['Continuar en pantalla completa','Continue in fullscreen'],understood:['Volver al inicio','Return to start'],
confirmTitle:['¿Generar la entrega y finalizar?','Generate submission and finish?'],
confirmBody:['Las respuestas quedarán bloqueadas. Se copiará el código y se abrirá Google Forms con tus datos. Debes pulsar Enviar en el formulario. Después, este laboratorio volverá al selector de idioma.','Your answers will be locked. The code will be copied and Google Forms will open with your details. You must click Submit in the form. This lab will then return to language selection.'],
copying:['Copiando código y preparando Google Forms…','Copying code and preparing Google Forms…'],
clipboardError:['El navegador no permitió copiar. Permite el portapapeles y pulsa de nuevo «Copiar código y abrir Google Forms». La entrega sigue guardada.','The browser did not allow copying. Allow clipboard access and click “Copy code and open Google Forms” again. Your submission is still saved.'],
popupError:['El código está copiado, pero el navegador bloqueó la nueva pestaña. Permite las ventanas emergentes y vuelve a pulsar el botón.','The code was copied, but the browser blocked the new tab. Allow pop-ups and click the button again.'],
recovery:['Última entrega preparada. Puedes volver a abrirla si todavía no la has enviado en Google Forms.','Last submission prepared. You can reopen it if you have not submitted it in Google Forms yet.'],
longCode:['El código es demasiado largo para el enlace. Ya está copiado: pégalo en el campo de contenido de Google Forms y pulsa Enviar.','The code is too long for the link. It has been copied: paste it into the content field in Google Forms and click Submit.'],
longContinue:['Continuar al formulario','Continue to the form'],
genericError:['No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.','The report could not be generated. Your attempt has not been finalized; check your details and try again.']
};
const tr=k=>texts[k]?.[language==='en'?1:0]??k;
texts.rules=['Este laboratorio está protegido con diversas medidas de seguridad. Mantén la página visible, con foco y en pantalla completa. No utilices atajos de teclado ni intentes abrir plugins, devtools o cambiar de ventana o se cerrará el laboratorio automáticamente.','Keep this page visible, focused and in fullscreen. Don\'t use keyboard shortcuts neither plugings, devtools or change the window or the lab will auto finish.'];
texts.finishInfo=['Al finalizar el laboratorio, se descargará una copia codificada y se pasará otra al formulario de entrega.','At the end of the lab, it will download a cypher copy automatically and other will pass to the form'];
texts.confirmBody=['Las respuestas quedarán bloqueadas. Se descargará un TXT con el código comprimido y se copiará el mismo código para Google Forms. Debes pulsar Enviar en el formulario. Después, este laboratorio volverá al selector de idioma.','Your answers will be locked. A TXT file containing the compressed code will download, and the same code will be copied for Google Forms. You must click Submit in the form. This lab will then return to language selection.'];
texts.deliveryNote=['Conserva el TXT como copia de la entrega generada. La entrega solo se registra cuando pulsas Enviar en Google Forms. Si el código es demasiado largo para el enlace, pégalo en el campo del contenido.','Keep the TXT as a copy of your generated submission. Your submission is only recorded when you click Submit in Google Forms. If the code is too long for the link, paste it into the content field.'];
texts.receipt=['Descargar comprobante TXT','Download TXT receipt'];
texts.receiptRequested=['Descarga del comprobante solicitada. Si no aparece, pulsa «Descargar comprobante TXT».','Receipt download requested. If it does not appear, click “Download TXT receipt”.'];
texts.receiptError=['No se pudo iniciar la descarga. La entrega sigue guardada; vuelve a descargar el comprobante.','The download could not be started. Your submission is still saved; download the receipt again.'];
texts.compressionError=['Este navegador no permite comprimir la entrega. Actualízalo o consulta al profesor. El intento no se ha finalizado.','This browser cannot compress the submission. Update it or contact your teacher. The attempt has not been finalized.'];
texts.rules=['Mantén la página visible, con foco y en pantalla completa. Las dos primeras salidas generan avisos. La tercera cierra el intento y genera una entrega con tus respuestas actuales, sin borrarlas. Se bloquean y registran las teclas de función, Control, botón derecho, copiar, cortar, pegar y arrastrar, cuando el navegador permite detectarlos. Estos usos no suman avisos de salida.','Keep this page visible, focused and in fullscreen. The first two departures trigger warnings. The third closes the attempt and generates a submission with your current answers, without deleting them. Function keys, Control, right-click, copy, cut, paste and drag actions are blocked and logged when the browser allows detection. These actions do not add departure warnings.'];
texts.firstText=['Primer aviso. Tus respuestas se conservan. La tercera incidencia cerrará el intento y generará una entrega con el contenido actual.','First warning. Your answers are retained. The third incident will close the attempt and generate a submission with your current answers.'];
texts.lastText=['Segundo aviso. La próxima incidencia cerrará el intento y generará automáticamente una entrega con tus respuestas actuales.','Second warning. The next incident will close the attempt and automatically generate a submission with your current answers.'];
texts.closing=['Cierre automático: respuestas conservadas','Automatic closure: answers retained'];
texts.forcedPending=['Se ha alcanzado el tercer aviso. Se está generando la entrega con tus respuestas conservadas.','The third warning has been reached. Your submission is being generated with your answers retained.'];
texts.forcedError=['No se pudo generar la entrega automática. Tus respuestas siguen guardadas y bloqueadas. Pulsa Reintentar entrega.','The automatic submission could not be generated. Your answers remain saved and locked. Click Retry submission.'];
texts.forcedRetry=['Reintentar entrega','Retry submission'];
texts.auditInfo=['Se registran el tipo de acción bloqueada, su fecha y hora y el número de usos. No se registran la escritura normal ni el contenido del portapapeles.','The type, timestamp and count of blocked actions are logged. Ordinary typing and clipboard contents are not recorded.'];
texts.privacy=texts.privacy.map((text,i)=>text+' '+texts.auditInfo[i]);

Object.assign(texts,{
 procedure:['Procedimiento del laboratorio','Lab procedure'],
 instructions:["Este laboratorio práctico contiene medidas de seguridad para garantizar su correcta realización. Los intentos de utilización de IA, copia, plugins,etc son registrados y penalizados.","This practical lab includes security measures to ensure it is completed correctly. Attempts to use AI, copy, use plugins, etc. are recorded and penalized."],
 yourExam:['Tu laboratorio','Your lab'],
 missing:['Falta este paso.','This step is missing.'],
 review:['Registrado: pendiente de revisión del profesor.','Recorded: awaiting teacher review.'],
 correct:['✓ Correcto.','✓ Correct.'],
 groups:['Revisa cada grupo y sepáralos con espacios.','Check each group and separate them with spaces.'],
 wrong:['Revisa este paso: el resultado no coincide.','Check this step: the result does not match.'],
 changed:['Has cambiado respuestas: vuelve a comprobar este bloque.','Answers changed: check this block again.'],
 blocks:[' de 7 bloques comprobados y completos. Las explicaciones requieren revisión.',' of 7 blocks checked and complete. Explanations require review.'],
 hits:['respuestas cerradas correctas','correct closed answers'],errors:['por corregir','to correct'],
 pendingSteps:['pasos pendientes','missing steps'],explanations:['explicaciones para revisión','explanations for review']
});


Object.assign(texts,{
 savePractice:['Guardar y pausar','Save and pause'],recoverPractice:['Recuperar práctica','Recover practice'],
 paused:['Práctica guardada y pausada','Practice saved and paused'],
 resume:['Recuperar práctica guardada','Recover saved practice'],
 resumeText:['Recuperar añade una incidencia al mismo contador que las pérdidas de foco. La tercera incidencia cierra el intento conservando tus respuestas.','Recovery adds one incident to the same counter as focus losses. The third incident closes the attempt while retaining your answers.'],
 resumeAction:['Recuperar (+1 incidencia)','Recover (+1 incident)'],
 saveNote:['Se guarda en este navegador y perfil. Guardar pausa el reloj; recuperar consume un aviso. Al tercero se cierra el intento.','Saved in this browser and profile. Saving pauses the timer; recovery consumes one warning. The third closes the attempt.'],
 pausedNote:['Guardado: puedes cerrar y continuar otro día en este navegador y perfil. Recuperar suma 1 incidencia; al llegar a 3 se genera la entrega.','Saved: you may close and continue another day in this browser and profile. Recovery adds 1 incident; reaching 3 generates the submission.'],
 recoverFinal:['Recuperar (+1: finalizará)','Recover (+1: will finish)'],
 restoreNote:['Intento guardado encontrado. Recuperar suma 1 incidencia y restaura exactamente los datos guardados.','Saved attempt found. Recovery adds 1 incident and restores the saved values exactly.']
});
texts.rules=texts.rules.map((s,i)=>s+(i?' Recovering a saved attempt also adds one incident.':' Recuperar un intento guardado también suma una incidencia.'));

for(const [id,anchor]of [['receipt-download','delivery-retry'],['recovery-download','recover-delivery']]){
 const button=document.createElement('button');button.id=id;button.type='button';button.className='secondary';button.dataset.text='receipt';$(anchor).after(button);
 button.addEventListener('click',()=>downloadReceipt(guard.canDownloadReport()?rememberDelivery($('report').value):lastDelivery));
}
const receiptStatus=document.createElement('p');receiptStatus.id='receipt-status';receiptStatus.setAttribute('role','status');$('receipt-download').after(receiptStatus);
function setLanguage(lang){
 language=lang;document.documentElement.lang=lang||'es';
 document.title=language==='en'?'SSII review · Unit 01':'Repaso SSII · Unidad 01';
 document.querySelector('.topline').textContent=document.title;
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=tr(el.dataset.text));
 $('delivery-retry').textContent=tr('copyOpen');
 translateWorkbook();
 applyParameters();
 progress();
}
function validIdentity(){
 const email=$('student').value.trim();
 return !!$('fullname').value.trim() && $('student').validity.valid && /^[^\s@]+@g\.educaand\.es$/i.test(email);
}
function canStart(){return !!language&&$('guard-consent').checked&&validIdentity();}
function timeSpent(at=Date.now()){return elapsed+(started===null?0:Math.max(0,at-started));}
function clock(){const sec=Math.floor(timeSpent()/1000);$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function startClock(){if(!randomized)refreshPendingParameters();if(started===null)started=Date.now();clock();}
function stopClock(at=Date.now()){elapsed=timeSpent(at);started=null;clock();}
function numeric(v){const s=v.trim().replace(',','.');return /^\d+(\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;}
function normalized(v){return v.trim().toUpperCase().replace(/\s+/g,' ');}
function correct(f){const v=$(f.id).value;if(!v.trim())return false;if(f.kind==='open')return null;if(f.kind==='number'){const n=numeric(v);return n!==null&&Math.abs(n-f.answer)<1e-8;}return normalized(v)===normalized(String(f.answer));}
function hasAnswer(f){return !!$(f.id).value.trim();}
function complete(s){return fields.filter(f=>f.section===s.id).every(f=>f.kind==='open'?hasAnswer(f):correct(f));}
function progress(){const n=sections.filter(s=>checked[s.id]&&complete(s)).length;$('progress').value=n;$('progressText').textContent=`${n}${tr('blocks')}`;}
let reportRevision=0;
function invalidate(){reportRevision++;if($('report').value){$('report').value='';$('download').disabled=true;$('reportStatus').textContent=tr('changed');}}
function clearFeedback(f){const el=$(f.id);el.removeAttribute('aria-invalid');el.closest('.field').classList.remove('correct','wrong');$('feedback-'+f.id).textContent='';}
function check(id,focus=false){let ok=0,bad=0,missing=0,open=0;const list=fields.filter(f=>f.section===id);for(const f of list){clearFeedback(f);const el=$(f.id),out=$('feedback-'+f.id);if(!hasAnswer(f)){out.textContent=tr('missing');missing++;if(f.kind!=='open')el.setAttribute('aria-invalid','true');}else if(f.kind==='open'){out.textContent=tr('review');open++;}else if(correct(f)){out.textContent=tr('correct');el.closest('.field').classList.add('correct');ok++;}else{out.textContent=f.kind==='groups'?tr('groups'):tr('wrong');el.setAttribute('aria-invalid','true');el.closest('.field').classList.add('wrong');bad++;}}
 checked[id]=true;$('status-'+id).textContent=`${ok} ${tr('hits')} · ${bad} ${tr('errors')} · ${missing} ${tr('pendingSteps')} · ${open} ${tr('explanations')}`;progress();if(focus&&missing+bad){const f=list.find(f=>!hasAnswer(f)||(f.kind!=='open'&&!correct(f)));$(f.id).focus();}}

async function encodeReport(text){
 const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return 'SSII3G.'+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function empty() { return { values: Object.fromEntries(ids.map(id=>[id,''])), checked:{}, hints:{}, elapsed:0, started:null, report:'', parameters:variants.sanitize(variants.defaults),parameterLocks:{},randomized:false,language:null,reportEncoding:'gzip-base64url' }; }
function sanitize(data) {
  if(!data || typeof data!=='object' || !data.values || typeof data.values!=='object' || Array.isArray(data.values)) throw new Error('Borrador inválido');
  const out=empty();
  out.parameters=data.parameters===undefined?variants.sanitize(variants.defaults):variants.sanitize(data.parameters);
  out.randomized=data.parameters===undefined?true:data.randomized===true;
  if(data.parameterLocks!==undefined&&(!data.parameterLocks||typeof data.parameterLocks!=='object'||Array.isArray(data.parameterLocks)))throw Error('Invalid parameter locks');
  for(const id of ids) {
    const el=$(id), v=data.values[id];
    if(v!==undefined && typeof v!=='string') throw new Error('Campo inválido: '+id);
    out.values[id]=(v||'').slice(0,el.maxLength>0?el.maxLength:2400);
    if(el.tagName==='SELECT' && ![...el.options].some(o=>o.value===out.values[id])) out.values[id]='';
  }
  for(const [key,group]of Object.entries(variants.groups))out.parameterLocks[key]=data.parameterLocks?.[key]===true||group.some(id=>out.values[id].trim());
  for(const sec of sections) out.checked[sec.id]=data.checked?.[sec.id]===true;
  hintNodes.forEach((_,i)=>{if(data.hints?.[i]===true)out.hints[i]=true;});
  out.elapsed=Number.isFinite(data.elapsed)&&data.elapsed>=0?Math.min(data.elapsed,31536000000):0;
  out.started=Number.isFinite(data.started)&&data.started>0&&data.started<=Date.now()?data.started:null;
  const report=typeof data.report==='string'?data.report:'';
  if(report.length>2000000)throw new Error('Informe demasiado largo');
  if(data.reportEncoding!==undefined&&!['base64','gzip-base64url'].includes(data.reportEncoding))throw new Error('Formato de informe no válido');
  // Los informes anteriores se convierten una sola vez al cargar el guardado.
  out.report=data.reportEncoding?report:encodeLegacyReport(report);
  if(data.language!=null&&!['es','en'].includes(data.language))throw Error('Invalid language');
  out.language=data.language||null;out.reportEncoding=data.reportEncoding||'base64';
  return out;
}
function snapshot() {
  lockStartedParameters();
  return {values:Object.fromEntries(ids.map(id=>[id,$(id).value])),checked:{...checked},hints:{...hints},parameters:variants.sanitize(parameters),parameterLocks:{...parameterLocks},randomized,elapsed,started,language,report:$('report').value,reportEncoding:$('report').value.startsWith('SSII3G.')?'gzip-base64url':'base64'};
}

function restore(data) {
  parameters=variants.sanitize(data.parameters||variants.defaults);parameterLocks={...data.parameterLocks};randomized=data.randomized===true;
  for(const id of ids) $(id).value=data.values[id]||'';
  checked={...data.checked};hints={...data.hints};elapsed=data.elapsed;started=data.started??null;
  setLanguage(data.language||null);
  fields.forEach(clearFeedback);
  sections.forEach(s=>{$('status-'+s.id).textContent='';if(checked[s.id])check(s.id);});
  hintNodes.forEach(d=>d.open=false);
  $('report').value=data.report||'';$('download').disabled=true;$('reportStatus').textContent='';
  reportRevision++;clock();progress();
}
function setEnabled(enabled) {
  $('answer-fields').disabled=!enabled;$('reflection-fields').disabled=!enabled;
  document.querySelectorAll('[data-check]').forEach(b=>b.disabled=!enabled);
}
function setReport(report){$('report').value=report;}
function afterRender(state,ctx){
 phase=state.phase;
 const paused=phase==='paused',needsRecovery=paused||ctx.restoring;
 const active=phase==='active',submitted=phase==='submitted'||phase==='closing';
 $('language-stage').hidden=!!language||active||submitted;
 $('setup-stage').hidden=!language||submitted||recoveryMode;
 $('guard-panel').hidden=!language||submitted;$('guard-panel').inert=!language;
 document.querySelector('.setup-only').hidden=active||paused||phase==='reset';
 $('active-status').hidden=!active&&!paused&&phase!=='reset';
 $('event-details').hidden=!active&&phase!=='reset';
 $('cuaderno').hidden=!active||needsRecovery;$('cuaderno').inert=!active||needsRecovery;
 $('delivery-stage').hidden=!submitted&&!recoveryMode;
 if(phase==='closing'){
   if(!$('delivery-status').textContent)$('delivery-status').textContent=tr('forcedPending');
   $('delivery-retry').textContent=tr('forcedRetry');
   $('delivery-retry').disabled=!!ctx.forcedBusy;
 } else if(phase==='submitted'&&!pendingURL){$('delivery-retry').textContent=tr('copyOpen');$('delivery-retry').disabled=delivering;}
 $('receipt-download').disabled=phase==='closing';
 $('download').hidden=true;
 document.querySelector('.identity').hidden=!$('guard-consent').checked;
 $('fullname').disabled=active||paused||submitted;$('student').disabled=active||paused||submitted;
 $('guard-start').textContent=tr('start');
 $('guard-state').textContent=tr(active?($('answer-fields').disabled?'blocked':'active'):phase);
 $('guard-count').textContent=(language==='en'?'Incidents: ':'Incidencias: ')+state.count+'/3';
 $('guard-conditions').textContent=(language==='en'?'Fullscreen: ':'Pantalla completa: ')+(document.fullscreenElement?'✓':'—')+' · '+(language==='en'?'Focus: ':'Foco: ')+(document.hasFocus()?'✓':'—')+' · '+(language==='en'?'Visible: ':'Visible: ')+(document.visibilityState==='visible'?'✓':'—');
 $('saveStatus').textContent=ctx.problem?tr('saveError'):state.savedAt?tr('saved')+new Date(state.savedAt).toLocaleTimeString(language==='en'?'en-GB':'es-ES'):tr('saveReady');
 $('identity-error').textContent=$('guard-consent').checked&&($('student').value||$('fullname').value)&&!validIdentity()?tr('identityError'):'';
 if(state.pending){
 const k=state.pending;
 $('guard-warning-title').textContent=tr(k==='reset'?'resetTitle':k);
 $('guard-warning-text').textContent=tr(k+'Text');
 $('guard-warning-count').textContent=$('guard-count').textContent;
 $('guard-continue').textContent=tr(ctx.restoring?'resumeAction':active?'continue':'understood');
 }
 if(language==='en')translateErrors();
 if(language==='en')for(const el of $('guard-log').children)el.textContent=el.textContent
   .replace(/Comienzo del intento (\d+)\. Normas aceptadas\./g,'Attempt $1 started. Terms accepted.')
   .replaceAll('Intento reanudado en pantalla completa.','Attempt resumed in fullscreen.')
   .replaceAll('Práctica guardada y pausada; recuperar consumirá una incidencia.','Practice saved and paused; recovery will consume one incident.')
   .replaceAll('Recuperación guardada: incidencia ','Saved recovery: incident ')
   .replaceAll('Datos renovados en ejercicios sin empezar: ','Values renewed in untouched exercises: ')
   .replaceAll('Respuestas vaciadas; intento detenido.','Answers cleared; attempt stopped.')
   .replaceAll('Intento finalizado. Exportación del informe habilitada.','Attempt finished. Report delivery enabled.')
   .replaceAll('Incidencia ','Incident ').replaceAll('Mismo episodio: ','Same episode: ')
   .replaceAll('(sin sumar otra incidencia).','(no additional incident).')
   .replaceAll('página oculta','page hidden').replaceAll('pérdida de foco','focus lost')
   .replaceAll('salida de pantalla completa','fullscreen exited').replaceAll('recarga o cierre','reload or close');
 $('recovery').hidden=!language||active||submitted||recoveryMode||!lastDelivery;
 $('recovery-message').textContent=tr('recovery');

 $('practice-save').disabled=!active||ctx.restoring||!!ctx.problem||ctx.busy||$('answer-fields').disabled;
 $('practice-recover').disabled=!needsRecovery||!!ctx.problem||ctx.busy||!ctx.supported;
 $('practice-recover').textContent=tr(state.count===2?'recoverFinal':'recoverPractice');
 $('toolbar-count').textContent=(language==='en'?'Incidents / recoveries: ':'Incidencias / recuperaciones: ')+state.count+'/3';
 $('toolbar-status').textContent=ctx.problem?$('guard-problem-text').textContent:tr(paused?'pausedNote':ctx.restoring?'restoreNote':'saveNote');

}
const errorTranslations={
'El guardado no es válido. No se ha sobrescrito: avisa al profesor.':'The saved data is invalid. It has not been overwritten; contact your teacher.',
'El navegador no permite acceder al guardado local.':'The browser does not allow access to local storage.',
'El borrador anterior está dañado. No se ha modificado: avisa al profesor.':'The previous draft is damaged. It has not been changed; contact your teacher.',
'El borrador cambió en otra pestaña. Esta copia se ha bloqueado para no sobrescribirlo. Cierra las copias adicionales y recarga.':'The draft changed in another tab. This copy is locked to prevent overwriting it. Close duplicate tabs and reload.',
'No se pudo guardar. Los cambios actuales siguen en memoria. No cierres la página; avisa al profesor y reintenta el guardado.':'Saving failed. Your current changes are still in memory. Do not close the page; contact your teacher and retry saving.',
'Este navegador no ofrece las funciones necesarias. Abre la página directamente en un navegador de escritorio compatible con pantalla completa.':'This browser lacks required features. Open the page directly in a desktop browser with fullscreen support.',
'Otra pestaña modificó o borró este intento. Esta copia está bloqueada. Cierra las copias adicionales y recarga.':'Another tab changed or deleted this attempt. This copy is locked. Close duplicate tabs and reload.',
'No se puede leer el guardado.':'The saved data cannot be read.',
'No se pudo activar pantalla completa. Regresa a la página y vuelve a intentarlo.':'Fullscreen could not be activated. Return to the page and try again.',
'Falta pantalla completa, foco o visibilidad. Regresa y vuelve a pulsar el botón.':'Fullscreen, focus or visibility is missing. Return and click the button again.',
'No se pudo activar pantalla completa.':'Fullscreen could not be activated.',
'Se produjo un error de JavaScript. El laboratorio está bloqueado. No borres los datos: avisa al profesor. El último guardado correcto se conserva.':'A JavaScript error occurred. The lab is locked. Do not delete any data; contact your teacher. The last successful save is retained.',
'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.':texts.genericError[1]
};
function translateErrors(){for(const id of ['guard-problem-text','guard-action-status','guard-warning-error','guard-boot-detail','reportStatus']){const el=$(id);if(errorTranslations[el.textContent])el.textContent=errorTranslations[el.textContent];}}
function confirmText(kind){if(kind==='finish'){$('guard-confirm-title').textContent=tr('confirmTitle');$('guard-confirm-text').textContent=tr('confirmBody');}}
async function makeReport(metadata,final,finishedAt=Date.now(),context={}){
 if(!validIdentity()){$('reportStatus').textContent=tr('identityError');return null;}
 // Compact, versioned report avoids repeating the public question text in a prefilled URL.
 if(typeof CompressionStream!=='function'){$('reportStatus').textContent=tr('compressionError');return null;}
 const data={exam:'SSII-UD01',version:3,language,name:$('fullname').value.trim(),email:$('student').value.trim().toLowerCase(),finishedAt:new Date(finishedAt).toISOString(),seconds:Math.floor(timeSpent(finishedAt)/1000),presentationOrder:fields.map(f=>f.id),answers:fields.map((f,i)=>({question:f.id,answer:$(f.id).value.trim(),status:!hasAnswer(f)?'pending':f.kind==='open'?'teacher-review':correct(f)?'correct':'review'})),parameters:variants.sanitize(parameters),parameterLocks:{...parameterLocks},group:$('group').value.trim(),checked:{...checked},hints:{...hints},notes:$('reflection').value.trim().slice(0,2400),...context,audit:metadata,url:location.href};
 const body=JSON.stringify(data);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
 return encodeReport(body+'\nCódigo de comprobación: SSII3-'+hash);
}
function rememberDelivery(report){
 if(lastDelivery?.code===report)return lastDelivery;
 const item={code:report,name:$('fullname').value.trim(),language:language||'es'};
 lastDelivery=item;
 try{sessionStorage.setItem(RECOVERY,JSON.stringify(item));}catch{/* Current submitted state still preserves the report. */}
 return item;
}
function formURL(item){
 const url=new URL(FORM);url.searchParams.set('usp','pp_url');
 url.searchParams.set('entry.346661486',item.name);
 url.searchParams.set('entry.1438887233','Repaso SSII · Unidad 01');
 url.searchParams.set('entry.1197951345',item.code);
 const long=url.href.length>7000;
 if(long)url.searchParams.delete('entry.1197951345');
 return {url:url.href,long};
}
let pendingURL=null;
async function deliver(item,reset=true){
 if(delivering)return;
 delivering=true;$('delivery-retry').disabled=true;$('delivery-status').textContent=tr('copying');
 // Copy while this document is still focused. A blocked popup leaves the report intact.
 try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(item.code);
 }catch{
   $('delivery-status').textContent=tr('clipboardError');delivering=false;$('delivery-retry').disabled=false;return;
 }
 const dest=formURL(item);
 if(dest.long){
   pendingURL={url:dest.url,reset};
   $('delivery-status').textContent=tr('longCode');
   $('delivery-retry').textContent=tr('longContinue');
   delivering=false;$('delivery-retry').disabled=false;return;
 }
 const popup=window.open('about:blank','_blank');
 if(!popup){$('delivery-status').textContent=tr('popupError');delivering=false;$('delivery-retry').disabled=false;return;}
 popup.opener=null;
 popup.location.replace(dest.url);
 delivering=false;$('delivery-retry').disabled=false;
 if(reset)guard.resetProcess();else {recoveryMode=false;guard.render();}
}
const requestedReceipts=new Set();
function downloadReceipt(item){
 if(!item?.code)return false;
 let url;
 try{
  url=URL.createObjectURL(new Blob([item.code],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download='comprobante-ssii-u01-'+item.code.slice(-16).replace(/[^a-zA-Z0-9_-]/g,'')+'.txt';
  document.body.append(link);link.click();link.remove();
  requestedReceipts.add(item.code);
  $('receipt-status').textContent=tr('receiptRequested');
  return true;
 }catch{$('receipt-status').textContent=tr('receiptError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
function downloadReport(){
 const item=rememberDelivery($('report').value);
 if(!requestedReceipts.has(item.code)&&!downloadReceipt(item))return;
 return deliver(item);
}
function onReset(){recoveryMode=false;setLanguage(null);pendingURL=null;$('delivery-retry').textContent=tr('copyOpen');$('delivery-status').textContent='';window.scrollTo(0,0);}
$('delivery-retry').addEventListener('click',()=>{
 if(phase==='closing'){$('delivery-status').textContent=tr('forcedPending');void guard.finalizeForced();return;}
 if(pendingURL){
   const target=window.open('about:blank','_blank');
   if(!target){$('delivery-status').textContent=tr('popupError');return;}
   target.opener=null;target.location.replace(pendingURL.url);
   const reset=pendingURL.reset;pendingURL=null;
   if(reset)guard.resetProcess();else {recoveryMode=false;guard.render();}
   return;
 }
 if(guard.canDownloadReport())downloadReport();
 else if(lastDelivery)deliver(lastDelivery,false);
});
$('recover-delivery').addEventListener('click',()=>{
 if(!lastDelivery)return;
 recoveryMode=true;
 $('delivery-stage').hidden=false;$('setup-stage').hidden=true;$('recovery').hidden=true;
 deliver(lastDelivery,false);
});
for(const id of ['student','fullname'])$(id).addEventListener('input',()=>guard?.render());
$('guard-consent').addEventListener('change',()=>guard?.render());
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>{setLanguage(el.dataset.language);guard.render();window.scrollTo(0,0);}));
$('back-language').addEventListener('click',()=>{setLanguage(null);$('guard-consent').checked=false;guard.render();});

for(const f of fields) $(f.id).addEventListener('input',()=>{
 if(!guard.canEdit())return;
 clearFeedback(f);checked[f.section]=false;$('status-'+f.section).textContent=tr('changed');
 invalidate();progress();guard.saveEdit();
});
for(const id of ['group','reflection'])$(id).addEventListener('input',()=>{if(guard.canEdit()){invalidate();guard.saveEdit();}});
document.querySelectorAll('[data-check]').forEach(b=>b.addEventListener('click',()=>{
 if(!guard.canEdit())return;invalidate();check(b.dataset.check,true);guard.saveEdit();
}));
hintNodes.forEach((d,i)=>d.addEventListener('toggle',()=>{
 if(guard?.canEdit()&&d.open&&!hints[i]){hints[i]=true;invalidate();guard.saveEdit();}
}));
$('practice-save').addEventListener('click',()=>guard.pausePractice());
$('practice-recover').addEventListener('click',()=>guard.recoverPractice());
const syncToolbarHeight=()=>document.documentElement.style.setProperty('--toolbar-height',Math.ceil($('practice-toolbar').getBoundingClientRect().height)+'px');
if(typeof ResizeObserver==='function')new ResizeObserver(syncToolbarHeight).observe($('practice-toolbar'));
window.addEventListener('resize',syncToolbarHeight);
syncToolbarHeight();
$('lab').addEventListener('submit',e=>e.preventDefault());
setInterval(clock,1000);
try{const item=JSON.parse(sessionStorage.getItem(RECOVERY));if(item&&typeof item.code==='string'&&item.code.length<2000000&&typeof item.name==='string'&&['es','en'].includes(item.language))lastDelivery=item;}catch{}
setLanguage(null);
guard=window.createPracticeGuard({refreshPendingParameters,empty,sanitize,snapshot,restore,setEnabled,startClock,stopClock,downloadReport,makeReport,setReport,canStart,afterRender,confirmText,onReset,
forcedError(){$('delivery-status').textContent=tr('forcedError');},
isAnswer(el){return el instanceof HTMLElement&&ids.includes(el.id);},
restoreValue(el,data){el.value=data.values[el.id]||'';}
});
document.querySelectorAll('[data-language]').forEach(el=>el.disabled=false);
window.addEventListener('error',()=>{if(language==='en')translateErrors();});
window.addEventListener('unhandledrejection',()=>{if(language==='en')translateErrors();});
})();

