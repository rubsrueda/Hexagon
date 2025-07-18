// boardManager.js
// Funciones para crear, gestionar y renderizar el tablero y sus hexágonos.

let panStartTimestamp = 0;
let hasMovedEnoughForPan = false;
const PAN_MOVE_THRESHOLD = 5; 

// --- INICIALIZACIÓN PARA PARTIDAS DE ESCARAMUZA ---
function initializeNewGameBoardDOMAndData(selectedResourceLevel = 'min', selectedBoardSize = 'small') {

    console.log("boardManager.js: initializeNewGameBoardDOMAndData ha sido llamada.");

    const boardDimensions = BOARD_SIZES[selectedBoardSize] || BOARD_SIZES['small'];
    const B_ROWS = boardDimensions.rows;
    const B_COLS = boardDimensions.cols;    

    // --- ¡CORRECCIÓN CLAVE AQUÍ! Acceder a través de domElements ---
    if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateX !== 'undefined') domElements.currentBoardTranslateX = 0;
    if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateY !== 'undefined') domElements.currentBoardTranslateY = 0;
    if (domElements.gameBoard) {
        domElements.gameBoard.style.transform = `translate(0px, 0px)`;
    }
    // --- FIN CORRECCIÓN CLAVE ---

    if (!domElements.gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; } // Usar domElements
    domElements.gameBoard.innerHTML = ''; // Limpiar tablero existente // Usar domElements

    board = Array(B_ROWS).fill(null).map(() => Array(B_COLS).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para una nueva partida

    domElements.gameBoard.style.width = `${B_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`; // Usar domElements
    domElements.gameBoard.style.height = `${B_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`; // Usar domElements

    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            domElements.gameBoard.appendChild(hexElement); // Usar domElements
            
            const terrainType = getRandomTerrainType(); 
            board[r][c] = {
                element: hexElement, 
                terrain: terrainType, 
                owner: null, structure: null,
                isCity: false, isCapital: false, resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' }, unit: null,
                estabilidad: 0,
                nacionalidad: { 1: 0, 2: 0 }
            };
        }
    }

    if (gameState) { 
        gameState.isCampaignBattle = false;
        gameState.currentScenarioData = null;
        gameState.currentMapData = null;
    }

    addCityToBoardData(1, 2, 1, "Capital P1 (Escaramuza)", true);
    addCityToBoardData(B_ROWS - 2, B_COLS - 3, 2, "Capital P2 (Escaramuza)", true);

    /* se cambia por generateProceduralMap a continuación.
    generateRiversAndLakes(B_ROWS, B_COLS, 1); 
    generateHillsAndForests(B_ROWS, B_COLS, 0.15, 0.1); 

    generateRandomResourceNodes(selectedResourceLevel); 
    */
    generateProceduralMap(B_ROWS, B_COLS, selectedResourceLevel);

    initializeTerritoryData(); 

    renderFullBoardVisualState(); 
    updateFogOfWar(); 
    initializeBoardPanning(); 
    console.log("boardManager.js: initializeNewGameBoardDOMAndData completada.");
}

/**
 * Orquesta la generación procedural del mapa de escaramuza.
 * @param {number} B_ROWS - Número de filas del tablero.
 * @param {number} B_COLS - Número de columnas del tablero.
 * @param {string} resourceLevel - Nivel de recursos ('min', 'med', 'max').
 */
function generateProceduralMap(B_ROWS, B_COLS, resourceLevel) {
    console.log("Iniciando generación procedural de mapa...");
    const totalHexes = B_ROWS * B_COLS;

    // --- 1. Generar Terreno ---
    // Normalizamos los porcentajes para que sumen 100%
    const terrainProportions = { water: 0.30, forest: 0.25, hills: 0.15, plains: 0.30 }; // Ajustado para sumar 100%

    // Primero, llenamos todo de llanura
    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            if (board[r]?.[c]) board[r][c].terrain = 'plains';
        }
    }

    // Segundo, creamos un cuerpo de agua contiguo
    generateContiguousTerrain(B_ROWS, B_COLS, 'water', Math.floor(totalHexes * terrainProportions.water));
    
    // Tercero, generamos los bosques en grupos
    generateClusteredTerrain(B_ROWS, B_COLS, 'forest', Math.floor(totalHexes * terrainProportions.forest), 2, 4); // Grupos de 2 a 4
    
    // Cuarto, generamos las colinas
    generateClusteredTerrain(B_ROWS, B_COLS, 'hills', Math.floor(totalHexes * terrainProportions.hills), 1, 3); // Grupos de 1 a 3

    // --- ¡NUEVO PASO! Asegurar un camino entre capitales ---
    const capitalP1 = gameState.cities.find(c => c.isCapital && c.owner === 1);
    const capitalP2 = gameState.cities.find(c => c.isCapital && c.owner === 2);
    if (capitalP1 && capitalP2) {
        ensurePathBetweenPoints({r: capitalP1.r, c: capitalP1.c}, {r: capitalP2.r, c: capitalP2.c}, 1);
    }
    
    // --- 2. Colocar Recursos ---
    placeResourcesOnGeneratedMap(B_ROWS, B_COLS, resourceLevel);

    console.log("Generación procedural de mapa completada.");
}

/**
 * Genera un cuerpo de terreno contiguo (ideal para agua) usando un algoritmo de "caminante aleatorio".
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} terrainType - El tipo de terreno a generar (ej. 'water').
 * @param {number} targetAmount - El número de hexágonos a convertir.
 */
