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