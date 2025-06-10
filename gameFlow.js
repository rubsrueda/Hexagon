// gameFlow.js
// Lógica principal del flujo del juego: turnos, fases, IA, victoria, niebla de guerra, recolección de recursos.

function handleEndTurn() {
    console.log(`[handleEndTurn] INICIO. Fase: ${gameState.currentPhase}, Jugador Actual: ${gameState.currentPlayer}`);
    if (typeof deselectUnit === "function") deselectUnit(); else console.warn("handleEndTurn: deselectUnit no definida");

    if (gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        return;
    }

    let triggerAiDeployment = false;
    let aiPlayerToDeploy = -1;
    let nextPhaseForGame = gameState.currentPhase;
    let nextPlayerForGame = gameState.currentPlayer;
    const playerEndingTurn = gameState.currentPlayer; 

    if (gameState.currentPhase === "deployment") {
        const player1Id = 1;
        const player2Id = 2;
        const limit = gameState.deploymentUnitLimit;
        let player1CanStillDeploy = gameState.playerTypes.player1 === 'human' && gameState.unitsPlacedByPlayer[player1Id] < limit;
        let player2CanStillDeploy = gameState.playerTypes.player2 === 'human' && gameState.unitsPlacedByPlayer[player2Id] < limit;
        
        if (gameState.playerTypes.player1.startsWith('ai_')) player1CanStillDeploy = false;
        if (gameState.playerTypes.player2.startsWith('ai_')) player2CanStillDeploy = false;

        if (gameState.currentPlayer === player1Id) {
            if (player1CanStillDeploy) logMessage(`Jugador 1: Aún puedes desplegar (Límite: ${limit === Infinity ? 'Ilimitado' : limit}).`);
            
            if (gameState.playerTypes.player2 === 'human') {
                if (player2CanStillDeploy) {
                    nextPlayerForGame = player2Id;
                    logMessage(`Despliegue: Turno Jugador 2. (Límite: ${limit === Infinity ? 'Ilimitado' : limit})`);
                } else {
                    nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
                }
            } else { // P2 es IA
                if (gameState.unitsPlacedByPlayer[player2Id] < limit) {
                    nextPlayerForGame = player2Id; triggerAiDeployment = true; aiPlayerToDeploy = player2Id;
                } else { 
                    nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
                }
            }
        } else { // Era turno de P2
            if (player2CanStillDeploy) logMessage(`Jugador 2: Aún puedes desplegar (Límite: ${limit === Infinity ? 'Ilimitado' : limit}).`);
            nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
        }
        gameState.currentPhase = nextPhaseForGame;
        gameState.currentPlayer = nextPlayerForGame;
        if (gameState.currentPhase === "play") {
            gameState.turnNumber = 1;
        }
    } else if (gameState.currentPhase === "play") {
        collectPlayerResources(playerEndingTurn); 

        gameState.currentPlayer = playerEndingTurn === 1 ? 2 : 1;
        if (gameState.currentPlayer === 1) {
            gameState.turnNumber++;
            logMessage(`Comienza el Turno ${gameState.turnNumber}.`);
        }
    }

    logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);

    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer) {
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.currentMovement = unit.movement;
            unit.hasRetaliatedThisTurn = false;
        }
    });

    if (gameState.currentPhase === 'play') {
        // Experiencia pasiva
        units.forEach(unit => {
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
                unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
                if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(unit);
            }
        });

        // Puntos de Investigación
        if (gameState.playerResources[gameState.currentPlayer]) {
            const baseResearchIncome = 5; 
            gameState.playerResources[gameState.currentPlayer].researchPoints = 
                (gameState.playerResources[gameState.currentPlayer].researchPoints || 0) + baseResearchIncome;
            logMessage(`Jugador ${gameState.currentPlayer} obtiene ${baseResearchIncome} Puntos de Investigación.`);
        } else { console.warn(`[ResearchPoints] No se encontraron recursos para el Jugador ${gameState.currentPlayer}.`); }

        // Lógica de Comida y Atrición (VERSIÓN ESTRICTA PARA NO SUMINISTRADAS)
        const player = gameState.currentPlayer;
        const playerRes = gameState.playerResources[player];
        if (playerRes) {
            let foodProducedThisTurn = 0;
            if (board && board.length > 0 && board[0].length > 0 && typeof STRUCTURE_TYPES !== 'undefined') {
                for (let r_idx = 0; r_idx < board.length; r_idx++) {
                    for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
                        const hex = board[r_idx][c_idx];
                        if (hex && hex.owner === player && hex.structure) {
                            const structData = STRUCTURE_TYPES[hex.structure];
                            if (structData && typeof structData.producesFood === 'number') {
                                foodProducedThisTurn += structData.producesFood;
                            }
                        }
                    }
                }
            }
            playerRes.comida = (playerRes.comida || 0) + foodProducedThisTurn;
            if (foodProducedThisTurn > 0) {
                logMessage(`Jugador ${player} produce ${foodProducedThisTurn} comida. Comida ANTES de consumo: ${playerRes.comida}`);
            }

            let foodActuallyConsumedFromReserves = 0;
            let unitsSufferingAttrition = 0;
            let unitsDestroyedByAttrition = [];

            units.filter(u => u.player === player && u.currentHealth > 0).forEach(unit => {
                let unitConsumption = 0;
                if (unit.regiments && unit.regiments.length > 0 && typeof REGIMENT_TYPES !== 'undefined') {
                    unit.regiments.forEach(reg => { 
                        const rd = REGIMENT_TYPES[reg.type]; 
                        if (rd && typeof rd.foodConsumption === 'number') unitConsumption += rd.foodConsumption;
                    });
                } else if (typeof unit.foodConsumption === 'number') { unitConsumption = unit.foodConsumption; } 
                else { unitConsumption = 1; }

                const supplied = (typeof isHexSupplied === "function") ? isHexSupplied(unit.r, unit.c, player) : true;

                if (supplied) {
                    if (playerRes.comida >= unitConsumption) {
                        playerRes.comida -= unitConsumption;
                        foodActuallyConsumedFromReserves += unitConsumption;
                    } else {
                        unit.currentHealth -= (ATTRITION_DAMAGE_PER_TURN || 1);
                        unitsSufferingAttrition++;
                        logMessage(`¡${unit.name} (suministrada) sufre atrición por hambruna! Pierde ${(ATTRITION_DAMAGE_PER_TURN || 1)} salud.`);
                        if (unit.currentHealth <= 0) unitsDestroyedByAttrition.push(unit.id);
                        else if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unit);
                    }
                } else { 
                    unit.currentHealth -= (ATTRITION_DAMAGE_PER_TURN || 1);
                    unitsSufferingAttrition++;
                    logMessage(`¡${unit.name} (no suministrada) sufre atrición! Pierde ${(ATTRITION_DAMAGE_PER_TURN || 1)} salud.`);
                    if (unit.currentHealth <= 0) unitsDestroyedByAttrition.push(unit.id);
                    else if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unit);
                }
            });

            unitsDestroyedByAttrition.forEach(unitId => {
                const unit = units.find(u => u.id === unitId);
                if (unit) {
                    if (unit.element && unit.element.parentElement) unit.element.remove();
                    const index = units.findIndex(u => u.id === unit.id);
                    if (index > -1) units.splice(index, 1);
                    if (board[unit.r]?.[unit.c]?.unit?.id === unit.id) board[unit.r][unit.c].unit = null;
                    if (selectedUnit && selectedUnit.id === unit.id) {
                        if(typeof deselectUnit === "function") deselectUnit();
                        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
                    }
                }
            });

            if (foodActuallyConsumedFromReserves > 0 || unitsSufferingAttrition > 0) {
                logMessage(`Comida consumida: ${foodActuallyConsumedFromReserves}. Comida final Jugador ${player}: ${playerRes.comida}.`);
                if (unitsSufferingAttrition > 0) logMessage(`${unitsSufferingAttrition} unidad(es) sufrieron atrición.`);
            }
            if (playerRes.comida < 0) playerRes.comida = 0;
        }
    }
    
    if (nextPhaseForGame === "play" && gameState.currentPhase === "play" && gameState.turnNumber === 1 && gameState.currentPlayer === 1) {
        logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays();
    } else { console.error("handleEndTurn Error: UIManager.updateAllUIDisplays no está definida."); }

    // --- LÓGICA DE IA Y COMPROBACIÓN DE VICTORIA ---
    const playerForAICheck = `player${gameState.currentPlayer}`;
    const playerTypeForAICheck = gameState.playerTypes[playerForAICheck];
    console.log(`[handleEndTurn AI CHECK] Fase: ${gameState.currentPhase}, CurrentPlayer: ${gameState.currentPlayer}, PlayerTypeString: "${playerForAICheck}", PlayerTypeValue: "${playerTypeForAICheck}", StartsWithAI: ${playerTypeForAICheck?.startsWith('ai_')}`);

    if (triggerAiDeployment && aiPlayerToDeploy !== -1 && gameState.currentPhase === "deployment") {
        logMessage(`IA (Jugador ${aiPlayerToDeploy}) desplegando...`);
        setTimeout(() => {
            if (typeof deployUnitsAI === "function") {
                deployUnitsAI(aiPlayerToDeploy);
                if (gameState.currentPhase === "deployment" && endTurnBtn && !endTurnBtn.disabled) {
                    endTurnBtn.click();
                } else if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
            } else {
                console.error("Función deployUnitsAI no encontrada.");
                if (gameState.currentPhase === "deployment" && endTurnBtn && !endTurnBtn.disabled) endTurnBtn.click();
            }
        }, 500);
    } else if (gameState.currentPhase === 'play' && playerTypeForAICheck?.startsWith('ai_')) {
        if (typeof checkVictory === "function" && checkVictory()) { return; } 
        console.log(`[handleEndTurn] Preparando para llamar a simpleAiTurn para Jugador ${gameState.currentPlayer}`);
        setTimeout(simpleAiTurn, 700); 
    } else if (gameState.currentPhase === 'play') { 
        if (typeof checkVictory === "function") checkVictory();
    }
}