function generateContiguousTerrain(rows, cols, terrainType, targetAmount) {
    console.log(`Generando río (${terrainType}) - Objetivo: ${targetAmount} hexágonos`);
    let placedCount = 0;
    const placedHexes = new Set(); // Para rastrear hexágonos ya convertidos a este terreno

    // Elegir un punto de inicio aleatorio cerca del borde.
    // Se podría empezar más cerca del centro si se quiere un lago grande.
    let startR = Math.floor(Math.random() * rows);
    let startC = Math.random() < 0.5 ? 0 : cols - 1; // Empezar en columna 0 o col-1

    // Asegurarse de no empezar sobre capitales (si ya están puestas)
    let safetyAttempts = 0;
    while (board[startR]?.[startC]?.isCapital && safetyAttempts < 100) {
        startR = Math.floor(Math.random() * rows);
        startC = Math.random() < 0.5 ? 0 : cols - 1;
        safetyAttempts++;
    }
    if (safetyAttempts === 100) console.warn(`No se pudo encontrar un inicio para el río lejos de capitales.`);
     
    let currentR = startR;
    let currentC = startC;

    // Definir una longitud para el "camino" del caminante.
    // No necesariamente colocará 'targetAmount' hexágonos si el camino se atasca o se sale.
    let pathLength = Math.floor(targetAmount * 1.5); // Intentar un camino un poco más largo

    // Determinar la dirección general de movimiento (alejarse del borde de inicio)
    const biasDirection = startC === 0 ? 'right' : (startC === cols - 1 ? 'left' : (startR === 0 ? 'down' : 'up'));
    console.log(`[River Gen] Iniciando en (${startR}, ${startC}), bias: ${biasDirection}`);


    // Bucle principal del caminante
    for (let j = 0; j < pathLength; j++) {
         // Salir si se sale del tablero o si ya colocamos suficientes hexágonos
         if (currentR < 0 || currentR >= rows || currentC < 0 || currentC >= cols || placedCount >= targetAmount) break;

        const hexKey = `${currentR},${currentC}`;
        const currentHex = board[currentR]?.[currentC];

        // --- 1. Convertir el hexágono actual a terreno de río ---
        // Solo convertir si es un terreno "convertible" (ej: llanura) y no es una ciudad/capital
        // y no ha sido convertido ya en este proceso.
        if (currentHex && currentHex.terrain !== terrainType && !currentHex.isCity && !placedHexes.has(hexKey)) {
            currentHex.terrain = terrainType;
            currentHex.resourceNode = null; // Eliminar recursos al convertir a río
            placedHexes.add(hexKey);
            placedCount++;
        } else if (currentHex?.isCapital) {
             // Si el caminante intenta pasar sobre una capital, se salta este hex y se intenta mover desde aquí
             // sin convertirlo a agua.
             console.log(`[River Gen] Caminante intentó pasar sobre capital en (${currentR}, ${currentC}). Saltando conversión.`);
             // No hacemos 'continue' aquí, simplemente no lo convertimos. El caminante intenta moverse desde aquí.
        }


        // Si ya colocamos suficientes hexágonos, terminar el camino
        if (placedCount >= targetAmount) break;

        // --- 2. Decidir el próximo hexágono para el caminante ---
        const neighbors = getHexNeighbors(currentR, currentC);
        
        // Opciones de movimiento:
        // Prioridad 1: Vecinos que NO son el terreno de río y están DENTRO del tablero y existen.
        // Esto ayuda a que el río se mueva por tierra y se mantenga delgado.
        const potentialMoves = neighbors.filter(n => board[n.r]?.[n.c] && board[n.r][n.c].terrain !== terrainType); 

        // Prioridad 2: Si no hay vecinos terrestres disponibles, cualquier vecino VÁLIDO (dentro del tablero)
        // Esto puede hacer que el río se ensanche si está rodeado de su propio terreno.
        const fallbackMoves = neighbors.filter(n => board[n.r]?.[n.c]);

        const moveOptions = potentialMoves.length > 0 ? potentialMoves : fallbackMoves;

        // Si no hay vecinos válidos a los que moverse (ej: golpeó el borde del mapa o quedó rodeado)
        if (moveOptions.length === 0) {
             console.log(`[River Gen] Caminante atascado en (${currentR}, ${currentC}). No hay vecinos válidos.`);
             // Opcional: intentar un salto aleatorio a otro lugar si se atasca.
             // Por ahora, simplemente romper el bucle.
             break;
        }
        
        // Seleccionar el próximo hexágono de las opciones.
        let nextMove;
        
        // Aplicar sesgo direccional si hay más de una opción
        if (moveOptions.length > 1) {
             let biasedMoves = [];
             // Filtrar los movimientos que van en la dirección general deseada.
             if (biasDirection === 'right') biasedMoves = moveOptions.filter(n => n.c > currentC);
             else if (biasDirection === 'left') biasedMoves = moveOptions.filter(n => n.c < currentC);
             else if (biasDirection === 'down') biasedMoves = moveOptions.filter(n => n.r > currentR);
             else if (biasDirection === 'up') biasedMoves = moveOptions.filter(n => n.r < currentR);

             if (biasedMoves.length > 0) {
                 // Si hay opciones sesgadas, elige una al azar de ellas.
                 nextMove = biasedMoves[Math.floor(Math.random() * biasedMoves.length)];
             } else {
                 // Si no hay opciones sesgadas (ej: llegó al borde opuesto o la dirección sesgada no es transitable),
                 // elige una opción válida cualquiera al azar.
                 nextMove = moveOptions[Math.floor(Math.random() * moveOptions.length)];
             }

        } else {
            // Si solo hay una opción, tómala.
            nextMove = moveOptions[0];
        }

        // Actualizar la posición actual para la próxima iteración del bucle
        currentR = nextMove.r;
        currentC = nextMove.c;
        
        // Opcional: pequeña probabilidad de un salto aleatorio a cualquier lugar para crear ríos separados.
        // if (Math.random() < 0.02) { // 2% chance to jump
        //      currentR = Math.floor(Math.random() * rows);
        //      currentC = Math.floor(Math.random() * cols);
        //      console.log(`[River Gen] Caminante saltó a (${currentR}, ${currentC})`);
        // }

    } // Fin del bucle for (pathLength)

    console.log(`Finalizada generación de ${terrainType}. Colocados: ${placedCount} hexágonos.`);
}

