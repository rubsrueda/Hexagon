// gameFlow.js
// Lógica principal del flujo del juego: turnos, fases, IA, victoria, niebla de guerra, recolección de recursos.

let currentTutorialStepIndex = -1; // -1 significa que el tutorial no ha comenzado o ha terminado
let tutorialScenarioData = null; // Almacena los datos del escenario de tutorial activo
const MAX_STABILITY = 5; // Definimos la constante aquí para que la función la reconozca.
const MAX_NACIONALIDAD = 5; // Valor máximo para la lealtad de un hexágono.

function checkAndProcessBrokenUnit(unit) {
    if (!unit || unit.morale > 0) {
        return false;
    }

    logMessage(`¡${unit.name} tiene la moral rota y no puede ser controlada!`, "error");

    const originalUnit = units.find(u => u.id === unit.id);
    if (!originalUnit) return true; // La unidad ya no existe

    originalUnit.hasMoved = true;
    originalUnit.hasAttacked = true;

    const safeHavens = gameState.cities
        .filter(c => c.owner === originalUnit.player)
        .sort((a, b) => hexDistance(originalUnit.r, originalUnit.c, a.r, a.c) - hexDistance(originalUnit.r, originalUnit.c, b.r, b.c));
    
    const nearestSafeHaven = safeHavens.length > 0 ? safeHavens[0] : null;

    let retreatHex = null;
    if (nearestSafeHaven) {
        const neighbors = getHexNeighbors(originalUnit.r, originalUnit.c);
        let bestNeighbor = null;
        let minDistance = hexDistance(originalUnit.r, originalUnit.c, nearestSafeHaven.r, nearestSafeHaven.c);

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
        logMessage(`¡${originalUnit.name} huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
        moveUnit({ ...originalUnit, currentMovement: 1, hasMoved: false }, retreatHex.r, retreatHex.c);
    } else {
        logMessage(`¡${originalUnit.name} está rodeada y se rinde!`, "error");
        handleUnitDestroyed(originalUnit, null);
    }
    
    if (selectedUnit && selectedUnit.id === originalUnit.id) {
        deselectUnit();
        if (UIManager) UIManager.hideContextualPanel();
    }

    return true; 
}

function handleBrokenUnits(playerNum) {
    const unitsToCheck = [...units.filter(u => u.player === playerNum)];
    unitsToCheck.forEach(unit => checkAndProcessBrokenUnit(unit));
}

function handleUnitUpkeep(playerNum) {
    if (!gameState.playerResources?.[playerNum] || !units) return;

    const playerUnits = units.filter(u => u.player === playerNum && u.currentHealth > 0);
    if (playerUnits.length === 0) return;

    const playerRes = gameState.playerResources[playerNum];
    let totalGoldUpkeep = 0;
    
    playerUnits.forEach(unit => {
        // --- LÓGICA DE MORAL REGENERATIVA ---
        // 1. Asegurarse de que la moral existe
        if (typeof unit.morale === 'undefined') unit.morale = 50;
        if (typeof unit.maxMorale === 'undefined') unit.maxMorale = 100;

        // 2. Comprobar si está suministrada
        const isSupplied = isHexSupplied(unit.r, unit.c, unit.player);

        if (isSupplied) {
            // Si está suministrada, regenera moral pasivamente
            const moraleGain = 5; // Tu valor de regeneración
            unit.morale = Math.min(unit.maxMorale, unit.morale + moraleGain);
        } else {
            // Si no está suministrada, pierde moral
            const moraleLoss = 10; // Penalización por falta de suministro
            unit.morale = Math.max(0, unit.morale - moraleLoss);
            logMessage(`¡${unit.name} está sin suministros y pierde ${moraleLoss} de moral!`, 'warning');
        }

        // --- LÓGICA DE MANTENIMIENTO (ORO) ---
        (unit.regiments || []).forEach(regiment => {
            totalGoldUpkeep += REGIMENT_TYPES[regiment.type]?.cost?.upkeep || 0;
        });
    });

    // Pagar el mantenimiento de oro (afecta a la desmoralización)
    if (playerRes.oro < totalGoldUpkeep) {
        logMessage(`¡Jugador ${playerNum} no puede pagar el mantenimiento! ¡Las tropas se desmoralizan!`, "error");
        playerUnits.forEach(unit => {
            // <<== NUEVO: La penalización ahora depende del número de regimientos ==>>
            // Se calcula la pérdida de moral como -1 por cada regimiento en la división.
            const moralePenalty = (unit.regiments || []).length;
            unit.morale = Math.max(0, unit.morale - moralePenalty);
            logMessage(`  -> ${unit.name} pierde ${moralePenalty} de moral por el impago.`);
            // <<== FIN DE LA MODIFICACIÓN ==>>
            unit.isDemoralized = true;
        });
    } else {
        playerRes.oro -= totalGoldUpkeep;
        // Si pagan, se quita el estado desmoralizado
        playerUnits.forEach(unit => {
            if (unit.isDemoralized) {
                logMessage(`¡Las tropas de ${unit.name} reciben su paga y recuperan el ánimo!`);
                unit.isDemoralized = false;
            }
        });
    }
}

function handleBrokenUnits(playerNum) {
    // Obtenemos una copia del array para iterar de forma segura,
    // ya que handleUnitDestroyed puede modificar el array original 'units'.
    const unitsToCheck = [...units.filter(u => u.player === playerNum && u.morale <= 0 && u.currentHealth > 0)];

    if (unitsToCheck.length > 0) {
        logMessage(`¡Las tropas del Jugador ${playerNum} están desmoralizadas y huyen!`, "error");
    }

    unitsToCheck.forEach(unit => {
        // Encontramos la referencia a la unidad original en el array 'units' para poder modificarla
        const originalUnit = units.find(u => u.id === unit.id);
        if(!originalUnit) return;
        
        // Marcamos la unidad para que no pueda realizar otras acciones este turno
        originalUnit.hasMoved = true;
        originalUnit.hasAttacked = true;

        // Buscar el refugio más cercano (capital/ciudad propia)
        const safeHavens = gameState.cities
            .filter(c => c.owner === playerNum)
            .sort((a, b) => hexDistance(originalUnit.r, originalUnit.c, a.r, a.c) - hexDistance(originalUnit.r, originalUnit.c, b.r, b.c));
        
        const nearestSafeHaven = safeHavens.length > 0 ? safeHavens[0] : null;

        let retreatHex = null;
        if (nearestSafeHaven) {
            const neighbors = getHexNeighbors(originalUnit.r, originalUnit.c);
            let bestNeighbor = null;
            let minDistance = hexDistance(originalUnit.r, originalUnit.c, nearestSafeHaven.r, nearestSafeHaven.c);

            for (const n of neighbors) {
                // Solo puede huir a un hexágono vacío y transitable
                if (!getUnitOnHex(n.r, n.c) && !TERRAIN_TYPES[board[n.r]?.[n.c]?.terrain]?.isImpassableForLand) {
                    const dist = hexDistance(n.r, n.c, nearestSafeHaven.r, nearestSafeHaven.c);
                    // Importante: El movimiento debe acercarnos, no alejarnos
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestNeighbor = n;
                    }
                }
            }
            retreatHex = bestNeighbor;
        }

        if (retreatHex) {
            logMessage(`¡${originalUnit.name} rompe filas y huye hacia (${retreatHex.r}, ${retreatHex.c})!`);
            // moveUnit se encarga de la lógica de mover y actualizar el tablero.
            // Le pasamos un clon temporal con 1 de movimiento y hasMoved:false para que la función acepte el movimiento
            moveUnit({ ...originalUnit, currentMovement: 1, hasMoved: false }, retreatHex.r, retreatHex.c);
            
            // moveUnit ya debería haber actualizado la posición de la unidad en el array 'units'
            // si está bien implementado. No es necesario re-asignar aquí r y c.
        } else {
            logMessage(`¡${originalUnit.name} está rodeada y sin moral! ¡La unidad se rinde!`, "error");
            handleUnitDestroyed(originalUnit, null); // El atacante es nulo porque se rinde
        }
    });
}

function handleHealingPhase(playerNum) {
    console.group(`[DEBUG CURACIÓN- ANÁLISIS PROFUNDO] Iniciando Fase de Curación para Jugador ${playerNum}`);

    // >>>>> CORRECCIÓN: Eliminada la condición `!unit.hasMoved` <<<<<
    const divisionsWithHealers = units.filter(unit => 
        unit.player === playerNum && 
        unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.is_healer)
    );

    if (divisionsWithHealers.length === 0) {
        console.log("No se encontraron divisiones con Hospitales de Campaña.");
        console.groupEnd();
        return;
    }
    
    //console.log(`[DEBUG CURACIÓN] Se encontraron ${divisionsWithHealers.length} divisiones con sanadores.`);

    divisionsWithHealers.forEach(healerUnit => {
       console.log(`--- Analizando División: ${healerUnit.name} (HP Total: ${healerUnit.currentHealth}/${healerUnit.maxHealth}) ---`);
        console.log("Estado de sus regimientos ANTES de intentar curar:");

        healerUnit.regiments.forEach((reg, index) => {
            const regInfo = REGIMENT_TYPES[reg.type];
            console.log(`- Regimiento #${index}: ${reg.type} | Salud: ${reg.health} / ${regInfo.health} | ¿Dañado?: ${reg.health < regInfo.health}`);
        });

        const hospitalRegs = healerUnit.regiments.filter(r => REGIMENT_TYPES[r.type]?.is_healer);
        const hospitalCount = hospitalRegs.length;
        if (hospitalCount === 0) {
            console.groupEnd(); return;
        }

        const totalHealPower = hospitalRegs.reduce((sum, r) => sum + (REGIMENT_TYPES[r.type]?.heal_power || 0), 0);
        console.log(`- Contiene ${hospitalCount} hospital(es), poder de curación: ${totalHealPower}.`);
        
        const damagedRegiments = healerUnit.regiments.filter(reg => {
            const maxHealth = REGIMENT_TYPES[reg.type]?.health;
            return reg.health < maxHealth && !REGIMENT_TYPES[reg.type]?.is_healer;
        });

        if (damagedRegiments.length === 0) {
            console.log("- No se encontraron regimientos dañados en esta división.");
            console.groupEnd();
            return;
        }

        if (damagedRegiments.length > 0) {
            console.log(`%cÉXITO: Se encontraron ${damagedRegiments.length} regimientos dañados para curar.`, 'color: lightgreen;');
            // Aquí iría tu lógica de curación, que por ahora podemos omitir para centrarnos en el bug.
        } else {
            console.error(`%cFALLO: NO se encontraron regimientos dañados. La condición 'reg.health < maxHealth' falló para todos.`, 'color: red;');
        }

        console.log(`- Se encontraron ${damagedRegiments.length} regimientos dañados.`);

        const maxTargets = hospitalCount * 2;
        const targetsToHealCount = Math.min(damagedRegiments.length, maxTargets);
        console.log(`- Máximo objetivos: ${maxTargets}. Se curarán: ${targetsToHealCount}.`);
        
        damagedRegiments.sort((a,b) => (a.health / REGIMENT_TYPES[a.type].health) - (b.health / REGIMENT_TYPES[b.type].health));

        for (let i = 0; i < targetsToHealCount; i++) {
            const regimentToHeal = damagedRegiments[i];
            const maxHealth = REGIMENT_TYPES[regimentToHeal.type].health;
            const previousHealth = regimentToHeal.health;
            
            regimentToHeal.health = Math.min(maxHealth, regimentToHeal.health + totalHealPower);
            const healthRestored = regimentToHeal.health - previousHealth;

            if (healthRestored > 0) {
                console.log(`  - ¡ÉXITO! Curados ${healthRestored} HP a ${regimentToHeal.type}. Nueva salud: ${regimentToHeal.health}/${maxHealth}.`);
                logMessage(`${healerUnit.name} cura ${healthRestored} HP al regimiento de ${regimentToHeal.type}.`);
            }
        }
        
        recalculateUnitHealth(healerUnit);
        console.log(`- Salud total de ${healerUnit.name} actualizada a: ${healerUnit.currentHealth}.`);
        
        console.groupEnd();
    });

    console.groupEnd();
}

