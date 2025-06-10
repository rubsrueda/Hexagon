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

    // Reseteo de variables de paneo globales (asumiendo que están en domElements.js o son globales)
    if (typeof currentBoardTranslateX !== 'undefined') currentBoardTranslateX = 0;
    if (typeof currentBoardTranslateY !== 'undefined') currentBoardTranslateY = 0;
    if (gameBoard) {
        gameBoard.style.transform = `translate(0px, 0px)`;
    }

    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM."); return; }
    gameBoard.innerHTML = ''; // Limpiar tablero existente

    // Usar constantes globales BOARD_ROWS y BOARD_COLS para escaramuza
    board = Array(B_ROWS).fill(null).map(() => Array(B_COLS).fill(null));
    gameState.cities = []; // Limpiar ciudades del estado global para una nueva partida

    gameBoard.style.width = `${B_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`;
    gameBoard.style.height = `${B_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

    for (let r = 0; r < B_ROWS; r++) {
        for (let c = 0; c < B_COLS; c++) {
            const hexElement = createHexDOMElementWithListener(r, c);
            gameBoard.appendChild(hexElement);
            board[r][c] = {
                element: hexElement, terrain: 'plains', owner: null, structure: null,
                isCity: false, isCapital: false, resourceNode: null,
                visibility: { player1: 'visible', player2: 'visible' }, unit: null
            };
        }
    }

    if (gameState) { // Asegurarse que gameState está definido
        gameState.isCampaignBattle = false;
        gameState.currentScenarioData = null;
        gameState.currentMapData = null;
    }

    addCityToBoardData(1, 2, 1, "Capital P1 (Escaramuza)", true);
    addCityToBoardData(B_ROWS - 2, B_COLS - 3, 2, "Capital P2 (Escaramuza)", true);

    generateRandomResourceNodes(selectedResourceLevel); // Para escaramuzas

    renderFullBoardVisualState();
    updateFogOfWar(); // Aplicar niebla de guerra inicial
    initializeBoardPanning(); // LLAMADA ÚNICA AQUÍ
    console.log("boardManager.js: initializeNewGameBoardDOMAndData completada.");
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
    console.log(`[BoardManager] Creando listener para hex (${r},${c})`); // <--- NUEVO LOG
    const hexEl = document.createElement('div');
    hexEl.classList.add('hex');
    hexEl.dataset.r = r;
    hexEl.dataset.c = c;
 
    // Asumimos que HEX_WIDTH y HEX_VERT_SPACING son constantes globales de constants.js
    const xPos = c * HEX_WIDTH + (r % 2 !== 0 ? HEX_WIDTH / 2 : 0);
    const yPos = r * HEX_VERT_SPACING;
    hexEl.style.left = `${xPos}px`;
    hexEl.style.top = `${yPos}px`;

    // ... (posicionamiento) ...
    hexEl.addEventListener('click', () => {
        console.log(`[HEX CLICK LISTENER] Clic detectado en listener directo para (${r},${c})`); // <--- NUEVO LOG
        onHexClick(r, c);
    });
    return hexEl;
}

// --- FUNCIÓN PARA INICIALIZAR TABLERO PARA ESCENARIOS DE CAMPAÑA ---
async function initializeGameBoardForScenario(mapTacticalData, scenarioData) {
    console.log("boardManager.js: initializeGameBoardForScenario ha sido llamada.");

    // Reseteo de variables de paneo globales
    if (typeof currentBoardTranslateX !== 'undefined') currentBoardTranslateX = 0;
    if (typeof currentBoardTranslateY !== 'undefined') currentBoardTranslateY = 0;
    if (gameBoard) {
        gameBoard.style.transform = `translate(0px, 0px)`;
    }
    
    if (!gameBoard) { console.error("CRITICAL: gameBoard element not found in DOM for scenario."); return; }
    gameBoard.innerHTML = ''; // Limpiar tablero existente

    const R = mapTacticalData.rows;
    const C = mapTacticalData.cols;

    // Ajustar board global al tamaño del mapa
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
        // En escenarios de 2 jugadores, el enemigo es el jugador 2
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
        addResourceNodeToBoardData(node.r, node.c, node.type);
    });

    // Colocar Unidades Iniciales Pre-desplegadas (si aplica, p.ej. para escenarios que no usan fase de 'deployment')
    // Esto es para unidades que ya están en el mapa al inicio de la batalla, NO para las que se despliegan manualmente.
    if (gameState.currentPhase !== "deployment") {
        scenarioData.playerSetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 1);
            if (unitData) placeInitialUnit(unitData);
        });
        scenarioData.enemySetup.initialUnits?.forEach(unitDef => {
            const unitData = createUnitDataObjectFromDefinition(unitDef, 2); // Asumiendo IA es jugador 2
            if (unitData) placeInitialUnit(unitData);
        });
    }

    renderFullBoardVisualState();
    updateFogOfWar();
    initializeBoardPanning(); // LLAMADA ÚNICA AQUÍ
    console.log("boardManager.js: initializeGameBoardForScenario completada.");
}

// --- FUNCIONES HELPER PARA LA INICIALIZACIÓN DE ESCENARIOS ---

// Función helper para crear el objeto de datos de una unidad a partir de una definición de escenario
// Esta función debería probablemente vivir en unitActions.js o state.js
function createUnitDataObjectFromDefinition(unitDef, player) {
    const regimentTypeData = REGIMENT_TYPES[unitDef.type];
    if (!regimentTypeData) {
        console.error(`Tipo de regimiento desconocido "${unitDef.type}" en la definición de unidad del escenario.`);
        return null;
    }

    // Crear una estructura de regimiento simplificada para la unidad
    // En tu juego, una unidad (división) se compone de múltiples regimientos.
    // Aquí, para simplificar, cada "initialUnit" podría ser una división con un solo tipo de regimiento,
    // o necesitarías una forma más compleja de definir divisiones en el JSON del escenario.
    // Por ahora, asumimos que unitDef define una división con stats basados en el tipo.
    const singleRegiment = { ...regimentTypeData, type: unitDef.type };

    return {
        id: `u${unitIdCounter++}`, // unitIdCounter de state.js
        player: player,
        name: unitDef.name || unitDef.type,
        regiments: [JSON.parse(JSON.stringify(singleRegiment))], // La unidad es una división con este "regimiento"
        attack: regimentTypeData.attack,
        defense: regimentTypeData.defense,
        maxHealth: regimentTypeData.health,
        currentHealth: regimentTypeData.health,
        movement: regimentTypeData.movement,
        currentMovement: regimentTypeData.movement,
        visionRange: regimentTypeData.visionRange,
        attackRange: regimentTypeData.attackRange,
        r: unitDef.r, // Coordenada r del escenario
        c: unitDef.c, // Coordenada c del escenario
        sprite: regimentTypeData.sprite,
        element: null, // Se creará en placeInitialUnit
        hasMoved: false, // Las unidades pre-desplegadas no han actuado
        hasAttacked: false,
    };
}

// Función helper para colocar una unidad pre-desplegada en el tablero
// Similar a placeFinalizedDivision pero adaptada para unidades iniciales
function placeInitialUnit(unitData) {
    if (!unitData || typeof unitData.r === 'undefined' || typeof unitData.c === 'undefined') {
        console.error("Datos de unidad inválidos o faltan coordenadas para placeInitialUnit", unitData);
        return;
    }
    // placeFinalizedDivision ya hace la mayor parte de esto, podríamos reutilizarla
    // o tener una versión específica. Por ahora, replicamos parte de su lógica.

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
        return; // No se puede continuar si el tablero no está
    }

    unitData.element = unitElement; // Asignar el elemento DOM al objeto de datos

    const targetHexData = board[unitData.r]?.[unitData.c];
    if (targetHexData) {
        if (targetHexData.unit) {
            console.warn(`Conflicto al colocar unidad: ${unitData.name} en (${unitData.r},${unitData.c}). Ya hay una unidad: ${targetHexData.unit.name}. La nueva unidad no se colocará.`);
            unitElement.remove(); // Quitar el elemento del DOM si no se puede colocar
            return;
        }
        targetHexData.unit = unitData; // Asignar la unidad al hexágono en el 'board'
        // Asegurar que el hexágono obtiene la propiedad del jugador de la unidad
        if (targetHexData.owner !== unitData.player) {
            targetHexData.owner = unitData.player;
            // No es necesario llamar a renderSingleHexVisuals aquí, renderFullBoardVisualState lo hará.
        }
    } else {
        console.error(`Error al colocar unidad inicial: hexágono destino (${unitData.r},${unitData.c}) no existe en 'board'.`);
        unitElement.remove();
        return;
    }

    units.push(unitData); // Añadir al array global de unidades (de state.js)
    // positionUnitElement(unitData) se llamará en renderFullBoardVisualState
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

    const resourceTypesArray = Object.keys(RESOURCE_NODES_DATA); // RESOURCE_NODES_DATA de constants.js
    const occupiedBySetup = new Set();

    gameState.cities.forEach(city => {
        if (city.isCapital) {
            occupiedBySetup.add(`${city.r}-${city.c}`);
        }
    });

    resourceTypesArray.forEach(type => {
        let countPlaced = 0;
        let attempts = 0;
        // Usar las dimensiones actuales del tablero si están disponibles, sino las globales
        const currentBoardRows = board.length || BOARD_ROWS;
        const currentBoardCols = board[0]?.length || BOARD_COLS;
        const maxAttemptsPerType = currentBoardRows * currentBoardCols * 2;

        while (countPlaced < cantidadPorTipo && attempts < maxAttemptsPerType) {
            const r_rand = Math.floor(Math.random() * currentBoardRows);
            const c_rand = Math.floor(Math.random() * currentBoardCols);
            const hexKey = `${r_rand}-${c_rand}`;

            if (board[r_rand]?.[c_rand] &&
                !board[r_rand][c_rand].resourceNode &&
                !board[r_rand][c_rand].isCity &&
                !occupiedBySetup.has(hexKey) ) {

                let tooCloseToCapital = false;
                gameState.cities.forEach(city => {
                    if (city.isCapital && hexDistance(city.r, city.c, r_rand, c_rand) <= 2) { // hexDistance de utils.js
                        tooCloseToCapital = true;
                    }
                });
                // Ajustar la comprobación de borde a las dimensiones actuales
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
        // Solo añadir a gameState.cities si no existe ya una ciudad en esas coordenadas
        // Esto es importante porque initializeGameBoardForScenario y initializeNewGameBoardDOMAndData
        // ambas llaman a esta función y no queremos duplicados si gameState.cities no se limpia adecuadamente.
        // gameState.cities debería limpiarse al inicio de cada inicialización de tablero.
        if (!gameState.cities.some(city => city.r === r && city.c === c)) {
            gameState.cities.push({ r, c, owner, name, isCapital });
        } else {
            // Actualizar la ciudad existente si es necesario (ej. cambio de dueño o nombre)
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
    // Usar las dimensiones reales del array 'board'
    const currentRows = board.length;
    const currentCols = board[0] ? board[0].length : 0;

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCols; c++) {
            if (board[r] && board[r][c]) { // Comprobar que el hexágono existe
                renderSingleHexVisuals(r, c);
            }
        }
    }
    units.forEach(unit => { // units de state.js
        if (unit.element && !unit.element.parentElement && gameBoard) {
            gameBoard.appendChild(unit.element);
        }
        // positionUnitElement y updateUnitStrengthDisplay deberían estar en unitActions.js o uiUpdates.js
        // pero si están aquí y funcionan, las dejamos por ahora. Idealmente, boardManager
        // solo se encarga del tablero, no de las unidades directamente.
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

    hexEl.classList.add(hexData.terrain);
    if (hexData.owner) hexEl.classList.add(`player${hexData.owner}-owner`);
    if (hexData.isCity) hexEl.classList.add('city');
    if (hexData.isCapital) hexEl.classList.add('capital-city');

    if (hexData.resourceNode) {
        const resourceClassKey = hexData.resourceNode.replace('_mina', '');
        hexEl.classList.add(`resource-${resourceClassKey}`);
    }

    let structureSpriteEl = hexEl.querySelector('.structure-sprite');
    if (hexData.structure && STRUCTURE_TYPES[hexData.structure]) { // STRUCTURE_TYPES de constants.js
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