/**
 * Genera grupos de terreno (ideal para bosques y colinas).
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} terrainType - El tipo de terreno a generar.
 * @param {number} targetAmount - Número total de hexágonos a convertir.
 * @param {number} minClusterSize - Tamaño mínimo de un grupo.
 * @param {number} maxClusterSize - Tamaño máximo de un grupo.
 */
function generateClusteredTerrain(rows, cols, terrainType, targetAmount, minClusterSize, maxClusterSize) {
    let placedCount = 0;
    let attempts = 0;

    while (placedCount < targetAmount && attempts < targetAmount * 5) {
        attempts++;
        const startR = Math.floor(Math.random() * rows);
        const startC = Math.floor(Math.random() * cols);

        // Solo intentar colocar si el hexágono inicial es una llanura
        if (board[startR]?.[startC]?.terrain === 'plains' && !board[startR][startC].isCity) {
            const clusterSize = Math.floor(Math.random() * (maxClusterSize - minClusterSize + 1)) + minClusterSize;
            let currentCluster = [{r: startR, c: startC}];
            let clusterPlacedCount = 0;

            // Colocar el primer hex del cluster
            board[startR][startC].terrain = terrainType;
            placedCount++;
            clusterPlacedCount++;

            // Expandir el cluster
            let safety = 0;
            while(clusterPlacedCount < clusterSize && safety < 50) {
                safety++;
                // Elegir un hexágono aleatorio del cluster actual para expandir desde él
                const expandFrom = currentCluster[Math.floor(Math.random() * currentCluster.length)];
                const neighbors = getHexNeighbors(expandFrom.r, expandFrom.c);
                const validNeighbors = neighbors.filter(n => board[n.r]?.[n.c]?.terrain === 'plains' && !board[n.r][n.c].isCity);

                if (validNeighbors.length > 0) {
                    const placeAt = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
                    board[placeAt.r][placeAt.c].terrain = terrainType;
                    currentCluster.push(placeAt);
                    placedCount++;
                    clusterPlacedCount++;
                } else {
                    // No hay vecinos válidos para expandir, terminar este cluster
                    break;
                }
            }
        }
    }
}

/**
 * Coloca los recursos en el mapa ya generado según las reglas.
 * @param {number} rows - Filas del tablero.
 * @param {number} cols - Columnas del tablero.
 * @param {string} resourceLevel - Nivel de recursos seleccionado por el jugador.
 */
function placeResourcesOnGeneratedMap(rows, cols, resourceLevel) {
    const plainsHexes = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hex = board[r][c];
            if (!hex) continue;

            // Regla 1: Bosques siempre tienen Madera
            if (hex.terrain === 'forest') {
                hex.resourceNode = 'madera';
            }
            // Regla 2: Colinas tienen Piedra, Hierro u Oro
            else if (hex.terrain === 'hills') {
                const rand = Math.random();
                if (rand < 0.70) { // 70%
                    hex.resourceNode = 'piedra';
                } else if (rand < 0.90) { // 20% (de 0.70 a 0.90)
                    hex.resourceNode = 'hierro';
                } else { // 10% (de 0.90 a 1.0)
                    hex.resourceNode = 'oro_mina';
                }
            }
            // Regla 3: Guardar llanuras para la Comida
            else if (hex.terrain === 'plains' && !hex.isCity) {
                plainsHexes.push({r, c});
            }
        }
    }

    // Colocar Comida en llanuras
    let foodNodesToPlace = 0;
    switch (resourceLevel) {
        case 'min': foodNodesToPlace = 2; break;
        case 'med': foodNodesToPlace = 4; break;
        case 'max': foodNodesToPlace = 8; break;
    }

    // Barajar las llanuras para colocar la comida aleatoriamente
    for (let i = plainsHexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plainsHexes[i], plainsHexes[j]] = [plainsHexes[j], plainsHexes[i]];
    }

    for (let i = 0; i < foodNodesToPlace && i < plainsHexes.length; i++) {
        const hexCoords = plainsHexes[i];
        board[hexCoords.r][hexCoords.c].resourceNode = 'comida';
    }
}

/**
 * Genera ríos o lagos conectados en el tablero.
 * Implementa un algoritmo de "caminante aleatorio" para trazar un camino de agua.
 * @param {number} rows - Número de filas del tablero.
 * @param {number} cols - Número de columnas del tablero.
 * @param {number} numRivers - Cuántos ríos/lagos generar.
 */
