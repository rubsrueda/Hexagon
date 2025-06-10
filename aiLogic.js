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

    // --- FUNCIÓN PRINCIPAL DEL TURNO DE LA IA ---
    executeTurn: function(aiPlayerNumber, aiLevel) {
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
        // console.log(`[AI Manager] manageEmpire: Para Jugador IA ${aiPlayerNumber}`);
        this.decideResearch(aiPlayerNumber, aiLevel);
        this.decideUnitProduction(aiPlayerNumber);
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
        console.log(`%c[AI Unit Decide] Para ${unit.name}`, "color: orange");
        let actionPerformed = false;
        const enemyPlayer = aiPlayerNumber === 1 ? 2 : 1;

        // ... (toda tu lógica existente de defensa, ataque, recursos, etc. no cambia)

        // C1: ACCIÓN DEFENSIVA CRÍTICA
        if (!actionPerformed && (!unit.hasMoved || !unit.hasAttacked) && this.isCapitalUnderImmediateThreat(aiPlayerNumber, unit, enemyPlayer)) {
            actionPerformed = await this.attemptToDefendCapital(unit, aiPlayerNumber, aiLevel, enemyPlayer);
        }

        // C3: ACCIÓN OFENSIVA OPORTUNISTA
        if (!actionPerformed && !unit.hasAttacked) {
            actionPerformed = await this.attemptOpportunisticAttack(unit, aiPlayerNumber, aiLevel, enemyPlayer);
        }
        
        // C5: ACCIÓN DE EXPANSIÓN Y CONTROL DE RECURSOS
        if (!actionPerformed && !unit.hasMoved) { 
            actionPerformed = await this.attemptSecureResource(unit, aiPlayerNumber, aiLevel, enemyPlayer);
        }
        
        // C6: ACCIÓN DE LÍNEAS DE SUMINISTRO
        if (!actionPerformed && !unit.hasMoved && (typeof isHexSupplied === "function" && !isHexSupplied(unit.r, unit.c, aiPlayerNumber))) {
            actionPerformed = await this.tryMoveToSupply(unit, aiPlayerNumber, aiLevel);
        }

        // C7: MOVIMIENTO GENERAL (Fallback)
        if (!actionPerformed && !unit.hasMoved) { 
            actionPerformed = await this.executeGeneralMovement(unit, aiPlayerNumber, aiLevel, enemyPlayer);
        }

        // C8: EXPANSIÓN TERRITORIAL (Último Recurso)
        if (!actionPerformed && !unit.hasMoved) {
            console.log(`  [AI Decide] -> Chequeando Expansión Territorial como último recurso...`);
            actionPerformed = await this.attemptTerritorialExpansion(unit, aiPlayerNumber);
        }

        if (!actionPerformed) {
            console.log(`  [AI Decide] -> NO SE ENCONTRÓ NINGUNA ACCIÓN para ${unit.name}. La unidad esperará.`);
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

    // --- C8: Producir Unidades ---
    decideUnitProduction: function(aiPlayerNumber) {
        console.log(`[AI Empire] Chequeando producción de unidades para Jugador ${aiPlayerNumber}.`);
        const playerRes = gameState.playerResources[aiPlayerNumber];
        
        // Condición 1: ¿Tiene suficientes recursos para si quiera pensar en construir?
        // (Evita que gaste su último oro. Puede que lo necesite para otra cosa).
        const goldThreshold = 50; // Umbral mínimo de oro para considerar producir.
        if (!playerRes || playerRes.oro < goldThreshold) {
            console.log(`[AI Empire] Producción detenida: Oro (${playerRes.oro}) por debajo del umbral (${goldThreshold}).`);
            return;
        }

        // Condición 2: ¿Está en inferioridad numérica? ¡Es una gran razón para producir!
        const aiUnitsCount = units.filter(u => u.player === aiPlayerNumber).length;
        const enemyUnitsCount = units.filter(u => u.player !== aiPlayerNumber).length;
        const shouldProduce = aiUnitsCount < enemyUnitsCount || playerRes.oro > 150; // Producir si está en desventaja o si le sobra el oro.
        
        if (!shouldProduce) {
            console.log(`[AI Empire] Producción detenida: No hay necesidad estratégica inmediata (Unidades IA: ${aiUnitsCount}, Enemigas: ${enemyUnitsCount}).`);
            return;
        }

        // Condición 3: ¿Tiene un lugar donde construir? (Una ciudad o fortaleza vacía)
        const validRecruitmentHexes = gameState.cities.filter(c => 
            c.owner === aiPlayerNumber &&
            !getUnitOnHex(c.r, c.c) // ¡El hexágono debe estar vacío!
        );
        if (validRecruitmentHexes.length === 0) {
            console.log(`[AI Empire] Producción detenida: No hay ciudades/fortalezas vacías para desplegar.`);
            return;
        }
        const recruitmentHex = validRecruitmentHexes[0]; // Usar el primero que encuentre.

        // Decidir QUÉ unidad construir. Por ahora, la más barata para expandirse.
        const unitToBuildType = "Infantería Ligera";
        const unitCost = REGIMENT_TYPES[unitToBuildType].cost.oro;

        if (playerRes.oro >= unitCost) {
            console.log(`%c[AI Empire] ¡DECISIÓN: Producir ${unitToBuildType} en (${recruitmentHex.r}, ${recruitmentHex.c})!`, "color: green; font-weight: bold;");
            
            // Crear el objeto de la nueva unidad (lógica simplificada de `deployUnitsAI`)
            const regimiento = { ...REGIMENT_TYPES[unitToBuildType], type: unitToBuildType };
            const newUnitData = {
                id: `u${unitIdCounter++}`,
                player: aiPlayerNumber,
                name: `Refuerzo IA #${aiUnitsCount + 1}`,
                regiments: [regimiento],
                attack: regimiento.attack,
                defense: regimiento.defense,
                maxHealth: regimiento.health,
                currentHealth: regimiento.health,
                movement: regimiento.movement,
                currentMovement: 0, // Las unidades nuevas no se mueven en el turno que se crean
                visionRange: regimiento.visionRange,
                attackRange: regimiento.attackRange,
                experience: 0,
                sprite: regimiento.sprite,
                hasMoved: true, // Marcar como que ya actuó
                hasAttacked: true,
                cost: { oro: unitCost },
                level: 0
            };

            // Deducir coste y colocarla en el mapa
            playerRes.oro -= unitCost;
            placeFinalizedDivision(newUnitData, recruitmentHex.r, recruitmentHex.c);
            if (typeof logMessage === "function") logMessage(`IA ha reclutado a ${newUnitData.name}.`);
        }
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
                const outcome = this.predictCombatOutcome(unit, enemy); // outcome.log tendrá detalles
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
                    const outcome = this.predictCombatOutcome(tempAttackerState, enemy);
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

    predictCombatOutcome: function(attacker, defender) {
        if (!attacker || !defender) {
            console.error("[AI Predict] Error: Atacante u objetivo nulo para predicción.");
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
            attackerDiesInRetaliation: false,
            log: []
        };

        // --- Simulación del ataque del 'attacker' al 'defender' ---
        let attackerAttackStat = attacker.attack || 0;
        let defenderDefenseStat = defender.defense || 0;
        let defenderCurrentHealth = defender.currentHealth;

        // Considerar bonos de terreno para el defensor (similar a applyDamage)
        const defenderHexData = board[defender.r]?.[defender.c];
        let terrainDefenseBonusDefender = 0;
        if (defenderHexData && defenderHexData.terrain && typeof TERRAIN_TYPES !== 'undefined' && TERRAIN_TYPES[defenderHexData.terrain]) {
            terrainDefenseBonusDefender = TERRAIN_TYPES[defenderHexData.terrain].defenseBonus || 0;
        }
        defenderDefenseStat += terrainDefenseBonusDefender;

        // Considerar flanqueo (simplificado: si el atacante tuviera un bono, o si el defensor estuviera previamente marcado como flanqueado)
        // Para una predicción más precisa, se podría simular si el movimiento del atacante crea una situación de flanqueo,
        // pero por ahora usaremos un enfoque más simple. No aplicamos flanqueo en la predicción a menos que tengas una forma
        // de determinarlo hipotéticamente.
        let effectiveAttackerAttack = attackerAttackStat; // Podría multiplicarse por bono de flanqueo si se predice

        let damageToDefenderCalc = Math.round(effectiveAttackerAttack - defenderDefenseStat);
        if (damageToDefenderCalc < 0) damageToDefenderCalc = 0;
        if (effectiveAttackerAttack > 0 && damageToDefenderCalc === 0) damageToDefenderCalc = 1; // Daño mínimo

        prediction.damageToDefender = Math.min(damageToDefenderCalc, defenderCurrentHealth);
        if (prediction.damageToDefender >= defenderCurrentHealth) {
            prediction.defenderDies = true;
        }
        prediction.log.push(`Predicción: ${attacker.name} (Atk:${attackerAttackStat}) vs ${defender.name} (Def:${defenderDefenseStat}, TerrBonus:${terrainDefenseBonusDefender}). Daño Def: ${prediction.damageToDefender}. Defensor muere: ${prediction.defenderDies}`);


        // --- Simulación del contraataque del 'defender' al 'attacker' (si el defensor sobrevive y puede contraatacar) ---
        if (!prediction.defenderDies) {
            // ¿Puede el defensor contraatacar? (Simplificado: si tiene rango y no ha "actuado" en un sentido que lo impida)
            // Aquí isValidAttack se usa para chequear rango y que no sea aliado.
            // No chequeamos 'hasAttacked' del defensor aquí porque es una predicción.
            if (typeof isValidAttack === "function" && isValidAttack({ ...defender, hasAttacked: false }, attacker)) { // Pasamos un clon sin hasAttacked para el chequeo de rango
                let defenderAttackStat = defender.attack || 0;
                let attackerDefenseStat = attacker.defense || 0;
                let attackerCurrentHealth = attacker.currentHealth;

                const attackerHexData = board[attacker.r]?.[attacker.c];
                let terrainDefenseBonusAttacker = 0;
                if (attackerHexData && attackerHexData.terrain && typeof TERRAIN_TYPES !== 'undefined' && TERRAIN_TYPES[attackerHexData.terrain]) {
                    terrainDefenseBonusAttacker = TERRAIN_TYPES[attackerHexData.terrain].defenseBonus || 0;
                }
                attackerDefenseStat += terrainDefenseBonusAttacker;
                
                let effectiveDefenderAttack = defenderAttackStat;
                let damageToAttackerCalc = Math.round(effectiveDefenderAttack - attackerDefenseStat);
                if (damageToAttackerCalc < 0) damageToAttackerCalc = 0;
                if (effectiveDefenderAttack > 0 && damageToAttackerCalc === 0) damageToAttackerCalc = 1;

                prediction.damageToAttacker = Math.min(damageToAttackerCalc, attackerCurrentHealth);
                if (prediction.damageToAttacker >= attackerCurrentHealth) {
                    prediction.attackerDiesInRetaliation = true; // Muere específicamente por el contraataque
                    prediction.attackerDies = true; // Estado general de si el atacante muere
                }
                prediction.log.push(`Predicción Retaliación: ${defender.name} (Atk:${defenderAttackStat}) vs ${attacker.name} (Def:${attackerDefenseStat}, TerrBonus:${terrainDefenseBonusAttacker}). Daño Atk: ${prediction.damageToAttacker}. Atacante muere: ${prediction.attackerDiesInRetaliation}`);
            } else {
                prediction.log.push(`Predicción Retaliación: ${defender.name} no puede contraatacar (fuera de rango o condición inválida).`);
            }
        } else {
            prediction.log.push(`Predicción Retaliación: ${defender.name} muere, no hay contraataque.`);
        }
        
        // console.log(`%c[AI Predict Outcome] Para ${attacker.name} vs ${defender.name}:\n${prediction.log.join("\n")}`, "color: olive");
        return prediction;
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

};

function deployUnitsAI(playerNumber) {
    console.log(`%c[DeployAI V20 - Misiones Individuales] Iniciando para Jugador IA ${playerNumber}`, "color: #8A2BE2; font-weight:bold;");
    
    // --- Setup y validaciones ---
    if (gameState.currentPhase !== "deployment") return;
    const aiLevel = gameState.playerAiLevels?.[`player${playerNumber}`] || 'normal';
    const unitLimit = gameState.deploymentUnitLimit;
    const enemyPlayer = playerNumber === 1 ? 2 : 1;
    
    // --- CAMBIO CLAVE: Cálculo de unidades a desplegar ---
    let unitsToCreate;
    if (unitLimit === Infinity) {
        // En modo ilimitado, decidir cuántas crear basado en el oro y el nivel de IA.
        const unitCost = 20; // Coste promedio de una unidad barata.
        const maxAffordable = Math.floor((gameState.playerResources[playerNumber].oro || 0) / unitCost);
        const desiredByAiLevel = (aiLevel === 'easy' ? 4 : (aiLevel === 'normal' ? 6 : 8));
        unitsToCreate = Math.min(maxAffordable, desiredByAiLevel);
    } else {
        unitsToCreate = Math.max(0, unitLimit - (gameState.unitsPlacedByPlayer[playerNumber] || 0));
    }
    
    if (unitsToCreate <= 0) {
        console.log("[DeployAI V20] No hay necesidad o recursos para desplegar más unidades.");
        return;
    }
    console.log(`[DeployAI V20] La IA intentará crear ${unitsToCreate} unidades.`);

    // --- FASE 1: OBTENER TODOS LOS OBJETIVOS ESTRATÉGICOS ---
    const humanCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
    const humanUnits = units.filter(u => u.player === enemyPlayer);
    const isHumanCapitalGuarded = humanCapital ? humanUnits.some(u => u.r === humanCapital.r && u.c === humanCapital.c) : true;
    let strategicObjectives = [];

    if (humanCapital && !isHumanCapitalGuarded) {
        strategicObjectives.push({ type: 'CAPITAL_RUSH', r: humanCapital.r, c: humanCapital.c, priority: 1000 });
    }
    
    const allResourceNodes = [];
    if (board && board.length > 0) { for (let r = 0; r < board.length; r++) for (let c = 0; c < board[0].length; c++) if (board[r][c]?.resourceNode) allResourceNodes.push({ r, c, type: board[r][c].resourceNode, owner: board[r][c].owner }); }
    if (allResourceNodes.length > 0) {
        allResourceNodes.forEach(node => {
            const resourceType = node.type.replace('_mina', '');
            let priority = AI_RESOURCE_PRIORITY[resourceType] || 0;
            // Aumentar la prioridad si el enemigo ya lo controla, para forzar conflicto.
            if (node.owner === enemyPlayer) { priority *= 1.5; }
            strategicObjectives.push({ type: 'RESOURCE', r: node.r, c: node.c, priority });
        });
    }
    strategicObjectives.sort((a, b) => b.priority - a.priority);
    
    if (strategicObjectives.length === 0) { console.warn("[DeployAI V20] No se encontraron objetivos estratégicos."); return; }
    console.log("[DeployAI V20] Lista de objetivos estratégicos:", strategicObjectives);

    // --- FASE 2: BUCLE DE DESPLIEGUE, ASIGNANDO MISIÓN A CADA UNIDAD ---
    let objectiveIndex = 0;
    for (let i = 0; i < unitsToCreate; i++) {
        if (objectiveIndex >= strategicObjectives.length) {
            // Si nos quedamos sin objetivos, reiniciamos la lista para las unidades restantes.
            objectiveIndex = 0; 
        }
        const mission = strategicObjectives[objectiveIndex];
        
        // --- Creación de unidad (lógica robusta) ---
        let regimentsForNewDivision = []; let divisionName = `División #${i+1}`; let divisionCost = { oro: 0 };
        const availableRegimentTypes = Object.keys(REGIMENT_TYPES);
        const randType = availableRegimentTypes[Math.floor(Math.random() * availableRegimentTypes.length)];
        regimentsForNewDivision.push({ ...REGIMENT_TYPES[randType], type: randType });
        regimentsForNewDivision.forEach(reg => { if (reg.cost) { for (const res in reg.cost) { divisionCost[res] = (divisionCost[res] || 0) + reg.cost[res]; } } });
        let canAfford = true; for (const res in divisionCost) { if ((gameState.playerResources[playerNumber][res] || 0) < divisionCost[res]) { canAfford = false; break; } }
        if (!canAfford) { console.warn(`[DeployAI V20] Sin oro para ${divisionName}. Finalizando despliegue.`); break; }
        
        let finalAttack = 0, finalDefense = 0, finalHealth = 0, finalMovement = Infinity, finalVision = 0, finalAttackRange = 0, finalInitiative = 0;
        let baseSprite = regimentsForNewDivision.length > 0 && REGIMENT_TYPES[regimentsForNewDivision[0].type] ? REGIMENT_TYPES[regimentsForNewDivision[0].type].sprite : '❓';
        regimentsForNewDivision.forEach(reg => { const regData = REGIMENT_TYPES[reg.type] || {}; finalAttack += regData.attack || 0; finalDefense += regData.defense || 0; finalHealth += regData.health || 0; finalMovement = Math.min(finalMovement, regData.movement || 1); finalVision = Math.max(finalVision, regData.visionRange || 0); finalAttackRange = Math.max(finalAttackRange, regData.attackRange || 0); finalInitiative = Math.max(finalInitiative, regData.initiative || 0); });
        finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;
        const newUnitData = { id: `u${unitIdCounter++}`, player: playerNumber, name: divisionName, regiments: regimentsForNewDivision, attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth, movement: finalMovement, currentMovement: finalMovement, visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative, experience: 0, r: -1, c: -1, sprite: baseSprite, element: null, hasMoved: false, hasAttacked: false, cost: divisionCost, level: 0 };

        // --- Búsqueda del mejor spot para esta misión específica ---
        let placementSpot = null;
        let minDistanceToMission = Infinity;

        // Buscar en todo el mapa el hexágono vacío más cercano al objetivo de ESTA unidad.
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                if (!getUnitOnHex(r, c)) { // ¡La clave! Comprueba si el spot está libre AHORA.
                    const distance = hexDistance(r, c, mission.r, mission.c);
                    if (distance < minDistanceToMission) {
                        minDistanceToMission = distance;
                        placementSpot = { r, c };
                    }
                }
            }
        }
        
        if (placementSpot) {
            for (const res in divisionCost) { gameState.playerResources[playerNumber][res] -= divisionCost[res]; }
            placeFinalizedDivision(newUnitData, placementSpot.r, placementSpot.c);
            console.log(`%c[DeployAI V20] -> ${newUnitData.name} en (${placementSpot.r},${placementSpot.c}) para objetivo en (${mission.r},${mission.c})`, "color: #9400D3;");
        } else {
            console.error("[DeployAI V20] No se encontró ningún lugar para desplegar la unidad.");
        }
        
        objectiveIndex++; // Pasar a la siguiente misión para la siguiente unidad
    }
}