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
    if (!unitData) {
        console.error("[placeFinalizedDivision] Intento de colocar unidad con datos nulos.");
        return;
    }
    
    if (!unitData.id) {
        unitData.id = `u${unitIdCounter++}`;
    }
    console.log(`[PFD v5] PROCESANDO DATOS para unidad "${unitData.name}" (ID: ${unitData.id}) en (${r},${c})`);

    // --- 1. ACTUALIZACIÓN DEL ESTADO LÓGICO ---
    unitData.r = r;
    unitData.c = c;
    unitData.element = null; // El elemento visual será creado por el UIManager

    const existingIndex = units.findIndex(u => u.id === unitData.id);
    if (existingIndex > -1) {
        console.warn(`[PFD v5] Detectada unidad duplicada con ID ${unitData.id}. Eliminando la antigua.`);
        if(units[existingIndex].element) units[existingIndex].element.remove();
        units.splice(existingIndex, 1);
    }
    units.push(unitData);

    const targetHexData = board[r]?.[c];
    if (targetHexData) {
        targetHexData.unit = unitData;
        if (targetHexData.owner === null) {
            const placingPlayer = unitData.player;
            targetHexData.owner = placingPlayer;
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 };
            targetHexData.nacionalidad[placingPlayer] = 1;
            const city = gameState.cities.find(ci => ci.r === r && ci.c === c);
            if (city?.owner === null) { city.owner = placingPlayer; logMessage(`Ciudad neutral capturada!`); }
        }
    }

    // --- 2. RE-CÁLCULO DE STATS Y SALUD FINAL ---
    const finalStats = calculateRegimentStats(unitData.regiments, unitData.player);
    Object.assign(unitData, finalStats);
    if (unitData.isSplit) {
        delete unitData.isSplit;
    } else {
        unitData.currentHealth = unitData.maxHealth;
    }

    // --- 3. LLAMADA AL RENDERIZADOR CENTRAL ---
    console.log(`[PFD v5] Datos procesados. Llamando a UIManager.renderAllUnitsFromData() para la actualización visual.`);
    if (UIManager && typeof UIManager.renderAllUnitsFromData === 'function') {
        UIManager.renderAllUnitsFromData();
    } else {
        console.error("CRÍTICO: UIManager.renderAllUnitsFromData no está disponible.");
    }
    
    // --- 4. RENDERIZADO DEL HEXÁGONO Y CORRECCIÓN DE NIEBLA ---
    renderSingleHexVisuals(r, c);
    
    // Después de redibujar TODAS las unidades, aplicamos la niebla para ocultar las que no se deben ver.
    if (typeof updateFogOfWar === 'function') {
        updateFogOfWar();
    }

    if (gameState.currentPhase === "deployment") {
        if (!gameState.unitsPlacedByPlayer[unitData.player]) {
            gameState.unitsPlacedByPlayer[unitData.player] = 0;
        }
        gameState.unitsPlacedByPlayer[unitData.player]++;
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

async function RequestMergeUnits(mergingUnit, targetUnit) {
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

function mergeUnits(mergingUnit, targetUnit) {
    if (!mergingUnit || !targetUnit || mergingUnit.player !== targetUnit.player || mergingUnit.id === targetUnit.id) {
        return false;
    }
    
    // --- VALIDACIONES DE LÓGICA DE FUSIÓN---
    const targetRegimentData = REGIMENT_TYPES[targetUnit.regiments[0]?.type];
    const mergingRegimentData = REGIMENT_TYPES[mergingUnit.regiments[0]?.type];
    const isEmbarking = targetRegimentData?.is_naval && !mergingRegimentData?.is_naval;
    const isLandMerge = !targetRegimentData?.is_naval && !mergingRegimentData?.is_naval;

    if (!isEmbarking && !isLandMerge) {
        logMessage("Esta combinación de unidades no se puede fusionar.", "warning");
        return false;
    }
    
    const totalRegiments = (targetUnit.regiments?.length || 0) + (mergingUnit.regiments?.length || 0);
    if (totalRegiments > MAX_REGIMENTS_PER_DIVISION) {
        logMessage(`No hay suficiente espacio para fusionar. El límite es ${MAX_REGIMENTS_PER_DIVISION} regimientos.`, "warning");
        return false;
    }

    const mergingCommanderId = mergingUnit.commander;
    const targetCommanderId = targetUnit.commander;

    // REGLA: No se pueden fusionar dos divisiones si ambas están lideradas por un general.
    if (mergingCommanderId && targetCommanderId && mergingCommanderId !== targetCommanderId) {
        logMessage("No se pueden fusionar dos divisiones lideradas por generales distintos.", "error");
        return false;
    }

    const isAIAction = gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_');
    if (isAIAction || window.confirm(`¿Fusionar "${mergingUnit.name}" con "${targetUnit.name}"? La unidad que se mueve se disolverá.`)) {
        
        // --- TRANSFERENCIA DE GENERAL ---
        if (mergingCommanderId && !targetCommanderId) {
            targetUnit.commander = mergingCommanderId;
            logMessage(`El general ${COMMANDERS[mergingCommanderId].name} ahora comanda la división "${targetUnit.name}".`);
        }
        
        // --- FUSIÓN DE REGIMIENTOS Y STATS ---
        mergingUnit.regiments.forEach(reg => {
            targetUnit.regiments.push(JSON.parse(JSON.stringify(reg)));
        });
        const oldTargetHealth = targetUnit.currentHealth;
        recalculateUnitStats(targetUnit);
        targetUnit.currentHealth = Math.min(oldTargetHealth + mergingUnit.currentHealth, targetUnit.maxHealth);

        if (isEmbarking) {
            targetUnit.movement = targetRegimentData.movement;
            targetUnit.is_naval = true;
            targetUnit.sprite = targetRegimentData.sprite;
        }

        console.log(`[Fusión] Iniciando destrucción manual de ${mergingUnit.name} (ID: ${mergingUnit.id})`);
        
        // 1. Eliminar el elemento visual del DOM
        if (mergingUnit.element && mergingUnit.element.parentElement) {
            mergingUnit.element.remove();
            console.log(`-> Elemento DOM de ${mergingUnit.name} eliminado.`);
        }
        
        // 2. Limpiar la unidad de su hexágono en el tablero lógico
        if (board[mergingUnit.r]?.[mergingUnit.c]?.unit?.id === mergingUnit.id) {
            board[mergingUnit.r][mergingUnit.c].unit = null;
            console.log(`-> Referencia en tablero [${mergingUnit.r}][${mergingUnit.c}] limpiada.`);
        }
        
        // 3. Eliminar la unidad del array global 'units'
        const indexToRemove = units.findIndex(u => u.id === mergingUnit.id);
        if (indexToRemove > -1) {
            units.splice(indexToRemove, 1);
            console.log(`-> Objeto de ${mergingUnit.name} eliminado del array 'units'.`);
        }

        // Se marcan como que han actuado la unidad restante y la que se movió (que ya no existe pero previene bugs)
        mergingUnit.hasMoved = true;
        mergingUnit.hasAttacked = true;
        targetUnit.hasMoved = false;
        targetUnit.hasAttacked = false;

        logMessage(`"${mergingUnit.name}" se ha integrado en "${targetUnit.name}".`, "success");
        if (UIManager) {
            // Actualizar el panel con la información de la unidad que ha quedado
            UIManager.showUnitContextualInfo(targetUnit, true);
            // Redibujamos la unidad de destino para asegurar que su fuerza y estandarte son correctos.
            UIManager.updateUnitStrengthDisplay(targetUnit);
            renderSingleHexVisuals(targetUnit.r, targetUnit.c);
            UIManager.clearHighlights();
        }
        
        // Se deselecciona todo para forzar un estado limpio tras la acción.
        deselectUnit();

        return true;
    }

    return false;
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
        
        hasMoved: false, // Nace sin poder actuar este turno
        hasAttacked: false, // Nace con poder atacar este turno
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

/**
 * Calcula los stats combinados de una división a partir de sus regimientos,
 * aplicando los bonus de la Civilización y del General asignado.
 * @param {Array<object>} regimentsArray - El array de regimientos.
 * @param {number} playerNum - El número del jugador.
 * @param {string|null} commanderId - El ID del general asignado a la división. // <<== NUEVO PARÁMETRO
 * @returns {object} Objeto con los stats calculados.
 */
function calculateRegimentStats(regimentsArray, playerNum, commanderId = null) {
    let finalStats = {
        attack: 0, defense: 0, maxHealth: 0,
        movement: Infinity, visionRange: 0, attackRange: 0,
        initiative: 0, sprite: '❓', is_naval: false
    };
    
    if (!regimentsArray || regimentsArray.length === 0) {
        finalStats.movement = 0;
        finalStats.attackRange = 0;
        return finalStats;
    }

    // --- 1. OBTENER BONUS BASE (Civilización y General) ---

    // Bonus de Civilización (como antes)
    const playerCivName = gameState?.playerCivilizations?.[playerNum] || 'ninguna';
    const civBonuses = CIVILIZATIONS[playerCivName]?.bonuses || {};

    console.log(`%c[calculateRegimentStats] J${playerNum} | Civ Leída: "${playerCivName}" | Bonus Aplicables:`, "color: #00A86B", civBonuses);

    let commanderData = null;
    let heroInstance = null;
    if (commanderId && PlayerDataManager.currentPlayer) {
        commanderData = COMMANDERS[commanderId];
        // Buscamos la instancia específica del Héroe en los datos del jugador
        heroInstance = PlayerDataManager.currentPlayer.heroes.find(h => h.id === commanderId);
    }
    
    // --- 2. PROCESAR CADA REGIMIENTO Y APLICAR BONIFICACIONES ---
    for (const reg of regimentsArray) {
        const baseRegData = REGIMENT_TYPES[reg.type];
        if (!baseRegData) continue;

        let regAttack = baseRegData.attack || 0;
        let regDefense = baseRegData.defense || 0;
        let regHealth = baseRegData.health || 0;
        let regMovement = baseRegData.movement || 0;
        
        // --- 2.1. Aplicar Bonus de Civilización (si existen) ---
        const civUnitBonus = civBonuses.unitTypeBonus?.[reg.type] || {};
        if(civUnitBonus.attackBonus) regAttack += civUnitBonus.attackBonus;
        if(civUnitBonus.defenseBonus) regDefense += civUnitBonus.defenseBonus;
        if(civUnitBonus.movementBonus) regMovement += civUnitBonus.movementBonus;
        
        // --- 2.2. APLICAR BONUS DE HABILIDADES PASIVAS DEL GENERAL ---
        if (commanderData && heroInstance) {
            commanderData.passiveSkills.forEach((skill, index) => {
                const skillKey = `passive${index + 1}`;
                const skillLevel = heroInstance.skill_levels[skillKey] || 0;
                const isUnlocked = heroInstance.stars >= index + 2;

                if (skillLevel > 0 && isUnlocked && skill.skill_id && SKILL_DEFINITIONS[skill.skill_id]) {
                    const definition = SKILL_DEFINITIONS[skill.skill_id];
                    
                    if (definition.effect_type === 'stat_modifier') {
                        // Comprobar si los filtros de la habilidad se aplican a este regimiento
                        const categoryMatch = !definition.filters.unit_category || definition.filters.unit_category.includes(baseRegData.category);
                        const typeMatch = !definition.filters.unit_type || definition.filters.unit_type === reg.type;
                        
                        if (categoryMatch && typeMatch) {
                            const scaling = skill.scaling_override || definition.default_scaling;
                            const bonusValue = scaling[skillLevel - 1];

                            if (definition.is_percentage) {
                                if(definition.stat_modified === 'attack') regAttack *= (1 + bonusValue / 100);
                                if(definition.stat_modified === 'defense') regDefense *= (1 + bonusValue / 100);
                                if(definition.stat_modified === 'health') regHealth *= (1 + bonusValue / 100);
                            } else {
                                if(definition.stat_modified === 'movement') regMovement += bonusValue;
                                // Añadir más stats planos si es necesario
                            }
                        }
                    }
                    // Aquí podrías añadir un 'else' para manejar habilidades personalizadas que no están en el registro
                }
            });
        }
        
        // --- 3. Sumar los stats MEJORADOS del regimiento al total de la división ---
        finalStats.attack += regAttack;
        finalStats.defense += regDefense;
        finalStats.maxHealth += regHealth;
        finalStats.movement = Math.min(finalStats.movement, regMovement);
        finalStats.visionRange = Math.max(finalStats.visionRange, baseRegData.visionRange || 0);
        finalStats.attackRange = Math.max(finalStats.attackRange, baseRegData.attackRange || 1);
        finalStats.initiative = Math.max(finalStats.initiative, baseRegData.initiative || 0);
        finalStats.is_naval = finalStats.is_naval || baseRegData.is_naval;
        
        if (finalStats.sprite === '❓') finalStats.sprite = baseRegData.sprite || '❓';
    }
    
    // --- 4. REDONDEO FINAL ---
    finalStats.attack = Math.round(finalStats.attack);
    finalStats.defense = Math.round(finalStats.defense);
    finalStats.maxHealth = Math.round(finalStats.maxHealth);
    finalStats.movement = (finalStats.movement === Infinity) ? 0 : finalStats.movement;

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
    // Si realmente hay una acción preparada (y no está en mitad de la ejecución), la cancelamos.
    if (gameState.preparingAction) {
        console.log("[Acción Cancelada] Limpiando estado 'preparingAction'.");
        gameState.preparingAction = null;
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) {
            UIManager.clearHighlights();
        }
    }
}

function handleActionWithSelectedUnit(r_target, c_target, clickedUnitOnTargetHex) {
    // Log de Entrada (se mantiene sin cambios)
    console.log(`--- DENTRO DE handleActionWithSelectedUnit ---`);
    console.log(`Objetivo del Clic: ${clickedUnitOnTargetHex ? clickedUnitOnTargetHex.name : 'Casilla Vacía'} en (${r_target},${c_target})`);

    if (!selectedUnit) {
        console.error("[handleAction] ERROR FATAL: Se llamó a la función pero 'selectedUnit' es nulo.");
        return false;
    }

    // --- MANEJO DE ACCIÓN PREPARADA (AQUÍ ESTÁ LA CORRECCIÓN) ---
    if (gameState.preparingAction && gameState.preparingAction.unitId === selectedUnit.id) {
        console.log(`[handleAction] Detectada acción preparada: ${gameState.preparingAction.type}`);
        
        if (gameState.preparingAction.type === 'split_unit') {
            // La función splitUnit devuelve true si la división fue exitosa
            if (splitUnit(selectedUnit, r_target, c_target)) {
                success = true;
                console.log("[handleAction] División exitosa. Finalizando y limpiando acción preparada.");
                
                // <<== ¡SOLUCIÓN APLICADA AQUÍ! ==>>
                // Si la división tiene éxito, limpiamos el estado de la acción para evitar clics múltiples.
                cancelPreparingAction();
                return true; // La acción se completó con éxito
            }
        }
        
        // Si la acción preparada no se pudo completar (p.ej. clic en casilla inválida),
        // devolvemos false, pero NO limpiamos la acción, permitiendo al jugador intentarlo de nuevo en otra casilla.
        return false;
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
         // Ahora decidimos qué función llamar basándonos en si es una partida en red o no.   
            if (isNetworkGame()) {
                console.log(`[handleAction] ¡MOVIMIENTO VÁLIDO (RED)! Iniciando RequestMoveUnit...`);
                RequestMoveUnit(selectedUnit, r_target, c_target);
            } else {
                console.log(`[handleAction] ¡MOVIMIENTO VÁLIDO (LOCAL)! Iniciando moveUnit...`);
                _executeMoveUnit(selectedUnit, r_target, c_target);
            }
            return true;
        }
    }
    
    // Si ninguna de las condiciones anteriores se cumplió, entonces sí, ninguna acción fue posible.
    console.log(`[handleAction] Ninguna acción válida se pudo iniciar. Devolviendo 'false'.`);
    return false;
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
    if (gameState.currentPhase === 'play' && unit.hasMoved) return false;
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

        // Se detecta si la unidad que se mueve tiene la habilidad.
        const hasJumpAbility = unit.regiments.some(reg => 
            REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump")
        );

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
                let canPassThrough = false;

                // CASO 1: Movimiento a un hexágono vacío.
                if (!unitAtNeighbor) {
                    // Si la casilla está vacía, se verifican las reglas normales de terreno.
                    if (unitRegimentData.is_naval) {
                        canPassThrough = neighborHexData.terrain === 'water';
                    } else {
                        const unitCategory = unitRegimentData.category;
                        const isImpassable = (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land.includes(neighborHexData.terrain)) ||
                                            (IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[unitCategory] || []).includes(neighborHexData.terrain);
                        canPassThrough = !isImpassable;
                    }
                } 
                // Si la casilla está ocupada, se comprueba si es un aliado y si tenemos "Jump".
                else if (unitAtNeighbor.player === unit.player && hasJumpAbility) {
                    canPassThrough = true; // Se puede pasar, pero no terminar el movimiento.
                }
                else if (isPotentialMerge && neighbor.r === r_target && neighbor.c === c_target) {
                    // Solo permitimos entrar si el vecino es el hexágono exacto de nuestro objetivo de fusión.
                    canPassThrough = true;
                }
                
                // Un movimiento NUNCA puede terminar en una casilla ocupada, aunque se pueda pasar por ella.
                if (isPotentialMerge === false && neighbor.r === r_target && neighbor.c === c_target && unitAtNeighbor) {
                    canPassThrough = false;
                }

                if (canPassThrough) { 
                    let moveCost = 1.0; 

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

                    // La validación de coste ahora debe usar el movimiento TOTAL, no el actual, para el pathfinding.
                    if ((!visited.has(neighborKey) || newCost < visited.get(neighborKey)) && newCost <= (unit.movement || 0) * 2 ) { 
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

            if (typeof Chronicle !== 'undefined') {
                Chronicle.logEvent('conquest', { unit: unit, toR: toR, toC: toC });
            }
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
    if (!unit || !unit.element || !(unit.element instanceof HTMLElement)) {
        console.error("[positionUnitElement] Error: Unidad o elemento DOM no válido.", unit);
        return;
    }

    // Usamos setTimeout con un retardo de 0. Esto empuja la ejecución de este bloque
    // al final de la cola de eventos actual del navegador, dándole tiempo a renderizar el
    // elemento que acabamos de añadir al DOM en 'placeFinalizedDivision'.
    setTimeout(() => {
        // Ponemos toda la lógica de posicionamiento DENTRO del setTimeout.
        // Nos aseguramos de tener una referencia fresca al elemento, por si acaso.
        const elementToPosition = unit.element; 
        if (!elementToPosition) return;

        // Comprobación de constantes (sin cambios)
        if (typeof HEX_WIDTH === 'undefined') {
            elementToPosition.style.left = (unit.c * 60) + 'px';
            elementToPosition.style.top = (unit.r * 70) + 'px';
            elementToPosition.style.display = 'flex';
            return;
        }

        // Cálculo de posición (sin cambios)
        const unitWidth = elementToPosition.offsetWidth || 36;
        const unitHeight = elementToPosition.offsetHeight || 36;
        const xPos = unit.c * HEX_WIDTH + (unit.r % 2 !== 0 ? HEX_WIDTH / 2 : 0) + (HEX_WIDTH - unitWidth) / 2;
        const yPos = unit.r * HEX_VERT_SPACING + (HEX_HEIGHT - unitHeight) / 2;

        if (isNaN(xPos) || isNaN(yPos)) {
            console.error(`[positionUnitElement async] xPos o yPos es NaN para ${unit.name}.`);
            return;
        }

        // Aplicación de estilos (sin cambios)
        elementToPosition.style.left = `${xPos}px`;
        elementToPosition.style.top = `${yPos}px`;
        elementToPosition.style.display = 'flex';
        
        //console.log(`[positionUnitElement async] Unidad "${unit.name}" (ID: ${unit.id}) posicionada VISUALMENTE en (${xPos.toFixed(0)}, ${yPos.toFixed(0)}).`);

    }, 0); // El retardo de 0 es la clave.
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
    //console.log(`[Chequeo de Ataque]: ${attackerName} ${attackerPosition} vs ${defenderName} ${defenderPosition}. Distancia: ${distance}, Rango de Ataque: ${range}. ¿Válido?: ${canAttack}`);
    
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
    // <<== NUEVA LLAMADA AL CRONISTA ==>>
    if (typeof Chronicle !== 'undefined') {
        Chronicle.logEvent('battle_start', { attacker: attackerDivision, defender: defenderDivision });
    }
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
        console.groupEnd();

        // === FASE DE RESOLUCIÓN FINAL (RESTAURADA Y MEJORADA) =====
        
        console.group("--- RESULTADOS DEL COMBATE ---");
        
        recalculateUnitHealth(attackerDivision);
        recalculateUnitHealth(defenderDivision);

        const finalHealthAttacker = attackerDivision.currentHealth;
        const finalHealthDefender = defenderDivision.currentHealth;

        // 1. Calcular daño y eficiencia (TU LÓGICA ORIGINAL RESTAURADA)
        const damageDealtByAttacker = initialHealthDefender - finalHealthDefender;
        const damageDealtByDefender = initialHealthAttacker - finalHealthAttacker;
        const attackerEfficiency = damageDealtByAttacker / (damageDealtByDefender || 1);
        const defenderEfficiency = damageDealtByDefender / (damageDealtByAttacker || 1);

        // 2. Calcular XP base por participar en el combate
        let attackerXP = 5 + Math.round(attackerEfficiency * 10);
        let defenderXP = 5 + Math.round(defenderEfficiency * 10);
        
        // 3. Comprobar destrucciones
        const attackerDestroyed = finalHealthAttacker <= 0;
        const defenderDestroyed = finalHealthDefender <= 0;

        // 4. Aplicar resultados
        if (defenderDestroyed) {
            // Se pasa el atacante original como vencedor
            handleUnitDestroyed(defenderDivision, attackerDivision);
        }
        if (attackerDestroyed) {
            // Se pasa el defensor original como vencedor
            handleUnitDestroyed(attackerDivision, defenderDivision);
        }

        // 5. Asignar experiencia de combate a los SUPERVIVIENTES (TU LÓGICA RESTAURADA)
        if (!attackerDestroyed) {
            logMessage(`${attackerDivision.name} gana ${attackerXP} XP por su eficiencia.`);
            attackerDivision.experience = (attackerDivision.experience || 0) + attackerXP;
            checkAndApplyLevelUp(attackerDivision);
            
            // Si además ganó (destruyó al defensor), recibe el bonus de moral.
            // Esto ahora está dentro de handleUnitDestroyed, pero lo dejamos por si acaso no gana.
            if(defenderDestroyed){
                const moraleGain = 15;
                attackerDivision.morale = Math.min(attackerDivision.maxMorale, (attackerDivision.morale || 50) + moraleGain);
            }
        }
        
        if (!defenderDestroyed) {
            logMessage(`${defenderDivision.name} gana ${defenderXP} XP por su resistencia.`);
            defenderDivision.experience = (defenderDivision.experience || 0) + defenderXP;
            checkAndApplyLevelUp(defenderDivision);
        }

        // 6. Marcar acción del atacante
        if (attackerDivision.currentHealth > 0) {
            // Marcar la unidad SOLO como que ha atacado.
           // attackerDivision.hasMoved = true;
            attackerDivision.hasAttacked = true;
        }

        console.groupEnd();
        if (UIManager) {
            UIManager.updateAllUIDisplays();
            // Refrescar el panel si la unidad que atacó es la seleccionada
            if(selectedUnit && selectedUnit.id === attackerDivision.id){
                UIManager.showUnitContextualInfo(selectedUnit, true);
                UIManager.highlightPossibleActions(selectedUnit); // Esto mostrará los hex de movimiento disponibles!
            }
        }
        if(typeof checkVictory === 'function') checkVictory();
        
    } catch (error) {
        console.error(`ERROR CATASTRÓFICO DENTRO DE attackUnit:`, error);
        logMessage("Error crítico durante el combate.", "error");
        if (attackerDivision?.currentHealth > 0) {
           // attackerDivision.hasMoved = true;
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
    if (!attackerRegiment || !targetRegiment || !attackerDivision || !targetDivision) return 0;
    const attackerData = REGIMENT_TYPES[attackerRegiment.type];
    const targetData = REGIMENT_TYPES[targetRegiment.type];
    if (!attackerData || !targetData) return 0;

    
    const getUnitLogInfo = (division) => {
        const civName = CIVILIZATIONS[gameState.playerCivilizations?.[division.player] || 'ninguna']?.name || "Sin Civ.";
        const commanderName = division.commander ? COMMANDERS[division.commander]?.name : null;
        let info = `Jugador ${division.player} - ${civName}`;
        if (commanderName) info += ` (${commanderName})`;
        return info;
    };
    
    console.groupCollapsed(`Duelo: [${attackerRegiment.logId}] vs [${targetRegiment.logId}]`);

    // --- 1. CÁLCULO DE ATAQUE EFECTIVO DEL REGIMIENTO ATACANTE ---
    console.log(`  [ATACANTE: ${getUnitLogInfo(attackerDivision)} - ${attackerRegiment.type}]`);
    
    // El "ataque del regimiento" es su parte proporcional del ataque total de la división.
    let effectiveAttack = (attackerDivision.attack / attackerDivision.regiments.length) * (attackerRegiment.health / attackerData.health);
    console.log(`  - Ataque Base (proporcional y por salud): ${effectiveAttack.toFixed(1)}`);
    
    // Aquí podrías añadir bonus que afecten al duelo individual, si los hubiera en el futuro
    
    console.log(`  => ATAQUE FINAL DEL REGIMIENTO: ${effectiveAttack.toFixed(1)}`);

    // --- 2. CÁLCULO DE DEFENSA EFECTIVA DEL REGIMIENTO OBJETIVO ---
    console.log(`  [DEFENSOR: ${getUnitLogInfo(targetDivision)} - ${targetRegiment.type}]`);

    // La "defensa del regimiento" es su parte proporcional de la defensa total.
    let effectiveDefense = (targetDivision.defense / targetDivision.regiments.length);
    console.log(`  - Defensa Base (proporcional): ${effectiveDefense.toFixed(1)}`);

    // Modificador por Terreno (Afecta a toda la división, pero lo aplicamos aquí)
    const targetHex = board[targetDivision.r]?.[targetDivision.c];
    if (targetHex && TERRAIN_TYPES[targetHex.terrain]?.defenseBonus) { // Nota: en constants es 'defenseBonus'
        const terrainBonus = TERRAIN_TYPES[targetHex.terrain].defenseBonus;
        effectiveDefense *= terrainBonus;
        console.log(`  - Mod. por Terreno (${TERRAIN_TYPES[targetHex.terrain].name}): *${terrainBonus} -> ${effectiveDefense.toFixed(1)}`);
    }

    // Modificador por Flanqueo
    if (targetDivision.isFlanked) {
        effectiveDefense *= 0.75;
        console.log(`  - Mod. por Flanqueo: *0.75 -> ${effectiveDefense.toFixed(1)}`);
    }
    
    // Modificador por Desgaste (Cada golpe reduce la defensa del regimiento objetivo)
    if (targetRegiment.hitsTakenThisRound === undefined) targetRegiment.hitsTakenThisRound = 0;
    const defenseMultiplier = Math.max(0.25, 1 - (0.20 * targetRegiment.hitsTakenThisRound));
    effectiveDefense *= defenseMultiplier;
    console.log(`  - Mod. por Desgaste (${targetRegiment.hitsTakenThisRound} golpes): *${defenseMultiplier.toFixed(2)} -> ${effectiveDefense.toFixed(1)}`);

    console.log(`  => DEFENSA FINAL DEL REGIMIENTO: ${effectiveDefense.toFixed(1)}`);

    // --- 3. CÁLCULO DE DAÑO FINAL ---
    let damageDealt = Math.round(effectiveAttack - effectiveDefense);
    if (damageDealt < 1 && effectiveAttack > 0) damageDealt = 1;
    if (damageDealt < 0) damageDealt = 0;
    
    console.log(`%c  DAÑO CALCULADO: ${damageDealt}`, 'font-weight:bold;');

    // --- 4. APLICACIÓN DE DAÑO ---
    const actualDamage = Math.min(targetRegiment.health, damageDealt);
    targetRegiment.health -= actualDamage;
    targetRegiment.hitsTakenThisRound++;
    
    console.log(`%c  >> DAÑO REAL APLICADO: ${actualDamage}. Salud restante del regimiento: ${targetRegiment.health}`, 'color:red; font-weight:bold;');
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
    let defenderDefenseStat = (defender.defense || 0) * (defender.currentHealth / defender.maxHealth);
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
    let effectiveAttackerAttack = attackerAttackStat * (attacker.currentHealth / attacker.maxHealth);
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
            let defenderAttackStat = (defender.attack || 0) * (defender.currentHealth / defender.maxHealth);
            let attackerDefenseStat = (attacker.defense || 0) * (attacker.currentHealth / attacker.maxHealth);
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

        if (typeof Chronicle !== 'undefined') {
            Chronicle.logEvent('unit_destroyed', { destroyedUnit, victorUnit });
        }

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
        
        if (PlayerDataManager.currentPlayer) { // Asegurarse de que hay un jugador logueado
            const playerCurrencies = PlayerDataManager.currentPlayer.currencies;
            const playerInventory = PlayerDataManager.currentPlayer.inventory;

        // Recompensa garantizada de 1 Libro de XP por victoria
            playerInventory.xp_books = (playerInventory.xp_books || 0) + 1;
            console.log("Recompensa: +1 Libro de XP");
            if(UIManager.showRewardToast) UIManager.showRewardToast("+1 Libro de XP", "📖");

            // Probabilidad de obtener fragmentos de un Héroe (Común o Raro)
            if (Math.random() < 0.20) { // 20% de probabilidad
                const rewardPool = Object.keys(COMMANDERS).filter(id => 
                    COMMANDERS[id].rarity === "Común" || COMMANDERS[id].rarity === "Raro"
                );
                if(rewardPool.length > 0) {
                    const randomHeroId = rewardPool[Math.floor(Math.random() * rewardPool.length)];
                    const fragmentsToAdd = Math.floor(Math.random() * 3) + 1; // Entre 1 y 3 fragmentos
                    
                    PlayerDataManager.addFragmentsToHero(randomHeroId, fragmentsToAdd);
                    
                    const heroData = COMMANDERS[randomHeroId];
                    if(UIManager.showRewardToast) UIManager.showRewardToast(`+${fragmentsToAdd} Fragmentos de ${heroData.name}`, heroData.sprite);
                }
            }
            
            PlayerDataManager.saveCurrentPlayer(); // Guardar las nuevas recompensas
        }

        const victoryMoraleBonus = 20;
        victorUnit.morale = Math.min((victorUnit.maxMorale || 100), (victorUnit.morale || 50) + victoryMoraleBonus);
        logMessage(`¡La moral de ${victorUnit.name} sube a ${victorUnit.morale} por la victoria decisiva!`);

        // === FASE B: Añadimos la lógica del objeto de bonificación ======
        
        const hexOfUnit = board[destroyedUnit.r]?.[destroyedUnit.c];
        if (hexOfUnit) {
            hexOfUnit.destroyedUnitBonus = {
                experience: 10, // Cantidad de XP que dará
                morale: 15,   // Cantidad de moral que dará
                claimedBy: null // Para evitar que se reclame varias veces
            };
            console.log(`[Recompensa] Dejado un objeto de bonificación en (${destroyedUnit.r}, ${destroyedUnit.c})`);
            
            // Re-renderizamos el hex para que visualmente muestre la recompensa
            renderSingleHexVisuals(destroyedUnit.r, destroyedUnit.c); 
        }
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
    
    // --- Proceso de eliminación de la unidad ---
    if (destroyedUnit.element) {
        destroyedUnit.element.remove();
    }
    const hexOfUnit = board[destroyedUnit.r]?.[destroyedUnit.c];
    if (hexOfUnit && hexOfUnit.unit?.id === destroyedUnit.id) {
        hexOfUnit.unit = null;
    }
    const index = units.findIndex(u => u.id === destroyedUnit.id);
    if (index > -1) units.splice(index, 1);
    if (selectedUnit?.id === destroyedUnit.id) {
        selectedUnit = null;
        if (UIManager) UIManager.hideContextualPanel();
    }
    if (isCombatDestruction) {
        if (typeof checkVictory === 'function') checkVictory();
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
    if (!unit) return;
    // <<== Pasamos el 'unit.commander' a la función de cálculo ==>>
    const baseStats = calculateRegimentStats(unit.regiments, unit.player, unit.commander);
    const levelBonuses = XP_LEVELS[unit.level || 0];

    unit.attack = baseStats.attack + (levelBonuses.attackBonus || 0);
    unit.defense = baseStats.defense + (levelBonuses.defenseBonus || 0);
    
    // Otros stats no suelen cambiar con el nivel, los mantenemos de la base.
    unit.maxHealth = baseStats.maxHealth;
    unit.movement = baseStats.movement;
    unit.visionRange = baseStats.visionRange;
    unit.attackRange = baseStats.attackRange;

    // Actualizamos la disciplina
    unit.discipline = calculateDivisionDiscipline(unit);

    console.log(`Stats recalculados para ${unit.name} (Nivel ${unit.level}): Atk=${unit.attack}, Def=${unit.defense}`);
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
//== NUEVAS FUNCIONES DE RED ==
//==============================================================

// --- FUNCIONES DE ACC IÓN CON LÓGICA DE RED CORREGIDA ---

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
async function _executeMoveUnit(unit, toR, toC, isMergeMove = false) {
    console.log(`[MOVIMIENTO] Ejecutando _executeMoveUnit para ${unit.name} a (${toR},${toC}). Es fusión: ${isMergeMove}`);
    
    // Validar si el hexágono de destino está ocupado y si NO es una fusión
    const targetUnitOnHex = getUnitOnHex(toR, toC);
    if (targetUnitOnHex && !isMergeMove) {
        console.warn(`[MOVIMIENTO BLOQUEADO] Intento de mover ${unit.name} a una casilla ocupada por ${targetUnitOnHex.name} sin ser una fusión.`);
        return;
    }

    const fromR = unit.r;
    const fromC = unit.c;
    const targetHexData = board[toR]?.[toC];
    
    // --- Lógica de `lastMove` y coste (sin cambios) ---
    if (unit.player === gameState.myPlayerNumber || !isNetworkGame()) {
        unit.lastMove = {
            fromR: fromR, fromC: fromC,
            initialCurrentMovement: unit.currentMovement,
            initialHasMoved: unit.hasMoved,
            initialHasAttacked: unit.hasAttacked,
            movedToHexOriginalOwner: targetHexData ? targetHexData.owner : null
        };
    }
    const costOfThisMove = getMovementCost(unit, fromR, fromC, toR, toC, isMergeMove);
    if (costOfThisMove === Infinity && !isMergeMove) return;

    // --- Lógica de movimiento y captura (sin cambios) ---
    if (board[fromR]?.[fromC]) { board[fromR][fromC].unit = null; renderSingleHexVisuals(fromR, fromC); }
    unit.r = toR; unit.c = toC;
    unit.currentMovement -= costOfThisMove; unit.hasMoved = true;
    if (targetHexData) {
        targetHexData.unit = unit;
        if (targetHexData.owner === null) {
            const movingPlayer = unit.player;
            targetHexData.owner = movingPlayer;
            targetHexData.estabilidad = 1;
            targetHexData.nacionalidad = { 1: 0, 2: 0 };
            targetHexData.nacionalidad[movingPlayer] = 1;
            const city = gameState.cities.find(ci => ci.r === toR && ci.c === toC);
            if (city?.owner === null) { city.owner = movingPlayer; }
            renderSingleHexVisuals(toR, toC);
        }
    } else {
        console.error(`[_executeMoveUnit] Error crítico: Hex destino (${toR},${toC}) no encontrado.`);
        unit.r = fromR; unit.c = fromC; unit.currentMovement += costOfThisMove; unit.hasMoved = false;
        if (board[fromR]?.[fromC]) board[fromR][fromC].unit = unit;
        renderSingleHexVisuals(fromR, fromC);
        return;
    }

    // <<==LLAMADA AL CRONISTA ==>>
    if (typeof Chronicle !== 'undefined') {
        Chronicle.logEvent('move', { unit: unit, toR: toR, toC: toC });
    }

    // --- Lógica de consumir bonificación (sin cambios) ---
    if (targetHexData.destroyedUnitBonus && targetHexData.destroyedUnitBonus.claimedBy === null) {
        const bonus = targetHexData.destroyedUnitBonus;
        unit.experience = (unit.experience || 0) + bonus.experience;
        unit.morale = Math.min(unit.maxMorale || 125, (unit.morale || 50) + bonus.morale);
        logMessage(`¡${unit.name} reclama los restos, ganando ${bonus.experience} XP y ${bonus.morale} de moral!`);
        delete targetHexData.destroyedUnitBonus;
        renderSingleHexVisuals(toR, toC);
        checkAndApplyLevelUp(unit);
        if(selectedUnit?.id === unit.id) { UIManager.showUnitContextualInfo(unit, true); }
    }
    
    // --- Lógica de actualización de UI (sin cambios) ---
    logMessage(`${unit.name} movida. Mov. restante: ${unit.currentMovement}.`);
    positionUnitElement(unit);
    if (UIManager) { UIManager.updateSelectedUnitInfoPanel(); UIManager.updatePlayerAndPhaseInfo(); }
    if (gameState.currentPhase === 'play' && typeof checkVictory === "function") { if (checkVictory()) return; }
    if (selectedUnit?.id === unit.id) { UIManager.highlightPossibleActions(unit); }
}

function handleConfirmBuildStructure(actionData) {
    // Si la función se llama SIN datos (desde el botón del modal)
    // usa las variables globales como antes.
    console.log(`%c[handleConfirmBuildStructure] INICIO.`, "background: #222; color: #bada55");
    
    // Este booleano es crucial para distinguir entre una acción del jugador (a través del modal) y una acción de la IA.
    const isPlayerAction = !actionData;
    
    const r = isPlayerAction ? parseInt(domElements.buildStructureModal.dataset.r) : actionData.r;
    const c = isPlayerAction ? parseInt(domElements.buildStructureModal.dataset.c) : actionData.c;
    const structureType = isPlayerAction ? selectedStructureToBuild : actionData.structureType;

    const playerId = isPlayerAction ? gameState.currentPlayer : actionData.playerId;

    console.log(` -> Datos: Jugador=${playerId}, Estructura=${structureType}, Coords=(${r},${c})`);
    
    if (!structureType || typeof r === 'undefined') {
        console.error(`   -> DIAGNÓSTICO: FALLO. Datos de construcción inválidos. Saliendo.`);
        return;
    }

    const data = STRUCTURE_TYPES[structureType];
    const playerRes = gameState.playerResources[playerId];
    console.log(`   -> Recursos del Jugador ${playerId} ANTES:`, JSON.parse(JSON.stringify(playerRes)));

    // Validación de costes
    console.log("   -> Fase: Validando costes...");
    for (const res in data.cost) {
        if ((playerRes[res] || 0) < data.cost[res]) {
            console.error(`      -> DIAGNÓSTICO: FALLO. No hay suficientes ${res}. Necesita ${data.cost[res]}, tiene ${playerRes[res] || 0}.`);
            if (isPlayerAction) logMessage(`Error: No tienes suficientes ${res}.`);
            return; // Detiene si no se puede pagar
        }
    }

    // Deducir costes
    for (const res in data.cost) {
        playerRes[res] -= data.cost[res];
    }
     // Consumir la unidad de colono
    if (data.cost['Colono']) {
        const unitOnHex = getUnitOnHex(r,c);
        if (unitOnHex && unitOnHex.isSettler) {
            handleUnitDestroyed(unitOnHex, null);
            logMessage("¡El Colono ha establecido una nueva Aldea!");
        }
    }

    // Construir la estructura lógicamente
    board[r][c].structure = structureType;
    logMessage(`${data.name} construido en (${r},${c}) para el Jugador ${playerId}.`);

    // El redibujado
    console.log("   -> Fase: Solicitando redibujado visual de la casilla...");
    if (typeof renderSingleHexVisuals === 'function') {
    renderSingleHexVisuals(r, c);
        console.log(`      -> OK: Llamada a renderSingleHexVisuals(${r}, ${c}) completada.`);
    } else {
        console.error("   -> DIAGNÓSTICO: FALLO. La función renderSingleHexVisuals no existe.");
    }
    
    // Actualización de UI
    console.log("   -> Fase: Actualizando UI global...");
    if (isPlayerAction) {
        // Si la acción fue de un jugador humano, actualizamos y cerramos sus ventanas.
        if(UIManager) {
            UIManager.updatePlayerAndPhaseInfo();
            UIManager.hideContextualPanel();
        }
        if(domElements.buildStructureModal) {
            domElements.buildStructureModal.style.display = 'none';
        }
    } else {
        // Si la acción fue de la IA, solo actualizamos la información de recursos.
        if (UIManager && UIManager.updatePlayerAndPhaseInfo) {
            UIManager.updatePlayerAndPhaseInfo();
        }
    }
}

/**
 * Reorganiza los regimientos dentro de una división para consolidar las bajas.
 * Agrupa los regimientos por tipo, suma su salud y crea nuevos regimientos a partir del total.
 * Esta acción consume el turno de la unidad.
 * @param {object} unit - La división que se va a reorganizar.
 */
function consolidateRegiments(unit) {
    if (!unit || unit.hasMoved || unit.hasAttacked) {
        logMessage("La unidad no puede reorganizarse porque ya ha actuado.", "warning");
        return;
    }

    if (!confirm(`¿Reorganizar la división "${unit.name}"? Esto consolidará los regimientos dañados y consumirá el turno de la unidad.`)) {
        logMessage("Reorganización cancelada.");
        return;
    }

    const newRegimentsList = [];
    const regimentsByType = new Map();

    // 1. Agrupar todos los regimientos por su tipo
    for (const reg of unit.regiments) {
        if (!regimentsByType.has(reg.type)) {
            regimentsByType.set(reg.type, []);
        }
        regimentsByType.get(reg.type).push(reg);
    }

    let consolidationHappened = false;

    // 2. Procesar cada grupo de regimientos
    for (const [type, regGroup] of regimentsByType.entries()) {
        const regData = REGIMENT_TYPES[type];
        const maxHealthPerReg = regData.health;

        // Si solo hay un regimiento de este tipo o ninguno está dañado, no hacemos nada.
        if (regGroup.length <= 1 && regGroup[0].health === maxHealthPerReg) {
            newRegimentsList.push(...regGroup);
            continue;
        }

        // Calcular la salud total del grupo
        const totalHealth = regGroup.reduce((sum, reg) => sum + reg.health, 0);

        if (totalHealth > 0) {
            consolidationHappened = true;
            const newFullRegimentsCount = Math.floor(totalHealth / maxHealthPerReg);
            const remainingHealth = totalHealth % maxHealthPerReg;

            // Añadir los nuevos regimientos a plena salud
            for (let i = 0; i < newFullRegimentsCount; i++) {
                const newFullReg = JSON.parse(JSON.stringify(regData));
                newFullReg.type = type;
                newFullReg.health = maxHealthPerReg;
                newFullReg.id = `r${Date.now()}${i}`;
                newRegimentsList.push(newFullReg);
            }

            // Añadir el regimiento final con la salud sobrante
            if (remainingHealth > 0) {
                const newDamagedReg = JSON.parse(JSON.stringify(regData));
                newDamagedReg.type = type;
                newDamagedReg.health = remainingHealth;
                newDamagedReg.id = `r${Date.now()}rem`;
                newRegimentsList.push(newDamagedReg);
            }
        }
    }

    if (!consolidationHappened) {
        logMessage("No hay regimientos que necesiten consolidación en esta división.");
        return;
    }

    // 3. Actualizar la división con la nueva lista de regimientos
    unit.regiments = newRegimentsList;
    
    // 4. Recalcular todos los stats y consumir el turno
    recalculateUnitStats(unit);
    unit.currentHealth = newRegimentsList.reduce((sum, reg) => sum + reg.health, 0);
    unit.hasMoved = true;
    unit.hasAttacked = true;

    // 5. Feedback al jugador y actualización de la UI
    Chronicle.logEvent('consolidate', { unit }); // (Opcional, si quieres añadirlo a la Crónica)
    logMessage(`La división "${unit.name}" ha reorganizado sus fuerzas.`, "success");
    UIManager.updateUnitStrengthDisplay(unit);
    UIManager.showUnitContextualInfo(unit, true);
    UIManager.clearHighlights();
}

/**
 * Encuentra la ruta óptima desde un punto de inicio a un destino usando el algoritmo A*.
 * Esta función es "inteligente": puede rodear obstáculos y considera el coste del terreno.
 * @param {object} unit - La unidad que se mueve (real o "fantasma").
 * @param {object} startCoords - Las coordenadas de inicio {r, c}.
 * @param {object} targetCoords - Las coordenadas de destino {r, c}.
 * @returns {Array|null} - Un array de coordenadas de la ruta, o null si no se encontró.
 */
function findPath_A_Star(unit, startCoords, targetCoords) {
    if (!unit || !startCoords || !targetCoords) return null;

    const hasJumpAbility = unit.regiments.some(reg => 
        REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump")
    );

    let openSet = [ { ...startCoords, g: 0, h: hexDistance(startCoords.r, startCoords.c, targetCoords.r, targetCoords.c), f: 0, path: [startCoords] } ];
    openSet[0].f = openSet[0].h;
    
    let visited = new Set([`${startCoords.r},${startCoords.c}`]);

    while (openSet.length > 0) {
        // Encontrar el nodo en openSet con el menor fScore
        openSet.sort((a, b) => a.f - b.f);
        let current = openSet.shift();

        if (current.r === targetCoords.r && current.c === targetCoords.c) {
            return current.path; // RUTA ENCONTRADA
        }

        for (const neighbor of getHexNeighbors(current.r, current.c)) {
            const key = `${neighbor.r},${neighbor.c}`;
            if (visited.has(key)) continue;

            const hex = board[neighbor.r]?.[neighbor.c];
            if (!hex || TERRAIN_TYPES[hex.terrain].isImpassableForLand) continue;
            
            const unitOnNeighbor = hex.unit;
            let canPassThrough = false;
            
            if (!unitOnNeighbor) { canPassThrough = true; } 
            else if (unitOnNeighbor.player === unit.player && hasJumpAbility) { canPassThrough = true; }
            
            // Un movimiento NUNCA puede terminar en una casilla ocupada
            if (neighbor.r === targetCoords.r && neighbor.c === targetCoords.c && unitOnNeighbor) {
                canPassThrough = false;
            }

            if (canPassThrough) {
                visited.add(key);
                const moveCost = TERRAIN_TYPES[hex.terrain]?.movementCostMultiplier || 1;
                const g = current.g + moveCost;
                const h = hexDistance(neighbor.r, neighbor.c, targetCoords.r, targetCoords.c);
                const f = g + h;
                const newPath = [...current.path, neighbor];
                openSet.push({ ...neighbor, g, h, f, path: newPath });
            }
        }
    }
    
    return null; // RUTA NO ENCONTRADA
}

console.log("unit_Actions.js se ha cargado.");