function generateRiversAndLakes(rows, cols, numRivers) {
    for (let i = 0; i < numRivers; i++) {
        let startR = Math.floor(Math.random() * rows);
        let startC = Math.floor(Math.random() * cols);

        // Asegurarse de que el río no empiece sobre una capital o demasiado cerca.
        let tooClose = false;
        gameState.cities.forEach(city => {
            if (hexDistance(startR, startC, city.r, city.c) <= 3) { // Capitales + 3 hexágonos de buffer
                tooClose = true;
            }
        });
        if (tooClose) { i--; continue; } // Reintentar si está muy cerca de una capital

        let currentR = startR;
        let currentC = startC;
        let pathLength = Math.floor(Math.random() * (Math.max(rows, cols) * 0.8)) + Math.min(rows, cols) / 2; // Longitud del río
        let waterHexes = new Set(); // Para evitar duplicados y verificar conexión.

        for (let j = 0; j < pathLength; j++) {
            if (currentR < 0 || currentR >= rows || currentC < 0 || currentC >= cols) break; // Fuera de límites

            const hexKey = `${currentR},${currentC}`;
            if (!waterHexes.has(hexKey)) {
                board[currentR][currentC].terrain = 'water';
                waterHexes.add(hexKey);

                // Opcional: Agrandar el río/lago con vecinos
                if (Math.random() < 0.3) { // 30% de probabilidad de ensanchar
                    const neighbors = getHexNeighbors(currentR, currentC);
                    for (const n of neighbors) {
                        if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && !waterHexes.has(`${n.r},${n.c}`)) {
                            // Evitar poner agua justo sobre o adyacente a una capital
                            let isNearCapital = false;
                            gameState.cities.forEach(city => {
                                if (hexDistance(n.r, n.c, city.r, city.c) <= 1) { // Capitales + 1 hexágono de buffer
                                    isNearCapital = true;
                                }
                            });
                            if (!isNearCapital) {
                                board[n.r][n.c].terrain = 'water';
                                waterHexes.add(`${n.r},${n.c}`);
                            }
                        }
                    }
                }
            }

            // Mover a un vecino aleatorio para continuar el camino
            const possibleMoves = getHexNeighbors(currentR, currentC);
            if (possibleMoves.length === 0) break;
            const nextMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            currentR = nextMove.r;
            currentC = nextMove.c;
        }
    }
}

/**
 * Genera colinas y bosques aleatoriamente en el tablero.
 * Ahora también asigna recursos de Madera y Piedra a estos terrenos.
 * @param {number} rows - Número de filas del tablero.
 * @param {number} cols - Número de columnas del tablero.
 * @param {number} hillProbability - Probabilidad (0.0-1.0) de que un hexágono sea colina.
 * @param {number} forestProbability - Probabilidad (0.0-1.0) de que un hexágono sea bosque.
 */
function generateHillsAndForests(rows, cols, hillProbability, forestProbability) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const hex = board[r][c];
            // Solo modificamos si no es agua, no es ciudad, no es capital, y no es un recurso ya puesto.
            // Si el terreno ya es 'water' por generateRiversAndLakes, no lo modificamos.
            if (hex.terrain === 'plains' && !hex.isCity && !hex.isCapital && !hex.resourceNode) {
                if (Math.random() < hillProbability) {
                    hex.terrain = 'hills';
                    // --- NUEVO: Asignar recurso de Piedra a las Colinas ---
                    // Asegurarse de que el hexágono no tenga ya un nodo de recurso (aunque aquí ya lo chequeamos con !hex.resourceNode)
                    // y que el nodo de piedra exista en RESOURCE_NODES_DATA.
                    if (!hex.resourceNode && RESOURCE_NODES_DATA['piedra']) {
                        hex.resourceNode = 'piedra';
                    }
                    // --- FIN NUEVO ---
                } else if (Math.random() < forestProbability) { 
                    hex.terrain = 'forest';
                    // --- NUEVO: Asignar recurso de Madera a los Bosques ---
                    if (!hex.resourceNode && RESOURCE_NODES_DATA['madera']) {
                        hex.resourceNode = 'madera';
                    }
                    // --- FIN NUEVO ---
                }
            }
        }
    }
}

