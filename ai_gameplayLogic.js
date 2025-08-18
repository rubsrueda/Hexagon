// Archivo: ai_gameplayLogic.js (VERSIÓN CON ESQUEMA SECUENCIAL Y LOGS COMPLETOS)

console.log("ai_gameplayLogic.js CARGADO - Módulo IA v6.0 (Diseño Secuencial)");

const AiGameplayManager = {
    unitRoles: new Map(),

    // =============================================================
    // === NIVEL 1: DIRECTOR DE ORQUESTA ============================
    // =============================================================
    executeTurn: async function(aiPlayerNumber, aiLevel) {
        try {
            console.group(`%c[IA Turn] INICIO para Jugador IA ${aiPlayerNumber}`, "background: #333; color: #98fb98; font-size: 1.1em;");
            
            this.manageEmpire(aiPlayerNumber);

            const activeAiUnits = units.filter(u => u.player === aiPlayerNumber && u.currentHealth > 0);
            
            // --- Lógica de Orden de Activación (ya la tenías) ---
            const enemyPlayer = aiPlayerNumber === 1 ? 2 : 1;
            const enemyCapital = gameState.cities.find(c => c.isCapital && c.owner === enemyPlayer);
            if (enemyCapital) {
                activeAiUnits.sort((a, b) => hexDistance(a.r, a.c, enemyCapital.r, enemyCapital.c) - hexDistance(b.r, b.c, enemyCapital.r, enemyCapital.c));
            }
            console.log(`-> ${activeAiUnits.length} unidades actuarán en este orden:`, activeAiUnits.map(u => `${u.name}(${u.id.slice(-4)})`).join(', '));
            
            // --- BUCLE SECUENCIAL Y ROBUSTO con for...of y await ---
            for (const unit of activeAiUnits) {
                if (gameState.currentPhase === "gameOver") break;
                
                if (unit && unit.currentHealth > 0 && (!unit.hasMoved || !unit.hasAttacked)) {
                    await this.decideAndExecuteUnitAction(unit);
                    // Pausa controlada entre acciones de unidad
                    await new Promise(resolve => setTimeout(resolve, 350));
                }
            }

            this.endAiTurn(aiPlayerNumber);

        } catch (error) {
            console.error(`ERROR CRÍTICO en AiGameplayManager.executeTurn:`, error);
            this.endAiTurn(aiPlayerNumber);
        } finally {
            console.groupEnd();
        }
    },
    
    // =============================================================
    // === NIVEL 2: GESTIÓN IMPERIAL ===============================
    // =============================================================
    manageEmpire: function(playerNumber) {
        console.groupCollapsed(`%c[IA Empire] Fase de Gestión Imperial`, "color: #4CAF50");
        try {

            this.handleStrategicReinforcements(playerNumber);   // Creación de Unidades para frentes
            this.handleExpansionProduction(playerNumber);       //Creación de unidades de exploración
            this.handleReinforcements(playerNumber);            // Refuerzo de unidades existentes
            this.handleResearch(playerNumber);                  // Investigación de tecnología
            this.handleConstruction(playerNumber);              // Construcciones
            this.handleCapitalChange(playerNumber);             // Cambio de capital amenazada

        } finally {
            console.groupEnd();
        }
    },

    handleStrategicReinforcements: function(playerNumber) {
        console.log("-> 1. Evaluando refuerzos estratégicos...");
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const playerRes = gameState.playerResources[playerNumber];

        const { frentes, necesitaRefuerzos } = this.analyzeFrontera(playerNumber);

        if (necesitaRefuerzos) {
            for (const zona in frentes) {
                const frente = frentes[zona];
                if (frente.aiPower < frente.enemyPower) {
                    console.log(`   - Inferioridad detectada en el frente '${zona}'.`);

                    if (!gameState.ai_reaction_forces) gameState.ai_reaction_forces = {};
                    const fuerzaAsignadaId = gameState.ai_reaction_forces[zona];
                    const fuerzaAsignada = fuerzaAsignadaId ? units.find(u => u.id === fuerzaAsignadaId) : null;

                    if (fuerzaAsignada && fuerzaAsignada.currentHealth > 0) {
                        console.log(`   -> Fuerza de Reacción ya asignada. No se crea una nueva.`);
                    } else {
                        const neededRegs = frente.enemyPower - frente.aiPower + 1;
                        console.log(`   - Creando nueva Fuerza de Reacción de ${neededRegs} regimientos.`);
                        
                        let composition = [];
                        for (let i=0; i<neededRegs; i++) {
                            composition.push(['Infantería Pesada', 'Arqueros', 'Infantería Ligera'][i % 3]);
                        }

                        const newUnit = this.produceUnit(playerNumber, composition, 'defender', `Reacción-${zona}`);
                        if (newUnit) {
                            gameState.ai_reaction_forces[zona] = newUnit.id; // Guardar en memoria
                            console.log(`   -> ¡Unidad de reacción creada!`);
                        }
                    }
                }
            }
        } else {
             console.log("   - Frentes estables. No se necesitan refuerzos estratégicos.");
        }
    },
    
    handleExpansionProduction: function(playerNumber) {
        console.log("-> 2. Evaluando producción de expansión...");
        const ownedHexes = board.flat().filter(h => h && h.owner === playerNumber).length;
        const totalHexes = board.flat().length;

        if ((ownedHexes / totalHexes) < 0.7) {
            console.log("   - Expansión necesaria. Iniciando enjambre...");
            
            const ciudadesPropias = gameState.cities.filter(c => c.owner === playerNumber);
            let totalCreados = 0;

            for (const ciudad of ciudadesPropias) {
                console.log(`   - Produciendo enjambre desde la ciudad en (${ciudad.r}, ${ciudad.c})...`);
                let creadosEnCiudad = 0;
                // Cada ciudad puede producir hasta 5 divisiones (si hay espacio y dinero)
                for (let i = 0; i < 5; i++) {
                    const spot = getHexNeighbors(ciudad.r, ciudad.c).find(n => board[n.r]?.[n.c] && !board[n.r][n.c].unit && board[n.r][n.c].terrain !== 'water');
                    if (spot) {
                        if (this.produceUnit(playerNumber, ['Infantería Ligera'], 'explorer', `Explorador-${ciudad.r}${ciudad.c}`, spot)) {
                            creadosEnCiudad++;
                        } else {
                            // Si falla (probablemente por falta de oro), dejamos de producir en esta ciudad
                            console.log(`   - Fondos insuficientes. Se detiene producción en esta ciudad.`);
                            break; 
                        }
                    } else {
                        // Si no hay más espacio alrededor de la ciudad
                        console.log(`   - No hay más espacio adyacente a la ciudad en (${ciudad.r},${ciudad.c}).`);
                        break;
                    }
                }
                 if(creadosEnCiudad > 0) console.log(`   -> ${creadosEnCiudad} unidades de expansión creadas desde esta ciudad.`);
                 totalCreados += creadosEnCiudad;
            }
            if (totalCreados > 0) console.log(`   - Total de unidades de expansión creadas este turno: ${totalCreados}`);

        } else {
             console.log("   - Expansión suficiente.");
        }
    },
    
    handleConstruction: function(playerNumber) {
        console.log("-> 3. Evaluando construcción...");
        const playerRes = gameState.playerResources[playerNumber];

        // LÓGICA 1: FORTALEZAS (Planificación y Ejecución)
        const strategicHex = this.findBestFortressLocation(playerNumber);
        if (strategicHex) {
            console.log(`   - Punto estratégico para fortaleza identificado en (${strategicHex.r}, ${strategicHex.c}).`);
            
            // Si el hexágono YA es nuestro
            if (strategicHex.owner === playerNumber) {
                // Y está vacío o tiene una estructura mejorable (Camino)
                if (!strategicHex.structure || strategicHex.structure === 'Camino') {
                    // La siguiente estructura a construir sería 'Fortaleza'
                    const structureToBuild = 'Fortaleza';
                    const structureInfo = STRUCTURE_TYPES[structureToBuild];

                    // Comprobación de tecnología y recursos
                    if (playerRes.researchedTechnologies.includes(structureInfo.requiredTech)) {
                        let canAfford = true;
                        for (const res in structureInfo.cost) {
                            if ((playerRes[res] || 0) < structureInfo.cost[res]) canAfford = false;
                        }
                        if (canAfford) {
                             console.log(`%c   -> ¡Construyendo ${structureToBuild} en punto estratégico!`, "color: #ff8c00");
                             handleConfirmBuildStructure({
                                 playerId: playerNumber,
                                 r: strategicHex.r,
                                 c: strategicHex.c,
                                 structureType: structureToBuild,
                                 builderUnitId: null // La IA construye sin unidad de colonos
                             });
                        }
                    }
                }
            } else {
                // Si el hexágono NO es nuestro, lo marcamos como objetivo prioritario.
                console.log(`   -> Hexágono hostil. Creando misión de captura prioritaria.`);
                if (!gameState.ai_construction_goals) gameState.ai_construction_goals = [];
                // Evita duplicados
                if (!gameState.ai_construction_goals.some(g => g.r === strategicHex.r && g.c === strategicHex.c)) {
                    gameState.ai_construction_goals.push({ r: strategicHex.r, c: strategicHex.c });
                }
            }
        } else {
             console.log("   - No se encontraron puntos estratégicos para construir fortalezas este turno.");
        }

        // LÓGICA 2: CAMINOS (Ejecución) - Aún no implementada, para el siguiente paso.
    },

    findBestFortressLocation: function(playerNumber){
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        let candidates = [];
        board.flat().forEach(hex => {
            // Un buen punto es un cuello de botella: Colina/Bosque adyacente a Llanura
            if((hex.terrain === 'hills' || hex.terrain === 'forest') && getHexNeighbors(hex.r, hex.c).some(n => board[n.r]?.[n.c]?.terrain === 'plains')) {
                let score = 50;
                // Más puntos si está cerca de la frontera
                score += (15 - Math.abs(hex.r - Math.floor(board.length / 2)));
                // Más puntos si no es nuestro (objetivo de conquista)
                if(hex.owner !== playerNumber) score += 20;
                // Menos puntos si está muy lejos
                const aiCapital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
                if(aiCapital) score -= hexDistance(hex.r, hex.c, aiCapital.r, aiCapital.c);
                candidates.push({hex, score});
            }
        });
        
        if (candidates.length === 0) return null;
        
        candidates.sort((a,b) => b.score - a.score);
        return candidates[0].hex;
    },

    handleResearch: function(playerNumber){
        const playerState = gameState.playerResources[playerNumber];
        if(!playerState) return;
        const availableTechs = getAvailableTechnologies(playerState.researchedTechnologies || []);
        if (availableTechs.length > 0) {
            const chosenTech = availableTechs.find(tech => playerState.researchPoints >= (tech.cost?.researchPoints || 0));
            if (chosenTech) {
                console.log(`-> 4. Investigando: ${chosenTech.name}`);
                attemptToResearch(chosenTech.id);
            }
        }
    },

    handleReinforcements: function(playerNumber) {
        console.log("-> 1. Evaluando refuerzos...");
        const damagedUnitsInBase = units.filter(u => 
            u.player === playerNumber && 
            u.currentHealth < u.maxHealth && 
            isHexSuppliedForReinforce(u.r, u.c, playerNumber)
        );
        
        if(damagedUnitsInBase.length > 0) {
            console.log(`   - Unidades dañadas en base encontradas: ${damagedUnitsInBase.length}`);
            // Por ahora, reforzamos solo la más dañada para no gastar todo el oro.
            const mostDamagedUnit = damagedUnitsInBase.sort((a,b) => (a.currentHealth/a.maxHealth) - (b.currentHealth/b.maxHealth))[0];
            const mostDamagedRegiment = mostDamagedUnit.regiments.sort((a,b) => a.health - b.health)[0];
            
            // La función 'handleReinforceRegiment' necesita confirmación, la IA debe "aceptar"
            const originalConfirm = window.confirm;
            window.confirm = () => true; // Simula que la IA siempre dice "sí"
            console.log(`   - Intentando reforzar regimiento en ${mostDamagedUnit.name}`);
            handleReinforceRegiment(mostDamagedUnit, mostDamagedRegiment);
            window.confirm = originalConfirm; // Restaura la función original
        } else {
             console.log("   - No hay unidades que necesiten refuerzos en una base.");
        }
    },

    analyzeFrontera: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const cols = board[0].length;
        const
 
        zonaWidth = Math.floor(cols / 3);

        const zonas = {
            'Flanco-Izquierdo': { minCol: 0, maxCol: zonaWidth, aiPower: 0, enemyPower: 0 },
            'Centro': { minCol: zonaWidth + 1, maxCol: zonaWidth * 2, aiPower: 0, enemyPower: 0 },
            'Flanco-Derecho': { minCol: (zonaWidth * 2) + 1, maxCol: cols, aiPower: 0, enemyPower: 0 }
        };

        const getZona = (c) => {
            if (c <= zonas['Flanco-Izquierdo'].maxCol) return 'Flanco-Izquierdo';
            if (c <= zonas['Centro'].maxCol) return 'Centro';
            return 'Flanco-Derecho';
        }

        units.forEach(unit => {
            if (unit.currentHealth > 0) {
                const zona = getZona(unit.c);
                if (unit.player === playerNumber) {
                    zonas[zona].aiPower += unit.regiments.length;
                } else if (unit.player === enemyPlayer) {
                    zonas[zona].enemyPower += unit.regiments.length;
                }
            }
        });
        
        console.log(`   - Análisis de Zonas: Izquierdo(IA:${zonas['Flanco-Izquierdo'].aiPower} vs Hum:${zonas['Flanco-Izquierdo'].enemyPower}) / Centro(IA:${zonas['Centro'].aiPower} vs Hum:${zonas['Centro'].enemyPower}) / Derecho(IA:${zonas['Flanco-Derecho'].aiPower} vs Hum:${zonas['Flanco-Derecho'].enemyPower})`);
        return zonas;
    },

    produceUnit: function(playerNumber, compositionTypes, role, name, specificSpot = null) {
        const playerRes = gameState.playerResources[playerNumber];
        const fullRegiments = compositionTypes.map(type => ({...REGIMENT_TYPES[type], type}));
        const totalCost = fullRegiments.reduce((sum, reg) => sum + (reg.cost?.oro || 0), 0);
        
        if (playerRes.oro < totalCost) {
            return false; // Falla si no hay oro
        }
        
        let spot = specificSpot;

        // Si no nos dieron un spot específico, buscamos uno (comportamiento anterior)
        if (!spot) {
            const validHexes = gameState.cities.filter(c => c.owner === playerNumber && !getUnitOnHex(c.r, c.c));
            if (validHexes.length === 0) return false; // Falla si no hay espacio
            spot = validHexes[0];
        }
        
        playerRes.oro -= totalCost;
        const unitDef = { regiments: fullRegiments, cost: totalCost, role, name };
        const newUnit = this.createUnitObject(unitDef, playerNumber, spot);
        placeFinalizedDivision(newUnit, spot.r, spot.c);
        this.unitRoles.set(newUnit.id, role);

        return newUnit; 
    },

    // =================================================================
    // === FASE 2: CEREBRO TÁCTICO =====================================
    // =================================================================
    
    decideAndExecuteUnitAction: async function(unit) {
        console.groupCollapsed(`Decidiendo acción para ${unit.name} en (${unit.r},${unit.c})`);
        try {
            // 1. Guardamos el estado inicial de la unidad.
            const haActuadoAntes = unit.hasMoved || unit.hasAttacked;

            // 2. Intentamos ejecutar la lógica compleja del cerebro táctico.
            await this.planAndExecuteTacticalAction(unit);

            // 3. Comprobamos el estado después de la ejecución.
            const haActuadoDespues = unit.hasMoved || unit.hasAttacked;

            // 4. Si la unidad sigue sin haber actuado (la lógica compleja ha fallado),
            //    activamos el movimiento de emergencia.
            if (!haActuadoDespues && haActuadoAntes === haActuadoDespues) {
                console.warn(`-> [RED DE SEGURIDAD] La lógica táctica principal no produjo una acción. Activando movimiento de emergencia.`);
                await this.executeEmergencyMovement(unit);
            }

        } catch(e) {
            console.error(`Error procesando ${unit.name}:`, e);
        } finally {
            console.groupEnd();
        }
    },
    
    planAndExecuteTacticalAction: async function(unit) {
        const enemyPlayer = unit.player === 1 ? 2 : 1;

        console.log("PREGUNTA 1: ¿Existen enemigos cerca?");
        const enemiesNearby = units.filter(u => u.player === enemyPlayer && hexDistance(u.r, u.c, unit.r, unit.c) <= unit.visionRange + (unit.currentMovement || 0));

        if (enemiesNearby.length > 0) {
            console.log("-> SÍ. Enemigos detectados.");
            
            console.log("  PREGUNTA 2: ¿Existen recursos cerca?");
            const resourcesNearby = this.findNearbyObjectives(unit, 'resource');

            if (resourcesNearby.length > 0) {
                const resourceHex = resourcesNearby[0];
                console.log(`  -> SÍ. Recurso más cercano en (${resourceHex.r},${resourceHex.c}).`);
                
                console.log("    PREGUNTA 3: ¿Puedo atacar y moverme al recurso?");
                // Simplificado: Buscar un movimiento al recurso desde donde se pueda atacar.
                const bestAttackOption = this.findBestMoveToHexAndAttack(unit, resourceHex, enemiesNearby);

                if (bestAttackOption) {
                    console.log(`    -> SÍ. Se puede atacar a ${bestAttackOption.target.name} desde (${bestAttackOption.moveHex.r},${bestAttackOption.moveHex.c}) junto al recurso.`);
                    
                    console.log("      PREGUNTA 4: ¿El combate es favorable (bajas <= enemigas)?");
                    const outcome = predictCombatOutcome(bestAttackOption.unitState, bestAttackOption.target);
                    console.log(`      -> Predicción: IA pierde ${outcome.damageToAttacker} HP vs Enemigo pierde ${outcome.damageToDefender} HP.`);

                    if (outcome.damageToDefender >= outcome.damageToAttacker) {
                        console.log("      -> SÍ. El combate es favorable.");
                        console.log("%c        RESULTADO: Mover a recurso y atacar.", "font-weight: bold;");
                        await moveUnit(unit, bestAttackOption.moveHex.r, bestAttackOption.moveHex.c);
                        if (unit.currentHealth > 0 && !unit.hasAttacked) await attackUnit(unit, bestAttackOption.target);
                        return;
                    } else {
                        console.log("      -> NO. El combate es desfavorable.");
                        
                        // Lógica de "Pregunta 5"
                        await this.handleUnfavorableCombat(unit, bestAttackOption.target);
                        return;
                    }
                } else {
                    console.log("    -> NO. No es posible una acción combinada de mover a recurso y atacar.");
                    // Lógica de "Pregunta 6"
                    await this.handleSimpleMoveOrSplit(unit, enemiesNearby, resourceHex);
                    return;
                }
            } else {
                console.log("  -> NO. No hay recursos cerca.");
                
                console.log("    PREGUNTA 7: ¿Puedo ejecutar un ataque favorable?");
                // La misma lógica que en P4, pero sin el requisito de moverse a un recurso
                const bestOverallAttack = this.findBestOverallAttack(unit, enemiesNearby);
                
                if(bestOverallAttack) {
                    const outcome = predictCombatOutcome(bestOverallAttack.unitState, bestOverallAttack.target);
                    if(outcome.damageToDefender >= outcome.damageToAttacker) {
                        console.log(`    -> SÍ. Combate favorable contra ${bestOverallAttack.target.name} detectado.`);
                        console.log("%c      RESULTADO: Mover y atacar.", "font-weight: bold;");
                        if(bestOverallAttack.moveHex) await moveUnit(unit, bestOverallAttack.moveHex.r, bestOverallAttack.moveHex.c);
                        if(unit.currentHealth > 0 && !unit.hasAttacked) await attackUnit(unit, bestOverallAttack.target);
                        return;
                    } else {
                        console.log(`    -> NO. Combate contra ${bestOverallAttack.target.name} es desfavorable.`);
                        // Lógica de "Pregunta 5"
                        await this.handleUnfavorableCombat(unit, bestOverallAttack.target);
                        return;
                    }
                } else {
                     console.log("   -> NO. No hay ataques posibles.");
                     console.log("%c    RESULTADO: No se encontró acción de combate. La unidad se reposiciona.", "font-weight: bold;");
                     await this.executeGeneralMovement(unit);
                     return;
                }
            }
        } else {
            console.log("-> NO. No hay enemigos cerca.");
            
            console.log("  PREGUNTA 8: ¿Puedo dividir mi unidad?");
            if (unit.regiments.length > 1) {
                console.log("  -> SÍ.");
                console.log("%c    RESULTADO: Dividiendo para máxima expansión.", "font-weight: bold;");
                await this.executeExpansionSplit(unit);
            } else {
                console.log("  -> NO.");
                console.log("%c    RESULTADO: Moviéndose para capturar territorio.", "font-weight: bold;");
                await this.executeGeneralMovement(unit);
            }
        }
    },

    handleUnfavorableCombat: async function(unit, target) {
        console.log("        PREGUNTA 5: ¿Existen amigos cerca para fusionar?");
        // (Lógica de Fusión simplificada por ahora, a mejorar)
        const canMerge = false;
        if(canMerge){
             console.log("        -> SÍ.");
             console.log("%c          RESULTADO: FUSIONAR (Lógica pendiente)", "font-weight: bold;");
        } else {
            console.log("        -> NO.");
            const outcome = predictCombatOutcome(unit, target);
            console.log(`        PREGUNTA 5.B: ¿Mis bajas serán > 1.2 veces las del enemigo? (${outcome.damageToAttacker} vs ${outcome.damageToDefender})`);
            
            if(outcome.damageToAttacker > outcome.damageToDefender * 1.2){
                console.log("        -> SÍ. Es una masacre.");
                console.log("%c          RESULTADO: RETIRADA TÁCTICA a la base más cercana.", "font-weight: bold;");
                await this.executeRetreat(unit);
            } else {
                console.log("        -> NO. Es un combate de desgaste, pero aceptable.");
                console.log("%c          RESULTADO: Aceptar bajas, atacar y pedir refuerzos.", "font-weight: bold;");
                this.requestReinforcements(unit.player);
                if(unit.currentHealth > 0 && !unit.hasAttacked) await attackUnit(unit, target);
            }
        }
    },

    handleRangedHarassAndAdvance: async function(unit, enemiesNearby, resourceHex) {
        console.log("      PREGUNTA 6: ¿Tengo unidades a distancia y puedo atacar?");
        const rangedRegs = unit.regiments.filter(r => REGIMENT_TYPES[r.type].attackRange > 1);
        const infantryRegs = unit.regiments.filter(r => REGIMENT_TYPES[r.type].attackRange <= 1);
        
        // Primero, buscamos el mejor ataque a distancia posible desde nuestra posición ACTUAL
        const bestRangedAttack = this.findBestAttackAction(unit, [{r: unit.r, c: unit.c, cost: 0}], enemiesNearby, true); // `true` para forzar solo rango

        // Si tenemos composición mixta Y un ataque a distancia válido desde AQUÍ
        if(rangedRegs.length > 0 && infantryRegs.length > 0 && bestRangedAttack.target) {
            console.log("      -> SÍ. Oportunidad de dividir y hostigar detectada.");
            console.log("%c        RESULTADO: Dividir. Infantería a recurso, Arqueros atacan.", "font-weight: bold;");
            
            // Ahora sí llamamos a la función correcta con el objetivo de ataque correcto
            await this.executeSplitAndAttack(unit, {resourceHex: resourceHex, enemyToAttack: bestRangedAttack.target});

        } else {
            console.log("      -> NO. O no tengo composición mixta, o no hay un buen tiro a distancia.");
            console.log("%c        RESULTADO: Moverse al recurso.", "font-weight: bold;");
            
            const path = this.findPathToTarget(unit, resourceHex.r, resourceHex.c);
            if (path && path.length > 1) {
                await moveUnit(unit, path[1].r, path[1].c);
            }
        }
    },

    handleSimpleMoveOrSplit: async function(unit, enemiesNearby, resourceHex) {
        console.log("      PREGUNTA 6: ¿Tengo composición mixta para 'Tomar y Atacar'?");
        const rangedRegs = unit.regiments.filter(r => REGIMENT_TYPES[r.type].attackRange > 1);
        const infantryRegs = unit.regiments.filter(r => REGIMENT_TYPES[r.type].attackRange <= 1);

        // Se busca el mejor ataque A DISTANCIA desde la posición ACTUAL
        const bestRangedAttack = this.findBestAttackFromPositions(unit, [{r: unit.r, c: unit.c, cost: 0}], enemiesNearby);

        if (rangedRegs.length > 0 && infantryRegs.length > 0 && bestRangedAttack) {
            console.log("      -> SÍ. Se puede dividir y hostigar.");
            console.log("%c        RESULTADO: Dividir. Infantería a recurso, Arqueros atacan.", "font-weight: bold;");
            await this.executeSplitAndAttack(unit, { resourceHex: resourceHex, enemyToAttack: bestRangedAttack.target });
        } else {
            console.log("      -> NO. O no tengo composición mixta, o no hay un buen tiro.");
            console.log("%c        RESULTADO: Moverse al recurso.", "font-weight: bold;");
            const path = this.findPathToTarget(unit, resourceHex.r, resourceHex.c);
            if (path && path.length > 1) {
                await moveUnit(unit, path[1].r, path[1].c);
            }
        }
    },

    findNearbyObjectives: function(unit, objectiveType) {
        let nearby = [];
        const searchRadius = 3; // Radio de búsqueda para "cerca"
        
        board.flat().forEach(hex => {
            if (hex) {
                const distance = hexDistance(unit.r, unit.c, hex.r, hex.c);
                if (distance > 0 && distance <= searchRadius) {
                    if (objectiveType === 'resource' && hex.resourceNode) {
                        nearby.push(hex);
                    }
                    // Aquí se podrían añadir más tipos de objetivos, como 'ally' para fusiones
                }
            }
        });

        // Ordenar por el más cercano
        nearby.sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
        return nearby;
    },

    findBestStrategicObjective: function(unit, enemyPlayer, role) {
        console.log(`   - Buscando objetivo para ${unit.name} (Rol: ${role})`);
        
        // --- PRIORIDAD #1: OBJETIVOS ADYACENTES ---
        const neighbors = getHexNeighbors(unit.r, unit.c);
        for (const neighbor of neighbors) {
            const hex = board[neighbor.r]?.[neighbor.c];
            if (hex && !hex.unit && hex.owner === null) {
                const category = unit.regiments?.[0] ? REGIMENT_TYPES[unit.regiments[0].type]?.category : null;
                if(category && !IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain)) {
                    console.log(`   -> ¡Prioridad 1! Objetivo adyacente encontrado en (${hex.r}, ${hex.c})`);
                    // ¡LA CORRECCIÓN CLAVE! Siempre devolvemos una lista
                    return [hex]; 
                }
            }
        }

        // --- PRIORIDAD #2: OBJETIVOS GLOBALES (Plan B) ---
        let objectives = [];
        // (La lógica para buscar objetivos globales no cambia)
        if (role === 'explorer') {
             board.flat().forEach(hex => { if(hex && !hex.unit && hex.owner === null) objectives.push(hex) });
        } else {
             board.flat().forEach(hex => { if(hex && !hex.unit && hex.owner !== unit.player && (hex.resourceNode || hex.isCity)) objectives.push(hex) });
        }
        
        if (objectives.length === 0) return []; // Devuelve lista vacía
        
        // Ordenamos y devolvemos la lista, como antes
        objectives.sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
        
        console.log(`   -> Prioridad 2: No hay objetivos adyacentes. Se encontraron ${objectives.length} objetivos globales.`);
        return objectives.slice(0, 5);
    },

    findBestMoveToHexAndAttack: function(unit, targetHex, enemiesNearby) {
        let bestOption = null;
        let bestScore = -Infinity;
        
        const potentialAttackPositions = getHexNeighbors(targetHex.r, targetHex.c);
        potentialAttackPositions.push(targetHex);

        // ¡LA CORRECCIÓN ESTÁ AQUÍ! Primero calculamos TODAS las casillas alcanzables.
        const reachableHexes = this.getReachableHexes(unit);
        
        // Y luego filtramos las posiciones de ataque usando la variable correcta.
        const validAttackPositions = potentialAttackPositions.filter(pPos => 
            reachableHexes.some(rPos => rPos.r === pPos.r && rPos.c === pPos.c)
        );

        if (validAttackPositions.length === 0) return null;

        for (const moveHex of validAttackPositions) {
            const tempUnitState = { ...unit, r: moveHex.r, c: moveHex.c };
            for (const enemy of enemiesNearby) {
                if (isValidAttack(tempUnitState, enemy)) {
                    const outcome = predictCombatOutcome(tempUnitState, enemy);
                    let score = outcome.defenderDies ? 500 : outcome.damageToDefender * 2;
                    score -= outcome.damageToAttacker * 1.5;
                    if (outcome.attackerDiesInRetaliation) score = -Infinity;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestOption = { moveHex, target: enemy, unitState: tempUnitState };
                    }
                }
            }
        }

        return bestOption;
    },

    findPathToTarget: function(unit, targetR, targetC) {
        if (typeof targetR === 'undefined' || typeof targetC === 'undefined' || !unit?.regiments?.[0]) return null;
        
        const startNode = { r: unit.r, c: unit.c };
        if (startNode.r === targetR && startNode.c === targetC) return [startNode];

        const category = REGIMENT_TYPES[unit.regiments[0].type]?.category;
        if (!category) return null;

        let openSet = [ { ...startNode, g: 0, h: hexDistance(startNode.r, startNode.c, targetR, targetC), f: 0 } ];
        openSet[0].f = openSet[0].h;

        let cameFrom = new Map();
        let gScore = new Map([[`${startNode.r},${startNode.c}`, 0]]);
        
        while(openSet.length > 0) {
            // Encontrar el nodo en openSet con el menor fScore
            let current = openSet.reduce((a, b) => a.f < b.f ? a : b);
            
            if (current.r === targetR && current.c === targetC) {
                // Reconstruir el camino
                let path = [current];
                let currInPath = current;
                while (cameFrom.has(`${currInPath.r},${currInPath.c}`)) {
                    currInPath = cameFrom.get(`${currInPath.r},${currInPath.c}`);
                    path.unshift(currInPath);
                }
                return path;
            }

            openSet = openSet.filter(node => node.r !== current.r || node.c !== current.c);

            for (const neighbor of getHexNeighbors(current.r, current.c)) {
                const hex = board[neighbor.r]?.[neighbor.c];
                if (hex) {
                    // Un hex es transitable si no hay unidad y el terreno es válido
                    const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain);
                    if (!hex.unit && !isImpassable) {
                        const tentative_gScore = (gScore.get(`${current.r},${current.c}`) || 0) + 1; // Costo de movimiento simple por ahora
                        const neighborKey = `${neighbor.r},${neighbor.c}`;

                        if (tentative_gScore < (gScore.get(neighborKey) || Infinity)) {
                            cameFrom.set(neighborKey, current);
                            gScore.set(neighborKey, tentative_gScore);
                            
                            const h = hexDistance(neighbor.r, neighbor.c, targetR, targetC);
                            const f = tentative_gScore + h;

                            if (!openSet.some(node => node.r === neighbor.r && node.c === neighbor.c)) {
                                openSet.push({ ...neighbor, g: tentative_gScore, h, f });
                            }
                        }
                    }
                }
            }
        }
        
        // Si llegamos aquí, no se encontró ruta
        return null; 
    },

    findBestOverallAttack: function(unit, enemyPlayer) {
        // Esta función consolida la búsqueda del mejor ataque posible.
        // Primero, calcula todas las casillas a las que la unidad puede llegar.
        const reachableHexes = this.getReachableHexes(unit);
        
        // Luego, pasa esa lista de casillas (que incluye la posición actual)
        // a la función de evaluación de ataques.
        const bestAttack = this.findBestAttackAction(unit, reachableHexes, enemyPlayer);

        return bestAttack;
    },

    executeGeneralMovement: async function(unit) {      
        const role = this.unitRoles.get(unit.id) || 'explorer';
        const enemyPlayer = unit.player === 1 ? 2 : 1; // Necesario para la búsqueda

        // 1. Obtiene la LISTA de objetivos potenciales.
        const potentialTargets = this.findBestStrategicObjective(unit, enemyPlayer, role); // Pasa enemyPlayer
        if (!potentialTargets || potentialTargets.length === 0) {
            console.log("   - No se encontraron objetivos para este rol.");
            return false;
        }
        
        // 2. Itera sobre la lista hasta encontrar uno viable.
        console.log(`   - Evaluando ${potentialTargets.length} objetivos potenciales para rol '${role}'...`);
        for (const targetHex of potentialTargets) {
            
            // CORRECCIÓN CLAVE: Asegurarnos de que targetHex es un objeto válido con r y c.
            if (!targetHex || typeof targetHex.r === 'undefined') {
                console.warn(`   - Objetivo inválido descartado:`, targetHex);
                continue;
            }
            
            const path = this.findPathToTarget(unit, targetHex.r, targetHex.c);
            
            if (path && path.length > 1) {
                // LÓGICA DE "TURNOS PARA LLEGAR"
                // El coste real del camino es path.length - 1
                const pathCostInTurns = Math.ceil((path.length - 1) / (unit.movement || 1));
                
                // COMPROBACIÓN FINAL: La unidad SOLO se moverá si el camino es razonable
                // Un explorador no intentará cruzar todo el mapa.
                // Aumentamos el radio a 3 turnos para que tengan más alcance
                if(pathCostInTurns < 3) {
                    console.log(`   -> ¡OBJETIVO VIABLE! Destino: (${targetHex.r}, ${targetHex.c}). Se tardarían ~${pathCostInTurns} turnos.`);
                    await moveUnit(unit, path[1].r, path[1].c);
                    return true;
                } else {
                    console.log(`   - Objetivo (${targetHex.r}, ${targetHex.c}) descartado: demasiado lejos (${pathCostInTurns} turnos).`);
                }
            }
        }
        
        console.log("   -> Ninguno de los objetivos potenciales era alcanzable o estaba a una distancia razonable.");
        return false;
    },
    
    executeSplitAndAttack: async function(unit, bestCombinedAction) {
        // Asumimos que la unidad tiene al menos 1 regimiento de infantería y 1 de rango
        const infantryToSplit = unit.regiments.find(r => r.type.includes('Infantería'));
        if (!infantryToSplit) {
            console.warn(`No se pudo ejecutar Split&Attack: No se encontró Infantería para dividir.`);
            return false;
        }

        const newUnitRegiments = [infantryToSplit];
        const remainingOriginalRegiments = unit.regiments.filter(r => r.id !== infantryToSplit.id);

        if (remainingOriginalRegiments.length === 0) {
            console.warn(`No se pudo ejecutar Split&Attack: La división se quedaría sin regimientos.`);
            return false;
        }
        
        console.log(`-> REGLA 2.1 (TOMAR Y ATACAR): CUMPLIDA. Dividiendo ${infantryToSplit.type} para tomar ${bestCombinedAction.resourceHex.r},${bestCombinedAction.resourceHex.c}`);

        // La función global del juego para dividir unidades
        if (typeof splitUnit === "function") {
            // Preparamos los datos que 'splitUnit' necesita
            gameState.preparingAction = { newUnitRegiments, remainingOriginalRegiments };
            const success = splitUnit(unit, bestCombinedAction.resourceHex.r, bestCombinedAction.resourceHex.c);
            
            if(success) {
                 // Si la división tuvo éxito, la unidad original ahora puede atacar
                 if (unit.currentHealth > 0 && !unit.hasAttacked && isValidAttack(unit, bestCombinedAction.enemyToAttack)) {
                    console.log(`--> La unidad principal ataca a ${bestCombinedAction.enemyToAttack.name}`);
                    await attackUnit(unit, bestCombinedAction.enemyToAttack);
                }
            }
        }
        return true;
    },

    executeExpansionSplit: async function(unit) {
        // Guardamos la posición original y una copia de los regimientos
        const originalR = unit.r;
        const originalC = unit.c;
        const originalRegiments = [...unit.regiments];
        
        // La unidad principal se queda con el primer regimiento y se prepara para moverse
        unit.regiments = [originalRegiments[0]];
        recalculateUnitStats(unit);
        
        console.log(` -> Unidad principal (${unit.name}) se queda con 1 regimiento. Moviéndose...`);
        await this.executeGeneralMovement(unit);
        
        const newUnitsToCreate = originalRegiments.slice(1);
        console.log(` -> Se crearán ${newUnitsToCreate.length} nuevas unidades de 1 regimiento.`);

        for (const reg of newUnitsToCreate) {
            // Busca un spot de despliegue adyacente a la POSICIÓN ORIGINAL
            const spot = getHexNeighbors(originalR, originalC).find(n => {
                const hex = board[n.r]?.[n.c];
                const category = REGIMENT_TYPES[reg.type]?.category;
                return hex && !hex.unit && category && !IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain);
            });
            
            if (spot) {
                const unitDef = { regiments: [reg], cost: 0, role: 'explorer', name: `${reg.type.split(' ')[0]} (Div.)` };
                const newUnit = this.createUnitObject(unitDef, unit.player, spot);
                placeFinalizedDivision(newUnit, spot.r, spot.c);
                // Las unidades recién creadas no actúan en este turno
                newUnit.hasMoved = true;
                newUnit.hasAttacked = true;
                console.log(`  --> Nueva unidad creada en (${spot.r},${spot.c})`);
            } else {
                console.warn(`  --> No se encontró un spot adyacente libre para un regimiento de ${reg.type}.`);
                // Devolvemos el regimiento no usado a la unidad original para no perderlo
                unit.regiments.push(reg);
            }
        }
        
        // Recalculamos los stats de la unidad original por si le hemos devuelto regimientos
        recalculateUnitStats(unit);
    },

    evaluateAllPossibleActions: function(unit, enemyPlayer) {
        const bestStaticAttack = this.findBestAttackAction(unit, [{r: unit.r, c: unit.c, cost: 0}], enemyPlayer);
        const reachableHexes = this.getReachableHexes(unit);
        const bestMoveAndAttack = this.findBestAttackAction(unit, reachableHexes, enemyPlayer);
        const bestMoveAction = this.findBestGeneralMovement(unit, enemyPlayer);
        return { bestStaticAttack, bestMoveAction, bestMoveAndAttack };
    },

    executeEmergencyMovement: async function(unit) {
        console.log(`   - Ejecutando movimiento de emergencia para ${unit.name}...`);
        
        // 1. Obtener la categoría de la unidad de forma segura.
        const category = unit.regiments?.[0] ? REGIMENT_TYPES[unit.regiments[0].type]?.category : null;
        if (!category) {
            console.error(`   -> FALLO EMERGENCIA: No se pudo determinar la categoría de la unidad.`);
            return;
        }

        // 2. Obtener los hexágonos adyacentes.
        const neighbors = getHexNeighbors(unit.r, unit.c);
        
        // 3. Buscar la primera casilla adyacente válida.
        const validMove = neighbors.find(n => {
            const hex = board[n.r]?.[n.c];
            if (!hex) return false; // El vecino está fuera del mapa

            // <<< ¡LA CORRECCIÓN CRÍTICA ESTÁ AQUÍ! >>>
            // Ahora sí, se comprueba si el terreno es intransitable PARA ESTA UNIDAD.
            const isImpassable = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain);
            const isBlockedByUnit = !!hex.unit;

            // Una casilla es válida si no es intransitable Y no está bloqueada.
            return !isImpassable && !isBlockedByUnit;
        });
        
        // 4. Si se encontró un movimiento válido, ejecutarlo.
        if (validMove) {
            console.log(`   -> Movimiento de emergencia viable encontrado en (${validMove.r}, ${validMove.c}). Moviendo...`);
            await moveUnit(unit, validMove.r, validMove.c);
        } else {
            console.log("   -> No se encontró ningún hexágono adyacente válido para el movimiento de emergencia.");
        }
    },

    findNearestNeutralOrEnemyHex: function(unit) {
        let allValidHexes = [];
        const category = REGIMENT_TYPES[unit.regiments[0]?.type]?.category;
        if (!category) return null; // No se puede mover si no tiene categoría

        board.flat().forEach(hex => {
            // Un hexágono es un objetivo de emergencia si no es nuestro
            // y si la unidad puede moverse a ese tipo de terreno
            if (hex && hex.owner !== unit.player && !IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[category]?.includes(hex.terrain)) {
                allValidHexes.push(hex);
            }
        });

        if(allValidHexes.length === 0) return null;

        // Ordenar por el más cercano a la unidad
        allValidHexes.sort((a, b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
        
        return allValidHexes[0];
    },

    findBestAttackFromPositions: function(unit, positions, enemies) {
        let bestOption = null;
        let bestScore = -Infinity;
        
        for (const moveHex of positions) {
            // Creamos un estado temporal de la unidad como si se hubiera movido
            const tempUnitState = { ...unit, r: moveHex.r, c: moveHex.c };

            for (const enemy of enemies) {
                // Comprobamos si el ataque es posible desde esa posición
                if (isValidAttack(tempUnitState, enemy)) {
                    const outcome = predictCombatOutcome(tempUnitState, enemy);
                    
                    // Lógica de puntuación para decidir el mejor ataque
                    let score = (outcome.damageToDefender * 2) - (outcome.damageToAttacker * 1.5);
                    if (outcome.defenderDies) score += 50; // Bonus por aniquilación
                    if (outcome.attackerDiesInRetaliation) score = -Infinity; // Evitar suicidios
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestOption = {
                            moveHex: moveHex,
                            target: enemy,
                            unitState: tempUnitState, // Guardamos el estado para no recalcular
                            score: score, // Guardamos la puntu-ación para comparaciones futuras
                            isFavorable: (outcome.damageToDefender > (outcome.damageToAttacker || 0) * 1.2)
                        };
                    }
                }
            }
        }
        // Devuelve la mejor opción encontrada (o null si no encontró ninguna)
        return bestOption;
    },

    requestReinforcements: function(playerNumber) {
        // Esta es una función de "señalización". No produce unidades directamente,
        // sino que establece una "bandera" para que 'manageEmpire' sepa qué hacer en el próximo turno.
        
        if (!gameState.ai_reinforcement_requests) {
            gameState.ai_reinforcement_requests = {};
        }
        
        // Simplemente incrementa la necesidad de refuerzos para este jugador.
        // La función handleProduction leerá este valor en el siguiente turno.
        const currentRequests = gameState.ai_reinforcement_requests[playerNumber] || 0;
        gameState.ai_reinforcement_requests[playerNumber] = currentRequests + 1;
        
        console.log(`          --> Petición de refuerzos enviada. Próximo turno se evaluará la producción de unidades de combate.`);
    },

    // =================================================================
    // === FUNCIONES AUXILIARES COMPLETAS =============================
    // =================================================================

    evaluateAllTacticalOptions: function(unit, enemyPlayer) {
        const reachable = this.getReachableHexes(unit);
        return {
            bestStaticAttack: this.findBestAttackAction(unit, [{r: unit.r, c: unit.c, cost: 0}], enemyPlayer),
            bestMoveAndAttack: this.findBestAttackAction(unit, reachable, enemyPlayer),
            bestMoveAction: this.findBestGeneralMovement(unit, enemyPlayer)
        };
    },

    findBestAttackAction: function(unit, reachableHexes, enemyPlayer) {
        let bestAction = { score: -Infinity, isFavorable: false };
        for (const enemy of units.filter(e => e.player === enemyPlayer && e.currentHealth > 0)) {
            for (const movePos of reachableHexes) {
                if(!board[movePos.r] || !board[movePos.r][movePos.c]) continue; // Sanity check
                const tempAttacker = { ...unit, r: movePos.r, c: movePos.c };
                if (isValidAttack(tempAttacker, enemy)) {
                    const outcome = predictCombatOutcome(tempAttacker, enemy);
                    let score = (outcome.damageToDefender * 2) - (outcome.damageToAttacker * 1.5);
                    if (outcome.defenderDies) score += 50;
                    if (outcome.attackerDiesInRetaliation) score = -Infinity;
                    score -= (movePos.cost || 0) * 5;
                    if (score > bestAction.score) {
                        bestAction = { 
                            score, target: enemy,
                            moveHex: (movePos.r !== unit.r || movePos.c !== unit.c) ? movePos : null,
                            isFavorable: (outcome.damageToDefender > (outcome.damageToAttacker || 0) * 1.2) && !outcome.attackerDiesInRetaliation
                        };
                    }
                }
            }
        }
        return bestAction;
    },

    findBestGeneralMovement: function(unit, enemyPlayer) {
        const targetHex = this.findBestStrategicObjective(unit, enemyPlayer);
        if (!targetHex) return { targetHex: null, path: null };
        const path = this.findPathToTarget(unit, targetHex.r, targetHex.c);
        return { targetHex, path };
    },

    getReachableHexes: function(unit) {
        let reachable = [{ r: unit.r, c: unit.c, cost: 0 }];
        let queue = [{ r: unit.r, c: unit.c, cost: 0 }];
        let visited = new Set([`${unit.r},${unit.c}`]);
        const maxMove = unit.currentMovement || 0;
        while(queue.length > 0) {
            let curr = queue.shift();
            if (curr.cost >= maxMove) continue;
            for (const n of getHexNeighbors(curr.r, curr.c)) {
                const key = `${n.r},${n.c}`;
                if (!visited.has(key) && !getUnitOnHex(n.r, n.c)) {
                    const moveCost = TERRAIN_TYPES[board[n.r][n.c].terrain]?.movementCostMultiplier || 1;
                    const newCost = curr.cost + moveCost;
                    if (newCost <= maxMove) {
                        visited.add(key);
                        reachable.push({r: n.r, c: n.c, cost: newCost});
                        queue.push({r: n.r, c: n.c, cost: newCost});
                    }
                }
            }
        }
        return reachable;
    },
    
    createUnitObject: function(definition, playerNumber, spot) {
        const stats = calculateRegimentStats(definition.regiments, playerNumber);
        return {
            id: `u${unitIdCounter++}`, player: playerNumber, name: `${definition.name} IA`,
            regiments: definition.regiments.map(r => ({ ...r, id: `r${Date.now()}${Math.random()}`})),
            ...stats, currentHealth: stats.maxHealth, currentMovement: stats.movement,
            r: spot.r, c: spot.c, hasMoved: false, hasAttacked: false, level: 0,
            experience: 0, morale: 50, maxMorale: 125,
        };
    },

    findAndExecuteMerge: async function(unit, attackTarget) {
        const allies = units.filter(u => u.player === unit.player && u.id !== unit.id && !u.hasMoved && !u.hasAttacked);
        let bestMergePartner = null;
        let bestPostMergeScore = -Infinity;

        for (const ally of allies) {
            if (hexDistance(unit.r, unit.c, ally.r, ally.c) <= (ally.currentMovement || ally.movement)) {
                const combinedRegs = [...unit.regiments, ...ally.regiments];
                const tempSuperUnit = { ...unit, regiments: combinedRegs };
                const tempStats = calculateRegimentStats(combinedRegs, unit.player);
                Object.assign(tempSuperUnit, tempStats);
                
                const outcome = predictCombatOutcome(tempSuperUnit, attackTarget);
                let score = outcome.defenderDies ? 200 : outcome.damageToDefender * 2;
                if(outcome.isFavorable && score > bestPostMergeScore){
                    bestPostMergeScore = score;
                    bestMergePartner = ally;
                }
            }
        }
        if (bestMergePartner) {
            console.log(`   -> Aliado ${bestMergePartner.name} encontrado para fusionarse.`);
            await moveUnit(bestMergePartner, unit.r, unit.c); // Mueve al aliado
            if(getUnitOnHex(unit.r, unit.c)?.id === bestMergePartner.id) {
                mergeUnits(bestMergePartner, unit); // La unidad que se mueve es la que se disuelve
            }
            return true;
        }
        console.log("   -> No se encontraron aliados viables para fusionar. Ejecutando Retirada Táctica...");
        await this.executeRetreat(unit);
        return true;
    },

    handleCapitalChange: function(playerNumber) {
        const capital = gameState.cities.find(c => c.isCapital && c.owner === playerNumber);
        if (!capital) return;
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const isThreatened = units.some(u => u.player === enemyPlayer && hexDistance(u.r, u.c, capital.r, capital.c) <= 2);

        if (isThreatened) {
            const safeCities = gameState.cities.filter(c => c.owner === playerNumber && !c.isCapital && !units.some(u => u.player === enemyPlayer && hexDistance(u.r, u.c, c.r, c.c) <= 3));
            if (safeCities.length > 0) {
                console.log(`[IA Empire] ¡AMENAZA! La capital en (${capital.r},${capital.c}) está en peligro. Cambiando a (${safeCities[0].r},${safeCities[0].c}).`);
                handleChangeCapital(safeCities[0].r, safeCities[0].c);
            }
        }
    },

    executeRetreat: async function(unit) {
        const safeBases = gameState.cities.filter(c => c.owner === unit.player).sort((a,b) => hexDistance(unit.r, unit.c, a.r, a.c) - hexDistance(unit.r, unit.c, b.r, b.c));
        if(safeBases.length > 0){
            const path = this.findPathToTarget(unit, safeBases[0].r, safeBases[0].c);
            if(path && path.length > 1){
                 await moveUnit(unit, path[1].r, path[1].c);
                 return true;
            }
        }
        return false;
    },

    attemptOpportunisticAttack: async function(unit, enemyPlayer) {
        if (!unit.hasAttacked) {
            const immediateTarget = this.findBestImmediateAttackTarget(unit, enemyPlayer);
            if (immediateTarget) { await attackUnit(unit, immediateTarget); return true; }
        }
        if (!unit.hasMoved && !unit.hasAttacked) {
            const moveAttackPlan = this.findBestMoveAndAttackAction(unit, enemyPlayer);
            if (moveAttackPlan) {
                await moveUnit(unit, moveAttackPlan.moveCoords.r, moveAttackPlan.moveCoords.c);
                if (unit.currentHealth > 0 && !unit.hasAttacked) {
                    await attackUnit(unit, moveAttackPlan.targetUnit);
                }
                return true;
            }
        }
        return false;
    },

    findBestImmediateAttackTarget: function(unit, enemyPlayer) {
        let bestTarget = null, bestScore = -Infinity;
        units.filter(e => e.player === enemyPlayer && e.currentHealth > 0 && isValidAttack(unit, e))
             .forEach(enemy => {
                const outcome = predictCombatOutcome(unit, enemy);
                let score = outcome.defenderDies ? 200 : (outcome.damageToDefender * 2);
                score -= (outcome.damageToAttacker * 1.1);
                if (outcome.attackerDiesInRetaliation) score = -Infinity;
                if (score > bestScore) { bestScore = score; bestTarget = enemy; }
            });
        return (bestScore > -20) ? bestTarget : null;
    },

    attemptOpportunisticAttack: async function(unit, enemyPlayer) {
        // Esta es una versión simplificada, la mejoraremos
        if (!unit.hasAttacked) {
            const visibleEnemies = units.filter(e => e.player === enemyPlayer && e.currentHealth > 0);
            for (const enemy of visibleEnemies) {
                if (isValidAttack(unit, enemy)) {
                    await attackUnit(unit, enemy);
                    return true;
                }
            }
        }
        return false;
    },

    analyzeFrontera: function(playerNumber) {
        const enemyPlayer = playerNumber === 1 ? 2 : 1;
        const allAiUnits = units.filter(u => u.player === playerNumber);
        const allEnemyUnits = units.filter(u => u.player === enemyPlayer);
        
        for (const aiUnit of allAiUnits) {
            const enemiesNearUnit = allEnemyUnits.filter(e => hexDistance(aiUnit.r, aiUnit.c, e.r, e.c) <= 5);
            if (enemiesNearUnit.length > 0) {
                const aiPower = aiUnit.regiments.length;
                const enemyPower = enemiesNearUnit.reduce((sum, e) => sum + e.regiments.length, 0);
                if (aiPower < enemyPower) {
                    return { frontRequiresReinforcements: true, neededRegs: enemyPower + 1 };
                }
            }
        }
        return { frontRequiresReinforcements: false, neededRegs: 0 };
    },
    
    endAiTurn: function(aiPlayerNumber) {
        if (gameState.currentPhase !== "gameOver" && gameState.currentPlayer === aiPlayerNumber) {
            if (domElements.endTurnBtn && !domElements.endTurnBtn.disabled) {
                console.log(`%c[AI Manager] Finalizando turno para Jugador ${aiPlayerNumber}`, "color: purple;");
                setTimeout(() => { if(domElements.endTurnBtn) domElements.endTurnBtn.click(); }, 250);
            }
        }
    }
    
};