/// unit_Actions.js
// Lógica relacionada con las acciones de las unidades (selección, movimiento, ataque, colocación).

console.log("unit_Actions.js CARGADO (Corregido para usar 'attackRange')");

function showFloatingDamage(target, damageAmount) {
    // Verificación robusta. gameBoard se obtiene directamente del DOM por seguridad.
    const gameBoardElement = document.getElementById('gameBoard');
    if (!target?.element || !gameBoardElement) {
        console.error("showFloatingDamage: No se puede mostrar el daño. Target, su elemento, o el gameBoard no existen.");
        return;
    }

    const damageText = document.createElement('span');
    damageText.className = 'damage-dealt-text';
    damageText.textContent = `-${damageAmount}`;

    // Lo añadimos al gameBoard para que se posicione relativo a él.
    gameBoardElement.appendChild(damageText);

    // Obtenemos el centro de la unidad atacada, relativo al gameBoard
    const unitCenterX = target.element.offsetLeft + target.element.offsetWidth / 2;
    const unitCenterY = target.element.offsetTop + target.element.offsetHeight / 2;

    // Ahora que está en el DOM, su `offsetWidth` es válido. Centramos el texto.
    damageText.style.left = `${unitCenterX - damageText.offsetWidth / 2}px`;
    damageText.style.top = `${unitCenterY - damageText.offsetHeight / 2}px`;

    // La animación CSS se encarga del resto. Lo eliminamos después.
    setTimeout(() => {
        damageText.remove();
    }, 1200); // Duración de la animación.
}

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

function handlePlacementModeClick(r, c) {
    console.log(`[Placement] Clic en (${r},${c}). Modo activo: ${placementMode.active}, Unidad: ${placementMode.unitData?.name || 'Ninguna'}`);
    
    if (!placementMode.active || !placementMode.unitData) {
        console.error("[Placement] Error: Modo de colocación inactivo o sin datos de unidad. Se cancelará.");
        placementMode.active = false;
        if (UIManager) UIManager.clearHighlights();
        return;
    }

    const unitToPlace = placementMode.unitData;
    const hexData = board[r]?.[c];

    if (!hexData) {
        logMessage("Hexágono inválido.");
        return; // Mantenemos el modo activo para que el jugador pueda intentarlo en otro sitio.
    }

    if (getUnitOnHex(r, c)) {
        logMessage(`Ya hay una unidad en este hexágono.`);
        return; // Mantenemos el modo activo.
    }

    let canPlace = false;
    let reasonForNoPlacement = "";

    // Lógica para reclutamiento DURANTE la partida (desde ciudad/fortaleza)
    if (gameState.currentPhase === "play") {
        if (!placementMode.recruitHex) {
            reasonForNoPlacement = "Error: Falta el origen del reclutamiento.";
            canPlace = false;
        } else {
            const dist = hexDistance(placementMode.recruitHex.r, placementMode.recruitHex.c, r, c);
            if (dist > 1) {
                reasonForNoPlacement = "Las unidades reclutadas deben colocarse en la base o adyacente.";
                canPlace = false;
            } else {
                // <<== CORRECCIÓN CLAVE PARA COLINAS/FORTALEZAS ==>>
                // Ignoramos las reglas de intransitabilidad de movimiento para la colocación INICIAL.
                // Una unidad se puede crear en una colina, aunque luego no pueda moverse desde ella.
                canPlace = true;
            }
        }
    }
    // Lógica para despliegue al INICIO de la partida
    else if (gameState.currentPhase === "deployment") {
        // En despliegue, también ignoramos las reglas de movimiento. Se asume que la zona de despliegue es válida.
        // Aquí puedes añadir tu lógica de zona de despliegue si la tienes.
        // Por ahora, permitimos colocar en cualquier casilla que no sea agua.
        if (hexData.terrain === 'water') {
            reasonForNoPlacement = "No se pueden desplegar unidades de tierra en el agua.";
            canPlace = false;
        } else {
            canPlace = true;
        }
    }

    if (canPlace) {
        placeFinalizedDivision(unitToPlace, r, c);
        
        // Finalizar y salir del modo colocación
        placementMode.active = false;
        placementMode.unitData = null;
        placementMode.recruitHex = null;
        if (UIManager) UIManager.clearHighlights();
        
        logMessage(`${unitToPlace.name} colocada con éxito en (${r},${c}).`);
        if (UIManager) {
            UIManager.updateAllUIDisplays();
            UIManager.hideContextualPanel();
        }

    } else {
        // Si no se puede colocar...
        logMessage(`No se puede colocar: ${reasonForNoPlacement}`);
        
        // <<== CORRECCIÓN CLAVE PARA EVITAR BUCLES ==>>
        // Se cancela la colocación y se devuelven los recursos.
        if (unitToPlace.cost) {
            for (const resourceType in unitToPlace.cost) {
                gameState.playerResources[gameState.currentPlayer][resourceType] = 
                    (gameState.playerResources[gameState.currentPlayer][resourceType] || 0) + unitToPlace.cost[resourceType];
            }
            if (UIManager) UIManager.updatePlayerAndPhaseInfo();
            logMessage("Colocación cancelada. Recursos reembolsados.");
        }
        
        placementMode.active = false;
        placementMode.unitData = null;
        placementMode.recruitHex = null;
        if (UIManager) UIManager.clearHighlights();
    }
}

function placeFinalizedDivision(unitData, r, c) {
    if (unitData.id === null) {
        unitData.id = `u${unitIdCounter++}`;
    }
    console.log(`[PFD v2] Colocando ${unitData.name} en (${r},${c})`);
    if (!unitData) { return; }

    const unitElement = document.createElement('div');
    unitElement.classList.add('unit', `player${unitData.player}`);
    unitElement.textContent = unitData.sprite || '?';
    unitElement.dataset.id = unitData.id;
    const strengthDisplay = document.createElement('div');
    strengthDisplay.classList.add('unit-strength');
    unitElement.appendChild(strengthDisplay); // El texto se pone después

    if (!domElements?.gameBoard) { return; }
    domElements.gameBoard.appendChild(unitElement);

    unitData.r = r;
    unitData.c = c;
    unitData.element = unitElement;
    
    // Añadimos la unidad a las listas globales
    board[r][c].unit = unitData;
    units.push(unitData);

    // <<== LA SOLUCIÓN DEFINITIVA A LAS CIVILIZACIONES ==>>
    // Recalculamos los stats AHORA, cuando la unidad ya es parte del juego.
    const finalStats = calculateRegimentStats(unitData.regiments, unitData.player);
    // Aplicamos los stats recalculados a la unidad que ya está en el juego.
    Object.assign(unitData, finalStats);
    
    // Comprobamos si la unidad viene de una división.
    if (unitData.isSplit) {
        // Si es así, su 'currentHealth' ya fue calculada en splitUnit y la respetamos.
        // No hacemos nada con la salud.
        console.log(`[PFD v2] Unidad dividida detectada. Salud actual conservada: ${unitData.currentHealth}`);
        delete unitData.isSplit; // Limpiamos la bandera temporal.
    } else {
        // Si no, es una unidad nueva de fábrica y debe tener la salud al máximo.
        unitData.currentHealth = unitData.maxHealth;
        console.log(`[PFD v2] Unidad nueva detectada. Salud establecida al máximo: ${unitData.currentHealth}`);
    }

    // Actualizamos el sprite y la salud en la UI
    unitElement.firstChild.textContent = unitData.sprite;
    strengthDisplay.textContent = unitData.currentHealth;
    
    positionUnitElement(unitData);

    if (gameState.currentPhase === "deployment") {
        if (!gameState.unitsPlacedByPlayer) gameState.unitsPlacedByPlayer = {1:0, 2:0};
        gameState.unitsPlacedByPlayer[unitData.player] = (gameState.unitsPlacedByPlayer[unitData.player] || 0) + 1;
        logMessage(`J${unitData.player} desplegó ${gameState.unitsPlacedByPlayer[unitData.player]}/${gameState.deploymentUnitLimit === Infinity ? '∞' : gameState.deploymentUnitLimit}.`);
    }
}