function initializeBoardPanning() {
    console.log("PANNING_AND_ZOOM_INIT_CALLED");

    if (!domElements.gameBoard || !domElements.gameBoard.parentElement) {
        console.error("Error crítico de Panning/Zoom: gameBoard o su contenedor no existen.");
        return;
    }

    const viewport = domElements.gameBoard.parentElement;
    let lastTouchX_pan_bm = null;
    let lastTouchY_pan_bm = null;

    // --- Helper para calcular la distancia entre dos toques ---
    function getPinchDistance(touches) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        return Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
    }

    // --- Función Unificada para Aplicar Transformaciones (Translate y Scale) y Límites ---
    function applyTransform() {
        // Obtenemos dimensiones actuales
        const boardWidth = domElements.gameBoard.offsetWidth * domElements.currentBoardScale;
        const boardHeight = domElements.gameBoard.offsetHeight * domElements.currentBoardScale;
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        // Limitar la escala
        const MIN_SCALE = 0.4;
        const MAX_SCALE = 2.0;
        domElements.currentBoardScale = Math.max(MIN_SCALE, Math.min(domElements.currentBoardScale, MAX_SCALE));

        let targetX = domElements.currentBoardTranslateX;
        let targetY = domElements.currentBoardTranslateY;

        // Aplicar límites de traslación
        if (boardWidth > viewportWidth) {
            targetX = Math.min(0, Math.max(viewportWidth - boardWidth, targetX));
        } else {
            targetX = (viewportWidth - boardWidth) / 2; // Centrar si es más pequeño
        }
        if (boardHeight > viewportHeight) {
            targetY = Math.min(0, Math.max(viewportHeight - boardHeight, targetY));
        } else {
            targetY = (viewportHeight - boardHeight) / 2; // Centrar si es más pequeño
        }

        // Guardar la posición corregida
        domElements.currentBoardTranslateX = targetX;
        domElements.currentBoardTranslateY = targetY;

        // Aplicar la transformación combinada de escala y traslación
        domElements.gameBoard.style.transform = `translate(${targetX}px, ${targetY}px) scale(${domElements.currentBoardScale})`;
    }

    // --- Panning con Ratón ---
    domElements.gameBoard.addEventListener('mousedown', function(e) {
        if (e.button !== 0 || (typeof placementMode !== 'undefined' && placementMode.active)) return;
        e.preventDefault();
        domElements.isPanning = true;
        domElements.panStartX = e.clientX - domElements.currentBoardTranslateX;
        domElements.panStartY = e.clientY - domElements.currentBoardTranslateY;
        domElements.gameBoard.classList.add('grabbing');
    });

    document.addEventListener('mousemove', function(e) {
        if (!domElements.isPanning) return;
        domElements.currentBoardTranslateX = e.clientX - domElements.panStartX;
        domElements.currentBoardTranslateY = e.clientY - domElements.panStartY;
        applyTransform();
    });

    document.addEventListener('mouseup', function(e) {
        if (e.button !== 0) return;
        domElements.isPanning = false;
        domElements.gameBoard.classList.remove('grabbing');
    });

    // --- Zoom con Rueda del Ratón (Bonus) ---
    domElements.gameBoard.addEventListener('wheel', function(e) {
        e.preventDefault();
        const scaleAmount = -e.deltaY * 0.001;
        domElements.currentBoardScale += scaleAmount;
        applyTransform();
    }, { passive: false });

    // --- Lógica Táctil para Paneo y Zoom ---
    domElements.gameBoard.addEventListener('touchstart', function(e) {
        if ((typeof placementMode !== 'undefined' && placementMode.active)) return;
        
        // Paneo con un dedo
        if (e.touches.length === 1) {
            domElements.isPanning = true;
            domElements.isPinching = false;
            const touch = e.touches[0];
            lastTouchX_pan_bm = touch.clientX;
            lastTouchY_pan_bm = touch.clientY;
        }
        // Zoom con dos dedos
        else if (e.touches.length === 2) {
            domElements.isPinching = true;
            domElements.isPanning = false;
            domElements.initialPinchDistance = getPinchDistance(e.touches);
        }
    }, { passive: true });

    domElements.gameBoard.addEventListener('touchmove', function(e) {
        e.preventDefault();
        
        // Mover con un dedo
        if (domElements.isPanning && e.touches.length === 1) {
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchX_pan_bm;
            const dy = touch.clientY - lastTouchY_pan_bm;
            domElements.currentBoardTranslateX += dx;
            domElements.currentBoardTranslateY += dy;
            lastTouchX_pan_bm = touch.clientX;
            lastTouchY_pan_bm = touch.clientY;
            applyTransform();
        } 
        // Hacer zoom con dos dedos
        else if (domElements.isPinching && e.touches.length === 2) {
            const newDist = getPinchDistance(e.touches);
            const scaleFactor = newDist / domElements.initialPinchDistance;
            domElements.currentBoardScale *= scaleFactor;
            
            // Actualizar la distancia inicial para un zoom más suave
            domElements.initialPinchDistance = newDist;
            
            applyTransform();
        }
    }, { passive: false });

    domElements.gameBoard.addEventListener('touchend', function(e) {
        // Resetear estados al levantar los dedos
        domElements.isPanning = false;
        domElements.isPinching = false;
        lastTouchX_pan_bm = null;
        lastTouchY_pan_bm = null;
    });

    console.log("BoardManager: Panning and Zoom listeners inicializados.");
    applyTransform(); // Aplicar transformación inicial para centrar correctamente.
}

function createHexDOMElementWithListener(r, c) {
//    console.log(`[BoardManager] Creando listener para hex (${r},${c})`);
    const hexEl = document.createElement('div');
    hexEl.classList.add('hex');
    hexEl.dataset.r = r;
    hexEl.dataset.c = c;
 
    const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
    const yPos = r * HEX_VERT_SPACING;
    hexEl.style.left = `${xPos}px`;
    hexEl.style.top = `${yPos}px`;

    hexEl.addEventListener('click', (event) => { 
        console.log(`[HEX CLICK LISTENER] Clic detectado en listener directo para (${r},${c})`); 
        // No detener propagación aquí si la unidad tiene pointer-events: none,
        // onHexClick debe decidir qué hacer.
        onHexClick(r, c);
    });
    return hexEl;
}