function collectPlayerResources(playerNum) {
    console.groupCollapsed(`[RECURSOS] Análisis Detallado de Recolección para Jugador ${playerNum}`);

    const playerRes = gameState.playerResources[playerNum];
    if (!playerRes) {
        console.warn(`[RECURSOS] No se encontraron datos de recursos para el jugador ${playerNum}.`);
        console.groupEnd();
        return;
    }

    const playerTechs = playerRes.researchedTechnologies || [];
    let totalIncome = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0, researchPoints: 0, puntosReclutamiento: 0 };
    let logItems = [];

    board.forEach(row => {
        row.forEach(hex => {
            if (hex.owner !== playerNum) {
                return;
            }

            console.log(`--- Analizando Hex (${hex.r},${hex.c}) ---`);

            // <<== NUEVO: Cálculo no lineal del multiplicador de estabilidad ==>>
            let stabilityMultiplier = 0;
            switch (hex.estabilidad) {
                case 0: stabilityMultiplier = 0; break;
                case 1: stabilityMultiplier = 0.25; break; // 25%
                case 2: stabilityMultiplier = 0.70; break; // 70%
                case 3: stabilityMultiplier = 1.0; break;  // 100%
                case 4: stabilityMultiplier = 1.25; break; // 125%
                case 5: stabilityMultiplier = 1.50; break; // 150%
                default: stabilityMultiplier = 0;
            }
            // <<== FIN DE LA MODIFICACIÓN ==>>

            const nationalityMultiplier = (hex.nacionalidad[playerNum] || 0) / MAX_NACIONALIDAD;

            console.log(`  - Estabilidad: ${hex.estabilidad}/${MAX_STABILITY} (Multiplicador: ${stabilityMultiplier.toFixed(2)})`);
            console.log(`  - Nacionalidad: ${hex.nacionalidad[playerNum]}/${MAX_NACIONALIDAD} (Multiplicador: ${nationalityMultiplier.toFixed(2)})`);
            
            let recruitmentPointsFromHex = 0;
            if (hex.isCity) {
                recruitmentPointsFromHex = hex.isCapital ? 100 : 50;
            } else if (hex.structure === "Fortaleza") {
                recruitmentPointsFromHex = 20;
            } else {
                recruitmentPointsFromHex = 10 * nationalityMultiplier * stabilityMultiplier;
            }
            console.log(`  - Puntos Reclutamiento base del hex: ${recruitmentPointsFromHex.toFixed(2)}`);
            totalIncome.puntosReclutamiento += Math.round(recruitmentPointsFromHex);

            let incomeFromHex = { oro: 0, hierro: 0, piedra: 0, madera: 0, comida: 0 };
            
            if (hex.isCity) {
                incomeFromHex.oro = hex.isCapital ? GOLD_INCOME.PER_CAPITAL : GOLD_INCOME.PER_CITY;
            } else if (hex.structure === "Fortaleza") {
                incomeFromHex.oro = GOLD_INCOME.PER_FORT;
            } else if (hex.structure === "Camino") {
                incomeFromHex.oro = GOLD_INCOME.PER_ROAD;
            } else {
                incomeFromHex.oro = GOLD_INCOME.PER_HEX;
            }
            console.log(`  - Ingreso base de oro: ${incomeFromHex.oro}`);

            if (hex.resourceNode && RESOURCE_NODES_DATA[hex.resourceNode]) {
                const nodeInfo = RESOURCE_NODES_DATA[hex.resourceNode];
                const resourceType = nodeInfo.name.toLowerCase().replace('_mina', '');
                
                if (resourceType !== 'oro') {
                    incomeFromHex[resourceType] += nodeInfo.income || 0;
                    console.log(`  - Ingreso por nodo de '${resourceType}': +${nodeInfo.income || 0}`);
                }
            }

            let techBonusLog = "";
            if (incomeFromHex.oro > 0 && playerTechs.includes('PROSPECTING')) { incomeFromHex.oro += 1; techBonusLog += "PROSPECTING, "; }
            if (incomeFromHex.hierro > 0 && playerTechs.includes('IRON_WORKING')) { incomeFromHex.hierro += 1; techBonusLog += "IRON_WORKING, "; }
            if (incomeFromHex.piedra > 0 && playerTechs.includes('MASONRY')) { incomeFromHex.piedra += 1; techBonusLog += "MASONRY, "; }
            if (incomeFromHex.madera > 0 && playerTechs.includes('FORESTRY')) { incomeFromHex.madera += 1; techBonusLog += "FORESTRY, "; }
            if (incomeFromHex.comida > 0 && playerTechs.includes('SELECTIVE_BREEDING')) { incomeFromHex.comida += 1; techBonusLog += "SELECTIVE_BREEDING, "; }
            if (techBonusLog) console.log(`  - Ingresos tras bonus de Tech (${techBonusLog}): Oro=${incomeFromHex.oro}, Hierro=${incomeFromHex.hierro}, ...`);


            console.log("  - Aplicando multiplicadores de Estabilidad y Nacionalidad...");
            for (const res in incomeFromHex) {
                const baseIncome = incomeFromHex[res];
                const finalIncome = baseIncome * stabilityMultiplier * nationalityMultiplier;
                if(finalIncome > 0) console.log(`    - Recurso '${res}': ${baseIncome.toFixed(2)} * ${stabilityMultiplier.toFixed(2)} * ${nationalityMultiplier.toFixed(2)} = ${finalIncome.toFixed(2)}`);
                totalIncome[res] = (totalIncome[res] || 0) + finalIncome;
            }
        }); 
    });

    console.log("--- Resumen de Ingresos Totales (antes de redondear) ---");
    console.log(JSON.stringify(totalIncome, null, 2));

    for (const resType in totalIncome) {
        if (totalIncome[resType] > 0) {
            const roundedIncome = Math.round(totalIncome[resType]);
            if (roundedIncome > 0) {
                playerRes[resType] = (playerRes[resType] || 0) + roundedIncome;
                logItems.push(`+${roundedIncome} ${resType}`);
            }
        }
    }

    if (logItems.length > 0) {
        logMessage(`Ingresos J${playerNum}: ${logItems.join(', ')}`);
    } else {
        logMessage(`Jugador ${playerNum} no generó ingresos este turno.`);
    }

    console.log(`[RECURSOS] Fin de recolección para Jugador ${playerNum}. Recursos finales: ${JSON.stringify(playerRes)}`);
    console.groupEnd();
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

