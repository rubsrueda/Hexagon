// unit_Actions.js
// Lógica relacionada con las acciones de las unidades (selección, movimiento, ataque, colocación).
// VERSIÓN CORREGIDA PARA USAR 'attackRange' consistentemente

console.log("unit_Actions.js CARGADO (Corregido para usar 'attackRange')");

// ---------------------------------------------------------------------------------
// OBTENER VECINOS DE HEXÁGONO (¡CRUCIAL!)
// ---------------------------------------------------------------------------------

function getHexNeighbors(r, c) {
    // La matriz de direcciones define los 6 posibles desplazamientos de los vecinos.
    // Esta estructura es para un sistema de coordenadas "odd-r" donde las filas impares se desplazan.
    const neighbor_directions = [
        // Par (r % 2 === 0)
        [ {r: 0, c: +1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: 0, c: -1}, {r: +1, c: -1}, {r: +1, c: 0} ],
        // Impar (r % 2 !== 0)
        [ {r: 0, c: +1}, {r: -1, c: +1}, {r: -1, c: 0}, {r: 0, c: -1}, {r: +1, c: 0}, {r: +1, c: +1} ]
    ];

    // Selecciona el conjunto de direcciones correcto basado en si la fila es par o impar.
    const directions = neighbor_directions[r % 2];
    const neighbors = [];

    // Calcula la coordenada de cada vecino y la añade al array.
    for (const dir of directions) {
        neighbors.push({ r: r + dir.r, c: c + dir.c });
    }

    // Filtra para devolver solo coordenadas que existen realmente en el tablero.
    return neighbors.filter(n =>
        board && board.length > 0 && n.r >= 0 && n.r < board.length &&
        board[0] && n.c >= 0 && n.c < board[0].length
    );
}

// ---------------------------------------------------------------------------------
// LÓGICA DE DISTANCIA HEXAGONAL
// ---------------------------------------------------------------------------------
function getHexDistance(startCoords, endCoords) {
    if (!startCoords || !endCoords) return Infinity;
    if (startCoords.r === endCoords.r && startCoords.c === endCoords.c) return 0;

    let queue = [{ r: startCoords.r, c: startCoords.c, dist: 0 }];
    let visited = new Set();
    visited.add(`${startCoords.r},${startCoords.c}`);
    // Usar el attackRange de la unidad de inicio si está disponible para optimizar la búsqueda
    const maxDistanceToSearch = startCoords.attackRange ? startCoords.attackRange + 2 : 30; // +2 para holgura
    let iterations = 0;

    while(queue.length > 0 && iterations < maxDistanceToSearch * 7) { 
        iterations++;
        let curr = queue.shift();
        if (curr.r === endCoords.r && curr.c === endCoords.c) return curr.dist;
        if (curr.dist >= maxDistanceToSearch) continue;

        let neighbors = getHexNeighbors(curr.r, curr.c);
        for (const n of neighbors) {
            const key = `${n.r},${n.c}`;
            if (!visited.has(key)) {
                visited.add(key);
                queue.push({ r: n.r, c: n.c, dist: curr.dist + 1});
            }
        }
    }
    return Infinity; 
}

// ---------------------------------------------------------------------------------
// ACCIONES DE COLOCACIÓN DE UNIDADES
// ---------------------------------------------------------------------------------
function handlePlacementModeClick(r, c) {
    // ... (sin cambios en esta función respecto al uso de 'range' vs 'attackRange', ya que se enfoca en colocar)
    // Asegúrate que la unidad en placementMode.unitData tenga 'attackRange' si es necesario
    // para alguna lógica DENTRO de placeFinalizedDivision o al crear la unidad.
    console.log(`[Placement] Clic en (${r},${c}). placementMode.active=${placementMode.active}, Unidad: ${placementMode.unitData ? placementMode.unitData.name : 'Ninguna'}`);
    const hexData = board[r]?.[c];
    if (!hexData) {
        console.error("[Placement] Hex data no encontrada.");
        if (typeof logMessage === "function") logMessage("Hexágono inválido.");
        return;
    }

    const unitToPlace = placementMode.unitData;
    if (!unitToPlace) {
        console.error("[Placement] No hay unitData. Desactivando modo.");
        placementMode.active = false;
        placementMode.unitData = null;
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        return;
    }
    console.log("[Placement] Intentando colocar:", unitToPlace.name, "en fase:", gameState.currentPhase);

    let canPlace = !getUnitOnHex(r, c);
    let reasonForNoPlacement = canPlace ? "" : "Ya hay una unidad.";
    let forceCancelAndRefund = false;

    if (gameState.currentPhase === "deployment") {
        if (hexData.owner !== null && hexData.owner !== gameState.currentPlayer) {
            if (canPlace) reasonForNoPlacement = "No en territorio enemigo.";
            canPlace = false;
        }
        if (canPlace && gameState.isCampaignBattle && gameState.currentScenarioData?.playerSetup?.startHexes) {
            const playerStartZones = gameState.currentScenarioData.playerSetup.startHexes;
            if (playerStartZones && playerStartZones.length > 0) {
                if (!playerStartZones.some(zone => zone.r === r && zone.c === c)) {
                    if (canPlace) reasonForNoPlacement = "Solo en zonas de inicio designadas.";
                    canPlace = false;
                }
            }
        }
    } else if (gameState.currentPhase === "play") {
        let isRecruitmentHex = hexData.owner === gameState.currentPlayer && (hexData.isCity || hexData.structure === "Fortaleza");
        if (!isRecruitmentHex) {
            reasonForNoPlacement = canPlace ? "Solo en ciudades/fortalezas propias." : reasonForNoPlacement + " Y solo en ciudades/fortalezas propias.";
            canPlace = false;
            forceCancelAndRefund = true;
        } else if (!canPlace && isRecruitmentHex) {
            reasonForNoPlacement = "Lugar de reclutamiento ocupado.";
        }
    } else {
        reasonForNoPlacement = "Fase incorrecta: " + gameState.currentPhase;
        canPlace = false;
        forceCancelAndRefund = true;
    }

    if (canPlace) {
        placeFinalizedDivision(unitToPlace, r, c); // Pasa el unitData como está
        placementMode.active = false;
        placementMode.unitData = null;
        if (typeof logMessage === "function") logMessage(`${unitToPlace.name} colocada.`);
        if (gameState.currentPhase === "play") {
            if (typeof deselectUnit === "function") deselectUnit();
            if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
        }
        if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    } else {
        if (typeof logMessage === "function") logMessage(`No se puede colocar: ${reasonForNoPlacement}`);
        if (forceCancelAndRefund && unitToPlace) {
            if (unitToPlace.cost) {
                for (const resourceType in unitToPlace.cost) {
                    if (gameState.playerResources[gameState.currentPlayer][resourceType] !== undefined) {
                        gameState.playerResources[gameState.currentPlayer][resourceType] += unitToPlace.cost[resourceType];
                    }
                }
                if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
                if (typeof logMessage === "function") logMessage("Recursos reembolsados.");
            }
            placementMode.active = false;
            placementMode.unitData = null;
            if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
            if (typeof deselectUnit === "function") deselectUnit();
            if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
        } else {
             if (typeof logMessage === "function") logMessage("Intenta en otro hexágono.");
        }
    }
}


function placeFinalizedDivision(unitData, r, c) {
    console.log(`[PFD] Colocando ${unitData.name} en (${r},${c})`);
    if (!unitData) { console.error("[PFD] ERROR: unitData es null."); return; }

    const unitElement = document.createElement('div');
    unitElement.classList.add('unit', `player${unitData.player}`);
    unitElement.textContent = unitData.sprite || '?';
    unitElement.dataset.id = unitData.id;
    const strengthDisplay = document.createElement('div');
    strengthDisplay.classList.add('unit-strength');
    strengthDisplay.textContent = unitData.currentHealth;
    unitElement.appendChild(strengthDisplay);

    if (gameBoard && typeof gameBoard.appendChild === "function") { gameBoard.appendChild(unitElement); }
    else { console.error("[PFD] ERROR: gameBoard no disponible."); return; }

    unitData.r = r;
    unitData.c = c;
    unitData.element = unitElement;

    if (typeof unitData.movement !== 'number' || unitData.movement <= 0) {
        console.warn(`[PFD] ${unitData.name} no tiene 'movement' válido (valor: ${unitData.movement}). Asignando fallback 3.`);
        unitData.movement = 3;
    }
    if (typeof unitData.attackRange !== 'number' || unitData.attackRange < 0) {
        console.warn(`[PFD] ${unitData.name} no tiene 'attackRange' válido (valor: ${unitData.attackRange}). Asignando fallback.`);
        unitData.attackRange = (unitData.attack && unitData.attack > 0) ? 1 : 0;
    }
    unitData.currentMovement = unitData.movement;
    unitData.hasMoved = false;
    unitData.hasAttacked = false;
    console.log(`[PFD - Init] ${unitData.name}: baseMovement=${unitData.movement}, currentMovement=${unitData.currentMovement}, hasMoved=${unitData.hasMoved}, attackRange=${unitData.attackRange}`);

    const targetHexData = board[r]?.[c];
    if (targetHexData) {
        targetHexData.unit = unitData;
        if (targetHexData.owner !== unitData.player) {
            targetHexData.owner = unitData.player;
            if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(r, c);
        }
    } else { console.error(`[PFD] ERROR: Hex destino (${r},${c}) no encontrado.`); if (unitElement.parentElement) unitElement.remove(); return; }

    if (units && typeof units.push === "function") {
        units.push(unitData);
        // --- INICIO LOG DE DEBUG ---
        console.log(`[placeFinalizedDivision DEBUG] Unidad ${unitData.name} (J${unitData.player}, HP:${unitData.currentHealth}) PUSHED. Total units: ${units.length}`);
        const justAdded = units.find(u => u.id === unitData.id); // Buscar por ID para más seguridad
        if (justAdded) {
            console.log(`[placeFinalizedDivision DEBUG] Verificando: ID=${justAdded.id}, Player=${justAdded.player}, HP=${justAdded.currentHealth}, R=${justAdded.r}, C=${justAdded.c}, Nombre=${justAdded.name}`);
        } else {
            console.error(`[placeFinalizedDivision DEBUG] ERROR: No se encontró la unidad recién añadida en el array 'units'.`);
        }
        // --- FIN LOG DE DEBUG ---
    }
    else { console.error("[PFD] ERROR: Array 'units' no disponible."); return; }

    if (typeof positionUnitElement === "function") positionUnitElement(unitData);
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unitData);

    if (gameState.currentPhase === "deployment") {
        if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {1:0, 2:0};
        gameState.unitsPlacedByPlayer[unitData.player] = (gameState.unitsPlacedByPlayer[unitData.player] || 0) + 1;
        if (typeof logMessage === "function") { logMessage(`J${unitData.player} desplegó ${gameState.unitsPlacedByPlayer[unitData.player]}/${gameState.deploymentUnitLimit === Infinity ? '∞' : gameState.deploymentUnitLimit}.`); }
        if (typeof floatingCreateDivisionBtn !== 'undefined' && floatingCreateDivisionBtn && unitData.player === gameState.currentPlayer && gameState.unitsPlacedByPlayer[unitData.player] >= gameState.deploymentUnitLimit) {
            floatingCreateDivisionBtn.disabled = true;
        }
    }
}

