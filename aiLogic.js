// aiLogic.js
console.log("aiLogic.js CARGADO - Estructura IA con funciones de decisión segmentadas (Versión COMPLETA con lógica inicial)");

const AiManager = {
    // --- Propiedades de Configuración ---
    config: {
        actionProbability: 0.9, 
        strategicFocus: { research: 0.6, resourceControl: 0.8, enemyUnits: 0.85, enemyCapital: 0.9 },
        combatRiskAversion: 0.4, 
        maxRegimentsPerDivision: (typeof MAX_REGIMENTS_PER_DIVISION !== 'undefined' ? MAX_REGIMENTS_PER_DIVISION : 6)
    },
    
    unitRoles: new Map(), // Guardará el rol de cada unidad por su ID. Ej: 'u123' -> 'explorer'

    // --- FUNCIÓN PRINCIPAL DEL TURNO DE LA IA ---

    executeTurn: function(aiPlayerNumber, aiLevel) {
    try { // <-- AÑADIR TRY
        console.log(`%c[AI Manager] executeTurn: INICIO para Jugador IA ${aiPlayerNumber} (Nivel: ${aiLevel})`, "color: purple; font-weight:bold;");
        
        this.adjustConfigForLevel(aiLevel);
        this.manageEmpire(aiPlayerNumber, aiLevel);

        const activeAiUnits = units.filter(u => u.player === aiPlayerNumber && u.currentHealth > 0 && u.r !== -1 && u.c !== -1);
        
        if (activeAiUnits.length === 0) {
            console.log(`%c[AI Manager] Jugador IA ${aiPlayerNumber} no tiene unidades activas en el tablero. Finalizando turno.`, "color: purple;");
            this.endAiTurn(aiPlayerNumber, 0);
            return;
        }
        
        console.log(`%c[AI Manager] Jugador IA ${aiPlayerNumber} procesará ${activeAiUnits.length} unidades activas.`, "color: purple;");
        let unitIndex = 0;
        let actionsPerformedInTurn = 0;

        const processNextUnit = async () => {
            if (gameState.currentPhase === "gameOver" || unitIndex >= activeAiUnits.length) {
                this.endAiTurn(aiPlayerNumber, actionsPerformedInTurn);
                return;
            }
            const unit = activeAiUnits[unitIndex];
            unitIndex++;

            if (unit.currentHealth > 0 && (!unit.hasMoved || !unit.hasAttacked)) {
                console.log(`%c[AI Manager] Procesando unidad: ${unit.name} (HP: ${unit.currentHealth}, Mov: ${unit.currentMovement}, M:${unit.hasMoved}, A:${unit.hasAttacked})`, "color: blue");
                const actionPerformed = await this.decideAndExecuteUnitAction(unit, aiPlayerNumber, aiLevel);
                if (actionPerformed) {
                    console.log(`%c[AI Manager] >>> ¡ACCIÓN REALIZADA por ${unit.name}!`, "color: green; font-weight: bold;");
                    actionsPerformedInTurn++;
                } else {
                    console.log(`%c[AI Manager] >>> ${unit.name} no realizó ninguna acción.`, "color: orange;");
                }
            }
            
            if (gameState.currentPhase === "gameOver") { this.endAiTurn(aiPlayerNumber, actionsPerformedInTurn); return; }
            setTimeout(processNextUnit, 600 + Math.random() * 300);
        };
        processNextUnit();
    } catch (error) { // <-- AÑADIR CATCH
        console.error(`ERROR CRÍTICO en AiManager.executeTurn:`, error);
        this.endAiTurn(aiPlayerNumber, -1); // Finalizar turno para evitar que el juego se congele
    }
    },

    adjustConfigForLevel: function(aiLevel) {
        if (aiLevel === 'easy') {
            this.config.actionProbability = 0.7; this.config.strategicFocus.research = 0.4; this.config.combatRiskAversion = 0.8;
        } else if (aiLevel === 'normal') {
            this.config.actionProbability = 0.9; this.config.strategicFocus.research = 0.6; this.config.combatRiskAversion = 0.5;
        } else if (aiLevel === 'hard') {
            this.config.actionProbability = 1.0; this.config.strategicFocus.research = 0.7; this.config.combatRiskAversion = 0.3;
        }
    },

    manageEmpire: function(aiPlayerNumber, aiLevel) {
    this.decideResearch(aiPlayerNumber, aiLevel);
    this.decideUnitProduction(aiPlayerNumber);
    this.decideConstruction(aiPlayerNumber); // <-- AÑADIR ESTA LLAMADA
    },

    decideConstruction: function(aiPlayerNumber) {
        const playerRes = gameState.playerResources[aiPlayerNumber];
        if (playerRes.piedra < 20 && playerRes.madera < 20) return; // No tiene recursos ni para pensar en construir

        // Prioridad 1: Fortificar un punto estratégico
        const chokepoint = this.findBestChokepoint(aiPlayerNumber);
        if (chokepoint && !board[chokepoint.r][chokepoint.c].structure) {
            const unitOnChokepoint = getUnitOnHex(chokepoint.r, chokepoint.c);
            if (unitOnChokepoint && unitOnChokepoint.player === aiPlayerNumber) {
                // Si una unidad IA está en el chokepoint, construir una fortaleza si es posible.
                // (Esta es una simplificación, la unidad debería tener la habilidad de construir)
                // Por ahora, solo lo logueamos.
                console.log(`[AI Construction] DECISIÓN: Debería construir una Fortaleza en (${chokepoint.r},${chokepoint.c})`);
            }
        }
    },


    decideResearch: function(aiPlayerNumber, aiLevel) {
        if (!gameState || !gameState.playerResources || !gameState.playerResources[aiPlayerNumber] || typeof TECHNOLOGY_TREE_DATA === 'undefined') { return; }
        const playerState = gameState.playerResources[aiPlayerNumber];
        const researchedTechs = playerState.researchedTechnologies || [];
        const availableToResearch = (typeof getAvailableTechnologies === "function") ? getAvailableTechnologies(researchedTechs) : [];
        if (availableToResearch.length === 0) { return; }
        availableToResearch.sort((a,b) => (a.cost?.researchPoints || Infinity) - (b.cost?.researchPoints || Infinity));
        let chosenTech = null;
        for (const tech of availableToResearch) {
            let canAfford = true;
            if (tech.cost) {
                for (const resourceKey in tech.cost) {
                    if ((playerState[resourceKey] || 0) < tech.cost[resourceKey]) { canAfford = false; break; }
                }
            }
            if (canAfford) { chosenTech = tech; break; }
        }
        if (chosenTech) {
            console.log(`[AI Research - AiManager] Jugador ${aiPlayerNumber} investiga: ${chosenTech.name}`);
            if (chosenTech.cost) {
                for (const resourceKey in chosenTech.cost) { playerState[resourceKey] = (playerState[resourceKey] || 0) - chosenTech.cost[resourceKey]; }
            }
            if (!researchedTechs.includes(chosenTech.id)) { researchedTechs.push(chosenTech.id); }
            if (typeof logMessage === "function") logMessage(`IA (Jugador ${aiPlayerNumber}) ha investigado: ${chosenTech.name}!`);
        }
    },

    decideAndExecuteUnitAction: async function(unit, aiPlayerNumber, aiLevel) {
    let actionPerformed = false;

    try {
            let unitRole = this.unitRoles.get(unit.id);

            // Si una unidad pierde su rol (ej. por carga de partida), se le asigna uno.
            if (!unitRole) {
                unitRole = 'conqueror'; // Rol por defecto
                this.unitRoles.set(unit.id, unitRole);
            }
            
            console.log(`%c[AI Unit Decide: ${unit.name} - Rol: ${unitRole.toUpperCase()}]`, "color: #DAA520; font-weight:bold;");

            const enemyPlayer = aiPlayerNumber === 1 ? 2 : 1;

            // --- ACCIÓN DE MÁXIMA PRIORIDAD: Autodefensa o ataque de oportunidad ---
            if (!unit.hasAttacked) {
                actionPerformed = await this.attemptOpportunisticAttack(unit, aiPlayerNumber, aiLevel, enemyPlayer);
            }

            // Priorizamos la fusión si mejora la unidad ANTES de decidir su rol,
            // Y si aún tiene movimiento o no ha hecho NADA este turno.
            if (!actionPerformed && !unit.hasMoved && !unit.hasAttacked) { 
                console.log(`[AI Action - Pre-Role] ${unit.name} buscando fusión beneficiosa...`);
                const mergePerformed = this.findAndExecuteMergeAction(unit, aiPlayerNumber, aiLevel);
                if (mergePerformed) {
                    actionPerformed = true; // La fusión cuenta como una acción.
                    console.log(`[AI Action] Fusión realizada para ${unit.name}.`);
                }
            }

            // --- LÓGICA DE ROL ---
            if (!actionPerformed) {
                switch (unitRole) {
                    case 'conqueror':
                        actionPerformed = await this.executeConquerorLogic(unit, aiPlayerNumber, enemyPlayer);
                        break;
                    case 'explorer':
                        actionPerformed = await this.executeExplorerLogic(unit, aiPlayerNumber);
                        break;
                    case 'defender':
                        actionPerformed = await this.executeDefenderLogic(unit, aiPlayerNumber, enemyPlayer);
                        break;
                    case 'attacker':
                        actionPerformed = await this.executeAttackerLogic(unit, aiPlayerNumber, enemyPlayer);
                        break;
                    case 'saboteur':
                        actionPerformed = await this.executeSaboteurLogic(unit, aiPlayerNumber, enemyPlayer);
                        break;
                }
            }

            // --- ACCIÓN DE FALLBACK: Si no se hizo nada, moverse hacia un enemigo ---
            if (!actionPerformed && !unit.hasMoved) {
                actionPerformed = await this.executeGeneralMovement(unit, aiPlayerNumber, aiLevel, enemyPlayer);
            }
        } catch (error) { 
        console.error(`ERROR CRÍTICO en decideAndExecuteUnitAction para la unidad ${unit.name} (ID: ${unit.id}):`, error);
        return false; // Devuelve false para que el bucle continúe con la siguiente unidad
    }

        return actionPerformed;
    },

    // --- C1: Defensa de la Capital ---
    isCapitalUnderImmediateThreat: function(aiPlayerNumber, checkingUnit, enemyPlayer) {
        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === aiPlayerNumber);
        if (!aiCapital) return false;
        const playerKeyForVisibility = `player${aiPlayerNumber}`;
        const threats = units.filter(u => 
            u.player === enemyPlayer && u.currentHealth > 0 &&
            board[u.r]?.[u.c]?.visibility[playerKeyForVisibility] === 'visible' &&
            hexDistance(u.r, u.c, aiCapital.r, aiCapital.c) <= ((u.currentMovement || u.movement || 1) + (u.attackRange || 1)) // Puede llegar y atacar
        );
        if (threats.length > 0) {
            // console.log(`[AI DEFEND CHECK] Capital IA (${aiCapital.r},${aiCapital.c}) AMENAZADA por ${threats.map(t=>t.name).join(', ')}.`);
            return true;
        }
        return false;
    },

    attemptToDefendCapital: async function(unit, aiPlayerNumber, aiLevel, enemyPlayer) {
        // console.log(`[AI DEFEND] ${unit.name} intentando defender capital.`);
        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === aiPlayerNumber);
        if (!aiCapital) return false;
        const playerKeyForVisibility = `player${aiPlayerNumber}`;
        // Prioridad 1: Atacar a un enemigo que amenaza directamente la capital
        if (!unit.hasAttacked) {
            const enemiesThreateningCapital = units.filter(e => 
                e.player === enemyPlayer && e.currentHealth > 0 &&
                board[e.r]?.[e.c]?.visibility[playerKeyForVisibility] === 'visible' &&
                hexDistance(e.r, e.c, aiCapital.r, aiCapital.c) <= (e.attackRange || 1) && // Ya en rango de atacar la capital o adyacente
                isValidAttack(unit, e) // La unidad actual puede atacar a esta amenaza
            );
            if (enemiesThreateningCapital.length > 0) {
                enemiesThreateningCapital.sort((a,b)=> a.currentHealth - b.currentHealth); // Atacar al más débil
                console.log(`[AI ACTION - DEFEND CAPITAL - ATTACK] ${unit.name} -> ${enemiesThreateningCapital[0].name}`);
                await attackUnit(unit, enemiesThreateningCapital[0]);
                return true; // Acción realizada
            }
        }
        // Prioridad 2: Moverse a la capital o a un hexágono adyacente para defender
        if (!unit.hasMoved && (unit.currentMovement || 0) > 0) {
            let targetHexForDefense = {r: aiCapital.r, c: aiCapital.c};
            // Si la capital está ocupada por un amigo, intentar moverse a un hexágono adyacente vacío
            const unitAtCapital = getUnitOnHex(aiCapital.r, aiCapital.c);
            if (unitAtCapital && unitAtCapital.player === aiPlayerNumber && unitAtCapital.id !== unit.id) { 
                const openNeighbors = getHexNeighbors(aiCapital.r, aiCapital.c).filter(n => !getUnitOnHex(n.r, n.c) && isValidMove(unit, n.r, n.c, false));
                if (openNeighbors.length > 0) {
                    // Elegir el vecino más cercano a la unidad actual (o uno al azar)
                    openNeighbors.sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
                    targetHexForDefense = openNeighbors[0];
                } else { // No hay vecinos vacíos, intentar moverse a la capital si está vacía
                    if (unitAtCapital) return false; // No puede moverse a la capital si está ocupada por otro amigo
                }
            } else if (unitAtCapital && unitAtCapital.id === unit.id) { // Ya está en la capital
                return false; // No necesita moverse
            }

            if (isValidMove(unit, targetHexForDefense.r, targetHexForDefense.c, false)) {
                const bestMoveStep = this.findPathToTarget(unit, targetHexForDefense.r, targetHexForDefense.c, true);
                if (bestMoveStep) {
                    console.log(`[AI ACTION - DEFEND CAPITAL - MOVE] ${unit.name} -> (${bestMoveStep.r},${bestMoveStep.c}) hacia capital.`);
                    await moveUnit(unit, bestMoveStep.r, bestMoveStep.c);
                    return true; // Acción realizada
                }
            }
        }
        return false; // No se pudo realizar acción defensiva
    },

    // --- C3: Ataque Oportunista ---
    attemptOpportunisticAttack: async function(unit, aiPlayerNumber, aiLevel, enemyPlayer) {
        console.log(`%c[AI ActionCheck - OpportunisticAttack] Para ${unit.name}`, "color: coral");
        if (!unit.hasAttacked) {
            const immediateTarget = this.findBestImmediateAttackTarget(unit, aiPlayerNumber, aiLevel, enemyPlayer);
            console.log(`%c  L-> Immediate Target found: ${immediateTarget ? immediateTarget.name : 'null'}`, "color: coral");
            if (immediateTarget) {
                console.log(`%c    L-> ATACANDO INMEDIATO a ${immediateTarget.name}`, "color: red");
                await attackUnit(unit, immediateTarget);
                return true;
            }
        }
        if (!unit.hasMoved && (unit.currentMovement || 0) > 0 && !unit.hasAttacked) {
            const moveAttackPlan = this.findBestMoveAndAttackAction(unit, aiPlayerNumber, aiLevel, enemyPlayer);
            console.log(`%c  L-> Move & Attack Plan: ${moveAttackPlan ? `Mover a (${moveAttackPlan.moveCoords.r},${moveAttackPlan.moveCoords.c}) para atacar a ${moveAttackPlan.targetUnit.name}` : 'null'}`, "color: coral");
            if (moveAttackPlan) {
                console.log(`%c    L-> MOVIENDO Y ATACANDO. Mover a (${moveAttackPlan.moveCoords.r},${moveAttackPlan.moveCoords.c})`, "color: red");
                await moveUnit(unit, moveAttackPlan.moveCoords.r, moveAttackPlan.moveCoords.c);
                if (unit.currentHealth > 0 && !unit.hasAttacked && isValidAttack(unit, moveAttackPlan.targetUnit)) {
                    console.log(`%c    L-> ATACANDO DESPUÉS DE MOVER a ${moveAttackPlan.targetUnit.name}`, "color: red");
                    await attackUnit(unit, moveAttackPlan.targetUnit);
                }
                return true;
            }
        }
        console.log(`%c  L-> No se encontró acción de ataque oportunista.`, "color: coral");
        return false;
    },
    
    // --- C5: Control de Recursos ---
    // Reemplaza la función attemptSecureResource completa con esta versión
    attemptSecureResource: async function(unit, aiPlayerNumber, aiLevel, enemyPlayer) {
        if (unit.hasMoved || (unit.currentMovement || 0) <= 0) return false;

        let resourceTargets = [];
        if (board && board.length > 0 && board[0].length > 0) {
            for (let r = 0; r < board.length; r++) {
                for (let c = 0; c < board[0].length; c++) {
                    if (board[r][c]?.resourceNode && board[r][c].owner !== aiPlayerNumber) {
                        resourceTargets.push({ r, c, owner: board[r][c].owner, type: board[r][c].resourceNode });
                    }
                }
            }
        } else { return false; }

        if (resourceTargets.length > 0) {
            // <<-- LÓGICA DE ORDENACIÓN ESTRATÉGICA -->>
            resourceTargets.sort((a, b) => {
                const priorityA = AI_RESOURCE_PRIORITY[a.type.replace('_mina', '')] || 0;
                const priorityB = AI_RESOURCE_PRIORITY[b.type.replace('_mina', '')] || 0;
                // 1. Ordenar por prioridad del recurso (descendente)
                if (priorityA !== priorityB) return priorityB - priorityA;
                // 2. Si la prioridad es la misma, priorizar los neutrales
                const isANeutral = a.owner === null;
                const isBNeutral = b.owner === null;
                if (isANeutral !== isBNeutral) return isBNeutral ? 1 : -1;
                // 3. Si todo es igual, ir al más cercano
                return hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c);
            });

            const targetResourceHex = resourceTargets[0];
            console.log(`%c[AI SecureResource] ${unit.name} -> Objetivo estratégico: ${targetResourceHex.type} en (${targetResourceHex.r},${targetResourceHex.c})`, "color: #ff7f50");

            let bestMove = this.findPathToTarget(unit, targetResourceHex.r, targetResourceHex.c);
            if (bestMove) {
                console.log(`%c    L-> MOVIENDO HACIA RECURSO a (${bestMove.r},${bestMove.c})`, "color: red");
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            }
        }
        return false;
    },

    // --- C6: Mantener Suministro ---
    tryMoveToSupply: async function(unit, aiPlayerNumber, aiLevel) {
        console.log(`%c[AI ActionCheck - MoveToSupply] Para ${unit.name}`, "color: coral");
        if (unit.hasMoved || (unit.currentMovement || 0) <= 0) {
            console.log(`%c  L-> Ya movió o sin movimiento.`, "color: coral");
            return false;
        }
        const myCapitals = gameState.cities.filter(c => c.isCapital && c.owner === aiPlayerNumber);
        if (myCapitals.length > 0) {
            myCapitals.sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
            const targetSupplySource = myCapitals[0];
            console.log(`%c  L-> Objetivo de Suministro (Capital): (${targetSupplySource.r},${targetSupplySource.c}). Dist: ${hexDistance(unit.r,unit.c,targetSupplySource.r,targetSupplySource.c)}`, "color: coral");
            let bestMove = this.findPathToTarget(unit, targetSupplySource.r, targetSupplySource.c, true); // true para isFinalDestination
            if (bestMove) {
                console.log(`%c    L-> MOVIENDO HACIA SUMINISTRO a (${bestMove.r},${bestMove.c})`, "color: red");
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            } else {
                console.log(`%c  L-> No se encontró ruta al suministro.`, "color: coral");
            }
        } else {
            console.log(`%c  L-> No hay capitales propias como fuente de suministro.`, "color: coral");
        }
        return false;
    },

    // --- C7: Movimiento General ---
    executeGeneralMovement: async function(unit, aiPlayerNumber, aiLevel, enemyPlayer) {
        if (unit.hasMoved || (unit.currentMovement || 0) <= 0) return false;

        let targetDestination = null;
        let targetType = "";

        // 1. Buscar el recurso no controlado más prioritario y cercano como objetivo general
        const strategicResourceTarget = this.findBestStrategicObjective(unit, aiPlayerNumber);
        if (strategicResourceTarget) {
            targetDestination = { r: strategicResourceTarget.r, c: strategicResourceTarget.c };
            targetType = `recurso estratégico (${strategicResourceTarget.type})`;
        } else {
            // 2. Si no hay objetivos de recursos, buscar la capital enemiga
            const enemyCapital = gameState.cities.find(city => city.isCapital && city.owner === enemyPlayer);
            if (enemyCapital) {
                targetDestination = { r: enemyCapital.r, c: enemyCapital.c };
                targetType = "capital enemiga";
            }
        }
        
        // 3. Como último recurso, buscar al enemigo más cercano (aunque esté lejos)
        if (!targetDestination) {
            const allEnemies = units.filter(e => e.player === enemyPlayer && e.currentHealth > 0);
            if (allEnemies.length > 0) {
                allEnemies.sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
                targetDestination = {r: allEnemies[0].r, c: allEnemies[0].c};
                targetType = `enemigo más cercano (${allEnemies[0].name})`;
            }
        }
        
        if (targetDestination) {
            console.log(`%c[AI GeneralMove] ${unit.name} -> Moviéndose hacia ${targetType} en (${targetDestination.r},${targetDestination.c})`, "color: #ff7f50");
            let bestMove = this.findPathToTarget(unit, targetDestination.r, targetDestination.c);
            if (bestMove) {
                console.log(`%c    L-> MOVIENDO (General) a (${bestMove.r},${bestMove.c})`, "color: red");
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            }
        } else {
            console.log(`[AI GeneralMove] ${unit.name} no encontró ningún objetivo general.`);
        }

        return false;
    },

    findBestStrategicObjective: function(unit, aiPlayerNumber) {
        let potentialObjectives = [];
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                if (board[r][c]?.resourceNode && board[r][c].owner !== aiPlayerNumber) {
                    potentialObjectives.push({ r, c, type: board[r][c].resourceNode });
                }
            }
        }
        if (potentialObjectives.length === 0) return null;

        potentialObjectives.sort((a, b) => {
            const priorityA = AI_RESOURCE_PRIORITY[a.type.replace('_mina', '')] || 0;
            const priorityB = AI_RESOURCE_PRIORITY[b.type.replace('_mina', '')] || 0;
            if (priorityA !== priorityB) return priorityB - priorityA;
            return hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c);
        });
        return potentialObjectives[0];
    },
    
    //---Añadir el Instinto de Expansión ---
    attemptTerritorialExpansion: async function(unit, aiPlayerNumber) {
        if (unit.hasMoved) return false;

        // Buscar el hexágono neutral más cercano
        let closestNeutralHex = null;
        let minDistance = Infinity;

        // Escanear solo un área razonable alrededor de la unidad para ser eficiente
        const searchRadius = 7;
        for (let r_offset = -searchRadius; r_offset <= searchRadius; r_offset++) {
            for (let c_offset = -searchRadius; c_offset <= searchRadius; c_offset++) {
                const r = unit.r + r_offset;
                const c = unit.c + c_offset;

                if (board[r]?.[c]?.owner === null) {
                    const distance = hexDistance(unit.r, unit.c, r, c);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestNeutralHex = { r, c };
                    }
                }
            }
        }
        
        if (closestNeutralHex) {
            console.log(`%c[AI Expansion] ${unit.name} -> Objetivo de expansión: hexágono neutral en (${closestNeutralHex.r},${closestNeutralHex.c})`, "color: #20B2AA");
            let bestMove = this.findPathToTarget(unit, closestNeutralHex.r, closestNeutralHex.c);
            if (bestMove) {
                console.log(`%c    L-> MOVIENDO (Expansión) a (${bestMove.r},${bestMove.c})`, "color: red");
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            }
        }
        return false;
    },

    // --- C8: Producir Unidades (LÓGICA MEJORADA Y CONSCIENTE DE LA FASE DEL JUEGO) ---
    decideUnitProduction: function(aiPlayerNumber) {
        console.log(`%c[AI Empire - Production V3] Chequeando producción para Jugador ${aiPlayerNumber}`, "color: #008080;");
        const playerRes = gameState.playerResources[aiPlayerNumber];
        if (!playerRes) return;

        // --- 1. Análisis Estratégico General ---
        const aiUnitsCount = units.filter(u => u.player === aiPlayerNumber).length;
        const enemyPlayer = aiPlayerNumber === 1 ? 2 : 1;
        
        // Comparación de ingresos de oro (función que crearemos más abajo)
        const incomeComparison = this.compareGoldIncome(aiPlayerNumber, enemyPlayer);
        
        let desiredRole;
        let unitTypeToBuild;

        // --- 2. Decidir el Rol a Producir ---
        if (aiUnitsCount < 6) {
            desiredRole = 'conqueror';
            unitTypeToBuild = 'Caballería Ligera';
        } else if (aiUnitsCount < 15) {
            desiredRole = 'explorer';
            unitTypeToBuild = 'Infantería Ligera';
        } else {
            // A partir de 15 unidades, la decisión es más compleja
            if (incomeComparison.aiLosing) {
                desiredRole = 'explorer'; // Si el enemigo gana más oro, seguir expandiéndose
                unitTypeToBuild = 'Infantería Ligera';
            } else if (this.isEnemyMakingDeepIncursion(aiPlayerNumber, enemyPlayer)) {
                desiredRole = 'defender';
                unitTypeToBuild = 'Infantería Pesada';
            } else {
                // Decidir entre Atacante o Saboteador
                desiredRole = Math.random() < 0.7 ? 'attacker' : 'saboteur';
                unitTypeToBuild = (desiredRole === 'attacker') ? 'Caballería Pesada' : 'Caballería Ligera';
            }
        }
        console.log(`[AI Production] Decisión estratégica: Producir un '${desiredRole.toUpperCase()}'`);

        // --- 3. Comprobar si se puede pagar y si hay espacio ---
        const unitData = REGIMENT_TYPES[unitTypeToBuild];
        const unitCost = unitData?.cost?.oro;

        if (!unitCost || playerRes.oro < unitCost) {
            console.log(`[AI Production] No hay oro suficiente para un ${unitTypeToBuild} (necesita ${unitCost}).`);
            return;
        }

        const validRecruitmentHexes = gameState.cities.filter(c => c.owner === aiPlayerNumber && !getUnitOnHex(c.r, c.c));
        if (validRecruitmentHexes.length === 0) {
            console.log(`[AI Production] No hay ciudades/fortalezas vacías para desplegar.`);
            return;
        }
        const recruitmentHex = validRecruitmentHexes[0];

        // --- 4. Construir y Asignar Rol ---
        console.log(`%c[AI Production] ¡DECISIÓN: Producir ${unitTypeToBuild} en (${recruitmentHex.r}, ${recruitmentHex.c})!`, "color: green; font-weight: bold;");
        
        const newUnitData = {
            id: `u${unitIdCounter++}`,
            player: aiPlayerNumber,
            name: `${unitTypeToBuild} IA`,
            regiments: [{ ...unitData, type: unitTypeToBuild }],
            // ... (resto de stats de la unidad) ...
            attack: unitData.attack, defense: unitData.defense, maxHealth: unitData.health, currentHealth: unitData.health, movement: unitData.movement,
            currentMovement: 0, visionRange: unitData.visionRange, attackRange: unitData.attackRange, hasMoved: true, hasAttacked: true,
            cost: { oro: unitCost }, level: 0, sprite: unitData.sprite,

            // <<== NUEVO: Añadir las propiedades de moral para que no nazcan "rotas" ==>>
            morale: 50,
            maxMorale: 125,
            isDemoralized: false
            // <<== FIN DE LA MODIFICACIÓN ==>>
        };

        // Asignar el rol decidido
        this.unitRoles.set(newUnitData.id, desiredRole);
        console.log(`[AI Production] Asignado rol '${desiredRole}' a ${newUnitData.name}`);

        playerRes.oro -= unitCost;
        placeFinalizedDivision(newUnitData, recruitmentHex.r, recruitmentHex.c);
        logMessage(`La IA ha reclutado un nuevo ${desiredRole}: ${newUnitData.name}.`);
    },

    // --- FUNCIONES AUXILIARES (EXISTENTES Y NUEVAS) ---
    findPathToTarget: function(unit, targetR, targetC) {
        if (!unit || typeof unit.r === 'undefined' || (unit.currentMovement || 0) <= 0) return null;

        const startNodeKey = `${unit.r},${unit.c}`;
        
        // La cola guarda [prioridad_f, coste_g, ruta_hasta_ahora, coordenada_actual_string]
        let queue = [[0, 0, [], startNodeKey]];
        // "cameFrom" guarda el camino: a qué nodo se llegó desde qué nodo.
        let cameFrom = new Map();
        // "costSoFar" guarda el coste más bajo para llegar a un nodo.
        let costSoFar = new Map();
        cameFrom.set(startNodeKey, null);
        costSoFar.set(startNodeKey, 0);

        const maxMovementPoints = unit.currentMovement;
        const enemyPlayer = unit.player === 1 ? 2 : 1;

        let reachableNodes = [];

        while (queue.length > 0) {
            queue.sort((a, b) => a[0] - b[0]); // Prioridad por el coste f más bajo
            let [f, g, path, currentKey] = queue.shift();

            const [r_curr, c_curr] = currentKey.split(',').map(Number);
            
            reachableNodes.push(currentKey);

            const neighbors = getHexNeighbors(r_curr, c_curr);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.r},${neighbor.c}`;
                const unitAtNeighbor = getUnitOnHex(neighbor.r, neighbor.c);
                if (unitAtNeighbor) continue;

                const hexData = board[neighbor.r]?.[neighbor.c];
                let moveCost = 1.0;
                if (hexData) {
                    if (hexData.owner === unit.player) moveCost = 1.5;
                    else if (hexData.owner === enemyPlayer) moveCost = 0.5;
                }

                const new_g = g + moveCost;

                if (new_g <= maxMovementPoints) {
                    if (!costSoFar.has(neighborKey) || new_g < costSoFar.get(neighborKey)) {
                        costSoFar.set(neighborKey, new_g);
                        const h = hexDistance(neighbor.r, neighbor.c, targetR, targetC);
                        const new_f = new_g + h;
                        queue.push([new_f, new_g, [], neighborKey]); // La ruta ya no es necesaria en la cola
                        cameFrom.set(neighborKey, currentKey); // Guardamos de dónde vinimos
                    }
                }
            }
        }

        // --- SELECCIÓN DEL MEJOR MOVIMIENTO FINAL (LÓGICA NUEVA Y SIMPLE) ---
        if (reachableNodes.length <= 1) return null; // No se pudo mover a ningún lado

        let bestTargetNode = null;
        let minDistance = Infinity;

        // 1. De todos los nodos que pudimos alcanzar, encontrar el que nos deja más cerca del objetivo.
        for (const nodeKey of reachableNodes) {
            const [r, c] = nodeKey.split(',').map(Number);
            const dist = hexDistance(r, c, targetR, targetC);
            if (dist < minDistance) {
                minDistance = dist;
                bestTargetNode = nodeKey;
            }
        }

        if (!bestTargetNode) return null;

        // 2. Reconstruir el camino hacia atrás desde el mejor nodo hasta el inicio.
        let path = [];
        let current = bestTargetNode;
        while (current !== startNodeKey) {
            path.unshift(current); // Añadir al principio del array
            current = cameFrom.get(current);
            if (!current) return null; // Seguridad por si algo falla
        }

        // 3. El primer elemento del camino reconstruido es nuestro movimiento.
        if (path.length > 0) {
            const [r_move, c_move] = path[0].split(',').map(Number);
            return { r: r_move, c: c_move };
        }
        
        return null;
    },

    findBestImmediateAttackTarget: function(unit, aiPlayerNumber, aiLevel, enemyPlayer) { 
        const playerKeyForVisibility = `player${aiPlayerNumber}`;
        let bestTarget = null; let bestScore = -Infinity;
        const visibleEnemies = units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && board[e.r]?.[e.c]?.visibility[playerKeyForVisibility] === 'visible');
        visibleEnemies.forEach(enemy => {
            if (typeof isValidAttack === "function" && isValidAttack(unit, enemy)) {
                const outcome = predictCombatOutcome(unit, enemy); // outcome.log tendrá detalles
                console.log(`%c    [Predict Immediate for ${unit.name} vs ${enemy.name}] DamageDef: ${outcome.damageToDefender}, DefDies: ${outcome.defenderDies}, DamageAtk: ${outcome.damageToAttacker}, AtkDiesRet: ${outcome.attackerDiesInRetaliation}`, "color: olive");
                let score = 0;
                if (outcome.defenderDies) score += 200; else score += outcome.damageToDefender * 5;
                score -= enemy.currentHealth / 2; 
                if (aiLevel === 'hard' && board[enemy.r]?.[enemy.c]?.isCapital) score += 100;
                if (outcome.damageToDefender === 0 && !outcome.defenderDies && outcome.attackerDiesInRetaliation) score = -Infinity; // Evitar ataques suicidas sin daño
                else if (outcome.damageToDefender === 0 && !outcome.defenderDies) score -= 50; // Penalizar ataques inútiles
                if (score > bestScore) { bestScore = score; bestTarget = enemy; }
            }
        });
        return (bestScore > -20) ? bestTarget : null; // Ajustar umbral de score para decidir atacar
    },

    findBestMoveAndAttackAction: function(unit, aiPlayerNumber, aiLevel, enemyPlayer) { 

        const playerKeyForVisibility = `player${aiPlayerNumber}`;
        const visibleEnemies = units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && board[e.r]?.[e.c]?.visibility[playerKeyForVisibility] === 'visible');
        let bestAction = null; let bestActionScore = -Infinity;

        // Generar todos los hexágonos alcanzables por la unidad
        let reachableHexes = [{r: unit.r, c: unit.c, cost: 0}]; // Incluir la posición actual (costo 0)
        let queue = [{ r: unit.r, c: unit.c, cost: 0 }];
        let visited = new Set([`${unit.r},${unit.c}`]);
        const maxMove = unit.currentMovement || 0;

        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr.cost >= maxMove) continue;
            for (const n of getHexNeighbors(curr.r, curr.c)) {
                const key = `${n.r},${n.c}`;
                if (!visited.has(key) && !getUnitOnHex(n.r, n.c)) { // Solo casillas vacías para moverse
                     if (isValidMove(unit, n.r, n.c, false, curr.cost + 1)) { // Chequear si el movimiento es válido con costo
                        visited.add(key);
                        reachableHexes.push({r: n.r, c: n.c, cost: curr.cost + 1});
                        queue.push({r: n.r, c: n.c, cost: curr.cost + 1});
                    }
                }
            }
        }

        for (const enemy of visibleEnemies) {
            for (const movePos of reachableHexes) {
                const tempAttackerState = { ...unit, r: movePos.r, c: movePos.c, attackRange: unit.attackRange }; 
                if (typeof isValidAttack === "function" && isValidAttack(tempAttackerState, enemy)) {
                    const outcome = predictCombatOutcome(tempAttackerState, enemy);
                    const distanceToMove = movePos.cost; // El costo ya está calculado por el BFS anterior
                    let score = 0;
                    if (outcome.defenderDies) score += 200; else score += outcome.damageToDefender * 5;
                    score -= distanceToMove * 5; // Penalizar movimientos (menos que antes)
                    score -= enemy.currentHealth / 2;
                    if (outcome.damageToDefender === 0 && !outcome.defenderDies && outcome.attackerDiesInRetaliation) score = -Infinity;
                    else if (outcome.damageToDefender === 0 && !outcome.defenderDies) score -=50;
                    if (score > bestActionScore) { bestActionScore = score; bestAction = { moveCoords: movePos, targetUnit: enemy };}
                }
            }
        }
        return (bestActionScore > -10) ? bestAction : null; // Ajustar umbral

    },

    findAndExecuteMergeAction: function(unitToPotentiallyMerge, aiPlayerNumber, aiLevel) { return false; /* Placeholder */ },

    endAiTurn: function(aiPlayerNumber, actionsTakenCount = 0) {
        console.log(`%c[AI Manager] endAiTurn: FIN para Jugador IA ${aiPlayerNumber}. Acciones realizadas: ${actionsTakenCount}`, "color: purple; font-weight:bold;");

        if (gameState.currentPhase === "gameOver") {
            console.log("[AI Manager] endAiTurn: La partida ya ha terminado.");
            return;
        }

        if (gameState.currentPlayer !== aiPlayerNumber || !gameState.playerTypes[`player${aiPlayerNumber}`]?.startsWith('ai_')) {
            console.warn(`[AI Manager] endAiTurn: Ya no es el turno de la IA ${aiPlayerNumber} (${gameState.currentPlayer}) o ya no es tipo IA (${gameState.playerTypes[`player${aiPlayerNumber}`]}). No se pasará el turno desde aquí.`);
            return;
        }

        if (typeof logMessage === "function") {
            if (actionsTakenCount > 0) {
                logMessage(`IA (Jugador ${aiPlayerNumber}) completó su turno con ${actionsTakenCount} acción(es) de unidad.`);
            } else {
                logMessage(`IA (Jugador ${aiPlayerNumber}) completó su turno sin acciones de unidad.`);
            }
        }

        const endTurnButtonId = 'floatingEndTurnBtn';
        let endTurnButton = null;

        // Intentar obtener desde domElements primero, que es más robusto
        if (typeof domElements !== 'undefined' && domElements.floatingEndTurnBtn) {
            endTurnButton = domElements.floatingEndTurnBtn;
        } else if (typeof domElements !== 'undefined' && domElements.endTurnBtn) { // Fallback por si lo llamaste endTurnBtn en domElements
             endTurnButton = domElements.endTurnBtn;
        } else {
            // Si no está en domElements, buscar por ID directo
            endTurnButton = document.getElementById(endTurnButtonId);
        }

        // --- INICIO LOG DE DEBUG PARA BOTÓN ---
        if (endTurnButton) {
            console.log(`%c[AI Manager] endAiTurn DEBUG: Botón '${endTurnButton.id}' encontrado. Disabled: ${endTurnButton.disabled}`, "color: darkorange;");
        } else {
            console.error(`%c[AI Manager] endAiTurn DEBUG: Botón '${endTurnButtonId}' NO ENCONTRADO.`, "color: darkred;");
        }
        // --- FIN LOG DE DEBUG PARA BOTÓN ---


        if (endTurnButton && !endTurnButton.disabled) {
            console.log(`%c[AI Manager] endAiTurn: Haciendo clic programáticamente en el botón de fin de turno (ID: ${endTurnButton.id || 'N/A'}).`, "color: green; font-weight:bold;");
            setTimeout(() => {
                endTurnButton.click();
            }, 350); // Aumentado ligeramente el delay por si acaso
        } else {
            if (!endTurnButton) {
                console.error(`%c[AI Manager] endAiTurn: ERROR CRÍTICO - No se pudo encontrar el botón de fin de turno. Verifica el ID ('${endTurnButtonId}') o la referencia en domElements.js.`, "color: darkred;");
            } else if (endTurnButton.disabled) {
                console.warn(`%c[AI Manager] endAiTurn: El botón de fin de turno (ID: ${endTurnButton.id || 'N/A'}) está deshabilitado. La IA no puede pasar el turno.`, "color: darkorange;");
                // Intento de habilitar y hacer clic si está deshabilitado (como última opción)
                console.log("%c[AI Manager] endAiTurn: Intentando habilitar y hacer clic en el botón deshabilitado...", "color: darkorange;");
                endTurnButton.disabled = false; // Forzar habilitación
                setTimeout(() => {
                    if (!endTurnButton.disabled) { // Doble chequeo por si algo lo vuelve a deshabilitar inmediatamente
                        endTurnButton.click();
                        console.log("%c[AI Manager] endAiTurn: Clic forzado en botón previamente deshabilitado.", "color: green;");
                    } else {
                        console.warn("%c[AI Manager] endAiTurn: No se pudo habilitar el botón para el clic forzado.", "color: darkred;");
                    }
                }, 100); // Pequeño delay para el clic forzado
            }
        }
    },

    /**
     * Busca una posición defensiva (colina/bosque) cerca de la capital.
     */
    seekDefensivePosition: async function(unit, aiPlayerNumber) {
        if (unit.hasMoved) return false;

        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === aiPlayerNumber);
        if (!aiCapital) return false; // No hay capital que defender

        let defensiveHexes = [];
        const searchRadius = 5; // Radio de búsqueda alrededor de la capital

        for (let r_offset = -searchRadius; r_offset <= searchRadius; r_offset++) {
            for (let c_offset = -searchRadius; c_offset <= searchRadius; c_offset++) {
                const r = aiCapital.r + r_offset;
                const c = aiCapital.c + c_offset;

                const hex = board[r]?.[c];
                // Hexágono válido si es colina o bosque, no está ocupado y la unidad puede entrar
                if (hex && (hex.terrain === 'hills' || hex.terrain === 'forest') && !getUnitOnHex(r, c) && isValidMove(unit, r, c)) {
                    defensiveHexes.push({ r, c });
                }
            }
        }

        if (defensiveHexes.length === 0) {
            console.log(`  [AI Defender] No se encontraron posiciones defensivas cercanas.`);
            return false;
        }

        // Priorizar el hexágono defensivo más cercano a la unidad actual
        defensiveHexes.sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));

        const targetHex = defensiveHexes[0];
        console.log(`%c[AI Defender] ${unit.name} -> Moviéndose a posición defensiva en (${targetHex.r},${targetHex.c})`, "color: #32CD32");
        
        let bestMove = this.findPathToTarget(unit, targetHex.r, targetHex.c);
        if (bestMove) {
            await moveUnit(unit, bestMove.r, bestMove.c);
            return true;
        }

        return false;
    },

    // En aiLogic.js, añade estas funciones dentro de AiManager

    executeConquerorLogic: async function(unit, aiPlayerNumber, enemyPlayer) {
        // Objetivo: Ir al recurso más valioso no controlado
        return await this.attemptSecureResource(unit, aiPlayerNumber, 0, enemyPlayer);
    },

    executeExplorerLogic: async function(unit, aiPlayerNumber) {
        // Objetivo: Ir al hexágono neutral más cercano
        return await this.attemptTerritorialExpansion(unit, aiPlayerNumber);
    },

    executeDefenderLogic: async function(unit, aiPlayerNumber, enemyPlayer) {
        // Objetivo: Ir al punto estratégico (chokepoint) más importante y desprotegido.
        // Esta es una función avanzada que debemos crear.
        const strategicPoint = this.findBestChokepoint(aiPlayerNumber);
        if (strategicPoint) {
            const bestMove = this.findPathToTarget(unit, strategicPoint.r, strategicPoint.c);
            if (bestMove) {
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            }
        }
        // Fallback: si no hay chokepoints, defender la capital
        return await this.attemptToDefendCapital(unit, aiPlayerNumber, 0, enemyPlayer);
    },

    executeAttackerLogic: async function(unit, aiPlayerNumber, enemyPlayer) {
        // Objetivo: Moverse hacia la capital enemiga
        const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
        if (enemyCapital) {
            const bestMove = this.findPathToTarget(unit, enemyCapital.r, enemyCapital.c);
            if (bestMove) {
                await moveUnit(unit, bestMove.r, bestMove.c);
                return true;
            }
        }
        // Fallback: si no se ve la capital, moverse hacia el enemigo más cercano
        return await this.executeGeneralMovement(unit, aiPlayerNumber, 0, enemyPlayer);
    },

    executeSaboteurLogic: async function(unit, aiPlayerNumber, enemyPlayer) {
        // Objetivo: Encontrar una unidad enemiga sin suministro y moverse para cortar su ruta de escape
        const vulnerableEnemy = this.findUnsuppliedEnemy(enemyPlayer);
        if (vulnerableEnemy) {
            // Encontrar un hexágono detrás del enemigo (entre el enemigo y su capital)
            const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
            if (enemyCapital) {
                // Lógica simple: buscar un hex vacío en la línea enemigo-capital
                const targetHex = this.findHexBehindEnemy(vulnerableEnemy, enemyCapital);
                if (targetHex) {
                    const bestMove = this.findPathToTarget(unit, targetHex.r, targetHex.c);
                    if (bestMove) {
                        await moveUnit(unit, bestMove.r, bestMove.c);
                        return true;
                    }
                }
            }
        }
        // Fallback: si no hay enemigos vulnerables, actuar como un conquistador
        return await this.executeConquerorLogic(unit, aiPlayerNumber, enemyPlayer);
    },

    // --- C9: FUNCIÓN PARA FUSIONAR/UNIR UNIDADES ---
    findAndExecuteMergeAction: function(unitToPotentiallyMerge, aiPlayerNumber, aiLevel) {
        //console.log(`[AI Merge Check] Buscando fusiones para ${unitToPotentiallyMerge.name} (${unitToPotentiallyMerge.id})`);
        // Verificamos si la unidad puede actuar y es del jugador IA.
        if (unitToPotentiallyMerge.hasMoved || unitToPotentiallyMerge.player !== aiPlayerNumber || unitToPotentiallyMerge.currentHealth <= 0) {
            return false; // Ya actuó, está herida o no es IA.
        }

        // Encontrar unidades amigas adyacentes que estén disponibles para actuar (no hayan movido/atacado).
        const friendlyUnits = units.filter(u =>
            u.player === aiPlayerNumber &&
            u.id !== unitToPotentiallyMerge.id && // No consigo misma unidad
            !u.hasMoved && !u.hasAttacked &&     // Deben estar disponibles
            u.currentHealth > 0 &&                // Deben estar vivas
            hexDistance(unitToPotentiallyMerge.r, unitToPotentiallyMerge.c, u.r, u.c) === 1 // Solo adyacentes
        );

        if (friendlyUnits.length === 0) {
            //console.log(`  - No hay unidades amigas adyacentes disponibles para fusionar.`);
            return false; // No hay nadie cerca con quien fusionarse.
        }

        let bestMergeOption = null;
        let highestMergeBenefit = -Infinity; // Para decidir cuál es la mejor fusión

        console.log(`[AI Merge Check] Para ${unitToPotentiallyMerge.name}: encontradas ${friendlyUnits.length} unidades amigas adyacentes.`);

        // Iterar sobre las unidades amigas para encontrar la mejor candidata a fusión.
        for (const otherUnit of friendlyUnits) {
            
            // --- Heurística de Beneficio de Fusión ---
            // Este cálculo determina qué tan "buena" es la fusión.
            // Aquí se define la "inteligencia" de la IA al decidir fusionarse.
            
            let mergeBenefitScore = 0;
            
            // 1. Compatibilidad básica: Se asume que `mergeUnits` valida esto. Si no, debería ir aquí.
            //    Ejemplo: mismo tipo de unidad, o una compatible (ej. Infantería + Cuartel General).

            // 2. Mejora de estadísticas: Calculamos las estadísticas combinadas simuladas.
            //    Asumimos que `calculateRegimentStats` funciona correctamente y devuelve las stats
            //    combinadas de una división dada su lista de regimientos.
            const currentUnitStats = calculateRegimentStats([unitToPotentiallyMerge.regiments[0]], unitToPotentiallyMerge.player);
            const otherUnitStats = calculateRegimentStats([otherUnit.regiments[0]], otherUnit.player); // Asumimos que la unidad aliada tiene solo 1 regimiento por ahora
            
            // Simulamos las stats de la unidad combinada.
            // Nota: Esto es una simplificación; `mergeUnits` debe manejar correctamente la combinación de MÚLTIPLES regimientos si las unidades pueden tenerlos.
            // Por ahora, asumimos unidades simples o fusionamos regimientos base.
            // Asumiendo que `calculateRegimentStats` puede tomar un array de regimientos y calcular los combinados:
            const mergedStats = calculateRegimentStats([...(unitToPotentiallyMerge.regiments || []), ...(otherUnit.regiments || [])], aiPlayerNumber);

            // Beneficio = Mejora en Stats (Ataque + Defensa) + Supervivencia de la unidad fusionada.
            const currentTotalStats = (currentUnitStats.attack || 0) + (currentUnitStats.defense || 0);
            const otherTotalStats = (otherUnitStats.attack || 0) + (otherUnitStats.defense || 0);
            const mergedTotalStats = (mergedStats.attack || 0) + (mergedStats.defense || 0);

            // Bonus si la combinación es SIGNIFICATIVAMENTE mejor (ej: >15% de mejora)
            if (mergedTotalStats > (currentTotalStats + otherTotalStats) * 1.15) {
                mergeBenefitScore += 10; 
            }

            // Bonus si ambas unidades están MUY dañadas (fusión de supervivientes)
            const damageUnitA = Math.max(0, currentUnitStats.maxHealth - currentUnitStats.currentHealth);
            const damageUnitB = Math.max(0, otherUnitStats.maxHealth - otherUnitStats.currentHealth);
            if (damageUnitA > currentUnitStats.maxHealth * 0.6 && damageUnitB > otherUnitStats.maxHealth * 0.6) { // Si ambas perdieron >60% de vida
                 mergeBenefitScore += 5;
            }
            
            // Penalización si alguna de las unidades ya ha actuado este turno.
            // Priorizamos fusionar unidades que aún PUEDEN actuar después.
            if (unitToPotentiallyMerge.hasMoved || unitToPotentiallyMerge.hasAttacked) mergeBenefitScore -= 10;
            if (otherUnit.hasMoved || otherUnit.hasAttacked) mergeBenefitScore -= 10; // Penalización doble si la otra unidad tampoco puede actuar

            // Penalización si la fusión resultante excede el límite de regimientos.
            // ¡Esto debería ser validado PRIMERO por `isValidMerge` si existiera!
            // Aquí lo manejamos de forma simple: no se fusiona si supera el límite.
            const totalRegimentsAfterMerge = (unitToPotentiallyMerge.regiments?.length || 0) + (otherUnit.regiments?.length || 0);
            if (totalRegimentsAfterMerge > MAX_REGIMENTS_PER_DIVISION) {
                 mergeBenefitScore -= 50; // Penalización grande si excede el límite.
                 console.log(`  - ¡Alerta! Fusión de ${otherUnit.name} excedería el límite de ${MAX_REGIMENTS_PER_DIVISION} regimientos.`);
            }

            console.log(`  - Candidata: ${otherUnit.name} [${otherUnit.regiments.length} reg.] vs ${unitToPotentiallyMerge.name} [${unitToPotentiallyMerge.regiments.length} reg.] -> Beneficio: ${mergeBenefitScore}`);

            // Actualizamos la mejor opción si esta fusión es mejor
            if (mergeBenefitScore > highestMergeBenefit) {
                highestMergeBenefit = mergeBenefitScore;
                bestMergeOption = { unitA: unitToPotentiallyMerge, unitB: otherUnit };
            }
        }
        
        // --- EJECUCIÓN DE LA FUSIÓN SI SE ENCUENTRA UNA OPCIÓN VÁLIDA ---
        // Solo realizamos la fusión si el beneficio es significativamente positivo.
        if (bestMergeOption && highestMergeBenefit > 5) { 
            console.log(`%c[AI Merge Decision] Ejecutando fusión: ${bestMergeOption.unitA.name} <-> ${bestMergeOption.unitB.name} (Beneficio estimado: ${highestMergeBenefit})`, "color: purple; font-weight: bold;");
            
            // Aquí llamamos a la función principal `mergeUnits`
            // Asegúrate de que `mergeUnits` maneja la eliminación de la unidad fusionada (unitB)
            // y la actualización de stats de la unidad resultante (unitA).
            if (typeof mergeUnits === "function") {
                // ¡ IMPORTANTE ! Pasar las unidades correctas: unitA es la que decide, unitB es la fusionada.
                mergeUnits(bestMergeOption.unitA, bestMergeOption.unitB);
                return true; // Devolver true para indicar que se realizó una acción.
            } else {
                console.error("[AI Merge] ¡Error crítico! La función 'mergeUnits' no está definida o no es accesible.");
                return false;
            }
        }

        // Si no se encontró una buena fusión.
        console.log(`  - No se encontraron fusiones beneficiosas para ${unitToPotentiallyMerge.name}. Beneficio máximo estimado: ${highestMergeBenefit}.`);
        return false;
    },

    // --- FUNCIONES DE SOPORTE PARA LAS NUEVAS LÓGICAS ---

    compareGoldIncome: function(aiPlayer, enemyPlayer) {
        // Esta es una simulación simple. Una versión real requeriría calcular el ingreso por turno.
        const aiGold = gameState.playerResources[aiPlayer]?.oro || 0;
        const enemyGold = gameState.playerResources[enemyPlayer]?.oro || 0;
        return {
            aiLosing: aiGold < enemyGold,
            difference: Math.abs(aiGold - enemyGold)
        };
    },

    findBestChokepoint: function(aiPlayer) {
        // LÓGICA AVANZADA (placeholder):
        // 1. Analizar el mapa para encontrar "puentes" de 1-2 hexágonos entre dos grandes masas de tierra.
        // 2. O encontrar hexágonos de colinas/bosques que controlen el acceso a una zona rica en recursos.
        // Por ahora, devolvemos un punto estratégico simple: una colina cerca del centro del mapa.
        const centerR = Math.floor(board.length / 2);
        const centerC = Math.floor(board[0].length / 2);
        for (let r_offset = 0; r_offset < 5; r_offset++) {
            for (let c_offset = 0; c_offset < 5; c_offset++) {
                const r = centerR + r_offset;
                const c = centerC + c_offset;
                if (board[r]?.[c]?.terrain === 'hills' && !getUnitOnHex(r, c)) {
                    return { r, c };
                }
            }
        }
        return null;
    },

    findUnsuppliedEnemy: function(enemyPlayer) {
        return units.find(u => u.player === enemyPlayer && !isHexSupplied(u.r, u.c, u.player));
    },

    findHexBehindEnemy: function(enemyUnit, enemyCapital) {
        // Placeholder simple: devuelve un hexágono vacío cerca del enemigo en la dirección opuesta a su capital.
        // Una lógica real requeriría un análisis de pathfinding más complejo.
        return getHexNeighbors(enemyUnit.r, enemyUnit.c).find(n => !getUnitOnHex(n.r, n.c) && hexDistance(n.r, n.c, enemyCapital.r, enemyCapital.c) > hexDistance(enemyUnit.r, enemyUnit.c, enemyCapital.r, enemyCapital.c));
    },

    isEnemyMakingDeepIncursion: function(aiPlayer, enemyPlayer) {
        const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === aiPlayer);
        if (!aiCapital) return false;
        return units.some(u => u.player === enemyPlayer && hexDistance(u.r, u.c, aiCapital.r, aiCapital.c) < 6);
    },

};

// ========================================================================
// === SUB-FUNCIÓN: Decide el tipo de unidad y sus regimientos/costo ===
// ========================================================================
function selectUnitTypeAndRegiments(playerNumber, mission, visibleHumanUnits, regimientoTypes, aiCapital) {
    console.log(`[DeployAI V29 - Sub] Decidiendo tipo de unidad para misión ${mission.type} en (${mission.r},${mission.c}).`);

    let unitRoleForCreation;
    let unitNamePrefixForCreation;
    let requiredRegimentsForCreation = [];
    let unitBaseCostForCreation = 0;
    let canDefineRegimentsForCreationFlag = true; // Asumimos que sí al principio

    // Lógica de decisión de rol SIMPLE: ¿Hay ALGUN humano visible en el mapa?
    const anyHumanVisible = visibleHumanUnits.length > 0;

    if (anyHumanVisible) {
        // Si hay humanos visibles en algún lugar: Crear UNIDAD CONQUEROR
         unitRoleForCreation = 'conqueror';
         unitNamePrefixForCreation = 'Conqueror Division';
         requiredRegimentsForCreation = ['Infantería Ligera', 'Infantería Pesada', 'Arqueros'];
         console.log(`%c[DeployAI V29 - Sub] Decisión Rol: Humanos visibles en mapa -> CONQUEROR.`, "color: red");

    } else {
        // Si NO hay humanos visibles en el mapa: Crear UNIDAD EXPLORER
         unitRoleForCreation = 'explorer';
         unitNamePrefixForCreation = 'Explorer Division';
         requiredRegimentsForCreation = ['Infantería Ligera'];
         console.log(`%c[DeployAI V29 - Sub] Decisión Rol: No hay humanos visibles en mapa -> EXPLORER.`, "color: green");
    }

    // Construir la lista de regimientos y calcular costo para la unidad decidida
    let tempRegimentsListForCreation = [];
    let tempUnitCostForCreation = 0;

    console.log(`[DeployAI V29 - Sub] Debug Regimientos: Consultando REGIMENT_TYPES para ${unitRoleForCreation}`);
    for (const type of requiredRegimentsForCreation) {
        const regData = regimientoTypes && regimientoTypes[type];
        console.log(`[DeployAI V29 - Sub] Debug Regimientos: Info para '${type}': ${JSON.stringify(regData)}`);
        if (!regData) {
             console.error(`[DeployAI V29 - Sub] ERROR: Regimiento requerido para ${unitRoleForCreation} '${type}' no encontrado en REGIMENT_TYPES.`);
             canDefineRegimentsForCreationFlag = false; // Asignar, no redeclarar
             break; // Romper el bucle de regimientos
        }
        const regCost = regData.cost?.oro || 0;
        console.log(`[DeployAI V29 - Sub] Debug Regimientos: Costo oro para '${type}': ${regCost}`);
        tempUnitCostForCreation += regCost;
        tempRegimentsListForCreation.push({ ...regData, type: type }); // Añadir copia de los datos base
    }

    if (!canDefineRegimentsForCreationFlag) {
         console.warn(`[DeployAI V29 - Sub] No se pudieron definir los regimientos para la unidad '${unitRoleForCreation}'. No se puede crear esta unidad.`);
         return null; // Retorna null si no se puede definir la unidad
    }

    // Retorna un objeto con toda la información necesaria para crear la unidad
    return {
        unitRole: unitRoleForCreation,
        unitNamePrefix: unitNamePrefixForCreation,
        regiments: tempRegimentsListForCreation,
        deploymentCost: tempUnitCostForCreation,
        canCreate: true // Indica que la definición fue exitosa
    };
}

// aiLogic.js - Función deployUnitsAI V29.1 (Corrección SyntaxError + Posicionamiento EXTREMO + Decisión Rol por Spot Inmediato)
console.log("aiLogic.js - deployUnitsAI V29.1 - Corrección SyntaxError + Posicionamiento EXTREMO + Decisión Rol por Spot Inmediato");

// --- !!! RECORDATORIO CRÍTICO: VERIFICAR REGIMENT_TYPES !!! ---
// Asegurate de que tu objeto REGIMENT_TYPES esté definido CORRECTAMENTE
// con las propiedades de stats (attack, defense, health, movement, visionRange, attackRange, initiative)
// Y costos (cost: { oro: ... }) para cada regimiento con los VALORES QUE ESPERAS:
// Infantería Ligera: oro 10, health 10, movement 2, attack 2, defense 3, visionRange 2, attackRange 1, initiative 10
// Infantería Pesada: oro 20, health 20, movement 1, attack 3, defense 5, visionRange 1, attackRange 1, initiative 5   <-- !!! VERIFICA Y CORRIGE ESTO EN TU ARCHIVO FUENTE !!!
// Arqueros: oro 18, health 7, movement 2, attack 3, defense 1, visionRange 2, attackRange 2, initiative 8
// Si Infantería Pesada no tiene costo 20 y salud 20 en REGIMENT_TYPES,
// el costo total (48 para Conqueror) y las estadísticas (37 HP para Conqueror)
// serán incorrectos, AUNQUE LA LÓGICA DEL CÓDIGO SEA CORRECTA.
// --- !!! RECORDATORIO CRÍTICO: VERIFICAR REGIMENT_TYPES !!! ---


// Asegúrate de que las siguientes variables/funciones globales estén accesibles:
// - REGIMENT_TYPES (con stats y costos de oro para cada tipo)
// - unitIdCounter (global, para IDs únicos)
// - placeFinalizedDivision(unitData, r, c) (para añadir la unidad al juego)
// - getUnitOnHex(r, c) (para verificar ocupación)
// - hexDistance(r1, c1, r2, c2) (para distancias)
// - logMessage(msg) (para mensajes en UI)
// - AiManager.unitRoles (Map() global, inicializado como new Map())
// - gameState (global, para estado del juego, recursos, ciudades, board, units)
// - AI_RESOURCE_PRIORITY (global, para prioridades de recursos)
// - TERRAIN_TYPES (global, con isImpassableForLand o similar)
// - getHexNeighbors(r, c, radius) (para detección de amenaza, soporta radio)


// ========================================================================
// === PASO 1: Obtener los 10 Objetivos Estratégicos más importantes ===
// ========================================================================
// Recibe allResourceNodes para usarlo y pasarlo de vuelta
function getTopStrategicObjectives(playerNumber, allResourceNodes, limit = 10) { // AÑADIDO allResourceNodes como parámetro
    console.log(`%c[DeployAI V29.1 - Paso 1] Obteniendo los ${limit} objetivos estratégicos más importantes para Jugador ${playerNumber}.`, "color: #ADD8E6");

    const enemyPlayer = playerNumber === 1 ? 2 : 1;
    const humanCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
    const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);

    let strategicObjectives = [];

    // 1. Capital Enemiga (Alta Prioridad fija)
    if (humanCapital) {
         strategicObjectives.push({ type: 'CAPITAL_RUSH', r: humanCapital.r, c: humanCapital.c, priority: 1000, owner: enemyPlayer });
         console.log(`[DeployAI V29.1 - Paso 1] Objetivo añadido: Capital Enemiga en (${humanCapital.r},${humanCapital.c})`);
    }

    // 2. Nodos de Recursos No Controlados (Prioridad basada en tipo y propiedad)
    // allResourceNodes YA HA SIDO RECOLECTADO en la función principal
    if (allResourceNodes && allResourceNodes.length > 0) { // Verificar que allResourceNodes existe y no está vacío
        console.log(`[DeployAI V29.1 - Paso 1] Procesando ${allResourceNodes.length} nodos de recurso no controlados.`);
        allResourceNodes.forEach(node => {
            const resourceType = node.type.replace('_mina', '');
            const basePriority = (typeof AI_RESOURCE_PRIORITY !== 'undefined' && AI_RESOURCE_PRIORITY[resourceType] !== undefined) ? AI_RESOURCE_PRIORITY[resourceType] : 0;
            let finalPriority = basePriority;

             if (resourceType === 'comida') finalPriority = 80; // Prioridad específica para Comida
             else if (resourceType === 'oro') finalPriority = 100; // Prioridad específica para Oro
             else if (basePriority === 0) finalPriority = 50; // Prioridad por defecto para otros recursos si no están en AI_RESOURCE_PRIORITY

            if (node.owner === enemyPlayer) { finalPriority *= 1.5; } // Aumentar prioridad si es del enemigo

            strategicObjectives.push({ type: `RESOURCE_${resourceType.toUpperCase()}`, r: node.r, c: node.c, priority: finalPriority, owner: node.owner });
             console.log(`[DeployAI V30.1 - Paso 1] Objetivo añadido: Recurso ${resourceType} en (${node.r},${node.c}) con prioridad ${finalPriority}`);
        });
    } else {
        console.warn("[DeployAI V30.1 - Paso 1] allResourceNodes no está definido o está vacío al procesar objetivos.");
    }


    // 3. Colinas Vacías o Neutrales para Fortalezas Futuras (Prioridad Media/Baja)
    const potentialHillObjectives = []; // Lista de colinas potenciales para ocupar y fortificar
     const minHillDistance = 5; // Mínima distancia desde la capital IA para considerar
     if (board && board.length > 0 && aiCapital) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                const hex = board[r]?.[c];
                // Colinas que no sean propiedad de la IA, que no tengan estructura, y que no estén demasiado cerca de la capital propia
                if (hex?.terrain === 'hills' && hex.owner !== playerNumber && !hex.structure && hexDistance(r,c, aiCapital.r, aiCapital.c) >= minHillDistance) {
                    potentialHillObjectives.push({ r, c, owner: hex.owner });
                }
            }
        }
     }
    if (potentialHillObjectives.length > 0) {
        console.log(`[DeployAI V30.1 - Paso 1] Encontradas ${potentialHillObjectives.length} colinas potenciales para objetivos.`);
        potentialHillObjectives.forEach(hill => {
            let priority = 30;
            if (hill.owner === null) priority = 40;
             if(aiCapital) {
                priority -= hexDistance(hill.r, hill.c, aiCapital.r, aiCapital.c) * 0.5;
             }
            strategicObjectives.push({ type: 'HILL_FOR_FORTRESS', r: hill.r, c: hill.c, priority, owner: hill.owner });
             console.log(`[DeployAI V30.1 - Paso 1] Objetivo añadido: Colina en (${hill.r},${hill.c}) con prioridad ${priority}`);
        });
    }

     // 4. Fallback: La propia Capital (Prioridad Baja, solo si no hay otros objetivos)
     if (strategicObjectives.length === 0 && aiCapital) {
         console.log("[DeployAI V30.1 - Paso 1] Fallback: Usando la propia capital como objetivo de despliegue defensivo.");
         strategicObjectives.push({ type: 'DEFEND_CAPITAL', r: aiCapital.r, c: aiCapital.c, priority: 10, owner: playerNumber });
     }

     console.log(`[DeployAI V30.1 - Paso 1] Total de objetivos estratégicos recolectados: ${strategicObjectives.length}`);

    // Si AÚN no hay objetivos, devolver lista vacía
     if (strategicObjectives.length === 0) {
         console.error("[DeployAI V30.1 - Paso 1] CRÍTICO: Después de buscar, la lista de objetivos está vacía.");
         return [];
     }

    strategicObjectives.sort((a, b) => b.priority - a.priority); // Ordenar por prioridad descendente

    // Devolver solo los N primeros objetivos
    const topObjectives = strategicObjectives.slice(0, Math.min(strategicObjectives.length, limit));
    console.log(`%c[DeployAI V30.1 - Paso 1] Devolviendo los top ${topObjectives.length} objetivos: ${JSON.stringify(topObjectives.slice(0, 5))}`, "color: #008000"); // Log top 5

    return topObjectives; // Esto es la "variable" del punto 1
}


// ========================================================================
// === PASO 2: Verificar si en alrededor de esos 10 casillas hay unidad humana ===
// ========================================================================
// Esta función ya no decide el rol directamente, solo informa si hay amenaza alrededor de los objetivos.
// Se mantiene por si se necesita esta información globalmente.
function checkThreatAroundObjectives(topObjectives, visibleHumanUnits) {
     console.log(`%c[DeployAI V30.1 - Paso 2] Verificando amenaza humana alrededor de ${topObjectives.length} objetivos.`, "color: #ADD8E6");

    if (topObjectives.length === 0 || visibleHumanUnits.length === 0) {
        console.log("[DeployAI V30.1 - Paso 2] No hay objetivos o unidades humanas visibles para verificar amenaza.");
        return false; // No hay objetivos o no hay unidades humanas visibles
    }

    const checkRadiusAroundObjective = 3; // Radio para considerar "alrededor" de un objetivo

    for (const objective of topObjectives) {
        for (const humanUnit of visibleHumanUnits) {
             // Verificar si la unidad humana existe y tiene posición válida
             if (humanUnit && humanUnit.r !== -1 && humanUnit.c !== -1) {
                  // Asegurarse de que el hexágono de la unidad humana existe antes de calcular distancia
                  if (board[humanUnit.r]?.[humanUnit.c]) { // Acceder al board aquí si es necesario
                     if (hexDistance(humanUnit.r, humanUnit.c, objective.r, objective.c) <= checkRadiusAroundObjective) {
                          console.log(`%c[DeployAI V30.1 - Paso 2] Amenaza detectada: Unidad humana (${humanUnit.name} id:${humanUnit.id}) en (${humanUnit.r},${humanUnit.c}) cerca del objetivo (${objective.type} en ${objective.r},${objective.c}).`, "color: red");
                          return true; // Amenaza encontrada alrededor de uno de los objetivos top
                      }
                  } else {
                       console.warn(`[DeployAI V30.1 - Paso 2] Advertencia: Unidad humana ${humanUnit.id} con posición (${humanUnit.r},${humanUnit.c}) fuera de los límites del tablero durante check de amenaza.`);
                  }
             }
        }
    }

    console.log("[DeployAI V30.1 - Paso 2] No se detectó amenaza humana alrededor de los objetivos top.");
    return false; // No se encontró amenaza alrededor de los objetivos top
}


// ========================================================================
// === PASO 3 & 4: Decidir el rol, regimientos y costo para UNA unidad (basado en spot y amenaza inmediata) ===
// ========================================================================
// Esta función ahora se llama *después* de que el spot ha sido elegido.
// La decisión de rol es: CONQUEROR si hay amenaza INMEDIATA cerca del SPOT ELEGIDO, SINO EXPLORER.
// Devuelve un objeto con la definición de la unidad.
function decideUnitForDeploymentBasedOnSpot(playerNumber, placementSpot, visibleHumanUnits, regimientoTypes) {
     console.log(`%c[DeployAI V30.1 - Paso 3/4] Decidiendo tipo de unidad para spot (${placementSpot.r},${placementSpot.c}).`, "color: #ADD8E6");

    let unitRoleForCreation;
    let unitNamePrefixForCreation;
    let requiredRegimentsForCreation = [];
    let unitBaseCostForCreation = 0;
    let canDefineRegimentsFlag = true; // Bandera para verificar si los regimientos existen


    // Verificar si el SPOT ELEGIDO está MUY cerca de un enemigo visible (radio muy pequeño)
    let immediateThreatNearChosenSpot = false;
    const immediateThreatCheckRadius = 1; // Solo hexágonos adyacentes o el propio spot

     if (visibleHumanUnits.length > 0 && placementSpot) {
         for (const humanUnit of visibleHumanUnits) {
             if (humanUnit && humanUnit.r !== -1 && humanUnit.c !== -1) {
                 if (board[humanUnit.r]?.[humanUnit.c]) {
                     if (hexDistance(humanUnit.r, humanUnit.c, placementSpot.r, placementSpot.c) <= immediateThreatCheckRadius) {
                         console.log(`[DeployAI V30.1 - Paso 3] Detección Amenaza Inmediata cerca del spot elegido (${placementSpot.r},${placementSpot.c}).`);
                         immediateThreatNearChosenSpot = true;
                         break;
                     }
                 } else {
                       console.warn(`[DeployAI V30.1 - Paso 3] Advertencia: Unidad humana ${humanUnit.id} con posición (${humanUnit.r},${humanUnit.c}) fuera de los límites del tablero durante check de amenaza inmediata.`);
                 }
             }
         }
     }
    console.log(`[DeployAI V30.1 - Paso 3] Amenaza INMEDIATA cerca del spot elegido (${placementSpot?.r},${placementSpot?.c}): ${immediateThreatNearChosenSpot}.`);


    // === LÓGICA DE DECISIÓN DE ROL/TIPO FINAL (Basada en Amenaza INMEDIATA cerca del SPOT) ===
    // Decide el rol de ESTA unidad:
    // - CONQUEROR si hay amenaza INMEDIATA (adjacente o en la misma casilla) cerca del spot elegido.
    // - EXPLORER en cualquier otro caso (sin amenaza inmediata cerca del spot).
    if (immediateThreatNearChosenSpot) {
         unitRoleForCreation = 'conqueror';
         unitNamePrefixForCreation = 'Conqueror Division';
         requiredRegimentsForCreation = ['Infantería Ligera', 'Infantería Pesada', 'Arqueros'];
         console.log(`%c[DeployAI V30.1 - Paso 3] Rol decidido: Amenaza INMEDIATA detectada cerca del spot -> CONQUEROR.`, "color: red");
    } else {
         unitRoleForCreation = 'explorer';
         unitNamePrefixForCreation = 'Explorer Division';
         requiredRegimentsForCreation = ['Infantería Ligera'];
         console.log(`%c[DeployAI V30.1 - Paso 3] Rol decidido: No hay amenaza INMEDIATA cerca del spot -> EXPLORER.`, "color: green");
    }
    // === FIN LÓGICA DE DECISIÓN DE ROL/TIPO FINAL ===


    // === Construir la lista de regimientos y calcular costo para la unidad decidida ===
    let tempRegimentsListForCreation = [];
    let tempUnitCostForCreation = 0;
    // Bandera para verificar si los regimientos existen
    // CORRECCIÓN: Bandera declarada aquí, dentro de esta función, no fuera.
    let canDefineRegimentsFlagThisUnit = true;


    console.log(`[DeployAI V30.1 - Paso 4 Debug] Consultando REGIMENT_TYPES para ${unitRoleForCreation}`);
    for (const type of requiredRegimentsForCreation) {
        const regData = regimientoTypes && regimientoTypes[type];
        console.log(`[DeployAI V30.1 - Paso 4 Debug] Info para '${type}': ${JSON.stringify(regData)}`);
        if (!regData) {
             console.error(`[DeployAI V30.1 - Paso 4] ERROR: Regimiento requerido para ${unitRoleForCreation} '${type}' no encontrado en REGIMENT_TYPES.`);
             canDefineRegimentsFlagThisUnit = false; // Asignar
             break; // Romper el bucle for(requiredRegiments)
        }
        const regCost = regData.cost?.oro || 0;
        console.log(`[DeployAI V30.1 - Paso 4 Debug] Costo oro para '${type}': ${regCost}`);
        tempUnitCostForCreation += regCost;
        tempRegimentsListForCreation.push({ ...regData, type: type });
    }

    if (!canDefineRegimentsFlagThisUnit) {
         console.warn(`[DeployAI V30.1 - Paso 4] No se pudieron definir los regimientos para la unidad '${unitRoleForCreation}'. No se puede crear esta unidad.`);
         // No retornamos null, la función padre maneja el check de unitDefinition.canCreate
         canDefineRegimentsFlag = false; // Esta bandera de aquí arriba (en la sub-función) nunca se usa fuera de este if. Puede simplificarse.
         // Vamos a retornar un objeto con canCreate: false
         return { canCreate: false };
    }

    // Retorna un objeto con toda la información necesaria para crear la unidad
    return {
        unitRole: unitRoleForCreation,
        unitNamePrefix: unitNamePrefixForCreation,
        regiments: tempRegimentsListForCreation,
        deploymentCost: tempUnitCostForCreation,
        canCreate: true // Indica que la definición fue exitosa
    };
}

// ========================================================================
// === PASO 5: Encontrar el mejor lugar de despliegue para UNA unidad ===
// ========================================================================
// Dada la misión y los spots DISPONIBLES, elige el MEJOR spot.
// Esta función se llama dentro del bucle principal.
function findBestPlacementSpot(playerNumber, mission, availableSpots, visibleHumanUnits, board, aiCapital, allResourceNodes) {
     console.log(`%c[DeployAI V30.1 - Paso 5] Buscando mejor spot para misión en (${mission.r},${mission.c}). Spots disponibles: ${availableSpots.length}.`, "color: #ADD8E6");

    if (availableSpots.length === 0) {
        console.warn("[DeployAI V30.1 - Paso 5] No hay spots disponibles.");
        return null; // No hay spots disponibles
    }

    let placementSpot = null;
    let bestSpotScore = -Infinity;
    const debugSpotScores = true; // MANTENER ACTIVADO para calibrar

    const estimatedMaxMapDistance = 30; // Ajusta según el tamaño real de tus mapas
    const dangerRadius = 4; // Radio para penalizar cercanía a enemigos (visibleHumanUnits)
    // const immediateThreatCheckRadius = 1; // Ya no se usa aquí, se usa en decideUnitForDeploymentBasedOnSpot

    for (const hex of availableSpots) {
         let score = 0;
         const distanceToMission = hexDistance(hex.r, hex.c, mission.r, mission.c);

         // === Lógica de puntuación EXTREMA - PRIORIDAD ABSOLUTA A CERCANÍA/COLOCACIÓN DIRECTA ===

         // 1. Premiar estar lo más cerca posible del objetivo principal - MUY DOMINANTE
         // Puntuación = (MaxPossibleDistance - CurrentDistance) * Weight.
         score += (estimatedMaxMapDistance - distanceToMission) * 1000; // Ponderación EXTREMA (1000).


         // 2. Premio/Penalización por estar DIRECTAMENTE en el hexágono objetivo (si aplica) - ENORME
         if (hex.r === mission.r && hex.c === mission.c) {
             if (mission.type.indexOf('RESOURCE') !== -1) {
                  score += 200000; // PREMIO COLOSAL por estar directamente en recurso
             } else if (mission.type === 'HILL_FOR_FORTRESS') {
                  score += 150000; // PREMIO MUY ALTO por estar directamente en colina objetivo
             } else if (mission.type === 'CAPITAL_RUSH') {
                  // Si es capital enemiga: solo un gran premio si NO hay enemigos adyacentes (visiblemente).
                  const enemiesAdjacentToObjective = visibleHumanUnits.filter(hu => hexDistance(hu.r, hu.c, hex.r, hex.c) <= 1);; // Usar visibleHumanUnits
                  if (enemiesAdjacentToObjective.length === 0) { // Si la capital enemiga visible está vacía a su alrededor
                       score += 100000; // Premio ALTO
                  } else {
                       // Penalización si el objetivo exacto (capital enemiga) está ocupado por enemigo adyacente
                       score -= 80000; // GRAN penalización
                  }
             } else if (mission.type === 'DEFEND_CAPITAL') {
                  score += 150000; // PREMIO MUY ALTO por estar en la capital propia (defensa)
             }
         } else {
             // Si NO estamos en el objetivo exacto, pero estamos adyacentes a él (distancia 1)
              if (distanceToMission === 1) {
                  if (mission.type === 'CAPITAL_RUSH') score += 10000; // Buen premio por estar adyacente a capital enemiga
                  else if (mission.type.indexOf('RESOURCE') !== -1) score += 5000; // Premio por estar adyacente a recurso
                  // Puedes añadir otros casos para adyacencia a colinas, etc.
              }
         }


         // 3. Premiar si está en terreno defensivo (colina/bosque) - Peso moderado
         const hexTerrain = board[hex.r]?.[hex.c]?.terrain;
         if (hexTerrain === 'hills') score += 200;
         if (hexTerrain === 'forest') score += 100;


         // 4. Penalizar si el spot está DEMASIADO cerca de unidades enemigas VISIBLES. - Penalización EXTREMA
         // Usamos la lista de visibleHumanUnits cacheada.
         if (visibleHumanUnits.length > 0) {
             const nearestEnemyDist = visibleHumanUnits.reduce((minDist, enemy) => {
                 return Math.min(minDist, hexDistance(hex.r, hex.c, enemy.r, enemy.c));
             }, Infinity);

             if (nearestEnemyDist <= dangerRadius) {
                 // Penalización inversamente proporcional a la distancia dentro del radio peligroso
                 score -= (dangerRadius - nearestEnemyDist + 1) * 200; // Penalización ENORME. +1 para penalizar distancia 3 también.
             }
         }

        // --- Debugging Score ---
         if(debugSpotScores) console.log(`[DeployAI V30.1 - Paso 5 Debug]     Spot (${hex.r},${hex.c}) - Score: ${score.toFixed(2)} (Dist to Mission: ${distanceToMission})`);


         if (score > bestSpotScore) {
             bestSpotScore = score;
             placementSpot = { r: hex.r, c: hex.c };
         }
    }

    // Umbral mínimo de score y fallback
    const scoreThreshold = -100000; // Ajusta umbral

    if (!placementSpot || bestSpotScore < scoreThreshold) {
         console.warn(`[DeployAI V30.1 - Paso 5] No se encontró un spot válido con score suficiente (${bestSpotScore.toFixed(2)} < ${scoreThreshold}) para misión en (${mission.r},${mission.c}). Intentando fallback: el más cercano a la misión.`);
         // Fallback: usar el spot disponible más cercano a la misión, ignorando score complejo
         if (availableSpots.length > 0) {
              const closestSpot = availableSpots.reduce((closest, spot) => {
                  const dist = hexDistance(spot.r, spot.c, mission.r, mission.c);
                  if (dist < closest.dist) return { spot, dist };
                  return closest;
              }, { spot: null, dist: Infinity }).spot;

               if (closestSpot) {
                 console.warn(`[DeployAI V30.1 - Paso 5] Usando spot fallback más cercano a la misión: (${closestSpot.r},${closestSpot.c}).`);
                 placementSpot = closestSpot;
               } else {
                 console.warn(`[DeployAI V30.1 - Paso 5] No hay spots disponibles ni siquiera para fallback.`);
                 return null; // No hay spots disponibles en absoluto
               }

         } else {
             console.warn(`[DeployAI V30.1 - Paso 5] No hay spots disponibles.`);
             return null; // No hay spots disponibles en absoluto
         }
    }

    console.log(`%c[DeployAI V30.1 - Paso 5] Mejor spot seleccionado para misión en (${mission.r},${mission.c}): (${placementSpot.r},${placementSpot.c}) (Score: ${bestSpotScore.toFixed(2)})`, "color: green");

    return placementSpot; // Retorna el spot elegido
}


// ========================================================================
// === FUNCIÓN PRINCIPAL: deployUnitsAI (Usa los Pasos/Resultados) ===
// ========================================================================
function deployUnitsAI(playerNumber) {
    console.log(`%c[DeployAI V30.1 - FINAL PUSH Modular] Iniciando para Jugador IA ${playerNumber}`, "color: #8A2BE2; font-weight:bold;");

    // --- Setup y validaciones ---
    if (gameState.currentPhase !== "deployment") {
        console.log("[DeployAI V30.1] No es la fase de despliegue. Abortando.");
        return;
    }

    const aiLevel = gameState.playerAiLevels?.[`player${playerNumber}`] || 'normal';
    const unitLimit = gameState.deploymentUnitLimit;
    const enemyPlayer = playerNumber === 1 ? 2 : 1;
    const playerResources = gameState.playerResources[playerNumber];

    if (!playerResources) {
        console.error(`[DeployAI V30.1] Recursos para el jugador ${playerNumber} no encontrados. Abortando.`);
        return;
    }

    const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);

    let maxUnitsToAttempt;
    if (unitLimit === Infinity) {
        maxUnitsToAttempt = (aiLevel === 'easy' ? 5 : (aiLevel === 'normal' ? 8 : 12));
        console.log(`[DeployAI V30.1] Modo Ilimitado: Intentará crear hasta ${maxUnitsToAttempt} unidades (límite por nivel).`);
    } else {
        maxUnitsToAttempt = unitLimit - (gameState.unitsPlacedByPlayer?.[playerNumber] || 0);
        console.log(`[DeployAI V30.1] Modo Límite (${unitLimit}): Intentará crear hasta ${maxUnitsToAttempt} unidades.`);
    }

     if (maxUnitsToAttempt <= 0) {
        console.log("[DeployAI V30.1] Ya se alcanzó el límite de unidades para desplegar este turno. Finalizando.");
        return;
     }

    // --- Recolectar ALL Resource Nodes (necesario para getTopStrategicObjectives y findBestPlacementSpot) ---
     const allResourceNodes = [];
     if (board && board.length > 0) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                if (board[r][c]?.resourceNode) { // No verificar owner aquí, la lógica de objetivos lo hará
                    allResourceNodes.push({ r, c, type: board[r][c].resourceNode, owner: board[r][c].owner });
                }
            }
        }
     }
     console.log(`[DeployAI V30.1] Recolectados ${allResourceNodes.length} nodos de recurso en el mapa.`);


    // --- PASO 1: Obtener los 10 Objetivos Estratégicos más importantes ---
    const top10Objectives = getTopStrategicObjectives(playerNumber, allResourceNodes, 10); // Pasamos allResourceNodes

    if (top10Objectives.length === 0) {
        console.error("[DeployAI V30.1] CRÍTICO: No se encontraron objetivos estratégicos. No se puede determinar dónde desplegar unidades.");
        if (typeof logMessage === "function") { logMessage(`IA (Jugador ${playerNumber}) no ha desplegado unidades este turno (sin objetivos).`); }
        return; // Abortar si no hay objetivos
    }

    // --- PASO 1.5: Recolectar spots de despliegue válidos globales UNA VEZ ---
    const allValidDeploymentSpots = [];
     if (board && board.length > 0) {
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                 const hex = board[r]?.[c];
                 if (hex && !getUnitOnHex(r, c)) {
                     const terrainType = hex.terrain;
                     const isImpassableForDeployment = TERRAIN_TYPES && TERRAIN_TYPES[terrainType]?.isImpassableForLand || false;
                     if (!isImpassableForDeployment) {
                         allValidDeploymentSpots.push({r, c});
                     }
                 }
            }
        }
     }
    console.log(`[DeployAI V30.1] Encontrados ${allValidDeploymentSpots.length} hexágonos válidos para despliegue globalmente al inicio.`);

    // Si no hay spots válidos globales al inicio, no podemos desplegar NADA
    if (allValidDeploymentSpots.length === 0) {
         console.warn(`[DeployAI V30.1] No hay hexágonos válidos y vacíos para desplegar en todo el mapa. Finalizando despliegue.`);
         if (typeof logMessage === "function") {
             logMessage(`IA (Jugador ${playerNumber}) no ha desplegado unidades este turno (sin spots válidos).`);
         }
         return; // Abortar si no hay spots
    }

    // Cachear la lista de unidades humanas visibles para usar en la puntuación Y decisión de rol
    const playerKeyForVisibility = `player${playerNumber}`;
    const visibleHumanUnits = units.filter(e =>
        e.player === enemyPlayer && e.currentHealth > 0 &&
        board[e.r]?.[e.c]?.visibility?.[playerKeyForVisibility] === 'visible'
    );
    console.log(`[DeployAI V30.1] Cacheando ${visibleHumanUnits.length} unidades humanas visibles para evaluación de spots y decisión de rol.`);

    // --- PASO 2: Verificar si en alrededor de esos 10 casillas hay unidad humana ---
    // Esta función ahora solo informa si hay amenaza global, no decide el rol.
    // La lógica de checkAroundObjectives está en la función Paso 2.
    const anyHumanVisibleInMap = visibleHumanUnits.length > 0;
    console.log(`[DeployAI V30.1] ¿Hay humanos visibles en el mapa? ${anyHumanVisibleInMap}. (Según cache de ${visibleHumanUnits.length} unidades visibles)`);


    // --- FASE DE DESPLIEGUE: BUCLE PARA DESPLEGAR MÚLTIPLES UNIDADES ---
    let objectiveIndex = 0; // Índice para rotar entre los objetivos estratégicos (usa topObjectives)
    let unitsActuallyCreated = 0;

    const regimientoTypes = REGIMENT_TYPES;


    // Bucle para intentar desplegar hasta maxUnitsToAttempt unidades
    for (let i = 0; i < maxUnitsToAttempt; i++) {
        console.log(`%c[DeployAI V30.1] --- Intentando desplegar unidad #${i + 1} (de ${maxUnitsToAttempt}) ---`, "color: blue");

        // 2a. Asignar la misión a esta unidad (del top 10 list)
        if (top10Objectives.length === 0) {
             console.warn(`[DeployAI V30.1] No quedan objetivos estratégicos (del top 10). Saltando unidad #${i + 1}.`);
             break; // Salir del bucle si no hay objetivos top 10 restantes
        }
        if (objectiveIndex >= top10Objectives.length) {
            objectiveIndex = 0; // Reiniciar el ciclo de objetivos si se acaban del top 10
        }
        const mission = top10Objectives[objectiveIndex]; // Objetivo para ESTA unidad
         console.log(`[DeployAI V30.1] -> Objetivo asignado para unidad #${i + 1}: ${mission.type} en (${mission.r},${mission.c}) (Prioridad: ${mission.priority})`);


        // --- PASO 5: Encontrar el mejor lugar de despliegue para UNA unidad ---
        // "Variable" del punto 5. Este es el resultado de la función findBestPlacementSpot.
         // Filtramos la lista global de spots válidos para obtener solo los que están *actualmente* vacíos
         const availableDeploymentSpotsCurrent = allValidDeploymentSpots.filter(spot => !getUnitOnHex(spot.r, spot.c)); // Usar spot.r y spot.c

         let placementSpot = findBestPlacementSpot(playerNumber, mission, availableDeploymentSpotsCurrent, visibleHumanUnits, board, aiCapital, allResourceNodes);

         if (!placementSpot) {
              console.warn(`[DeployAI V30.1] findBestPlacementSpot no devolvió un spot válido para unidad #${i + 1}. Saltando unidad.`);
              objectiveIndex++; continue; // Saltar esta unidad si no se encontró spot válido
         }


        // --- PASO 3 & 4: Decidir el rol, regimientos y costo para UNA unidad (basado en spot y amenaza inmediata) ===
        // Esto utiliza el spot elegido (resultado del Paso 5) para la decisión final de rol.
        let unitRoleForCreation; // Rol para crear ESTA unidad
        let unitNamePrefixForCreation; // Nombre para ESTA unidad
        let requiredRegimentsForCreation = []; // Regimientos para ESTA unidad
        let unitBaseCostForCreation = 0; // Costo base de ESTA unidad
        let canDefineRegimentsFlag = true; // Bandera para verificar si los regimientos existen


        // Verificar si el SPOT ELEGIDO está MUY cerca de un enemigo visible (radio muy pequeño)
        let immediateThreatNearChosenSpot = false;
        const immediateThreatCheckRadius = 1; // Solo hexágonos adyacentes o el propio spot

         if (visibleHumanUnits.length > 0 && placementSpot) {
             for (const humanUnit of visibleHumanUnits) {
                 if (humanUnit && humanUnit.r !== -1 && humanUnit.c !== -1) {
                     if (board[humanUnit.r]?.[humanUnit.c]) {
                         if (hexDistance(humanUnit.r, humanUnit.c, placementSpot.r, placementSpot.c) <= immediateThreatCheckRadius) {
                             console.log(`[DeployAI V30.1 - Paso 3] Detección Amenaza Inmediata cerca del spot elegido (${placementSpot.r},${placementSpot.c}).`);
                             immediateThreatNearChosenSpot = true;
                             break;
                         }
                     }
                 }
             }
         }
        console.log(`[DeployAI V30.1 - Paso 3] Amenaza INMEDIATA cerca del spot elegido (${placementSpot?.r},${placementSpot?.c}): ${immediateThreatNearChosenSpot}.`);


        // === LÓGICA DE DECISIÓN DE ROL/TIPO FINAL (Basada en Amenaza INMEDIATA cerca del SPOT) ===
        // Decide el rol de ESTA unidad:
        // - CONQUEROR si hay amenaza INMEDIATA (adjacente o en la misma casilla) cerca del spot elegido.
        // - EXPLORER en cualquier otro caso (sin amenaza inmediata cerca del spot).
        if (immediateThreatNearChosenSpot) {
             unitRoleForCreation = 'conqueror';
             unitNamePrefixForCreation = 'Conqueror Division';
             requiredRegimentsForCreation = ['Infantería Ligera', 'Infantería Pesada', 'Arqueros'];
             console.log(`%c[DeployAI V30.1 - Paso 3] Rol decidido: Amenaza INMEDIATA detectada cerca del spot -> CONQUEROR.`, "color: red");
        } else {
             unitRoleForCreation = 'explorer';
             unitNamePrefixForCreation = 'Explorer Division';
             requiredRegimentsForCreation = ['Infantería Ligera'];
             console.log(`%c[DeployAI V30.1 - Paso 3] Rol decidido: No hay amenaza INMEDIATA cerca del spot -> EXPLORER.`, "color: green");
        }
        // === FIN LÓGICA DE DECISIÓN DE ROL/TIPO FINAL ===


        // === Construir la lista de regimientos y calcular costo para la unidad decidida ===
        let tempRegimentsListForCreation = [];
        let tempUnitCostForCreation = 0;
        // Bandera para verificar si los regimientos existen
        // CORRECCIÓN: Bandera declarada aquí, dentro de esta iteración, no fuera.
        let canDefineRegimentsFlagThisUnit = true;


        console.log(`[DeployAI V30.1 - Paso 4 Debug] Consultando REGIMENT_TYPES para ${unitRoleForCreation}`);
        for (const type of requiredRegimentsForCreation) {
            const regData = regimientoTypes && regimientoTypes[type];
            console.log(`[DeployAI V30.1 - Paso 4 Debug] Info para '${type}': ${JSON.stringify(regData)}`);
            if (!regData) {
                 console.error(`[DeployAI V30.1 - Paso 4] ERROR: Regimiento requerido para ${unitRoleForCreation} '${type}' no encontrado en REGIMENT_TYPES.`);
                 canDefineRegimentsFlagThisUnit = false; // Asignar
                 break; // Romper el bucle for(requiredRegiments)
            }
            const regCost = regData.cost?.oro || 0;
            console.log(`[DeployAI V30.1 - Paso 4 Debug] Costo oro para '${type}': ${regCost}`);
            tempUnitCostForCreation += regCost;
            tempRegimentsListForCreation.push({ ...regData, type: type });
        }

        if (!canDefineRegimentsFlagThisUnit) {
             console.warn(`[DeployAI V30.1 - Paso 4] No se pudieron definir los regimientos para la unidad '${unitRoleForCreation}'. Saltando unidad #${i + 1}.`);
             objectiveIndex++; continue;
        }

        regimentsForUnit = tempRegimentsListForCreation;
        unitBaseCost = tempUnitCostForCreation;
        const deploymentCost = unitBaseCost;

         console.log(`[DeployAI V30.1 - Paso 4] Unidad a Crear para unidad #${i + 1}: Tipo: ${unitNamePrefixForCreation} (${unitRoleForCreation}), Regimientos: ${requiredRegimentsForCreation.join(' + ')}, Costo Calculado: ${deploymentCost}.`);


        // 2f. Comprobar si la IA puede pagar ESTA unidad
        if ((playerResources.oro || 0) < deploymentCost) {
            console.warn(`[DeployAI V30.1] Sin oro suficiente (${playerResources.oro}) para desplegar la unidad ${unitNamePrefixForCreation} (necesita ${deploymentCost}). Finalizando despliegue para este turno.`);
            break;
        }
         console.log(`[DeployAI V30.1] Oro suficiente. Procediendo a crear y colocar unidad #${i + 1}.`);


        // 2h. Crear el objeto de la unidad con sus regimientos
        const unitUUID = `u${unitIdCounter++}`;
        const newUnitData = {
            id: unitUUID,
            player: playerNumber,
            name: `${unitNamePrefixForCreation} IA ${unitsActuallyCreated + 1}`,
            regiments: regimentsForUnit,
            // === CÁLCULO DE ESTADÍSTICAS DE LA UNIDAD ===
            attack: regimentsForUnit.reduce((sum, reg) => sum + (reg?.attack || 0), 0),
            defense: regimentsForUnit.reduce((sum, reg) => sum + (reg?.defense || 0), 0),
            maxHealth: regimentsForUnit.reduce((sum, reg) => sum + (reg?.health || 0), 0),
            currentHealth: regimentsForUnit.reduce((sum, reg) => sum + (reg?.health || 0), 0),
            movement: Math.min(...regimentsForUnit.map(reg => reg?.movement || Infinity)),
            currentMovement: Math.min(...regimentsForUnit.map(reg => reg?.movement || Infinity)),
            visionRange: Math.max(...regimentsForUnit.map(reg => reg?.visionRange || 0)),
            attackRange: Math.max(...regimentsForUnit.map(reg => reg?.attackRange || 0)),
            initiative: Math.max(...regimentsForUnit.map(reg => reg?.initiative || 0)),
            experience: 0,
            r: placementSpot.r,
            c: placementSpot.c,
            sprite: regimentsForUnit[0]?.sprite || '',
            element: null,
            hasMoved: false, // Las unidades recién desplegadas no se mueven en el mismo turno de despliegue
            hasAttacked: false, // Las unidades recién desplegadas no atacan en el mismo turno de despliegue
            cost: { oro: deploymentCost }, // Usamos el costo total calculado
            level: 0,

            // <<== NUEVO: Añadir las propiedades de moral para que no nazcan "rotas" ==>>
            morale: 50,
            maxMorale: 125,
            isDemoralized: false
            // <<== FIN DE LA MODIFICACIÓN ==>>
        };

        // === Debugging Final Stats ===
         console.log(`%c[DeployAI V30.1] Debug Final Stats: Unidad ${newUnitData.name} (id:${newUnitData.id}) calculada: HP=${newUnitData.maxHealth}/${newUnitData.currentHealth}, Mov=${newUnitData.movement}, Atk=${newUnitData.attack}, Def=${newUnitData.defense}, Range=${newUnitData.attackRange}, Init=${newUnitData.initiative}. Cost=${newUnitData.cost?.oro}`, "color: cyan");


        // 2i. Deducir recursos
        playerResources.oro -= deploymentCost;
        if (playerResources.oro < 0) playerResources.oro = 0;
         console.log(`[DeployAI V30.1] Oro restante: ${playerResources.oro}.`);


        // 2j. Asignar el rol
        AiManager.unitRoles.set(newUnitData.id, unitRoleForCreation); // Usar el rol decidido para ESTA unidad
        console.log(`%c[DeployAI V30.1] Unidad creada exitosamente y rol asignado: ${newUnitData.name} en (${placementSpot.r},${placementSpot.c}).`, "color: green");


        // 2k. Colocar la unidad en el tablero
        placeFinalizedDivision(newUnitData, placementSpot.r, placementSpot.c);
        unitsActuallyCreated++;

        if (unitLimit !== Infinity) {
             gameState.unitsPlacedByPlayer[playerNumber] = (gameState.unitsPlacedByPlayer[playerNumber] || 0) + 1;
        }

        objectiveIndex++; // Pasar al siguiente objetivo para la SIGUIENTE unidad a intentar crear
    }

    // Log final
    if (typeof logMessage === "function") {
        if (unitsActuallyCreated > 0) {
             logMessage(`IA (Jugador ${playerNumber}) ha desplegado ${unitsActuallyCreated} unidad(es).`);
        } else {
             logMessage(`IA (Jugador ${playerNumber}) no ha desplegado unidades este turno (sin recursos, sin spots, o límite alcanzado/cálculo inicial 0).`);
        }
    }

    console.log(`%c[DeployAI V30.1 - FINAL PUSH Modular] Despliegue FINALIZADO para Jugador IA 2. Unidades creadas: ${unitsActuallyCreated}`, "color: purple; font-weight:bold");
}

 

// Asegúrate de que las siguientes variables/funciones globales están accesibles y son correctas:
// - REGIMENT_TYPES (con stats y costos de oro para cada tipo)
// - unitIdCounter (global)
// - placeFinalizedDivision(unitData, r, c)
// - getUnitOnHex(r, c)
// - hexDistance(r1, c1, r2, c2)
// - logMessage(msg)
// - AiManager.unitRoles (Map())
// - gameState (global)
// - AI_RESOURCE_PRIORITY (global)
// - TERRAIN_TYPES (global, con isImpassableForLand o similar)
// - getHexNeighbors(r, c, radius) (soporta radio)