function checkAndApplyLevelUp(unit) {
    if (!unit || !XP_LEVELS) return false; 
    if (XP_LEVELS[unit.level]?.nextLevelXp === 'Max') return false; 

    let newLevelAssigned = false;
    while (true) {
        const currentLevelData = XP_LEVELS[unit.level];
        if (!currentLevelData || currentLevelData.nextLevelXp === 'Max') {
            break; 
        }
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
            if (typeof logMessage === "function") logMessage(`${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
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
        return false;
    }

    const targetRegimentData = REGIMENT_TYPES[targetUnit.regiments[0]?.type];
    const mergingRegimentData = REGIMENT_TYPES[mergingUnit.regiments[0]?.type];

    // Verifica si la combinación es válida (Tierra->Barco o Tierra->Tierra)
    const isEmbarking = targetRegimentData?.is_naval && !mergingRegimentData?.is_naval;
    const isLandMerge = !targetRegimentData?.is_naval && !mergingRegimentData?.is_naval;

    if (!isEmbarking && !isLandMerge) {
        logMessage("Esta combinación de unidades no se puede fusionar.");
        return false;
    }
    
    // Validar capacidad
    const totalRegiments = (targetUnit.regiments?.length || 0) + (mergingUnit.regiments?.length || 0);
    if (totalRegiments > MAX_REGIMENTS_PER_DIVISION) {
        logMessage(`No hay suficiente espacio para fusionar. El límite es ${MAX_REGIMENTS_PER_DIVISION} regimientos.`);
        return false;
    }

    if (window.confirm(`¿Fusionar ${mergingUnit.name} con ${targetUnit.name}? La unidad que se mueve se disolverá.`)) {
        
        // 1. Transferir todos los regimientos
        mergingUnit.regiments.forEach(reg => {
            targetUnit.regiments.push(JSON.parse(JSON.stringify(reg)));
        });

        // 2. Calcular los nuevos stats y la salud
        const oldTargetHealth = targetUnit.currentHealth;
        const newStats = calculateRegimentStats(targetUnit.regiments);
        
        targetUnit.attack = newStats.attack;
        targetUnit.defense = newStats.defense;
        targetUnit.maxHealth = newStats.maxHealth;
        targetUnit.currentHealth = Math.min(oldTargetHealth + mergingUnit.currentHealth, targetUnit.maxHealth);

        // 3. ¡MUY IMPORTANTE! Si es un embarque, el barco CONSERVA sus stats de movimiento y tipo
        if (isEmbarking) {
            targetUnit.movement = targetRegimentData.movement;
            targetUnit.is_naval = true; // Asegura que siga siendo naval
            targetUnit.sprite = targetRegimentData.sprite; // Mantiene el sprite de barco
        } else {
            targetUnit.movement = newStats.movement;
            targetUnit.sprite = newStats.sprite;
        }

        // 4. Limpiar la unidad que se ha fusionado
        handleUnitDestroyed(mergingUnit, null); 

        // 5. Marcar la unidad objetivo como que ha actuado
        targetUnit.hasMoved = true;
        targetUnit.hasAttacked = true;

        logMessage(`${mergingUnit.name} se ha integrado en ${targetUnit.name}.`);
        if (UIManager) {
            UIManager.updateUnitStrengthDisplay(targetUnit);
            UIManager.showUnitContextualInfo(targetUnit, true);
            UIManager.clearHighlights();
        }
        return true;
    }
    return false; // El usuario canceló
}

function recalculateUnitHealth(unit) {
    if (!unit || !unit.regiments) return;
    const newTotalHealth = unit.regiments.reduce((sum, reg) => sum + (reg.health || 0), 0);
    unit.currentHealth = newTotalHealth;
    if (UIManager) UIManager.updateUnitStrengthDisplay(unit);
}

function splitUnit(originalUnit, targetR, targetC) {
    if (!originalUnit || !originalUnit.regiments || !gameState.preparingAction) {
        // ... (el bloque de validaciones iniciales se mantiene, pero lo incluyo por completitud)
        const targetHexData = board[targetR]?.[targetC];
        if (!targetHexData || targetHexData.unit) {
            logMessage("No se puede colocar aquí (hexágono ocupado o inválido).");
            return false;
        }

        const actionData = gameState.preparingAction;

    // Validaciones de seguridad
    if (!targetHexData || targetHexData.unit || hexDistance(originalUnit.r, originalUnit.c, targetR, targetC) > 1) {
        logMessage("No se puede dividir aquí: lugar inválido, ocupado o no adyacente.");
        return false;
    }
    
        const isNewUnitNaval = actionData.newUnitRegiments.every(reg => REGIMENT_TYPES[reg.type]?.is_naval);

        if (isNewUnitNaval && targetHexData.terrain !== 'water') {
            logMessage("Una flota naval solo puede colocarse en el agua.");
            return false;
        }
        if (!isNewUnitNaval && targetHexData.terrain === 'water') {
            logMessage("Una unidad terrestre no puede colocarse en el agua.");
            return false;
        }
    }
    
    const targetHexData = board[targetR]?.[targetC];
    const actionData = gameState.preparingAction;
    // Validaciones de seguridad para la casilla de destino
    if (!targetHexData || targetHexData.unit || hexDistance(originalUnit.r, originalUnit.c, targetR, targetC) > 1) {
        logMessage("No se puede dividir aquí: lugar inválido, ocupado o no adyacente.");
        return false;
    }
    
    const newUnitRegiments = actionData.newUnitRegiments;
    const remainingOriginalRegiments = actionData.remainingOriginalRegiments;
    
    // --- 1. MODIFICAR LA UNIDAD ORIGINAL ---
    originalUnit.regiments = remainingOriginalRegiments;
    const originalStats = calculateRegimentStats(originalUnit.regiments, originalUnit.player);
    Object.assign(originalUnit, originalStats); // Aplica ataque, defensa, vida máxima, etc.
    originalUnit.currentHealth = originalUnit.regiments.reduce((sum, reg) => sum + (reg.health || 0), 0); // Suma la salud ACTUAL de los regimientos que quedan
    originalUnit.sprite = originalStats.sprite; // Asegurarse de actualizar el sprite
    if(originalUnit.element){
        originalUnit.element.childNodes[0].nodeValue = originalUnit.sprite; 
    }

    // --- 2. CREAR LA NUEVA UNIDAD ---
    const newUnitStats = calculateRegimentStats(newUnitRegiments, originalUnit.player);
    const newUnitName = `${getAbbreviatedName(newUnitRegiments[0].type)} (Div.)`;

    const newUnitData = {
        id: `u${unitIdCounter++}`,
        player: originalUnit.player,
        name: newUnitName, 
        regiments: newUnitRegiments, // Estos ya tienen su salud actual correcta
        
        // Asignación de Stats desde los calculados
        attack: newUnitStats.attack,
        defense: newUnitStats.defense,
        maxHealth: newUnitStats.maxHealth,
        // Tu duplicado de currentHealth, respetado.
        currentHealth: newUnitRegiments.reduce((sum, reg) => sum + (reg.health || 0), 0),
        movement: newUnitStats.movement,
        currentMovement: newUnitStats.movement,
        visionRange: newUnitStats.visionRange,
        attackRange: newUnitStats.attackRange,
        initiative: newUnitStats.initiative,
        sprite: newUnitStats.sprite,

        // <<== CORRECCIÓN FINAL: Asegurar que CADA propiedad se inicialice correctamente ==>>
        currentHealth: newUnitRegiments.reduce((sum, reg) => sum + (reg.health || 0), 0), // La salud actual ES LA SUMA de la salud actual de sus regimientos
        currentMovement: newUnitStats.movement, // Nace con movimiento completo

        r: -1, c: -1, 
        element: null,
        
        hasMoved: true, // Nace sin poder actuar este turno
        hasAttacked: true,
        hasRetaliatedThisTurn: false,
        level: 0,
        experience: 0,
        morale: originalUnit.morale,
        maxMorale: originalUnit.maxMorale,
        isDemoralized: originalUnit.isDemoralized,
        lastMove: null,

        // <<== NUEVO: Añadimos la bandera para identificar esta unidad ==>>
        isSplit: true 
    };
    
    // Colocar la nueva unidad en el mapa
    placeFinalizedDivision(newUnitData, targetR, targetC);

    // <<== LOG DE DIAGNÓSTICO AÑADIDO ==>>
    console.group(`[RESULTADO DIVISIÓN] para J${originalUnit.player}`);
    console.log(`División Original (${originalUnit.id}): ${originalUnit.name}`);
    console.table(originalUnit.regiments.map(r => ({ ID: r.id, Tipo: r.type, Salud: r.health })));
    console.log(`Nueva División (${newUnitData.id}): ${newUnitData.name}`);
    console.table(newUnitData.regiments.map(r => ({ ID: r.id, Tipo: r.type, Salud: r.health })));
    console.groupEnd();
    // <<== FIN DEL LOG ==>>
    
    // --- 3. FINALIZAR ESTADO DE LA UNIDAD ORIGINAL ---
    // <<== CORRECCIÓN 2: Ya NO se consume el turno de la unidad original por dividir. ==>>
    // originalUnit.hasMoved = true;  <-- LÍNEA ELIMINADA
    // originalUnit.hasAttacked = true; <-- LÍNEA ELIMINADA
    // La unidad original ahora puede moverse o atacar si no lo había hecho.
    
    // --- 4. ACTUALIZAR UI ---
    if (typeof UIManager !== 'undefined') {
        UIManager.updateUnitStrengthDisplay(originalUnit); 
        UIManager.updateUnitStrengthDisplay(newUnitData); 
        UIManager.updatePlayerAndPhaseInfo(); 
        if(selectedUnit && selectedUnit.id === originalUnit.id){
           UIManager.showUnitContextualInfo(originalUnit, true);
        }
    }
    logMessage(`${originalUnit.name} se ha dividido. Nueva unidad: ${newUnitData.name}.`);

    return true; 
}

function calculateRegimentStats(regimentsArray, playerNum) {
    let finalStats = {
        attack: 0, defense: 0, maxHealth: 0,
        movement: Infinity, visionRange: 0, attackRange: 0,
        initiative: 0, sprite: '❓'
    };

    console.log(`entré a calculateRegimentStats`)

    if (!regimentsArray || regimentsArray.length === 0) {
        finalStats.movement = 0;
        return finalStats;
    }

    const playerCivName = (gameState && gameState.playerCivilizations && gameState.playerCivilizations[playerNum]) 
                          ? gameState.playerCivilizations[playerNum] 
                          : 'ninguna';

    const civBonuses = (CIVILIZATIONS[playerCivName] && CIVILIZATIONS[playerCivName].bonuses) 
                     ? CIVILIZATIONS[playerCivName].bonuses 
                     : {};
    
    console.log(`%c[calculateRegimentStats] J${playerNum} | Civ Leída: "${playerCivName}" | Bonus Aplicables:`, "color: #00A86B", civBonuses);

    let combatRegimentsForSprite = [];
    regimentsArray.forEach(reg => {
        const baseRegData = REGIMENT_TYPES[reg.type];
        if (!baseRegData) return;

        
        console.log(`  -> Procesando Regimiento ID: ${reg.id}, Tipo: ${reg.type}, Salud Actual: ${reg.health}`);
        const unitBonusesContainer = civBonuses.unitTypeBonus || {}; // Aseguramos que el contenedor de bonus existe
        const unitTypeBonus = unitBonusesContainer[reg.type] || {}; // Obtenemos el bonus específico para este tipo de unidad
        
        const bonusAttack = unitTypeBonus.attackBonus || 0;
        const bonusDefense = unitTypeBonus.defenseBonus || 0;
        const bonusMovement = unitTypeBonus.movementBonus || 0;
        const bonusAttackRange = unitTypeBonus.attackRange || 0;

        // <<== LOG SIN CONDICIÓN - SE MOSTRARÁ SIEMPRE ==>>
        let logDesglose = `  - Regimiento: ${reg.type}`;
        
        const effectiveAttack = (baseRegData.attack || 0) + bonusAttack;
        logDesglose += ` | Ataque: ${baseRegData.attack} (base) + ${bonusAttack} (civ) = ${effectiveAttack}`;

        const effectiveDefense = (baseRegData.defense || 0) + bonusDefense;
        logDesglose += ` | Defensa: ${baseRegData.defense} (base) + ${bonusDefense} (civ) = ${effectiveDefense}`;
        
        console.log(logDesglose);
        // <<== FIN DEL LOG SIN CONDICIÓN ==>>

        finalStats.attack += effectiveAttack;
        finalStats.defense += effectiveDefense;
        finalStats.maxHealth += baseRegData.health || 0;
        
        finalStats.movement = Math.min(finalStats.movement, (baseRegData.movement || 0) + bonusMovement);
        finalStats.visionRange = Math.max(finalStats.visionRange, baseRegData.visionRange || 0);
        finalStats.attackRange = Math.max(finalStats.attackRange, (baseRegData.attackRange || 1) + bonusAttackRange);
        finalStats.initiative = Math.max(finalStats.initiative, baseRegData.initiative || 0);
        
        if (baseRegData.category !== "support") {
            combatRegimentsForSprite.push(baseRegData);
        }
    });

    if (combatRegimentsForSprite.length > 0) {
        finalStats.sprite = combatRegimentsForSprite[0].sprite;
    } else if (regimentsArray.length > 0) {
        finalStats.sprite = REGIMENT_TYPES[regimentsArray[0].type]?.sprite || '❓';
    }
    
    if (finalStats.movement === Infinity) finalStats.movement = 0;

    console.log(` -> Stats Finales Calculados para J${playerNum} (${playerCivName}):`, JSON.parse(JSON.stringify(finalStats)));
    return finalStats;
}

function prepareSplitOrDisembark(unit) {
    if (!unit || unit.player !== gameState.currentPlayer) {
        console.error("[Disembark/Split] Intento de actuar sobre unidad inválida.");
        return;
    }
    
    // Si la unidad ya ha actuado, no puede ni dividir ni desembarcar
    if (unit.hasMoved || unit.hasAttacked) {
        logMessage("Esta unidad ya ha actuado este turno.");
        return;
    }

    // Comprobamos la composición de la unidad
    const hasNavalRegiments = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_naval);
    const hasLandRegiments = unit.regiments.some(reg => !REGIMENT_TYPES[reg.type]?.is_naval);

    // <<== INICIO: LÓGICA DE DECISIÓN CORREGIDA ==>>

    // CASO 1: Es una unidad mixta (transporte con tropas). DEBE desembarcar/dividir.
    if (hasNavalRegiments && hasLandRegiments) {
        console.log(`[Action Prep] Unidad mixta detectada (${unit.name}). Preparando para desembarco/división.`);
        // Abre el modal avanzado, que ahora podrá manejar la división de tropas navales y terrestres.
        if (typeof openAdvancedSplitUnitModal === "function") {
           openAdvancedSplitUnitModal(unit);
        } else {
           console.error("Error: La función openAdvancedSplitUnitModal no está definida.");
        }
    } 
    // CASO 2: Es una unidad de tierra con múltiples regimientos. Puede dividirse en tierra.
    else if (!hasNavalRegiments && unit.regiments.length > 1) {
        console.log(`[Action Prep] División terrestre detectada (${unit.name}).`);
        if (typeof openAdvancedSplitUnitModal === "function") {
           openAdvancedSplitUnitModal(unit);
        } else {
           console.error("Error: La función openAdvancedSplitUnitModal no está definida.");
        }
    }
    // CASO 3: Es una flota naval pura o una unidad terrestre de un solo regimiento.
    else {
        logMessage("Esta unidad no se puede dividir.");
    }
}

let _currentPreparingAction = null; 

function cancelPreparingAction() {
    console.log("[Acción Cancelada] Limpiando estado 'preparingAction'.");
    gameState.preparingAction = null;
    if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) {
        UIManager.clearHighlights();
    }
    // logMessage("Acción cancelada."); No es necesario un mensaje al jugador aquí.
}

function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    // Log de Entrada: Para confirmar que la función se está llamando correctamente.
    console.log(`--- DENTRO DE handleActionWithSelectedUnit ---`);
    console.log(`Objetivo del Clic: ${clickedUnitOnTargetHex ? clickedUnitOnTargetHex.name : 'Casilla Vacía'} en (${r_target},${c_target})`);

    if (!selectedUnit) {
        console.error("[handleAction] ERROR FATAL: Se llamó a la función pero 'selectedUnit' es nulo.");
        return false;
    }

    // --- MANEJO DE ACCIÓN PREPARADA (como dividir) ---
    if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
        console.log(`[handleAction] Detectada acción preparada: ${gameState.preparingAction.type}`);
        let success = false;
        if (gameState.preparingAction.type === 'split_unit') {
            if (splitUnit(selectedUnit, r_target, c_target)) {
                success = true;
            }
        }
        cancelPreparingAction();
        return success;
    }

    // --- MANEJO DE CLIC DIRECTO ---
    
    // CASO 1: Se hizo clic sobre una unidad.
    if (clickedUnitOnTargetHex) {
        
        // Subcaso 1.1: Es una unidad ENEMIGA.
        if (clickedUnitOnTargetHex.player !== selectedUnit.player) {
            console.log(`[handleAction] Clic en ENEMIGO. Verificando ataque...`);
            if (isValidAttack(selectedUnit, clickedUnitOnTargetHex)) {
                console.log(`[handleAction] ¡ATAQUE VÁLIDO! Iniciando RequestAttackUnit...`);
                RequestAttackUnit(selectedUnit, clickedUnitOnTargetHex);
                return true; // <<< DEVUELVE TRUE
            } else {
                logMessage(`${selectedUnit.name} no puede atacar a ${clickedUnitOnTargetHex.name}.`);
            }
        }
        // Subcaso 1.2: Es una unidad AMIGA.
        else {
            if (clickedUnitOnTargetHex.id === selectedUnit.id) return false;
            
            console.log(`[handleAction] Clic en ALIADO. Verificando fusión...`);
            if (isValidMove(selectedUnit, r_target, c_target, true)) {
                console.log(`[handleAction] ¡FUSIÓN VÁLIDA! Iniciando RequestMergeUnits...`);
                RequestMergeUnits(selectedUnit, clickedUnitOnTargetHex);
                return true; // <<< DEVUELVE TRUE
            }
        }
    }
    // CASO 2: Se hizo clic sobre una casilla VACÍA.
    else {
        console.log(`[handleAction] Clic en casilla VACÍA. Verificando movimiento...`);
        if (isValidMove(selectedUnit, r_target, c_target, false)) {
            
            // --- ¡LA SOLUCIÓN! ---
            // Ahora decidimos qué función llamar basándonos en si es una partida en red o no.
            if (isNetworkGame()) {
                console.log(`[handleAction] ¡MOVIMIENTO VÁLIDO (RED)! Iniciando RequestMoveUnit...`);
                RequestMoveUnit(selectedUnit, r_target, c_target);
            } else {
                console.log(`[handleAction] ¡MOVIMIENTO VÁLIDO (LOCAL)! Iniciando moveUnit...`);
                moveUnit(selectedUnit, r_target, c_target);
            }
            // --- FIN DE LA SOLUCIÓN ---
            console.log(`[handleAction] Ninguna acción válida se pudo iniciar. Devolviendo 'false'.`);
            return true;
        }
    }
}

function selectUnit(unit) {
    console.log(`[DEBUG selectUnit] INICIO - Intentando seleccionar: ${unit?.name || 'unidad nula'}`);
    if (!unit) {
        console.warn("[selectUnit] Intento de seleccionar unidad nula.");
        if (typeof deselectUnit === "function") deselectUnit();
        return;
    }

    // No llamar a checkAndProcessBrokenUnit aquí, para permitir la selección.
    
    if (gameState.currentPhase === 'play' && unit.player !== gameState.currentPlayer) {
        console.log(`[selectUnit] No se puede tomar control de ${unit.name} (Jugador ${unit.player}).`);
        if (typeof deselectUnit === "function") deselectUnit();
        return; // Mostramos su info pero no la seleccionamos como 'activa'
    }

    if (selectedUnit && selectedUnit.id === unit.id && gameState.preparingAction?.type === 'split_unit') {
        console.log(`[DEBUG selectUnit] Clic en la misma unidad (${unit.name}) con acción de división preparada. No se hace nada.`);
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
    
    logMessage(`${unit.name} (J${unit.player}) seleccionada.`);

    // >> LÓGICA AÑADIDA/MODIFICADA PARA UNIDADES "ZOMBIS" <<
    const isBroken = unit.morale <= 0;
    const canAct = gameState.currentPhase !== 'play' || (!unit.hasMoved && !unit.hasAttacked);

    // Siempre mostramos la información de la unidad, esté rota o no.
    if (typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
        UIManager.showUnitContextualInfo(unit, unit.player === gameState.currentPlayer);
    }
    
    if (isBroken) {
        // Si la unidad está rota, no mostramos ninguna acción posible.
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) {
            UIManager.clearHighlights();
        }
        logMessage(`${unit.name} tiene la moral rota y no puede actuar este turno.`);
    } else if (canAct) {
        // Si no está rota Y puede actuar, mostramos las acciones posibles.
        if (typeof UIManager !== 'undefined' && UIManager.highlightPossibleActions) {
            UIManager.highlightPossibleActions(unit);
        }
    } else {
        // Si no está rota pero ya actuó.
        logMessage(`${unit.name} ya ha actuado este turno.`);
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) {
            UIManager.clearHighlights();
        }
    }

    console.log(`[DEBUG selectUnit] FIN - selectedUnit ahora es: ${selectedUnit?.name}`);
}

function deselectUnit() {
    if (selectedUnit && selectedUnit.element) {
        selectedUnit.element.classList.remove('selected-unit');
    }
    selectedUnit = null;
    
    // --- ¡CORRECCIÓN CLAVE! ---
    // Si deseleccionas una unidad, cualquier acción que estuvieras preparando
    // con ella debe ser cancelada.
    cancelPreparingAction(); 
    // --- FIN DE LA CORRECCIÓN ---
}

function isValidMove(unit, toR, toC, isPotentialMerge = false) {
    if (!unit) return false;
    if (gameState.currentPhase === 'play' && unit.hasMoved && !isPotentialMerge) return false;
    if ((unit.currentMovement || 0) <= 0 && !isPotentialMerge) return false;
    if (unit.r === toR && unit.c === toC) return false;

    const targetHexData = board[toR]?.[toC];
    if (!targetHexData) return false;
    
    const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
    const targetUnitOnHex = getUnitOnHex(toR, toC);

    // <<== INICIO LÓGICA DE VALIDACIÓN CORREGIDA ==>>

    // Regla #1: Unidades navales
    if (unitRegimentData?.is_naval) {
        // Solo pueden moverse a casillas de agua vacías
        if (targetHexData.terrain !== 'water' || targetUnitOnHex) {
            return false;
        }
    } 
    // Regla #2: Unidades terrestres
    else {
        // Sub-regla 2.1: ¿Es para fusionar/embarcar?
        if (isPotentialMerge) {
            if (!targetUnitOnHex || targetUnitOnHex.player !== unit.player) return false;
            // Permite movimiento si el objetivo es un barco en agua O una unidad terrestre en tierra
            const targetIsNaval = REGIMENT_TYPES[targetUnitOnHex.regiments[0]?.type]?.is_naval;
            if (targetIsNaval && targetHexData.terrain !== 'water') return false; // Barco debe estar en agua
            if (!targetIsNaval && targetHexData.terrain === 'water') return false; // Unidad de tierra debe estar en tierra
        } 
        // Sub-regla 2.2: ¿Es un movimiento normal a una casilla vacía?
        else {
            if (targetUnitOnHex) return false; // No se puede mover a casillas vacías si están ocupadas

            const unitCategory = unitRegimentData.category;
            const isImpassable = (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land.includes(targetHexData.terrain)) ||
                                 (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(targetHexData.terrain);
            if (isImpassable) return false;
        }
    }
    // <<== FIN LÓGICA DE VALIDACIÓN CORREGIDA ==>>
    
    // Si pasó todas las validaciones, comprobar coste
    const cost = getMovementCost(unit, unit.r, unit.c, toR, toC, isPotentialMerge);
    return cost !== Infinity && cost <= (unit.currentMovement || 0);
}

function getMovementCost(unit, r_start, c_start, r_target, c_target, isPotentialMerge = false) {
    if (!unit) return Infinity;
    if (r_start === r_target && c_start === c_target) return 0;

    const unitRegimentData = REGIMENT_TYPES[unit.regiments[0]?.type];
    if (!unitRegimentData) return Infinity; // No se puede mover si no hay datos del regimiento

    let queue = [{ r: r_start, c: c_start, cost: 0 }];
    let visited = new Map([[`${r_start},${c_start}`, 0]]);

    while (queue.length > 0) {
        // No es necesario ordenar la cola para un BFS simple de coste, procesamos en orden de llegada.
        let current = queue.shift();
        
        // Condición de éxito: hemos llegado al hexágono de destino
        if (current.r === r_target && current.c === c_target) {
            return current.cost;
        }
        
        // No buscar caminos absurdamente largos
        if (current.cost > (unit.movement || 1) * 3) {
            continue;
        }

        let neighbors = getHexNeighbors(current.r, current.c);
        for (const neighbor of neighbors) {
            const neighborHexData = board[neighbor.r]?.[neighbor.c];
            if (!neighborHexData) continue;
            
            const neighborKey = `${neighbor.r},${neighbor.c}`;
            const unitAtNeighbor = getUnitOnHex(neighbor.r, neighbor.c);
            
            // --- INICIO LÓGICA DE VALIDEZ DE MOVIMIENTO ---
            let canEnterNeighbor = false;

            // CASO 1: Movimiento a un hexágono vacío.
            if (!unitAtNeighbor) {
                if (unitRegimentData.is_naval) {
                    canEnterNeighbor = neighborHexData.terrain === 'water';
                } else {
                    const unitCategory = unitRegimentData.category;
                    const isImpassable = (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land.includes(neighborHexData.terrain)) ||
                                         (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(neighborHexData.terrain);
                    canEnterNeighbor = !isImpassable;
                }
            } 
            // CASO 2: Movimiento a un hexágono ocupado (solo para fusión/embarque)
            else if (isPotentialMerge && neighbor.r === r_target && neighbor.c === c_target) {
                // Solo permitimos entrar si el vecino es el hexágono exacto de nuestro objetivo de fusión.
                canEnterNeighbor = true;
            }
            // --- FIN LÓGICA DE VALIDEZ ---

            if (canEnterNeighbor) {
                let moveCost = 1.0; // Coste por defecto

                // <<== INICIO DE LA LÓGICA MODIFICADA ==>>
                // 1. PRIORIDAD MÁXIMA: Comprobar si hay una ESTRUCTURA y no es una unidad naval.
                if (neighborHexData.structure && !unitRegimentData.is_naval) {
                    const structureData = STRUCTURE_TYPES[neighborHexData.structure];
                    // Si la estructura define un coste de movimiento, lo usamos.
                    if (structureData && typeof structureData.movementCost === 'number') {
                        moveCost = structureData.movementCost;
                    }
                } 
                // 2. SI NO HAY ESTRUCTURA: Usamos el coste del TERRENO.
                else if (TERRAIN_TYPES[neighborHexData.terrain]) {
                    moveCost = TERRAIN_TYPES[neighborHexData.terrain].movementCostMultiplier;
                }
                
                const newCost = current.cost + moveCost;

                if (!visited.has(neighborKey) || newCost < visited.get(neighborKey)) {
                    visited.set(neighborKey, newCost);
                    queue.push({ r: neighbor.r, c: neighbor.c, cost: newCost });
                }
            }
        }
    }

    // Si la cola se agota y no se encontró el destino, es inalcanzable.
    return Infinity;
}

async function moveUnit(unit, toR, toC) {
    const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

    if (isNetworkGame()) {
        console.error("Llamada inválida a moveUnit() en juego de red. Usa RequestMoveUnit() en su lugar.");
        return;
    }

    // --- EL CÓDIGO ORIGINAL SE EJECUTA SOLO PARA PARTIDAS LOCALES ---
    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC];

    // Guardar estado para la función "deshacer"
    if (unit.player === gameState.currentPlayer) {
        unit.lastMove = {
            fromR: fromR,
            fromC: fromC,
            initialCurrentMovement: unit.currentMovement, 
            initialHasMoved: unit.hasMoved,              
            initialHasAttacked: unit.hasAttacked,         
            movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null 
        };
    }
    
    let costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);
    if (costOfThisMove === Infinity) return;

    // Quitar la unidad del hexágono original
    if (board[fromR]?.[fromC]) {
        board[fromR][fromC].unit = null;
        renderSingleHexVisuals(fromR, fromC);
    }
    
    // Mover la unidad al nuevo hexágono
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= costOfThisMove;
    unit.hasMoved = true;
    
    if (targetHexData) {
        targetHexData.unit = unit;

        // <<== SOLUCIÓN PROBLEMA 1 (Parte A): CAPTURA DE HEXÁGONO NEUTRAL ==>>
        const originalOwner = targetHexData.owner;
        const movingPlayer = unit.player;

        // Si la casilla era Neutral, la capturas inmediatamente.
        if (originalOwner === null) {
            targetHexData.owner = movingPlayer;
            // Inicializar estabilidad y nacionalidad a 1.
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 }; // Reiniciar ambas
            targetHexData.nacionalidad[movingPlayer] = 1; // Poner la tuya a 1

            logMessage(`¡Has ocupado un territorio neutral en (${toR}, ${toC})!`);

            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner === null) {
                city.owner = movingPlayer;
                logMessage(`¡La ciudad neutral '${city.name}' se une a tu imperio!`);
            }
            renderSingleHexVisuals(toR, toC);
        }

    } else { 
        console.error(`[moveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; unit.hasMoved = false;
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit;
        renderSingleHexVisuals(fromR, fromC); 
        return;
    }
    
    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof positionUnitElement === "function") positionUnitElement(unit); 
    if (UIManager) {
        UIManager.updateSelectedUnitInfoPanel();
        UIManager.updatePlayerAndPhaseInfo();
    }
    
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") {
        if (checkVictory()) return;
    }
    
    // Si la unidad que se movió sigue siendo la unidad seleccionada,
    if (selectedUnit && selectedUnit.id === unit.id) {
        // llama al UIManager para actualizar el resaltado de acciones desde su nueva posición.
        UIManager.highlightPossibleActions(unit);
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

function isValidAttack(attacker, defender) {
    // --- Guardias de seguridad iniciales ---
    if (!attacker || !defender) {
        console.error("[isValidAttack] Error: Atacante o defensor no definidos.");
        return false;
    }
    if (attacker.player === defender.player) {
        // Esta es la comprobación que puede estar fallando.
        // logMessage(`${attacker.name} no puede atacar a una unidad aliada.`);
        return false;
    }
    if (gameState.currentPhase === 'play' && attacker.player === gameState.currentPlayer && attacker.hasAttacked) {
        // logMessage(`${attacker.name} ya ha atacado este turno.`);
        return false;
    }

    // --- Depuración de Datos ---
    const attackerName = attacker.name || 'Sin Nombre';
    const defenderName = defender.name || 'Sin Nombre';
    const attackerPosition = `(${attacker.r},${attacker.c})`;
    const defenderPosition = `(${defender.r},${defender.c})`;
    const range = attacker.attackRange || 1;
    const distance = hexDistance(attacker.r, attacker.c, defender.r, defender.c);

    // --- Lógica de Restricción Naval ---
    const attackerRegimentData = REGIMENT_TYPES[attacker.regiments[0]?.type];
    const defenderRegimentData = REGIMENT_TYPES[defender.regiments[0]?.type];
    if (!attackerRegimentData?.is_naval && defenderRegimentData?.is_naval) {
        if (defenderRegimentData?.canOnlyBeAttackedByRanged && range <= 1) {
            console.log(`[isValidAttack] FALLO: ${attackerName} (cuerpo a cuerpo) no puede atacar a la unidad naval ${defenderName}.`);
            return false; 
        }
    }
    
    // --- Comprobación Final de Rango ---
    const canAttack = distance <= range;
    
    // Log detallado que nos dirá la verdad
    console.log(`[Chequeo de Ataque]: ${attackerName} ${attackerPosition} vs ${defenderName} ${defenderPosition}. Distancia: ${distance}, Rango de Ataque: ${range}. ¿Válido?: ${canAttack}`);
    
    if (!canAttack) {
        // logMessage(`${attackerName} está fuera de rango para atacar a ${defenderName}.`);
    }
    
    return canAttack;
}

/**
 * Orquesta un combate completo entre dos divisiones, resolviéndolo a nivel de regimientos.
 * Crea una cola de acciones basada en la iniciativa y el rango de ataque de cada regimiento,
 * y luego procesa cada acción de forma secuencial.
 * @param {object} attackerDivision - La división que inicia el combate.
 * @param {object} defenderDivision - La división que es atacada.
**/
async function attackUnit(attackerDivision, defenderDivision) {
    console.log(`%c[VIAJE-DESTINO FINAL] La función de combate 'attackUnit' ha sido ejecutada. Atacante: ${attackerDivision.name}, Defensor: ${defenderDivision.name}`, 'background: #222; color: #bada55; font-size: 1.2em; font-weight: bold;');
    try {
        if (!attackerDivision || !defenderDivision) return;
        logMessage(`¡COMBATE! ${attackerDivision.name} (J${attackerDivision.player}) vs ${defenderDivision.name} (J${defenderDivision.player})`);
        
        console.group(`--- ANÁLISIS DE COMBATE ---`);

        const initialHealthAttacker = attackerDivision.currentHealth;
        const initialHealthDefender = defenderDivision.currentHealth;
        const distance = hexDistance(attackerDivision.r, attackerDivision.c, defenderDivision.r, defenderDivision.c);
        
        // Asignar IDs de log temporales para esta batalla
        attackerDivision.regiments.forEach((r, i) => r.logId = `A-${i}`);
        defenderDivision.regiments.forEach((r, i) => r.logId = `D-${i}`);

        console.log("Regimientos Atacantes:", attackerDivision.regiments.map(r => `${r.type}[${r.logId}](${r.health} HP)`));
        console.log("Regimientos Defensores:", defenderDivision.regiments.map(r => `${r.type}[${r.logId}](${r.health} HP)`));
        
        const actionQueue = [];
        const addActions = (division, isAttacker) => {
            if (!division.regiments) return;
            division.regiments.forEach(reg => {
                const regData = REGIMENT_TYPES[reg.type];
                if (reg.health > 0 && regData && (distance === 1 || (regData.attackRange || 0) >= distance)) {
                    const numAttacks = (regData.attackRange || 0) + 1;
                    for (let i = 0; i < numAttacks; i++) {
                        actionQueue.push({ regiment: reg, division: division, initiative: regData.initiative || 0, isAttackerTurn: isAttacker });
                    }
                }
            });
        };
        addActions(attackerDivision, true);
        addActions(defenderDivision, false);

        if (actionQueue.length === 0) {
            logMessage("Ninguna unidad tiene rango para el combate.");
            console.groupEnd(); return;
        }
        
        actionQueue.sort((a, b) => b.initiative - a.initiative || b.isAttackerTurn - a.isAttackerTurn);
        console.log(`Secuencia de batalla con ${actionQueue.length} acciones.`);
        console.groupEnd();

        console.group("--- SECUENCIA DE DUELOS ---");
        
        // --- INICIO DE LA MODIFICACIÓN ---
        // Mapa para asignar un objetivo FIJO a cada regimiento al inicio del combate.
        const targetAssignments = new Map();
        
        // Asignar objetivos 1 a 1 antes de que empiecen los duelos
        const liveAttackersInitial = attackerDivision.regiments.filter(r => r.health > 0);
        const liveDefendersInitial = defenderDivision.regiments.filter(r => r.health > 0);
        
        liveAttackersInitial.forEach((attackerReg, index) => {
            const target = liveDefendersInitial[index % liveDefendersInitial.length];
            targetAssignments.set(attackerReg.logId, target);
        });
        liveDefendersInitial.forEach((defenderReg, index) => {
            const target = liveAttackersInitial[index % liveAttackersInitial.length];
            targetAssignments.set(defenderReg.logId, target);
        });

        for (const action of actionQueue) {
            const { regiment, division, isAttackerTurn } = action;
            const opposingDivision = isAttackerTurn ? defenderDivision : attackerDivision;
            if (regiment.health <= 0 || opposingDivision.currentHealth <= 0) continue;

            // Obtener el objetivo FIJO que se le asignó a este regimiento
            const targetRegiment = targetAssignments.get(regiment.logId);

            // Si el objetivo fijo ya ha sido destruido, el regimiento ataca al primer objetivo vivo disponible
            if (!targetRegiment || targetRegiment.health <= 0) {
                const newTarget = selectTargetRegiment(opposingDivision);
                if (newTarget) {
                    applyDamage(regiment, newTarget, division, opposingDivision);
                    recalculateUnitHealth(opposingDivision);
                    if (UIManager) UIManager.updateUnitStrengthDisplay(opposingDivision);
                }
            } else {
                // Si el objetivo fijo sigue vivo, lo ataca
                await new Promise(resolve => setTimeout(resolve, 100));
                applyDamage(regiment, targetRegiment, division, opposingDivision);
                recalculateUnitHealth(opposingDivision);
                if (UIManager) UIManager.updateUnitStrengthDisplay(opposingDivision);
            }
        }
        // --- FIN DE LA MODIFICACIÓN ---
        console.groupEnd();
        
        // --- FASE DE RESOLUCIÓN FINAL (TU LÓGICA ORIGINAL INTACTA) ---
        console.group("--- RESULTADOS DEL COMBATE ---");
        const finalHealthAttacker = attackerDivision.currentHealth;
        const finalHealthDefender = defenderDivision.currentHealth;
        const damageDealtByAttacker = initialHealthDefender - finalHealthDefender;
        const damageDealtByDefender = initialHealthAttacker - finalHealthAttacker;
        const attackerEfficiency = damageDealtByAttacker / (damageDealtByDefender || 1);
        const defenderEfficiency = damageDealtByDefender / (damageDealtByAttacker || 1);
        let attackerXP = 5 + Math.round(attackerEfficiency * 10);
        let defenderXP = 5 + Math.round(defenderEfficiency * 10);
        const attackerWon = finalHealthDefender <= 0 && finalHealthAttacker > 0;
        if (attackerWon) {
            attackerXP += 20;
            const moraleGain = 15;
            attackerDivision.morale = Math.min(attackerDivision.maxMorale, (attackerDivision.morale || 50) + moraleGain);
            logMessage(`¡VICTORIA! La moral de ${attackerDivision.name} sube.`);
            handleUnitDestroyed(defenderDivision, attackerDivision);
        }
        if (attackerDivision.currentHealth > 0) {
            logMessage(`${attackerDivision.name} gana ${attackerXP} XP.`);
            attackerDivision.experience = (attackerDivision.experience || 0) + attackerXP;
            checkAndApplyLevelUp(attackerDivision);
        }
        if (defenderDivision.currentHealth > 0) {
            logMessage(`${defenderDivision.name} gana ${defenderXP} XP.`);
            defenderDivision.experience = (defenderDivision.experience || 0) + defenderXP;
            checkAndApplyLevelUp(defenderDivision);
        }
        if (attackerDivision.currentHealth > 0) {
            attackerDivision.hasMoved = true;
            attackerDivision.hasAttacked = true;
        }
        console.groupEnd();
        if (UIManager) UIManager.updateAllUIDisplays();
        checkVictory();

    } catch (error) {
        console.error(`ERROR CATASTRÓFICO DENTRO DE attackUnit:`, error);
        logMessage("Error crítico durante el combate.", "error");
        if (attackerDivision?.currentHealth > 0) {
            attackerDivision.hasMoved = true;
            attackerDivision.hasAttacked = true;
        }
        if(UIManager) UIManager.updateAllUIDisplays();
    }
}

/**
 * Calcula y aplica el daño de un duelo 1vs1 entre regimientos,
 * considerando todos los modificadores de sus divisiones y del terreno.
 * @param {object} attackerRegiment - El regimiento que ataca.
 * @param {object} targetRegiment - El regimiento que defiende.
 * @param {object} attackerDivision - La división a la que pertenece el atacante.
 * @param {object} targetDivision - La división a la que pertenece el defensor.
 * @returns {number} La cantidad de daño real infligido.
 * Calcula y aplica el daño de un duelo 1vs1 entre regimientos,
 * considerando todos los modificadores (terreno, moral, experiencia, desgaste, etc.)
 * y generando logs detallados para cada paso.
 */
function applyDamage(attackerRegiment, targetRegiment, attackerDivision, targetDivision) {
    // --- 0. VALIDACIÓN INICIAL ---
    if (!attackerRegiment || !targetRegiment || !attackerDivision || !targetDivision) return 0;
    const attackerData = REGIMENT_TYPES[attackerRegiment.type];
    const targetData = REGIMENT_TYPES[targetRegiment.type];
    if (!attackerData || !targetData) return 0;

    // Asignar un ID legible para los logs si no existe
    if (!attackerRegiment.logId) attackerRegiment.logId = `${attackerRegiment.type.substring(0,3)}-${Math.floor(Math.random()*100)}`;
    if (!targetRegiment.logId) targetRegiment.logId = `${targetRegiment.type.substring(0,3)}-${Math.floor(Math.random()*100)}`;
    
    // <<== NUEVO: Obtener la civilización para los logs ==>>
    // Se busca la clave de la civilización en gameState y luego el nombre en las constantes.
    // Si algo falla, se usa "Sin Civ." para evitar errores.
    const attackerCivKey = gameState.playerCivilizations?.[attackerDivision.player] || 'ninguna';
    const attackerCivName = CIVILIZATIONS[attackerCivKey]?.name || "Sin Civ.";
    const attackerLogInfo = `Jugador ${attackerDivision.player} - ${attackerCivName}`;

    const defenderCivKey = gameState.playerCivilizations?.[targetDivision.player] || 'ninguna';
    const defenderCivName = CIVILIZATIONS[defenderCivKey]?.name || "Sin Civ.";
    const defenderLogInfo = `Jugador ${targetDivision.player} - ${defenderCivName}`;
    // <<== FIN DE LA MODIFICACIÓN ==>>

    console.groupCollapsed(`Duelo: [${attackerRegiment.logId}] vs [${targetRegiment.logId}]`);

    // --- 1. CÁLCULO DE ATAQUE EFECTIVO ---
    // <<== MODIFICACIÓN: Añadir info al log del atacante ==>>
    console.log(`  [ATACANTE: ${attackerLogInfo} - ${attackerRegiment.type}]`);
    // <<== FIN DE LA MODIFICACIÓN ==>>
    let effectiveAttack = attackerData.attack || 0;
    console.log(`  - Ataque Base: ${effectiveAttack}`);
    
    // a) Modificador por Salud
    const healthModifier = attackerRegiment.health / attackerData.health;
    effectiveAttack *= healthModifier;
    console.log(`  - Mod. por Salud (${(healthModifier * 100).toFixed(0)}%): ${effectiveAttack.toFixed(1)}`);
    
    // b) Modificador por Moral
    if (attackerDivision.morale > 100) { effectiveAttack++; console.log(`  - Mod. por Moral Alta: +1`); }
    if (attackerDivision.morale <= 24) { effectiveAttack--; console.log(`  - Mod. por Moral Baja: -1`); }
    
    // c) Modificador por Experiencia
    if (attackerDivision.level > 0) {
        const bonus = (XP_LEVELS[attackerDivision.level] || {}).attackBonus || 0;
        effectiveAttack += bonus;
        console.log(`  - Mod. por Exp (Nivel ${attackerDivision.level}): +${bonus}`);
    }

    console.log(`  => ATAQUE FINAL: ${effectiveAttack.toFixed(1)}`);

    // --- 2. CÁLCULO DE DEFENSA EFECTIVA ---
    // <<== MODIFICACIÓN: Añadir info al log del defensor ==>>
    console.log(`  [DEFENSOR: ${defenderLogInfo} - ${targetRegiment.type}]`);
    // <<== FIN DE LA MODIFICACIÓN ==>>
    let effectiveDefense = targetData.defense || 0;
    console.log(`  - Defensa Base: ${effectiveDefense}`);

    // a) Modificador por Moral
    if (targetDivision.morale > 100) { effectiveDefense++; console.log(`  - Mod. por Moral Alta: +1`); }
    if (targetDivision.morale <= 24) { effectiveDefense--; console.log(`  - Mod. por Moral Baja: -1`); }

    // b) Modificador por Experiencia
    if (targetDivision.level > 0) {
        const bonus = (XP_LEVELS[targetDivision.level] || {}).defenseBonus || 0;
        effectiveDefense += bonus;
        console.log(`  - Mod. por Exp (Nivel ${targetDivision.level}): +${bonus}`);
    }

    // c) Modificador por Terreno
    const targetHex = board[targetDivision.r]?.[targetDivision.c];
    if (targetHex && TERRAIN_TYPES[targetHex.terrain]?.defenseMultiplier) {
        const terrainBonus = TERRAIN_TYPES[targetHex.terrain].defenseMultiplier;
        effectiveDefense *= terrainBonus;
        console.log(`  - Mod. por Terreno (${TERRAIN_TYPES[targetHex.terrain].name}): *${terrainBonus} -> ${effectiveDefense.toFixed(1)}`);
    }

    // d) Modificador por Flanqueo
    if (targetDivision.isFlanked) {
        effectiveDefense *= 0.75;
        console.log(`  - Mod. por Flanqueo: *0.75 -> ${effectiveDefense.toFixed(1)}`);
    }

    // e) Modificador por Desgaste Defensivo
    if (targetRegiment.hitsTakenThisRound === undefined) targetRegiment.hitsTakenThisRound = 0;
    const defenseMultiplier = Math.max(0.25, 1 - (0.20 * targetRegiment.hitsTakenThisRound));
    effectiveDefense *= defenseMultiplier;
    console.log(`  - Mod. por Desgaste (${targetRegiment.hitsTakenThisRound} golpes): *${defenseMultiplier.toFixed(2)} -> ${effectiveDefense.toFixed(1)}`);

    console.log(`  => DEFENSA FINAL: ${effectiveDefense.toFixed(1)}`);

    // --- 3. CÁLCULO DE DAÑO FINAL ---
    let damageDealt = Math.round(effectiveAttack - effectiveDefense);
    if (damageDealt < 1 && effectiveAttack > 0) damageDealt = 1;
    if (damageDealt < 0) damageDealt = 0;

    console.log(`%c  DAÑO CALCULADO (Ataque - Defensa): ${damageDealt}`, 'font-weight:bold;');

    // --- 4. APLICACIÓN DE DAÑO ---
    const actualDamage = Math.min(targetRegiment.health, damageDealt);
    targetRegiment.health -= actualDamage;
    targetRegiment.hitsTakenThisRound++;

    console.log(`%c  >> DAÑO REAL APLICADO: ${actualDamage}. Salud restante: ${targetRegiment.health}`, 'color:red; font-weight:bold;');
    console.groupEnd();
    
    if (actualDamage > 0) showFloatingDamage(targetDivision, actualDamage);
    
    return actualDamage;
}

/**
 * Selecciona un regimiento objetivo de la división oponente.
 * Acepta la división activa y la oponente, y aplica la estrategia correcta.
 * Incluye logs detallados para máxima transparencia.
 * @param {object} actingDivision - La división que está realizando el ataque.
 * @param {object} opposingDivision - La división que está siendo atacada.
 * @returns {object|null} El regimiento objetivo, o null si no hay objetivos válidos.
 */
function selectTargetRegiment(opposingDivision) {
    if (!opposingDivision || !opposingDivision.regiments) return []; // Devuelve array vacío
    return opposingDivision.regiments.filter(r => r.health > 0);
}


function predictCombatOutcome(attacker, defender) {
    if (!attacker || !defender) {
        console.error("[PredictCombat] Error: Atacante u objetivo nulo para predicción.");
        return {
            damageToAttacker: 0,
            damageToDefender: 0,
            attackerDies: false,
            defenderDies: false,
            attackerDiesInRetaliation: false,
            log: "Error: Unidades inválidas para predicción."
        };
    }

    let prediction = {
        damageToAttacker: 0,
        damageToDefender: 0,
        attackerDies: false,
        defenderDies: false,
        attackerDiesInRetaliation: false, // El atacante muere por el contraataque
        log: []
    };

    // --- Simulación del ataque del 'attacker' al 'defender' ---
    let attackerAttackStat = attacker.attack || 0;
    let defenderDefenseStat = defender.defense || 0;
    let defenderCurrentHealth = defender.currentHealth;

    // Considerar bonos de terreno para el defensor (similar a applyDamage)
    const defenderHexData = board[defender.r]?.[defender.c];
    let terrainDefenseBonusDefender = 0;
    let terrainRangedDefenseBonusDefender = 0;
    if (defenderHexData && TERRAIN_TYPES[defenderHexData.terrain]) {
        terrainDefenseBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].defenseBonus || 0;
        terrainRangedDefenseBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].rangedDefenseBonus || 0;
    }
    defenderDefenseStat += terrainDefenseBonusDefender;
    if ((attacker.attackRange || 1) > 1) { // Si el atacante es a distancia
        defenderDefenseStat += terrainRangedDefenseBonusDefender;
    }

    // Considerar flanqueo (simplificado para predicción, asumiendo que no se puede predecir el flanqueo activo sin más lógica)
    // Para una predicción precisa, se podría simular si el movimiento del atacante crea una situación de flanqueo,
    // pero por ahora no aplicamos el flanqueo en la predicción a menos que `target.isFlanked` ya sea true en el estado actual.
    // Esto se maneja en `applyDamage` real, pero aquí solo se tiene en cuenta si ya está flanqueada.
    let effectiveAttackerAttack = attackerAttackStat; 
    // Para predecir flanqueo, necesitarías una función `predictFlanking(attacker, defender)` que simule si la posición del atacante causaría flanqueo.
    // Por simplicidad, no lo implementamos en la predicción por ahora, solo en el daño real.

    let damageToDefenderCalc = Math.round(effectiveAttackerAttack - defenderDefenseStat);
    if (damageToDefenderCalc < 0) damageToDefenderCalc = 0;
    if (effectiveAttackerAttack > 0 && damageToDefenderCalc === 0) damageToDefenderCalc = 1; // Daño mínimo

    prediction.damageToDefender = Math.min(damageToDefenderCalc, defenderCurrentHealth);
    if (prediction.damageToDefender >= defenderCurrentHealth) {
        prediction.defenderDies = true;
    }
    prediction.log.push(`Predicción: ${attacker.name} (Atk:${attackerAttackStat}) vs ${defender.name} (Def:${defenderDefenseStat}). Daño Def: ${prediction.damageToDefender}. Defensor muere: ${prediction.defenderDies}`);


    // --- Simulación del contraataque del 'defender' al 'attacker' (si el defensor sobrevive y puede contraatacar) ---
    if (!prediction.defenderDies) {
        // ¿Puede el defensor contraatacar? (si tiene rango y no es un terreno intransitable)
        const attackerHexData = board[attacker.r]?.[attacker.c]; // Para obtener el terreno del atacante para defensa
        
        // No puede contraatacar si está en agua o terreno intransitable
        if (TERRAIN_TYPES[defenderHexData.terrain]?.isImpassableForLand || TERRAIN_TYPES[attackerHexData.terrain]?.isImpassableForLand) {
             prediction.log.push(`Predicción Retaliación: No hay contraataque debido a terreno intransitable.`);
        } else if (isValidAttack({ ...defender, hasAttacked: false }, attacker)) { // Pasar un clon sin hasAttacked para el chequeo de rango
            let defenderAttackStat = defender.attack || 0;
            let attackerDefenseStat = attacker.defense || 0;
            let terrainDefenseBonusAttacker = 0;
            let terrainRangedDefenseBonusAttacker = 0;
            
            if (attackerHexData && TERRAIN_TYPES[attackerHexData.terrain]) {
                terrainDefenseBonusAttacker = TERRAIN_TYPES[attackerHexData.terrain].defenseBonus || 0;
                terrainRangedDefenseBonusAttacker = TERRAIN_TYPES[attackerHexData.terrain].rangedDefenseBonus || 0;
            }
            attackerDefenseStat += terrainDefenseBonusAttacker;
            // Si el contraataque es a distancia, aplicar bonus de defensa a distancia al atacante.
            // Para la predicción, asumimos que el contraataque es un ataque "normal" desde el defensor.
            if ((defender.attackRange || 1) > 1) { 
                attackerDefenseStat += terrainRangedDefenseBonusAttacker;
            }
            
            // Si el contraatacante (defensor) está en Colinas y es cuerpo a cuerpo, aplicar bonus de ataque.
            let terrainMeleeAttackBonusDefender = 0;
            if (defenderHexData && TERRAIN_TYPES[defenderHexData.terrain]) {
                if (TERRAIN_TYPES[defenderHexData.terrain].name === "Colinas" && (defender.attackRange || 1) === 1) {
                    terrainMeleeAttackBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].meleeAttackBonus || 0;
                }
            }
            defenderAttackStat += terrainMeleeAttackBonusDefender;


            let effectiveDefenderAttack = defenderAttackStat;
            let damageToAttackerCalc = Math.round(effectiveDefenderAttack - attackerDefenseStat);
            if (damageToAttackerCalc < 0) damageToAttackerCalc = 0;
            if (effectiveDefenderAttack > 0 && damageToAttackerCalc === 0) damageToAttackerCalc = 1;

            prediction.damageToAttacker = Math.min(damageToAttackerCalc, attacker.currentHealth);
            if (prediction.damageToAttacker >= attacker.currentHealth) {
                prediction.attackerDiesInRetaliation = true; 
                prediction.attackerDies = true; 
            }
            prediction.log.push(`Predicción Retaliación: ${defender.name} (Atk:${defenderAttackStat}) vs ${attacker.name} (Def:${attackerDefenseStat}). Daño Atk: ${prediction.damageToAttacker}. Atacante muere: ${prediction.attackerDiesInRetaliation}`);
        } else {
            prediction.log.push(`Predicción Retaliación: ${defender.name} no puede contraatacar (fuera de rango o condición inválida).`);
        }
    } else {
        prediction.log.push(`Predicción Retaliación: ${defender.name} muere, no hay contraataque.`);
    }
    
    // console.log(`%c[AI Predict Outcome] Para ${attacker.name} vs ${defender.name}:\n${prediction.log.join("\n")}`, "color: olive");
    return prediction;
}

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