function collectPlayerResources(playerNum) {
    if (!gameState.playerResources[playerNum]) {
        console.warn(`[collectPlayerResources] No se encontraron datos de recursos para el jugador ${playerNum}.`);
        return;
    }

    const playerRes = gameState.playerResources[playerNum];
    const playerTechs = playerRes.researchedTechnologies || [];
    let logItems = []; // Usaremos un array para construir el mensaje final de ingresos

    // --- INGRESOS DE ORO BASE POR CIUDADES --- (Tu código original)
    let oroDeCiudadesBase = 0;
    gameState.cities.forEach(city => {
        if (city.owner === playerNum && board[city.r]?.[city.c]) {
            const ingresoCiudadBase = board[city.r][city.c].isCapital ? 7 : 5;
            oroDeCiudadesBase += ingresoCiudadBase;
        }
    });
    // === INTEGRACIÓN DE BONUS DE PROSPECCIÓN PARA ORO DE CIUDADES ===
    // Si la prospección afecta el oro base de ciudades.
    if (playerTechs.includes('PROSPECTING')) {
        // Asumimos que cada ciudad genera 1 oro extra si tienes prospección.
        oroDeCiudadesBase += (gameState.cities.filter(c => c.owner === playerNum).length * 1); 
    }
    // ================================================================

    if (oroDeCiudadesBase > 0) {
        playerRes.oro = (playerRes.oro || 0) + oroDeCiudadesBase;
        logItems.push(`+${oroDeCiudadesBase} Oro (ciudades)`);
    }

    // --- INGRESOS DE NODOS DE RECURSOS CON MULTIPLICADORES Y ORO POR HEXÁGONO CONTROLADO ---
    let oroPorTerritorioControlado = 0;
    const currentRows = board.length;
    const currentCol = board[0] ? board[0].length : 0;

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCol; c++) {
            const hexData = board[r]?.[c];

            if (hexData && hexData.owner === playerNum) {
                // ORO POR HEXÁGONO CONTROLADO (Tu código original + bonus de prospección)
                if (!hexData.isCity) {
                    let oroHex = 1;
                    let motivoOroHex = "(territorio)";
                    if (hexData.structure === "Fortaleza") {
                        oroHex = 3;
                        motivoOroHex = "(territorio con Fortaleza)";
                    } else if (hexData.structure === "Camino") {
                        oroHex = 2;
                        motivoOroHex = "(territorio con Camino)";
                    }
                    // === INTEGRACIÓN DE BONUS DE PROSPECCIÓN PARA ORO DE TERRITORIO ===
                    if (playerTechs.includes('PROSPECTING')) {
                        oroHex += 1; // Añadir +1 si la prospección afecta este tipo de oro también
                    }
                    // ================================================================
                    oroPorTerritorioControlado += oroHex;
                }

                // Nodos de recursos (Tu código original + bonus de tecnología)
                if (hexData.resourceNode && RESOURCE_NODES_DATA[hexData.resourceNode]) {
                    const nodeInfo = RESOURCE_NODES_DATA[hexData.resourceNode];
                    let baseIncomeForNode = nodeInfo.income || 0; // Ingreso base original del nodo
                    
                    // === BONUS POR TECNOLOGÍA ESPECÍFICA DEL NODO ===
                    let techBonus = 0;
                    const resourceType = hexData.resourceNode; // Ej: 'oro_mina', 'comida', 'hierro'
                    if (resourceType === 'oro_mina' && playerTechs.includes('PROSPECTING')) techBonus = 1;
                    if (resourceType === 'comida' && playerTechs.includes('SELECTIVE_BREEDING')) techBonus = 1;
                    if (resourceType === 'madera' && playerTechs.includes('FORESTRY')) techBonus = 1;
                    if (resourceType === 'piedra' && playerTechs.includes('MASONRY')) techBonus = 1;
                    if (resourceType === 'hierro' && playerTechs.includes('IRON_WORKING')) techBonus = 1;
                    
                    // Sumar el bonus tecnológico al ingreso base del nodo ANTES del multiplicador
                    baseIncomeForNode += techBonus;
                    
                    // === MULTIPLICADORES POR ESTRUCTURA === (Tu código original)
                    let incomeAfterMultipliers = baseIncomeForNode; // Empezamos con el ingreso base + techBonus
                    let multiplier = 1;
                    let infrastructureDescription = ""; // Para el log
                    
                    if (hexData.isCity) {
                        multiplier = RESOURCE_MULTIPLIERS.CIUDAD || 1;
                        infrastructureDescription = ` (Ciudad x${multiplier})`;
                    } else if (hexData.structure === "Fortaleza") {
                        multiplier = RESOURCE_MULTIPLIERS.FORTALEZA || 1;
                        infrastructureDescription = ` (Fortaleza x${multiplier})`;
                    } else if (hexData.structure === "Camino") {
                        multiplier = RESOURCE_MULTIPLIERS.CAMINO || 1;
                        infrastructureDescription = ` (Camino x${multiplier})`;
                    }
                    incomeAfterMultipliers *= multiplier; // Aplicar el multiplicador
                    
                    // === ASIGNAR RECURSO Y PREPARAR LOG ===
                    const resourceKey = resourceType.replace('_mina',''); // Convertir 'oro_mina' a 'oro'
                    playerRes[resourceKey] = (playerRes[resourceKey] || 0) + incomeAfterMultipliers;
                    
                    if (incomeAfterMultipliers > 0) {
                        // Construir el mensaje de log detallado
                        let logText = `+${incomeAfterMultipliers} ${nodeInfo.name}`;
                        if (techBonus > 0 || multiplier > 1) {
                            logText += ` [Base:${nodeInfo.income}`; // Ingreso base original del nodo
                            if (techBonus > 0) logText += ` +${techBonus}t`; // Si hay bonus tech
                            if (multiplier > 1) logText += `${infrastructureDescription}`; // Si hay multiplicador
                            logText += `]`;
                        }
                        logItems.push(logText);
                    }
                }
            }
        }
    }

    if (oroPorTerritorioControlado > 0) {
        playerRes.oro = (playerRes.oro || 0) + oroPorTerritorioControlado;
        logItems.push(`+${oroPorTerritorioControlado} Oro (territorio)`);
    }

    // --- LLAMAR A logMessage SOLO SI HAY ALGO QUE REPORTAR ---
    if (logItems.length > 0) {
        const message = `Ingresos J${playerNum}: ${logItems.join(', ')}`;
        logMessage(message);
    }
}

