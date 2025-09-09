// ======================================================================================
// ===                IA v17.0 - Estrategia de "Gran Apertura" en Turno 1               ===
// ======================================================================================
console.log("ai_gameplayLogic.js v17.0 CARGADO");

const AiGameplayManager = {
    unitRoles: new Map(),
    turn_targets: new Set(),
    strategicAxes: [], // Guardará los 4 puntos de objetivo para los ejes
    missionAssignments: new Map(), // Guardará misiones del tipo (unitId -> missionDetails)
    
    executeTurn: async function(playerNumber) {
        AiGameplayManager.missionAssignments = new Map();
        console.group(`%c[IA Turn] INICIO para Jugador IA ${playerNumber}`, "background: #333; color: #98fb98; font-size: 1.1em;");

        if (gameState.turnNumber === 1 && AiGameplayManager.ownedHexPercentage(playerNumber) < 0.2) {
            await AiGameplayManager._executeGrandOpening_v20(playerNumber);
        } else {
            console.log(`[IA STRATEGY] Ejecutando turno normal (v17).`);
            
            // --- PREPARACIÓN Y GESTIÓN ---
            AiGameplayManager.assessThreatLevel(playerNumber);
            // La producción y construcción ocurren PRIMERO, ANTES de planificar el movimiento.
            await AiGameplayManager.manageEmpire(playerNumber);

            // --- PLANIFICACIÓN Y EJECUCIÓN ---
            // Ahora planificamos y ejecutamos para TODAS las unidades que no han actuado, incluyendo las recién creadas.
            const activeAiUnits = units.filter(u => u.player === playerNumber && u.currentHealth > 0 && !u.hasMoved);
            
            AiGameplayManager.planStrategicObjectives(playerNumber);
            AiGameplayManager.assignUnitsToAxes(playerNumber, activeAiUnits); // Asigna ejes a las unidades activas

            activeAiUnits.sort((a, b) => (b.currentMovement || b.movement) - (a.currentMovement || a.movement));

            console.log("[IA PLANNER] Misiones de eje asignadas:", AiGameplayManager.missionAssignments.size);
            for (const unit of activeAiUnits) {
                const unitInMemory = units.find(u => u.id === unit.id);
                if (unitInMemory?.currentHealth > 0 && !unitInMemory.hasMoved) {
                    await AiGameplayManager.decideAndExecuteUnitAction(unitInMemory);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        
        AiGameplayManager.endAiTurn(playerNumber);
        console.groupEnd();
    },
        
    manageEmpire: async function(playerNumber) {
        console.groupCollapsed(`%c[IA Empire] Gestión Estratégica`, "color: #4CAF50");

        // PRIORIDAD 1: CONSTRUCCIÓN Y DESARROLLO DE BASES AVANZADAS
        await AiGameplayManager._handle_BOA_Construction(playerNumber);

        // PRIORIDAD 2: PRODUCCIÓN AVANZADA DESDE LAS BASES
        //await AiGameplayManager._handle_BOA_Production(playerNumber);

        // PRIORIDAD 3: REFUERZOS DE DEFENSA (Fallback si no hay producción avanzada)
        AiGameplayManager.handleStrategicReinforcements(playerNumber);
        
        // PRIORIDAD 4: MANTENER PRESIÓN Y EXPANSIÓN (Fallback final)
        AiGameplayManager.handlePressureProduction(playerNumber);

        // Tarea continua: construir proyectos de carreteras
        AiGameplayManager.executeRoadProjects(playerNumber);
        
        console.groupEnd();
    },

    _handle_BOA_Construction: async function(playerNumber) {
        // --- Cámara 1: Punto de Entrada ---
        console.log("[DIAGNÓSTICO] Entrando en _handle_BOA_Construction.");

        if (gameState.turnNumber < 6 || AiGameplayManager.fortressCount(playerNumber) >= 2) {
            console.log("[DIAGNÓSTICO] Saliendo: Turno < 6 o ya hay suficientes fortalezas.");
            return;
        }

        const playerRes = gameState.playerResources[playerNumber];
        const playerTechs = playerRes.researchedTechnologies || [];

        // --- Cámara 2: Chequeo de Tecnología ---
        if (!playerTechs.includes('FORTIFICATIONS')) {
            console.log("[DIAGNÓSTICO] Decisión: Necesita investigar FORTIFICATIONS.");
            const pathToFortifications = AiGameplayManager._findTechPath('FORTIFICATIONS', playerTechs);
            if (pathToFortifications && pathToFortifications.length > 0) {
                const nextTechToResearch = pathToFortifications[0];
                console.log(`   -> Siguiente paso tecnológico: ${nextTechToResearch}.`);
                attemptToResearch(nextTechToResearch);
            } else {
                console.log(`   -> ERROR DE DIAGNÓSTICO: No se encontró ruta para FORTIFICATIONS.`);
            }
            return; 
        }
        
        // --- Cámara 3: Chequeo de Localización ---
        console.log("[DIAGNÓSTICO] Decisión: Tiene tecnología. Buscando ubicación...");
        const location = AiGameplayManager._findBestFortressLocation(playerNumber);

        if (!location) {
            console.log("[DIAGNÓSTICO] Saliendo: No se encontró ubicación candidata válida.");
            return;
        }
        console.log(`[DIAGNÓSTICO] Ubicación encontrada: (${location.r}, ${location.c}). Procediendo a construir.`);
        
        // --- Cámara 4: Construcción Secuencial ---
        
        // 4A. CAMINO
        const hexActual = board[location.r][location.c];
    if (hexActual.structure !== 'Camino' && hexActual.structure !== 'Fortaleza') {
        const roadCost = STRUCTURE_TYPES['Camino'].cost;
        console.log(`[DIAGNÓSTICO] Chequeando CAMINO. ¿Ya existe? ${location.structure === 'Camino' || location.structure === 'Fortaleza'}`);
        if (location.structure !== 'Camino') {
            console.log(`   -> Chequeando recursos para Camino: Necesita P:${roadCost.piedra}/M:${roadCost.madera}. Tiene P:${playerRes.piedra}/M:${playerRes.madera}`);
            if (playerRes.piedra >= roadCost.piedra && playerRes.madera >= roadCost.madera) {
                console.log(`%c      -> ¡EJECUTANDO! Construcción de Camino...`, "color: lightgreen");
                handleConfirmBuildStructure({ playerId: playerNumber, r: location.r, c: location.c, structureType: 'Camino' });
                await new Promise(resolve => setTimeout(resolve, 50));
                location.structure = 'Camino'; 
            } else {
                console.log(`%c      -> FALLO: Recursos insuficientes para Camino.`, "color: orange");
            }
        }

        // 4B. FORTALEZA
         // Volvemos a leer el estado del hex, que puede haber sido actualizado por el paso anterior
        const hexDespuesDeCamino = board[location.r][location.c];
        const fortCost = STRUCTURE_TYPES['Fortaleza'].cost;
        console.log(`[DIAGNÓSTICO] Chequeando FORTALEZA. ¿Ya existe? ${location.structure === 'Fortaleza'}. ¿Hay un camino previo? ${location.structure === 'Camino'}`);
        if (location.structure === 'Camino') { // La condición es que YA exista un camino.
            console.log(`   -> Chequeando recursos para Fortaleza: Necesita O:${fortCost.oro}/P:${fortCost.piedra}/H:${fortCost.hierro}. Tiene O:${playerRes.oro}/P:${playerRes.piedra}/H:${playerRes.hierro}.`);
            if (playerRes.oro >= fortCost.oro && playerRes.piedra >= fortCost.piedra && playerRes.hierro >= fortCost.hierro) {
                console.log(`%c      -> ¡EJECUTANDO! Construcción de Fortaleza...`, "color: lightgreen");
                handleConfirmBuildStructure({ playerId: playerNumber, r: location.r, c: location.c, structureType: 'Fortaleza' });
                await new Promise(resolve => setTimeout(resolve, 50));

                // Iniciar proyecto de carretera (sin bloquear)
                    AiGameplayManager.planRoadProject(playerNumber, location);
            } else {
                console.log(`%c      -> FALLO: Recursos insuficientes para Fortaleza.`, "color: orange");
            }
        }
        
        console.log("[DIAGNÓSTICO] Fin de _handle_BOA_Construction.");
    },
    
    /**
     * Encuentra la ruta de tecnologías necesarias para desbloquear una tecnología objetivo.
     * @param {string} targetTechId - La ID de la tecnología que se quiere alcanzar.
     * @param {Array} playerTechs - Las tecnologías que el jugador ya ha investigado.
     * @returns {Array|null} - Una lista ordenada de las tecnologías que faltan por investigar, o null.
     */
    _findTechPath: function(targetTechId, playerTechs) {
        let path = [];
        let toProcess = [targetTechId];
        let processed = new Set();

        while (toProcess.length > 0) {
            const currentTechId = toProcess.shift();
            if (processed.has(currentTechId) || playerTechs.includes(currentTechId)) {
                continue;
            }
            
            const techData = TECHNOLOGY_TREE_DATA[currentTechId];
            if (!techData) return null; // Tecnología inválida

            processed.add(currentTechId);
            path.unshift(currentTechId); // Se añade al principio para mantener el orden

            if (techData.prerequisites) {
                toProcess = techData.prerequisites.concat(toProcess);
            }
        }
        
        // Filtrar las que ya tenemos
        return path.filter(tech => !playerTechs.includes(tech));
    },

    _findBestFortressLocation: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        const existingForts = board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza');

        let candidates = board.flat().filter(h => 
            h && h.terrain === 'hills' && h.owner === playerNumber && !h.structure
        );

        if (candidates.length === 0) { return null; }

        let bestCandidate = null;
        let maxScore = -Infinity;

        candidates.forEach(hex => {
            let score = 0;
            // Prioridad 1: Lejanía de la capital propia
            if (aiCapital) score += hexDistance(aiCapital.r, aiCapital.c, hex.r, hex.c) * 2;
            // Prioridad 2: Cercanía a la capital enemiga (si existe)
            if (enemyCapital) score += (100 - hexDistance(hex.r, hex.c, enemyCapital.r, enemyCapital.c));
            // Prioridad 3: Lejanía de otras fortalezas
            if (existingForts.length > 0) {
                const closestFortDist = existingForts.reduce((min, f) => Math.min(min, hexDistance(hex.r, hex.c, f.r, f.c)), Infinity);
                score += closestFortDist * 1.5;
            }
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = hex;
            }
        });
        
        return bestCandidate;
    },

    fortressCount: function(playerNumber){
        return board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza').length;
    },

    planRoadProject: function(playerNumber, newFortress) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital || !newFortress) return;

        // Planificar la ruta
        const path = findPath_A_Star({ player: playerNumber, regiments: [{ type: 'Ingenieros' }] }, { r: capital.r, c: capital.c }, { r: newFortress.r, c: newFortress.c });
        
        if (path) {
            console.log(`[IA Empire] Proyecto de carretera planificado con ${path.length} tramos.`);
            // Guardamos el proyecto en la memoria de la IA
            if (!AiGameplayManager.roadProjects) AiGameplayManager.roadProjects = [];
            AiGameplayManager.roadProjects.push(path);
        }
    },

    executeRoadProjects: function(playerNumber) {
        if (!AiGameplayManager.roadProjects || AiGameplayManager.roadProjects.length === 0) return;

        const roadCost = STRUCTURE_TYPES['Camino'].cost;
        const playerRes = gameState.playerResources[playerNumber];

        // Iteramos sobre los proyectos y construimos un tramo si es posible
        AiGameplayManager.roadProjects.forEach(path => {
            for(const hexCoords of path) {
                const hex = board[hexCoords.r]?.[hexCoords.c];
                // Construir si el tramo es nuestro y no tiene ya un camino
                if (hex && hex.owner === playerNumber && hex.structure !== 'Camino' && hex.structure !== 'Fortaleza') {
                    if (playerRes.oro >= roadCost.oro && playerRes.piedra >= roadCost.piedra) {
                        console.log(`%c[IA Empire] Construyendo tramo de carretera en (${hex.r}, ${hex.c})`, "color: #DAA520");
                        handleConfirmBuildStructure({ playerId: playerNumber, r: hex.r, c: hex.c, structureType: 'Camino' });
                        // Solo construimos un tramo por turno para no gastar todos los recursos.
                        return; 
                    }
                }
            }
        });
    },
    
    findClosestUnitWithAbility: function(playerNumber, ability, targetHex) {
        const candidates = units.filter(u => u.player === playerNumber && u.regiments.some(r => REGIMENT_TYPES[r.type]?.abilities?.includes(ability)));
        if (candidates.length === 0) return null;
        
        candidates.sort((a,b) => hexDistance(a.r, a.c, targetHex.r, targetHex.c) - hexDistance(b.r, b.c, targetHex.r, targetHex.c));
        return candidates[0];
    },

    planStrategicObjectives: function(playerNumber) {
        AiGameplayManager.strategicAxes = [];
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        const mapRows = board.length;
        const mapCols = board[0].length;

        // Define los cuadrantes del mapa
        const quadrants = {
            'Frontal': { r_min: 0, r_max: mapRows, c_min: 0, c_max: mapCols }, // El objetivo es la capital
            'SuperiorIzquierdo': { r_min: 0, r_max: Math.floor(mapRows / 2), c_min: 0, c_max: Math.floor(mapCols / 2) },
            'LateralIzquierdo': { r_min: Math.floor(mapRows/2), r_max: mapRows, c_min: 0, c_max: Math.floor(mapCols / 2) },
            'SuperiorDerecho': { r_min: 0, r_max: Math.floor(mapRows / 2), c_min: Math.floor(mapCols / 2), c_max: mapCols }
        };
        
        // El eje frontal siempre apunta a la capital enemiga si existe
        if (enemyCapital) {
            AiGameplayManager.strategicAxes.push({ name: 'Asalto Frontal', target: enemyCapital });
        }

        // Para los otros cuadrantes, encuentra el centro del clúster más grande de casillas neutrales
        for (const quadName in quadrants) {
            if (quadName === 'Frontal') continue;
            const quad = quadrants[quadName];
            
            const neutralHexesInQuad = board.flat().filter(h => 
                h && h.owner === null && !h.unit && !TERRAIN_TYPES[h.terrain].isImpassableForLand &&
                h.r >= quad.r_min && h.r < quad.r_max && h.c >= quad.c_min && h.c < quad.c_max
            );

            if (neutralHexesInQuad.length > 5) { // Solo considera zonas con un mínimo de espacio para expandirse
                const avgR = Math.round(neutralHexesInQuad.reduce((sum, h) => sum + h.r, 0) / neutralHexesInQuad.length);
                const avgC = Math.round(neutralHexesInQuad.reduce((sum, h) => sum + h.c, 0) / neutralHexesInQuad.length);
                AiGameplayManager.strategicAxes.push({ name: quadName, target: { r: avgR, c: avgC } });
            }
        }
        console.log("[IA AXES] Ejes dinámicos definidos:", AiGameplayManager.strategicAxes.map(a => `${a.name} -> (${a.target.r},${a.target.c})`));
    },

    assignUnitsToAxes: function(playerNumber, unitsToAssign) {
        const explorers = unitsToAssign.filter(u => (AiGameplayManager.unitRoles.get(u.id) === 'explorer' || !AiGameplayManager.unitRoles.has(u.id)) );
        
        for(const unit of explorers) {
            let bestAxis = null;
            let minDistance = Infinity;
            
            for (const axis of AiGameplayManager.strategicAxes) {
                const dist = hexDistance(unit.r, unit.c, axis.target.r, axis.target.c);
                if(dist < minDistance) {
                    minDistance = dist;
                    bestAxis = axis;
                }
            }
            
            if(bestAxis) {
                AiGameplayManager.missionAssignments.set(unit.id, { type: 'AXIS_ADVANCE', objective: bestAxis.target });
            }
        }
    },

    _executeGrandOpening_v20: async function(playerNumber) {
        console.log(`%c[IA STRATEGY] Ejecutando Gran Apertura (Plan v22.0 - Objetivo-Primero).`, "color: #FFA500; font-weight: bold;");
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital) return;

        // --- Función de apoyo interna para una oleada ---
        const executeWave = async (unitType, moveCost, maxUnitsToCreate) => {
            let createdInWave = 0;
            
            while(createdInWave < maxUnitsToCreate) {
                // 1. Encontrar todos los puntos de creación disponibles AHORA MISMO
                const creationSpots = getHexNeighbors(capital.r, capital.c)
                    .filter(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit);

                // 2. Para CADA punto de creación, encontrar todos los destinos válidos
                let allPossibleManiobras = [];
                for (const spot of creationSpots) {
                    // El `findPathToTarget` ya calcula la ruta con coste de terreno
                    const pathOptions = AiGameplayManager._findAllPathsWithCost(spot, moveCost, unitType, playerNumber);
                    for (const path of pathOptions) {
                        const destination = path[path.length-1];
                        // El objetivo debe ser neutral
                        if(board[destination.r][destination.c].owner === null) {
                            allPossibleManiobras.push({ inicio: spot, fin: destination, path: path });
                        }
                    }
                }

                if (allPossibleManiobras.length === 0) {
                    console.log(`   -> No se encontraron más maniobras válidas para esta oleada.`);
                    return false; // Termina esta oleada
                }

                // 3. Elegir la MEJOR maniobra de todas las posibles (la que llega más lejos)
                allPossibleManiobras.sort((a,b) => hexDistance(capital.r, capital.c, b.fin.r, b.fin.c) - hexDistance(capital.r, capital.c, a.fin.r, a.fin.c));
                const bestManiobra = allPossibleManiobras[0];

                //console.log(`   [ANÁLISIS] Objetivo elegido: (${bestManiobra.fin.r}, ${bestManiobra.fin.c}). Se puede llegar desde el punto de creación (${bestManiobra.inicio.r}, ${bestManiobra.inicio.c})`);

                // 4. Ejecutar la mejor maniobra
                const newUnit = AiGameplayManager.produceUnit(playerNumber, [unitType], 'explorer', `Incursor`, bestManiobra.inicio);
                if (newUnit) {
                    //console.log(`%c     PASO 1: Creada ${newUnit.name} en (${bestManiobra.inicio.r}, ${bestManiobra.inicio.c})`, 'color: lightgreen');
                    await _executeMoveUnit(newUnit, bestManiobra.fin.r, bestManiobra.fin.c);
                    //console.log(`%c     PASO 2: Movida ${newUnit.name} a su objetivo (${bestManiobra.fin.r}, ${bestManiobra.fin.c})`, 'color: cyan');
                    createdInWave++;
                    await new Promise(resolve => setTimeout(resolve, 100)); // Pausa
                } else {
                    console.log(`   -> Fin de oleada por falta de recursos.`);
                    return false; // Termina TODA la apertura
                }
            }
            return true; // Oleada completada con éxito
        };

        // --- Ejecución de las Oleadas según tus especificaciones ---
        let canContinue = true;
        console.log("--- OLEADA 1: Infantería (Anillo Exterior, coste 2) ---");
        canContinue = await executeWave('Infantería Ligera', 2, 18);
        canContinue = true;
        if (canContinue) {
            console.log("--- OLEADA 2: Infantería (Anillo Interior, coste 1) ---");
            // Contar unidades de infantería actuales para saber cuántas faltan
            const infantryCount = units.filter(u=>u.player === playerNumber && u.regiments.some(r => r.type === 'Infantería Ligera')).length;
            canContinue = await executeWave('Infantería Ligera', 1, 24 - infantryCount);
        }
        canContinue = true;
        if (canContinue) {
            console.log("--- OLEADA 3: Caballería de Salto ---");
            const cavalryMove = REGIMENT_TYPES['Caballería Ligera'].movement;
            canContinue = await executeWave('Caballería Ligera', REGIMENT_TYPES['Caballería Ligera'].movement, 6);
        }

        console.log(`[IA STRATEGY] Gran Apertura finalizada.`);
    },
    
    _findAllPathsWithCost: function(startCoords, maxCost, unitType, playerNumber) {
        const unitForPathing = {
            player: playerNumber,
            regiments: [{ type: unitType, ...REGIMENT_TYPES[unitType] }]
        };
        const hasJumpAbility = REGIMENT_TYPES[unitType]?.abilities?.includes("Jump");

        let validPaths = [];
        let queue = [{ r: startCoords.r, c: startCoords.c, path: [startCoords], cost: 0 }];
        let visited = new Map();
        visited.set(`${startCoords.r},${startCoords.c}`, 0);

        while (queue.length > 0) {
            let current = queue.shift();
            
            if (current.cost >= maxCost) continue;

            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                const hex = board[neighbor.r]?.[neighbor.c];
                if (!hex || TERRAIN_TYPES[hex.terrain].isImpassableForLand) continue;
                
                const moveCost = TERRAIN_TYPES[hex.terrain]?.movementCostMultiplier || 1;
                const newCost = current.cost + moveCost;
                
                if (newCost > maxCost || (visited.has(key) && visited.get(key) <= newCost)) continue;
                
                const unitOnNeighbor = hex.unit;
                let canPassThrough = false;
                if (!unitOnNeighbor) { canPassThrough = true; }
                else if (unitOnNeighbor.player === playerNumber && hasJumpAbility) { canPassThrough = true; }

                if (canPassThrough) {
                    visited.set(key, newCost);
                    let newPath = [...current.path, neighbor];
                    // Solo nos interesan los destinos finales
                    if (newCost <= maxCost && !unitOnNeighbor) {
                        validPaths.push(newPath);
                    }
                    queue.push({ ...neighbor, path: newPath, cost: newCost });
                }
            }
        }
        // Devolvemos solo los caminos que terminan exactamente en el coste de movimiento o menos
        return validPaths.filter(path => {
            let totalCost = 0;
            for(let i=0; i<path.length-1; i++){
                totalCost += TERRAIN_TYPES[board[path[i+1].r][path[i+1].c].terrain]?.movementCostMultiplier || 1;
            }
            return totalCost <= maxCost;
        });
    },    

    _moveUnitOutward: async function(unit, distance) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === unit.player);
        if (!capital) return;
        
        const potentialTargets = AiGameplayManager.findBestStrategicObjective({ ...unit, r: capital.r, c: capital.c });
        if (potentialTargets.length === 0) return;
        
        const targetHex = potentialTargets[0];
        const path = AiGameplayManager.findPathToTarget(unit, targetHex.r, targetHex.c);

        if (path && path.length > 1) {
            const targetIndex = Math.min(path.length - 1, distance);
            const moveHex = path[targetIndex];
            if(!getUnitOnHex(moveHex.r, moveHex.c)) {
                console.log(`%c   [LOG] PASO 2: Moviendo ${unit.name} a (${moveHex.r}, ${moveHex.c}).`, 'color: cyan;');
                await _executeMoveUnit(unit, moveHex.r, moveHex.c);
            } else {
                console.log(`%c   [LOG] PASO 2 FALLIDO: El destino de ${unit.name} en (${moveHex.r}, ${moveHex.c}) está ocupado.`, 'color: orange;');
            }
        } else {
            console.warn(`   [LOG] PASO 2 FALLIDO: No se encontró ruta para ${unit.name}`);
        }
    },
    
    _executeNormalTurn: async function(playerNumber) {
        console.log(`[IA STRATEGY] Ejecutando turno normal.`);
        
        // Preparación
        AiGameplayManager.turn_targets.clear();
        AiGameplayManager.missionAssignments = new Map(); // Se inicializa aquí para evitar errores

        // Gestión del Imperio (incluye producción y construcción)
        await AiGameplayManager.manageEmpire(playerNumber);

        // Unidades activas (incluye las recién creadas)
        const activeAiUnits = units.filter(u => u.player === playerNumber && u.currentHealth > 0 && !u.hasMoved);

        // Planificación (ahora opera sobre todas las unidades activas)
        AiGameplayManager.planStrategicObjectives(playerNumber);
        AiGameplayManager.assignUnitsToAxes(playerNumber, activeAiUnits);
        
        // Ejecución ordenada por movilidad
        activeAiUnits.sort((a, b) => (b.currentMovement || b.movement) - (a.currentMovement || a.movement));

        console.log("[IA PLANNER] Misiones de eje asignadas:", AiGameplayManager.missionAssignments.size);
        for (const unit of activeAiUnits) {
            const unitInMemory = units.find(u => u.id === unit.id);
            if (unitInMemory?.currentHealth > 0 && !unitInMemory.hasMoved) {
                await AiGameplayManager.decideAndExecuteUnitAction(unitInMemory);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
    },
    
    decideAndExecuteUnitAction: async function(unit) {
        const mission = AiGameplayManager.missionAssignments.get(unit.id) || { type: 'DEFAULT' };
        console.groupCollapsed(`Decidiendo para ${unit.name} (Misión: ${mission.type})`);
        try {
            if (AiGameplayManager.codeRed_rallyPoint && unit.id !== AiGameplayManager.codeRed_rallyPoint.anchorId) { await AiGameplayManager.moveToRallyPoint(unit); return; }
            if (unit.regiments.length < 5 && await AiGameplayManager.findAndExecuteMerge_Proactive(unit)) { return; }

            const enemyPlayer = unit.player === 1 ? 2 : 1;
            const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
            if (enemies.length > 0) { await AiGameplayManager._executeCombatLogic(unit, enemies); } 
            else { await AiGameplayManager.executeGeneralMovement(unit); }
        } catch(e) { console.error(`Error procesando ${unit.name}:`, e); } 
        finally { console.groupEnd(); }
    },

    _executeCombatLogic: async function(unit, enemies) {
        const healthPercentage = unit.currentHealth / unit.maxHealth;
        if (healthPercentage < 0.35) {
            await AiGameplayManager.executeRetreat(unit, enemies); return;
        }
        const bestAttack = AiGameplayManager.findBestOverallAttack(unit, enemies);
        if (!bestAttack) {
            await AiGameplayManager._executeExpansionLogic(unit); return;
        }
        if (bestAttack.isFavorable) {
            await AiGameplayManager._executeMoveAndAttack(unit, bestAttack.moveHex, bestAttack.target);
        } else {
            const merged = await AiGameplayManager.findAndExecuteMerge_Reactive(unit, bestAttack.target);
            if (merged) {
                const unitAfterMerge = units.find(u => u.id === unit.id || u.id === merged.allyId);
                if (unitAfterMerge) await AiGameplayManager._executeMoveAndAttack(unitAfterMerge, null, bestAttack.target);
            } else {
                if (bestAttack.isSuicidal) { await AiGameplayManager.executeRetreat(unit, enemies); } 
                else { await AiGameplayManager._executeMoveAndAttack(unit, bestAttack.moveHex, bestAttack.target); }
            }
        }
    },

    _executeRangedTactic: async function(unit, enemies) {
        const reachableHexes = AiGameplayManager.getReachableHexes(unit);
        reachableHexes.push({r: unit.r, c: unit.c, cost: 0});
        let safeAttacks = []; let calculatedRiskAttacks = [];

        for (const movePos of reachableHexes) {
            for (const enemy of enemies) {
                if (isValidAttack({ ...unit, r: movePos.r, c: movePos.c }, enemy)) {
                    const isSafe = hexDistance(movePos.r, movePos.c, enemy.r, enemy.c) > enemy.movement;
                    const isDefensivePos = ['forest', 'hills'].includes(board[movePos.r]?.[movePos.c]?.terrain);
                    if (isSafe) { safeAttacks.push({ moveHex: movePos, target: enemy }); } 
                    else if (isDefensivePos) { calculatedRiskAttacks.push({ moveHex: movePos, target: enemy });}
                }
            }
        }
        if (safeAttacks.length > 0) {
            await AiGameplayManager._executeMoveAndAttack(unit, safeAttacks[0].moveHex, safeAttacks[0].target); return true;
        }
        if (calculatedRiskAttacks.length > 0) {
            await AiGameplayManager._executeMoveAndAttack(unit, calculatedRiskAttacks[0].moveHex, calculatedRiskAttacks[0].target); return true;
        }
        return false;
    },

    _executeExpansionLogic: async function(unit) {
        if (await AiGameplayManager.executeGeneralMovement(unit)) {
            return;
        }
        console.log(`-> ${unit.name} no encontró movimiento de expansión viable. Esperando.`);
    },

    handleHordeProduction: function(playerNumber) {
        if (AiGameplayManager.ownedHexPercentage(playerNumber) < 0.5 || units.filter(u => u.player === playerNumber).length < 15) {
            console.log(`%c-> MODO HORDA. Analizando oleadas de producción.`, "color: #ff4500;");

            const unitsOfType = (type) => units.filter(u => u.player === playerNumber && u.regiments.some(r => r.type === type)).length;
            const cavalryCount = unitsOfType('Caballería Ligera');
            
            let unitsCreatedThisTurn = 0;
            const PRODUCTION_LIMIT_PER_TURN = 18; // Producirá hasta 6 unidades en total en este turno de horda.

            // Bucle para intentar producir varias unidades en el mismo turno
            while (unitsCreatedThisTurn < PRODUCTION_LIMIT_PER_TURN) {
                
                // --- NUEVA LÓGICA DE DECISIÓN DE OLEADA ---
                let typeToProduce = null;

                // Prioridad 1: ¿Necesito Caballería?
                if (cavalryCount + unitsCreatedThisTurn < 6) {
                    typeToProduce = 'Caballería Ligera';
                } else {
                    // Si la cuota de caballería está llena, PASAMOS a infantería.
                    typeToProduce = 'Infantería Ligera';
                }
                // --- FIN NUEVA LÓGICA ---

                // Intentamos producir la unidad decidida
                const success = AiGameplayManager.produceUnit(playerNumber, [typeToProduce], 'explorer', 'Incursor');
                
                if (success) {
                    unitsCreatedThisTurn++;
                } else {
                    // Si produceUnit falla (por espacio O recursos), terminamos la producción de este turno.
                    console.log("-> Fin de producción para este turno (fallo al crear).");
                    break;
                }
            }
            
            if (unitsCreatedThisTurn > 0) {
                console.log(`%c   -> ${unitsCreatedThisTurn} unidades de incursión creadas este turno.`, "color: #ff4500;");
            }
        }
    },
    
    findPathToTarget: function(unit, targetR, targetC) {
        console.log(`[findPathToTarget DEBUG] Buscando ruta para ${unit.regiments[0].type} desde (${unit.r},${unit.c}) hasta (${targetR},${targetC})`);
        
        if (!unit || typeof targetR === 'undefined' || typeof targetC === 'undefined') return null;
        if (unit.r === targetR && unit.c === targetC) return [{ r: unit.r, c: unit.c }];
        const hasJumpAbility = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.abilities?.includes("Jump"));

        const startNode = { r: unit.r, c: unit.c, path: [{ r: unit.r, c: unit.c }] };
        let queue = [startNode];
        let visited = new Set([`${unit.r},${unit.c}`]);

        while (queue.length > 0) {
            queue.sort((a, b) => a.f - b.f);
            let current = queue.shift();

            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                if (visited.has(key)) continue;

                const hex = board[neighbor.r]?.[neighbor.c];
                if (!hex) continue; // Si el hex no existe, ignorar
                if (TERRAIN_TYPES[hex.terrain].isImpassableForLand) {
                    // IGNORAR - Es intransitable
                    continue; 
                }

                const unitOnNeighbor = hex.unit;
                let canPassThrough = false;
                
                // ================== LOG DE DIAGNÓSTICO ==================
                let reason = `Evaluando vecino (${neighbor.r},${neighbor.c}): `;
                // =======================================================

                if (!unitOnNeighbor) {
                    canPassThrough = true;
                    reason += "Está vacío. SE PUEDE PASAR.";
                } 
                else if (unitOnNeighbor.player === unit.player && hasJumpAbility) {
                    canPassThrough = true;
                    reason += `Ocupado por aliado, pero ${unit.regiments[0].type} tiene 'Jump'. SE PUEDE PASAR.`;
                } else {
                    reason += `Ocupado por ${unitOnNeighbor.name}. NO SE PUEDE PASAR.`;
                }

                // Un movimiento NUNCA puede terminar en una casilla ocupada.
                if (neighbor.r === targetR && neighbor.c === targetC && unitOnNeighbor) {
                    canPassThrough = false; 
                    reason += ` (Es el destino final, NO SE PUEDE TERMINAR AQUÍ).`;
                }

                //console.log(reason); // <--- LA LÍNEA MÁS IMPORTANTE
                
                if (canPassThrough) {
                    visited.add(key);
                    let newPath = [...current.path, neighbor];
                    if (neighbor.r === targetR && neighbor.c === targetC) {
                        console.log(`[findPathToTarget DEBUG] ¡RUTA ENCONTRADA! Longitud: ${newPath.length}`);
                        return newPath;
                    }
                    const g = current.path.length; // Costo actual del camino
                    const h = hexDistance(neighbor.r, neighbor.c, targetR, targetC); // Distancia hasta el final
                    const f = g + h; // Puntuación A*
                    queue.push({ ...neighbor, path: newPath, f: f });
                }
            }
        }

        console.log(`[findPathToTarget DEBUG] RUTA NO ENCONTRADA.`);
        return null;
    },

    planUnitAction: async function(unit) {
        let plan = { unit: unit, type: 'wait', target_hex: null, path: null, distance_to_target: 0 };

        // Lógica de "Código Rojo" sigue teniendo prioridad máxima.
        if (AiGameplayManager.codeRed_rallyPoint && unit.id !== AiGameplayManager.codeRed_rallyPoint.anchorId) {
            const path_to_rally = AiGameplayManager.findPathToTarget(unit, AiGameplayManager.codeRed_rallyPoint.r, AiGameplayManager.codeRed_rallyPoint.c);
            if(path_to_rally) {
                plan.type = 'rally';
                plan.target_hex = AiGameplayManager.codeRed_rallyPoint;
                plan.path = path_to_rally;
                plan.distance_to_target = path_to_rally.length;
                return plan;
            }
        }
        
        const isHordeMode = AiGameplayManager.ownedHexPercentage(unit.player) < 0.4;
        // La fusión solo ocurre si no estamos en modo horda de expansión masiva
        if (!isHordeMode && unit.regiments.length < 5) {
             const mergeTarget = AiGameplayManager.findBestMergeTarget(unit);
             if (mergeTarget) {
                 const path_to_merge = AiGameplayManager.findPathToTarget(unit, mergeTarget.r, mergeTarget.c);
                 if (path_to_merge) {
                     plan.type = 'merge';
                     plan.target_hex = mergeTarget;
                     plan.path = path_to_merge;
                     plan.distance_to_target = path_to_merge.length;
                     return plan;
                 }
             }
        }
        
        // Lógica de expansión: siempre se calcula
        const potentialTargets = AiGameplayManager.findBestStrategicObjective(unit, 'expansion');
        const availableTargets = potentialTargets.filter(hex => !AiGameplayManager.turn_targets.has(`${hex.r},${hex.c}`));
        if (availableTargets.length > 0) {
            const targetHex = availableTargets[0];
            const pathToTarget = AiGameplayManager.findPathToTarget(unit, targetHex.r, targetHex.c);
            if (pathToTarget) {
                plan.type = 'expand';
                plan.target_hex = targetHex;
                plan.path = pathToTarget;
                plan.distance_to_target = pathToTarget.length;
                // No retornar aquí para que pueda ser sobreescrito por un plan de ataque si existe.
            }
        }

        // Lógica de combate (sobrescribe el plan de expansión si es posible)
        const enemyPlayer = unit.player === 1 ? 2 : 1;
        const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);
        if(enemies.length > 0) {
            const bestAttack = AiGameplayManager.findBestOverallAttack(unit, enemies);
            if (bestAttack) {
                plan.type = 'attack';
                plan.details = bestAttack;
                plan.target_hex = bestAttack.target; // El objetivo es la unidad enemiga
                plan.path = AiGameplayManager.findPathToTarget(unit, bestAttack.moveHex ? bestAttack.moveHex.r : unit.r, bestAttack.moveHex ? bestAttack.moveHex.c : unit.c);
                plan.distance_to_target = plan.path ? plan.path.length : 0;
            }
        }

        return plan;
    },

    executePlan: async function(plan) {
        switch(plan.type) {
            case 'rally':
            case 'merge':
                if (plan.path && (plan.path.length - 1) <= plan.unit.currentMovement) {
                    await _executeMoveUnit(plan.unit, plan.target_hex.r, plan.target_hex.c, true);
                    const remainingAlly = units.find(u => u.id === plan.target_hex.id);
                    const movedUnit = units.find(u => u.id === plan.unit.id);
                    if (remainingAlly && movedUnit) mergeUnits(movedUnit, remainingAlly);
                } else if(plan.path) {
                    const moveHex = plan.path[Math.min(plan.path.length - 1, plan.unit.currentMovement || plan.unit.movement)];
                    await _executeMoveUnit(plan.unit, moveHex.r, moveHex.c);
                }
                break;
            
            case 'expand':
                if (plan.path && plan.path.length > 1) {
                    const moveHex = plan.path[Math.min(plan.path.length - 1, plan.unit.currentMovement || plan.unit.movement)];
                    AiGameplayManager.turn_targets.add(`${plan.target_hex.r},${plan.target_hex.c}`);
                    await _executeMoveUnit(plan.unit, moveHex.r, moveHex.c);
                }
                break;
                
            case 'attack':
                const bestAttack = plan.details;
                if (bestAttack.isFavorable) {
                    await AiGameplayManager._executeMoveAndAttack(plan.unit, bestAttack.moveHex, bestAttack.target);
                } else {
                    const merged = await AiGameplayManager.findAndExecuteMerge_Reactive(plan.unit, bestAttack.target);
                    if(merged) {
                        const unitAfterMerge = units.find(u => u.id === plan.unit.id || u.id === merged.allyId);
                        if (unitAfterMerge) await AiGameplayManager._executeMoveAndAttack(unitAfterMerge, null, bestAttack.target);
                    } else {
                        if (bestAttack.isSuicidal) await AiGameplayManager.executeRetreat(plan.unit);
                        else await AiGameplayManager._executeMoveAndAttack(plan.unit, bestAttack.moveHex, bestAttack.target);
                    }
                }
                break;
                
            case 'wait':
                console.log(`-> ${plan.unit.name} no encontró acciones y espera.`);
                break;
        }
    },
    
    handleExpansionProduction: function(playerNumber) {
        if(AiGameplayManager.ownedHexPercentage(playerNumber) < 0.40) { // Modo "Gran Horda"
            console.log(`%c-> MODO GRAN HORDA activado (Control del mapa < 40%).`, "color: #ff4500; font-weight: bold;");
            
            const cavalryCount = units.filter(u => u.player === playerNumber && u.regiments.some(r => r.type === 'Caballería Ligera')).length;
            const infantryCount = units.filter(u => u.player === playerNumber && u.regiments.some(r => r.type === 'Infantería Ligera')).length;

            let unitsToProduce = 0;
            let typeToProduce = '';

            // Oleada 1: Caballería
            if (cavalryCount < 6) {
                unitsToProduce = 6 - cavalryCount;
                typeToProduce = 'Caballería Ligera';
                console.log(`   -> Oleada 1: Produciendo hasta ${unitsToProduce} de Caballería.`);
            } 
            // Oleada 2 y 3: Infantería
            else if (cavalryCount + infantryCount < 18) {
                unitsToProduce = 18 - (cavalryCount + infantryCount);
                typeToProduce = 'Infantería Ligera';
                 console.log(`   -> Oleada 2: Produciendo hasta ${unitsToProduce} de Infantería.`);
            }

            for (let i = 0; i < unitsToProduce; i++) {
                if(!AiGameplayManager.produceUnit(playerNumber, [typeToProduce], 'explorer', 'Incursor')) {
                    console.log("-> Fin de la producción en oleada (sin recursos/espacio).");
                    break;
                }
            }

        } else { // Producción normal post-expansión
             const playerUnitsCount = units.filter(u => u.player === playerNumber).length;
             if (playerUnitsCount < 15) AiGameplayManager.produceUnit(playerNumber, ['Infantería Ligera'], 'explorer', `Explorador`);
        }
    },

    assessThreatLevel: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const aiUnits = units.filter(u => u.player === playerNumber);
        const enemyUnits = units.filter(u => u.player === enemyPlayer);
        if(enemyUnits.length === 0 || aiUnits.length === 0) return;
        
        const biggestEnemyFormation = enemyUnits.reduce((max, unit) => (unit.regiments.length > max ? unit.regiments.length : max), 0);
        
        if (biggestEnemyFormation > 10) { // Si hay una unidad enemiga con más de 10 regimientos
            // Designar la unidad IA más fuerte como el núcleo del nuevo "super ejército"
            aiUnits.sort((a,b) => b.regiments.length - a.regiments.length);
            const anchorUnit = aiUnits[0];
            AiGameplayManager.codeRed_rallyPoint = { r: anchorUnit.r, c: anchorUnit.c, anchorId: anchorUnit.id };
            console.log(`%c[IA] CÓDIGO ROJO! Amenaza masiva detectada (${biggestEnemyFormation} reg.). Estableciendo punto de reunión en la unidad ${anchorUnit.name} en (${anchorUnit.r},${anchorUnit.c})`, "color: red; font-weight: bold;");
        }
    },
    
    findBestMergeTarget: function(unit) {
        const potentialAllies = units.filter(u => u.player === unit.player && u.id !== unit.id && !u.hasMoved && (unit.regiments.length + u.regiments.length) <= MAX_REGIMENTS_PER_DIVISION);
        if (potentialAllies.length === 0) return null;

        potentialAllies.sort((a, b) => {
            const strengthDiff = b.regiments.length - a.regiments.length;
            if (strengthDiff !== 0) return strengthDiff;
            return hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c);
        });
        
        return potentialAllies[0];
    },

    _findBestDefensiveRetreatHex: function(unit, enemies) {
        const reachableHexes = AiGameplayManager.getReachableHexes(unit);
        let bestHex = null;
        let bestScore = -Infinity;

        for (const hex of reachableHexes) {
            let score = 0;
            const hexData = board[hex.r][hex.c];
            if (!hexData) continue;
            
            // Puntos por terreno defensivo
            if (hexData.terrain === 'forest') score += 20;
            if (hexData.terrain === 'hills') score += 15;
            
            // Puntos por alejarse de los enemigos
            const closestEnemyDist = enemies.reduce((min, e) => Math.min(min, hexDistance(hex.r, hex.c, e.r, e.c)), Infinity);
            if(closestEnemyDist !== Infinity) score += closestEnemyDist * 5;

            if (score > bestScore) {
                bestScore = score;
                bestHex = hex;
            }
        }
        return bestHex;
    },

    executeDefenderMovement: async function(unit) {
        let targetCoords=null;
        for(const zona in gameState.ai_reaction_forces){
            if(gameState.ai_reaction_forces[zona].unitId===unit.id){
                targetCoords=gameState.ai_reaction_forces[zona].targetCoords; break;
            }
        }
        if(targetCoords){
            const path=AiGameplayManager.findPathToTarget(unit,targetCoords.r,targetCoords.c);
            if(path&&path.length>1){
                const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];
                await _executeMoveUnit(unit,moveHex.r,moveHex.c); return true;
            }
        }
        AiGameplayManager.unitRoles.set(unit.id,'explorer');
        return await AiGameplayManager.executeGeneralMovement(unit);
    },
    
    executeGeneralMovement: async function(unit) {
        const mission = AiGameplayManager.missionAssignments.get(unit.id);

        // Plan A: Cumplir la misión de eje asignada
        if (mission?.type === 'AXIS_ADVANCE') {
            // Buscar el mejor hex que esté EN LA DIRECCIÓN del objetivo del eje
            const potentialTargets = AiGameplayManager.findBestStrategicObjective(unit, 'expansion', mission.objective);
            if (potentialTargets.length > 0) {
                const targetHex = potentialTargets[0];
                const path = AiGameplayManager.findPathToTarget(unit, targetHex.r, targetHex.c);
                if (path && path.length > 1) {
                    const moveHex = path[Math.min(path.length - 1, unit.currentMovement || unit.movement)];
                    if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                        await _executeMoveUnit(unit, moveHex.r, moveHex.c);
                        return true;
                    }
                }
            }
        }
        
        // Plan B: Si no hay misión o falló, buscar mejor movimiento local (fallback)
        const localTarget = AiGameplayManager._findBestLocalMove(unit);
        if (localTarget) {
            await _executeMoveUnit(unit, localTarget.r, localTarget.c);
            return true;
        }

        console.log(`-> ${unit.name} no encontró movimiento válido. Esperando.`);
        return false;
    },

    ownedHexPercentage: function(playerNumber) {
        const allHexes = board.flat().filter(h => h);
        if(allHexes.length === 0) return 0;
        const ownedHexes = allHexes.filter(h => h.owner === playerNumber).length;
        return ownedHexes / allHexes.length;    
    },

    findBestStrategicObjective: function(unit, objectiveType = 'expansion', axisTarget = null) {
        const objectives = [];
        if (!unit) return [];
        
        board.flat().forEach(hex => {
            if (!hex || hex.owner === unit.player || hex.unit || TERRAIN_TYPES[hex.terrain].isImpassableForLand) return;
            
            let score = 0;
            // La unidad tiene asignado un EJE DE AVANCE
            if (axisTarget) {
                // Se calcula la "distancia al eje" (cuánto nos acerca al objetivo final del eje)
                const distToAxisTarget = hexDistance(hex.r, hex.c, axisTarget.r, axisTarget.c);
                
                // Queremos la casilla que más reduzca la distancia al objetivo final.
                // Una puntuación más alta para las casillas más cercanas al objetivo del eje.
                score = 1000 - distToAxisTarget; // El núcleo de la lógica de "mantener la dirección"
            
            } else { // Comportamiento por defecto si no hay eje (nunca debería pasar en T2+)
                score = 100 - hexDistance(unit.r, unit.c, hex.r, hex.c);
            }

            if (hex.resourceNode) score += 50; // Bonus por recursos
            if (hex.isCity) score += 200; // Bonus por ciudades

            if (score > 0) objectives.push({ hex, score });
        });
        
        objectives.sort((a, b) => b.score - a.score);
        return objectives.map(o => o.hex);
    },
    
    produceUnit: function(playerNumber, compositionTypes, role, name, specificSpot = null) {
        const playerRes = gameState.playerResources[playerNumber];
        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        const totalCost={oro:0,puntosReclutamiento:0}; 
        fullRegiments.forEach(reg=>{totalCost.oro+=reg.cost.oro||0;totalCost.puntosReclutamiento+=reg.cost.puntosReclutamiento||0;});
        
        if (playerRes.oro < totalCost.oro || playerRes.puntosReclutamiento < totalCost.puntosReclutamiento) {
            console.log(`   -> DIAGNÓSTICO PRODUCCIÓN: FALLO por recursos. Necesita ${totalCost.oro} Oro/${totalCost.puntosReclutamiento} PR. Tiene ${playerRes.oro}/${playerRes.puntosReclutamiento}.`); // <--- LOG 1
            return null;
        }

        let spot = specificSpot; 
        if (!spot) {
            const capital = gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber);
            if(!capital) return null;
            spot = getHexNeighbors(capital.r,capital.c).find(n=>board[n.r]?.[n.c]&&!board[n.r][n.c].unit&&!TERRAIN_TYPES[board[n.r][n.c].terrain].isImpassableForLand);
        }
        
        if (!spot) {
            console.log(`   -> DIAGNÓSTICO PRODUCCIÓN: FALLO por falta de espacio alrededor de la capital.`); // <--- LOG 2
            return null; 
        }

        playerRes.oro-=totalCost.oro;
        playerRes.puntosReclutamiento-=totalCost.puntosReclutamiento;
        const newUnit=AiGameplayManager.createUnitObject({regiments:fullRegiments,cost:totalCost,role,name},playerNumber,spot);
        placeFinalizedDivision(newUnit,spot.r,spot.c);
        AiGameplayManager.unitRoles.set(newUnit.id,role);
        return newUnit;
    },
    
    _findBestLocalMove: function(unit) {
        const reachableHexes = AiGameplayManager.getReachableHexes(unit);
        if (reachableHexes.length === 0) return null;

        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === unit.player);
        if (!aiCapital) return null; // No se puede decidir sin una referencia

        let bestLocalTarget = null;
        let maxScore = -Infinity;

        for (const hexCoords of reachableHexes) {
            const hexData = board[hexCoords.r]?.[hexCoords.c];
            if (hexData && hexData.owner === null) { // Solo casillas neutrales
                
                // <<< MEJORA CLAVE: La puntuación ahora se basa en la distancia a la capital >>>
                const score = hexDistance(aiCapital.r, aiCapital.c, hexCoords.r, hexCoords.c);
                
                if (score > maxScore) {
                    maxScore = score;
                    bestLocalTarget = hexCoords;
                }
            }
        }
        return bestLocalTarget;
    },

    executeGeneralMovement: async function(unit) {
        // --- PLAN A: Intentar moverse hacia el mejor objetivo estratégico a largo plazo ---
        const potentialTargets = AiGameplayManager.findBestStrategicObjective(unit);
        const availableTargets = potentialTargets.filter(hex => !AiGameplayManager.turn_targets.has(`${hex.r},${hex.c}`));
        
        if (availableTargets.length > 0) {
            const targetHex = availableTargets[0];
            const path = AiGameplayManager.findPathToTarget(unit, targetHex.r, targetHex.c);

            if (path && path.length > 1) {
                const moveHex = path[Math.min(path.length - 1, unit.currentMovement || unit.movement)];
                // Doble chequeo final para evitar colisiones
                if (!getUnitOnHex(moveHex.r, moveHex.c)) {
                    AiGameplayManager.turn_targets.add(`${targetHex.r},${targetHex.c}`);
                    console.log(`-> ${unit.name} ejecutando PLAN A: moviéndose hacia objetivo estratégico en (${targetHex.r}, ${targetHex.c})`);
                    await _executeMoveUnit(unit, moveHex.r, moveHex.c);
                    return true;
                }
            }
        }

        // --- PLAN B: Si el Plan A falló, buscar el mejor movimiento LOCAL posible ---
        console.log(`   -> Plan A falló para ${unit.name}. Buscando Plan B (movimiento local).`);
        const localTarget = AiGameplayManager._findBestLocalMove(unit);
        if (localTarget) {
            console.log(`%c-> ${unit.name} ejecutando PLAN B: moviéndose a la mejor casilla local disponible en (${localTarget.r}, ${localTarget.c})`, "color: yellow;");
            await _executeMoveUnit(unit, localTarget.r, localTarget.c);
            return true;
        }

        // --- PLAN C: Si todo lo demás falla, moverse a un hexágono adyacente para despejar ---
        console.log(`   -> Plan B falló para ${unit.name}. Buscando Plan C (despeje adyacente).`);
        const neighborHex = getHexNeighbors(unit.r, unit.c).find(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit);
        if(neighborHex) {
            console.log(`%c-> ${unit.name} ejecutando PLAN C: moviéndose a casilla adyacente (${neighborHex.r}, ${neighborHex.c}) para despejar.`, "color: orange;");
            await _executeMoveUnit(unit, neighborHex.r, neighborHex.c);
            return true;
        }

        console.log(`-> ${unit.name} no encontró ningún movimiento válido. Esperando.`);
        return false;
    },

    handlePressureProduction: function(playerNumber) {
        // Esta condición es para el medio juego: no estamos en la apertura, pero aún no dominamos.
        if (AiGameplayManager.ownedHexPercentage(playerNumber) < 0.6 && units.filter(u => u.player === playerNumber).length < 25) {
            
            const unitsOfType = (type) => units.filter(u => u.player === playerNumber && u.regiments.some(r => r.type === type)).length;
            
            // Mantener una fuerza mínima de unidades rápidas
            if (unitsOfType('Caballería Ligera') < 4) {
                console.log(`[IA Empire] Produciendo Caballería para mantener la presión.`);
                AiGameplayManager.produceUnit(playerNumber, ['Caballería Ligera'], 'explorer', 'Incursor');
            } else {
                console.log(`[IA Empire] Produciendo Infantería para rellenar huecos.`);
                AiGameplayManager.produceUnit(playerNumber, ['Infantería Ligera'], 'explorer', 'Explorador');
            }
        }
    },

    handleConstruction: async function(playerNumber) {
        // No construir antes del turno 6 o si la situación es crítica.
        if (gameState.turnNumber < 6 || AiGameplayManager.codeRed_rallyPoint) return;

        const fortresses = board.flat().filter(h => h && h.owner === playerNumber && h.structure === 'Fortaleza').length;
        // Límite de fortalezas para que no se exceda.
        if (fortresses >= 2) return;

        // Buscar el mejor lugar para una nueva fortaleza.
        const bestFortSpot = AiGameplayManager.findBestStrategicObjective(null, 'fortress_spot')[0];
        if (bestFortSpot && bestFortSpot.owner === playerNumber && !bestFortSpot.structure) {
            
            const playerRes = gameState.playerResources[playerNumber];
            const tech = 'FORTIFICATIONS';
            const cost = STRUCTURE_TYPES['Fortaleza'].cost.oro; // Simplificado a oro por ahora

            if ((playerRes.researchedTechnologies || []).includes(tech) && playerRes.oro > cost) {
                console.log(`%c[IA Empire] MISIÓN DE CONSTRUCCIÓN: Fortaleza en (${bestFortSpot.r},${bestFortSpot.c}).`, "color: #DAA520");
                // Aquí, en una versión futura, buscaría un Ingeniero.
                // Por ahora, asumimos que puede construir sin una unidad específica para simplificar.
                handleConfirmBuildStructure({ 
                    playerId: playerNumber, 
                    r: bestFortSpot.r, 
                    c: bestFortSpot.c, 
                    structureType: 'Fortaleza', 
                    builderUnitId: null 
                });
                // Pequeña pausa para que la acción se procese.
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    },

    endAiTurn: function(playerNumber) {
        if (gameState.currentPhase !== "gameOver" && gameState.currentPlayer === playerNumber) {
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
                setTimeout(() => { if(domElements.endTurnBtn) domElements.endTurnBtn.click(); }, 500);
            }
        }
    }

};