function startTutorial(scenarioData) {
    gameState.isTutorialActive = true;
    tutorialScenarioData = scenarioData;
    currentTutorialStepIndex = -1; // Empezamos antes del primer paso
    // Inicializar propiedades del tutorial en gameState
    gameState.tutorial = {
        lastMovedUnitId: null, // Para la validación del paso de movimiento
        // Añadir otras propiedades de tutorial si se necesitan (ej. unidad atacada, estructura construida)
    };
    moveToNextTutorialStep(); // Para ir al paso 0
}

function moveToNextTutorialStep() {
    // Limpiar cualquier resaltado anterior del tutorial antes de mostrar el siguiente paso
    if (typeof UIManager !== 'undefined' && UIManager.clearTutorialHighlights) {
        UIManager.clearTutorialHighlights();
    }

    currentTutorialStepIndex++;
    const steps = tutorialScenarioData.tutorialSteps;

    if (currentTutorialStepIndex < steps.length) {
        const currentStep = steps[currentTutorialStepIndex];
        console.log(`%c[Tutorial] Nuevo paso: ${currentStep.id}`, "color: blue; font-weight: bold;");

        // Reiniciar la variable de la última unidad movida para la validación del siguiente paso.
        if (gameState.tutorial) gameState.tutorial.lastMovedUnitId = null;

        // Ejecutar cualquier acción que deba ocurrir al inicio de este paso (ej. generar una unidad enemiga)
        if (currentStep.action && typeof currentStep.action === 'function') {
            currentStep.action(gameState); 
        }
        
        // Mostrar el mensaje del paso actual
        if (typeof UIManager !== 'undefined' && UIManager.showTutorialMessage) { 
            UIManager.showTutorialMessage(currentStep.message, currentStep.id === "final_step");
        } else {
            logMessage(`Tutorial: ${currentStep.message}`);
        }

        // Configurar la fase del juego según el paso
        if (currentStep.type === "deployment") {
            gameState.currentPhase = "deployment";
            gameState.currentPlayer = 1; 
            if (typeof UIManager !== 'undefined' && UIManager.updateActionButtonsBasedOnPhase) UIManager.updateActionButtonsBasedOnPhase();
        } else if (currentStep.type === "play") {
            gameState.currentPhase = "play";
            gameState.currentPlayer = 1;
            gameState.turnNumber = (gameState.turnNumber || 0) + 1; 
            if (typeof UIManager !== 'undefined' && UIManager.updateActionButtonsBasedOnPhase) UIManager.updateActionButtonsBasedOnPhase();
        }

        // Si es el último paso, modificar el botón de fin de turno.
        if (currentStep.id === "final_step") {
            if (typeof UIManager !== 'undefined' && UIManager.setEndTurnButtonToFinalizeTutorial) {
                UIManager.setEndTurnButtonToFinalizeTutorial(finalizeTutorial); 
            }
        } else {
            // Para todos los demás pasos, asegurarse de que el botón de fin de turno es el normal.
            if (typeof UIManager !== 'undefined' && UIManager.restoreEndTurnButton) {
                UIManager.restoreEndTurnButton();
            }
        }

        // --- ¡CORRECCIÓN CLAVE AQUÍ: Resaltar elementos para el paso actual! ---
        if (typeof UIManager !== 'undefined' && UIManager.highlightTutorialElement) {
            const elementToHighlightId = currentStep.highlightUI;
            const hexesToHighlight = currentStep.highlightHexCoords;
            UIManager.highlightTutorialElement(elementToHighlightId, hexesToHighlight);
        }
        // --- FIN CORRECCIÓN ---

        // Actualizar la UI
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }

        // Habilitar el botón de fin de turno al inicio de cada paso (luego handleEndTurn lo puede deshabilitar si no se cumple el paso)
        if (typeof UIManager !== 'undefined' && UIManager.setEndTurnButtonEnabled) {
            UIManager.setEndTurnButtonEnabled(true);
        }

    } else {
        // Todos los pasos completados, finalizar el tutorial.
        finalizeTutorial();
    }
}

