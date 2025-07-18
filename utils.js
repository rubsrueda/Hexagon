// utils.js
// Funciones de utilidad general.

function logMessage(msg) {
    // Siempre mostrar el mensaje en la consola
    console.log(msg);
    /*
    const logContainer = document.getElementById('gameLogContainer');
    if (!logContainer) {
        return; // No hacer nada si el contenedor no existe
    }

    // Crear un nuevo elemento para el mensaje
    const messageElement = document.createElement('div');
    messageElement.className = 'log-message';
    messageElement.textContent = msg;

    // Añadir el nuevo mensaje al contenedor
    logContainer.prepend(messageElement); // prepend() lo añade al principio

    // Limitar el número de mensajes en pantalla para no saturar
    while (logContainer.children.length > 10) {
        logContainer.removeChild(logContainer.lastChild);
    }
    */
}

function hexDistance(r1, c1, r2, c2) {
    // Convertir coordenadas de offset (r, c) a cúbicas (q, r, s)
    const q1 = c1 - (r1 - (r1 & 1)) / 2;
    const r_coord1 = r1;

    const q2 = c2 - (r2 - (r2 & 1)) / 2;
    const r_coord2 = r2;

    // La distancia en un sistema cúbico es la mitad de la "distancia de Manhattan" de las 3 coordenadas.
    const dq = Math.abs(q1 - q2);
    const dr = Math.abs(r_coord1 - r_coord2);
    const ds = Math.abs((-q1 - r_coord1) - (-q2 - r_coord2));

    return (dq + dr + ds) / 2;
}

function getHexNeighbors(r, c) {
    // --- NUEVA GUARDA DE SEGURIDAD ---
    // Si 'r' o 'c' no son números válidos, no podemos calcular vecinos.
    // Devolvemos un array vacío para que cualquier código que intente iterarlo no falle.
    if (typeof r !== 'number' || typeof c !== 'number' || isNaN(r) || isNaN(c)) {
        console.error(`getHexNeighbors fue llamado con coordenadas inválidas: r=${r}, c=${c}`);
        return []; 
    }
    // --- FIN DE LA GUARDA ---

    const neighbor_directions = [
        // Fila par
        [ {r: 0, c: +1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: 0, c: -1}, {r: +1, c: -1}, {r: +1, c: 0} ],
        // Fila impar
        [ {r: 0, c: +1}, {r: -1, c: +1}, {r: -1, c: 0}, {r: 0, c: -1}, {r: +1, c: 0}, {r: +1, c: +1} ]
    ];

    const directions = neighbor_directions[r % 2];
    const neighbors = [];

    for (const dir of directions) {
        neighbors.push({ r: r + dir.r, c: c + dir.c });
    }

    // Filtrar para asegurarse de que los vecinos están dentro de los límites del tablero
    return neighbors.filter(n =>
        board && board.length > 0 && n.r >= 0 && n.r < board.length &&
        board[0] && n.c >= 0 && n.c < board[0].length
    );
}

function getUnitOnHex(r, c) {
    if (!board || board.length === 0 || !board[0] || !units) {
        return null;
    }

    if (r < 0 || r >= board.length || c < 0 || c >= board[0].length) {
        return null;
    }

    return units.find(u => u.r === r && u.c === c && u.currentHealth > 0);
}

function isHexSupplied(startR, startC, playerId) {
    console.log(`%c[DEBUG Suministro] Chequeando suministro para (${startR},${startC}) de J${playerId}`, "background: yellow; color: black;");

    if (!board || board.length === 0 || !board[0] || !board[startR] || !board[startR][startC]) {
        console.error(`[isHexSupplied] Tablero o hexágono inicial (${startR},${startC}) no inicializado/válido.`);
        return false;
    }
    const startHexData = board[startR][startC];
    
    // === CASO 1: La unidad YA ESTÁ en una fuente de suministro propia ===
    if (startHexData.owner === playerId && (startHexData.isCapital || startHexData.structure === "Fortaleza")) {
        console.log(`%c[isHexSupplied] (${startR},${startC}) está directamente en una fuente de suministro propia (Capital/Fortaleza). SÍ SUMINISTRADA.`, "color: lightgreen;");
        return true;
    }

    // === CASO 2: Buscar un camino a una fuente de suministro ===
    let queue = [{ r: startR, c: startC }];
    let visited = new Set();
    visited.add(`${startR},${startC}`);

    const maxSearchDepth = 15; // Límite de búsqueda razonable para evitar bucles en mapas grandes
    let iterations = 0;

    while (queue.length > 0 && iterations < maxSearchDepth * BOARD_ROWS * BOARD_COLS) { // Multiplicar por BOARD_ROWS*BOARD_COLS para evitar bucles infinitos en búsqueda
        iterations++;
        const current = queue.shift();
        const currentHexData = board[current.r]?.[current.c];

        if (!currentHexData) continue; // Si por alguna razón el hex actual no existe (fuera de límites, etc.)

        // Condición de Éxito: ¿Hemos llegado a una ciudad o fortaleza propia DESDE OTRO HEXÁGONO?
        // Esta condición ya no es la misma que la del inicio para evitar doble conteo y mejorar la lógica.
        if (current.r !== startR || current.c !== startC) { // Si no es el hexágono de partida
            if (currentHexData.owner === playerId && (currentHexData.isCapital || currentHexData.structure === "Fortaleza")) {
                console.log(`%c[isHexSupplied] (${startR},${startC}) está suministrada via ruta a fuente en (${current.r},${current.c}). SÍ SUMINISTRADA.`, "color: lightgreen;");
                return true;
            }
        }

        const neighbors = getHexNeighbors(current.r, current.c);
        for (const neighborCoords of neighbors) {
            const neighborKey = `${neighborCoords.r},${neighborCoords.c}`;
            // Asegurarse de que el vecino esté dentro de los límites y no haya sido visitado
            if (neighborCoords.r >= 0 && neighborCoords.r < board.length &&
                neighborCoords.c >= 0 && neighborCoords.c < board[0].length &&
                !visited.has(neighborKey)) {

                const neighborHexData = board[neighborCoords.r][neighborCoords.c]; // Acceso seguro
                if (neighborHexData) {
                    // Se puede pasar a través de:
                    // 1. Hexágonos propios (owner === playerId)
                    // 2. Hexágonos con una estructura "Camino" QUE TAMBIÉN SEA PROPIA (owner === playerId)
                    if (neighborHexData.owner === playerId || (neighborHexData.structure === "Camino" && neighborHexData.owner === playerId)) {
                        visited.add(neighborKey);
                        queue.push({ r: neighborCoords.r, c: neighborCoords.c });
                    }
                }
            }
        }
    }
    console.log(`%c[isHexSupplied] (${startR},${startC}) NO está suministrada (no se encontró ruta).`, "color: red;");
    return false;
}