// ---------------------------------------------------------------------------------
// SELECCIÓN Y ACCIONES DE UNIDADES EN JUEGO (usando handleActionWithSelectedUnit que retorna booleano)
// ---------------------------------------------------------------------------------

function checkAndApplyLevelUp(unit) {
    if (!unit || !XP_LEVELS) return false; // Salir si no hay unidad o XP_LEVELS
    if (XP_LEVELS[unit.level]?.nextLevelXp === 'Max') return false; // Ya está en el nivel máximo

    let newLevelAssigned = false;
    // Iterar para permitir múltiples subidas de nivel si se gana mucha XP de golpe
    while (true) {
        const currentLevelData = XP_LEVELS[unit.level];
        if (!currentLevelData || currentLevelData.nextLevelXp === 'Max') {
            break; // Nivel máximo alcanzado o datos de nivel inválidos
        }

        const xpNeededForNextLevel = currentLevelData.nextLevelXp; // XP para ALCANZAR el siguiente nivel desde el inicio de este
                                                              // OJO: Con tu estructura actual, esto es el umbral TOTAL de XP.

        // Con tu estructura de XP_LEVELS (donde nextLevelXp es el umbral para ESE nivel):
        // Necesitamos encontrar el nivel más alto que la unidad ha alcanzado con su XP actual.
        let awardedLevel = 0;
        for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
            if (XP_LEVELS[i].nextLevelXp === 'Max' && unit.experience >= XP_LEVELS[i-1]?.nextLevelXp) { // Asumiendo que el anterior a Max es el umbral de Héroe
                 awardedLevel = i;
                 break;
            }
            if (typeof XP_LEVELS[i].nextLevelXp === 'number' && unit.experience >= XP_LEVELS[i].nextLevelXp) {
                awardedLevel = i;
                break;
            }
        }
        // Si el nivel 0 tiene nextLevelXp: 0, y la unidad tiene < 50 XP, awardedLevel será 0.
        if (unit.experience < XP_LEVELS[1].nextLevelXp ) { // Si no alcanza ni para Regular
             awardedLevel = 0;
        }


        if (awardedLevel > unit.level) {
            const oldLevelData = XP_LEVELS[unit.level];
            unit.level = awardedLevel;
            const newLevelData = XP_LEVELS[unit.level];
            newLevelAssigned = true;

            // Aplicar bonificaciones (esto es un ejemplo, podrías tener más)
            // Las bonificaciones de XP_LEVELS son las TOTALES para ese nivel, no incrementales.
            // Si quisieras que fueran incrementales, la estructura de XP_LEVELS o esta lógica cambiaría.
            // Aquí asumimos que las estadísticas base de la unidad NO incluyen bonos de nivel.
            // Y que los bonos de nivel se recalculan y aplican.

            // Una forma más simple es que las stats de la unidad ya reflejen su nivel
            // y aquí solo anunciamos. O, si las recalculas:
            // unit.attack = (unidad.baseAttack || REGIMENT_TYPES[unidad.type].attack) + newLevelData.attackBonus;
            // unit.defense = (unidad.baseDefense || REGIMENT_TYPES[unidad.type].defense) + newLevelData.defenseBonus;

            if (typeof logMessage === "function") {
                logMessage(`${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
            }
            // Podrías añadir un pequeño efecto visual o sonoro.

            // Si se sube de nivel, y el nuevo nivel no es el máximo,
            // se sigue en el bucle por si la XP da para otro nivel más.
            if (newLevelData.nextLevelXp === 'Max') break;
        } else {
            // No hay más subidas de nivel con la XP actual
            break;
        }
    }

    if (newLevelAssigned) {
        // Si el panel de la unidad está visible, actualizarlo
        if (selectedUnit && selectedUnit.id === unit.id && typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(selectedUnit, true);
        }
    }
    return newLevelAssigned;
}

function mergeUnits(mergingUnit, targetUnit) { // mergingUnit es la que se mueve (A), targetUnit es la estacionaria (B)
    if (!mergingUnit || !targetUnit || mergingUnit.player !== targetUnit.player || mergingUnit.id === targetUnit.id) {
        console.error("[Merge] Condiciones inválidas para fusionar.", mergingUnit, targetUnit);
        return false; // Indicar que la acción no se completó
    }

    // Verificar si hay espacio en la unidad objetivo para más regimientos
    const availableSlotsInTarget = MAX_REGIMENTS_PER_DIVISION - (targetUnit.regiments?.length || 0);
    if (availableSlotsInTarget <= 0) {
        const msg = `${targetUnit.name} ya tiene el máximo de regimientos (${MAX_REGIMENTS_PER_DIVISION}). No se puede fusionar.`;
        logMessage(msg);
        if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) UIManager.showMessageTemporarily(msg, 3000, true);
        selectUnit(targetUnit); // Seleccionar la unidad en la que se hizo clic
        return false;
    }

    const numRegimentsToTransfer = Math.min(mergingUnit.regiments?.length || 0, availableSlotsInTarget);
    if (numRegimentsToTransfer <= 0) {
        const msg = `${mergingUnit.name} no tiene regimientos para transferir o ${targetUnit.name} no tiene espacio.`;
        logMessage(msg);
        if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) UIManager.showMessageTemporarily(msg, 3000, true);
        selectUnit(targetUnit);
        return false;
    }

    // Simulación de movimiento
    const costToReach = getMovementCost(mergingUnit, mergingUnit.r, mergingUnit.c, targetUnit.r, targetUnit.c, true);
    if (costToReach === Infinity || costToReach > (mergingUnit.currentMovement || 0)) {
        logMessage(`${mergingUnit.name} no puede alcanzar a ${targetUnit.name} para fusionarse.`);
        return false;
    }

    // Confirmación
    if (!window.confirm(`¿Fusionar ${mergingUnit.name} con ${targetUnit.name}? ${mergingUnit.name} se disolverá y sus regimientos (hasta ${numRegimentsToTransfer}) se unirán a ${targetUnit.name}.`)) {
        logMessage("Fusión cancelada.");
        return false;
    }

    console.log(`[Merge] Fusionando ${numRegimentsToTransfer} regimiento(s) de ${mergingUnit.name} en ${targetUnit.name}.`);
    logMessage(`${mergingUnit.name} se fusiona con ${targetUnit.name}.`);

    // 1. Transferir regimientos (solo los que quepan)
    for (let i = 0; i < numRegimentsToTransfer; i++) {
        if (mergingUnit.regiments[i]) { // Asegurarse de que el regimiento exista
            targetUnit.regiments.push(JSON.parse(JSON.stringify(mergingUnit.regiments[i]))); // Añadir una copia profunda
        }
    }

    // 2. Recalcular Salud de targetUnit
    // Sumar salud actual, pero la maxHealth se recalculará
    let combinedCurrentHealth = targetUnit.currentHealth + mergingUnit.currentHealth;

    // 3. Recalcular Estadísticas de targetUnit (similar a handleFinalizeDivision)
    let newAttack = 0, newDefense = 0, newMaxHealth = 0;
    let newMovement = Infinity, newVision = 0, newAttackRange = 0, newInitiative = 0;
    let baseSprite = targetUnit.regiments.length > 0 ? REGIMENT_TYPES[targetUnit.regiments[0].type]?.sprite || '❓' : '❓'; // Sprite del primer regimiento como base

    targetUnit.regiments.forEach(reg => {
        const regData = REGIMENT_TYPES[reg.type] || {}; // Obtener datos base del regimiento
        newAttack += regData.attack || 0;
        newDefense += regData.defense || 0;
        newMaxHealth += regData.health || 0;
        newMovement = Math.min(newMovement, regData.movement || 1);
        newVision = Math.max(newVision, regData.visionRange || 0);
        newAttackRange = Math.max(newAttackRange, regData.attackRange || 0);
        newInitiative = Math.max(newInitiative, regData.initiative || 0); // O podrías promediar iniciativa
    });
    newMovement = (newMovement === Infinity) ? 1 : newMovement;

    targetUnit.attack = newAttack;
    targetUnit.defense = newDefense;
    targetUnit.maxHealth = newMaxHealth;
    targetUnit.currentHealth = Math.min(combinedCurrentHealth, newMaxHealth); // Salud actual no puede exceder la nueva maxHealth
    targetUnit.movement = newMovement;
    // currentMovement no se resetea aquí, ya que la unidad que se mueve es la que gasta su movimiento
    targetUnit.visionRange = newVision;
    targetUnit.attackRange = newAttackRange;
    targetUnit.initiative = newInitiative;
    targetUnit.sprite = baseSprite; // Actualizar sprite si es necesario

    // 4. Manejar Experiencia (ejemplo: tomar la XP total, el nivel se recalculará si es necesario)
    targetUnit.experience = (targetUnit.experience || 0) + (mergingUnit.experience || 0);
    // Opcional: Limitar la experiencia máxima si tienes un cap global
    // targetUnit.experience = Math.min(targetUnit.experience, MAX_POSSIBLE_XP);
    if (typeof checkAndApplyLevelUp === "function") { // checkAndApplyLevelUp de unit_Actions.js
        checkAndApplyLevelUp(targetUnit); // Verificar si la nueva XP resulta en subida de nivel
    }
    
    // 5. Marcar la unidad que se movió y fusionó (mergingUnit) como que ya actuó
    mergingUnit.currentMovement -= costToReach;
    mergingUnit.hasMoved = true;
    mergingUnit.hasAttacked = true;

    // 6. "Destruir" la mergingUnit (sin dar XP/oro al "destructor" que es uno mismo)
    if (mergingUnit.element && mergingUnit.element.parentElement) {
        mergingUnit.element.remove();
    }
    const index = units.findIndex(u => u.id === mergingUnit.id);
    if (index > -1) {
        units.splice(index, 1);
    }
    if (board[mergingUnit.r]?.[mergingUnit.c]?.unit?.id === mergingUnit.id) {
        board[mergingUnit.r][mergingUnit.c].unit = null;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(mergingUnit.r, mergingUnit.c);
    }
    
    // 7. Actualizar UI
    if (typeof UIManager !== 'undefined') {
        UIManager.updateUnitStrengthDisplay(targetUnit); // Mostrar nueva salud de la unidad fusionada
        if (selectedUnit && selectedUnit.id === mergingUnit.id) { 
            deselectUnit(); 
            selectUnit(targetUnit); // Seleccionar la unidad fusionada
        } else if (selectedUnit && selectedUnit.id === targetUnit.id) {
            UIManager.showUnitContextualInfo(targetUnit, true); // Refrescar panel de la unidad fusionada
        }
        UIManager.updatePlayerAndPhaseInfo();
    }
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") checkVictory();

    return true; // Indicar que la acción de fusión se completó
}

function isValidMove(unit, toR, toC, isPotentialMerge = false) {
    // console.log(`[isValidMove ENTRY] unit: ${unit?.name}, to: (${toR},${toC}), isMerge: ${isPotentialMerge}, unit.hasMoved: ${unit?.hasMoved}, unit.currentMovement: ${unit?.currentMovement}`);

    if (!unit) {
        // console.log("[isValidMove EXIT] No unit provided.");
        return false; 
    }
    
    // Condición 1: Si ya movió y NO es un intento de fusión (la fusión podría ser el único movimiento)
    // O si no tiene puntos de movimiento Y NO es un intento de fusión
    if (gameState.currentPhase === 'play') { // Estas restricciones solo aplican en la fase de juego
        if (unit.hasMoved && !isPotentialMerge) { 
            // console.log(`[isValidMove EXIT] ${unit.name} ya movió (hasMoved=${unit.hasMoved}) y no es intento de fusión.`);
            return false; 
        }
        if ((unit.currentMovement || 0) <= 0 && !isPotentialMerge) { // Usar (unit.currentMovement || 0) por si es undefined
            // console.log(`[isValidMove EXIT] ${unit.name} sin movimiento (currentMovement=${unit.currentMovement}) y no es intento de fusión.`);
            return false;
        }
    }

    // Condición 3: Moverse al mismo hexágono
    if (unit.r === toR && unit.c === toC) {
        // console.log("[isValidMove EXIT] Mismo hex.");
        return false;
    }

    const targetUnitOnHex = getUnitOnHex(toR, toC); // Asume que getUnitOnHex es accesible
    // console.log(`[isValidMove DEBUG] Para ${unit.name} a (${toR},${toC}). isPotentialMerge: ${isPotentialMerge}. Unidad en destino: ${targetUnitOnHex?.name || 'Ninguna'}`);

    if (targetUnitOnHex) { // El hexágono destino está OCUPADO
        if (isPotentialMerge && targetUnitOnHex.player === unit.player && targetUnitOnHex.id !== unit.id) {
            // Es un intento de fusión con una unidad amiga diferente.
            // Para la fusión, la unidad que se mueve DEBE PODER LLEGAR (tener movimiento).
            if (gameState.currentPhase === 'play' && (unit.currentMovement || 0) <= 0) { 
                // console.log(`[isValidMove DEBUG - MergePath] ${unit.name} no tiene movimiento para fusionar (currentMovement=${unit.currentMovement}).`);
                return false;
            }
            // Llamar a getMovementCost pasando el flag isPotentialMerge
            const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, true); 
            // console.log(`[isValidMove DEBUG - MergePath] Costo a (${toR},${toC}) para ${unit.name} es ${cost}. Mov actual: ${unit.currentMovement}`);
            const canMoveToMerge = cost !== Infinity && cost <= (unit.currentMovement || 0);
            // console.log(`[isValidMove EXIT - MergePath] Puede moverse para fusionar: ${canMoveToMerge}`);
            return canMoveToMerge;
        } else {
            // console.log(`[isValidMove EXIT] Destino ocupado y no es fusión válida (Enemigo: ${targetUnitOnHex.player !== unit.player}, MismaUnidad: ${targetUnitOnHex.id === unit.id}, NoEsMergeFlag: ${!isPotentialMerge})`);
            return false; // Ocupado por enemigo, o por la misma unidad, o no es intento de fusión a casilla ocupada
        }
    } else { // El hexágono destino está VACÍO
        if (isPotentialMerge) {
            // No se puede "fusionar" con un hexágono vacío.
            // console.log("[isValidMove EXIT] Intento de fusionar con hex VACÍO, no permitido.");
            return false; 
        }
        // Movimiento normal a hex vacío
        if (gameState.currentPhase === 'play' && (unit.currentMovement || 0) <= 0) {
            // console.log(`[isValidMove DEBUG - EmptyHexPath] ${unit.name} no tiene movimiento para moverse a hex vacío (currentMovement=${unit.currentMovement}).`);
            return false;
        }
        // Llamar a getMovementCost pasando el flag isPotentialMerge (que será false aquí)
        const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, false); 
        // console.log(`[isValidMove DEBUG - EmptyHexPath] Costo a (${toR},${toC}) para ${unit.name} es ${cost}. Mov actual: ${unit.currentMovement}`);
        const canMoveToEmpty = cost !== Infinity && cost <= (unit.currentMovement || 0);
        // console.log(`[isValidMove EXIT - EmptyHexPath] Puede moverse a hex vacío: ${canMoveToEmpty}`);
        return canMoveToEmpty;
    }
}

function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    if (!selectedUnit) {
        console.error("CRITICAL: handleActionWithSelectedUnit sin selectedUnit.");
        return false; 
    }

    // CASO 1: Clic en la misma unidad seleccionada
    if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.id === selectedUnit.id) {
        if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
            if (typeof cancelPreparingAction === "function") cancelPreparingAction();
            if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) UIManager.showUnitContextualInfo(selectedUnit, true);
        }
        return false; 
    }

    // CASO 2: Hay una acción preparándose (movimiento o ataque)
    if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
        if (gameState.preparingAction.type === "move") {
            // Para un movimiento preparado a un hex vacío
            if (!clickedUnitOnTargetHex && isValidMove(selectedUnit, r_target, c_target, false)) { // false para isPotentialMerge
                if (typeof moveUnit === "function") moveUnit(selectedUnit, r_target, c_target);
                if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                return true;
            } else if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.player === selectedUnit.player) {
                // Si el modo mover está activo y se hace clic en otra unidad amiga -> Intento de Fusión
                console.log(`[handleAction PREPARED_MOVE] Intento de FUSIÓN (desde modo mover): ${selectedUnit.name} sobre ${clickedUnitOnTargetHex.name}`);
                if (isValidMove(selectedUnit, r_target, c_target, true)) { // true para isPotentialMerge
                    if (typeof mergeUnits === "function") mergeUnits(selectedUnit, clickedUnitOnTargetHex); else console.error("Función mergeUnits no definida.");
                    if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                    return true; 
                } else {
                    logMessage("No se puede mover allí para fusionar.");
                }
            } else {
                logMessage("Movimiento preparado inválido.");
            }
            if (typeof cancelPreparingAction === "function") cancelPreparingAction();
            if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) UIManager.showUnitContextualInfo(selectedUnit, true);
            return false;

        } else if (gameState.preparingAction.type === "attack") {
            if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.player !== selectedUnit.player && isValidAttack(selectedUnit, clickedUnitOnTargetHex)) {
                if (typeof attackUnit === "function") attackUnit(selectedUnit, clickedUnitOnTargetHex);
                if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                return true;
            } else {
                logMessage("Objetivo de ataque preparado inválido.");
            }
            if (typeof cancelPreparingAction === "function") cancelPreparingAction();
            if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) UIManager.showUnitContextualInfo(selectedUnit, true);
            return false;
        }
    }

    // CASO 3: No hay acción preparándose (clic directo)
    if (clickedUnitOnTargetHex) { // Clic en un hexágono CON OTRA UNIDAD
        if (clickedUnitOnTargetHex.player === selectedUnit.player && clickedUnitOnTargetHex.id !== selectedUnit.id) {
            // Clic en OTRA UNIDAD AMIGA: Intento de FUSIÓN
            console.log(`[handleAction DIRECT_CLICK] Intento de FUSIÓN: ${selectedUnit.name} sobre ${clickedUnitOnTargetHex.name}`);
            if (isValidMove(selectedUnit, r_target, c_target, true)) { // true para isPotentialMerge
                if (typeof mergeUnits === "function") {
                    mergeUnits(selectedUnit, clickedUnitOnTargetHex);
                    return true; 
                } else { 
                    console.error("Función mergeUnits no definida."); 
                    return false; 
                }
            } else {
                logMessage(`No se puede alcanzar a ${clickedUnitOnTargetHex.name} para fusionar.`);
                // No llamar a selectUnit aquí, onHexClick lo manejará si esta función retorna false.
                return false; 
            }
        } else if (clickedUnitOnTargetHex.player !== selectedUnit.player) { // Clic en unidad ENEMIGA
            console.log(`[handleAction DIRECT_CLICK] Intento de ATAQUE: ${selectedUnit.name} sobre ${clickedUnitOnTargetHex.name}`);
            if (isValidAttack(selectedUnit, clickedUnitOnTargetHex)) {
                if (typeof attackUnit === "function") { 
                    attackUnit(selectedUnit, clickedUnitOnTargetHex); 
                    return true; 
                } else { console.error("Función attackUnit no definida."); return false;}
            } else {
                if (typeof logMessage === "function") logMessage(`${selectedUnit.name} no puede atacar a ${clickedUnitOnTargetHex.name}.`);
            }
            return false; 
        }
    } else { // Clic en hexágono VACÍO
        console.log(`[handleAction DIRECT_CLICK] Intento de MOVIMIENTO de ${selectedUnit.name} a hex vacío (${r_target},${c_target})`);
        if (isValidMove(selectedUnit, r_target, c_target, false)) { // false para isPotentialMerge (movimiento normal)
            if (typeof moveUnit === "function") { 
                moveUnit(selectedUnit, r_target, c_target); 
                return true; 
            } else { console.error("Función moveUnit no definida."); return false;}
        }
        // Si el movimiento a hex vacío no es válido, no hacer nada aquí.
        // onHexClick podría deseleccionar o mostrar info del hex.
        return false; 
    }
    return false; 
}

function selectUnit(unit) {
    console.log(`[DEBUG selectUnit] INICIO - Intentando seleccionar: ${unit?.name || 'unidad nula'}`);
    if (!unit) {
        console.warn("[selectUnit] Intento de seleccionar unidad nula.");
        if (typeof deselectUnit === "function") deselectUnit();
        return;
    }

    if (gameState.currentPhase === 'play' && unit.player !== gameState.currentPlayer) {
        console.log(`[selectUnit] No se puede tomar control de ${unit.name} (Jugador ${unit.player}).`);
        if (typeof deselectUnit === "function") deselectUnit();
        return;
    }

    if (selectedUnit && selectedUnit.id === unit.id) {
        // Si ya está seleccionada, solo refrescamos los highlights por si acaso.
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(selectedUnit);
        return; // No es necesario hacer más.
    }

    if (selectedUnit) {
        if (typeof deselectUnit === "function") deselectUnit();
    }

    selectedUnit = unit;
    console.log(`[selectUnit] ${selectedUnit.name} establecida como selectedUnit.`);

    if (gameState) {
        gameState.selectedHexR = unit.r;
        gameState.selectedHexC = unit.c;
    }

    if (unit.element) {
        unit.element.classList.add('selected-unit');
    } else {
        console.error(`ERROR CRÍTICO: Unidad ${unit.name} (ID: ${unit.id}) no tiene .element!`);
        selectedUnit = null;
        if (gameState) { gameState.selectedHexR = -1; gameState.selectedHexC = -1; }
        return;
    }

    if (typeof logMessage === "function") logMessage(`${unit.name} (J${unit.player}) seleccionada.`);

    // Comprobar si puede actuar y resaltar acciones posibles.
    const canStillAct = gameState.currentPhase !== 'play' || (!unit.hasMoved || !unit.hasAttacked);
    if (canStillAct) {
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
    } else {
        if (typeof logMessage === "function") logMessage(`${unit.name} ya ha actuado este turno.`);
        if (typeof clearHighlights === "function") clearHighlights();
    }
    
    // YA NO SE LLAMA A UIManager.showUnitContextualInfo DESDE AQUÍ.
    // onHexClick se encargará de esto DESPUÉS de que selectUnit termine.
    console.log(`[DEBUG selectUnit] FIN - selectedUnit ahora es: ${selectedUnit?.name}`);
}

function deselectUnit() {
    // ... (función deselectUnit como estaba) ...
    if (selectedUnit && selectedUnit.element) {
        selectedUnit.element.classList.remove('selected-unit');
    }
    selectedUnit = null;
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    else if (typeof clearHighlights === "function") clearHighlights();
}

function highlightPossibleActions(unit) {
    // ... (función highlightPossibleActions como estaba, debe usar isValidAttack e isValidMove) ...
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    else if (typeof clearHighlights === "function") clearHighlights();
    if (!unit || !board || board.length === 0) return;
    for (let r_idx = 0; r_idx < board.length; r_idx++) {
        for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
            const hexData = board[r_idx]?.[c_idx];
            if (!hexData || !hexData.element) continue;
            if (gameState.currentPhase === "play" && hexData.visibility && typeof hexData.visibility === 'object' && hexData.visibility[`player${gameState.currentPlayer}`] === 'hidden') continue;
            if (gameState.currentPhase === 'play' && !unit.hasMoved && unit.currentMovement > 0 && isValidMove(unit, r_idx, c_idx)) {
                 hexData.element.classList.add('highlight-move');
            }
            const targetUnitOnHex = getUnitOnHex(r_idx, c_idx);
            if (gameState.currentPhase === 'play' && !unit.hasAttacked && targetUnitOnHex && targetUnitOnHex.player !== unit.player && isValidAttack(unit, targetUnitOnHex)) {
                hexData.element.classList.add('highlight-attack');
            }
        }
    }
}

function clearHighlights() {
    // ... (función clearHighlights como estaba) ...
    document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
        h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
    });
}

// ---------------------------------------------------------------------------------
// LÓGICA DE MOVIMIENTO
// ---------------------------------------------------------------------------------
// En unit_Actions.js

function getMovementCost(unit, r_start, c_start, r_target, c_target, isPotentialMerge = false) { // Añadido isPotentialMerge
    if (!unit) { return Infinity; }
    if (r_start === r_target && c_start === c_target) return 0;
    // No necesitamos chequear unit.currentMovement aquí, isValidMove ya lo hace si es necesario
    // if (unit.currentMovement <= 0) return Infinity; // Quitado para que solo calcule el costo de la ruta

    let queue = [{ r: r_start, c: c_start, cost: 0, path: [`${r_start},${c_start}`] }]; 
    let visited = new Set();
    visited.add(`${r_start},${c_start}`);
    
    // El límite de búsqueda debe ser suficiente para el movimiento máximo de cualquier unidad
    // No lo limites por unit.currentMovement aquí, ya que solo queremos el costo de la ruta.
    const maxSearchDepth = Math.max(unit.movement || 1, 15); // Un límite razonable, o el movimiento base de la unidad
    let iterations = 0;
    const maxIterations = maxSearchDepth * BOARD_ROWS * BOARD_COLS / 2; // Un límite generoso de iteraciones

    // console.log(`[getMovementCost ENTRY] De (${r_start},${c_start}) a (${r_target},${c_target}), Merge: ${isPotentialMerge}, MaxDepth: ${maxSearchDepth}`);

    while (queue.length > 0 && iterations < maxIterations) { 
        iterations++;
        let current = queue.shift();

        // No permitir que el costo exceda el movimiento máximo de la unidad (optimización)
        // Pero solo si no es un movimiento de fusión donde el costo podría ser irrelevante si la unidad no se "mueve" realmente
        // if (current.cost >= maxSearchDepth && !isPotentialMerge) continue; // Comentado, isValidMove se encarga de esto

        let neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const costToEnterNeighbor = current.cost + 1; // Asumimos costo 1 por hexágono (puedes añadir costos de terreno aquí)

            // ¿Hemos llegado al objetivo?
            if (neighbor.r === r_target && neighbor.c === c_target) {
                const unitAtTarget = getUnitOnHex(neighbor.r, neighbor.c);
                if (isPotentialMerge) {
                    // Si es fusión, podemos "entrar" a la casilla aunque esté ocupada por un amigo.
                    // No necesitamos verificar si unitAtTarget es el amigo específico aquí, isValidMove lo hará.
                    // Simplemente devolvemos el costo para llegar a la casilla.
                    // console.log(`[getMovementCost EXIT - MergeTargetFound] Costo a hex de fusión: ${costToEnterNeighbor}`);
                    return costToEnterNeighbor;
                } else if (!unitAtTarget) {
                    // Si es movimiento normal y el objetivo está vacío.
                    // console.log(`[getMovementCost EXIT - EmptyTargetFound] Costo a hex vacío: ${costToEnterNeighbor}`);
                    return costToEnterNeighbor;
                }
                // Si es movimiento normal y el objetivo está ocupado, no es una ruta válida (esta rama no debería alcanzarse si isValidMove funciona).
                // console.log(`[getMovementCost] Objetivo (${r_target},${c_target}) alcanzado pero OCUPADO y NO es fusión.`);
                continue; 
            }

            // Si no es el objetivo, explorar más
            const visitedKey = `${neighbor.r},${neighbor.c}`;
            if (!visited.has(visitedKey)) {
                const unitAtNeighbor = getUnitOnHex(neighbor.r, neighbor.c);
                // Solo podemos pasar por hexágonos vacíos o, si es una fusión, el hexágono final puede estar ocupado por un amigo.
                // Pero los hexágonos INTERMEDIOS de la ruta deben estar vacíos.
                if (!unitAtNeighbor) { // Los hexágonos intermedios deben estar vacíos
                    visited.add(visitedKey);
                    let newPath = [...current.path, visitedKey];
                    queue.push({ r: neighbor.r, c: neighbor.c, cost: costToEnterNeighbor, path: newPath });
                }
            }
        }
    }
    // console.log(`[getMovementCost EXIT] No se encontró ruta válida. Iteraciones: ${iterations}`);
    return Infinity;
}

async function moveUnit(unit, toR, toC) {
    // ... (función moveUnit como estaba, asegurando que actualiza hasMoved y currentMovement) ...
    const fromR = unit.r;
    const fromC = unit.c;

    if (unit.player === gameState.currentPlayer) {
        unit.lastMove = {
            fromR: fromR,
            fromC: fromC,
            initialCurrentMovement: unit.currentMovement, // Registrar el movimiento antes de gastar
            initialHasMoved: unit.hasMoved,              // Registrar el estado de 'hasMoved'
            initialHasAttacked: unit.hasAttacked         // Registrar el estado de 'hasAttacked'
        };
        console.log(`[Undo] Registrando lastMove para ${unit.name}: (${fromR},${fromC})`);
    }
    
    const costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);
    // console.log(`[moveUnit] ${unit.name} de (${fromR},${fromC}) a (${toR},${toC}). Costo:${costOfThisMove}. Mov antes:${unit.currentMovement}, moved:${unit.hasMoved}`);
    if (costOfThisMove === Infinity || costOfThisMove > unit.currentMovement || (gameState.currentPhase === 'play' && unit.hasMoved) || unit.currentMovement <= 0) {
        console.error(`[moveUnit] MOVIMIENTO INVÁLIDO (CHEQUEO ROBUSTO) para ${unit.name}.`);
        if (typeof logMessage === "function") logMessage("Movimiento inválido (interno).");
        if (selectedUnit && selectedUnit.id === unit.id && typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        return;
    }
    if (board[fromR]?.[fromC]) board[fromR][fromC].unit = null;
    if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(fromR, fromC);
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= costOfThisMove;
    if (gameState.currentPhase === 'play') { unit.hasMoved = true; }
    // console.log(`   L-> DESPUÉS ${unit.name}: mov=${unit.currentMovement}, moved=${unit.hasMoved}`);
    const targetHexData = board[toR]?.[toC];
    if (targetHexData) {
        targetHexData.unit = unit;
        if (targetHexData.owner !== unit.player) { 
            targetHexData.owner = unit.player;
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner !== unit.player) {
                city.owner = unit.player;
                if (typeof logMessage === "function") logMessage(`¡Ciudad ${city.name} capturada por Jugador ${unit.player}!`);
                if (typeof UIManager !== 'undefined' && UIManager.updateCityInfo) UIManager.updateCityInfo(city);
            }
        }
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(toR, toC);
    } else { 
        console.error(`[moveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; 
        if (gameState.currentPhase === 'play') unit.hasMoved = false; 
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit; 
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(fromR, fromC); 
        return; 
    }
    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (typeof logMessage === "function") logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo(); 
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if (checkVictory()) return; }
    if (selectedUnit && selectedUnit.id === unit.id) {
        const canStillAttack = gameState.currentPhase === 'play' && !unit.hasAttacked; 
        if (unit.hasMoved && !canStillAttack) { 
             if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        } else if (unit.hasMoved && canStillAttack) { 
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        } else {
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        }
    }
}

function positionUnitElement(unit) {
    // ... (función positionUnitElement como estaba) ...
    if (!unit || !unit.element || !(unit.element instanceof HTMLElement)) { console.error("[positionUnitElement] Unidad o elemento no válido.", unit); return; }
    if (typeof HEX_WIDTH === 'undefined' || typeof HEX_VERT_SPACING === 'undefined' || typeof HEX_HEIGHT === 'undefined') {
        console.error("[positionUnitElement] Constantes de hexágono no definidas.");
        unit.element.style.left = (unit.c * 60) + 'px'; unit.element.style.top = (unit.r * 70) + 'px';  
        unit.element.style.display = 'flex'; return;
    }
    const unitWidth = unit.element.offsetWidth || parseInt(unit.element.style.width) || 36;
    const unitHeight = unit.element.offsetHeight || parseInt(unit.element.style.height) || 36;
    const xPos = unit.c * HEX_WIDTH + (unit.r % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - unitWidth) / 2;
    const yPos = unit.r * HEX_VERT_SPACING + (HEX_HEIGHT - unitHeight) / 2;
    if (isNaN(xPos) || isNaN(yPos)) {
        console.error(`[positionUnitElement] xPos o yPos es NaN para ${unit.name}.`);
        unit.element.style.left = '10px'; unit.element.style.top = '10px'; 
    } else {
        unit.element.style.left = `${xPos}px`; unit.element.style.top = `${yPos}px`;
    }
    unit.element.style.display = 'flex'; 
}

// ---------------------------------------------------------------------------------
// LÓGICA DE COMBATE
// ---------------------------------------------------------------------------------
function isValidAttack(attacker, defender) {
    if (!attacker || !defender) { return false; }
    if (attacker.player === gameState.currentPlayer && gameState.currentPhase === 'play' && attacker.hasAttacked) { return false; } // Solo chequear hasAttacked para el jugador actual
    if (attacker.id === defender.id) { return false; }
    if (attacker.player === defender.player) { return false; }

    // USANDO attacker.attackRange
    const distance = hexDistance(attacker.r, attacker.c, defender.r, defender.c);
    const range = attacker.attackRange === undefined ? 1 : attacker.attackRange; // USANDO attackRange
    
    // console.log(`[isValidAttack] ${attacker.name} (J${attacker.player}, Rng:${range}) vs ${defender.name} (J${defender.player}). Dist: ${distance}`);
    return distance !== Infinity && distance <= range;
}

async function attackUnit(attacker, defender) {
    // ... (función attackUnit como estaba, pero usando attacker.attackRange y defender.attackRange si es necesario en contraataque) ...
    if (!attacker || !defender) { console.error("attackUnit: Atacante o defensor nulo."); return; }
    if (attacker.player === gameState.currentPlayer && gameState.currentPhase === 'play' && attacker.hasAttacked) { // Solo chequear para el jugador actual
        if (typeof logMessage === "function") logMessage(`${attacker.name} ya ha atacado.`); return;
    }
    console.log(`[Combat] ${attacker.name} (J${attacker.player}) ataca a ${defender.name} (J${defender.player})`);
    if (typeof logMessage === "function") logMessage(`${attacker.name} ataca a ${defender.name}!`);
    if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(defender, attacker);
    let damageDealtToDefender = 0;
    
    if (typeof applyDamage === "function") damageDealtToDefender = applyDamage(attacker, defender);
    else console.warn("applyDamage no definida.");
    if (typeof showCombatAnimation === "function") await showCombatAnimation(defender, attacker, damageDealtToDefender > 0 ? 'melee_hit' : 'miss');
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(defender);
    
    if (damageDealtToDefender > 0 && attacker.player === gameState.currentPlayer) { // Solo el jugador actual gana oro por dañar
    const goldForDamage = Math.floor(damageDealtToDefender / 4); // Ejemplo: 1 oro por cada 5 de daño
    if (goldForDamage > 0) {
        gameState.playerResources[attacker.player].oro += goldForDamage;
        if (typeof logMessage === "function") {
            logMessage(`${attacker.name} gana ${goldForDamage} oro por dañar a ${defender.name}.`);
        }
        // La UI se actualizará al final del turno o por UIManager.updateAllUIDisplays
    }
}

    if (defender.currentHealth <= 0) {
        if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(defender, attacker);
    } else {
        const defenderCanCounterAttack = gameState.currentPhase === 'play' && (!defender.hasAttacked || defender.player !== gameState.currentPlayer) ; // IA o jugador que no es el actual puede contraatacar aunque haya "atacado" en su turno.
        if (defenderCanCounterAttack && isValidAttack(defender, attacker)) { 
            if (typeof logMessage === "function") logMessage(`${defender.name} contraataca!`);
            let damageDealtToAttacker = 0;
            if (typeof applyDamage === "function") damageDealtToAttacker = applyDamage(defender, attacker);
            if (typeof showCombatAnimation === "function") await showCombatAnimation(attacker, defender, damageDealtToAttacker > 0 ? 'counter_attack_hit' : 'miss');
            if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(attacker);
            if (attacker.currentHealth <= 0) {
                if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(attacker, defender);
            }
        }
    }
    if (gameState.currentPhase === 'play' && attacker.currentHealth > 0 && attacker.player === gameState.currentPlayer) { // Solo marcar hasAttacked para el jugador actual
        attacker.hasAttacked = true;
        // console.log(`   L-> DESPUÉS de atacar ${attacker.name}: ... attacked=${attacker.hasAttacked}`);
    }
    if (attacker.currentHealth > 0 && typeof handlePostBattleRetreat === "function") handlePostBattleRetreat(attacker);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if(checkVictory()) return; }
    if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth > 0) {
        const noMoreMovement = attacker.hasMoved || attacker.currentMovement <= 0;
        if (noMoreMovement && attacker.hasAttacked && attacker.player === gameState.currentPlayer) { // Solo para el jugador actual
             if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        } else { 
            if (typeof highlightPossibleActions === "function") highlightPossibleActions(attacker);
        }
    } else if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth <= 0) { 
        if (typeof deselectUnit === "function") deselectUnit(); 
    }
}