function applyFlankingPenalty(targetUnit, mainAttacker) {
    if (!targetUnit || !mainAttacker || !board) return;

    targetUnit.isFlanked = false; 
    let flankingAttackersCount = 0;
    const neighbors = getHexNeighbors(targetUnit.r, targetUnit.c);

    for (const n_coord of neighbors) {
        const neighborUnit = getUnitOnHex(n_coord.r, n_coord.c);
        if (neighborUnit && neighborUnit.player !== targetUnit.player && neighborUnit.id !== mainAttacker.id) {
            flankingAttackersCount++;
        }
    }

    if (flankingAttackersCount > 0) {
        targetUnit.isFlanked = true;
        const moraleLoss = 10;
        targetUnit.morale = Math.max(0, targetUnit.morale - moraleLoss);
        
        // <<< MODIFICACIÓN: Un único mensaje claro >>>
        logMessage(`¡${targetUnit.name} es flanqueada, sufre daño extra y pierde ${moraleLoss} de moral!`);
    }
}

function handleUnitDestroyed(destroyedUnit, victorUnit) {
    if (!destroyedUnit) {
        console.warn("[handleUnitDestroyed] Intento de destruir una unidad nula.");
        return;
    }

    // Determinar si es una destrucción por combate o por otras causas (fusión, rendición)
    const isCombatDestruction = victorUnit && victorUnit.player !== destroyedUnit.player;

    console.log(`[handleUnitDestroyed] Destruyendo ${destroyedUnit.name}. ¿Por combate? ${isCombatDestruction}`);

    if (isCombatDestruction) {
        logMessage(`¡${destroyedUnit.name} ha sido destruida por ${victorUnit.name}!`);

        // --- INICIO DE LA LÓGICA DE RECOMPENSAS MEJORADA ---

        // 1. Recompensa de Experiencia (XP) para el vencedor
        // Bonus fijo por el golpe de gracia + bonus basado en la fuerza del enemigo derrotado.
        const experienceGained = 10 + Math.floor((destroyedUnit.maxHealth || 0) / 10);
        victorUnit.experience = (victorUnit.experience || 0) + experienceGained;
        logMessage(`${victorUnit.name} gana ${experienceGained} XP por la victoria.`);
        checkAndApplyLevelUp(victorUnit);

        // 2. Recompensa de Oro por la victoria
        const goldGained = REGIMENT_TYPES[destroyedUnit.regiments[0]?.type]?.goldValueOnDestroy || 10;
        if (goldGained > 0 && gameState.playerResources[victorUnit.player]) {
            gameState.playerResources[victorUnit.player].oro += goldGained;
            logMessage(`${victorUnit.name} obtiene ${goldGained} de oro por saquear los restos.`);
        }

        // 3. BONUS DE MORAL POR VICTORIA DECISIVA
        // Se aplica un bonus de moral significativo al vencedor, que debería superar
        // cualquier pérdida menor sufrida durante el contraataque.
        const victoryMoraleBonus = 20;
        victorUnit.morale = Math.min((victorUnit.maxMorale || 100), (victorUnit.morale || 50) + victoryMoraleBonus);
        logMessage(`¡La moral de ${victorUnit.name} sube a ${victorUnit.morale} por la victoria decisiva!`);

        // --- FIN DE LA LÓGICA DE RECOMPENSAS ---

        // Animación de explosión
        const explosionEl = document.createElement('div');
        explosionEl.classList.add('explosion-animation');
        if (domElements?.gameBoard && destroyedUnit.element) {
            const boardRect = domElements.gameBoard.getBoundingClientRect();
            const unitRect = destroyedUnit.element.getBoundingClientRect();
            explosionEl.style.left = `${(unitRect.left - boardRect.left) + unitRect.width / 2}px`;
            explosionEl.style.top = `${(unitRect.top - boardRect.top) + unitRect.height / 2}px`;
            domElements.gameBoard.appendChild(explosionEl);
            setTimeout(() => explosionEl.remove(), 1200);
        }
    }
    
    // Proceso de eliminación de la unidad (sin cambios)
    if (destroyedUnit.element) {
        destroyedUnit.element.remove();
    }
    
    const hexOfUnit = board[destroyedUnit.r]?.[destroyedUnit.c];
    if (hexOfUnit && hexOfUnit.unit?.id === destroyedUnit.id) {
        hexOfUnit.unit = null;
        if(typeof renderSingleHexVisuals === 'function') renderSingleHexVisuals(destroyedUnit.r, destroyedUnit.c);
    }
    
    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) {
        units.splice(index, 1);
    }

    if (selectedUnit?.id === destroyedUnit.id) {
        selectedUnit = null;
        if (UIManager) UIManager.hideContextualPanel();
    }
    
    if (isCombatDestruction) {
        if (typeof checkVictory === 'function') checkVictory();
    }
}