// --- IMPLEMENTACIÓN COMPLETA DE FUNCIONES AUXILIARES SIN CAMBIOS ---
AiGameplayManager.decideAndExecuteUnitAction = async function(unit) { console.groupCollapsed(`Decidiendo para ${unit.name} (${unit.regiments.length} regs) en (${unit.r},${unit.c})`); try { if (AiGameplayManager.codeRed_rallyPoint && unit.id !== AiGameplayManager.codeRed_rallyPoint.anchorId) { await AiGameplayManager.moveToRallyPoint(unit); return; } if (unit.regiments.length < 5 && AiGameplayManager.unitRoles.get(unit.id) !== 'defender') { if (await AiGameplayManager.findAndExecuteMerge_Proactive(unit)) { return; } } const enemyPlayer = unit.player === 1 ? 2 : 1; const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0); if (enemies.length > 0) { await AiGameplayManager._executeCombatLogic(unit, enemies); } else { await AiGameplayManager._executeExpansionLogic(unit); } } catch(e) { console.error(`Error procesando ${unit.name}:`, e); } finally { console.groupEnd(); } };
AiGameplayManager.assessThreatLevel = AiGameplayManager.assessThreatLevel = function(playerNumber) { const enemyPlayer = playerNumber===1?2:1; const aiUnits=units.filter(u=>u.player===playerNumber); const enemyUnits=units.filter(u=>u.player===enemyPlayer); if(enemyUnits.length===0||aiUnits.length===0)return; const biggestEnemyFormation=enemyUnits.reduce((max,unit)=>(unit.regiments.length>max?unit.regiments.length:max),0); if(biggestEnemyFormation>10){aiUnits.sort((a,b)=>b.regiments.length-a.regiments.length);const anchorUnit=aiUnits[0];AiGameplayManager.codeRed_rallyPoint={r:anchorUnit.r,c:anchorUnit.c,anchorId:anchorUnit.id};console.log(`%c[IA] CÓDIGO ROJO! Amenaza masiva detectada (${biggestEnemyFormation} reg.). Punto de reunión en ${anchorUnit.name} (${anchorUnit.r},${anchorUnit.c})`,"color: red; font-weight: bold;");}};
AiGameplayManager.moveToRallyPoint = async function(unit) { const rallyR=AiGameplayManager.codeRed_rallyPoint.r;const rallyC=AiGameplayManager.codeRed_rallyPoint.c; if(hexDistance(unit.r,unit.c,rallyR,rallyC)<=1){const anchorUnit=units.find(u=>u.id===AiGameplayManager.codeRed_rallyPoint.anchorId);if(anchorUnit&&(anchorUnit.regiments.length+unit.regiments.length<=MAX_REGIMENTS_PER_DIVISION)){await _executeMoveUnit(unit,rallyR,rallyC,true);const unitOnTarget=units.find(u=>u.id===anchorUnit.id);if(unitOnTarget){mergeUnits(unit,unitOnTarget);}}}else{const path=AiGameplayManager.findPathToTarget(unit,rallyR,rallyC);if(path&&path.length>1){const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];await _executeMoveUnit(unit,moveHex.r,moveHex.c);}}};
AiGameplayManager._executeExpansionLogic = async function(unit) { const canSplit=unit.regiments.length>2&&unit.regiments.length<8;const freeNeighbor=getHexNeighbors(unit.r,unit.c).find(n=>board[n.r]?.[n.c]&&!board[n.r][n.c].unit&&!TERRAIN_TYPES[board[n.r][n.c].terrain].isImpassableForLand);if(canSplit&&freeNeighbor){const splitCount=Math.ceil(unit.regiments.length/2);const newUnitRegs=unit.regiments.slice(0,splitCount);const originalUnitRegs=unit.regiments.slice(splitCount);gameState.preparingAction={newUnitRegiments:newUnitRegs,remainingOriginalRegiments:originalUnitRegs};splitUnit(unit,freeNeighbor.r,freeNeighbor.c);}else{await AiGameplayManager.executeGeneralMovement(unit);}};
AiGameplayManager._executeMoveAndAttack = async function(unit,moveHex,target){if(moveHex){await _executeMoveUnit(unit,moveHex.r,moveHex.c);} const unitAfterMove=units.find(u=>u.id===unit.id);if(unitAfterMove?.currentHealth>0&&!unitAfterMove.hasAttacked&&isValidAttack(unitAfterMove,target)){await attackUnit(unitAfterMove,target);}};
AiGameplayManager.findAndExecuteMerge_Proactive = async function(unit){const potentialAllies=units.filter(u=>u.player===unit.player&&u.id!==unit.id&&!u.hasMoved&&(unit.regiments.length+u.regiments.length)<=MAX_REGIMENTS_PER_DIVISION);if(potentialAllies.length===0)return false;potentialAllies.sort((a,b)=>{const strengthDiff=b.regiments.length-a.regiments.length;if(strengthDiff!==0)return strengthDiff;return hexDistance(unit.r,unit.c,a.r,a.c)-hexDistance(unit.r,unit.c,b.r,b.c);});const bestAllyToMergeWith=potentialAllies[0];const path=AiGameplayManager.findPathToTarget(unit,bestAllyToMergeWith.r,bestAllyToMergeWith.c);if(path&&(path.length-1)<=(unit.currentMovement||unit.movement)){await _executeMoveUnit(unit,bestAllyToMergeWith.r,bestAllyToMergeWith.c,true);const remainingAlly=units.find(u=>u.id===bestAllyToMergeWith.id);const movedUnit=units.find(u=>u.id===unit.id);if(remainingAlly&&movedUnit){mergeUnits(movedUnit,remainingAlly);return true;}} return false;};
AiGameplayManager.findAndExecuteMerge_Reactive = async function(unit,attackTarget){const allies=units.filter(u=>u.player===unit.player&&u.id!==unit.id&&!u.hasMoved&&(unit.regiments.length+u.regiments.length)<=MAX_REGIMENTS_PER_DIVISION);let bestMergePartner=null;let bestPostMergeScore=-Infinity;const currentOutcome=predictCombatOutcome(unit,attackTarget);let currentScore=(currentOutcome.damageToDefender*2)-(currentOutcome.damageToAttacker*1.5);for(const ally of allies){if(hexDistance(unit.r,unit.c,ally.r,ally.c)<=(ally.currentMovement||ally.movement)){const combinedRegs=[...unit.regiments,...ally.regiments];const tempSuperUnit=JSON.parse(JSON.stringify(unit));tempSuperUnit.regiments=combinedRegs;recalculateUnitStats(tempSuperUnit);tempSuperUnit.currentHealth=unit.currentHealth+ally.currentHealth;const outcome=predictCombatOutcome(tempSuperUnit,attackTarget);let score=(outcome.damageToDefender*2)-(outcome.damageToAttacker*1.5);if(score>currentScore&&score>bestPostMergeScore){bestPostMergeScore=score;bestMergePartner=ally;}}} if(bestMergePartner){await _executeMoveUnit(bestMergePartner,unit.r,unit.c,true);const unitOnTarget=units.find(u=>u.id===unit.id);if(unitOnTarget){mergeUnits(bestMergePartner,unitOnTarget);return{merged:true,allyId:bestMergePartner.id};}} return null;};
AiGameplayManager.executeDefenderMovement=async function(unit){let targetCoords=null;for(const zona in gameState.ai_reaction_forces){if(gameState.ai_reaction_forces[zona].unitId===unit.id){targetCoords=gameState.ai_reaction_forces[zona].targetCoords;break;}} if(targetCoords){const path=AiGameplayManager.findPathToTarget(unit,targetCoords.r,targetCoords.c);if(path&&path.length>1){const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];await _executeMoveUnit(unit,moveHex.r,moveHex.c);return true;}} AiGameplayManager.unitRoles.set(unit.id,'explorer');return await AiGameplayManager.executeGeneralMovement(unit);};
AiGameplayManager.handleConstruction = function(playerNumber){const capital=gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber);if(!capital)return;if(gameState.turnNumber%5!==0||AiGameplayManager.codeRed_rallyPoint)return;const playerRes=gameState.playerResources[playerNumber];if(playerRes.oro>800&&(playerRes.researchedTechnologies||[]).includes('FORTIFICATIONS')){const bestFortSpot=AiGameplayManager.findBestStrategicObjective(null,'fortress_spot');if(bestFortSpot){if(bestFortSpot.owner===playerNumber&&!bestFortSpot.structure){console.log(`%c[IA STRATEGY] Construyendo Fortaleza en (${bestFortSpot.r},${bestFortSpot.c})...`,"color: #ff8c00");handleConfirmBuildStructure({playerId:playerNumber,r:bestFortSpot.r,c:bestFortSpot.c,structureType:'Fortaleza',builderUnitId:null});}}}};
AiGameplayManager.handleStrategicReinforcements=function(playerNumber){const{frentes,necesitaRefuerzos}=AiGameplayManager.analyzeFrontera(playerNumber);if(!gameState.ai_reaction_forces)gameState.ai_reaction_forces={};if(necesitaRefuerzos){for(const zona in frentes){const frente=frentes[zona];if(frente.aiPower<frente.enemyPower){const fuerzaAsignada=gameState.ai_reaction_forces[zona]?units.find(u=>u.id===gameState.ai_reaction_forces[zona].unitId&&u.currentHealth>0):null;if(!fuerzaAsignada){const capital=gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber);if(!capital)continue;const neededPower=(frente.enemyPower-frente.aiPower)*1.2;let composition=[];let currentPower=0;while(currentPower<neededPower){composition.push('Infantería Pesada');const regHeavy=REGIMENT_TYPES['Infantería Pesada'];currentPower+=(regHeavy.attack+regHeavy.defense)/2;if(currentPower>=neededPower)break;composition.push('Arqueros');const regArcher=REGIMENT_TYPES['Arqueros'];currentPower+=(regArcher.attack+regArcher.defense)/2;} const newUnit=AiGameplayManager.produceUnit(playerNumber,composition,'defender',`Defensa-${zona}`);if(newUnit)gameState.ai_reaction_forces[zona]={unitId:newUnit.id,targetCoords:frente.enemyCenter};}}}}};
AiGameplayManager.analyzeFrontera=function(playerNumber){const enemyPlayer=playerNumber===1?2:1;const cols=board[0].length;const zonaWidth=Math.floor(cols/3);const zonas={'Flanco-Izquierdo':{minCol:0,maxCol:zonaWidth,aiPower:0,enemyPower:0,enemyUnits:[]},'Centro':{minCol:zonaWidth+1,maxCol:zonaWidth*2,aiPower:0,enemyPower:0,enemyUnits:[]},'Flanco-Derecho':{minCol:(zonaWidth*2)+1,maxCol:cols,aiPower:0,enemyPower:0,enemyUnits:[]}};const getZona=(c)=>{if(c<=zonas['Flanco-Izquierdo'].maxCol)return 'Flanco-Izquierdo';if(c<=zonas['Centro'].maxCol)return 'Centro';return 'Flanco-Derecho';};units.forEach(unit=>{if(unit.currentHealth>0){const zona=getZona(unit.c);if(!zonas[zona])return;const power=(unit.attack+unit.defense)/2;if(unit.player===playerNumber){zonas[zona].aiPower+=power;}else if(unit.player===enemyPlayer){zonas[zona].enemyPower+=power;zonas[zona].enemyUnits.push(unit);}}});for(const zona in zonas){const frente=zonas[zona];if(frente.enemyUnits.length>0){const avgR=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.r,0)/frente.enemyUnits.length);const avgC=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.c,0)/frente.enemyUnits.length);frente.enemyCenter={r:avgR,c:avgC};}}const necesitaRefuerzos=Object.values(zonas).some(z=>z.aiPower<z.enemyPower);return{frentes:zonas,necesitaRefuerzos};};
AiGameplayManager.findBestOverallAttack = function(unit, enemies) { let bestAction = null; let bestScore = -Infinity; const reachableHexes = AiGameplayManager.getReachableHexes(unit); reachableHexes.push({r: unit.r, c: unit.c, cost: 0}); for (const movePos of reachableHexes) { const tempAttacker = {...unit, r:movePos.r, c:movePos.c}; for (const enemy of enemies) { if(isValidAttack(tempAttacker, enemy)) { const outcome = predictCombatOutcome(tempAttacker, enemy); let score = (outcome.damageToDefender * 2) - (outcome.damageToAttacker * 1.5); if(outcome.defenderDies) score += 100; if(outcome.attackerDiesInRetaliation) score -= 500; score -= (movePos.cost || 0) * 2; if (score > bestScore) { bestScore = score; bestAction = { score, target: enemy, moveHex: (movePos.r !== unit.r || movePos.c !== unit.c) ? movePos : null, isFavorable: !outcome.attackerDiesInRetaliation && outcome.damageToDefender > outcome.damageToAttacker * 1.2, isSuicidal: outcome.attackerDiesInRetaliation || outcome.damageToAttacker > outcome.damageToDefender * 1.2}; } } } } return bestAction; };
AiGameplayManager.getReachableHexes = function(unit) { let reachable=[];let queue=[{r:unit.r,c:unit.c,cost:0}];let visited=new Set([`${unit.r},${unit.c}`]);const maxMove=unit.currentMovement||unit.movement;while(queue.length>0){let curr=queue.shift();for(const n of getHexNeighbors(curr.r,curr.c)){const key=`${n.r},${n.c}`;if(!visited.has(key)){visited.add(key);const neighborHex=board[n.r]?.[n.c];if(neighborHex&&!neighborHex.unit&&!TERRAIN_TYPES[neighborHex.terrain].isImpassableForLand){const moveCost=TERRAIN_TYPES[neighborHex.terrain]?.movementCostMultiplier||1;const newCost=curr.cost+moveCost;if(newCost<=maxMove){reachable.push({r:n.r,c:n.c,cost:newCost});queue.push({r:n.r,c:n.c,cost:newCost});}}}}}return reachable;};
AiGameplayManager.createUnitObject = function(definition, playerNumber, spot) { const stats=calculateRegimentStats(definition.regiments, playerNumber); const unit = { id: `u${unitIdCounter++}`, player: playerNumber, name: definition.name, regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})), ...stats, currentHealth: stats.maxHealth, currentMovement: stats.movement, r: spot.r, c: spot.c, hasMoved: false, hasAttacked: false, level: 0, experience: 0, morale: 50, maxMorale: 125, }; recalculateUnitStats(unit); return unit; };