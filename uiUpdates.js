// uiUpdates.js

/**
 * Comprueba si una unidad enemiga está dentro del rango de visión de un explorador del jugador actual.
 * @param {object} enemyUnit - La unidad enemiga seleccionada.
 * @returns {boolean} - True si un explorador la ve, false en caso contrario.
 */
function isEnemyScouted(enemyUnit) {
    const currentPlayer = gameState.currentPlayer;
    const playerScoutUnits = units.filter(unit => 
        unit.player === currentPlayer && 
        unit.regiments.some(reg => reg.type === "Explorador")
    );

    if (playerScoutUnits.length === 0) {
        return false;
    }

    // Comprueba si alguna de las unidades exploradoras está en rango
    for (const scoutUnit of playerScoutUnits) {
        const distance = hexDistance(scoutUnit.r, scoutUnit.c, enemyUnit.r, enemyUnit.c);
        const scoutRange = scoutUnit.visionRange || 2; // Rango de visión del explorador
        if (distance <= scoutRange) {
            console.log(`[Scout Check] Unidad enemiga ${enemyUnit.name} está en rango del explorador ${scoutUnit.name}.`);
            return true;
        }
    }
    
    return false;
}

const UIManager = {
    _tutorialMessagePanel: null, 
    _originalEndTurnButtonListener: null, 
    _lastTutorialHighlightElementId: null, 
    _lastTutorialHighlightHexes: [],      
    _combatPredictionPanel: null, 
    _currentAttackPredictionListener: null, 
    _hidePredictionTimeout: null, 
    _domElements: null, 
    _restoreTimeout: null,

    setDomElements: function(domElementsRef) {
        this._domElements = domElementsRef; 
        this._combatPredictionPanel = document.getElementById('combatPredictionPanel');
        if (!this._combatPredictionPanel) console.error("UIManager Error: No se encontró el #combatPredictionPanel en el DOM.");
        this.hideAllActionButtons();
    },
    
    setEndTurnButtonToFinalizeTutorial: function(callback) {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;
        
        btn.innerHTML = "🏁"; // Cambia el icono a una bandera de meta
        btn.title = "Finalizar Tutorial";
        btn.disabled = false;
        this.highlightTutorialElement(btn.id);
        
        // Clonar y reemplazar el botón para eliminar todos los listeners antiguos de forma segura
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // Volvemos a obtener la referencia al nuevo botón
        this._domElements.floatingEndTurnBtn = document.getElementById(newBtn.id);
        
        // La acción final será volver al menú y detener el tutorial.
        const finalizeAction = () => {
            showScreen(domElements.mainMenuScreenEl);
            TutorialManager.stopTutorial();
        };
        
        this._domElements.floatingEndTurnBtn.addEventListener('click', finalizeAction);
    },

    restoreEndTurnButton: function() {
        const btn = this._domElements.floatingEndTurnBtn;
        if (!btn) return;
        
        btn.innerHTML = "►";
        btn.title = "Finalizar Turno";
        btn.classList.remove('tutorial-highlight');

        // Clonamos de nuevo para eliminar el listener del tutorial
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        this._domElements.floatingEndTurnBtn = document.getElementById(newBtn.id);

        // Y le volvemos a poner el listener original del juego.
        this._domElements.floatingEndTurnBtn.addEventListener('click', () => handleEndTurn());
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
    /*
    clearHighlights: function() {
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
        
        // --- CÓDIGO DE REFUERZO: Limpia cualquier resaltado persistente por si acaso ---
        document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
        document.querySelectorAll('.hex.tutorial-highlight-hex').forEach(el => el.classList.remove('tutorial-highlight-hex'));
        
        // --- Mantenemos la lógica original de limpieza para el juego normal ---
        if (board && board.length > 0) {
             document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
                 h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
             });
        }
    },
   */
  clearTutorialHighlights: function() {
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

    // (FUNCIÓN MODIFICADA) - Ahora solo limpia los resaltados del JUEGO (movimiento, ataque, etc.)
    clearHighlights: function() {
        // Ya no toca los resaltados del tutorial, solo los del juego normal.
        if (board && board.length > 0) {
             document.querySelectorAll('.hex.highlight-move, .hex.highlight-attack, .hex.highlight-build, .hex.highlight-place').forEach(h => {
                 h.classList.remove('highlight-move', 'highlight-attack', 'highlight-build', 'highlight-place');
             });
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
        const contextualButtons = [
            'floatingUndoMoveBtn', 'floatingReinforceBtn', 'floatingSplitBtn', 
            'floatingBuildBtn', 'floatingPillageBtn', 'setAsCapitalBtn', 
            'floatingConsolidateBtn', 'floatingAssignGeneralBtn', 'floatingCreateDivisionBtn'
        ];
        contextualButtons.forEach(id => {
            if (this._domElements[id]) {
                this._domElements[id].style.display = 'none';
            }
        });
    },

    showUnitContextualInfo: function(unit, isOwnUnit = true) {
        // Primero, ocultamos TODOS los botones contextuales para empezar de cero.
        this.hideAllActionButtons();

        if (!this._domElements.contextualInfoPanel || !unit) return;
        
        // El resto de la preparación se mantiene igual
        this._domElements.contextualInfoPanel.style.display = 'flex';
        hexToBuildOn = null;
        gameState.selectedHexR = unit.r;
        gameState.selectedHexC = unit.c;
        this._domElements.contextualInfoPanel.classList.remove('is-expanded');
        if (this._domElements.expandPanelBtn) this._domElements.expandPanelBtn.textContent = '▲';
        
        const isPlayerUnit = unit.player === gameState.currentPlayer;
        this._domElements.contextualTitle.textContent = `Unidad: ${unit.name} (J${unit.player})`;
        this._domElements.contextualContent.innerHTML = this._buildUnitDetailsHTML(unit);

        // --- LÓGICA DE VISIBILIDAD DE BOTONES (REVISADA Y FINAL) ---

        // Botón 💪/👁️ (Reforzar/Ver)
        const isScoutedEnemy = !isPlayerUnit && isEnemyScouted(unit);
        if (isPlayerUnit || isScoutedEnemy) {
            if (this._domElements.floatingReinforceBtn) {
                this._domElements.floatingReinforceBtn.style.display = 'flex';
                this._domElements.floatingReinforceBtn.title = isPlayerUnit ? "Gestionar/Reforzar Unidad" : "Ver Detalles";
                this._domElements.floatingReinforceBtn.innerHTML = isPlayerUnit ? "💪" : "👁️";
            }
        }
        
        // Botones solo para unidades propias en fase de juego
        if (isPlayerUnit && gameState.currentPhase === 'play') {
            const canAct = !unit.hasMoved && !unit.hasAttacked;
            if (unit.lastMove && !unit.hasAttacked) {
                if (this._domElements.floatingUndoMoveBtn) this._domElements.floatingUndoMoveBtn.style.display = 'flex';
            }

            // Botones que solo se muestran si la unidad AÚN PUEDE ACTUAR
            if (canAct) {
                if ((unit.regiments?.length || 0) > 1 && this._domElements.floatingSplitBtn) {
                    this._domElements.floatingSplitBtn.style.display = 'flex';
                }

                // =================================================================
                // ===           LÓGICA CORREGIDA Y VERIFICADA (ASIGNAR GENERAL)           ===
                // =================================================================
                if (this._domElements.floatingAssignGeneralBtn) {
                    const playerTechs = gameState.playerResources[unit.player]?.researchedTechnologies || [];
                    const hasLeadershipTech = playerTechs.includes("LEADERSHIP");
                    const hasHQ = unit.regiments.some(r => r.type === "Cuartel General");
                    const unitHex = board[unit.r]?.[unit.c];
                    let isAtRecruitmentPoint = false;
                    if (unitHex) {
                        // Comprueba la casilla actual
                        if (unitHex.isCity || unitHex.isCapital || unitHex.structure === "Fortaleza") {
                            isAtRecruitmentPoint = true;
                        } else {
                            // Si no, comprueba las casillas adyacentes
                            const neighbors = getHexNeighbors(unit.r, unit.c);
                            for (const neighbor of neighbors) {
                                const neighborHex = board[neighbor.r]?.[neighbor.c];
                                if (neighborHex && (neighborHex.isCity || neighborHex.isCapital || neighborHex.structure === "Fortaleza")) {
                                    isAtRecruitmentPoint = true;
                                    break; // Encontramos una, no hace falta seguir buscando
                                }
                            }
                        }
                    }
                    const maxGenerals = (gameState.cities.filter(c => c.owner === unit.player).length || 1);
                    const currentGenerals = gameState.activeCommanders[unit.player]?.length || 0;
                    
                    if (!unit.commander && hasLeadershipTech && hasHQ && isAtRecruitmentPoint) {
                        this._domElements.floatingAssignGeneralBtn.style.display = 'flex';
                    }
                }
                
                const unitHex = board[unit.r]?.[unit.c];
                if (unitHex) {
                    if (unitHex.owner !== null && unitHex.owner !== unit.player && this._domElements.floatingPillageBtn) {
                        this._domElements.floatingPillageBtn.style.display = 'flex';
                    }
                    const isBuilderUnit = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.isSettler || REGIMENT_TYPES[reg.type]?.abilities?.includes("build_road"));
                    if (isBuilderUnit && this._domElements.floatingBuildBtn) {
                        hexToBuildOn = { r: unit.r, c: unit.c };
                        this._domElements.floatingBuildBtn.style.display = 'flex';
                    }
                }

                const regimentTypes = unit.regiments.map(r => r.type);
                const hasDamagedDuplicates = [...new Set(regimentTypes)].some(type => {
                    const group = unit.regiments.filter(r => r.type === type);
                    return group.length > 1 && group.some(r => r.health < REGIMENT_TYPES[type].health);
                });
                if (hasDamagedDuplicates && this._domElements.floatingConsolidateBtn) {
                    this._domElements.floatingConsolidateBtn.style.display = 'flex';
                }
            }
            
            const hexUnderUnit = board[unit.r]?.[unit.c];
            if (hexUnderUnit && this._domElements.setAsCapitalBtn) {
                const isEligibleCity = hexUnderUnit.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexUnderUnit.structure);
                if (isOwnUnit && isEligibleCity && !hexUnderUnit.isCapital) {
                    this._domElements.setAsCapitalBtn.style.display = 'flex';
                }
            }
        }
        
        if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) {
            this.attachAttackPredictionListener(unit);
        } else { 
            this.removeAttackPredictionListener();
        }
        if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.add('visible');
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
            
            // DIAGNÓSTICO: Logs para detectar el problema del límite de construcción
            console.log(`%c[DIAGNÓSTICO CONSTRUCCIÓN] Jugador ${currentPlayer}:`, 'background: #FF6347; color: white; font-weight: bold;');
            console.log(`  - Unidades colocadas: ${unitsPlaced}`);
            console.log(`  - Límite de despliegue: ${deploymentUnitLimit}`);
            console.log(`  - Puede desplegar: ${canDeploy}`);
            console.log(`  - Es turno humano: ${isHumanPlayerTurn}`);
            console.log(`  - Fase actual: ${currentPhase}`);
            console.log(`  - Botón se mostrará: ${currentPhase === "deployment" && isHumanPlayerTurn && canDeploy}`);
            
            this._domElements.floatingCreateDivisionBtn.style.display = (currentPhase === "deployment" && isHumanPlayerTurn && canDeploy) ? 'flex' : 'none';
        }

        if (this._domElements.floatingNextUnitBtn) {
            const hasIdleUnits = units.some(u => 
                u.player === currentPlayer && 
                u.currentHealth > 0 && 
                !u.hasMoved && 
                !u.hasAttacked
            );
            const isHumanPlayerTurn = gameState.playerTypes[`player${currentPlayer}`] === 'human';

            // Muestra el botón si es el turno de un jugador humano, la partida está en juego y hay unidades inactivas
            if (currentPhase === "play" && isHumanPlayerTurn && hasIdleUnits) {
                this._domElements.floatingNextUnitBtn.style.display = 'flex';
            } else {
                this._domElements.floatingNextUnitBtn.style.display = 'none';
            }
        }

        if (isGameOver) {
             ['floatingMenuBtn', 'floatingTechTreeBtn', 'floatingEndTurnBtn', 'floatingCreateDivisionBtn'].forEach(id => {
                if(this._domElements[id]) this._domElements[id].style.display = 'none';
             });
             this.hideAllActionButtons();
             this.hideContextualPanel(); 
        }
    },
  
    showMessageTemporarily: function(message, duration = 3000, isError = false) {
        if (!this._domElements?.contextualInfoPanel) return;
        const panel = this._domElements.contextualInfoPanel;

        if (this._restoreTimeout) clearTimeout(this._restoreTimeout);
        
        // El mensaje toma control TOTAL del panel
        this._domElements.contextualTitle.innerHTML = message;
        if(this._domElements.contextualContent) this._domElements.contextualContent.innerHTML = '';
        if(this._domElements.contextualActions) this._domElements.contextualActions.style.display = 'none';

        panel.classList.remove('info-message', 'error-message');
        panel.classList.add(isError ? 'error-message' : 'info-message');

        // Mostramos el panel de forma inequívoca
        panel.classList.add('visible');

        // El timer SIEMPRE oculta el panel al terminar.
        this._restoreTimeout = setTimeout(() => {
            this.hideContextualPanel();
        }, duration);
    },

    hideContextualPanel: function() {
        if (this._restoreTimeout) {
            clearTimeout(this._restoreTimeout);
            this._restoreTimeout = null;
        }
        
        const panel = this._domElements?.contextualInfoPanel;
        if (panel) {
            panel.classList.remove('visible');
        }
        
        this.removeAttackPredictionListener();
        this.hideAllActionButtons();
        if (typeof selectedUnit !== 'undefined') selectedUnit = null;
        if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    },
    
    _buildUnitDetailsHTML: function(unit) {
        let html = '';

        // <<== INICIO DE LA CORRECCIÓN: Sección del General con Imagen ==>>
        if (unit.commander && COMMANDERS[unit.commander]) {
            const cmdr = COMMANDERS[unit.commander];
            const cmdrSpriteValue = cmdr.sprite;
            let commanderSpriteHTML = '';

            // Si el sprite es una ruta de imagen...
            if (cmdrSpriteValue.includes('.png') || cmdrSpriteValue.includes('.jpg')) {
                // ...creamos una etiqueta <img>
                commanderSpriteHTML = `<img src="${cmdrSpriteValue}" alt="${cmdr.name}" style="width: 24px; height: 24px; border-radius: 50%; vertical-align: middle; margin-right: 5px;">`;
            } else {
                // ...si no, lo tratamos como un emoji (fallback).
                commanderSpriteHTML = `<span style="font-size: 20px; vertical-align: middle; margin-right: 5px;">${cmdrSpriteValue}</span>`;
            }

            html += `<p style="text-align: center; font-weight: bold; color: gold; margin-bottom: 5px; display: flex; align-items: center; justify-content: center;">
                Liderada por: ${commanderSpriteHTML} ${cmdr.name}, ${cmdr.title}
            </p>`;
        }

            // --- Línea 1: Stats Consolidados de la Unidad ---
            // Salud
        const healthStr = `Salud: ${unit.currentHealth}/${unit.maxHealth}`;
        
            // Moral (con colores)
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = "Exaltada"; moralColor = "#2ecc71"; }
        else if (unit.morale <= 24) { moralStatus = "Vacilante"; moralColor = "#e74c3c"; }
        else if (unit.morale < 50) { moralStatus = "Baja"; moralColor = "#f39c12"; }
        const moraleStr = `Moral: <strong style="color:${moralColor};">${unit.morale || 50}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

            // Experiencia (con valores numéricos)
        const levelData = XP_LEVELS[unit.level || 0];
        let xpStr = "Experiencia: ";
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            if (nextLevelXP !== 'Max') {
                xpStr += `${unit.experience || 0}/${nextLevelXP} (${levelData.currentLevelName})`;
            } else {
                xpStr += `Máxima (${levelData.currentLevelName})`;
            }
        }

        // Movimiento
        const moveStr = `Mov: ${unit.currentMovement || unit.movement}`;
        
        // Consumo de Comida
        const foodConsumption = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.foodConsumption || 0), 0);
        const upkeep = (unit.regiments || []).reduce((sum, reg) => sum + (REGIMENT_TYPES[reg.type]?.cost.upkeep || 0), 0);
        const upkeepStr = `Mant: ${upkeep} Oro, ${foodConsumption} Comida`;


        // Construir la primera línea del HTML. Usamos separadores para claridad.
        // <<== MODIFICA ESTA LÍNEA para añadir upkeepStr ==>>
        html += `<p>${healthStr} &nbsp;|&nbsp; ${moraleStr} &nbsp;|&nbsp; ${xpStr} &nbsp;|&nbsp; ${moveStr} &nbsp;|&nbsp; ${upkeepStr}</p>`;

        // --- Líneas 2 y 3: Información de la Casilla ---
        const hexData = board[unit.r]?.[unit.c];
        if (hexData) {
                // Terreno y Coordenadas
            const terrainName = TERRAIN_TYPES[hexData.terrain]?.name || 'Desconocido';
            html += `<p>En Terreno: ${terrainName} (${unit.r},${unit.c})</p>`;
            
                // Dueño, Estabilidad y Nacionalidad
            if (hexData.owner !== null) {
                html += `<p>Dueño: J${hexData.owner} &nbsp;|&nbsp; Est: ${hexData.estabilidad}/${MAX_STABILITY} &nbsp;|&nbsp; Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}</p>`;
            } else {
                html += `<p>Territorio Neutral</p>`;
            }
        }
        
        return html;
    },
       
    _buildHexDetailsHTML: function(hexData) {
        let contentParts = [];
        
        // Parte 1: Dueño y Territorio
        if (hexData.owner !== null) {
            contentParts.push(`Dueño: J${hexData.owner}`);
            contentParts.push(`Est: ${hexData.estabilidad}/${MAX_STABILITY}`);
            contentParts.push(`Nac: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`);
        } else {
            contentParts.push("Territorio Neutral");
        }

        // Parte 2: Estructura
        if (hexData.structure) {
            contentParts.push(`Estructura: ${STRUCTURE_TYPES[hexData.structure]?.name || hexData.structure}`);
        } else if (hexData.isCity) {
            contentParts.push(hexData.isCapital ? 'Capital' : 'Ciudad');
        }
        
        return `<p>${contentParts.join(' | ')}</p>`;
    },
    
    showHexContextualInfo: function(r, c, hexData) {
        if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.remove('is-expanded');
        if (this._domElements.expandPanelBtn) this._domElements.expandPanelBtn.textContent = '▲';
        this.hideAllActionButtons();
         this._domElements.contextualInfoPanel.style.display = 'flex';
        this.removeAttackPredictionListener();
        if (this._domElements.floatingCreateDivisionBtn && gameState.currentPhase !== "deployment") {
            this._domElements.floatingCreateDivisionBtn.style.display = 'none';
        }
        if (!this._domElements.contextualInfoPanel || !hexData) return;

        let titleParts = [];
        titleParts.push(TERRAIN_TYPES[hexData.terrain]?.name || hexData.terrain);
        if (hexData.resourceNode) {
            titleParts.push(RESOURCE_NODES_DATA[hexData.resourceNode]?.name || hexData.resourceNode);
        }
        this._domElements.contextualTitle.textContent = `Hexágono (${r},${c}) - ${titleParts.join(', ')}`;
        
        let contentHTML = '';
        let ownerLineParts = [];
        if (hexData.owner !== null) {
            ownerLineParts.push(`Dueño: Jugador ${hexData.owner}`);
            ownerLineParts.push(`Estabilidad: ${hexData.estabilidad}/${MAX_STABILITY}`);
            ownerLineParts.push(`Nacionalidad: ${hexData.nacionalidad[hexData.owner] || 0}/${MAX_NACIONALIDAD}`);
        } else {
            ownerLineParts.push("Territorio Neutral");
        }
        contentHTML += `<p>${ownerLineParts.join(' | ')}</p>`;
        
        if (hexData.structure) {
            contentHTML += `<p>Estructura: ${STRUCTURE_TYPES[hexData.structure]?.sprite || ''} ${STRUCTURE_TYPES[hexData.structure]?.name || hexData.structure}</p>`;
        } else if (hexData.isCity) {
            contentHTML += `<p><strong>${hexData.isCapital ? 'Capital' : 'Ciudad'}</strong></p>`;
        }
        
        this._domElements.contextualContent.innerHTML = contentHTML;

        this._domElements.contextualInfoPanel.classList.add('is-expanded');
        if (this._domElements.expandPanelBtn) this._domElements.expandPanelBtn.textContent = '▼';
        
        const isPlayerTerritory = hexData.owner === gameState.currentPlayer;
        const isUnitPresent = getUnitOnHex(r, c);
        const canActHere = gameState.currentPhase === 'play' && isPlayerTerritory && !isUnitPresent;

        if (canActHere) {
            const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
            if (playerTechs.includes('ENGINEERING')) {
                if (this._domElements.floatingBuildBtn) this._domElements.floatingBuildBtn.style.display = 'flex';
                hexToBuildOn = {r, c};
            }
            
            const currentStructureInfo = hexData.structure ? STRUCTURE_TYPES[hexData.structure] : null;
            const isRecruitmentPoint = hexData.isCity || hexData.isCapital || (currentStructureInfo && currentStructureInfo.allowsRecruitment);
            
            // Botón Crear División
            if (isRecruitmentPoint && this._domElements.floatingCreateDivisionBtn) {
                this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                // Puede que esta línea de abajo ya esté o no. La añadiremos/aseguraremos.
                hexToBuildOn = {r, c}; 
            }

            if (isRecruitmentPoint) {
                if (this._domElements.floatingCreateDivisionBtn) {
                    this._domElements.floatingCreateDivisionBtn.textContent = '➕';
                    this._domElements.floatingCreateDivisionBtn.title = 'Crear División';
                    this._domElements.floatingCreateDivisionBtn.style.display = 'flex';
                }
            }
        }
        
        const setCapitalBtn = this._domElements.setAsCapitalBtn;
        if(setCapitalBtn) {
            const isEligibleCity = hexData.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexData.structure);
            if(isPlayerTerritory && isEligibleCity && !hexData.isCapital) {
                 setCapitalBtn.style.display = 'block';
            }
        }

        this._domElements.contextualInfoPanel.classList.add('visible');
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

    updateTurnIndicatorAndBlocker: function() {
        if (!this._domElements || !gameState || typeof gameState.myPlayerNumber === 'undefined') return;

        const blocker = document.getElementById('turnBlocker');
        const endTurnBtn = this._domElements.floatingEndTurnBtn;
        if (!blocker || !endTurnBtn) return;

        const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;
        
        if (isMyTurn) {
            blocker.style.display = 'none';
            endTurnBtn.disabled = false;
            this.showMessageTemporarily("¡Es tu turno!", 2500);
        } else {
            blocker.style.display = 'flex';
            blocker.textContent = `Esperando al Jugador ${gameState.currentPlayer}...`;
            endTurnBtn.disabled = true;
        }
    },

    /**
     * (NUEVA FUNCIÓN) Borra todas las unidades visuales del tablero y las vuelve a crear
     * desde el array de datos `units`. Es la solución definitiva para problemas de desincronización del DOM.
     */
    renderAllUnitsFromData: function() {
        if (!this._domElements.gameBoard) return;

        console.log(`[RENDER ALL] Iniciando re-dibujado completo de ${units.length} unidades.`);

        // Paso 1: Eliminar todos los divs de unidades existentes.
        this._domElements.gameBoard.querySelectorAll('.unit').forEach(el => el.remove());

        // Paso 2: Volver a crear cada unidad desde la fuente de datos `units`.
        for (const unit of units) {
            // Se recrea el elemento DOM para cada unidad en la lista de datos.
            const unitElement = document.createElement('div');
            unitElement.className = `unit player${unit.player}`;
            unitElement.dataset.id = unit.id;
            
            // Contenedor principal para alinear el contenido dentro del círculo
            const mainContent = document.createElement('div');
            mainContent.style.position = 'relative';
            mainContent.style.display = 'flex';
            mainContent.style.alignItems = 'center';
            mainContent.style.justifyContent = 'center';
            mainContent.style.width = '100%';
            mainContent.style.height = '100%';

            // Lógica HÍBRIDA para el sprite de la unidad (emoji o imagen)
            const unitSpriteValue = unit.sprite || '?';
            if (unitSpriteValue.includes('.') || unitSpriteValue.includes('/')) {
                unitElement.style.backgroundImage = `url('${unitSpriteValue}')`;
            } else {
                unitElement.style.backgroundImage = 'none';
                mainContent.textContent = unitSpriteValue; // El emoji va dentro del contenedor
            }

            unitElement.appendChild(mainContent);

            // <<== INICIO DE LA CORRECCIÓN: Lógica para el estandarte del Comandante ==>>
            if (unit.commander && COMMANDERS[unit.commander]) {
                const commanderData = COMMANDERS[unit.commander];
                const commanderSpriteValue = commanderData.sprite;

                const commanderBanner = document.createElement('span');
                commanderBanner.className = 'commander-banner';
                commanderBanner.innerHTML = ''; // Limpiar cualquier contenido previo

                // Si el sprite del comandante es una ruta de imagen...
                if (commanderSpriteValue.includes('.png') || commanderSpriteValue.includes('.jpg')) {
                    // ...creamos una etiqueta <img>
                    const img = document.createElement('img');
                    img.src = commanderSpriteValue;
                    img.alt = commanderData.name.substring(0, 1);
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.borderRadius = '50%'; // Para que la imagen sea redonda dentro del estandarte
                    commanderBanner.appendChild(img);
                } else {
                    // ...si no, lo tratamos como un emoji (fallback).
                    commanderBanner.textContent = commanderSpriteValue;
                }
                
                mainContent.appendChild(commanderBanner);
            }
            // <<== FIN DE LA CORRECCIÓN ==>>

            // Añadir el indicador de salud
            const strengthDisplay = document.createElement('div');
            strengthDisplay.className = 'unit-strength';
            strengthDisplay.textContent = unit.currentHealth;
            unitElement.appendChild(strengthDisplay);
            
            // Re-asignamos la nueva referencia y lo añadimos al tablero.
            unit.element = unitElement;

                        // Lo añadimos al tablero.
            this._domElements.gameBoard.appendChild(unitElement);

                        // Y lo posicionamos.
            if (typeof positionUnitElement === 'function') {
                positionUnitElement(unit);
            }
        }
        console.log("[RENDER ALL] Re-dibujado completo finalizado.");
    },

    showRewardToast: function(message, icon = '🏆') {
        if (!this._domElements.gameBoard) return;
        
        const toast = document.createElement('div');
        toast.className = 'reward-toast';
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        // Posicionarlo en el centro horizontal y un poco arriba
        toast.style.left = '50%';
        toast.style.top = '25%';
        toast.style.transform = 'translateX(-50%)'; // Centrarlo correctamente

        this._domElements.gameBoard.appendChild(toast);

        // Se autodestruye cuando termina la animación
        setTimeout(() => {
            toast.remove();
        }, 2500); // La duración de la animación
    },

    showTutorialMessage: function(message) {
        if (!this._tutorialMessagePanel) {
            this._tutorialMessagePanel = document.getElementById('tutorialMessagePanel');
        }
        if (this._tutorialMessagePanel) {
            this._tutorialMessagePanel.innerHTML = message;
            this._tutorialMessagePanel.style.display = 'block';
        }
    },

    hideTutorialMessage: function() {
        if (this._tutorialMessagePanel) {
            this._tutorialMessagePanel.style.display = 'none';
        }
    },

    highlightTutorialElement: function(elementId = null, hexCoords = null) {
        this.clearHighlights(); // Limpia cualquier resaltado previo

        if (elementId) {
            const element = document.getElementById(elementId);
            if (element) {
                element.classList.add('tutorial-highlight');
                this._lastTutorialHighlightElementId = elementId; // Guardamos para poder limpiarlo
            }
        }
        
        if (hexCoords && Array.isArray(hexCoords)) {
             // Si `hexCoords` es una función, la ejecutamos para obtener las coordenadas dinámicas
            const coords = (typeof hexCoords === 'function') ? hexCoords() : hexCoords;
            coords.forEach(coord => {
                const hexData = board[coord.r]?.[coord.c];
                if (hexData?.element) {
                    hexData.element.classList.add('tutorial-highlight-hex');
                }
            });
            this._lastTutorialHighlightHexes = coords;
        }
    }
    
};