function isHexSuppliedForReinforce(r, c, playerId) {
    const hexData = board[r]?.[c];
    if (!hexData) return false;

    // LOG: Muestra la info de la casilla donde está la unidad
    console.log(`[Reinforce Check] Unidad en (${r},${c}), J${playerId}.`);

    // Caso 1: La unidad está DIRECTAMENTE en una Capital o Fortaleza propia.
    if (hexData.owner === playerId && (hexData.isCapital || hexData.structure === "Fortaleza")) {
        console.log(`%c[DEBUG Reforzar] OK: Unidad en fuente de refuerzo directa. (owner:${hexData.owner}, isCapital:${hexData.isCapital}, structure:${hexData.structure})`, "color: green;");
        return true;
    }

    // Caso 2: La unidad está ADYACENTE a una Capital o Fortaleza propia.
    const neighbors = getHexNeighbors(r, c);
    console.log(`[Reinforce Check] Buscando en ${neighbors.length} vecinos...`);
    for (const neighbor of neighbors) {
        const neighborHexData = board[neighbor.r]?.[neighbor.c];
        if (neighborHexData) {
            // LOG: Muestra la info de cada vecino
            console.log(`  - Vecino en (${neighbor.r},${neighbor.c}): owner=${neighborHexData.owner}, isCapital=${neighborHexData.isCapital}, structure=${neighborHexData.structure}`);
            
            if (neighborHexData.owner === playerId && (neighborHexData.isCapital || neighborHexData.structure === "Fortaleza")) {
                console.log(`%c[DEBUG Reforzar] OK: Adyacente a fuente de refuerzo en (${neighbor.r},${neighbor.c}).`, "color: green;");
                return true;
            }
        }
    }

    console.log(`%c[DEBUG Reforzar] FALLO: No se encontró fuente de refuerzo para (${r},${c}).`, "color: red;");
    return false;
}

function getRandomTerrainType() {
    // Obtenemos los tipos de terreno que NO son intransitables (como el agua)
    const availableTerrains = Object.keys(TERRAIN_TYPES).filter(type => 
        !TERRAIN_TYPES[type].isImpassableForLand
    );

    if (availableTerrains.length === 0) {
        console.warn("No hay terrenos transitables definidos en TERRAIN_TYPES. Devolviendo 'plains'.");
        return 'plains'; // Fallback por si acaso
    }
    
    // Devolvemos uno al azar
    const randomIndex = Math.floor(Math.random() * availableTerrains.length);
    return availableTerrains[randomIndex];
}

/**
 * Devuelve una versión abreviada del nombre de un tipo de regimiento.
 * @param {string} unitTypeName - El nombre completo del tipo de regimiento (ej. "Infantería Pesada").
 * @returns {string} El nombre abreviado (ej. "Inf. Pesada").
 */
function getAbbreviatedName(unitTypeName) {
    if (typeof unitTypeName !== 'string') return '';

    // Mapeo de nombres completos a abreviaturas.
    // Se puede expandir fácilmente con más tipos de unidades.
    const abbreviations = {
        "Infantería Ligera": "Inf. Ligera",
        "Infantería Pesada": "Inf. Pesada",
        "Caballería Ligera": "Cab. Ligera",
        "Caballería Pesada": "Cab. Pesada",
        "Arqueros": "Arqueros", // No necesita abreviatura
        "Arcabuceros": "Arcabuceros", // No necesita abreviatura
        "Arqueros a Caballo": "Arq. a Caballo",
        "Artillería": "Artillería", // No necesita abreviatura
        "Cuartel General": "Cuartel Gral.",
        "Ingenieros": "Ingenieros",
        "Hospital de Campaña": "Hospital Camp.",
        "Columna de Suministro": "Suministros",
        "Barco de Guerra": "Navío Guerra",
        "Colono": "Colono",
        "Explorador": "Explorador"
    };

    // Devuelve la abreviatura si existe, o el nombre original si no.
    return abbreviations[unitTypeName] || unitTypeName;
}