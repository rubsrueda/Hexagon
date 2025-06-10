// uiUpdates.js
// Funciones para actualizar la interfaz de usuario.

// Crear un objeto global para contener las funciones de UI
const UIManager = {

    updateAllUIDisplays: function() {
        if (typeof this.updatePlayerAndPhaseInfo === "function") this.updatePlayerAndPhaseInfo();
        else console.warn("UIManager.updatePlayerAndPhaseInfo no está definida.");
        if (typeof updateFogOfWar === "function") updateFogOfWar(); 
        else console.warn("updateFogOfWar (global) no está definida.");
        if (typeof this.updateActionButtonsBasedOnPhase === "function") this.updateActionButtonsBasedOnPhase();
        else console.warn("UIManager.updateActionButtonsBasedOnPhase no está definida.");
    },

    updatePlayerAndPhaseInfo: function() {
        if (!gameState || !gameState.playerResources || !gameState.playerTypes) {
            return;
        }
        if (!floatingMenuTitle) { 
            return;
        }
        let phaseText = "";
        switch (gameState.currentPhase) {
            case "deployment": phaseText = "Despliegue"; break;
            case "play": phaseText = "En Juego"; break;
            case "gameOver": phaseText = "Fin de Partida"; break;
            case "setup": phaseText = "Preparando..."; break;
            default: phaseText = gameState.currentPhase ? gameState.currentPhase.charAt(0).toUpperCase() + gameState.currentPhase.slice(1) : "-";
        }
        const playerTypeForDisplay = gameState.playerTypes[`player${gameState.currentPlayer}`] === 'human' ?
            'Humano' :
            `IA (${gameState.playerAiLevels?.[`player${gameState.currentPlayer}`] || 'Normal'})`;

        floatingMenuTitle.innerHTML = `Fase: ${phaseText}<br>Turno <span id="turnNumberDisplay_float_val">${gameState.turnNumber}</span> - Jugador <span id="currentPlayerDisplay_float_val">${gameState.currentPlayer}</span> (${playerTypeForDisplay})`;

        const currentResources = gameState.playerResources[gameState.currentPlayer];
        const resourceValueSpans = document.querySelectorAll('#playerResourcesGrid_float .resource-values span[data-resource]');
        if (currentResources && resourceValueSpans.length > 0) {
            resourceValueSpans.forEach(span => {
                const resourceType = span.dataset.resource;
                if (resourceType === "researchPoints" || currentResources[resourceType] !== undefined) {
                    span.textContent = currentResources[resourceType] || 0;
                }
            });
        } else if (resourceValueSpans.length > 0) {
            resourceValueSpans.forEach(span => { span.textContent = 0; });
        }
    },

    showMessageTemporarily: function(message, duration = 3000, isError = false) {
        // console.log() para logs de depuración, siempre es bueno tenerlo
        console.log(`[Mensaje UI Temporario] ${isError ? 'ERROR: ' : ''}${message}`);

        if (!gameMessagesMobile || !gameMessagesMobile.querySelector('p')) { 
            console.warn("UIManager.showMessageTemporarily: Elemento gameMessagesMobile o su párrafo no encontrado.");
            return;
        }
    
            const messageParagraph = gameMessagesMobile.querySelector('p');
            messageParagraph.textContent = message;
        
            if (isError) {
                gameMessagesMobile.style.backgroundColor = "rgba(200, 0, 0, 0.8)"; 
            } else {
                gameMessagesMobile.style.backgroundColor = "rgba(0, 0, 0, 0.7)"; 
            }
        
            if (gameMessagesMobile.hideTimeout) { clearTimeout(gameMessagesMobile.hideTimeout); }
            gameMessagesMobile.classList.remove('visible');
            void gameMessagesMobile.offsetHeight; 
            gameMessagesMobile.classList.add('visible');
        
            gameMessagesMobile.hideTimeout = setTimeout(() => {
                gameMessagesMobile.classList.remove('visible');
                gameMessagesMobile.hideTimeout = null;
            }, duration);
    },
    
    updateActionButtonsBasedOnPhase: function() {
        if (!gameState) return;
        const isDeployment = gameState.currentPhase === "deployment";
        const isPlay = gameState.currentPhase === "play";
        const isGameOver = gameState.currentPhase === "gameOver";

        if (floatingTechTreeBtn) { 
            floatingTechTreeBtn.style.display = isPlay ? 'flex' : 'none';
            floatingTechTreeBtn.disabled = !isPlay;
        } else {
            console.warn("[updateActionButtons] floatingTechTreeBtn no encontrado en UIManager.");
        }

        // === INICIO: BLOQUE CORREGIDO para floatingCreateDivisionBtn (Simplificado) ===
        if (floatingCreateDivisionBtn) {
            let canShowButton = false; 
            let isButtonEnabled = false; 

            // El botón de crear unidad (➕) solo es visible y habilitado si:
            // 1. Es la fase de DESPLIEGUE.
            // 2. El JUGADOR ACTUAL es HUMANO.
            // 3. El jugador aún puede desplegar unidades (no ha alcanzado el límite).
            if (isDeployment && gameState.playerTypes[`player${gameState.currentPlayer}`] === 'human') {
                if (gameState.unitsPlacedByPlayer && gameState.deploymentUnitLimit !== undefined) {
                    canShowButton = gameState.unitsPlacedByPlayer[gameState.currentPlayer] < gameState.deploymentUnitLimit;
                    isButtonEnabled = canShowButton; 
                } else {
                    // Si el límite de despliegue no está definido (algo inesperado), se asume que puede desplegar.
                    // Esto debería ser un caso muy raro si el juego se inicializa correctamente.
                    canShowButton = true;
                    isButtonEnabled = true;
                }
            }
            // En cualquier otra fase (Play, GameOver) o si el jugador actual es la IA, el botón estará oculto y deshabilitado.

            floatingCreateDivisionBtn.style.display = canShowButton ? 'flex' : 'none';
            floatingCreateDivisionBtn.disabled = !isButtonEnabled;
        }
        // === FIN: BLOQUE CORREGIDO para floatingCreateDivisionBtn ===

        if (floatingEndTurnBtn) floatingEndTurnBtn.disabled = !(isDeployment || isPlay);
        if (concedeBattleBtn_float) concedeBattleBtn_float.disabled = !(isDeployment || isPlay);

        if (isGameOver) {
            if (floatingCreateDivisionBtn) floatingCreateDivisionBtn.disabled = true;
            if (floatingEndTurnBtn) floatingEndTurnBtn.disabled = true;
            if (concedeBattleBtn_float) concedeBattleBtn_float.disabled = true;
            if (contextualActions) contextualActions.innerHTML = '';
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel(); 
        }
    },

    showUnitContextualInfo: function(unit, isOwnUnit = true) {
        if (!contextualInfoPanel || !contextualTitle || !contextualContent || !contextualActions) { 
            console.warn("UIManager: Elementos del panel contextual no encontrados."); 
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
            return; 
        }
        if (!unit) { 
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
            return; 
        }

        const isPlayerUnit = unit.player === gameState.currentPlayer;

        contextualTitle.innerHTML = '';   
        contextualContent.innerHTML = ''; 
        contextualActions.innerHTML = ''; 
        contextualTitle.textContent = `Unidad: ${unit.name}`;

        const nameEditorDiv = document.createElement('div');
        nameEditorDiv.className = 'unit-name-editor-ctx'; 
        nameEditorDiv.style.display = 'flex'; nameEditorDiv.style.alignItems = 'center'; nameEditorDiv.style.marginBottom = '5px';
        const nameLabel = document.createElement('strong'); nameLabel.textContent = 'Nombre:'; nameLabel.style.marginRight = '5px'; nameEditorDiv.appendChild(nameLabel);
        const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'selectedUnitNameInput_ctx'; nameInput.value = unit.name; nameInput.style.flexGrow = '1'; nameInput.style.padding = '3px'; nameInput.readOnly = !isPlayerUnit; nameEditorDiv.appendChild(nameInput);
        
        if (isPlayerUnit) { const saveNameBtn = document.createElement('button'); saveNameBtn.id = 'saveUnitNameBtn_ctx_panel'; saveNameBtn.title = 'Guardar Nombre'; saveNameBtn.className = 'small-btn'; saveNameBtn.textContent = '✔️'; saveNameBtn.style.marginLeft = '5px'; saveNameBtn.onclick = () => { const newName = nameInput.value.trim(); if (newName && newName.length > 0 && newName.length <= 30) { unit.name = newName; logMessage(`Nombre cambiado a: ${unit.name}`); contextualTitle.textContent = `Unidad: ${unit.name}`; } else { logMessage("Nombre inválido."); nameInput.value = unit.name; }}; nameInput.onkeypress = (event) => { if (event.key === 'Enter') saveNameBtn.click(); }; nameEditorDiv.appendChild(saveNameBtn); }
        contextualContent.appendChild(nameEditorDiv); 
        const typeP = document.createElement('p'); const mainRegimentType = unit.regiments && unit.regiments.length > 0 ? unit.regiments[0].type : 'Desconocido'; const mainRegimentData = (typeof REGIMENT_TYPES !== 'undefined') ? REGIMENT_TYPES[mainRegimentType] : null; typeP.textContent = `Tipo: ${mainRegimentData?.displayName || mainRegimentType}`; contextualContent.appendChild(typeP);
        const statsP = document.createElement('p'); statsP.textContent = `A/D/M/I: ${unit.attack}/${unit.defense}/${unit.currentMovement || unit.movement}/${unit.initiative || '-'}`; contextualContent.appendChild(statsP);
        const healthP = document.createElement('p'); healthP.textContent = `Salud: ${unit.currentHealth}/${unit.maxHealth}`; contextualContent.appendChild(healthP);
        const expP = document.createElement('p'); let xpForDisplay = "Max"; if (typeof XP_LEVELS !== 'undefined' && XP_LEVELS && unit.level !== undefined) { const currentLevelIndex = unit.level; if (currentLevelIndex < XP_LEVELS.length - 1) { const nextLevelData = XP_LEVELS[currentLevelIndex + 1]; if (nextLevelData && typeof nextLevelData.nextLevelXp === 'number') { xpForDisplay = nextLevelData.nextLevelXp; } else if (XP_LEVELS[currentLevelIndex]?.nextLevelXp === 'Max') { xpForDisplay = 'Max'; } } else if (XP_LEVELS[currentLevelIndex]?.nextLevelXp === 'Max') { xpForDisplay = 'Max'; } } expP.textContent = `EXP: ${unit.experience || 0} / ${xpForDisplay}`; contextualContent.appendChild(expP);
        if (!isPlayerUnit) { const enemyMsgP = document.createElement('p'); enemyMsgP.style.color = '#ff8c8c'; enemyMsgP.style.textAlign = 'center'; enemyMsgP.style.marginTop = '5px'; enemyMsgP.style.fontWeight = 'bold'; enemyMsgP.textContent = 'Unidad Enemiga'; contextualContent.appendChild(enemyMsgP); }

        contextualActions.innerHTML = ''; 
        
        if (isPlayerUnit && gameState.currentPhase === 'play') {
            let canShowReinforceButton = false;
            let minCostToReinforceForDisplay = 0;

            if (unit.currentHealth < unit.maxHealth && !unit.hasMoved && !unit.hasAttacked) {
                if (typeof isHexSupplied === "function" && isHexSupplied(unit.r, unit.c, unit.player)) {
                    let baseUnitCostOro = 20; 
                    if (unit.regiments && unit.regiments.length > 0 && typeof REGIMENT_TYPES !== 'undefined') {
                        const mainRegimentTypeKey = unit.regiments[0].type;
                        if (REGIMENT_TYPES[mainRegimentTypeKey] && REGIMENT_TYPES[mainRegimentTypeKey].cost) {
                            baseUnitCostOro = REGIMENT_TYPES[mainRegimentTypeKey].cost.oro || baseUnitCostOro;
                        }
                    } else if (unit.cost && unit.cost.oro) { 
                        baseUnitCostOro = unit.cost.oro;
                    }
                    const healthToRestorePreview = unit.maxHealth - unit.currentHealth;
                    const costFactorForFullHealPreview = 0.3; 
                    minCostToReinforceForDisplay = Math.ceil(baseUnitCostOro * costFactorForFullHealPreview * (healthToRestorePreview / unit.maxHealth));
                    minCostToReinforceForDisplay = Math.max(1, minCostToReinforceForDisplay);

                    if (gameState.playerResources[gameState.currentPlayer].oro >= minCostToReinforceForDisplay) {
                        canShowReinforceButton = true;
                    }
                }
            }

            console.log(`[DEBUG UIManager.showUnitInfo - Botones] Chequeo para botón REFORZAR para ${unit.name}: puedeMostrar=${canShowReinforceButton}, CostoDisplay=${minCostToReinforceForDisplay}`);
            if (canShowReinforceButton) {
                const reinforceBtnCtx = document.createElement('button');
                reinforceBtnCtx.textContent = `Reforzar (${minCostToReinforceForDisplay} Oro)`;
                reinforceBtnCtx.onclick = () => { 
                    if (typeof handleReinforceUnitAction === "function") handleReinforceUnitAction(unit); 
                };
                contextualActions.appendChild(reinforceBtnCtx);
            }
                
            if (!unit.hasMoved && (unit.currentMovement || 0) > 0) {
                const moveBtn = document.createElement('button');
                moveBtn.textContent = "Mover";
                moveBtn.onclick = () => { if (typeof prepareMove === 'function') prepareMove(unit); };
                contextualActions.appendChild(moveBtn);
            }

            if (!unit.hasAttacked) {
                const attackBtn = document.createElement('button');
                attackBtn.textContent = "Atacar";
                attackBtn.onclick = () => { if (typeof prepareAttack === 'function') prepareAttack(unit); };
                contextualActions.appendChild(attackBtn);
            }

            if (unit.lastMove && !unit.hasAttacked) { // Solo si hubo un último movimiento y no ha atacado después
                const undoMoveBtn = document.createElement('button');
                undoMoveBtn.textContent = "Deshacer Movimiento";
                undoMoveBtn.onclick = () => { 
                    if (typeof undoLastUnitMove === "function") undoLastUnitMove(unit); 
                };
                contextualActions.appendChild(undoMoveBtn);
            }
        }
        
        if (contextualContent.children.length > 0 || contextualActions.children.length > 0) {
            contextualInfoPanel.classList.add('visible');
        } else {
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
        }
    },

    showHexContextualInfo: function(r, c, hexData) {
        if (!contextualInfoPanel || !contextualTitle || !contextualContent || !contextualActions) {
             console.warn("UIManager: Elementos del panel contextual no encontrados.");
             if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
             return;
        }
        if (!hexData) { 
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
            return;
        }
        const unitOnHex = typeof getUnitOnHex === "function" ? getUnitOnHex(r,c) : null;

        contextualTitle.innerHTML = '';   
        contextualContent.innerHTML = ''; 
        contextualActions.innerHTML = ''; 
        contextualTitle.textContent = `Hexágono (${r},${c})`;

        const terrainP = document.createElement('p');
        terrainP.textContent = `Terreno: ${hexData.terrain}`;
        contextualContent.appendChild(terrainP);
        if (hexData.resourceNode && typeof RESOURCE_NODES_DATA !== 'undefined' && RESOURCE_NODES_DATA[hexData.resourceNode]) {
            const resourceP = document.createElement('p');
            resourceP.textContent = `Recurso: ${RESOURCE_NODES_DATA[hexData.resourceNode].name}`;
            contextualContent.appendChild(resourceP);
        }
        if (hexData.isCity) {
            const cityP = document.createElement('p');
            cityP.innerHTML = `<strong>${hexData.isCapital ? 'Capital' : 'Ciudad'}</strong>`;
            contextualContent.appendChild(cityP);
        }
        if (hexData.structure && typeof STRUCTURE_TYPES !== 'undefined' && STRUCTURE_TYPES[hexData.structure]) {
            const structureP = document.createElement('p');
            structureP.textContent = `Estructura: ${hexData.structure} (${STRUCTURE_TYPES[hexData.structure].sprite})`;
            contextualContent.appendChild(structureP);
        }

        contextualActions.innerHTML = '';
        // === INICIO: BLOQUE CORREGIDO para el botón Construir Estructura ===
        if (gameState.currentPhase === 'play' && hexData.owner === gameState.currentPlayer && !unitOnHex) {
            const playerResearchedTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
            
            // Determinar si alguna estructura CONSTRUIBLE está desbloqueada por tecnología.
            let canBuildAnyStructure = false; 

            // Iterar sobre todos los tipos de estructura en el juego
            for (const structureKey in STRUCTURE_TYPES) {
                const structureDef = STRUCTURE_TYPES[structureKey];
                
                // 1. ¿Esta tecnología está desbloqueada?
                let isTechUnlockedForThisStructure = false;
                if (structureKey === "Camino" && playerResearchedTechs.includes("ENGINEERING")) {
                    isTechUnlockedForThisStructure = true;
                } else if (structureKey === "Fortaleza" && playerResearchedTechs.includes("FORTIFICATIONS")) {
                    isTechUnlockedForThisStructure = true;
                }

                if (isTechUnlockedForThisStructure) {
                    // 2. ¿Se puede construir este tipo de estructura en este hexágono específico?
                    let isBuildableOnThisHex = false;
                    if (structureKey === "Camino") {
                        if (structureDef.buildableOn.includes(hexData.terrain) && !hexData.structure) {
                            isBuildableOnThisHex = true;
                        }
                    } else if (structureKey === "Fortaleza") {
                        // Fortaleza requiere Camino y terreno base apto
                        if (hexData.structure === "Camino" && structureDef.buildableOn.includes(hexData.terrain)) {
                            isBuildableOnThisHex = true;
                        }
                    }

                    if (isBuildableOnThisHex) {
                        // Encontró al menos UNA estructura que se puede construir aquí con la tecnología.
                        canBuildAnyStructure = true; 
                        break; // Salir del bucle, ya sabemos que el botón debe aparecer.
                    }
                }
            }
            
            // Mostrar el botón si se puede construir CUALQUIER estructura.
            if (canBuildAnyStructure) {
                const buildBtnCtx = document.createElement('button');
                buildBtnCtx.textContent = "Construir Estructura"; 
                buildBtnCtx.onclick = () => { 
                     hexToBuildOn = { r, c }; 
                    openBuildStructureModal();
                };
                contextualActions.appendChild(buildBtnCtx);
            }
            
            // Botón para crear división si la casilla es de reclutamiento y está vacía
            if (gameState.currentPhase === 'play' && hexData.owner === gameState.currentPlayer && !unitOnHex && (hexData.isCity || hexData.structure === "Fortaleza") ) {
                const createDivCtxBtn = document.createElement('button');
                createDivCtxBtn.textContent = "Crear División Aquí";
                createDivCtxBtn.onclick = () => { 
                     if(typeof placementMode !== 'undefined') placementMode.recruitHex = { r, c };
                     openCreateDivisionModal();
                };
                contextualActions.appendChild(createDivCtxBtn);
            }
        }
        // === FIN: BLOQUE CORREGIDO para el botón Construir Estructura ===
        
        if (contextualContent.children.length > 0 || contextualActions.children.length > 0) {
            contextualInfoPanel.classList.add('visible');
        } else {
            if (typeof this.hideContextualPanel === "function") this.hideContextualPanel();
        }
    },

    hideContextualPanel: function() {
        if (contextualInfoPanel) { 
            contextualInfoPanel.classList.remove('visible');
            setTimeout(() => {
                if (!contextualInfoPanel.classList.contains('visible')) {
                    if (contextualTitle) contextualTitle.innerHTML = ''; 
                    if (contextualContent) contextualContent.innerHTML = '';
                    if (contextualActions) contextualActions.innerHTML = '';
                }
            }, 250); 
        }
    },

    updateSelectedUnitInfoPanel: function() {
        if (selectedUnit && contextualInfoPanel ) {
           this.showUnitContextualInfo(selectedUnit, true);
        } else if (!selectedUnit && contextualInfoPanel && contextualInfoPanel.classList.contains('visible')) {
            // No hacer nada explícito, onHexClick decidirá
        }
    },

    updateUnitStrengthDisplay: function(unit) {
        if (unit && unit.element && unit.element instanceof HTMLElement) {
            const strengthElement = unit.element.querySelector('.unit-strength');
            if (strengthElement) {
                strengthElement.textContent = unit.currentHealth;
                
                if (unit.currentHealth < (unit.maxHealth / 2) && unit.currentHealth > 0) {
                    strengthElement.style.color = 'orange';
                } else if (unit.currentHealth <= 0) {
                    strengthElement.style.color = 'red';
                } else {
                    strengthElement.style.color = ''; 
                }
            } else {
                console.warn(`[UIManager.updateUnitStrengthDisplay] NO se encontró .unit-strength para ${unit.name}. Hijos de unit.element:`, unit.element.innerHTML);
            }
        } else {
            console.warn(`[UIManager.updateUnitStrengthDisplay] Unidad o .element no válido. Unidad:`, JSON.stringify(unit), "Elemento:", unit?.element);
        }
    }


};