const COMBAT_ANIMATION_DURATION = 500; 
async function showCombatAnimation(targetUnit, attackerUnit, type) { /* ... */ }
function applyDamage(attacker, target) { /* ... (usando attacker.attack y target.defense) ... */ 
    if (!attacker || !target) return 0;
    let baseDamage = attacker.attack || 0; 
    let defensePower = target.defense || 0; 
    let terrainDefenseBonus = board[target.r]?.[target.c]?.terrain?.defenseBonus || 0; 
    defensePower += terrainDefenseBonus;
    let flankingMultiplier = target.isFlanked ? 1.25 : 1.0; 
    let effectiveAttack = baseDamage * flankingMultiplier;
    let damageDealt = Math.max(0, Math.round(effectiveAttack - defensePower)); 
    if (effectiveAttack > 0 && damageDealt === 0) damageDealt = 1; 
    damageDealt = Math.min(damageDealt, target.currentHealth); 
    // console.log(`[DamageCalc] ... Daño: ${damageDealt}`);
    target.currentHealth -= damageDealt;
    if (typeof logMessage === "function") logMessage(`${attacker.name} inflige ${damageDealt} daño a ${target.name}.`);
    target.isFlanked = false; 
    return damageDealt;
}


function handleUnitDestroyed(destroyedUnit, victorUnit) {
    if (!destroyedUnit) {
        console.warn("[handleUnitDestroyed] Se intentó destruir una unidad nula.");
        return;
    }
    console.log(`[UnitDestroyed] ¡${destroyedUnit.name} (Jugador ${destroyedUnit.player}) va a ser destruida!`);
    if (typeof logMessage === "function") logMessage(`¡${destroyedUnit.name} ha sido destruida!`);

    // 1. Quitar del tablero (estado lógico en la 'board')
    const hexOfUnit = board[destroyedUnit.r]?.[destroyedUnit.c];
    if (hexOfUnit && hexOfUnit.unit && hexOfUnit.unit.id === destroyedUnit.id) {
        hexOfUnit.unit = null;
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del estado del hex (${destroyedUnit.r},${destroyedUnit.c}).`);
        if (typeof renderSingleHexVisuals === "function") {
            renderSingleHexVisuals(destroyedUnit.r, destroyedUnit.c);
        }
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el estado del hex (${destroyedUnit.r},${destroyedUnit.c}) o el ID no coincidía.`);
    }

    // --- INICIO DEPURACIÓN VISUALIZACIÓN DOM ---
    console.log(`[UnitDestroyed DEBUG] Intentando quitar DOM para ${destroyedUnit.name}.`);
    console.log(`[UnitDestroyed DEBUG] destroyedUnit.element:`, destroyedUnit.element);
    if (destroyedUnit.element) {
        console.log(`[UnitDestroyed DEBUG] destroyedUnit.element.parentElement:`, destroyedUnit.element.parentElement);
        console.log(`[UnitDestroyed DEBUG] gameBoard (del DOM global):`, gameBoard);
    }
    // --- FIN DEPURACIÓN VISUALIZACIÓN DOM ---

    // 2. Quitar el elemento DOM de la unidad del gameBoard
    if (destroyedUnit.element && destroyedUnit.element.parentElement) {
        console.log(`[UnitDestroyed] Eliminando elemento DOM de ${destroyedUnit.name} de su padre:`, destroyedUnit.element.parentElement.id);
        destroyedUnit.element.remove(); 
    } else if (destroyedUnit.element && !destroyedUnit.element.parentElement) {
        console.warn(`[UnitDestroyed] El elemento DOM de ${destroyedUnit.name} existe pero no tiene padre. No se puede eliminar (quizás ya se eliminó).`);
    } else {
        console.warn(`[UnitDestroyed] La unidad ${destroyedUnit.name} no tiene una propiedad .element válida o es nula. Intentando fallback por ID.`);
        const elementInDomById = document.querySelector(`.unit[data-id="${destroyedUnit.id}"]`);
        if (elementInDomById && elementInDomById.parentElement) {
            console.warn(`[UnitDestroyed] Fallback: Encontrado y eliminando elemento por data-id="${destroyedUnit.id}" de su padre:`, elementInDomById.parentElement.id);
            elementInDomById.remove();
        } else if (elementInDomById) {
            console.warn(`[UnitDestroyed] Fallback: Encontrado por data-id="${destroyedUnit.id}" pero no tiene padre.`);
        } else {
            console.warn(`[UnitDestroyed] Fallback: NO se encontró elemento por data-id="${destroyedUnit.id}". El icono podría persistir.`);
        }
    }

    // 3. Quitar del array global de unidades ('units')
    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) {
        units.splice(index, 1);
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del array 'units'.`);
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el array 'units' para eliminarla.`);
    }

    // 4. Otorgar experiencia/recursos al vencedor (si existe)
    if (victorUnit && destroyedUnit.player !== victorUnit.player) {
        const experienceGained = REGIMENT_TYPES[destroyedUnit.regiments[0].type]?.experienceValue || 10; // Asume experienceValue en REGIMENT_TYPES
        victorUnit.experience = (victorUnit.experience || 0) + experienceGained;
        if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(victorUnit);
        if (typeof logMessage === "function") logMessage(`${victorUnit.name} gana ${experienceGained} XP.`);

        let goldGained = 0;
        if (typeof destroyedUnit.goldValueOnDestroy === 'number') {
            goldGained = destroyedUnit.goldValueOnDestroy;
        } else if (destroyedUnit.regiments && destroyedUnit.regiments.length > 0) {
            const mainRegimentTypeKey = destroyedUnit.regiments[0].type;
            if (REGIMENT_TYPES[mainRegimentTypeKey] && typeof REGIMENT_TYPES[mainRegimentTypeKey].goldValueOnDestroy === 'number') {
                goldGained = REGIMENT_TYPES[mainRegimentTypeKey].goldValueOnDestroy;
            } else { goldGained = 5; }
        } else { goldGained = 5; }

        if (goldGained > 0 && gameState.playerResources[victorUnit.player]) {
            gameState.playerResources[victorUnit.player].oro = (gameState.playerResources[victorUnit.player].oro || 0) + goldGained;
            if (typeof logMessage === "function") logMessage(`${victorUnit.name} obtiene ${goldGained} de oro por destruir a ${destroyedUnit.name}.`);
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(victorUnit); 
    }
    
    if (selectedUnit && selectedUnit.id === destroyedUnit.id) {
        selectedUnit = null;
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
    }
    // La actualización general de UI se hará al final del turno o acción.
    // if (typeof UIManager !== 'undefined' && UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();

    if (typeof checkVictory === "function") checkVictory();
}