function updateTerritoryMetrics(playerEndingTurn) {
    console.log(`%c[Metrics v11] INICIO para turno que finaliza J${playerEndingTurn}`, "color: #00BFFF; font-weight: bold;");

    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const hex = board[r][c];
            if (!hex) continue; // Ignorar hexágonos inválidos

            const unitOnHex = getUnitOnHex(r, c);

            // --- LÓGICA DE OCUPACIÓN ENEMIGA ---
            // Si hay una unidad, y NO es del dueño del hexágono.
            if (unitOnHex && hex.owner !== null && unitOnHex.player !== hex.owner) {
                const originalOwner = hex.owner;
                
                // Si la estabilidad es suficiente (umbral de 3), se reduce la nacionalidad.
                if (hex.estabilidad >= 3) {
                    if (hex.nacionalidad[originalOwner] > 0) {
                        hex.nacionalidad[originalOwner]--;
                        console.log(`Hex (${r},${c}): Estabilidad es ${hex.estabilidad}. Baja nación de J${originalOwner} a ${hex.nacionalidad[originalOwner]}`);

                        // Si la nacionalidad llega a 0, se produce la conquista.
                        if (hex.nacionalidad[originalOwner] === 0) {
                            console.log(`%cHex (${r},${c}): ¡CONQUISTADO por J${unitOnHex.player}!`, 'color: orange; font-weight:bold;');
                            hex.owner = unitOnHex.player;
                            hex.nacionalidad[unitOnHex.player] = 1;
                            // La estabilidad NO se resetea.
                            renderSingleHexVisuals(r, c);
                        }
                    }
                } else {
                     console.log(`Hex (${r},${c}): Ocupado por enemigo, pero Estabilidad (${hex.estabilidad}) es muy baja para afectar la nacionalidad.`);
                }
            }

            // --- LÓGICA DE EVOLUCIÓN PASIVA (Solo para el dueño del hexágono) ---
            // Esta parte solo se ejecuta para los hexágonos del jugador cuyo turno está terminando.
            if (hex.owner === playerEndingTurn) {
                // 1. AUMENTO DE ESTABILIDAD
                let stabilityGained = 0;
                if (hex.estabilidad < MAX_STABILITY) {
                    stabilityGained = 1; // Ganancia base
                    if (unitOnHex) { // Bonus por presencia militar (amiga o enemiga)
                        stabilityGained++;
                    }
                }
                
                if (stabilityGained > 0) {
                    hex.estabilidad = Math.min(MAX_STABILITY, hex.estabilidad + stabilityGained);
                     console.log(`Hex (${r},${c}): Gana ${stabilityGained} Estabilidad -> ahora es ${hex.estabilidad}`);
                }

                // 2. AUMENTO DE NACIONALIDAD (si la estabilidad es suficiente)
                if (hex.estabilidad >= 3) {
                    if (hex.nacionalidad[hex.owner] < MAX_NACIONALIDAD) {
                        hex.nacionalidad[hex.owner]++;
                        console.log(`Hex (${r},${c}): Estabilidad es ${hex.estabilidad}. Sube nación de J${hex.owner} a ${hex.nacionalidad[hex.owner]}`);
                    }
                }
            }
        }
    }
    console.log(`%c[Metrics v11] FIN`, "color: #00BFFF; font-weight: bold;");
}