// --- FUNCIÓN PARA INICIALIZAR TABLERO PARA ESCENARIOS DE CAMPAÑA ---
async function initializeGameBoardForScenario(mapTacticalData, scenarioData) {
    console.log("boardManager.js: initializeGameBoardForScenario ha sido llamada.");

    // Reseteo de variables de paneo globales
    if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateX !== 'undefined') domElements.currentBoardTranslateX = 0; // Usar domElements
    if (typeof domElements !== 'undefined' && domElements.currentBoardTranslateY !== 'undefined') domElements.currentBoardTranslateY = 0; // Usar domElements
    if (domElements.gameBoard) { // Usar domElements
        domElements.gameBoard.style.transform = `translate(0px, 0px)`; // Usar domElements
    }
    
    if (!domElements.gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM for scenario."); return; } // Usar domElements
    domElements.gameBoard.innerHTML = ''; // Limpiar tablero existente // Usar domElements

    const R = mapTacticalData.rows;
    const C = mapTacticalData.cols;

    board = Array(R).fill(null).map(() => Array(C).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para el nuevo escenario

    domElements.gameBoard.style.width = `${C * HEX_WIDTH + HEX_WIDTH / 2}px`; // Usar domElements
    domElements.gameBoard.style.height = `${R * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`; // Usar domElements

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            domElements.gameBoard.appendChild(hexElement); // Usar domElements

            let terrainType = mapTacticalData.hexesConfig?.defaultTerrain || 'plains';
            let structureType = null;
            const specificHexConfig = mapTacticalData.hexesConfig?.specificHexes?.find(h => h.r === r && h.c === c);
            if (specificHexConfig) {
                if (specificHexConfig.terrain) terrainType = specificHexConfig.terrain;
                if (specificHexConfig.structure) structureType = specificHexConfig.structure;
            }

            board[r][c] = {
                element: hexElement,
                terrain: terrainType, 
                owner: null,
                structure: structureType,
                isCity: false,
                isCapital: false,
                resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' },
                unit: null
            };
        }
    }
    
    if (gameState) {
        gameState.isCampaignBattle = true;
    }

    // Añadir Ciudades y Capitales
    if (mapTacticalData.playerCapital) {
        addCityToBoardData(mapTacticalData.playerCapital.r, mapTacticalData.playerCapital.c, 1, mapTacticalData.playerCapital.name, true);
        if (board[mapTacticalData.playerCapital.r]?.[mapTacticalData.playerCapital.c]) {
            board[mapTacticalData.playerCapital.r][mapTacticalData.playerCapital.c].owner = 1;
        }
    }
    if (mapTacticalData.enemyCapital) {
        const enemyOwnerId = 2; 
        addCityToBoardData(mapTacticalData.enemyCapital.r, mapTacticalData.enemyCapital.c, enemyOwnerId, mapTacticalData.enemyCapital.name, true);
        if (board[mapTacticalData.enemyCapital.r]?.[mapTacticalData.enemyCapital.c]) {
            board[mapTacticalData.enemyCapital.r][mapTacticalData.enemyCapital.c].owner = enemyOwnerId;
        }
    }
    mapTacticalData.cities?.forEach(cityInfo => {
        let cityOwnerPlayerNumber = null;
        if (cityInfo.owner === 'player') cityOwnerPlayerNumber = 1;
        else if (cityInfo.owner === 'enemy') cityOwnerPlayerNumber = 2; 
        else if (cityInfo.owner === 'neutral' || !cityInfo.owner) { cityOwnerPlayerNumber = null; }
        addCityToBoardData(cityInfo.r, cityInfo.c, cityOwnerPlayerNumber, cityInfo.name, false);
        if (cityOwnerPlayerNumber && board[cityInfo.r]?.[cityInfo.c]) {
            board[cityInfo.r][cityInfo.c].owner = cityOwnerPlayerNumber;
        }
    });

    // Añadir Nodos de Recursos
    mapTacticalData.resourceNodes?.forEach(node => {
        const hexForResource = board[node.r]?.[node.c];
        if (hexForResource && hexForResource.terrain !== 'water') {
            addResourceNodeToBoardData(node.r, node.c, node.type);
        } else {
            console.warn(`[ScenarioMap] Recurso '${node.type}' definido en (${node.r},${node.c}) pero el hexágono es agua. No se colocará.`);
        }
    });

    if (gameState.currentPhase !== "deployment") {
        scenarioData.playerSetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 1);
            if (unitData) placeInitialUnit(unitData);
        });
        scenarioData.enemySetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 2); 
            if (unitData) placeInitialUnit(unitData);
        });
    }

    initializeTerritoryData(); 
    renderFullBoardVisualState();
    updateFogOfWar();
    initializeBoardPanning(); 
    console.log("boardManager.js: initializeGameBoardForScenario completada.");
}

// --- FUNCIONES HELPER PARA LA INICIALIZACIÓN DE ESCENARIOS ---
function createUnitDataObjectFromDefinition(unitDef, player) {
    const regimentTypeData = REGIMENT_TYPES[unitDef.type];
    if (!regimentTypeData) {
        console.error(`Tipo de regimiento desconocido "${unitDef.type}" en la definición de unidad del escenario.`);
        return null;
    }

    const singleRegiment = { ...regimentTypeData, type: unitDef.type };

    return {
        id: `u${unitIdCounter++}`, 
        player: player,
        name: unitDef.name || unitDef.type,
        regiments: [JSON.parse(JSON.stringify(singleRegiment))], 
        attack: regimentTypeData.attack,
        defense: regimentTypeData.defense,
        maxHealth: regimentTypeData.health,
        currentHealth: regimentTypeData.health,
        movement: regimentTypeData.movement,
        currentMovement: regimentTypeData.movement,
        visionRange: regimentTypeData.visionRange,
        attackRange: regimentTypeData.attackRange,
        r: unitDef.r, 
        c: unitDef.c, 
        sprite: regimentTypeData.sprite,
        element: null, 
        hasMoved: false, 
        hasAttacked: false,
    };
}