// ---------------------------------------------------------------------------------
// ACCIÓN DE REFUERZO DE UNIDAD
// ---------------------------------------------------------------------------------
// En unit_Actions.js

function handleReinforceUnitAction(unitToReinforce) {
    console.log("%c[Reinforce] Iniciando acción de refuerzo...", "color: darkviolet; font-weight:bold;");
    // ... (tus validaciones iniciales para unitToReinforce, salud máxima, si ya actuó) ...
    if (!unitToReinforce) { /* ... */ unitToReinforce = selectedUnit; if (!unitToReinforce) { /*...*/ return; } }
    console.log(`[Reinforce] Intentando reforzar a: ${unitToReinforce.name}`);
    if (unitToReinforce.currentHealth >= unitToReinforce.maxHealth) { /* ... mensaje y return ... */ }
    if (gameState.currentPhase === 'play' && (unitToReinforce.hasMoved || unitToReinforce.hasAttacked)) { /* ... mensaje y return ... */ }

    // --- NUEVA CONDICIÓN DE SUMINISTRO ---
    if (typeof isHexSupplied !== "function") {
        console.error("handleReinforceUnitAction: La función isHexSupplied no está definida.");
        UIManager.showMessageTemporarily("Error interno: No se puede verificar el suministro.", 3000, true);
        return;
    }
    
    if (!isHexSupplied(unitToReinforce.r, unitToReinforce.c, unitToReinforce.player)) {
        const msg = "La unidad no está suministrada (sin conexión por camino a ciudad/fortaleza propia).";
        if(typeof logMessage === "function") logMessage(msg);
        UIManager.showMessageTemporarily(msg, 4000, true);
        return;
    }
    // --- FIN NUEVA CONDICIÓN DE SUMINISTRO ---

    const healthToRestore = unitToReinforce.maxHealth - unitToReinforce.currentHealth;
    // ... (resto de tu lógica de cálculo de costo, como la tenías) ...
    let baseUnitCostOro = 20; /* ... tu cálculo ... */
    const costFactorForFullHeal = 0.3; 
    let totalCost = Math.ceil(baseUnitCostOro * costFactorForFullHeal * (healthToRestore / unitToReinforce.maxHealth));
    totalCost = Math.max(1, totalCost); 

    if (gameState.playerResources[gameState.currentPlayer].oro < totalCost) { /* ... mensaje y return ... */ }

    const confirmationMessage = `Reforzar ${unitToReinforce.name} por ${healthToRestore} HP costará ${totalCost} de oro. ¿Continuar?`;
    
    const performReinforcement = () => {
        // ... (tu lógica de performReinforcement: deducir oro, curar, marcar actuada, actualizar UI) ...
        gameState.playerResources[gameState.currentPlayer].oro -= totalCost;
        unitToReinforce.currentHealth = unitToReinforce.maxHealth;
        if (gameState.currentPhase === 'play') {
            unitToReinforce.hasMoved = true; 
            unitToReinforce.hasAttacked = true; 
        }
        const successMsg = `${unitToReinforce.name} reforzada a salud máxima. Costo: ${totalCost} oro.`;
        UIManager.showMessageTemporarily(successMsg, 3000);
        if (typeof UIManager !== 'undefined') {
            if (UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo();
            if (selectedUnit && selectedUnit.id === unitToReinforce.id && UIManager.showUnitContextualInfo) {
                 UIManager.showUnitContextualInfo(selectedUnit, true);
            }
            if (UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(unitToReinforce);
            if (UIManager.clearHighlights && selectedUnit && selectedUnit.id === unitToReinforce.id) { 
                 UIManager.clearHighlights(); 
            }
        }
    };

    if (window.confirm(confirmationMessage)) {
        performReinforcement();
    } else {
        UIManager.showMessageTemporarily("Refuerzo cancelado.", 2000);
    }
}

// ---------------------------------------------------------------------------------
// LÓGICA DE RETIRADA
// ---------------------------------------------------------------------------------
function findSafeRetreatHex(unit, attacker) {
    if (!unit) return null;
    const neighbors = getHexNeighbors(unit.r, unit.c);
    const potentialRetreatHexes = [];

    for (const n_coord of neighbors) {
        const hexData = board[n_coord.r]?.[n_coord.c];
        if (hexData && !hexData.unit) { // Casilla vacía
            // Prioridad 1: Casilla propia
            if (hexData.owner === unit.player) {
                potentialRetreatHexes.push({ ...n_coord, priority: 1 });
            }
            // Prioridad 2: Casilla neutral
            else if (hexData.owner === null) {
                potentialRetreatHexes.push({ ...n_coord, priority: 2 });
            }
            // No retirarse a casilla enemiga directamente adyacente (a menos que no haya otra opción y se implemente)
        }
    }

    // Filtrar hexes que estén en la Zona de Control del atacante (si se define)
    // Por ahora, simplemente ordena por prioridad
    potentialRetreatHexes.sort((a,b) => a.priority - b.priority);

    if (potentialRetreatHexes.length > 0) {
        // Podrías añadir lógica para evitar retirarse a un hex adyacente al 'attacker' si es posible
        return potentialRetreatHexes[0]; // Devuelve el mejor hex seguro encontrado
    }
    
    console.log(`[findSafeRetreatHex] ${unit.name} no encontró hex para retirarse.`);
    return null;
}

function handlePostBattleRetreat(unit, attacker) { // Attacker es quien causó el chequeo de moral/retirada
    if (!unit || unit.currentHealth <= 0) return;

    // Lógica de chequeo de moral (ejemplo simple)
    // Podrías tener una propiedad 'moral' en la unidad o calcularla.
    // Aquí, un simple chequeo de salud.
    const healthPercentage = unit.currentHealth / unit.maxHealth;
    let mustRetreat = false;

    if (healthPercentage < 0.25) { // Por debajo del 25% de salud
        mustRetreat = true;
        if (typeof logMessage === "function") logMessage(`${unit.name} tiene muy poca salud (${Math.round(healthPercentage*100)}%)! Chequeando retirada.`);
    }
    // Podrías añadir chequeos si está flanqueada, superada en número, etc.

    if (mustRetreat) {
        const hexData = board[unit.r]?.[unit.c];
        const inOwnDefensiveStructure = hexData && hexData.owner === unit.player && (hexData.isCity || hexData.structure === "Fortaleza");

        if (inOwnDefensiveStructure) {
            if (typeof logMessage === "function") logMessage(`${unit.name} está en una posición defensiva, no se retirará.`);
            return;
        }

        const retreatHexCoords = findSafeRetreatHex(unit, attacker);
        if (retreatHexCoords) {
            if (typeof logMessage === "function") logMessage(`${unit.name} se retira a (${retreatHexCoords.r},${retreatHexCoords.c})!`);
            
            // Lógica para mover la unidad al hex de retirada.
            // Esto debería ser un movimiento especial que no consume acción normal
            // y puede tener diferentes reglas. Por simplicidad, aquí solo actualizamos el estado.
            const fromR = unit.r;
            const fromC = unit.c;

            if (board[fromR]?.[fromC]) board[fromR][fromC].unit = null;
            
            unit.r = retreatHexCoords.r;
            unit.c = retreatHexCoords.c;
            
            if (board[unit.r]?.[unit.c]) board[unit.r][unit.c].unit = unit;
            else { console.error(`[Retreat] Hex de retirada (${unit.r},${unit.c}) inválido.`); return; }

            if (typeof positionUnitElement === "function") positionUnitElement(unit);
            if (typeof renderSingleHexVisuals === "function") {
                renderSingleHexVisuals(fromR, fromC);
                renderSingleHexVisuals(unit.r, unit.c);
            }
            // Si la unidad retirada era la seleccionada, actualizar la UI
            if (selectedUnit && selectedUnit.id === unit.id) {
                if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
                if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights(); // Ya no puede actuar
            }

        } else {
            if (typeof logMessage === "function") logMessage(`${unit.name} no pudo encontrar un lugar seguro para retirarse y debe luchar! (O se rinde/destruye si la moral es 0)`);
            // Aquí podrías implementar rendición o destrucción si no hay retirada posible.
        }
    }
}

// ---------------------------------------------------------------------------------
// LÓGICA DE FLANQUEO
// ---------------------------------------------------------------------------------
function applyFlankingPenalty(targetUnit, mainAttacker) {
    if (!targetUnit || !mainAttacker || !board) return;

    targetUnit.isFlanked = false; // Resetear por defecto
    let flankingAttackersCount = 0;
    const neighbors = getHexNeighbors(targetUnit.r, targetUnit.c);

    for (const n_coord of neighbors) {
        const neighborUnit = getUnitOnHex(n_coord.r, n_coord.c);
        // Un enemigo está flanqueando si:
        // 1. Es una unidad
        // 2. No es del mismo jugador que la unidad objetivo
        // 3. No es el atacante principal (ya que ese es el ataque directo, no el de flanqueo)
        // 4. (Opcional) Puede atacar a la unidad objetivo (ej. está en su rango de ataque y tiene línea de visión)
        if (neighborUnit && 
            neighborUnit.player !== targetUnit.player && 
            neighborUnit.id !== mainAttacker.id) {
            
            // Para un chequeo más avanzado, verificar si esta unidad flanqueadora PUEDE atacar al objetivo
            // if (isValidAttack(neighborUnit, targetUnit)) { // ¡CUIDADO CON RECURSIÓN INFINITA SI isValidAttack LLAMA A ESTO!
            //    flankingAttackersCount++;
            // }
            // Por ahora, una simplificación: si es un enemigo adyacente (que no es el atacante principal), cuenta.
            flankingAttackersCount++;
        }
    }

    if (flankingAttackersCount > 0) {
        targetUnit.isFlanked = true; // Esta propiedad se usaría en applyDamage
        console.log(`[Flanking] ${targetUnit.name} está flanqueada por ${flankingAttackersCount} unidad(es) enemiga(s) adicional(es).`);
        if (typeof logMessage === "function") logMessage(`${targetUnit.name} está siendo flanqueada! (- Defensa)`);
    }
}

function applyDamage(attacker, target) {
    if (!attacker || !target) { 
        console.error("[applyDamage] Error: Atacante u objetivo nulo.");
        return 0; 
    }
    // Asumimos que attacker y target tienen propiedades 'attack' y 'defense'
    let baseDamage = attacker.attack || 0; 
    let defensePower = target.defense || 0; 
    
    const targetHexData = board[target.r]?.[target.c];
    let terrainDefenseBonus = 0;
    // ASUME que TERRAIN_TYPES está definido en constants.js y tiene una propiedad defenseBonus
    if (targetHexData && targetHexData.terrain && typeof TERRAIN_TYPES !== 'undefined' && TERRAIN_TYPES[targetHexData.terrain]) {
        terrainDefenseBonus = TERRAIN_TYPES[targetHexData.terrain].defenseBonus || 0;
    }
    defensePower += terrainDefenseBonus;

    let flankingMultiplier = target.isFlanked ? 1.25 : 1.0; // Asume que target.isFlanked se establece antes
    let effectiveAttack = baseDamage * flankingMultiplier;
    let damageDealt = Math.round(effectiveAttack - defensePower);
    
    if (damageDealt < 0) {
        damageDealt = 0; // No se puede curar con un ataque
    } else if (effectiveAttack > 0 && damageDealt === 0) {
        damageDealt = 1; // Daño mínimo si el ataque no fue nulo pero la defensa lo igualó/superó
    }

    damageDealt = Math.min(damageDealt, target.currentHealth); // No hacer más daño que la salud restante
    
    target.currentHealth -= damageDealt; // <<< APLICAR EL DAÑO
    
    console.log(`[applyDamage] ${attacker.name} (Atk:${baseDamage}) vs ${target.name} (Def:${defensePower}). Daño: ${damageDealt}. ${target.name} Salud restante: ${target.currentHealth}`);
    if (typeof logMessage === "function" && damageDealt > 0) {
        logMessage(`${attacker.name} inflige ${damageDealt} daño a ${target.name}.`);
    }
    
    target.isFlanked = false; // Resetear estado de flanqueo
    return damageDealt;
}

async function attackUnit(attacker, defender) {
    if (!attacker || !defender) { 
        console.error("attackUnit: Atacante o defensor nulo."); 
        return; 
    }
    if (gameState.currentPhase === 'play' && attacker.player === gameState.currentPlayer && attacker.hasAttacked) {
        if (typeof logMessage === "function") logMessage(`${attacker.name} ya ha atacado este turno.`);
        return; 
    }
    if ((attacker.attack || 0) <= 0 && !(attacker.canAttackWithoutDamage)) { // canAttackWithoutDamage es hipotético
         if (typeof logMessage === "function") logMessage(`${attacker.name} no puede atacar (ataque 0).`);
        return;
    }

    console.log(`[Combat] ${attacker.name} (J${attacker.player}) ataca a ${defender.name} (J${defender.player})`);
    if (typeof logMessage === "function") logMessage(`${attacker.name} ataca a ${defender.name}!`);
    
    if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(defender, attacker);

    let damageDealtToDefender = 0;
    if (typeof applyDamage === "function") { // Comprobar si applyDamage existe
        damageDealtToDefender = applyDamage(attacker, defender); // LLAMAR A applyDamage
    } else {
        console.error("¡ERROR CRÍTICO! La función applyDamage no está definida. No se puede aplicar daño.");
        // Aquí no se hace nada más si applyDamage no existe, el combate no procede correctamente.
        return; // Salir si no se puede aplicar daño
    }
    
    if (typeof showCombatAnimation === "function") await showCombatAnimation(defender.element, attacker.element, damageDealtToDefender > 0 ? 'melee_hit' : 'miss');
    
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) {
        UIManager.updateUnitStrengthDisplay(defender); // Actualizar UI del defensor
    }

    if (defender.currentHealth <= 0) {
        if (typeof handleUnitDestroyed === "function") {
            handleUnitDestroyed(defender, attacker); // Llamar a destruir unidad
        }
    } else {
        // Lógica de Contraataque (asumiendo que tu lógica de contraataque aquí es correcta)
        const defenderCanCounterAttack = gameState.currentPhase === 'play' && (!defender.hasAttacked || defender.player !== gameState.currentPlayer || defender.canRetaliateIgnoringAction);
        if (defenderCanCounterAttack && typeof isValidAttack === "function" && isValidAttack(defender, attacker)) { 
            if (typeof logMessage === "function") logMessage(`${defender.name} contraataca!`);
            if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(attacker, defender);
            let damageDealtToAttacker = 0;
            if (typeof applyDamage === "function") { // Comprobar de nuevo para contraataque
                damageDealtToAttacker = applyDamage(defender, attacker);
            } else { console.error("¡ERROR CRÍTICO en contraataque! applyDamage no definida."); }
            if (typeof showCombatAnimation === "function") await showCombatAnimation(attacker.element, defender.element, damageDealtToAttacker > 0 ? 'counter_attack_hit' : 'miss');
            if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(attacker);
            if (attacker.currentHealth <= 0) {
                if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(attacker, defender);
            }
        }
    }

    // Marcar al atacante como que ya actuó (SOLO si es el jugador actual y la batalla está en juego)
    if (gameState.currentPhase === 'play' && attacker.currentHealth > 0 && attacker.player === gameState.currentPlayer) {
        attacker.hasAttacked = true; // <<< ESENCIAL
        console.log(`[Combat] ${attacker.name} completó su acción de ataque. hasAttacked: ${attacker.hasAttacked}`);
    }

    if (attacker.currentHealth > 0 && typeof handlePostBattleRetreat === "function") handlePostBattleRetreat(attacker, defender);
    if (defender.currentHealth > 0 && typeof handlePostBattleRetreat === "function") handlePostBattleRetreat(defender, attacker);

    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) {
        UIManager.updateSelectedUnitInfoPanel(); 
    }
    
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if(checkVictory()) return; }

    if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth > 0) {
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(attacker);
    } else if (selectedUnit && selectedUnit.id === attacker.id && attacker.currentHealth <= 0) { 
        if (typeof deselectUnit === "function") deselectUnit(); 
    }
}
// ---------------------------------------------------------------------------------
// FUNCIÓN DE RESETEO DE TURNO
// ---------------------------------------------------------------------------------
function resetUnitsForNewTurn(playerNumber) { 
    console.log(`%c[TurnStart] Reseteando unidades para Jugador ${playerNumber}`, "color: blue; font-weight: bold;");
    if (!units || !Array.isArray(units)) { console.error("[TurnStart] 'units' no disponible."); return; }
    units.forEach(unit => {
        if (unit.player === playerNumber) {
            if (typeof unit.movement !== 'number' || unit.movement <= 0) {
                const unitTypeMovement = (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[unit.type]) ? UNIT_TYPES[unit.type].movement : null;
                unit.movement = unitTypeMovement || 3;
            }
            // CORREGIDO AQUÍ PARA USAR unit.attackRange consistente con REGIMENT_TYPES
            if (typeof unit.attackRange !== 'number' || unit.attackRange < 0) {
                const unitTypeAttackRange = (typeof UNIT_TYPES !== 'undefined' && UNIT_TYPES[unit.type]) ? UNIT_TYPES[unit.type].attackRange : undefined;
                console.warn(`[TurnStart] ${unit.name} (tipo ${unit.type}) no tiene 'attackRange' válido (valor: ${unit.attackRange}). Usando ${unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0)}.`);
                unit.attackRange = unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0);
            }

            unit.currentMovement = unit.movement;
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.isFlanked = false; 
            // console.log(`   L-> ${unit.name} reseteada: mov=${unit.currentMovement}, attackRange=${unit.attackRange}`);
        }
    });
    if (typeof deselectUnit === "function") deselectUnit(); 
    if (typeof UIManager !== 'undefined') {
        if (UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel(); 
        if (UIManager.updatePlayerAndPhaseInfo) UIManager.updatePlayerAndPhaseInfo(); 
    }
}

