// ======================================================================================
// ===        IA v12.0 - Consolidación de Ejércitos y Planificación Estratégica         ===
// ======================================================================================
console.log("ai_gameplayLogic.js v12.0 CARGADO");

const AiGameplayManager = {
    unitRoles: new Map(),
    turn_targets: new Set(),
    codeRed_rallyPoint: null,

    executeTurn: async function(aiPlayerNumber) {
        console.group(`%c[IA Turn] INICIO para Jugador IA ${aiPlayerNumber}`, "background: #333; color: #98fb98; font-size: 1.1em;");
        this.turn_targets.clear();
        this.codeRed_rallyPoint = null;

        this.assessThreatLevel(aiPlayerNumber);
        this.manageEmpire(aiPlayerNumber);

        const activeAiUnits = units.filter(u => u.player === aiPlayerNumber && u.currentHealth > 0);
        activeAiUnits.sort((a, b) => a.regiments.length - b.regiments.length); 

        for (const unit of activeAiUnits) {
            const unitInMemory = units.find(u => u.id === unit.id);
            if (unitInMemory?.currentHealth > 0 && !unitInMemory.hasMoved && !unitInMemory.hasAttacked) {
                await this.decideAndExecuteUnitAction(unitInMemory);
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        
        this.endAiTurn(aiPlayerNumber);
        console.groupEnd();
    },

    // <<== Evalúa la amenaza global al inicio del turno ==>>
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
            this.codeRed_rallyPoint = { r: anchorUnit.r, c: anchorUnit.c, anchorId: anchorUnit.id };
            console.log(`%c[IA] CÓDIGO ROJO! Amenaza masiva detectada (${biggestEnemyFormation} reg.). Estableciendo punto de reunión en la unidad ${anchorUnit.name} en (${anchorUnit.r},${anchorUnit.c})`, "color: red; font-weight: bold;");
        }
    },

    decideAndExecuteUnitAction: async function(unit) {
        console.groupCollapsed(`Decidiendo para ${unit.name} (${unit.regiments.length} regs) en (${unit.r},${unit.c})`);
        try {
            if (this.codeRed_rallyPoint && unit.id !== this.codeRed_rallyPoint.anchorId) {
                await this.moveToRallyPoint(unit);
                return; 
            }

            if (unit.regiments.length < 5 && this.unitRoles.get(unit.id) !== 'defender') {
                if (await this.findAndExecuteMerge_Proactive(unit)) { return; }
            }

            const enemyPlayer = unit.player === 1 ? 2 : 1;
            const enemies = units.filter(u => u.player === enemyPlayer && u.currentHealth > 0);

            if (enemies.length > 0) {
                await this._executeCombatLogic(unit, enemies);
            } else {
                await this._executeExpansionLogic(unit);
            }

        } catch(e) { console.error(`Error procesando ${unit.name}:`, e); } 
        finally { console.groupEnd(); }
    },

    findAndExecuteMerge_Proactive: async function(unit) {
        const potentialAllies = units.filter(u => 
            u.player === unit.player && u.id !== unit.id && !u.hasMoved && 
            (unit.regiments.length + u.regiments.length) <= MAX_REGIMENTS_PER_DIVISION
        );
        if (potentialAllies.length === 0) return false;

        // Buscar el "centro de gravedad" de las fuerzas cercanas
        const alliesInRange = potentialAllies.filter(a => hexDistance(unit.r, unit.c, a.r, a.c) < 7);
        if(alliesInRange.length === 0) return false; // No hay nadie lo suficientemente cerca como para molestarse
        
        // El objetivo es la unidad más fuerte de ese grupo cercano
        alliesInRange.sort((a, b) => b.regiments.length - a.regiments.length);
        const mergeAnchor = alliesInRange[0];

        const path = this.findPathToTarget(unit, mergeAnchor.r, mergeAnchor.c);
        if (path && (path.length - 1) <= unit.currentMovement) {
            console.log(`%c-> FUSIÓN ESTRATÉGICA: ${unit.name} se une al grupo de ${mergeAnchor.name}.`, "color: cyan;");
            await _executeMoveUnit(unit, mergeAnchor.r, mergeAnchor.c, true);
            
            const remainingAlly = units.find(u => u.id === mergeAnchor.id);
            const movedUnit = units.find(u => u.id === unit.id);
            if (remainingAlly && movedUnit) { mergeUnits(movedUnit, remainingAlly); return true; }
        }
        return false;
    },

    manageEmpire: function(playerNumber) {
        console.groupCollapsed(`%c[IA Empire] Fase de Gestión Imperial`, "color: #4CAF50");
        try { 
            this.handleStrategicReinforcements(playerNumber); 
            this.handleExpansionProduction(playerNumber);
            this.handleConstruction(playerNumber); // <<== NUEVA LLAMADA
        } 
        finally { console.groupEnd(); }
    },

    findBestStrategicObjective: function(unit, objectiveType = 'expansion') {
        const objectives = [];
        const enemyPlayer = unit ? (unit.player === 1 ? 2 : 1) : (gameState.currentPlayer === 1 ? 2 : 1);
        const allEnemyUnits = units.filter(u => u.player === enemyPlayer);

        board.flat().forEach(hex => {
            if(!hex) return;
            
            let score = 0;
            // Objetivo: Puntos para Fortalezas (cuellos de botella en la frontera)
            if (objectiveType === 'fortress_spot') {
                const isChokePoint = (hex.terrain === 'hills' || hex.terrain === 'forest') && getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.terrain === 'plains');
                const isNearFrontier = allEnemyUnits.some(e => hexDistance(hex.r, hex.c, e.r, e.c) < 5);
                if (isChokePoint && isNearFrontier) {
                    score += 100;
                }
            }
            // Objetivo: Expansión
            else if (objectiveType === 'expansion' && !hex.unit && hex.owner !== unit.player && !TERRAIN_TYPES[hex.terrain].isImpassableForLand) {
                // Puntos por cercanía al enemigo para arrinconar
                const closestEnemyDist = allEnemyUnits.reduce((min, e) => Math.min(min, hexDistance(hex.r, hex.c, e.r, e.c)), Infinity);
                if (closestEnemyDist !== Infinity) score += 50 - closestEnemyDist * 5;

                if (hex.resourceNode) score += 50;
                if (hex.isCity) score += 200;

                // Penalización por lejanía a la unidad que se mueve
                if (unit) score -= hexDistance(unit.r, unit.c, hex.r, hex.c);
            }

            if(score > 0) objectives.push({ hex, score });
        });
        
        objectives.sort((a, b) => b.score - a.score); 
        return objectives.map(o => o.hex);
    },
    
    handleConstruction: function(playerNumber) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if(!capital) return;

        // Decidir si construir (una vez cada 5 turnos, y si no estamos en apuros)
        if(gameState.turnNumber % 5 !== 0 || this.codeRed_rallyPoint) return;
        
        const playerRes = gameState.playerResources[playerNumber];
        
        // Decisión: ¿Fortaleza o Camino? (Simplificado por ahora)
        if (playerRes.oro > 800 && (playerRes.researchedTechnologies || []).includes('FORTIFICATIONS')) {
             const bestFortSpot = this.findBestStrategicObjective(null, 'fortress_spot');
             if(bestFortSpot) {
                 // Si la casilla ya es nuestra, construimos
                 if(bestFortSpot.owner === playerNumber && !bestFortSpot.structure) {
                     console.log(`%c[IA STRATEGY] Construyendo Fortaleza en punto clave (${bestFortSpot.r},${bestFortSpot.c})...`, "color: #ff8c00");
                     handleConfirmBuildStructure({
                         playerId: playerNumber, r: bestFortSpot.r, c: bestFortSpot.c,
                         structureType: 'Fortaleza', builderUnitId: null 
                     });
                 }
             }
        }
    },
    
    moveToRallyPoint: async function(unit) {
        const rallyR = this.codeRed_rallyPoint.r;
        const rallyC = this.codeRed_rallyPoint.c;

        if (hexDistance(unit.r, unit.c, rallyR, rallyC) <= 1) {
            console.log(`-> Llegó al punto de reunión. Intentando fusionar.`);
            const anchorUnit = units.find(u => u.id === this.codeRed_rallyPoint.anchorId);
            if(anchorUnit && (anchorUnit.regiments.length + unit.regiments.length <= MAX_REGIMENTS_PER_DIVISION)) {
                await _executeMoveUnit(unit, rallyR, rallyC, true); // Mover para fusionar
                const unitOnTarget = units.find(u => u.id === anchorUnit.id);
                if(unitOnTarget){
                    mergeUnits(unit, unitOnTarget);
                }
            } else {
                console.log("-> Punto de reunión lleno o unidad ancla no encontrada. Esperando.")
            }
        } else {
            // Moverse hacia el punto de reunión
            const path = this.findPathToTarget(unit, rallyR, rallyC);
            if (path && path.length > 1) {
                const moveHex = path[Math.min(path.length - 1, unit.currentMovement || unit.movement)];
                await _executeMoveUnit(unit, moveHex.r, moveHex.c);
            }
        }
    },

    _executeCombatLogic: async function(unit, enemies) {
        if (this.unitRoles.get(unit.id) === 'defender' && await this.executeDefenderMovement(unit)) return;
        
        const bestAttack = this.findBestOverallAttack(unit, enemies);
        if (!bestAttack) {
            await this._executeExpansionLogic(unit);
            return;
        }

        if (bestAttack.isFavorable) {
            await this._executeMoveAndAttack(unit, bestAttack.moveHex, bestAttack.target);
        } else {
            const merged = await this.findAndExecuteMerge_Reactive(unit, bestAttack.target);
            if (merged) {
                const unitAfterMerge = units.find(u => u.id === unit.id || u.id === merged.allyId);
                if (unitAfterMerge) await this._executeMoveAndAttack(unitAfterMerge, null, bestAttack.target);
            } else {
                if (bestAttack.isSuicidal) {
                    await this.executeRetreat(unit);
                } else {
                    await this._executeMoveAndAttack(unit, bestAttack.moveHex, bestAttack.target);
                }
            }
        }
    },

    _executeExpansionLogic: async function(unit) {
        const canSplit = unit.regiments.length > 2 && unit.regiments.length < 8; // No dividir si es muy pequeño o muy grande
        const freeNeighbor = getHexNeighbors(unit.r, unit.c).find(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit && !TERRAIN_TYPES[board[n.r][n.c].terrain].isImpassableForLand);

        if (canSplit && freeNeighbor) {
            const splitCount = Math.ceil(unit.regiments.length / 2);
            const newUnitRegs = unit.regiments.slice(0, splitCount);
            const originalUnitRegs = unit.regiments.slice(splitCount);
            gameState.preparingAction = { newUnitRegiments: newUnitRegs, remainingOriginalRegiments: originalUnitRegs };
            splitUnit(unit, freeNeighbor.r, freeNeighbor.c);
        } else {
            await this.executeGeneralMovement(unit);
        }
    },
    
    _executeMoveAndAttack: async function(unit, moveHex, target) {
        if (moveHex) { await _executeMoveUnit(unit, moveHex.r, moveHex.c); }
        const unitAfterMove = units.find(u => u.id === unit.id);
        if (unitAfterMove?.currentHealth > 0 && !unitAfterMove.hasAttacked && isValidAttack(unitAfterMove, target)) {
            await attackUnit(unitAfterMove, target);
        }
    },

    findAndExecuteMerge_Proactive: async function(unit) {
        const potentialAllies = units.filter(u => u.player === unit.player && u.id !== unit.id && !u.hasMoved && (unit.regiments.length + u.regiments.length) <= MAX_REGIMENTS_PER_DIVISION);
        if (potentialAllies.length === 0) return false;

        potentialAllies.sort((a, b) => {
            const strengthDiff = b.regiments.length - a.regiments.length;
            if (strengthDiff !== 0) return strengthDiff;
            return hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c);
        });
        
        const bestAllyToMergeWith = potentialAllies[0];
        
        const path = this.findPathToTarget(unit, bestAllyToMergeWith.r, bestAllyToMergeWith.c);
        if (path && (path.length - 1) <= (unit.currentMovement || unit.movement)) {
            console.log(`%c-> FUSIÓN ESTRATÉGICA: ${unit.name} se une al grupo de batalla de ${bestAllyToMergeWith.name}.`, "color: cyan;");
            await _executeMoveUnit(unit, bestAllyToMergeWith.r, bestAllyToMergeWith.c, true);
            
            const remainingAlly = units.find(u => u.id === bestAllyToMergeWith.id);
            const movedUnit = units.find(u => u.id === unit.id);
            if (remainingAlly && movedUnit) { mergeUnits(movedUnit, remainingAlly); return true; }
        }
        return false;
    },

    findAndExecuteMerge_Reactive: async function(unit, attackTarget) {
        const allies = units.filter(u => u.player === unit.player && u.id !== unit.id && !u.hasMoved && (unit.regiments.length + u.regiments.length) <= MAX_REGIMENTS_PER_DIVISION);
        let bestMergePartner = null; let bestPostMergeScore = -Infinity;
        const currentOutcome = predictCombatOutcome(unit, attackTarget); let currentScore = (currentOutcome.damageToDefender * 2) - (currentOutcome.damageToAttacker * 1.5);

        for (const ally of allies) {
            if (hexDistance(unit.r, unit.c, ally.r, ally.c) <= (ally.currentMovement || ally.movement)) {
                const combinedRegs = [...unit.regiments, ...ally.regiments];
                const tempSuperUnit = JSON.parse(JSON.stringify(unit)); tempSuperUnit.regiments = combinedRegs; recalculateUnitStats(tempSuperUnit); tempSuperUnit.currentHealth = unit.currentHealth + ally.currentHealth;
                const outcome = predictCombatOutcome(tempSuperUnit, attackTarget);
                let score = (outcome.damageToDefender * 2) - (outcome.damageToAttacker * 1.5);
                if (score > currentScore && score > bestPostMergeScore) {
                    bestPostMergeScore = score;
                    bestMergePartner = ally;
                }
            }
        }
        if (bestMergePartner) {
            await _executeMoveUnit(bestMergePartner, unit.r, unit.c, true);
            const unitOnTarget = units.find(u => u.id === unit.id);
            if (unitOnTarget) { mergeUnits(bestMergePartner, unitOnTarget); return { merged: true, allyId: bestMergePartner.id }; }
        }
        return null;
    },

    executeDefenderMovement: async function(unit) {
        let targetCoords=null;
        for(const zona in gameState.ai_reaction_forces){
            if(gameState.ai_reaction_forces[zona].unitId===unit.id){
                targetCoords=gameState.ai_reaction_forces[zona].targetCoords; break;
            }
        }
        if(targetCoords){
            const path=this.findPathToTarget(unit,targetCoords.r,targetCoords.c);
            if(path&&path.length>1){
                const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];
                await _executeMoveUnit(unit,moveHex.r,moveHex.c); return true;
            }
        }
        this.unitRoles.set(unit.id,'explorer');
        return await this.executeGeneralMovement(unit);
    },
    
    executeGeneralMovement: async function(unit) {
        const potentialTargets = this.findBestStrategicObjective(unit, 'expansion');
        const availableTargets = potentialTargets.filter(hex => !this.turn_targets.has(`${hex.r},${hex.c}`));
        if (availableTargets.length === 0) return false;
        const targetHex = availableTargets[0];
        const path = this.findPathToTarget(unit, targetHex.r, targetHex.c);
        if (path && path.length > 1) {
            const moveHex = path[Math.min(path.length-1,unit.currentMovement||unit.movement)];
            this.turn_targets.add(`${targetHex.r},${targetHex.c}`);
            await _executeMoveUnit(unit,moveHex.r,moveHex.c); return true;
        }
        return false;
    },

    executeRetreat: async function(unit) {
        const capital=gameState.cities.find(c=>c.isCapital&&c.owner===unit.player);
        if(capital){
            const path=this.findPathToTarget(unit,capital.r,capital.c);
            if(path&&path.length>1){
                const moveHex=path[Math.min(path.length-1,unit.currentMovement||unit.movement)];
                await _executeMoveUnit(unit,moveHex.r,moveHex.c); return true;
            }
        }
        return false;
    },

    manageEmpire: function(playerNumber) {
        console.groupCollapsed(`%c[IA Empire] Fase de Gestión Imperial`, "color: #4CAF50");
        try { 
            this.handleStrategicReinforcements(playerNumber); 
            this.handleExpansionProduction(playerNumber);
            this.handleConstruction(playerNumber);
        } 
        finally { console.groupEnd(); }
    },

    handleStrategicReinforcements: function(playerNumber) {
        const {frentes,necesitaRefuerzos}=this.analyzeFrontera(playerNumber);
        if(!gameState.ai_reaction_forces)gameState.ai_reaction_forces={};
        if(necesitaRefuerzos){
            for(const zona in frentes){
                const frente=frentes[zona];
                if(frente.aiPower<frente.enemyPower){
                    const fuerzaAsignada=gameState.ai_reaction_forces[zona]?units.find(u=>u.id===gameState.ai_reaction_forces[zona].unitId&&u.currentHealth>0):null;
                    if(!fuerzaAsignada){
                        const capital=gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber); if(!capital)continue;
                        const neededPower=(frente.enemyPower-frente.aiPower)*1.2;
                        let composition=[]; let currentPower=0;
                        while(currentPower<neededPower){
                            composition.push('Infantería Pesada');const regHeavy=REGIMENT_TYPES['Infantería Pesada'];
                            currentPower+=(regHeavy.attack+regHeavy.defense)/2; if(currentPower>=neededPower)break;
                            composition.push('Arqueros');const regArcher=REGIMENT_TYPES['Arqueros'];
                            currentPower+=(regArcher.attack+regArcher.defense)/2;
                        }
                        const newUnit=this.produceUnit(playerNumber,composition,'defender',`Defensa-${zona}`);
                        if(newUnit)gameState.ai_reaction_forces[zona]={unitId:newUnit.id,targetCoords:frente.enemyCenter};
                    }
                }
            }
        }
    },

    handleExpansionProduction: function(playerNumber) {
        const isEarlyGame = gameState.turnNumber <= 7; // Los primeros 7 turnos son críticos para la expansión
        const playerUnits = units.filter(u => u.player === playerNumber);

        if (isEarlyGame || ((playerUnits.length < 15) && (this.ownedHexPercentage(playerNumber) < 0.6))) {
            
            let unitsToProduce = 0;
            if(isEarlyGame) {
                // Modo "Expansión Total": producir hasta 3 unidades si hay espacio y dinero.
                unitsToProduce = 3;
                console.log(`-> Turno ${gameState.turnNumber}: MODO EXPANSIÓN TOTAL activado.`);
            } else {
                // Modo normal: producir solo 1 unidad de expansión si es necesario
                unitsToProduce = 1;
                console.log("-> Modo de expansión normal.");
            }
            
            for (let i = 0; i < unitsToProduce; i++) {
                // En el juego temprano, priorizar caballería para velocidad.
                const unitTypeToCreate = isEarlyGame && Math.random() < 0.6 ? 'Caballería Ligera' : 'Infantería Ligera';
                this.produceUnit(playerNumber, [unitTypeToCreate], 'explorer', `Explorador`);
            }
        }
    },

    ownedHexPercentage: function(playerNumber) {
        const allHexes = board.flat().filter(h => h);
        if(allHexes.length === 0) return 0;
        const ownedHexes = allHexes.filter(h => h.owner === playerNumber).length;
        return ownedHexes / allHexes.length;
    },

    produceUnit: function(playerNumber, compositionTypes, role, name) {
        const playerRes=gameState.playerResources[playerNumber];
        const fullRegiments=compositionTypes.map(type=>({...REGIMENT_TYPES[type],type}));
        const totalCost={oro:0,puntosReclutamiento:0};
        fullRegiments.forEach(reg=>{totalCost.oro+=reg.cost.oro||0;totalCost.puntosReclutamiento+=reg.cost.puntosReclutamiento||0;});
        if(playerRes.oro<totalCost.oro||playerRes.puntosReclutamiento<totalCost.puntosReclutamiento)return false;
        const capital=gameState.cities.find(c=>c.isCapital&&c.owner===playerNumber); if(!capital)return false;
        const spot=getHexNeighbors(capital.r,capital.c).find(n=>board[n.r]?.[n.c]&&!board[n.r][n.c].unit&&!TERRAIN_TYPES[board[n.r][n.c].terrain].isImpassableForLand);
        if(!spot){console.warn(`IA: No hay espacio para producir.`);return false;}
        playerRes.oro-=totalCost.oro; playerRes.puntosReclutamiento-=totalCost.puntosReclutamiento;
        const newUnit=this.createUnitObject({regiments:fullRegiments,cost:totalCost,role,name},playerNumber,spot);
        placeFinalizedDivision(newUnit,spot.r,spot.c);
        this.unitRoles.set(newUnit.id,role);
        return newUnit;
    },

    analyzeFrontera: function(playerNumber) { const enemyPlayer=playerNumber===1?2:1;const cols=board[0].length;const zonaWidth=Math.floor(cols/3);const zonas={'Flanco-Izquierdo':{minCol:0,maxCol:zonaWidth,aiPower:0,enemyPower:0,enemyUnits:[]},'Centro':{minCol:zonaWidth+1,maxCol:zonaWidth*2,aiPower:0,enemyPower:0,enemyUnits:[]},'Flanco-Derecho':{minCol:(zonaWidth*2)+1,maxCol:cols,aiPower:0,enemyPower:0,enemyUnits:[]}};const getZona=(c)=>{if(c<=zonas['Flanco-Izquierdo'].maxCol)return 'Flanco-Izquierdo';if(c<=zonas['Centro'].maxCol)return 'Centro';return 'Flanco-Derecho';};units.forEach(unit=>{if(unit.currentHealth>0){const zona=getZona(unit.c);if(!zonas[zona])return;const power=(unit.attack+unit.defense)/2;if(unit.player===playerNumber){zonas[zona].aiPower+=power;}else if(unit.player===enemyPlayer){zonas[zona].enemyPower+=power;zonas[zona].enemyUnits.push(unit);}}});for(const zona in zonas){const frente=zonas[zona];if(frente.enemyUnits.length>0){const avgR=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.r,0)/frente.enemyUnits.length);const avgC=Math.round(frente.enemyUnits.reduce((sum,u)=>sum+u.c,0)/frente.enemyUnits.length);frente.enemyCenter={r:avgR,c:avgC};}}const necesitaRefuerzos=Object.values(zonas).some(z=>z.aiPower<z.enemyPower);return{frentes:zonas,necesitaRefuerzos};},

    findBestOverallAttack: function(unit, enemies) {
        let bestAction=null; let bestScore=-Infinity;
        const reachableHexes = this.getReachableHexes(unit);
        reachableHexes.push({r:unit.r,c:unit.c,cost:0});
        for (const movePos of reachableHexes){
            const tempAttacker = {...unit, r:movePos.r, c:movePos.c};
            for (const enemy of enemies){
                if(isValidAttack(tempAttacker,enemy)){
                    const outcome = predictCombatOutcome(tempAttacker,enemy);
                    let score = (outcome.damageToDefender*2)-(outcome.damageToAttacker*1.5);
                    if(outcome.defenderDies)score+=100;
                    if(outcome.attackerDiesInRetaliation)score-=500;
                    score -= (movePos.cost||0)*2;
                    if(score>bestScore){bestScore=score; bestAction={score,target:enemy,moveHex:(movePos.r!==unit.r||movePos.c!==unit.c)?movePos:null,isFavorable:!outcome.attackerDiesInRetaliation&&outcome.damageToDefender>outcome.damageToAttacker*1.2,isSuicidal:outcome.attackerDiesInRetaliation||outcome.damageToAttacker>outcome.damageToDefender*1.2};}
                }
            }
        }
        return bestAction;
    },
    
    findPathToTarget: function(unit, targetR, targetC) {
        if (unit.r === targetR && unit.c === targetC) return [{r: unit.r, c: unit.c}];
        const startNode = { r: unit.r, c: unit.c, path: [{r: unit.r, c: unit.c}]};
        let queue = [startNode]; let visited = new Set([`${unit.r},${unit.c}`]);
        while(queue.length > 0) {
            let current = queue.shift();
            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const key = `${neighbor.r},${neighbor.c}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    const hex = board[neighbor.r]?.[neighbor.c];
                    if (hex && !TERRAIN_TYPES[hex.terrain].isImpassableForLand) {
                        if (hex.unit && !(neighbor.r === targetR && neighbor.c === targetC)) continue;
                        let newPath = [...current.path, neighbor];
                        if (neighbor.r === targetR && neighbor.c === targetC) return newPath;
                        queue.push({ ...neighbor, path: newPath });
                    }
                }
            }
        }
        return null;
    },

    getReachableHexes: function(unit) {
        let reachable = [];
        let queue = [{ r: unit.r, c: unit.c, cost: 0 }];
        let visited = new Set([`${unit.r},${unit.c}`]);
        const maxMove = unit.currentMovement || unit.movement;
        while(queue.length > 0) {
            let curr = queue.shift();
            for (const n of getHexNeighbors(curr.r, curr.c)) {
                const key = `${n.r},${n.c}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    const neighborHex = board[n.r]?.[n.c];
                    if (neighborHex && !neighborHex.unit && !TERRAIN_TYPES[neighborHex.terrain].isImpassableForLand) {
                        const moveCost = TERRAIN_TYPES[neighborHex.terrain]?.movementCostMultiplier || 1;
                        const newCost = curr.cost + moveCost;
                        if (newCost <= maxMove) {
                             reachable.push({r: n.r, c: n.c, cost: newCost});
                             queue.push({r: n.r, c: n.c, cost: newCost});
                        }
                    }
                }
            }
        }
        return reachable;
    },

    createUnitObject: function(definition, playerNumber, spot) {
        const stats = calculateRegimentStats(definition.regiments, playerNumber);
        const unit = { id: `u${unitIdCounter++}`, player: playerNumber, name: definition.name, regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})), ...stats, currentHealth: stats.maxHealth, currentMovement: stats.movement, r: spot.r, c: spot.c, hasMoved: false, hasAttacked: false, level: 0, experience: 0, morale: 50, maxMorale: 125, };
        recalculateUnitStats(unit);
        return unit;
    },

    endAiTurn: function(aiPlayerNumber) {
        if (gameState.currentPhase !== "gameOver" && gameState.currentPlayer === aiPlayerNumber) {
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
                setTimeout(() => { if(domElements.endTurnBtn) domElements.endTurnBtn.click(); }, 500);
            }
        }
    }
};