function updateFogOfWar() {
    if (!board || board.length === 0) return; // board de state.js

    // Usar las dimensiones del tablero actual
    const currentRows = board.length;
    const currentCol = board[0] ? board[0].length : 0;

    const isDeploymentOrSetup = gameState.currentPhase === "deployment" || gameState.currentPhase === "setup";

    for (let r = 0; r < currentRows; r++) {
        for (let c = 0; c < currentCol; c++) {
            const hexData = board[r]?.[c];
            if (!hexData || !hexData.element) continue;
            const hexElement = hexData.element;
            const unitOnThisHex = getUnitOnHex(r, c); // getUnitOnHex de utils.js

            hexElement.classList.remove('fog-hidden', 'fog-partial');
            if (unitOnThisHex && unitOnThisHex.element) {
                unitOnThisHex.element.style.display = 'none';
                unitOnThisHex.element.classList.remove('player-controlled-visible');
            }

            if (isDeploymentOrSetup) {
                hexData.visibility.player1 = 'visible';
                hexData.visibility.player2 = 'visible';
                if (unitOnThisHex && unitOnThisHex.element) unitOnThisHex.element.style.display = 'flex';
            } else if (gameState.currentPhase === "play") {
                const playerKey = `player${gameState.currentPlayer}`;
                if (hexData.visibility[playerKey] === 'visible') {
                    hexData.visibility[playerKey] = 'partial';
                }
            }
        }
    }

    if (gameState.currentPhase === "play") {
        const playerKey = `player${gameState.currentPlayer}`;
        const visionSources = [];
        units.forEach(unit => { // units de state.js
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0 && unit.r !== -1) {
                visionSources.push({r: unit.r, c: unit.c, range: unit.visionRange});
            }
        });
        gameState.cities.forEach(city => { // gameState.cities de state.js
            if (city.owner === gameState.currentPlayer && board[city.r]?.[city.c]) {
                let range = board[city.r][city.c].isCapital ? 2 : 1;
                if (board[city.r][city.c].structure === 'Fortaleza') range = Math.max(range, 3);
                visionSources.push({r: city.r, c: city.c, range: range });
            }
        });

        visionSources.forEach(source => {
            for (let r_scan = 0; r_scan < currentRows; r_scan++) {
                for (let c_scan = 0; c_scan < currentCol; c_scan++) {
                    if (hexDistance(source.r, source.c, r_scan, c_scan) <= source.range) { // hexDistance de utils.js
                        if(board[r_scan]?.[c_scan]) board[r_scan][c_scan].visibility[playerKey] = 'visible';
                    }
                }
            }
        });

        for (let r = 0; r < currentRows; r++) {
            for (let c = 0; c < currentCol; c++) {
                const hexData = board[r]?.[c];
                if (!hexData || !hexData.element) continue;
                const hexVisStatus = hexData.visibility[playerKey];
                const unitOnThisHex = getUnitOnHex(r,c);

                if (hexVisStatus === 'hidden') {
                    hexData.element.classList.add('fog-hidden');
                } else if (hexVisStatus === 'partial') {
                    hexData.element.classList.add('fog-partial');
                    if (unitOnThisHex && unitOnThisHex.player === gameState.currentPlayer && unitOnThisHex.element) {
                        unitOnThisHex.element.style.display = 'flex';
                        unitOnThisHex.element.classList.add('player-controlled-visible');
                    }
                } else { // 'visible'
                    if (unitOnThisHex && unitOnThisHex.element) {
                        unitOnThisHex.element.style.display = 'flex';
                        if (unitOnThisHex.player === gameState.currentPlayer) {
                            unitOnThisHex.element.classList.add('player-controlled-visible');
                        }
                    }
                }
            }
        }
    }
}

