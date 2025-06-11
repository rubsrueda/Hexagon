// unit_Actions.js
// Lógica relacionada con las acciones de las unidades (selección, movimiento, ataque, colocación).
// VERSIÓN CORREGIDA PARA USAR 'attackRange' consistentemente

console.log("unit_Actions.js CARGADO (Corregido para usar 'attackRange')");

// ---------------------------------------------------------------------------------
// OBTENER VECINOS DE HEXÁGONO (¡CRUCIAL!)
// ---------------------------------------------------------------------------------

function getHexNeighbors(r, c) {
    const neighbor_directions = [
        [ {r: 0, c: +1}, {r: -1, c: 0}, {r: -1, c: -1}, {r: 0, c: -1}, {r: +1, c: -1}, {r: +1, c: 0} ],
        [ {r: 0, c: +1}, {r: -1, c: +1}, {r: -1, c: 0}, {r: 0, c: -1}, {r: +1, c: 0}, {r: +1, c: +1} ]
    ];

    const directions = neighbor_directions[r % 2];
    const neighbors = [];

    for (const dir of directions) {
        neighbors.push({ r: r + dir.r, c: c + dir.c });
    }

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
    
    const maxDistanceToSearch = startCoords.attackRange ? startCoords.attackRange + 2 : 30;
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

    // --- CAMBIO CLAVE: NO PERMITIR COLOCAR EN AGUA ---
    if (TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) {
        logMessage("No se puede colocar una unidad terrestre en agua.");
        if (unitToPlace.cost) { // Reembolsar si se intentó colocar en agua
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
        return; // Salir si es agua
    }
    // --- FIN CAMBIO CLAVE ---


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
    unitData.currentMovement = unitData.movement; // Se mantiene el currentMovement normal al crear
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
        console.log(`[placeFinalizedDivision DEBUG] Unidad ${unitData.name} (J${unitData.player}, HP:${unitData.currentHealth}) PUSHED. Total units: ${units.length}`);
        const justAdded = units.find(u => u.id === unitData.id); 
        if (justAdded) {
            console.log(`[placeFinalizedDivision DEBUG] Verificando: ID=${justAdded.id}, Player=${justAdded.player}, HP=${justAdded.currentHealth}, R=${justAdded.r}, C=${justAdded.c}, Nombre=${justAdded.name}`);
        } else {
            console.error(`[placeFinalizedDivision DEBUG] ERROR: No se encontró la unidad recién añadida en el array 'units'.`);
        }
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
    if (!unit || !XP_LEVELS) return false; 
    if (XP_LEVELS[unit.level]?.nextLevelXp === 'Max') return false; 

    let newLevelAssigned = false;
    while (true) {
        const currentLevelData = XP_LEVELS[unit.level];
        if (!currentLevelData || currentLevelData.nextLevelXp === 'Max') {
            break; 
        }
        const xpNeededForNextLevel = currentLevelData.nextLevelXp; 
        let awardedLevel = 0;
        for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
            if (XP_LEVELS[i].nextLevelXp === 'Max' && XP_LEVELS[i-1] && unit.experience >= XP_LEVELS[i-1].nextLevelXp) { 
                 awardedLevel = i;
                 break;
            }
            if (typeof XP_LEVELS[i].nextLevelXp === 'number' && unit.experience >= XP_LEVELS[i].nextLevelXp) {
                awardedLevel = i;
                break;
            }
        }
        if (unit.experience < XP_LEVELS[1].nextLevelXp ) { 
             awardedLevel = 0;
        }

        if (awardedLevel > unit.level) {
            unit.level = awardedLevel;
            const newLevelData = XP_LEVELS[unit.level];
            newLevelAssigned = true;

            if (typeof logMessage === "function") {
                logMessage(`${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
            }
            if (newLevelData.nextLevelXp === 'Max') break;
        } else {
            break;
        }
    }

    if (newLevelAssigned) {
        if (selectedUnit && selectedUnit.id === unit.id && typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(selectedUnit, true);
        }
    }
    return newLevelAssigned;
}

function mergeUnits(mergingUnit, targetUnit) { 
    if (!mergingUnit || !targetUnit || mergingUnit.player !== targetUnit.player || mergingUnit.id === targetUnit.id) {
        console.error("[Merge] Condiciones inválidas para fusionar.", mergingUnit, targetUnit);
        return false; 
    }

    const availableSlotsInTarget = MAX_REGIMENTS_PER_DIVISION - (targetUnit.regiments?.length || 0);
    if (availableSlotsInTarget <= 0) {
        const msg = `${targetUnit.name} ya tiene el máximo de regimientos (${MAX_REGIMENTS_PER_DIVISION}). No se puede fusionar.`;
        logMessage(msg);
        if (typeof UIManager !== 'undefined' && UIManager.showMessageTemporarily) UIManager.showMessageTemporarily(msg, 3000, true);
        selectUnit(targetUnit); 
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

    const costToReach = getMovementCost(mergingUnit, mergingUnit.r, mergingUnit.c, targetUnit.r, targetUnit.c, true);
    if (costToReach === Infinity || costToReach > (mergingUnit.currentMovement || 0)) {
        logMessage(`${mergingUnit.name} no puede alcanzar a ${targetUnit.name} para fusionarse.`);
        return false;
    }

    if (!window.confirm(`¿Fusionar ${mergingUnit.name} con ${targetUnit.name}? ${mergingUnit.name} se disolverá y sus regimientos (hasta ${numRegimentsToTransfer}) se unirán a ${targetUnit.name}.`)) {
        logMessage("Fusión cancelada.");
        return false;
    }

    console.log(`[Merge] Fusionando ${numRegimentsToTransfer} regimiento(s) de ${mergingUnit.name} en ${targetUnit.name}.`);
    logMessage(`${mergingUnit.name} se fusiona con ${targetUnit.name}.`);

    for (let i = 0; i < numRegimentsToTransfer; i++) {
        if (mergingUnit.regiments[i]) { 
            targetUnit.regiments.push(JSON.parse(JSON.stringify(mergingUnit.regiments[i]))); 
        }
    }

    let combinedCurrentHealth = targetUnit.currentHealth + mergingUnit.currentHealth;

    let newAttack = 0, newDefense = 0, newMaxHealth = 0;
    let newMovement = Infinity, newVision = 0, newAttackRange = 0, newInitiative = 0;
    let baseSprite = targetUnit.regiments.length > 0 ? REGIMENT_TYPES[targetUnit.regiments[0].type]?.sprite || '❓' : '❓'; 

    targetUnit.regiments.forEach(reg => {
        const regData = REGIMENT_TYPES[reg.type] || {}; 
        newAttack += regData.attack || 0;
        newDefense += regData.defense || 0;
        newMaxHealth += regData.health || 0;
        newMovement = Math.min(newMovement, regData.movement || 1);
        newVision = Math.max(newVision, regData.visionRange || 0);
        newAttackRange = Math.max(newAttackRange, regData.attackRange || 0);
        newInitiative = Math.max(newInitiative, regData.initiative || 0); 
    });
    newMovement = (newMovement === Infinity) ? 1 : newMovement;

    targetUnit.attack = newAttack;
    targetUnit.defense = newDefense;
    targetUnit.maxHealth = newMaxHealth;
    targetUnit.currentHealth = Math.min(combinedCurrentHealth, newMaxHealth); 
    targetUnit.movement = newMovement;
    targetUnit.visionRange = newVision;
    targetUnit.attackRange = newAttackRange;
    targetUnit.initiative = newInitiative;
    targetUnit.sprite = baseSprite; 

    targetUnit.experience = (targetUnit.experience || 0) + (mergingUnit.experience || 0);
    if (typeof checkAndApplyLevelUp === "function") { 
        checkAndApplyLevelUp(targetUnit); 
    }
    
    mergingUnit.currentMovement -= costToReach;
    mergingUnit.hasMoved = true;
    mergingUnit.hasAttacked = true;

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
    
    if (typeof UIManager !== 'undefined') {
        UIManager.updateUnitStrengthDisplay(targetUnit); 
        if (selectedUnit && selectedUnit.id === mergingUnit.id) { 
            deselectUnit(); 
            selectUnit(targetUnit); 
        } else if (selectedUnit && selectedUnit.id === targetUnit.id) {
            UIManager.showUnitContextualInfo(targetUnit, true); 
        }
        UIManager.updatePlayerAndPhaseInfo();
    }
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") checkVictory();

    return true; 
}

function isValidMove(unit, toR, toC, isPotentialMerge = false) {
    if (!unit) {
        return false; 
    }
    
    if (gameState.currentPhase === 'play') {
        if (unit.hasMoved && !isPotentialMerge) { 
            return false; 
        }
        if ((unit.currentMovement || 0) <= 0 && !isPotentialMerge) { 
            return false;
        }
    }

    if (unit.r === toR && unit.c === toC) {
        return false;
    }

    const targetHexData = board[toR]?.[toC]; 
    if (!targetHexData) return false; // Hexágono destino inválido.

    // --- CORRECCIÓN CÓDIGO B.1.d): Restricción de Agua ---
    // Si el terreno es agua y es intransitable para unidades terrestres
    if (TERRAIN_TYPES[targetHexData.terrain]?.isImpassableForLand) {
        return false;
    }
    // --- FIN CORRECCIÓN ---

    const targetUnitOnHex = getUnitOnHex(toR, toC); 

    if (targetUnitOnHex) { 
        if (isPotentialMerge && targetUnitOnHex.player === unit.player && targetUnitOnHex.id !== unit.id) {
            if (gameState.currentPhase === 'play' && (unit.currentMovement || 0) <= 0) { 
                return false;
            }
            const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, true); 
            const canMoveToMerge = cost !== Infinity && cost <= (unit.currentMovement || 0);
            return canMoveToMerge;
        } else {
            return false; 
        }
    } else { 
        if (isPotentialMerge) {
            return false; 
        }
        const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, false); 
        const canMoveToEmpty = cost !== Infinity && cost <= (unit.currentMovement || 0);
        return canMoveToEmpty;
    }
}

function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    if (!selectedUnit) {
        console.error("CRITICAL: handleActionWithSelectedUnit sin selectedUnit.");
        return false; 
    }

    if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.id === selectedUnit.id) {
        if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
            if (typeof cancelPreparingAction === "function") cancelPreparingAction();
            if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) UIManager.showUnitContextualInfo(selectedUnit, true);
        }
        return false; 
    }

    if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
        if (gameState.preparingAction.type === "move") {
            if (!clickedUnitOnTargetHex && isValidMove(selectedUnit, r_target, c_target, false)) { 
                if (typeof moveUnit === "function") moveUnit(selectedUnit, r_target, c_target);
                if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                return true;
            } else if (clickedUnitOnTargetHex && clickedUnitOnTargetHex.player === selectedUnit.player) {
                console.log(`[handleAction PREPARED_MOVE] Intento de FUSIÓN (desde modo mover): ${selectedUnit.name} sobre ${clickedUnitOnTargetHex.name}`);
                if (isValidMove(selectedUnit, r_target, c_target, true)) { 
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

    if (clickedUnitOnTargetHex) { 
        if (clickedUnitOnTargetHex.player === selectedUnit.player && clickedUnitOnTargetHex.id !== selectedUnit.id) {
            console.log(`[handleAction DIRECT_CLICK] Intento de FUSIÓN: ${selectedUnit.name} sobre ${clickedUnitOnTargetHex.name}`);
            if (isValidMove(selectedUnit, r_target, c_target, true)) { 
                if (typeof mergeUnits === "function") {
                    mergeUnits(selectedUnit, clickedUnitOnTargetHex);
                    return true; 
                } else { 
                    console.error("Función mergeUnits no definida."); 
                    return false; 
                }
            } else {
                logMessage(`No se puede alcanzar a ${clickedUnitOnTargetHex.name} para fusionar.`);
                return false; 
            }
        } else if (clickedUnitOnTargetHex.player !== selectedUnit.player) { 
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
    } else { 
        console.log(`[handleAction DIRECT_CLICK] Intento de MOVIMIENTO de ${selectedUnit.name} a hex vacío (${r_target},${c_target})`);
        if (isValidMove(selectedUnit, r_target, c_target, false)) { 
            if (typeof moveUnit === "function") { 
                moveUnit(selectedUnit, r_target, c_target); 
                return true; 
            } else { console.error("Función moveUnit no definida."); return false;}
        }
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
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(selectedUnit);
        return; 
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

    const canStillAct = gameState.currentPhase !== 'play' || (!unit.hasMoved || !unit.hasAttacked);
    if (canStillAct) {
        if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
    } else {
        if (typeof logMessage === "function") logMessage(`${unit.name} ya ha actuado este turno.`);
        if (typeof clearHighlights === "function") clearHighlights();
    }
    console.log(`[DEBUG selectUnit] FIN - selectedUnit ahora es: ${selectedUnit?.name}`);
}

function deselectUnit() {
    if (selectedUnit && selectedUnit.element) {
        selectedUnit.element.classList.remove('selected-unit');
    }
    selectedUnit = null;
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
    else if (typeof clearHighlights === "function") clearHighlights();
}

function highlightPossibleActions(unit) {
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
    document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
        h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
    });
}

// ---------------------------------------------------------------------------------
// LÓGICA DE MOVIMIENTO
// ---------------------------------------------------------------------------------

function getMovementCost(unit, r_start, c_start, r_target, c_target, isPotentialMerge = false) {
    if (!unit) { return Infinity; }
    if (r_start === r_target && c_start === c_target) return 0;

    let queue = [{ r: r_start, c: c_start, cost: 0, path: [`${r_start},${c_start}`] }]; 
    let visited = new Set();
    visited.add(`${r_start},${c_start}`);
    
    const maxSearchDepth = Math.max(unit.movement || 1, 15); 
    let iterations = 0;
    const maxIterations = maxSearchDepth * BOARD_ROWS * BOARD_COLS / 2; 

    while (queue.length > 0 && iterations < maxIterations) { 
        iterations++;
        let current = queue.shift();

        let neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const neighborHexData = board[neighbor.r]?.[neighbor.c];
            if (!neighborHexData) continue; 

            let terrainMoveCost = 1; 
            if (TERRAIN_TYPES[neighborHexData.terrain]) {
                terrainMoveCost = TERRAIN_TYPES[neighborHexData.terrain].movementCostMultiplier || 1;
                if (TERRAIN_TYPES[neighborHexData.terrain].isImpassableForLand) {
                    continue; 
                }
            }
            const costToEnterNeighbor = current.cost + terrainMoveCost;

            if (neighbor.r === r_target && neighbor.c === c_target) {
                const unitAtTarget = getUnitOnHex(neighbor.r, neighbor.c);
                if (isPotentialMerge) {
                    return costToEnterNeighbor;
                } else if (!unitAtTarget) {
                    return costToEnterNeighbor;
                }
                continue; 
            }

            const visitedKey = `${neighbor.r},${neighbor.c}`;
            if (!visited.has(visitedKey)) {
                const unitAtNeighbor = getUnitOnHex(neighbor.r, neighbor.c);
                if (!unitAtNeighbor) { 
                    visited.add(visitedKey);
                    let newPath = [...current.path, visitedKey];
                    queue.push({ r: neighbor.r, c: neighbor.c, cost: costToEnterNeighbor, path: newPath });
                }
            }
        }
    }
    return Infinity;
}

async function moveUnit(unit, toR, toC) {
    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC]; 

    if (unit.player === gameState.currentPlayer) {
        unit.lastMove = {
            fromR: fromR,
            fromC: fromC,
            initialCurrentMovement: unit.currentMovement, 
            initialHasMoved: unit.hasMoved,              
            initialHasAttacked: unit.hasAttacked,         
            movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null 
        };
        console.log(`[Undo] Registrando lastMove para ${unit.name}: (${fromR},${fromC}). Hex destino original owner: ${unit.lastMove.movedToHexOriginalOwner}`);
    }
    
    const costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);

    // --- CAMBIO CLAVE: Aplicar minMovement del terreno de destino ---
    let effectiveCostOfMove = costOfThisMove;
    if (targetHexData && TERRAIN_TYPES[targetHexData.terrain]) {
        const terrainMinMovement = TERRAIN_TYPES[targetHexData.terrain].minMovement || 0;
        // Si el coste calculado es 0 (ej. moverse al mismo hex), no queremos que se vea afectado.
        // Si el coste es mayor a 0 y es menor que el minMovement del terreno, ajustamos el coste.
        if (effectiveCostOfMove > 0 && effectiveCostOfMove < terrainMinMovement) {
            effectiveCostOfMove = terrainMinMovement;
        }
    }
    // --- FIN CAMBIO CLAVE ---


    if (effectiveCostOfMove === Infinity || effectiveCostOfMove > unit.currentMovement || (gameState.currentPhase === 'play' && unit.hasMoved) || unit.currentMovement <= 0) {
        logMessage(`Movimiento inválido para ${unit.name}.`);
        if (selectedUnit && selectedUnit.id === unit.id && typeof highlightPossibleActions === "function") highlightPossibleActions(unit);
        return;
    }
    if (board[fromR]?.[fromC]) { 
        board[fromR][fromC].unit = null;
        renderSingleHexVisuals(fromR, fromC); 
    }
    
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= effectiveCostOfMove; // Usar effectiveCostOfMove
    if (gameState.currentPhase === 'play') { unit.hasMoved = true; } 
    
    if (targetHexData) {
        targetHexData.unit = unit;
        if (targetHexData.owner !== unit.player) { 
            targetHexData.owner = unit.player;
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner !== unit.player) {
                city.owner = unit.player;
                logMessage(`¡Ciudad ${city.name} capturada por Jugador ${unit.player}!`);
            }
        }
        renderSingleHexVisuals(toR, toC); 
    } else { 
        console.error(`[moveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado en el tablero.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += effectiveCostOfMove; 
        if (gameState.currentPhase === 'play') unit.hasMoved = false; 
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit; 
        renderSingleHexVisuals(fromR, fromC); 
        return; 
    }
    
    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof positionUnitElement === "function") positionUnitElement(unit); 
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
    if (attacker.player === gameState.currentPlayer && gameState.currentPhase === 'play' && attacker.hasAttacked) { return false; } 
    if (attacker.id === defender.id) { return false; }
    if (attacker.player === defender.player) { return false; }

    // --- CORRECCIÓN CÓDIGO B.1.d): No permitir combate si atacante o defensor están en agua ---
    const attackerHexData = board[attacker.r]?.[attacker.c];
    const defenderHexData = board[defender.r]?.[defender.c];

    if (attackerHexData && TERRAIN_TYPES[attackerHexData.terrain]?.isImpassableForLand) {
        console.log(`[isValidAttack] Atacante ${attacker.name} está en terreno intransitable (${attackerHexData.terrain}). No puede atacar.`);
        return false;
    }
    if (defenderHexData && TERRAIN_TYPES[defenderHexData.terrain]?.isImpassableForLand) {
        console.log(`[isValidAttack] Defensor ${defender.name} está en terreno intransitable (${defenderHexData.terrain}). No puede ser atacado.`);
        return false;
    }
    // --- FIN CORRECCIÓN ---

    const distance = hexDistance(attacker.r, attacker.c, defender.r, defender.c);
    const range = attacker.attackRange === undefined ? 1 : attacker.attackRange; 
    
    return distance !== Infinity && distance <= range;
}

async function attackUnit(attacker, defender) {
    if (!attacker || !defender) { console.error("attackUnit: Atacante o defensor nulo."); return; }
    if (gameState.currentPhase === 'play' && attacker.player === gameState.currentPlayer && attacker.hasAttacked) { 
        if (typeof logMessage === "function") logMessage(`${attacker.name} ya ha atacado.`); return;
    }
    if ((attacker.attack || 0) <= 0 && !(attacker.canAttackWithoutDamage)) { 
         if (typeof logMessage === "function") logMessage(`${attacker.name} no puede atacar (ataque 0).`);
        return;
    }

    console.log(`[Combat] ${attacker.name} (J${attacker.player}) ataca a ${defender.name} (J${defender.player})`);
    if (typeof logMessage === "function") logMessage(`${attacker.name} ataca a ${defender.name}!`);
    
    if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(defender, attacker);

    let damageDealtToDefender = 0;
    if (typeof applyDamage === "function") { 
        damageDealtToDefender = applyDamage(attacker, defender); 
    } else {
        console.error("¡ERROR CRÍTICO! La función applyDamage no está definida. No se puede aplicar daño.");
        return; 
    }
    
    if (typeof showCombatAnimation === "function") await showCombatAnimation(defender.element, attacker.element, damageDealtToDefender > 0 ? 'melee_hit' : 'miss');
    
    if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) {
        UIManager.updateUnitStrengthDisplay(defender); 
    }

    if (damageDealtToDefender > 0 && attacker.player === gameState.currentPlayer) { 
        const goldForDamage = Math.floor(damageDealtToDefender / 4); 
        if (goldForDamage > 0) {
            gameState.playerResources[attacker.player].oro += goldForDamage;
            if (typeof logMessage === "function") {
                logMessage(`${attacker.name} gana ${goldForDamage} oro por dañar a ${defender.name}.`);
            }
        }
    }

    if (defender.currentHealth <= 0) {
        if (typeof handleUnitDestroyed === "function") {
            handleUnitDestroyed(defender, attacker); 
        }
    } else {
        const defenderCanCounterAttack = gameState.currentPhase === 'play' && (!defender.hasAttacked || defender.player !== gameState.currentPlayer || defender.canRetaliateIgnoringAction);
        if (defenderCanCounterAttack && typeof isValidAttack === "function" && isValidAttack(defender, attacker)) { 
            if (typeof logMessage === "function") logMessage(`${defender.name} contraataca!`);
            if (typeof applyFlankingPenalty === "function") applyFlankingPenalty(attacker, defender);
            let damageDealtToAttacker = 0;
            if (typeof applyDamage === "function") { 
                damageDealtToAttacker = applyDamage(defender, attacker);
            } else { console.error("¡ERROR CRÍTICO en contraataque! applyDamage no definida."); }
            if (typeof showCombatAnimation === "function") await showCombatAnimation(attacker.element, defender.element, damageDealtToAttacker > 0 ? 'counter_attack_hit' : 'miss');
            if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(attacker);
            if (attacker.currentHealth <= 0) {
                if (typeof handleUnitDestroyed === "function") handleUnitDestroyed(attacker, defender);
            }
        }
    }

    if (gameState.currentPhase === 'play' && attacker.currentHealth > 0 && attacker.player === gameState.currentPlayer) {
        attacker.hasAttacked = true; 
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

const COMBAT_ANIMATION_DURATION = 500; 

async function showCombatAnimation(targetUnit, attackerUnit, type) { 
    // ... (Tu código de animación de combate aquí, sin cambios) ...
    // Asegúrate de que este bloque de código está completo en tu archivo.
    // Solo estoy poniendo el inicio y fin de la función por brevedad.
}


function applyDamage(attacker, target) {
    if (!attacker || !target) { 
        console.error("[applyDamage] Error: Atacante u objetivo nulo.");
        return 0; 
    }
    
    let baseDamage = attacker.attack || 0; 
    let defensePower = target.defense || 0; 
    
    const targetHexData = board[target.r]?.[target.c];
    const attackerHexData = board[attacker.r]?.[attacker.c]; 

    let terrainDefenseBonus = 0;
    let terrainRangedDefenseBonus = 0;
    let terrainMeleeAttackBonus = 0;

    // --- CORRECCIÓN CÓDIGO B.1.b): Aplicar bonus de terreno a la defensa ---
    if (targetHexData && TERRAIN_TYPES[targetHexData.terrain]) {
        terrainDefenseBonus = TERRAIN_TYPES[targetHexData.terrain].defenseBonus || 0;
        terrainRangedDefenseBonus = TERRAIN_TYPES[targetHexData.terrain].rangedDefenseBonus || 0;
    }
    defensePower += terrainDefenseBonus; 
    
    // Si el ataque es a distancia, aplicar el bonus extra de defensa a distancia
    // Asumo que las unidades a distancia tienen attackRange > 1.
    if ((attacker.attackRange || 1) > 1) { 
        defensePower += terrainRangedDefenseBonus;
    }
    // --- FIN CORRECCIÓN (Defensa) ---

    // --- CORRECCIÓN CÓDIGO B.1.b): Aplicar bonus de terreno al ataque (solo cuerpo a cuerpo en Colinas) ---
    // Asumo que las unidades cuerpo a cuerpo tienen attackRange === 1.
    if (attackerHexData && TERRAIN_TYPES[attackerHexData.terrain]) {
        if (TERRAIN_TYPES[attackerHexData.terrain].name === "Colinas" && (attacker.attackRange || 1) === 1) {
             terrainMeleeAttackBonus = TERRAIN_TYPES[attackerHexData.terrain].meleeAttackBonus || 0;
        }
    }
    baseDamage += terrainMeleeAttackBonus; 
    // --- FIN CORRECCIÓN (Ataque) ---

    let flankingMultiplier = target.isFlanked ? 1.25 : 1.0; 
    let effectiveAttack = baseDamage * flankingMultiplier;
    let damageDealt = Math.round(effectiveAttack - defensePower);
    
    if (damageDealt < 0) {
        damageDealt = 0; 
    } else if (effectiveAttack > 0 && damageDealt === 0) {
        damageDealt = 1; 
    }

    damageDealt = Math.min(damageDealt, target.currentHealth); 
    
    target.currentHealth -= damageDealt; 
    
    console.log(`[applyDamage] ${attacker.name} (Atk:${baseDamage}, Terreno:${attackerHexData?.terrain || 'N/A'}) vs ${target.name} (Def:${defensePower}, Terreno:${targetHexData?.terrain || 'N/A'}). Daño: ${damageDealt}. ${target.name} Salud restante: ${target.currentHealth}`);
    if (typeof logMessage === "function" && damageDealt > 0) {
        logMessage(`${attacker.name} inflige ${damageDealt} daño a ${target.name}.`);
    }
    
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

    console.log(`[UnitDestroyed DEBUG] Intentando quitar DOM para ${destroyedUnit.name}.`);
    console.log(`[UnitDestroyed DEBUG] destroyedUnit.element:`, destroyedUnit.element);
    if (destroyedUnit.element) {
        console.log(`[UnitDestroyed DEBUG] destroyedUnit.element.parentElement:`, destroyedUnit.element.parentElement);
        console.log(`[UnitDestroyed DEBUG] gameBoard (del DOM global):`, gameBoard);
    }

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

    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) {
        units.splice(index, 1);
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del array 'units'.`);
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el array 'units' para eliminarla.`);
    }

    if (victorUnit && destroyedUnit.player !== victorUnit.player) {
        const experienceGained = REGIMENT_TYPES[destroyedUnit.regiments[0].type]?.experienceValue || 10; 
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

    if (typeof checkVictory === "function") checkVictory();
}

// ---------------------------------------------------------------------------------
// ACCIÓN DE REFUERZO DE UNIDAD
// ---------------------------------------------------------------------------------
function handleReinforceUnitAction(unitToReinforce) {
    console.log("%c[Reinforce] Iniciando acción de refuerzo...", "color: darkviolet; font-weight:bold;");

    if (!unitToReinforce) { unitToReinforce = selectedUnit; if (!unitToReinforce) { logMessage("No hay unidad seleccionada para reforzar."); return; } }
    console.log(`[Reinforce] Intentando reforzar a: ${unitToReinforce.name}`);
    if (unitToReinforce.currentHealth >= unitToReinforce.maxHealth) { logMessage("La unidad ya tiene la salud máxima."); return; }

     if (typeof isHexSuppliedForReinforce !== "function" || !isHexSuppliedForReinforce(unitToReinforce.r, unitToReinforce.c, unitToReinforce.player)) {
        const msg = "La unidad no está en una Capital/Fortaleza propia o adyacente a una.";
        logMessage(msg);
        UIManager.showMessageTemporarily(msg, 4000, true);
        return;
    }
    
    const healthToRestore = unitToReinforce.maxHealth - unitToReinforce.currentHealth;
    let baseUnitCostOro = 20; 
    const costFactorForFullHeal = 0.3; 
    let totalCost = Math.ceil(baseUnitCostOro * costFactorForFullHeal * (healthToRestore / unitToReinforce.maxHealth));
    totalCost = Math.max(1, totalCost); 

    if (gameState.playerResources[gameState.currentPlayer].oro < totalCost) { 
        logMessage(`No tienes suficiente oro para reforzar. Necesitas ${totalCost} de oro.`);
        return; 
    }

    const confirmationMessage = `Reforzar ${unitToReinforce.name} por ${healthToRestore} HP costará ${totalCost} de oro. ¿Continuar?`;
    
    const performReinforcement = () => {
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
        // Solo puede retirarse a hexágonos vacíos que no sean agua
        if (hexData && !hexData.unit && !TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) { 
            // Prioridad 1: Casilla propia
            if (hexData.owner === unit.player) {
                potentialRetreatHexes.push({ ...n_coord, priority: 1 });
            }
            // Prioridad 2: Casilla neutral
            else if (hexData.owner === null) {
                potentialRetreatHexes.push({ ...n_coord, priority: 2 });
            }
        }
    }

    potentialRetreatHexes.sort((a,b) => a.priority - b.priority);

    if (potentialRetreatHexes.length > 0) {
        return potentialRetreatHexes[0]; 
    }
    
    console.log(`[findSafeRetreatHex] ${unit.name} no encontró hex para retirarse.`);
    return null;
}

function handlePostBattleRetreat(unit, attacker) { 
    if (!unit || unit.currentHealth <= 0) return;

    const healthPercentage = unit.currentHealth / unit.maxHealth;
    let mustRetreat = false;

    if (healthPercentage < 0.25) { 
        mustRetreat = true;
        if (typeof logMessage === "function") logMessage(`${unit.name} tiene muy poca salud (${Math.round(healthPercentage*100)}%)! Chequeando retirada.`);
    }

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
            if (selectedUnit && selectedUnit.id === unit.id) {
                if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
                if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights(); 
            }

        } else {
            if (typeof logMessage === "function") logMessage(`${unit.name} no pudo encontrar un lugar seguro para retirarse y debe luchar! (O se rinde/destruye si la moral es 0)`);
        }
    }
}

// ---------------------------------------------------------------------------------
// LÓGICA DE FLANQUEO
// ---------------------------------------------------------------------------------
function applyFlankingPenalty(targetUnit, mainAttacker) {
    if (!targetUnit || !mainAttacker || !board) return;

    targetUnit.isFlanked = false; 
    let flankingAttackersCount = 0;
    const neighbors = getHexNeighbors(targetUnit.r, targetUnit.c);

    for (const n_coord of neighbors) {
        const neighborUnit = getUnitOnHex(n_coord.r, n_coord.c);
        if (neighborUnit && 
            neighborUnit.player !== targetUnit.player && 
            neighborUnit.id !== mainAttacker.id) {
            flankingAttackersCount++;
        }
    }

    if (flankingAttackersCount > 0) {
        targetUnit.isFlanked = true; 
        console.log(`[Flanking] ${targetUnit.name} está flanqueada por ${flankingAttackersCount} unidad(es) enemiga(s) adicional(es).`);
        if (typeof logMessage === "function") logMessage(`${targetUnit.name} está siendo flanqueada! (- Defensa)`);
    }
}

function applyDamage(attacker, target) {
    if (!attacker || !target) { 
        console.error("[applyDamage] Error: Atacante u objetivo nulo.");
        return 0; 
    }
    
    let baseDamage = attacker.attack || 0; 
    let defensePower = target.defense || 0; 
    
    const targetHexData = board[target.r]?.[target.c];
    const attackerHexData = board[attacker.r]?.[attacker.c]; 

    let terrainDefenseBonus = 0;
    let terrainRangedDefenseBonus = 0;
    let terrainMeleeAttackBonus = 0;

    // --- CORRECCIÓN CLAVE: Aplicar bonus de terreno a la defensa ---
    if (targetHexData && TERRAIN_TYPES[targetHexData.terrain]) {
        terrainDefenseBonus = TERRAIN_TYPES[targetHexData.terrain].defenseBonus || 0;
        terrainRangedDefenseBonus = TERRAIN_TYPES[targetHexData.terrain].rangedDefenseBonus || 0;
    }
    defensePower += terrainDefenseBonus; 
    
    // Si el ataque es a distancia (rango > 1), aplicar el bonus extra de defensa a distancia
    if ((attacker.attackRange || 1) > 1) { 
        defensePower += terrainRangedDefenseBonus;
    }
    // --- FIN CORRECCIÓN (Defensa) ---

    // --- CORRECCIÓN CLAVE: Aplicar bonus de terreno al ataque (solo cuerpo a cuerpo en Colinas) ---
    // Si el atacante está en Colinas y es una unidad cuerpo a cuerpo (rango 1), aplicar bonus de ataque
    if (attackerHexData && TERRAIN_TYPES[attackerHexData.terrain]) {
        if (TERRAIN_TYPES[attackerHexData.terrain].name === "Colinas" && (attacker.attackRange || 1) === 1) {
             terrainMeleeAttackBonus = TERRAIN_TYPES[attackerHexData.terrain].meleeAttackBonus || 0;
        }
    }
    baseDamage += terrainMeleeAttackBonus; 
    // --- FIN CORRECCIÓN (Ataque) ---

    let flankingMultiplier = target.isFlanked ? 1.25 : 1.0; 
    let effectiveAttack = baseDamage * flankingMultiplier;
    let damageDealt = Math.round(effectiveAttack - defensePower);
    
    if (damageDealt < 0) {
        damageDealt = 0; 
    } else if (effectiveAttack > 0 && damageDealt === 0) {
        damageDealt = 1; 
    }

    damageDealt = Math.min(damageDealt, target.currentHealth); 
    
    target.currentHealth -= damageDealt; 
    
    console.log(`[applyDamage] ${attacker.name} (Atk:${baseDamage}, Terreno:${attackerHexData?.terrain || 'N/A'}) vs ${target.name} (Def:${defensePower}, Terreno:${targetHexData?.terrain || 'N/A'}). Daño: ${damageDealt}. ${target.name} Salud restante: ${target.currentHealth}`);
    if (typeof logMessage === "function" && damageDealt > 0) {
        logMessage(`${attacker.name} inflige ${damageDealt} daño a ${target.name}.`);
    }
    
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

    console.log(`[UnitDestroyed DEBUG] Intentando quitar DOM para ${destroyedUnit.name}.`);
    console.log(`[UnitDestroyed DEBUG] destroyedUnit.element:`, destroyedUnit.element);
    if (destroyedUnit.element) {
        console.log(`[UnitDestroyed DEBUG] destroyedUnit.element.parentElement:`, destroyedUnit.element.parentElement);
        console.log(`[UnitDestroyed DEBUG] gameBoard (del DOM global):`, gameBoard);
    }

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

    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) {
        units.splice(index, 1);
        console.log(`[UnitDestroyed] Unidad ${destroyedUnit.name} eliminada del array 'units'.`);
    } else {
        console.warn(`[UnitDestroyed] No se encontró la unidad ${destroyedUnit.name} en el array 'units' para eliminarla.`);
    }

    if (victorUnit && destroyedUnit.player !== victorUnit.player) {
        const experienceGained = REGIMENT_TYPES[destroyedUnit.regiments[0].type]?.experienceValue || 10; 
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

    if (typeof checkVictory === "function") checkVictory();
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
                const unitTypeMovement = (typeof REGIMENT_TYPES !== 'undefined' && REGIMENT_TYPES[unit.regiments[0].type]) ? REGIMENT_TYPES[unit.regiments[0].type].movement : null;
                unit.movement = unitTypeMovement || 3;
            }
            if (typeof unit.attackRange !== 'number' || unit.attackRange < 0) {
                const unitTypeAttackRange = (typeof REGIMENT_TYPES !== 'undefined' && REGIMENT_TYPES[unit.regiments[0].type]) ? REGIMENT_TYPES[unit.regiments[0].type].attackRange : undefined;
                console.warn(`[TurnStart] ${unit.name} (tipo ${unit.regiments[0].type}) no tiene 'attackRange' válido (valor: ${unit.attackRange}). Usando ${unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0)}.`);
                unit.attackRange = unitTypeAttackRange !== undefined ? unitTypeAttackRange : ((unit.attack||0) > 0 ? 1 : 0);
            }

            unit.currentMovement = unit.movement;
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.isFlanked = false; 
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
    if (unit.hasAttacked) { 
        logMessage("No se puede deshacer: la unidad ya ha atacado.");
        return;
    }
    if (unit.player !== gameState.currentPlayer) { 
        logMessage("No puedes deshacer el movimiento de una unidad enemiga.");
        return;
    }

    const prevR = unit.lastMove.fromR;
    const prevC = unit.lastMove.fromC;
    const currentR = unit.r; 
    const currentC = unit.c;

    logMessage(`Deshaciendo movimiento de ${unit.name} de (${currentR},${currentC}) a (${prevR},${prevC}).`);

    if (board[currentR]?.[currentC]) {
        board[currentR][currentC].unit = null;
        board[currentR][currentC].owner = unit.lastMove.movedToHexOriginalOwner;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(currentR, currentC);
    }

    unit.r = prevR;
    unit.c = prevC;
    
    if (board[prevR]?.[prevC]) {
        board[prevR][prevC].unit = unit;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(prevR, prevC);
    }

    unit.currentMovement = unit.lastMove.initialCurrentMovement;
    unit.hasMoved = unit.lastMove.initialHasMoved;
    unit.hasAttacked = unit.lastMove.initialHasAttacked;
    
    unit.lastMove = null;

    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (typeof UIManager !== 'undefined' && UIManager.updateSelectedUnitInfoPanel) UIManager.updateSelectedUnitInfoPanel();
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
    if (typeof highlightPossibleActions === "function") highlightPossibleActions(unit); 
}

console.log("unit_Actions.js CARGA COMPLETA (Corregido para usar 'attackRange')");