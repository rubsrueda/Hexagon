// uiUpdates.js
// Reemplaza el objeto UIManager completo con esto.

const UIManager = {
    _tutorialMessagePanel: null, 
    _originalEndTurnButtonListener: null, 
    _lastTutorialHighlightElementId: null, 
    _lastTutorialHighlightHexes: [],      
    _combatPredictionPanel: null, 
    _currentAttackPredictionListener: null, 
    _hidePredictionTimeout: null, 
    _domElements: null, 

    setDomElements: function(domElementsRef) {
        this._domElements = domElementsRef; 
        this._combatPredictionPanel = document.getElementById('combatPredictionPanel');
        if (!this._combatPredictionPanel) console.error("UIManager Error: No se encontró el #combatPredictionPanel en el DOM.");
        this.hideAllActionButtons();
    },
    
    showCombatPrediction: function(outcome, targetUnit, event) {
        if (!this._combatPredictionPanel) return;
        
        if (this._hidePredictionTimeout) clearTimeout(this._hidePredictionTimeout);

        let html = `<h4>Predicción de Combate</h4><p>Atacando a: <strong>${targetUnit.name} (${targetUnit.currentHealth} HP)</strong></p><p>Daño infligido: <span class="attacker-damage">${outcome.damageToDefender}</span></p>`;
        
        if (outcome.defenderDies) {
            html += `<span class="critical-info">¡OBJETIVO DESTRUIDO!</span>`;
        } else {
            html += `<p>Daño recibido: <span class="defender-damage">${outcome.damageToAttacker}</span></p>`;
            if (outcome.attackerDiesInRetaliation) {
                html += `<span class="critical-info">¡TU UNIDAD SERÁ DESTRUIDA!</span>`;
            }
        }
        
        this._combatPredictionPanel.innerHTML = html;
        this._combatPredictionPanel.style.display = 'block';
        
        const panelWidth = this._combatPredictionPanel.offsetWidth;
        const panelHeight = this._combatPredictionPanel.offsetHeight;
        let left = event.clientX + 20;
        let top = event.clientY - panelHeight - 10;

        if (left + panelWidth > window.innerWidth) left = event.clientX - panelWidth - 20;
        if (top < 0) top = event.clientY + 20;

        this._combatPredictionPanel.style.left = `${left}px`;
        this._combatPredictionPanel.style.top = `${top}px`;
        this._combatPredictionPanel.classList.add('visible');
    },
    
    hideCombatPrediction: function() {
        if (!this._combatPredictionPanel) return;
        if (this._hidePredictionTimeout) clearTimeout(this._hidePredictionTimeout);
        this._hidePredictionTimeout = setTimeout(() => {
            if (this._combatPredictionPanel) this._combatPredictionPanel.classList.remove('visible');
        }, 100);
    },

    attachAttackPredictionListener: function(selectedUnit) {
        if (!this._domElements.gameBoard || !selectedUnit) return;
        
        if (this._currentAttackPredictionListener) {
            this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
        }
        
        this._currentAttackPredictionListener = (event) => {
            const hexEl = event.target.closest('.hex');
            if (!hexEl) { this.hideCombatPrediction(); return; }
            const r = parseInt(hexEl.dataset.r);
            const c = parseInt(hexEl.dataset.c);
            const targetUnit = getUnitOnHex(r, c);
            if (hexEl.classList.contains('highlight-attack') && targetUnit && isValidAttack(selectedUnit, targetUnit)) {
                const outcome = predictCombatOutcome(selectedUnit, targetUnit);
                this.showCombatPrediction(outcome, targetUnit, event);
            } else {
                this.hideCombatPrediction();
            }
        };
        this._domElements.gameBoard.addEventListener('mousemove', this._currentAttackPredictionListener);
    },
    
    removeAttackPredictionListener: function() {
        if (this._currentAttackPredictionListener && this._domElements.gameBoard) {
            this._domElements.gameBoard.removeEventListener('mousemove', this._currentAttackPredictionListener);
            this._currentAttackPredictionListener = null;
            this.hideCombatPrediction();
        }
    },

    clearHighlights: function() {
        if (board && board.length > 0) {
             document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place, .hex.tutorial-highlight-hex').forEach(h => {
                 h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place', 'tutorial-highlight-hex');
             });
        }
        if (this._lastTutorialHighlightElementId) {
             const el = document.getElementById(this._lastTutorialHighlightElementId);
             if (el) el.classList.remove('tutorial-highlight');
             this._lastTutorialHighlightElementId = null;
        }
        if (this._lastTutorialHighlightHexes.length > 0) {
             this._lastTutorialHighlightHexes.forEach(coords => {
                 const hexData = board[coords.r]?.[coords.c];
                 if (hexData?.element) hexData.element.classList.remove('tutorial-highlight-hex');
             });
             this._lastTutorialHighlightHexes = [];
         }
    },
    
    highlightPossibleActions: function(unit) {
        // Llama al método centralizado de limpieza para empezar de cero.
        this.clearHighlights(); 
    
        // Guarda de seguridad: si no hay unidad o tablero, no hacemos nada.
        if (!unit || !board || board.length === 0) {
            return;
        }
    
        // Recorre cada hexágono del tablero para evaluarlo.
        for (let r_idx = 0; r_idx < board.length; r_idx++) {
            for (let c_idx = 0; c_idx < board[0].length; c_idx++) {
                const hexData = board[r_idx]?.[c_idx];
                // Si el hexágono no existe o no tiene un elemento DOM, lo saltamos.
                if (!hexData || !hexData.element) {
                    continue;
                }
    
                // No mostrar resaltados en hexágonos ocultos por la niebla de guerra.
                if (gameState.currentPhase === "play" && hexData.visibility?.[`player${gameState.currentPlayer}`] === 'hidden') {
                    continue;
                }
    
                // Llama a la lógica de `unit_Actions.js` (`isValidMove`) para saber si el movimiento es válido.
                // Si lo es, aplica la clase CSS visual 'highlight-move'.
                if (gameState.currentPhase === 'play' && !unit.hasMoved && unit.currentMovement > 0 && isValidMove(unit, r_idx, c_idx)) {
                    hexData.element.classList.add('highlight-move');
                }
    
                // Comprueba si hay un enemigo en el hexágono.
                const targetUnitOnHex = getUnitOnHex(r_idx, c_idx);
                // Llama a la lógica de `unit_Actions.js` (`isValidAttack`) para saber si el ataque es válido.
                // Si lo es, aplica la clase CSS visual 'highlight-attack'.
                if (gameState.currentPhase === 'play' && !unit.hasAttacked && targetUnitOnHex && targetUnitOnHex.player !== unit.player && isValidAttack(unit, targetUnitOnHex)) {
                    hexData.element.classList.add('highlight-attack');
                }
            }
        }
    },
     
    highlightPossibleSplitHexes: function (unit) {
        if (typeof UIManager !== 'undefined' && UIManager.clearHighlights) UIManager.clearHighlights();
        else if (typeof clearHighlights === "function") clearHighlights();
        if (!unit || !board || board.length === 0) return;

        const neighbors = getHexNeighbors(unit.r, unit.c);
        for (const n of neighbors) {
            const hexData = board[n.r]?.[n.c];
            if (!hexData) continue; // Hexágono inválido

            // Un hexágono es válido para la división si:
            // 1. Está vacío (no hay otra unidad).
            // 2. No es un terreno intransitable (ej. agua).
            if (!hexData.unit && !TERRAIN_TYPES[hexData.terrain]?.isImpassableForLand) {
                hexData.element.classList.add('highlight-place'); // Usaremos 'highlight-place' o una nueva clase
            }
        }
    },

    hideAllActionButtons: function() {
         if (!this._domElements) return;
         ['floatingUndoMoveBtn', 'floatingReinforceBtn', 'floatingSplitBtn', 'floatingBuildBtn', 'floatingPillageBtn'].forEach(id => {
             if (this._domElements[id]) this._domElements[id].style.display = 'none';
         });
    },

    updateAllUIDisplays: function() {
        this.updatePlayerAndPhaseInfo();
        if (typeof updateFogOfWar === "function") updateFogOfWar(); 
        this.updateActionButtonsBasedOnPhase();
    },

    updatePlayerAndPhaseInfo: function() {
        if (!gameState || !this._domElements) return;
        let phaseText = gameState.currentPhase ? gameState.currentPhase.charAt(0).toUpperCase() + gameState.currentPhase.slice(1) : "-";
        switch (gameState.currentPhase) {
            case "deployment": phaseText = "Despliegue"; break;
            case "play": phaseText = "En Juego"; break;
            case "gameOver": phaseText = "Fin de Partida"; break;
        }
        const playerType = gameState.playerTypes?.[`player${gameState.currentPlayer}`] === 'human' ? 'Humano' : `IA (${gameState.playerAiLevels?.[`player${gameState.currentPlayer}`] || 'Normal'})`;
        if(this._domElements.floatingMenuTitle) this._domElements.floatingMenuTitle.innerHTML = `Fase: ${phaseText}<br>Turno ${gameState.turnNumber} - Jugador ${gameState.currentPlayer} (${playerType})`;

        const resources = gameState.playerResources?.[gameState.currentPlayer];
        const resourceSpans = document.querySelectorAll('#playerResourcesGrid_float .resource-values span[data-resource]');
        if (resources && resourceSpans.length > 0) {
            resourceSpans.forEach(span => {
                const resType = span.dataset.resource;
                span.textContent = resources[resType] || 0;
            });
        }
    },

    showMessageTemporarily: function(message, duration = 3000, isError = false) {
        // Obtenemos el panel principal
        if (!this._domElements?.contextualInfoPanel) return;
        const panel = this._domElements.contextualInfoPanel;

        // Guardamos el contenido y las clases actuales del panel si está visible
        const originalContent = {
            title: this._domElements.contextualTitle.innerHTML,
            content: this._domElements.contextualContent.innerHTML
        };
        const wasVisible = panel.classList.contains('visible');
        
        // Limpiamos timeouts anteriores para evitar solapamientos
        if (panel.restoreTimeout) {
            clearTimeout(panel.restoreTimeout);
        }

        // Modificamos el panel para mostrar el nuevo mensaje
        this._domElements.contextualTitle.innerHTML = message; // Usamos el título para el mensaje
        this._domElements.contextualContent.innerHTML = ''; // Vaciamos el contenido secundario

        // Aplicamos la clase de color y nos aseguramos de que el panel esté visible
        panel.classList.remove('info-message', 'error-message'); // Limpiar clases de color anteriores
        if (isError) {
            panel.classList.add('error-message');
        } else {
            panel.classList.add('info-message');
        }
        panel.classList.add('visible'); // Mostramos el panel

        // Programamos la restauración del estado original del panel
        panel.restoreTimeout = setTimeout(() => {
            // Quitamos la clase de color del mensaje
            panel.classList.remove('info-message', 'error-message');
            
            // Si el panel estaba visible antes, restauramos su contenido.
            // Si no, simplemente lo ocultamos.
            if (wasVisible) {
                this._domElements.contextualTitle.innerHTML = originalContent.title;
                this._domElements.contextualContent.innerHTML = originalContent.content;
            } else {
                panel.classList.remove('visible');
            }
            panel.restoreTimeout = null;
        }, duration);
    },
    
    updateActionButtonsBasedOnPhase: function() {
        if (!gameState || !this._domElements) return;
        const { currentPhase, playerTypes, currentPlayer, unitsPlacedByPlayer, deploymentUnitLimit } = gameState;
        const isPlay = currentPhase === "play";
        const isGameOver = currentPhase === "gameOver";

        if (this._domElements.floatingTechTreeBtn) this._domElements.floatingTechTreeBtn.style.display = isPlay ? 'flex' : 'none';
        if (this._domElements.floatingEndTurnBtn) this._domElements.floatingEndTurnBtn.disabled = isGameOver;

        if (this._domElements.floatingCreateDivisionBtn) {
            const isHumanPlayerTurn = playerTypes?.[`player${currentPlayer}`] === 'human';
            const unitsPlaced = unitsPlacedByPlayer?.[currentPlayer] || 0;
            const canDeploy = unitsPlaced < deploymentUnitLimit;
            this._domElements.floatingCreateDivisionBtn.style.display = (currentPhase === "deployment" && isHumanPlayerTurn && canDeploy) ? 'flex' : 'none';
        }

        if (isGameOver) {
             ['floatingMenuBtn', 'floatingTechTreeBtn', 'floatingEndTurnBtn', 'floatingCreateDivisionBtn'].forEach(id => {
                if(this._domElements[id]) this._domElements[id].style.display = 'none';
             });
             this.hideAllActionButtons();
             this.hideContextualPanel(); 
        }
    },

    showUnitContextualInfo: function(unit, isOwnUnit = true) {
        this.hideAllActionButtons();
        hexToBuildOn = null;
        if (!this._domElements.contextualInfoPanel || !unit) return;

        const isPlayerUnit = unit.player === gameState.currentPlayer;
        this._domElements.contextualTitle.textContent = `Unidad: ${unit.name} (ID: ${unit.id})`;
        
        let contentHTML = ``;
        contentHTML += `<p>Salud: ${unit.currentHealth}/${unit.maxHealth}</p>`;
        contentHTML += `<p>A/D/M: ${unit.attack}/${unit.defense}/${unit.currentMovement || unit.movement}</p>`;
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = "Exaltada"; moralColor = "#2ecc71"; }
        else if (unit.morale <= 24) { moralStatus = "Vacilante"; moralColor = "#e74c3c"; }
        else if (unit.morale < 50) { moralStatus = "Baja"; moralColor = "#f39c12"; }
        contentHTML += `<p>Moral: <strong style="color:${moralColor};">${unit.morale}/${unit.maxMorale || 125} (${moralStatus})</strong></p>`;
        const unitLevel = unit.level ?? 0, unitExperience = unit.experience || 0;
        const levelData = XP_LEVELS[unitLevel];
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            let xpText = `Nivel: ${levelData.currentLevelName}`;
            if (nextLevelXP !== 'Max') { xpText += ` (XP: ${unitExperience} / ${nextLevelXP})`; }
            contentHTML += `<p>${xpText}</p>`;
        }
        this._domElements.contextualContent.innerHTML = contentHTML;

        // --- LÓGICA DE BOTONES SIMPLIFICADA ---
        if (this._domElements.floatingReinforceBtn) {
            this._domElements.floatingReinforceBtn.style.display = 'flex';
            this._domElements.floatingReinforceBtn.title = 'Gestionar / Ver Detalles de Unidad';
        }

        if (isPlayerUnit && gameState.currentPhase === 'play') {
            const canAct = !unit.hasMoved && !unit.hasAttacked;

            if (unit.lastMove && !unit.hasAttacked) {
                this._domElements.floatingUndoMoveBtn.style.display = 'flex';
            }
            if (canAct) {
                if ((unit.regiments?.length || 0) > 1) {
                    this._domElements.floatingSplitBtn.style.display = 'flex';
                }
                const unitHex = board[unit.r]?.[unit.c];
                if (unitHex && unitHex.owner !== null && unitHex.owner !== unit.player) {
                    if (this._domElements.floatingPillageBtn) this._domElements.floatingPillageBtn.style.display = 'flex';
                }
                
                console.groupCollapsed(`[Builder Check] Verificando si ${unit.name} puede construir.`);
                let isBuilderUnit = false; // Asumimos que no por defecto.
                if (unit.regiments && unit.regiments.length > 0) {
                    // Iteramos sobre cada regimiento para ver si CUALQUIERA de ellos es un constructor.
                    for (const reg of unit.regiments) {
                        const regData = REGIMENT_TYPES[reg.type];
                        if (regData) {
                            console.log(`- Chequeando regimiento: ${reg.type}`);
                            // Condición 1: Es un Colono (isSettler: true)
                            if (regData.isSettler === true) {
                                isBuilderUnit = true;
                                console.log(`  -> Es Colono. ¡Puede construir!`);
                                break; // Si encontramos un constructor, no hace falta seguir mirando.
                            }
                            // Condición 2: Tiene la habilidad de construir caminos
                            if (Array.isArray(regData.abilities) && regData.abilities.includes("build_road")) {
                                isBuilderUnit = true;
                                console.log(`  -> Tiene la habilidad 'build_road'. ¡Puede construir!`);
                                break;
                            }
                        }
                    }
                }
                
                console.log(`Resultado final del chequeo: isBuilderUnit = ${isBuilderUnit}`);
                console.groupEnd();
                
                if (isBuilderUnit) {
                    if (this._domElements.floatingBuildBtn) {
                        hexToBuildOn = { r: unit.r, c: unit.c };
                        this._domElements.floatingBuildBtn.style.display = 'flex';
                    }
                }

            }
        }
        
        if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) { this.attachAttackPredictionListener(unit); }
        else { this.removeAttackPredictionListener(); }
        
        this._domElements.contextualInfoPanel.classList.add('visible');
    },

    showHexContextualInfo: function(r, c, hexData) {
        this.hideAllActionButtons();
        this.removeAttackPredictionListener();
        if (this._domElements.floatingCreateDivisionBtn && gameState.currentPhase !== "deployment") {
            this._domElements.floatingCreateDivisionBtn.style.display = 'none';
        }
        if (!this._domElements.contextualInfoPanel || !hexData) return;

        // --- CONSTRUCCIÓN DEL TÍTULO COMPACTO ---
        let titleParts = [];
        titleParts.push(TERRAIN_TYPES[hexData.terrain]?.name || hexData.terrain);
        if (hexData.resourceNode) {
            titleParts.push(RESOURCE_NODES_DATA[hexData.resourceNode]?.name || hexData.resourceNode);
        }
        this._domElements.contextualTitle.textContent = `Hexágono (${r},${c}) - ${titleParts.join(', ')}`;
        
        // --- CONSTRUCCIÓN DEL CONTENIDO PRINCIPAL COMPACTO ---
        let contentHTML = '';
        
        // Línea 1: Dueño, Estabilidad y Nacionalidad
        let ownerLineParts = [];
        if (hexData.owner !== null) {
            ownerLineParts.push(`Dueño: Jugador ${hexData.owner}`);
            ownerLineParts.push(`Estabilidad: ${hexData.estabilidad}/${MAX_STABILITY}`);
            ownerLineParts.push(`Nacionalidad: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`);
        } else {
            ownerLineParts.push("Territorio Neutral");
        }
        contentHTML += `<p>${ownerLineParts.join(' | ')}</p>`;
        
        // Línea 2: Estructura (si existe)
        if (hexData.structure) {
            contentHTML += `<p>Estructura: ${STRUCTURE_TYPES[hexData.structure]?.sprite || ''} ${STRUCTURE_TYPES[hexData.structure]?.name || hexData.structure}</p>`;
        } else if (hexData.isCity) {
            contentHTML += `<p><strong>${hexData.isCapital ? 'Capital' : 'Ciudad'}</strong></p>`;
        }
        
        this._domElements.contextualContent.innerHTML = contentHTML;
        
        // --- LÓGICA DE ACCIONES (Sin cambios) ---
        const isPlayerTerritory = hexData.owner === gameState.currentPlayer;
        const isUnitPresent = getUnitOnHex(r, c);
        const canActHere = gameState.currentPhase === 'play' && isPlayerTerritory && !isUnitPresent;

            console.log(`  - ¿Es territorio del jugador ${gameState.currentPlayer}?: ${isPlayerTerritory} (Dueño del hex: ${hexData.owner})`);
            console.log(`  - ¿Hay una unidad en el hex?: ${isUnitPresent ? isUnitPresent.name : 'No'}`);

        if (canActHere) {
            const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
            if (playerTechs.includes('ENGINEERING')) {
                if (this._domElements.floatingBuildBtn) this._domElements.floatingBuildBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
                } else {
                    console.log("    - NO tiene tecnología 'ENGINEERING'.");
            }
            
            const currentStructureInfo = hexData.structure ? STRUCTURE_TYPES[hexData.structure] : null;
                console.log(`    - ¿Tiene estructura?: ${hexData.structure || 'No'}`);
                if(currentStructureInfo) {
                    console.log(`    - ¿La estructura permite reclutar?: ${currentStructureInfo.allowsRecruitment === true}`);
                }

            const isRecruitmentPoint = hexData.isCity || hexData.isCapital || (currentStructureInfo && currentStructureInfo.allowsRecruitment === true);
                
                console.log(`    - ¿Resultado final de isRecruitmentPoint?: ${isRecruitmentPoint}`);
            
            if (isRecruitmentPoint) {
                    console.log("      -> SÍ. Mostrando botón de reclutamiento (➕).");
                if (this._domElements.floatingCreateDivisionBtn) {
                    this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                }
                hexToBuildOn = { r, c };
                } else {
                    console.log("      -> NO. No se mostrará el botón de reclutamiento.");
            }

        } else {
            hexToBuildOn = null;
        }
        
        this._domElements.contextualInfoPanel.classList.add('visible');
            console.groupEnd();
    },

    hideContextualPanel: function() {
        this.removeAttackPredictionListener();
        this.hideAllActionButtons();
        if (this._domElements.floatingCreateDivisionBtn && gameState.currentPhase !== "deployment") {
            this._domElements.floatingCreateDivisionBtn.style.display = 'none';
        }
        if (typeof selectedUnit !== 'undefined') selectedUnit = null;
        if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
        if (this._domElements.contextualInfoPanel) {
            this._domElements.contextualInfoPanel.classList.remove('visible');
        }
    },
    
    updateSelectedUnitInfoPanel: function() {
        if (selectedUnit) {
            this.showUnitContextualInfo(selectedUnit, (selectedUnit.player === gameState.currentPlayer));
        } else {
            this.hideContextualPanel();
        }
    },
    
    updateUnitStrengthDisplay: function(unit) {
        if (!unit?.element) return;
        const s = unit.element.querySelector('.unit-strength');
        if (s) {
            s.textContent = unit.currentHealth;
            s.style.color = unit.currentHealth <= 0 ? 'red' : unit.currentHealth < unit.maxHealth / 2 ? 'orange' : '';
        }
    },

    highlightTutorialElement: function(elementId, hexCoords) {
        this.clearHighlights(); 
        if (elementId) {
            const el = document.getElementById(elementId);
            if (el) { el.classList.add('tutorial-highlight'); this._lastTutorialHighlightElementId = elementId; }
        }
        if (hexCoords?.length > 0) {
            hexCoords.forEach(coords => {
                const hexData = board[coords.r]?.[coords.c];
                if (hexData?.element) {
                    hexData.element.classList.add('tutorial-highlight-hex'); 
                    this._lastTutorialHighlightHexes.push(coords); 
                }
            });
        }
    },

    updateTurnIndicatorAndBlocker: function() {
        if (!this._domElements || !gameState) return;

        const blocker = document.getElementById('turnBlocker');
        const endTurnBtn = this._domElements.floatingEndTurnBtn;

        if (!blocker || !endTurnBtn) {
            console.error("UI Error: No se encuentra el turnBlocker o el floatingEndTurnBtn");
            return;
        }

        const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

        if (isMyTurn) {
            // ES MI TURNO
            blocker.style.display = 'none'; // Ocultar el bloqueador
            endTurnBtn.disabled = false;    // Habilitar el botón de fin de turno
            this.showMessageTemporarily("¡Es tu turno!", 2000); // Mensaje temporal
        } else {
            // NO ES MI TURNO
            blocker.style.display = 'flex'; // Mostrar el bloqueador
            blocker.textContent = `Esperando al Jugador ${gameState.currentPlayer}...`;
            endTurnBtn.disabled = true;     // Deshabilitar el botón
        }
    },
};