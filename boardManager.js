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

    if (typeof currentBoardTranslateX !== 'undefined') currentBoardTranslateX = 0;
    if (typeof currentBoardTranslateY !== 'undefined') currentBoardTranslateY = 0;
    if (gameBoard) {
        gameBoard.style.transform = `translate(0px, 0px)`;
    }

    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; }
    gameBoard.innerHTML = ''; // Limpiar tablero existente

    board = Array(B_ROWS).fill(null).map(() => Array(B_COLS).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para una nueva partida

    gameBoard.style.width = `${B_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`;
    gameBoard.style.height = `${B_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

    // --- PRIMER CAMBIO: Inicializar TODO como llanura (o un terreno base) ---
    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            gameBoard.appendChild(hexElement);
            
            board[r][c] = {
                element: hexElement, 
                terrain: 'plains', // Empezamos todo como llanura
                owner: null, structure: null,
                isCity: false, isCapital: false, resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' }, unit: null
            };
        }
    }
    // --- FIN PRIMER CAMBIO ---

    if (gameState) { 
        gameState.isCampaignBattle = false;
        gameState.currentScenarioData = null;
        gameState.currentMapData = null;
    }

    // Asegurarse de que las ciudades se añaden antes de generar recursos/terrenos complejos
    addCityToBoardData(1, 2, 1, "Capital P1 (Escaramuza)", true);
    addCityToBoardData(B_ROWS - 2, B_COLS - 3, 2, "Capital P2 (Escaramuza)", true);

    // --- SEGUNDO CAMBIO: Generar características de terreno complejas (ríos, colinas, bosques) ---
    generateRiversAndLakes(B_ROWS, B_COLS, 1); // Genera 1 río/lago
    generateHillsAndForests(B_ROWS, B_COLS, 0.15, 0.1); // 15% colinas, 10% bosque
    // --- FIN SEGUNDO CAMBIO ---

    generateRandomResourceNodes(selectedResourceLevel); // Para escaramuzas

    renderFullBoardVisualState(); 
    updateFogOfWar(); 
    initializeBoardPanning(); 
    console.log("boardManager.js: initializeNewGameBoardDOMAndData completada.");
}

// ... (las funciones createHexDOMElementWithListener y initializeBoardPanning y initializeGameBoardForScenario son las mismas) ...

// --- NUEVAS FUNCIONES DE GENERACIÓN DE TERRENO (añadir al final de boardManager.js) ---

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
    console.log("PANNING_INIT_CALLED (VERSIÓN CORREGIDA)");

    if (!gameBoard || !gameBoard.parentElement) {
        console.error("Error crítico de Panning: gameBoard o su contenedor no existen.");
        return;
    }

    const viewport = gameBoard.parentElement;
    let lastTouchX_pan_bm = null;
    let lastTouchY_pan_bm = null;

    // Función para aplicar la transformación y mantener el tablero dentro de los límites
    function applyTransformAndLimits() {
        const boardWidth = gameBoard.offsetWidth;
        const boardHeight = gameBoard.offsetHeight;
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;

        let targetX = currentBoardTranslateX;
        let targetY = currentBoardTranslateY;

        // Si el tablero es más ancho que la vista, limita el paneo horizontal
        if (boardWidth > viewportWidth) {
            targetX = Math.max(targetX, viewportWidth - boardWidth); // Límite izquierdo
            targetX = Math.min(targetX, 0);                         // Límite derecho
        } else {
            // Si es más angosto, céntralo
            targetX = (viewportWidth - boardWidth) / 2;
        }

        // Si el tablero es más alto que la vista, limita el paneo vertical
        if (boardHeight > viewportHeight) {
            targetY = Math.max(targetY, viewportHeight - boardHeight); // Límite superior
            targetY = Math.min(targetY, 0);                          // Límite inferior
        } else {
            // Si es menos alto, céntralo
            targetY = (viewportHeight - boardHeight) / 2;
        }
        
        currentBoardTranslateX = targetX;
        currentBoardTranslateY = targetY;
        gameBoard.style.transform = `translate(${currentBoardTranslateX}px, ${currentBoardTranslateY}px)`;
    }

    // --- Panning con Ratón ---
    gameBoard.addEventListener('mousedown', function(e) {
        if (e.button !== 0 || (typeof placementMode !== 'undefined' && placementMode.active)) return;
        e.preventDefault(); // Evita la selección de texto al arrastrar
        isPanning = true;
        boardInitialX = currentBoardTranslateX;
        boardInitialY = currentBoardTranslateY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        gameBoard.classList.add('grabbing');
    });

    document.addEventListener('mousemove', function(e) {
        if (!isPanning) return;
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        currentBoardTranslateX = boardInitialX + dx;
        currentBoardTranslateY = boardInitialY + dy;
        applyTransformAndLimits();
    });

    document.addEventListener('mouseup', function(e) {
        if (e.button !== 0) return;
        isPanning = false;
        gameBoard.classList.remove('grabbing');
    });

    // --- Panning Táctil (para móviles) ---
    gameBoard.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1 || (typeof placementMode !== 'undefined' && placementMode.active)) return;
        
        isPanning = true;
        const touch = e.touches[0];
        boardInitialX = currentBoardTranslateX;
        boardInitialY = currentBoardTranslateY;
        panStartX = touch.clientX;
        panStartY = touch.clientY;
        lastTouchX_pan_bm = touch.clientX;
        lastTouchY_pan_bm = touch.clientY;
    }, { passive: true }); // passive:true para el inicio es aceptable

    gameBoard.addEventListener('touchmove', function(e) {
        if (!isPanning || e.touches.length !== 1) return;
        
        // ¡CLAVE! Evita que el navegador desplace la página mientras movemos el tablero
        e.preventDefault(); 

        const touch = e.touches[0];
        const dx = touch.clientX - lastTouchX_pan_bm;
        const dy = touch.clientY - lastTouchY_pan_bm;
        
        currentBoardTranslateX += dx;
        currentBoardTranslateY += dy;

        applyTransformAndLimits();
        
        lastTouchX_pan_bm = touch.clientX;
        lastTouchY_pan_bm = touch.clientY;
    }, { passive: false }); // ¡CLAVE! passive:false permite llamar a preventDefault()

    gameBoard.addEventListener('touchend', function(e) {
        isPanning = false;
        lastTouchX_pan_bm = null;
        lastTouchY_pan_bm = null;
    });

    gameBoard.addEventListener('touchcancel', function(e) {
        isPanning = false;
        lastTouchX_pan_bm = null;
        lastTouchY_pan_bm = null;
    });

    console.log("BoardManager: Panning listeners (versión corregida) inicializados.");
    applyTransformAndLimits(); // Centra o posiciona el tablero al inicio
}

function createHexDOMElementWithListener(r, c) {
    console.log(`[BoardManager] Creando listener para hex (${r},${c})`);
    const hexEl = document.createElement('div');
    hexEl.classList.add('hex');
    hexEl.dataset.r = r;
    hexEl.dataset.c = c;
 
    const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
    const yPos = r * HEX_VERT_SPACING;
    hexEl.style.left = `${xPos}px`;
    hexEl.style.top = `${yPos}px`;

    hexEl.addEventListener('click', () => {
        console.log(`[HEX CLICK LISTENER] Clic detectado en listener directo para (${r},${c})`);
        onHexClick(r, c);
    });
    return hexEl;
}

// --- FUNCIÓN PARA INICIALIZAR TABLERO PARA ESCENARIOS DE CAMPAÑA ---
async function initializeGameBoardForScenario(mapTacticalData, scenarioData) {
    console.log("boardManager.js: initializeGameBoardForScenario ha sido llamada.");

    if (typeof currentBoardTranslateX !== 'undefined') currentBoardTranslateX = 0;
    if (typeof currentBoardTranslateY !== 'undefined') currentBoardTranslateY = 0;
    if (gameBoard) {
        gameBoard.style.transform = `translate(0px, 0px)`;
    }
    
    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM for scenario."); return; }
    gameBoard.innerHTML = ''; // Limpiar tablero existente

    const R = mapTacticalData.rows;
    const C = mapTacticalData.cols;

    board = Array(R).fill(null).map(() => Array(C).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para el nuevo escenario

    gameBoard.style.width = `${C * HEX_WIDTH + HEX_WIDTH / 2}px`;
    gameBoard.style.height = `${R * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

    for (let r = 0; r < R; r++) {
        for (let c = 0; c < C; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            gameBoard.appendChild(hexElement);

            let terrainType = mapTacticalData.hexesConfig?.defaultTerrain || 'plains';
            let structureType = null;
            const specificHexConfig = mapTacticalData.hexesConfig?.specificHexes?.find(h => h.r === r && h.c === c);
            if (specificHexConfig) {
                if (specificHexConfig.terrain) terrainType = specificHexConfig.terrain;
                if (specificHexConfig.structure) structureType = specificHexConfig.structure;
            }

            board[r][c] = {
                element: hexElement,
                terrain: terrainType, // Se asigna el terreno del mapa de campaña
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
        case 'min': cantidadPorTipo = 1; break;
        case 'med': cantidadPorTipo = 3; break;
        case 'max': cantidadPorTipo = 5; break;
        default:    cantidadPorTipo = 1;
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
        if (unit.element && !unit.element.parentElement && gameBoard) {
            gameBoard.appendChild(unit.element);
        }
        if (typeof positionUnitElement === "function") positionUnitElement(unit); else console.warn("positionUnitElement no definida");
        if (typeof updateUnitStrengthDisplay === "function") updateUnitStrengthDisplay(unit); else console.warn("updateUnitStrengthDisplay no definida");
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
