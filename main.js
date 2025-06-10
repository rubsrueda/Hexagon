// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
    // --- MODO DE DEPURACIÓN VISUAL ---
    if (typeof VISUAL_DEBUG_MODE !== 'undefined' && VISUAL_DEBUG_MODE) {
        console.clear();
        console.log(`--- DEBUG MODE: Clic en (${r}, ${c}) ---`);

        document.querySelectorAll('.hex.highlight-debug, .hex.highlight-debug-start').forEach(h => {
            h.classList.remove('highlight-debug', 'highlight-debug-start');
        });

        if (board[r]?.[c]?.element) {
            const startHexEl = board[r][c].element;
            startHexEl.classList.add('highlight-debug-start');
            console.log("Hexágono de inicio resaltado en amarillo.");
        }

        const neighbors = getHexNeighbors(r, c);
        console.log(`getHexNeighbors para (${r}, ${c}) devuelve:`, JSON.parse(JSON.stringify(neighbors)));

        neighbors.forEach(n => {
            const hexEl = board[n.r]?.[n.c]?.element;
            if (hexEl) {
                hexEl.classList.add('highlight-debug');
            } else {
                console.warn(`Vecino inválido o sin elemento: (${n.r}, ${n.c})`);
            }
        });
        console.log(`${neighbors.length} vecinos resaltados en cian.`);
        return; 
    }
    // --- FIN DEL MODO DE DEPURACIÓN ---

    // --- LÓGICA NORMAL DEL JUEGO ---
    console.log(`%cON_HEX_CLICK: (${r},${c}) - Fase: ${gameState?.currentPhase || 'N/A'}, Selected: ${selectedUnit?.name || 'null'}`, "color: blue;");

    if (gameState?.justPanned) return;
    if (placementMode.active) {
        if (typeof handlePlacementModeClick === "function") handlePlacementModeClick(r, c);
        return;
    }
    if (!gameState || gameState.currentPhase === "gameOver") {
        logMessage("La partida ya ha terminado.");
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        return;
    }
    const hexDataClicked = board[r]?.[c];
    if (!hexDataClicked) return;
    if (gameState.currentPhase === "play" && hexDataClicked.visibility?.[`player${gameState.currentPlayer}`] === 'hidden') {
        logMessage("Hexágono oculto por niebla de guerra.");
        if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) UIManager.hideContextualPanel();
        return;
    }

    const clickedUnitObject = typeof getUnitOnHex === "function" ? getUnitOnHex(r, c) : null;
    let actionTaken = false;

    if (selectedUnit) {
        actionTaken = typeof handleActionWithSelectedUnit === "function" ?
            handleActionWithSelectedUnit(r, c, clickedUnitObject) : false;
        
        if (!actionTaken) {
            if (clickedUnitObject && clickedUnitObject.id !== selectedUnit.id) {
                selectUnit(clickedUnitObject);
            } else if (!clickedUnitObject) {
                deselectUnit();
            }
        }
    } else {
        if (clickedUnitObject) {
            selectUnit(clickedUnitObject);
        }
    }

    if (selectedUnit) {
        UIManager.showUnitContextualInfo(selectedUnit, selectedUnit.player === gameState.currentPlayer);
    } else if (clickedUnitObject) {
        UIManager.showUnitContextualInfo(clickedUnitObject, false);
    } else {
        UIManager.showHexContextualInfo(r, c, hexDataClicked);
    }

    console.log(`%cON_HEX_CLICK_FIN: selectedUnit final: ${selectedUnit?.name || 'null'}`, "color: blue;");
}