function resetUnitsForNewTurn(playerNumber) { 
    console.log(`%c[TurnStart] Reseteando unidades para Jugador ${playerNumber}`, "color: blue; font-weight: bold;");
    if (!units || !Array.isArray(units)) {
        console.error("[TurnStart] El array 'units' no está disponible o no es un array.");
        return;
    }
    
    // Iteramos sobre TODAS las unidades
    units.forEach(unit => {
        // >> INICIO DE LA CORRECCIÓN LÓGICA <<
        // Si la unidad pertenece al jugador cuyo turno está COMENZANDO...
        if (unit.player === playerNumber) {
            // Se resetean sus acciones y su movimiento
            const statsFromRegiments = calculateRegimentStats(unit.regiments, unit.player);
            unit.movement = statsFromRegiments.movement;
            unit.currentMovement = unit.movement;
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.isFlanked = false; // Se resetea el estado de flanqueo al inicio de su turno
        }
    });

    if (typeof deselectUnit === "function") deselectUnit();
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }
}

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

function checkAndProcessBrokenUnit(unit) {
    if (!unit || unit.morale > 0) {
        return false; // No está rota, no hacemos nada.
    }

    // Si llegamos aquí, la unidad está rota.
    logMessage(`¡${unit.name} tiene la moral rota!`, "error");

    unit.hasMoved = true;
    unit.hasAttacked = true;

    const safeHavens = gameState.cities.filter(c => c.owner === unit.player).sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
    const nearestSafeHaven = safeHavens[0] || null;

    let retreatHex = null;
    if (nearestSafeHaven) {
        const neighbors = getHexNeighbors(unit.r, unit.c);
        let bestNeighbor = null;
        let minDistance = hexDistance(unit.r, unit.c, nearestSafeHaven.r, nearestSafeHaven.c);

        for (const n of neighbors) {
            if (!getUnitOnHex(n.r, n.c) && !TERRAIN_TYPES[board[n.r]?.[n.c]?.terrain]?.isImpassableForLand) {
                const dist = hexDistance(n.r, n.c, nearestSafeHaven.r, nearestSafeHaven.c);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestNeighbor = n;
                }
            }
        }
        retreatHex = bestNeighbor;
    }

    if (retreatHex) {
        logMessage(`¡${unit.name} rompe filas y huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
        const tempUnitForMove = { ...unit, currentMovement: 1, hasMoved: false };
        moveUnit(tempUnitForMove, retreatHex.r, retreatHex.c);
        unit.r = retreatHex.r;
        unit.c = retreatHex.c;
    } else {
        logMessage(`¡${unit.name} está rodeada y sin moral! ¡La unidad se rinde!`, "error");
        handleUnitDestroyed(unit, null);
    }
    
    // Deseleccionar si era la unidad activa
    if (selectedUnit && selectedUnit.id === unit.id) {
        deselectUnit();
        UIManager.hideContextualPanel();
    }

    return true; // La unidad estaba rota y se ha procesado.
}

function calculateDivisionDiscipline(unit) {
    if (!unit.regiments || unit.regiments.length === 0) {
        return 0;
    }

    // 1. Bonus base por presencia de Cuartel General
    const hasHQ = unit.regiments.some(r => REGIMENT_TYPES[r.type]?.provides_morale_boost);
    let discipline = hasHQ ? 20 : 0; // Bonus base de 20 puntos por tener un HQ

    // 2. Bonus por el nivel de la división (promedio de la experiencia de los regimientos)
    const divisionLevel = unit.level || 0;
    if (XP_LEVELS[divisionLevel]) {
        discipline += XP_LEVELS[divisionLevel].disciplineBonus || 0;
    }

    // La disciplina no puede superar el 75%
    return Math.min(discipline, 75);
}

// Verifica si la unidad subió de nivel y aplica los cambios.
function checkAndApplyLevelUp(unit) {
    if (!unit || !XP_LEVELS || (unit.level !== undefined && XP_LEVELS[unit.level]?.nextLevelXp === 'Max')) {
        return false;
    }

    unit.level = unit.level ?? 0; // Si no tiene nivel, es 0
    const currentLevelData = XP_LEVELS[unit.level];
    const nextLevelXP = currentLevelData.nextLevelXp;

    if (nextLevelXP !== 'Max' && unit.experience >= nextLevelXP) {
        unit.level++;
        const newLevelData = XP_LEVELS[unit.level];
        logMessage(`¡${unit.name} ha subido a Nivel ${unit.level} (${newLevelData.currentLevelName})!`);
        recalculateUnitStats(unit); // Recalcular stats para aplicar los bonus
        return true;
    }
    return false;
}

// Recalcula TODOS los stats de una unidad (ataque, defensa, etc.) aplicando los bonus de nivel.
function recalculateUnitStats(unit) {
    const playerNum = unit.player;
    const baseStats = calculateRegimentStats(unit.regiments, playerNum);
    const levelBonuses = XP_LEVELS[unit.level];

    unit.attack = baseStats.attack + (levelBonuses.attackBonus || 0);
    unit.defense = baseStats.defense + (levelBonuses.defenseBonus || 0);
    
    // Otros stats no suelen cambiar con el nivel, los mantenemos de la base.
    unit.maxHealth = baseStats.maxHealth;
    unit.movement = baseStats.movement;
    unit.visionRange = baseStats.visionRange;
    unit.attackRange = baseStats.attackRange;

    // Actualizamos la disciplina
    unit.discipline = calculateDivisionDiscipline(unit);

    console.log(`Stats recalculados para ${unit.name} (Nivel ${unit.level}): Atk=${unit.attack}, Def=${unit.defense}, Disc=${unit.discipline}%`);
}

function handlePillageAction() {
    RequestPillageAction();
}

/**
 * [Punto de Entrada] Inicia la acción de Saqueo.
 * Decide si ejecutar localmente o enviar una petición a la red.
 */
function RequestPillageAction() {
    if (!selectedUnit) return; // No hay unidad seleccionada

    if (isNetworkGame()) {
        const action = { type: 'pillageHex', payload: { playerId: selectedUnit.player, unitId: selectedUnit.id }};
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
        return;
    }
    
    // Para juegos locales, llama directamente a la función de ejecución.
    _executePillageAction(selectedUnit);
}

/**
 * [Función de Ejecución] Contiene la lógica real del saqueo.
 * Es llamada por RequestPillageAction (local) o por el receptor de red.
 * @param {object} pillagerUnit - La unidad que realiza el saqueo.
 */
function _executePillageAction(pillagerUnit) {
    if (!pillagerUnit) return;

    const hex = board[pillagerUnit.r]?.[pillagerUnit.c];

    // --- Validaciones de Lógica ---
    if (!hex || hex.owner === null || hex.owner === pillagerUnit.player) {
        logMessage("No se puede saquear un territorio propio o neutral.", "error");
        return;
    }
    if (pillagerUnit.hasAttacked || pillagerUnit.hasMoved) {
        logMessage("Esta unidad ya ha actuado este turno.", "error");
        return;
    }

    let goldGained = 15; // Ganancia base por saquear
    
    // Si hay una estructura, se daña y se obtiene más oro.
    if (hex.structure) {
        logMessage(`${pillagerUnit.name} está saqueando la estructura ${hex.structure}!`);
        // Lógica futura: podrías dañar la estructura en lugar de destruirla.
        // Por ahora, la destruimos.
        hex.structure = null;
        goldGained += 50;
    } else {
        logMessage(`${pillagerUnit.name} está saqueando el territorio en (${hex.r}, ${hex.c})!`);
    }

    // El hexágono pierde estabilidad
    hex.estabilidad = Math.max(0, hex.estabilidad - 2);

    // Añadir el oro al jugador
    if (gameState.playerResources[pillagerUnit.player]) {
        gameState.playerResources[pillagerUnit.player].oro += goldGained;
    }

    // Consumir la acción de la unidad
    pillagerUnit.hasAttacked = true;
    pillagerUnit.hasMoved = true; 

    logMessage(`¡Saqueo exitoso! Obtienes ${goldGained} de oro. El territorio pierde estabilidad.`);

    // Actualizar la UI
    renderSingleHexVisuals(pillagerUnit.r, pillagerUnit.c);
    if (UIManager) {
        UIManager.updateAllUIDisplays();
        UIManager.hideContextualPanel();
    }
}

function handleDisbandUnit(unitToDisband) {
    if (!unitToDisband) return;

    const confirmationMessage = `¿Estás seguro de que quieres disolver "${unitToDisband.name}"? Se recuperará el 50% de su coste en oro.`;
    if (window.confirm(confirmationMessage)) {
        RequestDisbandUnit(unitToDisband);
    }
}

function handlePlacementModeClick(r, c) {
    // --- Toda tu lógica de validación inicial se mantiene intacta ---
    //console.log(`[Placement] Clic en (${r},${c}). Modo activo: ${placementMode.active}, Unidad: ${placementMode.unitData?.name || 'Ninguna'}`);
    
    if (!placementMode.active || !placementMode.unitData) {
        console.error("[Placement] Error: Modo de colocación inactivo o sin datos de unidad. Se cancelará.");
        placementMode.active = false;
        if (UIManager) UIManager.clearHighlights();
        return;
    }

    const unitToPlace = placementMode.unitData;
    const hexData = board[r]?.[c];

    if (!hexData) {
        logMessage("Hexágono inválido.");
        return; 
    }

    if (getUnitOnHex(r, c)) {
        logMessage(`Ya hay una unidad en este hexágono.`);
        return;
    }

    let canPlace = false;
    let reasonForNoPlacement = "";

    if (gameState.currentPhase === "play") {
        if (!placementMode.recruitHex) {
            reasonForNoPlacement = "Error: Falta el origen del reclutamiento.";
            canPlace = false;
        } else {
            const dist = hexDistance(placementMode.recruitHex.r, placementMode.recruitHex.c, r, c);
            if (dist > 1) {
                reasonForNoPlacement = "Las unidades reclutadas deben colocarse en la base o adyacente.";
                canPlace = false;
            } else {
                canPlace = true;
            }
        }
    } else if (gameState.currentPhase === "deployment") {
        if (hexData.terrain === 'water') {
            reasonForNoPlacement = "No se pueden desplegar unidades de tierra en el agua.";
            canPlace = false;
        } else {
            canPlace = true;
        }
    }

    // --- A partir de aquí, integramos la lógica de red---

    if (canPlace) {
        const isNetworkGame = NetworkManager.conn && NetworkManager.conn.open;

        if (isNetworkGame) {
            // Preparamos la acción que se va a ejecutar/enviar.
            const replacer = (key, value) => (key === 'element' ? undefined : value);
            const cleanUnitData = JSON.parse(JSON.stringify(unitToPlace, replacer));
            const action = {
                type: 'placeUnit',
                payload: { 
                    playerId: gameState.myPlayerNumber,
                    unitData: cleanUnitData,
                    r: r,
                    c: c
                }
            };
            //console.log(`%c[VIAJE-2] Cliente ENVIANDO acción 'placeUnit'. El ID en unitData debería ser null.`, 'color: #FFA500; font-weight: bold;', action);
            
            // Bifurcación clave: el Anfitrión se procesa a sí mismo, el Cliente envía una petición.
            if (NetworkManager.esAnfitrion) {
                console.log("[Red - Anfitrión] Procesando acción local de colocación de unidad...");
                processActionRequest(action); 
            } else {
                console.log("[Red - Cliente] Enviando petición al anfitrión para colocar unidad...");
                NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
            }

            // Desactivamos el modo de colocación localmente.
            placementMode.active = false;
            placementMode.unitData = null;
            if (UIManager) UIManager.clearHighlights();
            logMessage(`Petición para colocar ${unitToPlace.name} procesada/enviada...`);

        } else {
            // --- JUEGO LOCAL (funciona como siempre) ---
            placeFinalizedDivision(unitToPlace, r, c);
            
            placementMode.active = false;
            placementMode.unitData = null;
            placementMode.recruitHex = null;
            if (UIManager) UIManager.clearHighlights();
            
            logMessage(`${unitToPlace.name} colocada con éxito en (${r},${c}).`);
            if (UIManager) {
                UIManager.updateAllUIDisplays();
                UIManager.hideContextualPanel();
            }
        }

    } else {
        // --- Tu lógica original para el caso de fallo (se mantiene intacta) ---
        logMessage(`No se puede colocar: ${reasonForNoPlacement}`);
        
        if (unitToPlace.cost) {
            for (const resourceType in unitToPlace.cost) {
                gameState.playerResources[gameState.currentPlayer][resourceType] = 
                    (gameState.playerResources[gameState.currentPlayer][resourceType] || 0) + unitToPlace.cost[resourceType];
            }
            if (UIManager) UIManager.updatePlayerAndPhaseInfo();
            logMessage("Colocación cancelada. Recursos reembolsados.");
        }
        
        placementMode.active = false;
        placementMode.unitData = null;
        placementMode.recruitHex = null;
        if (UIManager) UIManager.clearHighlights();
    }
}

//==============================================================
//== NUEVAS FUNCIONES DE RED (PARA AGREGAR EN unit_Actions.js) ==
//==============================================================

// --- FUNCIONES DE ACCIÓN CON LÓGICA DE RED CORREGIDA ---

async function RequestMoveUnit(unit, toR, toC) {
    if (isNetworkGame()) {
        const action = { type: 'moveUnit', payload: { playerId: unit.player, unitId: unit.id, toR: toR, toC: toC }};
        if (NetworkManager.esAnfitrion) {
            // El Anfitrión se procesa a sí mismo, sin enviar por la red
            processActionRequest(action);
        } else {
            // El Cliente envía la petición al Anfitrión
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
    } else {
        // En un juego local, la "petición" es simplemente ejecutar el movimiento directamente.
        await moveUnit(unit, toR, toC);
    }
}

async function RequestAttackUnit(attacker, defender) {
    console.log(`%c[VIAJE-1] Dentro de RequestAttackUnit. Soy Jugador ${gameState.myPlayerNumber}. Anfitrión: ${NetworkManager.esAnfitrion}`, 'color: #FFA500; font-weight: bold;');
    
    if (isNetworkGame()) {
        const action = { type: 'attackUnit', payload: { playerId: attacker.player, attackerId: attacker.id, defenderId: defender.id }};
        if (NetworkManager.esAnfitrion) {
            console.log('%c[VIAJE-2A] Soy Anfitrión. Procesando mi propio ataque directamente.', 'color: #FFA500; font-weight: bold;');
            processActionRequest(action);
        } else {
            console.log('%c[VIAJE-2B] Soy Cliente. Enviando petición de ataque al anfitrión.', 'color: #FFA500; font-weight: bold;');
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
        return;
    }
    // Juego local
    await attackUnit(attacker, defender);
}

function RequestMergeUnits(mergingUnit, targetUnit) {
    if (isNetworkGame()) {
        const action = { type: 'mergeUnits', payload: { playerId: mergingUnit.player, mergingUnitId: mergingUnit.id, targetUnitId: targetUnit.id }};
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
        return;
    }
    mergeUnits(mergingUnit, targetUnit);
}

function RequestSplitUnit(originalUnit, targetR, targetC) {
    const actionData = gameState.preparingAction;
    if (isNetworkGame()) {
        const action = { type: 'splitUnit', payload: { playerId: originalUnit.player, originalUnitId: originalUnit.id, newUnitRegiments: actionData.newUnitRegiments, remainingOriginalRegiments: actionData.remainingOriginalRegiments, targetR: targetR, targetC: targetC }};
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }
        cancelPreparingAction();
        return;
    }
    splitUnit(originalUnit, targetR, targetC);
}

function RequestDisbandUnit(unitToDisband) {
    if (!unitToDisband) return;

    if (isNetworkGame()) {
        const action = { 
            type: 'disbandUnit', 
            payload: { 
                playerId: unitToDisband.player, 
                unitId: unitToDisband.id 
            }
        };
        
        if (NetworkManager.esAnfitrion) {
            processActionRequest(action);
        } else {
            NetworkManager.enviarDatos({ type: 'actionRequest', action: action });
        }

        // Cierre de UI inmediato para el jugador que realiza la acción
        if (domElements.unitDetailModal) domElements.unitDetailModal.style.display = 'none';
        if (UIManager) UIManager.hideContextualPanel();

    } else {
        // Ejecución en modo LOCAL
        const goldToRefund = Math.floor((unitToDisband.cost?.oro || 0) * 0.5);
        
        if (gameState.playerResources[unitToDisband.player]) {
            gameState.playerResources[unitToDisband.player].oro += goldToRefund;
            logMessage(`Has recuperado ${goldToRefund} de oro al disolver a ${unitToDisband.name}.`);
        }

        handleUnitDestroyed(unitToDisband, null);

        if (domElements.unitDetailModal) domElements.unitDetailModal.style.display = 'none';
        if (UIManager) {
            UIManager.hideContextualPanel();
            UIManager.updateAllUIDisplays();
        }
    }
}

/**
 * [Función Pura de Ejecución] Mueve la unidad en el estado del juego y la UI.
 * No contiene lógica de red. Asume que la acción ya ha sido validada y confirmada.
 * @private
 */
async function _executeMoveUnit(unit, toR, toC) {
    console.log(`%c[VIAJE-9] Cliente ejecutando _executeMoveUnit para ${unit.name} a (${toR},${toC}). El mapa debería actualizarse ahora.`, 'color: #32CD32; font-weight: bold;');
    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC];

    // Guardar estado para la función "deshacer"
    if (unit.player === gameState.currentPlayer) {
        unit.lastMove = {
            fromR: fromR,
            fromC: fromC,
            initialCurrentMovement: unit.currentMovement,
            initialHasMoved: unit.hasMoved,
            initialHasAttacked: unit.hasAttacked,
            movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null
        };
    }

    let costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC);
    if (costOfThisMove === Infinity) return;

    // Quitar la unidad del hexágono original
    if (board[fromR]?.[fromC]) {
        board[fromR][fromC].unit = null;
        renderSingleHexVisuals(fromR, fromC);
    }

    // Mover la unidad al nuevo hexágono
    unit.r = toR;
    unit.c = toC;
    unit.currentMovement -= costOfThisMove;
    unit.hasMoved = true;

    if (targetHexData) {
        targetHexData.unit = unit;

        const originalOwner = targetHexData.owner;
        const movingPlayer = unit.player;

        if (originalOwner === null) {
            targetHexData.owner = movingPlayer;
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 };
            targetHexData.nacionalidad[movingPlayer] = 1;

            logMessage(`¡Has ocupado un territorio neutral en (${toR}, ${toC})!`);

            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city && city.owner === null) {
                city.owner = movingPlayer; // Actualizamos el 'owner' en el array global
                logMessage(`¡La ciudad neutral '${city.name}' se une a tu imperio!`);
            }
            renderSingleHexVisuals(toR, toC);
        }

    } else {
        console.error(`[_executeMoveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; unit.hasMoved = false;
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit;
        renderSingleHexVisuals(fromR, fromC);
        return;
    }

    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    if (typeof positionUnitElement === "function") positionUnitElement(unit);
    if (UIManager) {
        UIManager.updateSelectedUnitInfoPanel();
        UIManager.updatePlayerAndPhaseInfo();
    }

    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") {
        if (checkVictory()) return;
    }

    if (selectedUnit && selectedUnit.id === unit.id) {
        UIManager.highlightPossibleActions(unit);
    }
}

console.log("unit_Actions.js se ha cargado.");
;