function calculateTradeIncome(playerNum) {
    // --- CAMBIO 1: Verificación de seguridad inicial ---
    // Nos aseguramos de que existen las ciudades y el tablero antes de empezar.
    if (!gameState.cities || !board) {
        return 0;
    }

    const playerCities = gameState.cities.filter(c => c.owner === playerNum);
    if (playerCities.length < 2) {
        return 0; // No hay comercio posible con menos de 2 ciudades.
    }

    const tradeRoutes = new Set();

    for (let i = 0; i < playerCities.length; i++) {
        const startCity = playerCities[i];

        // --- CAMBIO 2: Más verificaciones de seguridad ---
        // Si la ciudad de inicio no tiene coordenadas válidas, la saltamos.
        // Esto previene el error 'getHexNeighbors fue llamado con coordenadas inválidas'.
        if (typeof startCity.r !== 'number' || typeof startCity.c !== 'number') {
            console.warn(`La ciudad ${startCity.name} no tiene coordenadas válidas y no puede generar rutas comerciales.`);
            continue; // Pasa a la siguiente ciudad del bucle.
        }

        // --- CAMBIO 3: La línea que faltaba y causaba el "queue is not defined" ---
        // ¡Se define la variable `queue` antes de usarla!
        const queue = [{ r: startCity.r, c: startCity.c, path: [] }];
        const visited = new Set([`${startCity.r},${startCity.c}`]);
        // --- FIN DEL CAMBIO 3 ---

        while (queue.length > 0) {
            const current = queue.shift();
            
            // Verificación si el hex actual es otra ciudad válida del jugador.
            const targetCity = playerCities.find(c =>
                c.r === current.r && c.c === current.c && c.name !== startCity.name
            );
            
            if (targetCity) {
                const routeKey = [startCity.name, targetCity.name].sort().join('-');
                tradeRoutes.add(routeKey);
                // No continuamos la búsqueda desde aquí para no encontrar la misma ruta múltiples veces.
            }
            
            // Explorar vecinos
            const neighbors = getHexNeighbors(current.r, current.c);
            for (const neighbor of neighbors) {
                const key = `${neighbor.r},${neighbor.c}`;
                const neighborHex = board[neighbor.r]?.[neighbor.c];
                
                // Condición de paso: el hexágono vecino es del jugador Y tiene una infraestructura.
                if (neighborHex && neighborHex.owner === playerNum && neighborHex.structure && !visited.has(key)) {
                    visited.add(key);
                    queue.push({ r: neighbor.r, c: neighbor.c, path: [...current.path, key] });
                }
            }
        }
    }
    
    // Cálculo de ingreso final (se mantiene igual, pero lo incluyo para que sea un bloque completo)
    let tradeIncome = 0;
    const playerTradeCities = gameState.cities.filter(c => c.owner === playerNum && STRUCTURE_TYPES[c.structure]?.tradeValue > 0);
    
    tradeRoutes.forEach(routeKey => {
        const [city1Name, city2Name] = routeKey.split('-');
        const city1 = playerTradeCities.find(c => c.name === city1Name);
        const city2 = playerTradeCities.find(c => c.name === city2Name);
        
        if (city1 && city2) {
            const city1TradeValue = STRUCTURE_TYPES[city1.structure]?.tradeValue || 0;
            const city2TradeValue = STRUCTURE_TYPES[city2.structure]?.tradeValue || 0;
            
            const routeValue = Math.min(city1TradeValue, city2TradeValue);
            tradeIncome += routeValue * (TRADE_INCOME_PER_ROUTE || 50); // Usa valor por defecto si no existe
        }
    });

    if (tradeIncome > 0) {
        logMessage(`Rutas comerciales activas: ${tradeRoutes.size}. Ingreso por comercio: ${tradeIncome} oro.`);
    }

    return tradeIncome;
}