function initApp() {
    console.log("main.js: DOMContentLoaded -> initApp INICIADO.");

    // 1. Inicializar elementos DOM (asegurarse de que existan)
    if (typeof initializeDomElements === "function") {
        initializeDomElements();
        console.log("main.js: initializeDomElements() llamado.");
        // Lógica de Player1 AI Level
        if (player1TypeSelect && player1AiLevelDiv) {
            if (player1TypeSelect.value.startsWith('ai_')) { player1AiLevelDiv.style.display = 'block'; } else { player1AiLevelDiv.style.display = 'none'; }
            player1TypeSelect.addEventListener('change', () => { if (player1TypeSelect.value.startsWith('ai_')) { player1AiLevelDiv.style.display = 'block'; } else { player1AiLevelDiv.style.display = 'none'; } });
        }
        // Lógica de Player2 AI Level (ya simplificada en HTML)
        if (player2TypeSelect) { 
            // No hay lógica de display para player2AiLevelDiv aquí ya que se eliminó del HTML
        }
    } else {
        console.error("CRITICAL MAIN INIT ERROR: initializeDomElements no definida..."); return;
    }

    // 2. Añadir listeners generales de modales (de modalLogic.js)
    // Esto incluye los listeners para los botones de cerrar modales, etc.
    if (typeof addModalEventListeners === "function") { addModalEventListeners(); console.log("main.js: addModalEventListeners() llamado."); } else { console.warn("main.js: addModalEventListeners no está definida (de modalLogic.js)."); }
    
    // 3. Añadir listeners del menú principal (campaña/escaramuza de campaignManager.js)
    if (typeof setupMainMenuListeners === "function") { setupMainMenuListeners(); console.log("main.js: setupMainMenuListeners() llamado."); } else { console.warn("main.js: setupMainMenuListeners no está definida (de campaignManager.js)."); }

    // 4. Listener para el botón 'Empezar Juego' (Escaramuza)
    if (startGameBtn) {
        startGameBtn.addEventListener('click', () => {
            console.log("main.js: Botón 'Empezar Juego (Escaramuza)' clickeado.");
            resetGameStateVariables(); 
            gameState.isCampaignBattle = false; gameState.currentScenarioData = null; gameState.currentMapData = null;

            // Configurar tipos de jugador y niveles de IA
            gameState.playerTypes.player1 = player1TypeSelect.value; 
            if (player1TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player1 = player1TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player1')) { delete gameState.playerAiLevels.player1; } }
            gameState.playerTypes.player2 = player2TypeSelect.value;
            if (player2TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player2 = player2TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player2')) { delete gameState.playerAiLevels.player2; } }

            const selectedInitialUnits = initialUnitsCountSelect.value; gameState.deploymentUnitLimit = selectedInitialUnits === "unlimited" ? Infinity : parseInt(selectedInitialUnits);
            
            console.log("Iniciando Partida Rápida (Escaramuza):", "P1:", gameState.playerTypes.player1, gameState.playerAiLevels?.player1 || "", "P2:", gameState.playerTypes.player2, gameState.playerAiLevels?.player2 || "");

            // Transición de UI y preparación del tablero
            if (typeof showScreen === "function" && typeof gameContainer !== 'undefined') { showScreen(gameContainer); } else { if (typeof setupScreen !== 'undefined') setupScreen.style.display = 'none'; if (typeof gameContainer !== 'undefined') gameContainer.style.display = 'flex'; console.warn("main.js: showScreen no definida o gameContainer no disponible, usando fallback de display."); }
            gameState.currentPhase = "deployment";

            console.log("MAIN.JS --- DEBUG ---> ANTES de llamar a initializeNewGameBoardDOMAndData");
            if (typeof initializeNewGameBoardDOMAndData === "function") { const selectedResourceLevel = resourceLevelSelect.value; const selectedBoardSize = boardSizeSelect.value; initializeNewGameBoardDOMAndData(selectedResourceLevel, selectedBoardSize); console.log("MAIN.JS --- DEBUG ---> DESPUÉS de llamar a initializeNewGameBoardDOMAndData (si fue función)"); } else { console.error("CRITICAL: initializeNewGameBoardDOMAndData NO es una función."); console.log("MAIN.JS --- DEBUG ---> initializeNewGameBoardDOMAndData NO FUE UNA FUNCION"); }

            // Actualizaciones de UI y poblar regimientos para el modal
            if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === 'function') { UIManager.updateAllUIDisplays(); } else { console.warn("main.js: UIManager.updateAllUIDisplays no definida."); }
            // populateAvailableRegimentsForModal se llama desde openCreateDivisionModal, no es necesario aquí.
            // if (typeof populateAvailableRegimentsForModal === "function") { populateAvailableRegimentsForModal(); } else { console.error("CRITICAL: populateAvailableRegimentsForModal no definida."); }
            
            logMessage(`Fase de Despliegue. Jugador 1 (Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit}).`);
        });
    } else { console.warn("main.js: startGameBtn no encontrado."); }

    // 5. Listeners para botones flotantes y acciones de juego (Fin Turno, Menú, etc.)
    if (floatingEndTurnBtn) { floatingEndTurnBtn.addEventListener('click', () => { if (typeof handleEndTurn === "function") handleEndTurn(); else console.error("main.js Error: handleEndTurn no definida."); }); } else { console.warn("main.js: floatingEndTurnBtn no encontrado."); }
    if (floatingMenuBtn && floatingMenuPanel) { floatingMenuBtn.addEventListener('click', () => { const isVisible = floatingMenuPanel.style.display === 'block' || floatingMenuPanel.style.display === 'flex'; floatingMenuPanel.style.display = isVisible ? 'none' : 'block'; if (!isVisible && typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === "function") { UIManager.updatePlayerAndPhaseInfo(); } if (isVisible && typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel(); }); } else { console.warn("main.js: floatingMenuBtn o floatingMenuPanel no encontrado."); }
    if (closeContextualPanelBtn && contextualInfoPanel) { closeContextualPanelBtn.addEventListener('click', () => { if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel(); else if (contextualInfoPanel) contextualInfoPanel.style.display = 'none'; }); } else { console.warn("main.js: closeContextualPanelBtn o contextualInfoPanel no encontrado."); }
    if (saveGameBtn_float) { saveGameBtn_float.addEventListener('click', () => { if (typeof handleSaveGame === "function") handleSaveGame(); else console.error("main.js Error: handleSaveGame no definida."); }); }
    if (loadGameInput_float) { loadGameInput_float.addEventListener('click', (event) => { event.target.value = null; }); loadGameInput_float.addEventListener('change', (event) => { if (typeof handleLoadGame === "function") handleLoadGame(event); else console.error("main.js Error: handleLoadGame no definida.");}); }
    if (concedeBattleBtn_float) { concedeBattleBtn_float.addEventListener('click', () => { logMessage("Batalla concedida."); if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') { campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); } else { gameState.currentPhase = "gameOver"; if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") UIManager.updateAllUIDisplays(); alert("Has concedido la escaramuza."); if (typeof showScreen === "function" && mainMenuScreenEl) showScreen(mainMenuScreenEl); } }); }
    if (backToMainFromBattleBtn) { backToMainFromBattleBtn.addEventListener('click', () => { if (confirm("¿Seguro que quiere salir y volver al menú principal? El progreso de esta batalla no se guardará.")) { if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel(); if (floatingMenuPanel) floatingMenuPanel.style.display = 'none'; if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === "function") { campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); } else { gameState.currentPhase = "gameOver"; if (typeof showScreen === "function" && mainMenuScreenEl) showScreen(mainMenuScreenEl); } } }); }

    // Listener para ABRIR el modal de crear división (desde el botón flotante)
    if (floatingCreateDivisionBtn) {
        floatingCreateDivisionBtn.addEventListener('click', () => {
            console.log("%c[DEBUG BOTÓN CREAR - CLICK DETECTADO]", "background: #222; color: #bada55; font-size: 1.2em;"); 

            // === CAMBIO CLAVE: Ahora solo llama a openCreateDivisionModal ===
            // openCreateDivisionModal ahora gestiona la llamada a openCreateDivisionModalVisual
            if (typeof openCreateDivisionModal === "function") {
                openCreateDivisionModal(); 
                console.log(`[DEBUG BOTÓN CREAR] openCreateDivisionModal fue llamada.`);
            } else {
                console.error("CRÍTICO: openCreateDivisionModal no está definida.");
            }
            // Ocultar el menú flotante si estaba abierto (tu lógica original)
            if (floatingMenuPanel) floatingMenuPanel.style.display = 'none';
            // ===============================================================
        });
    }

    // Listener para Tecnología
    if (floatingTechTreeBtn) {
        floatingTechTreeBtn.addEventListener('click', () => {
            if (typeof openTechTreeScreen === "function") {
                openTechTreeScreen();
                if (floatingMenuPanel && floatingMenuPanel.style.display !== 'none') {
                    floatingMenuPanel.style.display = 'none';
                }
                if (contextualInfoPanel && contextualInfoPanel.classList.contains('visible')) {
                    if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) {
                        UIManager.hideContextualPanel();
                    }
                }
            } else {
                console.error("main.js: La función openTechTreeScreen no está definida.");
                alert("La pantalla de tecnologías aún no está disponible.");
            }
        });
    } else { console.warn("main.js: floatingTechTreeBtn no encontrado, no se pudo añadir listener."); }

    // 6. Lógica de Bienvenida / Ayuda al inicio de la aplicación
    if (typeof showWelcomeHelpModal === "function") {
        showWelcomeHelpModal(); // Llama a la función para mostrar el modal de bienvenida
    } else {
        console.error("main.js: showWelcomeHelpModal no está definida. Mostrando menú principal por defecto.");
        // Fallback: mostrar el menú principal si no hay modal de ayuda.
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl);
        } else {
            console.error("main.js: showScreen (de campaignManager) o mainMenuScreenEl no disponibles para fallback.");
            if (setupScreen) setupScreen.style.display = 'flex';
        }
        logMessage("Bienvenido a Hex General Evolved.");
    }
    
    console.log("main.js: initApp() FINALIZADO.");
}

document.addEventListener('DOMContentLoaded', initApp);