// ---------------------------------------------------------------------------------
// FUNCIÓN DESHACER
// ---------------------------------------------------------------------------------
async function undoLastUnitMove(unit) {
    if (!unit || !unit.lastMove) {
        logMessage("No hay movimiento para deshacer en esta unidad.");
        return;
    }
    if (unit.hasAttacked) { // No permitir deshacer si atacó después del movimiento.
        logMessage("No se puede deshacer: la unidad ya ha atacado.");
        return;
    }
    if (unit.player !== gameState.currentPlayer) { // Solo deshacer para el jugador actual.
        logMessage("No puedes deshacer el movimiento de una unidad enemiga.");
        return;
    }

    const prevR = unit.lastMove.fromR;
    const prevC = unit.lastMove.fromC;
    const currentR = unit.r;
    const currentC = unit.c;

    logMessage(`Deshaciendo movimiento de ${unit.name} de (${currentR},${currentC}) a (${prevR},${prevC}).`);

    // 1. Liberar el hexágono actual
    if (board[currentR]?.[currentC]) {
        board[currentR][currentC].unit = null;
        // Restaurar el dueño del hexágono si cambió
        // Simplificado: si el hexágono era neutral y ahora es nuestro, al deshacer debería volver a ser neutral.
        // Si tienes un sistema más complejo de propiedad de hexágonos al mover, necesitarías registrar el owner original.
        if (board[currentR][currentC].owner === unit.player && !board[currentR][currentC].isCity) { // Si no es ciudad, asumimos que puede volver a ser neutral.
            // Para ser preciso, necesitaríamos guardar el `owner` original del hex en `lastMove`.
            // Por ahora, asumimos que si no era ciudad y no era de IA (que no mueve), es neutral.
            // O una solución más simple: el owner del hexágono solo cambia cuando una unidad se asienta.
            // No revertimos el owner aquí a menos que sea crucial para la UI/juego.
        }
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(currentR, currentC);
    }

    // 2. Mover la unidad a su posición anterior
    unit.r = prevR;
    unit.c = prevC;
    
    // 3. Asignar la unidad al hexágono anterior
    if (board[prevR]?.[prevC]) {
        board[prevR][prevC].unit = unit;
        // Si el hexágono anterior era propiedad del jugador, asegurarlo.
        if (board[prevR][prevC].owner !== unit.player) {
             board[prevR][prevC].owner = unit.player;
             if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(prevR, prevC);
        }
    }

    // 4. Restaurar el estado de movimiento y ataque
    unit.currentMovement = unit.lastMove.initialCurrentMovement;
    unit.hasMoved = unit.lastMove.initialHasMoved;
    unit.hasAttacked = unit.lastMove.initialHasAttacked;
    
    // 5. Limpiar el registro del último movimiento
    unit.lastMove = null;

    // 6. Actualizar la UI
    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
    if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit); // Resaltar de nuevo las acciones disponibles
}


console.log("unit_Actions.js CARGA COMPLETA (Corregido para usar 'attackRange')");