function checkVictory() {
    if (gameState.currentPhase !== 'play') return false;

    let winner = null; // 1 para jugador humano, 2 para IA u oponente

    // --- 1. Condiciones de Victoria/Derrota Específicas del Escenario ---
    if (gameState.isCampaignBattle && gameState.currentScenarioData) {
        const scenario = gameState.currentScenarioData;
        const playerHuman = 1; // Asumimos que el jugador humano es siempre el jugador 1
        const enemyPlayer = 2; // Asumimos que el oponente IA es jugador 2 (esto podría necesitar ser más flexible)

        // Chequear condiciones de victoria del jugador
        if (scenario.victoryConditions) {
            for (const condition of scenario.victoryConditions) {
                if (condition.type === "eliminate_all_enemies") {
                    if (!units.some(u => u.player === enemyPlayer && u.currentHealth > 0)) {
                        winner = playerHuman;
                        logMessage(`¡Condición de victoria: Enemigos eliminados! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de victoria del escenario
                // else if (condition.type === "capture_hex") { ... }
                // else if (condition.type === "survive_turns") { ... }
            }
        }
        if (winner) { // Si ya ganó el jugador
            endTacticalBattle(winner);
            return true;
        }

        // Chequear condiciones de derrota del jugador (victoria del enemigo)
        if (scenario.lossConditions) {
            for (const condition of scenario.lossConditions) {
                if (condition.type === "player_capital_lost") {
                    const playerCapitalCity = gameState.cities.find(c => c.isCapital && c.ownerOriginal === playerHuman); // Necesitaríamos 'ownerOriginal' o una forma de saber cuál era la capital del jugador
                    // O usar la info del mapa:
                    const pCapR = gameState.currentMapData?.playerCapital?.r;
                    const pCapC = gameState.currentMapData?.playerCapital?.c;
                    if (typeof pCapR !== 'undefined' && board[pCapR]?.[pCapC]?.owner === enemyPlayer) {
                        winner = enemyPlayer;
                        logMessage(`Condición de derrota: ¡Capital del jugador capturada! Jugador ${winner} gana.`);
                        break;
                    }
                }
                // TODO: Implementar más tipos de condiciones de derrota del escenario
                // else if (condition.type === "time_limit_exceeded") { ... }
            }
        }
        if (winner) { // Si ya perdió el jugador (ganó el enemigo)
            endTacticalBattle(winner);
            return true;
        }
    }

    // --- 2. Condiciones de Victoria/Derrota Genéricas (si no es campaña o no se cumplieron las específicas) ---
    // Solo si no se ha determinado un ganador por condiciones de escenario
    if (!winner) {
        let p1CapitalOwner = null;
        let p2CapitalOwner = null; // p2 puede ser IA u otro humano

        // Intentar identificar capitales de forma más genérica o basada en el mapa actual
        const playerCapitalInfo = gameState.currentMapData?.playerCapital;
        const enemyCapitalInfo = gameState.currentMapData?.enemyCapital;

        gameState.cities.forEach(city => {
            if (city.isCapital && board[city.r]?.[city.c]) {
                const currentOwner = board[city.r][city.c].owner;
                if (playerCapitalInfo && city.r === playerCapitalInfo.r && city.c === playerCapitalInfo.c) {
                    p1CapitalOwner = currentOwner;
                } else if (enemyCapitalInfo && city.r === enemyCapitalInfo.r && city.c === enemyCapitalInfo.c) {
                    p2CapitalOwner = currentOwner;
                } else { // Fallback para escaramuzas si los nombres de capitales no coinciden con mapData
                    if (city.name.toLowerCase().includes("p1") || (city.ownerOriginal === 1 && !enemyCapitalInfo)) { // Asume que p1 es el nombre para capital P1 en escaramuza
                        p1CapitalOwner = currentOwner;
                    } else if (city.name.toLowerCase().includes("p2") || (city.ownerOriginal === 2 && !playerCapitalInfo) ) {
                        p2CapitalOwner = currentOwner;
                    }
                }
            }
        });
        
        if (p1CapitalOwner !== null && p1CapitalOwner === 2) winner = 2; // IA/P2 capturó capital de P1
        if (p2CapitalOwner !== null && p2CapitalOwner === 1) winner = 1; // P1 capturó capital de IA/P2


        if (winner) {
            logMessage(`¡JUGADOR ${winner} GANA AL CAPTURAR LA CAPITAL ENEMIGA!`);
        } else {
            // Victoria por eliminación total (si no hay captura de capital)
            const player1HasUnits = units.some(u => u.player === 1 && u.currentHealth > 0);
            // Determinar quién es el jugador 2 (puede ser IA o humano en escaramuza)
            const player2Id = (gameState.playerTypes.player2 === 'human') ? 2 : 2; // Asumimos IA es jugador 2 por ahora
            const player2HasUnits = units.some(u => u.player === player2Id && u.currentHealth > 0);

            const player1EverHadUnits = units.some(u => u.player === 1);
            const player2EverHadUnits = units.some(u => u.player === player2Id);

            if (player1EverHadUnits && !player1HasUnits && player2HasUnits) {
                winner = player2Id;
                logMessage(`¡JUGADOR ${winner} GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR 1!`);
            } else if (player2EverHadUnits && !player2HasUnits && player1HasUnits) {
                winner = 1;
                logMessage(`¡JUGADOR 1 GANA POR ELIMINACIÓN TOTAL DE UNIDADES DEL JUGADOR ${player2Id}!`);
            }
        }
    }

    if (winner) {
        endTacticalBattle(winner); // Llamar a la función centralizada de fin de batalla
        return true;
    }
    return false;
}

// Función para centralizar el fin de una batalla táctica
function endTacticalBattle(winningPlayerNumber) {
    if (gameState.currentPhase === "gameOver") {
        console.warn("[endTacticalBattle] La batalla ya había terminado. Saliendo.");
        return; // Evitar múltiples ejecuciones si checkVictory se llama varias veces
    }
    logMessage(`Fin de la batalla. Jugador ${winningPlayerNumber} es el vencedor.`);
    gameState.currentPhase = "gameOver";
    gameState.winner = winningPlayerNumber;

    // --- AÑADIR LÓGICA DE BONUS DE ORO POR VICTORIA ---
    let goldBonus = 0;
    let victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado la batalla!`;

    if (gameState.isCampaignBattle && gameState.currentScenarioData && typeof gameState.currentScenarioData.victoryGoldBonus === 'number') {
        goldBonus = gameState.currentScenarioData.victoryGoldBonus;
        victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado el escenario y recibe un bonus de ${goldBonus} de oro!`;
    } else if (!gameState.isCampaignBattle) { // Es una escaramuza
        // Asegúrate de que SKIRMISH_VICTORY_GOLD_BONUS esté definido en constants.js
        goldBonus = (typeof SKIRMISH_VICTORY_GOLD_BONUS !== 'undefined') ? SKIRMISH_VICTORY_GOLD_BONUS : 50; 
        victoryMessage = `¡Jugador ${winningPlayerNumber} ha ganado la escaramuza y recibe un bonus de ${goldBonus} de oro!`;
    }

    if (goldBonus > 0) {
        if (gameState.playerResources[winningPlayerNumber]) {
            gameState.playerResources[winningPlayerNumber].oro = (gameState.playerResources[winningPlayerNumber].oro || 0) + goldBonus;
        } else {
            console.warn(`[endTacticalBattle] No se encontraron recursos para el jugador ganador ${winningPlayerNumber}`);
        }
    }
    if (typeof logMessage === "function") {
        logMessage(victoryMessage);
    }
    // --- FIN LÓGICA DE BONUS DE ORO ---

    if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') {
        UIManager.updateAllUIDisplays();
    } else { /* ... fallback ... */ }

    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function'){
        UIManager.hideContextualPanel();
    }

    // Mostrar un resumen de la partida (Tarea B10) - Lo dejamos pendiente por ahora
    // if (typeof UIManager !== 'undefined' && UIManager.showGameSummaryModal) { 
    //     UIManager.showGameSummaryModal(winningPlayerNumber, goldBonus);
    // } else {
         // alert(victoryMessage); // Movido el alert para que no se repita si hay modal
    // }
    if (!gameState.isCampaignBattle) { // Solo mostrar alert para escaramuza si no hay un flujo de campaña que lo maneje
         setTimeout(() => alert(victoryMessage), 100); // Pequeño delay para que los logs se asienten
    }


    if (gameState.isCampaignBattle) {
        if (typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
            const playerHumanWon = (winningPlayerNumber === 1);
            logMessage("Preparando para volver al mapa de campaña...");
            setTimeout(() => {
                campaignManager.handleTacticalBattleResult(playerHumanWon, gameState.currentCampaignTerritoryId, { goldEarnedFromBattle: goldBonus }); // Pasar oro como parte de los resultados
            }, 2000); // Reducido un poco el delay
        } else { /* ... error ... */ }
    } else { 
        // Para escaramuza, podrías tener un botón "Volver al Menú" en un modal de resumen
        // o simplemente dejar que el jugador cierre el alert y luego use el menú flotante.
    }
}

function simpleAiTurn() {
    console.log(`[simpleAiTurn V2] INICIO para Jugador IA ${gameState.currentPlayer}.`);

    const aiPlayerIdString = `player${gameState.currentPlayer}`;
    const aiActualPlayerNumber = gameState.currentPlayer;
    const aiLevel = gameState.playerAiLevels?.[aiPlayerIdString] || 'normal';

    if (gameState.currentPhase !== 'play' || !gameState.playerTypes[aiPlayerIdString]?.startsWith('ai_')) {
        console.warn(`[simpleAiTurn V2] No es turno de IA activa o tipo/fase incorrecta. Fase: ${gameState.currentPhase}, Tipo jugador ("${aiPlayerIdString}"): ${gameState.playerTypes[aiPlayerIdString]}. Terminando turno IA si es posible.`);
        // No llamar a endTurnBtn.click() aquí directamente, AiManager lo gestionará si fue su turno.
        // Si esta condición se da ANTES de que AiManager.executeTurn sea llamado,
        // significa que handleEndTurn ya debería haber pasado al siguiente jugador o fase.
        return;
    }

    if (typeof AiManager === 'undefined' || typeof AiManager.executeTurn !== 'function') {
        console.error("[simpleAiTurn V2] AiManager no está definido o AiManager.executeTurn no es una función. La IA no puede actuar. Forzando fin de turno.");
        logMessage("Error crítico: IA no disponible. Pasando turno.");
        if (typeof endTurnBtn !== 'undefined' && endTurnBtn && !endTurnBtn.disabled) {
            endTurnBtn.click();
        }
        return;
    }

    logMessage(`IA (Jugador ${aiActualPlayerNumber}, Nivel: ${aiLevel}) inicia su turno... (Usando AiManager)`);

    AiManager.executeTurn(aiActualPlayerNumber, aiLevel);

    console.log(`[simpleAiTurn V2] AiManager.executeTurn ha sido invocado para Jugador ${aiActualPlayerNumber}. simpleAiTurn ha finalizado su ejecución.`);
}