function placeInitialUnit(unitData) {
    if (!unitData || typeof unitData.r === 'undefined' || typeof unitData.c === 'undefined') {
        console.error("Datos de unidad inválidos o faltan coordenadas para placeInitialUnit", unitData);
        return;
    }

    const unitElement = document.createElement('div');
    unitElement.classList.add('unit', `player${unitData.player}`);
    unitElement.textContent = unitData.sprite;
    unitElement.dataset.id = unitData.id;
    const strengthDisplay = document.createElement('div');
    strengthDisplay.classList.add('unit-strength');
    strengthDisplay.textContent = unitData.currentHealth;
    unitElement.appendChild(strengthDisplay);

    if (gameBoard) {
        gameBoard.appendChild(unitElement);
    } else {
        console.error("CRITICAL: gameBoard no encontrado en DOM al colocar unidad inicial.");
        return; 
    }

    unitData.element = unitElement; 

    const targetHexData = board[unitData.r]?.[unitData.c];
    if (targetHexData) {
        if (targetHexData.unit) {
            console.warn(`Conflicto al colocar unidad: ${unitData.name} en (${unitData.r},${unitData.c}). Ya hay una unidad: ${targetHexData.unit.name}. La nueva unidad no se colocará.`);
            unitElement.remove(); 
            return;
        }
        targetHexData.unit = unitData; 
        if (targetHexData.owner !== unitData.player) {
            targetHexData.owner = unitData.player;
        }
    } else {
        console.error(`Error al colocar unidad inicial: hexágono destino (${unitData.r},${unitData.c}) no existe en 'board'.`);
        unitElement.remove();
        return;
    }

    units.push(unitData); 
}

function generateRandomResourceNodes(level) {
    let cantidadPorTipo;
    switch (level) {
        case 'min': cantidadPorTipo = 2; break;
        case 'med': cantidadPorTipo = 6; break;
        case 'max': cantidadPorTipo = 12; break;
        default:    cantidadPorTipo = 2;
    }

    logMessage(`Generando recursos aleatorios - Nivel: ${level} (${cantidadPorTipo} de c/u)`);

    // --- CAMBIO CLAVE: Excluir 'madera' y 'piedra' de la generación aleatoria ---
    const resourceTypesArray = Object.keys(RESOURCE_NODES_DATA).filter(type => 
        type !== 'madera' && type !== 'piedra' // Filtrar los que ya se asignan por terreno
    ); 
    // --- FIN CAMBIO CLAVE ---

    const occupiedBySetup = new Set();

    gameState.cities.forEach(city => {
        if (city.isCapital) {
            occupiedBySetup.add(`${city.r}-${city.c}`);
        }
    });

    resourceTypesArray.forEach(type => {
        let countPlaced = 0;
        let attempts = 0;
        const currentBoardRows = board.length || BOARD_ROWS;
        const currentBoardCols = board[0]?.length || BOARD_COLS;
        const maxAttemptsPerType = currentBoardRows * currentBoardCols * 2; 

        while (countPlaced < cantidadPorTipo && attempts < maxAttemptsPerType) {
            const r_rand = Math.floor(Math.random() * currentBoardRows);
            const c_rand = Math.floor(Math.random() * currentBoardCols);
            const hexKey = `${r_rand}-${c_rand}`;

            const hexData = board[r_rand]?.[c_rand];
            // Asegurarse de que el hexágono no sea agua, no tenga ya un recurso, etc.
            // y que el tipo de recurso que se intenta colocar no sea 'madera' o 'piedra' (ya excluidos por el filtro de arriba)
            if (hexData && 
                hexData.terrain !== 'water' && 
                !hexData.resourceNode && // Importante: ya no debe tener un recurso (ni piedra ni madera)
                !hexData.isCity &&
                !occupiedBySetup.has(hexKey) ) {

                let tooCloseToCapital = false;
                gameState.cities.forEach(city => {
                    if (city.isCapital && hexDistance(city.r, city.c, r_rand, c_rand) <= 2) { 
                        tooCloseToCapital = true;
                    }
                });
                const isBorderHex = r_rand < 1 || r_rand >= currentBoardRows - 1 || c_rand < 1 || c_rand >= currentBoardCols - 1;

                if (!tooCloseToCapital && !isBorderHex) {
                    addResourceNodeToBoardData(r_rand, c_rand, type);
                    occupiedBySetup.add(hexKey);
                    countPlaced++;
                }
            }
            attempts++;
        }
        if (countPlaced < cantidadPorTipo) {
            console.warn(`No se pudieron colocar todas las instancias de ${type}. Colocadas: ${countPlaced}/${cantidadPorTipo}`);
        }
    });
    logMessage(`Generación de recursos completada.`);
}

function addCityToBoardData(r, c, owner, name, isCapital = false) {
    if (board[r]?.[c]) {
        board[r][c].isCity = true;
        board[r][c].isCapital = isCapital;
        board[r][c].owner = owner;
        if (!gameState.cities.some(city => city.r === r && city.c === c)) {
            gameState.cities.push({ r, c, owner, name, isCapital });
        } else {
            const existingCity = gameState.cities.find(city => city.r === r && city.c === c);
            if (existingCity) {
                existingCity.owner = owner;
                existingCity.name = name;
                existingCity.isCapital = isCapital;
            }
        }
    } else {
        console.warn(`Intento de añadir ciudad en hexágono inválido: (${r},${c})`);
    }
}

function addResourceNodeToBoardData(r, c, type) {
    if (board[r]?.[c] && RESOURCE_NODES_DATA[type]) {
        board[r][c].resourceNode = type;
    } else {
         console.warn(`Intento de añadir nodo de recurso inválido: (${r},${c}) tipo ${type}`);
    }
}