function handleEndTurn() {
    console.log(`[handleEndTurn] INICIO. Fase: ${gameState.currentPhase}, Jugador Actual: ${gameState.currentPlayer}`);
    if (typeof deselectUnit === "function") deselectUnit(); else console.warn("handleEndTurn: deselectUnit no definida");

    if (gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        return;
    }

    // --- LÓGICA DE RED ---
    const isNetworkGame = NetworkManager.conn && NetworkManager.conn.open;
    if (isNetworkGame) {
        if (gameState.currentPlayer !== gameState.myPlayerNumber) {
            logMessage("No es tu turno.");
            return;
        }
        console.log(`[Red] Jugador ${gameState.myPlayerNumber} solicita terminar su turno.`);
        NetworkManager.enviarDatos({
            type: 'actionRequest',
            action: { type: 'endTurn', payload: { playerId: gameState.myPlayerNumber } }
        });
        if (domElements.endTurnBtn) domElements.endTurnBtn.disabled = true;
        logMessage("Petición de fin de turno enviada...");
        return; // La ejecución en red se detiene aquí. El Anfitrión se encargará del resto.
    }
    
    // --- CÓDIGO ORIGINAL (SOLO PARA PARTIDAS LOCALES) ---
    // Si el juego NO es en red, se ejecuta toda tu lógica original intacta.
    console.log("[Juego Local] Procesando fin de turno...");
    if (typeof deselectUnit === "function") deselectUnit(); else console.warn("handleEndTurn: deselectUnit no definida");

    if (gameState.isTutorialActive) {
        const currentStep = tutorialScenarioData.tutorialSteps[currentTutorialStepIndex];
        if (currentStep && currentStep.validate && !currentStep.validate(gameState, units.find(u => u.lastMove))) {
            logMessage(`¡Tutorial! Debes completar el paso actual antes de terminar el turno: ${currentStep.message}`);
            return;
        }
        moveToNextTutorialStep();
        if (gameState.currentPhase === "gameOver") { return; }
    }
       
    // --- CÓDIGO ORIGINAL (AHORA SOLO PARA PARTIDAS LOCALES O PROCESADO POR EL HOST) ---
    let triggerAiDeployment = false;
    let aiPlayerToDeploy = -1;
    let nextPhaseForGame = gameState.currentPhase;
    let nextPlayerForGame = gameState.currentPlayer;
    const playerEndingTurn = gameState.currentPlayer; 

    if (gameState.currentPhase === "deployment") {
        const player1Id = 1;
        const player2Id = 2;
        const limit = gameState.deploymentUnitLimit;
        let player1CanStillDeploy = gameState.playerTypes.player1 === 'human' && (gameState.unitsPlacedByPlayer[player1Id] || 0) < limit;
        let player2CanStillDeploy = gameState.playerTypes.player2 === 'human' && (gameState.unitsPlacedByPlayer[player2Id] || 0) < limit;
        
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
            } else { 
                if ((gameState.unitsPlacedByPlayer[player2Id] || 0) < limit) {
                    nextPlayerForGame = player2Id; triggerAiDeployment = true; aiPlayerToDeploy = player2Id;
                } else { 
                    nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
                }
            }
        } else { 
            if (player2CanStillDeploy) logMessage(`Jugador 2: Aún puedes desplegar (Límite: ${limit === Infinity ? 'Ilimitado' : limit}).`);
            nextPhaseForGame = "play"; nextPlayerForGame = player1Id;
        }
        gameState.currentPhase = nextPhaseForGame;
        gameState.currentPlayer = nextPlayerForGame;
        if (gameState.currentPhase === "play") {
            gameState.turnNumber = 1;
        }
    } else if (gameState.currentPhase === "play") {
        updateTerritoryMetrics(playerEndingTurn);
        collectPlayerResources(playerEndingTurn); 
        handleUnitUpkeep(playerEndingTurn);
        handleHealingPhase(playerEndingTurn);

        gameState.currentPlayer = playerEndingTurn === 1 ? 2 : 1;
        if (gameState.currentPlayer === 1) {
            gameState.turnNumber++;
            logMessage(`Comienza el Turno ${gameState.turnNumber}.`);
        }

        const tradeGold = calculateTradeIncome(playerEndingTurn);
        if (tradeGold > 0) {
            gameState.playerResources[playerEndingTurn].oro += tradeGold;
        }
    }

    logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);

    if(gameState.currentPhase === 'play'){
        handleBrokenUnits(gameState.currentPlayer);
    }
    
    resetUnitsForNewTurn(gameState.currentPlayer);
    
    // 2. Reseteo de acciones
    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer) {
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.currentMovement = unit.movement;
            unit.hasRetaliatedThisTurn = false;

            // <<== NUEVO: Resetear los golpes recibidos en combate para cada regimiento ==>>
            // Se comprueba si la unidad tiene una lista de regimientos.
            if (unit.regiments && Array.isArray(unit.regiments)) {
                // Se itera sobre cada regimiento de la división del jugador que inicia su turno.
                unit.regiments.forEach(regiment => {
                    // Se establece a 0 el contador de golpes recibidos.
                    // Esto elimina la penalización de desgaste para el nuevo turno.
                    regiment.hitsTakenThisRound = 0;
                });
            }
            // <<== FIN DE LA MODIFICACIÓN ==>>
        }
    });
    
    units.forEach(unit => {
        if (unit.player === gameState.currentPlayer) {
            unit.hasMoved = false;
            unit.hasAttacked = false;
            unit.currentMovement = unit.movement;
            unit.hasRetaliatedThisTurn = false;
        }
    });

    if (gameState.currentPhase === 'play') {
        units.forEach(unit => {
            if (unit.player === gameState.currentPlayer && unit.currentHealth > 0) {
                unit.experience = Math.min(unit.maxExperience || 500, (unit.experience || 0) + 1);
                if (typeof checkAndApplyLevelUp === "function") checkAndApplyLevelUp(unit);
            }
        });

        if (gameState.playerResources[gameState.currentPlayer]) {
            const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5; 
            gameState.playerResources[gameState.currentPlayer].researchPoints = (gameState.playerResources[gameState.currentPlayer].researchPoints || 0) + baseResearchIncome;
            logMessage(`Jugador ${gameState.currentPlayer} obtiene ${baseResearchIncome} Puntos de Investigación.`);
        }

        const player = gameState.currentPlayer;
        const playerRes = gameState.playerResources[player];
        if (playerRes) {
            let foodProducedThisTurn = 0;
            if (board?.length > 0) {
                for (let r_idx = 0; r_idx < board.length; r_idx++) {
                    for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
                        const hex = board[r_idx]?.[c_idx];
                        if (hex && hex.owner === player && hex.structure) {
                            if (STRUCTURE_TYPES[hex.structure]?.producesFood) {
                                foodProducedThisTurn += STRUCTURE_TYPES[hex.structure].producesFood;
                            }
                        }
                    }
                }
            }
            playerRes.comida += foodProducedThisTurn;
            if (foodProducedThisTurn > 0) logMessage(`Jugador ${player} produce ${foodProducedThisTurn} comida.`);

            let foodActuallyConsumed = 0;
            let unitsSufferingAttrition = 0;
            let unitsDestroyedByAttrition = [];

            units.filter(u => u.player === player && u.currentHealth > 0).forEach(unit => {
                let unitConsumption = 0;
                (unit.regiments || []).forEach(reg => {
                    unitConsumption += REGIMENT_TYPES[reg.type]?.foodConsumption || 0;
                });
                
                if (isHexSupplied(unit.r, unit.c, player) && playerRes.comida >= unitConsumption) {
                    playerRes.comida -= unitConsumption;
                    foodActuallyConsumed += unitConsumption;
                } else {
                    unit.currentHealth -= (ATTRITION_DAMAGE_PER_TURN || 1);
                    unitsSufferingAttrition++;
                    logMessage(`¡${unit.name} sufre atrición!`);
                    if (unit.currentHealth <= 0) unitsDestroyedByAttrition.push(unit.id);
                    else if (UIManager) UIManager.updateUnitStrengthDisplay(unit);
                }
            });

            unitsDestroyedByAttrition.forEach(unitId => {
                const unit = units.find(u => u.id === unitId);
                if (unit && handleUnitDestroyed) handleUnitDestroyed(unit, null);
            });

            if (foodActuallyConsumed > 0 || unitsSufferingAttrition > 0) logMessage(`Comida consumida: ${foodActuallyConsumed}.`);
            if (playerRes.comida < 0) playerRes.comida = 0;
        }
    }
    
    if (nextPhaseForGame === "play" && gameState.currentPhase === "play" && gameState.turnNumber === 1 && gameState.currentPlayer === 1) {
        logMessage("¡Comienza la Batalla! Turno del Jugador 1.");
    }

    if (UIManager) UIManager.updateAllUIDisplays();
    
    const playerForAICheck = `player${gameState.currentPlayer}`;
    const playerTypeForAICheck = gameState.playerTypes[playerForAICheck];

    if (triggerAiDeployment && aiPlayerToDeploy !== -1) {
        logMessage(`IA (Jugador ${aiPlayerToDeploy}) desplegando...`);
        setTimeout(() => {
            if (deployUnitsAI) deployUnitsAI(aiPlayerToDeploy);
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) domElements.endTurnBtn.click();
        }, 500);
    } else if (gameState.currentPhase === 'play' && playerTypeForAICheck?.startsWith('ai_')) {
        if (checkVictory()) { return; } 
        setTimeout(simpleAiTurn, 700); 
    } else if (gameState.currentPhase === 'play') { 
        if (checkVictory) checkVictory();
    }
}