function renderFullBoardVisualState() {
    if (!board || board.length === 0) return;
    const currentRows = board.length;
    const currentCols = board[0] ? board[0].length : 0;

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            if (board[r] && board[r][c]) { 
                renderSingleHexVisuals(r, c);
            }
        }
    }
    units.forEach(unit => { 
        if (unit.element && !unit.element.parentElement && domElements.gameBoard) { // Usar domElements.gameBoard
            domElements.gameBoard.appendChild(unit.element); // Usar domElements.gameBoard
        }
        if (typeof positionUnitElement === "function") positionUnitElement(unit); else console.warn("positionUnitElement no definida");
        if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unit); else console.warn("updateUnitStrengthDisplay no definida");
    });
}

function renderSingleHexVisuals(r, c) {
    const hexData = board[r]?.[c];
    if (!hexData || !hexData.element) { return; }
    const hexEl = hexData.element;

    let classesToKeep = ['hex'];
    if (hexEl.classList.contains('highlight-move')) classesToKeep.push('highlight-move');
    if (hexEl.classList.contains('highlight-attack')) classesToKeep.push('highlight-attack');
    if (hexEl.classList.contains('highlight-build')) classesToKeep.push('highlight-build');
    if (hexEl.classList.contains('fog-hidden')) classesToKeep.push('fog-hidden');
    if (hexEl.classList.contains('fog-partial')) classesToKeep.push('fog-partial');
    hexEl.className = classesToKeep.join(' ');

    if (hexData.terrain && TERRAIN_TYPES[hexData.terrain]) { 
        hexEl.classList.add(hexData.terrain); 
    } else {
        hexEl.classList.remove('plains', 'forest', 'hills', 'water'); 
    }

    if (hexData.owner) hexEl.classList.add(`player${hexData.owner}-owner`);
    if (hexData.isCity) hexEl.classList.add('city');
    if (hexData.isCapital) hexEl.classList.add('capital-city');

    if (hexData.resourceNode) {
        const resourceClassKey = hexData.resourceNode.replace('_mina', '');
        hexEl.classList.add(`resource-${resourceClassKey}`);
    }

    let structureSpriteEl = hexEl.querySelector('.structure-sprite');
    if (hexData.structure && STRUCTURE_TYPES[hexData.structure]) { 
        if (!structureSpriteEl) {
            structureSpriteEl = document.createElement('span');
            structureSpriteEl.classList.add('structure-sprite');
            hexEl.appendChild(structureSpriteEl);
        }
        structureSpriteEl.textContent = STRUCTURE_TYPES[hexData.structure].sprite;
    } else if (structureSpriteEl) {
        structureSpriteEl.remove();
    }
}

/**
 * Asegura que exista al menos un camino transitable entre dos puntos (capitales)
 * convirtiendo los hexágonos del camino en llanuras.
 * @param {object} startCoords - Coordenadas de inicio {r, c}.
 * @param {object} endCoords - Coordenadas de destino {r, c}.
 * @param {number} pathWidth - El grosor del camino a crear (ej: 1 para un camino simple).
 */
function ensurePathBetweenPoints(startCoords, endCoords, pathWidth = 1) {
    console.log(`Asegurando un camino entre (${startCoords.r},${startCoords.c}) y (${endCoords.r},${endCoords.c})`);

    // Usamos A* para encontrar el camino más corto posible, ignorando el tipo de terreno temporalmente.
    let queue = [{ r: startCoords.r, c: startCoords.c, path: [] }];
    let visited = new Set([`${startCoords.r},${startCoords.c}`]);
    let pathToCarve = null;

    while (queue.length > 0) {
        let current = queue.shift();
        
        if (current.r === endCoords.r && current.c === endCoords.c) {
            pathToCarve = current.path;
            break;
        }

        const neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const key = `${neighbor.r},${neighbor.c}`;
            if (!visited.has(key)) {
                visited.add(key);
                let newPath = [...current.path, neighbor];
                queue.push({ r: neighbor.r, c: neighbor.c, path: newPath });
            }
        }
    }

    if (pathToCarve) {
        console.log(`Camino encontrado. Tallando ${pathToCarve.length} hexágonos.`);
        // "Tallar" el camino y sus alrededores para darle anchura.
        pathToCarve.forEach(hexCoords => {
            // Obtener el hexágono principal y sus vecinos para crear un camino más ancho.
            const hexesToClear = [hexCoords, ...getHexNeighbors(hexCoords.r, hexCoords.c).slice(0, pathWidth * 2)];
            
            hexesToClear.forEach(h => {
                const hexToModify = board[h.r]?.[h.c];
                // Solo modificar si no es una capital.
                if (hexToModify && !hexToModify.isCapital) {
                    hexToModify.terrain = 'plains'; // Convertir a llanura
                    hexToModify.resourceNode = null; // Limpiar cualquier recurso que hubiera
                }
            });
        });
    } else {
        console.warn("No se pudo encontrar una ruta para tallar el corredor estratégico.");
    }
}

function initializeTerritoryData() {
    console.log("Inicializando Nacionalidad y Estabilidad de todo el territorio...");
    if (!board || board.length === 0) return;

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const hex = board[r][c];
            if (hex && hex.owner !== null) {
                // Si la casilla tiene dueño, se la damos al 100%
                hex.nacionalidad = { 1: 0, 2: 0 };
                hex.nacionalidad[hex.owner] = 5;
                hex.estabilidad = 5;
            }
        }
    }
    console.log("Inicialización de territorio completada.");
}