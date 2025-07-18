// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
    // --- ESTA ES LA CORRECCIÓN MÁS IMPORTANTE ---
    // El "Guardia de Seguridad" que comprueba el modo de colocación ANTES que nada.
    if (placementMode.active) {
        // Si estamos en modo colocación, delegamos toda la lógica a esta función
        // y nos detenemos inmediatamente con 'return'.
        if (typeof handlePlacementModeClick === "function") {
            handlePlacementModeClick(r, c);
        } else {
            console.error("Error crítico: handlePlacementModeClick no está definido.");
        }
        return; 
    }
    // --- FIN DE LA CORRECCIÓN ---

    // El resto de verificaciones (paneo, fin de partida) se mantienen.
    if (gameState?.justPanned || !gameState || gameState.currentPhase === "gameOver") {
        if (gameState) gameState.justPanned = false;
        return;
    }
    
    const hexDataClicked = board[r]?.[c];
    if (!hexDataClicked) return;
    
    const clickedUnit = getUnitOnHex(r, c);

    // El resto del código que maneja la selección y acciones normales, que ya habíamos arreglado, se mantiene.
    if (selectedUnit) {
        const actionTaken = handleActionWithSelectedUnit(r, c, clickedUnit);
        if (!actionTaken) {
            deselectUnit();
            if (clickedUnit) {
                selectUnit(clickedUnit);
                UIManager.showUnitContextualInfo(clickedUnit, clickedUnit.player === gameState.currentPlayer);
            } else {
                UIManager.showHexContextualInfo(r, c, hexDataClicked);
            }
        }
    } else { 
        if (clickedUnit) {
            selectUnit(clickedUnit);
            UIManager.showUnitContextualInfo(clickedUnit, clickedUnit.player === gameState.currentPlayer);
        } else {
            UIManager.showHexContextualInfo(r, c, hexDataClicked);
        }
    }
}

function initApp() {
    console.log("main.js: DOMContentLoaded -> initApp INICIADO.");

    if (typeof domElements === 'undefined' || !domElements.domElementsInitialized) {
         console.error("main.js: CRÍTICO: domElements no está definido o no se ha inicializado completamente. Abortando initApp.");
         return;
    }
     console.log("main.js: domElements está definido e inicializado.", domElements);

    if (typeof addModalEventListeners === "function") { 
         addModalEventListeners(); 
    } else { 
        console.error("main.js: CRÍTICO: addModalEventListeners no está definida (de modalLogic.js). Modales no funcionarán correctamente."); 
    }
    
    if (typeof UIManager !== 'undefined' && UIManager && typeof UIManager.setDomElements === 'function') {
        UIManager.setDomElements(domElements); 
    } else {
        console.error("main.js: CRÍTICO: UIManager o UIManager.setDomElements no definido.");
    }

    if (typeof setupMainMenuListeners === "function") { 
         setupMainMenuListeners(); 
    } else { 
        console.error("main.js: CRÍTICO: setupMainMenuListeners no está definida (de campaignManager.js). Menús no funcionarán."); 
    }

    // --- LÓGICA DEL LOBBY MULTIJUGADOR EN RED LOCAL ---
    
    // Función que se ejecuta cuando nos conectamos con éxito a otro jugador
    function onConexionLANEstablecida(idRemoto) {
        if (!domElements.lanStatusEl || !domElements.lanPlayerListEl || !domElements.lanRemoteIdInput || !domElements.lanConnectBtn) return;
        
        domElements.lanStatusEl.textContent = 'Conectado';
        domElements.lanStatusEl.className = 'status conectado';
        
        // El anfitrión siempre es Jugador 1, el que se une es Jugador 2
        domElements.lanPlayerListEl.innerHTML = NetworkManager.esAnfitrion ? 
            `<li>J1: Tú (${NetworkManager.miId})</li><li>J2: ${idRemoto}</li>` : 
            `<li>J1: ${idRemoto}</li><li>J2: Tú (${NetworkManager.miId})</li>`;

        // Deshabilitar la opción de unirse una vez conectado
        domElements.lanRemoteIdInput.disabled = true;
        domElements.lanConnectBtn.disabled = true;
        
        // Si somos el anfitrión, mostramos el panel de opciones
        if (NetworkManager.esAnfitrion) {
            const optionsContainer = domElements.skirmishOptionsContainer;
            const placeholder = domElements.lanSkirmishOptionsPlaceholder;
            const gameStartPanel = document.getElementById('lan-game-options-host');

            if (optionsContainer && placeholder) {
                 placeholder.appendChild(optionsContainer); // Movemos las opciones al lobby
            }
            if (gameStartPanel) {
                gameStartPanel.style.display = 'block';
            }
        }
    }
    
    // Función que se ejecuta cuando recibimos datos del otro jugador
    function onDatosLANRecibidos(datos) {
        // Log para depuración, mostrando el paquete de datos crudo recibido.
        // --- CÓDIGO AÑADIDO (Función original vacía) ---
        console.log("%c[Receptor de Red] Datos recibidos:", "background: #28a745; color: white;", datos);

        const isNetworkGame = NetworkManager.conn && NetworkManager.conn.open;
        if (!isNetworkGame) return; // Si no hay conexión, ignorar

        // --- LÓGICA AÑADIDA PARA GESTIONAR LA AUTORIDAD DEL ANFITRIÓN ---
        if (NetworkManager.esAnfitrion) {
            // -- SOY EL ANFITRIÓN: PROCESO PETICIONES DEL CLIENTE --
            if (datos.type === 'actionRequest') {
                console.log("[Red - Anfitrión] Petición de acción recibida del Cliente:", datos.action);
                const action = datos.action;
                const fromPlayerId = 2; // El cliente siempre es el jugador 2

                // Se comprueba si el que pide la acción es el jugador activo
                if (gameState.currentPlayer !== fromPlayerId) {
                     console.warn(`[Red - Anfitrión] Acción RECHAZADA de J${fromPlayerId}. No es su turno (Turno actual: J${gameState.currentPlayer}).`);
                     return;
                }

                // Router de acciones solicitadas por el cliente
                switch (action.type) {
                    case 'placeUnit':
                        if (gameState.currentPhase === 'deployment') {
                             console.log("[Red - Anfitrión] Petición 'placeUnit' validada. Ejecutando y retransmitiendo...");
                             placeFinalizedDivision(action.payload.unitData, action.payload.r, action.payload.c);
                             // Añadimos el 'playerId' que realizó la acción para la retransmisión
                             action.payload.playerId = fromPlayerId; 
                             NetworkManager.enviarDatos({ type: 'actionBroadcast', action: action });
                             UIManager.updateAllUIDisplays();
                        } else {
                            console.warn("[Red - Anfitrión] Petición 'placeUnit' del cliente RECHAZADA (No es fase de despliegue).");
                        }
                        break;
                    case 'endTurn':
                        if (gameState.currentPlayer === clientId) {
                             console.log("[Red - Anfitrión] Petición 'endTurn' validada. Procesando fin de turno...");
                         executeEndOfTurnLogic(fromPlayerId);
                        break;
                    // Aquí se añadirían más casos para mover, atacar, etc.
                }
            }
        } else {
            // -- SOY EL CLIENTE: PROCESO INSTRUCCIONES DEL ANFITRIÓN --
            if (datos.type === 'initialGameSetup') {
                console.log("[Receptor de Red - Cliente] Recibido 'initialGameSetup'. Construyendo juego...");
                const data = datos.payload;
            Object.assign(gameState, data.gameState);
            board = data.board;
            units = data.units;
            unitIdCounter = data.unitIdCounter;

            // Reconstruimos la representación visual (DOM) del tablero.
            domElements.gameBoard.innerHTML = '';
            const boardSize = { rows: data.board.length, cols: data.board[0].length };
            domElements.gameBoard.style.width = `${boardSize.cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
            domElements.gameBoard.style.height = `${boardSize.rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

            for (let r = 0; r < boardSize.rows; r++) {
                for (let c = 0; c < boardSize.cols; c++) {
                    const hexElement = createHexDOMElementWithListener(r, c);
                    domElements.gameBoard.appendChild(hexElement);
                    board[r][c].element = hexElement;
                }
            }
            
            // Re-creamos los elementos de las unidades que llegaron sin la propiedad 'element'.
            units.forEach(unit => {
                const unitElement = document.createElement('div');
                unitElement.classList.add('unit', `player${unit.player}`);
                unitElement.textContent = unit.sprite;
                unitElement.dataset.id = unit.id;
                const strengthDisplay = document.createElement('div');
                strengthDisplay.classList.add('unit-strength');
                unitElement.appendChild(strengthDisplay);
                domElements.gameBoard.appendChild(unitElement);
                unit.element = unitElement; // Enlazamos el nuevo elemento DOM a nuestros datos.
            });

            // Sincronizamos completamente la UI.
            initializeBoardPanning();
            renderFullBoardVisualState();
            UIManager.updateAllUIDisplays();
                logMessage("Partida sincronizada con el anfitrión.");
            }
        }
        
        // --- LÓGICA COMÚN A AMBOS (Procesar retransmisiones del anfitrión) ---
        if (datos.type === 'actionBroadcast') {
            const action = datos.action;
            const actionOriginPlayer = action.payload.playerId;
            console.log(`[Receptor de Red] Recibida retransmisión de acción de J${actionOriginPlayer}:`, action.type);

            // Evitamos que el anfitrión ejecute visualmente una acción que él mismo originó y ya procesó.
            if (NetworkManager.esAnfitrion && actionOriginPlayer === gameState.myPlayerNumber) {
                console.log("[Receptor de Red - Anfitrión] Ignorando auto-retransmisión de mi propia acción.");
                return;
            }

                switch(action.type) {
                    case 'placeUnit':
                        // Cliente: coloca visualmente la unidad donde el anfitrión dijo.
                        placeFinalizedDivision(action.payload.unitData, action.payload.r, action.payload.c);
                        UIManager.updateAllUIDisplays();
                break;
                    case 'endTurn':
                        // Cliente: actualiza su estado local con los datos del anfitrión.
                        gameState.currentPlayer = action.payload.nextPlayer;
                        gameState.turnNumber = action.payload.turnNumber;
                        resetUnitsForNewTurn(gameState.currentPlayer);
                        if (gameState.currentPlayer === gameState.myPlayerNumber) {
                           logMessage("¡Es tu turno!");
                           if(domElements.endTurnBtn) domElements.endTurnBtn.disabled = false;
                        } else {
                           logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);
                        }
                        UIManager.updateAllUIDisplays();
                        break;
                    // Aquí irían los casos para mover, atacar, etc. para el cliente
                }
            }
        }

        // --- Lógica del Switch original para 'startGame' ---
        if(datos.type === 'startGame' && !NetworkManager.esAnfitrion) {
             if (NetworkManager.esAnfitrion) return;
             logMessage("¡El anfitrión ha iniciado la partida! Preparando tablero...");
             iniciarPartidaLAN(datos.settings);
        }
    }

    function onConexionLANCerrada() {
         if (!domElements.lanStatusEl || !domElements.lanPlayerListEl || !domElements.lanRemoteIdInput || !domElements.lanConnectBtn) return;
        domElements.lanStatusEl.textContent = 'Desconectado';
        domElements.lanStatusEl.className = 'status desconectado';
        domElements.lanPlayerListEl.innerHTML = `<li>Tú (${NetworkManager.miId})</li>`;
        document.getElementById('lan-game-options-host').style.display = 'none';

        // Habilitar de nuevo la opción de unirse
        domElements.lanRemoteIdInput.disabled = false;
        domElements.lanConnectBtn.disabled = false;
        
        if (gameState.currentPhase !== "setup" && gameState.currentPhase !== "mainMenu") {
            alert("El otro jugador se ha desconectado. La partida ha finalizado.");
            showScreen(domElements.mainMenuScreenEl);
        }
    }

    // Botón para ir a la pantalla del Lobby LAN
    if (domElements.startLanModeBtn) {
        domElements.startLanModeBtn.addEventListener('click', () => {
            showScreen(domElements.lanLobbyScreen);
            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            
            // Iniciamos como anfitrión por defecto, esperando que alguien se una.
            NetworkManager.iniciarAnfitrion((idGenerado) => {
                if(domElements.lanRoomIdEl) domElements.lanRoomIdEl.textContent = idGenerado;
                if(domElements.lanPlayerListEl) domElements.lanPlayerListEl.innerHTML = `<li>J1: Tú (${idGenerado})</li>`;
            });
        });
    }

    // Botón para unirse a la sala de otro
    if (domElements.lanConnectBtn) {
        domElements.lanConnectBtn.addEventListener('click', () => {
            const idAnfitrion = domElements.lanRemoteIdInput.value;
            if (idAnfitrion) {
                NetworkManager.desconectar(); // Primero nos desconectamos de nuestra sesión de anfitrión
                NetworkManager.unirseAPartida(idAnfitrion);
            } else {
                alert("Por favor, introduce el ID de la sala del anfitrión.");
            }
        });
    }

    // Botón para copiar el ID de la sala
    if(domElements.lanCopyIdBtn){
        domElements.lanCopyIdBtn.addEventListener('click', () => {
            if(NetworkManager.miId){
                navigator.clipboard.writeText(NetworkManager.miId).then(() => {
                    alert('ID de la sala copiado al portapapeles');
                });
            }
        });
    }
    
    // Botón para volver al menú principal desde el lobby
    if (domElements.backToMainMenuBtn_fromLan) {
        domElements.backToMainMenuBtn_fromLan.addEventListener('click', () => {
            NetworkManager.desconectar();
            
            // Devolver las opciones de skirmish a su lugar original
            const optionsContainer = domElements.skirmishOptionsContainer;
            const originalParent = domElements.setupScreen.querySelector('.modal-content');
            if(optionsContainer && originalParent && !originalParent.contains(optionsContainer)){
                originalParent.insertBefore(optionsContainer, domElements.startGameBtn);
            }
            
            showScreen(domElements.mainMenuScreenEl);
        });
    }
    
    if (domElements.lanStartGameBtn) {
        domElements.lanStartGameBtn.addEventListener('click', () => {
            if (!NetworkManager.conn || !NetworkManager.conn.open) {
                alert("Error: No hay otro jugador conectado para iniciar la partida.");
                return;
            }
            
            console.log("[LAN Anfitrión] Botón 'Comenzar Partida' pulsado. Recopilando opciones...");
            
            // 1. Recopilar toda la configuración de la partida desde los elementos de la UI
            const gameSettings = {
                playerTypes: {
                    player1: 'human', // Anfitrión es siempre J1
                    player2: 'human'  // Cliente es siempre J2
                },
                playerCivilizations: {
                    1: domElements.player1Civ.value,
                    2: domElements.player2Civ.value
                },
                resourceLevel: domElements.resourceLevelSelect.value,
                boardSize: domElements.boardSizeSelect.value,
                deploymentUnitLimit: domElements.initialUnitsCountSelect.value === "unlimited" 
                                    ? Infinity 
                                    : parseInt(domElements.initialUnitsCountSelect.value)
            };
            
            // 2. Crear un paquete de datos para enviar. Incluimos el tipo de mensaje.
            const dataPacket = {
                type: 'startGame',
                settings: gameSettings,
                anfitrionPeerId: NetworkManager.miId // El cliente sabrá quién es J1 y J2
            };

            // 3. Enviar la configuración al otro jugador
            NetworkManager.enviarDatos(dataPacket);
            console.log("[LAN Anfitrión] Paquete de configuración enviado:", dataPacket);
            
            // 4. Iniciar la partida en nuestra propia máquina con la misma configuración
            iniciarPartidaLAN(gameSettings);
        });
    }
    
    if (domElements.floatingBuildBtn) {
                domElements.floatingBuildBtn.addEventListener('click', (event) => {
                    // <<== CORRECCIÓN CLAVE: Detenemos la propagación del evento ==>>
                    // Esto evita que otros listeners (como el que cierra el panel) se activen.
                    event.stopPropagation();
                    console.log("[DEBUG Botón Construir] click detectado.");

                    // Si hay una unidad seleccionada, establece el hexágono de construcción
                    if (selectedUnit) {
                        hexToBuildOn = { r: selectedUnit.r, c: selectedUnit.c };
                        console.log(`Modo construcción iniciado por unidad seleccionada en (${hexToBuildOn.r}, ${hexToBuildOn.c}).`);
                    }
                    
                    if (hexToBuildOn) {
                        if (typeof openBuildStructureModal === "function") {
                            openBuildStructureModal();
                        } else {
                            console.error("CRÍTICO: La función openBuildStructureModal no está definida en modalLogic.js");
                        }
                    } else {
                        console.warn("[DEBUG Botón Construir] No se puede construir. No hay unidad ni hexágono seleccionado.");
                        if (UIManager) UIManager.showMessageTemporarily("No hay una acción de construcción válida.", 3000, true);
                    }
                });
            } else { 
                console.warn("main.js: floatingBuildBtn no encontrado, no se pudo añadir listener."); 
            }

    if (domElements.floatingPillageBtn) {
        domElements.floatingPillageBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            handlePillageAction();
        });
    } else {
        console.warn("main.js: floatingPillageBtn no encontrado, no se pudo añadir listener.");
    }

    if (domElements.player1TypeSelect && domElements.player1AiLevelDiv) {
        if (domElements.player1TypeSelect.value.startsWith('ai_')) { domElements.player1AiLevelDiv.style.display = 'block'; } else { domElements.player1AiLevelDiv.style.display = 'none'; }
        domElements.player1TypeSelect.addEventListener('change', () => { if (domElements.player1TypeSelect.value.startsWith('ai_')) { domElements.player1AiLevelDiv.style.display = 'block'; } else { domElements.player1AiLevelDiv.style.display = 'none'; } });
    } else { console.warn("main.js: domElements.player1TypeSelect o domElements.player1AiLevelDiv no encontrados para lógica de AI level."); }

    if (domElements.player2TypeSelect) { 
    } else { console.warn("main.js: domElements.player2TypeSelect no encontrado."); }

    if (domElements.startGameBtn) {
        domElements.startGameBtn.addEventListener('click', () => {
            console.log("main.js: Botón 'Empezar Juego (Escaramuza)' clickeado.");
            if (typeof resetGameStateVariables === "function") resetGameStateVariables();
            else { console.error("main.js: resetGameStateVariables no definida."); return; }

            gameState.isCampaignBattle = false; gameState.currentScenarioData = null; gameState.currentMapData = null;

             if (!domElements.player1TypeSelect || !domElements.player2TypeSelect) {
                  console.error("main.js: Faltan elementos de selección de jugador para iniciar partida."); return;
             }
            
             // Leer y guardar las civilizaciones seleccionadas
            if (!domElements.player1Civ || !domElements.player2Civ) {
                console.error("main.js: Elementos de selección de civilización no encontrados. Usando 'ninguna' por defecto.");
                // gameState.playerCivilizations ya se inicializa con 'ninguna', así que no hace falta hacer nada aquí.
            } else {
                // ESTA PARTE ES TU CÓDIGO ORIGINAL, RESPETADO.
                console.log("[DIAGNÓSTICO] Elemento domElements.player1Civ:", domElements.player1Civ);
                console.log("[DIAGNÓSTICO] Elemento domElements.player2Civ:", domElements.player2Civ);
                gameState.playerCivilizations[1] = domElements.player1Civ.value;
                gameState.playerCivilizations[2] = domElements.player2Civ.value;

                // ESTA ES LA ÚNICA ADICIÓN: UN LOG PARA CONFIRMAR.
                console.log('%c[CIV INIT en main.js] Civilizaciones establecidas -> J1: ' + gameState.playerCivilizations[1] + ', J2: ' + gameState.playerCivilizations[2], "background: #222; color: #bada55");
            }
            // Mantenemos tu log original también.
            console.log(`[CIV DEBUG] Civilización J1: ${gameState.playerCivilizations[1]}, Civilización J2: ${gameState.playerCivilizations[2]}`);
            
            gameState.playerTypes.player1 = domElements.player1TypeSelect.value; 
            if (domElements.player1TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player1 = domElements.player1TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player1')) { delete gameState.playerAiLevels.player1; } }
            gameState.playerTypes.player2 = domElements.player2TypeSelect.value;
            if (domElements.player2TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player2 = domElements.player2TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player2')) { delete gameState.playerAiLevels.player2; } }

             if (!domElements.resourceLevelSelect || !domElements.boardSizeSelect || !domElements.initialUnitsCountSelect) {
                  console.error("main.js: Faltan elementos de configuración de partida para iniciar."); return;
             }
            const selectedResourceLevel = domElements.resourceLevelSelect.value;
            const selectedBoardSize = domElements.boardSizeSelect.value;
            const selectedInitialUnits = domElements.initialUnitsCountSelect.value; 
            gameState.deploymentUnitLimit = selectedInitialUnits === "unlimited" ? Infinity : parseInt(selectedInitialUnits);
            
            console.log("Iniciando Partida Rápida (Escaramuza):", "P1:", gameState.playerTypes.player1, gameState.playerAiLevels?.player1 || "", "P2:", gameState.playerTypes.player2, gameState.playerAiLevels?.player2 || "");

             if (typeof showScreen === "function" && domElements.gameContainer) {
                  showScreen(domElements.gameContainer); 
             } else { 
                 console.error("main.js: CRÍTICO: showScreen (de campaignManager) o domElements.gameContainer no disponibles para transición de pantalla.");
                 if (typeof domElements.setupScreen !== 'undefined') domElements.setupScreen.style.display = 'none';
                 if (typeof domElements.gameContainer !== 'undefined') domElements.gameContainer.style.display = 'flex';
             }
            gameState.currentPhase = "deployment"; 

            console.log("MAIN.JS --- DEBUG ---> ANTES de llamar a initializeNewGameBoardDOMAndData");
            if (typeof initializeNewGameBoardDOMAndData === "function") { 
                 initializeNewGameBoardDOMAndData(selectedResourceLevel, selectedBoardSize); 
                 console.log("MAIN.JS --- DEBUG ---> DESPUÉS de llamar a initializeNewGameBoardDOMAndData (si fue función)"); 
            } else { 
                 console.error("CRÍTICO: initializeNewGameBoardDOMAndData NO es una función (de boardManager.js). No se puede inicializar el tablero."); 
                 console.log("MAIN.JS --- DEBUG ---> initializeNewGameBoardDOMAndData NO FUE UNA FUNCION"); 
            }

            if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") { 
                 UIManager.updateAllUIDisplays();
            } else { console.warn("main.js: UIManager.updateAllUIDisplays no definida."); }
            
             if (typeof logMessage === "function") {
            const player1CivName = CIVILIZATIONS[gameState.playerCivilizations[1]]?.name || 'Desconocida';
            logMessage(`Fase de Despliegue. Jugador 1 (${player1CivName}) | Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit}.`);
            }
            else console.warn("main.js: logMessage no definida.");
        });
    } else { console.warn("main.js: startGameBtn no encontrado."); }

    if (domElements.floatingEndTurnBtn) { 
        domElements.floatingEndTurnBtn.addEventListener('click', () => { 
            if (typeof handleEndTurn === "function") handleEndTurn();
            else console.error("main.js Error: handleEndTurn no definida."); 
        }); 
    } else { console.warn("main.js: floatingEndTurnBtn no encontrado."); }

    
    if (domElements.floatingMenuBtn && domElements.floatingMenuPanel) { 
        domElements.floatingMenuBtn.addEventListener('click', () => { 
            const isVisible = domElements.floatingMenuPanel.style.display === 'block' || domElements.floatingMenuPanel.style.display === 'flex'; 
            domElements.floatingMenuPanel.style.display = isVisible ? 'none' : 'block'; 
            if (!isVisible && typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === "function") { 
                 UIManager.updatePlayerAndPhaseInfo(); 
            }
            if (isVisible && typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") {
                 UIManager.hideContextualPanel();
            }
        }); 
    } else { console.warn("main.js: floatingMenuBtn o floatingMenuPanel no encontrado."); }

    if (domElements.floatingSplitBtn) {
        domElements.floatingSplitBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit && (selectedUnit.regiments?.length || 0) > 1) {
                if (typeof openAdvancedSplitUnitModal === "function") {
                    openAdvancedSplitUnitModal(selectedUnit);
                }
            }
        });
    }
    
    if (domElements.closeContextualPanelBtn && domElements.contextualInfoPanel) { 
        domElements.closeContextualPanelBtn.addEventListener('click', () => { 
            if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") {
                 UIManager.hideContextualPanel();
            } else if (domElements.contextualInfoPanel) {
                 domElements.contextualInfoPanel.style.display = 'none';
                 if(typeof UIManager !== 'undefined' && typeof UIManager.hideAllActionButtons === 'function') UIManager.hideAllActionButtons();
                 if (typeof selectedUnit !== 'undefined') selectedUnit = null;
                 if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
            }
        }); 
    } else { console.warn("main.js: closeContextualPanelBtn o contextualInfoPanel no encontrado."); }

    if (domElements.saveGameBtn_float) { 
        domElements.saveGameBtn_float.addEventListener('click', () => { 
            if (typeof handleSaveGame === "function") handleSaveGame();
            else console.error("main.js Error: handleSaveGame no definida."); 
        }); 
    }

    if (domElements.loadGameInput_float) { 
        domElements.loadGameInput_float.addEventListener('click', (event) => { event.target.value = null; }); 
        domElements.loadGameInput_float.addEventListener('change', (event) => { 
            if (typeof handleLoadGame === "function") handleLoadGame(event);
            else console.error("main.js Error: handleLoadGame no definida.");
        }); 
    }

    if (domElements.concedeBattleBtn_float) { 
        domElements.concedeBattleBtn_float.addEventListener('click', () => { 
             if (typeof logMessage === "function") logMessage("Batalla concedida.");
             else console.warn("main.js: logMessage no definida.");

            if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === 'function') {
                 campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); 
            } else { 
                 gameState.currentPhase = "gameOver"; 
                 if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") UIManager.updateAllUIDisplays();
                 else console.warn("main.js: UIManager.updateAllUIDisplays no definida.");

                 alert("Has concedido la escaramuza."); 
                 if (typeof showScreen === "function" && domElements.mainMenuScreenEl) showScreen(domElements.mainMenuScreenEl);
                 else console.error("main.js: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles.");
            } 
        }); 
    }

    if (domElements.backToMainFromBattleBtn) { 
        domElements.backToMainFromBattleBtn.addEventListener('click', () => { 
            if (confirm("¿Seguro que quiere salir y volver al menú principal? El progreso de esta batalla no se guardará.")) { 
                 if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === "function") UIManager.hideContextualPanel();
                 else {
                      if (domElements.contextualInfoPanel) domElements.contextualInfoPanel.style.display = 'none';
                      if(typeof UIManager !== 'undefined' && typeof UIManager.hideAllActionButtons === 'function') UIManager.hideAllActionButtons();
                      if (typeof selectedUnit !== 'undefined') selectedUnit = null; 
                      if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null; 
                 }
                if (domElements.floatingMenuPanel) domElements.floatingMenuPanel.style.display = 'none'; 
                
                if (gameState.isCampaignBattle && typeof campaignManager !== 'undefined' && typeof campaignManager.handleTacticalBattleResult === "function") {
                     campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); 
                } else { 
                     gameState.currentPhase = "gameOver"; 
                     if (typeof showScreen === "function" && domElements.mainMenuScreenEl) showScreen(domElements.mainMenuScreenEl);
                     else console.error("main.js: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles.");
                } 
            } 
        }); 
    }
    
  // Reemplaza el bloque if (domElements.floatingCreateDivisionBtn) { ... } completo por este:

    if (domElements.floatingCreateDivisionBtn) {
        domElements.floatingCreateDivisionBtn.addEventListener('click', () => {
            // Log inicial para saber que el clic fue registrado
            console.log("%c[+] Botón 'Crear División' presionado.", "color: #28a745; font-weight: bold;"); 
            
            // Verificación de seguridad para asegurar que las variables globales existen
            if (typeof gameState === 'undefined' || typeof placementMode === 'undefined') {
                console.error("main.js: CRÍTICO: gameState o placementMode no definidos. Abortando acción.");
                return;
            }

            // Determinar el contexto: ¿estamos en despliegue inicial o reclutando en una ciudad?
            const isRecruitingInPlayPhase = gameState.currentPhase === 'play' && typeof hexToBuildOn !== 'undefined' && hexToBuildOn !== null;
            
            if (isRecruitingInPlayPhase) {
                // Si estamos en juego y se ha seleccionado un hexágono de reclutamiento válido
                placementMode.recruitHex = { r: hexToBuildOn.r, c: hexToBuildOn.c }; 
                console.log(`[+] MODO: Reclutamiento en partida. Origen: hex (${placementMode.recruitHex.r},${placementMode.recruitHex.c}).`);
            } else if (gameState.currentPhase === 'deployment') {
                // Si estamos en la fase de despliegue inicial
                placementMode.recruitHex = null; 
                console.log("[+] MODO: Despliegue inicial de partida.");
            } else {
                // Si se pulsa en un momento no válido (ni despliegue, ni hex de reclutamiento seleccionado)
                console.warn(`[!] ADVERTENCIA: Botón de crear división presionado en un contexto no válido. Fase: ${gameState.currentPhase}.`);
                logMessage("No se puede crear una unidad en este momento.");
                return; // Detenemos la acción
            }

            // Llamamos a la función que abre el nuevo modal.
            // Se elimina la condición errónea que buscaba 'openCreateDivisionModal'.
            if (typeof openUnitManagementModal === "function") {
                console.log("[>] Llamando a openUnitManagementModal() para mostrar la nueva interfaz...");
                openUnitManagementModal(); 
            } else {
                // Este error solo debería aparecer si modalLogic.js no se ha cargado o la función no existe.
                console.error("main.js: CRÍTICO: La función 'openUnitManagementModal' no está definida en modalLogic.js.");
            }
        });
    } else { 
        // Este log solo aparece si el botón no se encontró en el DOM al iniciar.
        console.warn("main.js: floatingCreateDivisionBtn no encontrado."); 
    }

    if (domElements.floatingWikiBtn) {
        domElements.floatingWikiBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof openWikiModal === "function") {
                openWikiModal();
            } else {
                console.error("Error: La función openWikiModal no está definida en modalLogic.js");
            }
        });
    }

    if (domElements.closeWikiModalBtn) {
        domElements.closeWikiModalBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (domElements.wikiModal) {
                domElements.wikiModal.style.display = 'none';
            }
        });
    }

    if (domElements.floatingTechTreeBtn) {
        domElements.floatingTechTreeBtn.addEventListener('click', () => {
            if (typeof openTechTreeScreen === "function") {
                openTechTreeScreen();
                if (domElements && domElements.floatingMenuPanel && domElements.floatingMenuPanel.style.display !== 'none') {
                    domElements.floatingMenuPanel.style.display = 'none';
                }
                if (domElements && domElements.contextualInfoPanel && domElements.contextualInfoPanel.classList.contains('visible')) {
                    if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) {
                        UIManager.hideContextualPanel();
                    }
                } else {
                     if(typeof UIManager !== 'undefined' && typeof UIManager.hideAllActionButtons === 'function') UIManager.hideAllActionButtons(); 
                     if (domElements && domElements.floatingCreateDivisionBtn) {
                    if (gameState && gameState.currentPhase !== "deployment") {
                        domElements.floatingCreateDivisionBtn.style.display = 'none';
                    }
                 }
                }
            } else {
                console.error("main.js: CRÍTICO: openTechTreeScreen no está definida (de techScreenUI.js).");
                alert("La pantalla de tecnologías aún no está disponible.");
            }
        });
    } else { console.warn("main.js: floatingTechTreeBtn no encontrado, no se pudo añadir listener."); }

    if (typeof initDebugConsole === "function") {
        initDebugConsole(); 
    } else {
        console.error("main.js: CRÍTICO: initDebugConsole no está definida (de debugConsole.js).");
    }

    if (domElements.floatingUndoMoveBtn) {
        domElements.floatingUndoMoveBtn.addEventListener('click', (event) => {
            event.stopPropagation(); 
            console.log("[DEBUG Botón Deshacer] click detectado");
            if (typeof undoLastUnitMove === "function" && typeof selectedUnit !== 'undefined' && selectedUnit) {
                 undoLastUnitMove(selectedUnit);
                 if(typeof UIManager !== 'undefined' && typeof UIManager.updateSelectedUnitInfoPanel === 'function') UIManager.updateSelectedUnitInfoPanel();
            } else {
                 console.warn("[DEBUG Botón Deshacer] No se puede deshacer el movimiento.");
                 if(typeof UIManager !== 'undefined' && typeof UIManager.showMessageTemporarily === 'function') UIManager.showMessageTemporarily("No se puede deshacer el movimiento.", 3000, true);
            }
        });
    } else { console.warn("main.js: floatingUndoMoveBtn no encontrado, no se pudo añadir listener."); }
/*
    if (domElements.floatingReinforceBtn) {
        domElements.floatingReinforceBtn.addEventListener('click', (event) => {
            event.stopPropagation(); 
            if (!selectedUnit) {
                console.warn("[DEBUG Botón Reforzar] Clic, pero no hay unidad seleccionada.");
                return;
            }
            console.log("[DEBUG Botón Reforzar] click detectado");

            if (typeof handleReinforceUnitAction === "function" && typeof selectedUnit !== 'undefined' && selectedUnit) {
                 handleReinforceUnitAction(selectedUnit);
                 if(typeof UIManager !== 'undefined' && typeof UIManager.updateSelectedUnitInfoPanel === 'function') UIManager.updateSelectedUnitInfoPanel();
                 if(typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') UIManager.updatePlayerAndPhaseInfo(); 
            } else {
                 console.warn("[DEBUG Botón Reforzar] No se puede reforzar la unidad.");
                 if(typeof UIManager !== 'undefined' && typeof UIManager.showMessageTemporarily === 'function') UIManager.showMessageTemporarily("No se puede reforzar la unidad.", 3000, true);
            }
        });
    } else { console.warn("main.js: floatingReinforceBtn no encontrado, no se pudo añadir listener."); }
*/
    if (domElements.floatingReinforceBtn) {
        domElements.floatingReinforceBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[DEBUG Botón Gestionar] click detectado");

            // La lógica ahora es simple: si hay una unidad seleccionada, abre su modal de detalles.
            // La función que abre el modal se encargará de mostrar acciones o no (modo consulta).
            if (selectedUnit) {
                if (typeof openUnitDetailModal === "function") {
                    openUnitDetailModal(selectedUnit);
                } else {
                    console.error("CRÍTICO: La función 'openUnitDetailModal' no está definida en modalLogic.js.");
                }
            } else {
                console.warn("[DEBUG Botón Gestionar] Clic, pero no hay unidad seleccionada.");
            }
        });
    } else { console.warn("main.js: floatingReinforceBtn no encontrado, no se pudo añadir listener."); }

    
            
    if (typeof showWelcomeHelpModal === "function") {
        console.log("main.js: Llamando a showWelcomeHelpModal().");
        showWelcomeHelpModal(); 
    } else {
        console.error("main.js: CRÍTICO: showWelcomeHelpModal no está definida (de modalLogic.js).");
        if (typeof showScreen === "function" && domElements && domElements.mainMenuScreenEl) {
            showScreen(domElements.mainMenuScreenEl);
        } else {
            console.error("main.js: CRÍTICO: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles para fallback.");
            if (domElements && domElements.setupScreen) domElements.setupScreen.style.display = 'flex';
             else console.error("main.js: CRÍTICO: domElements.setupScreen no disponible.");
        }
        if (typeof logMessage === "function") logMessage("Bienvenido a Hex General Evolved.");
        else console.warn("main.js: logMessage no definida.");
    }

    if (domElements.floatingManageBtn) {
        domElements.floatingManageBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                if (typeof openUnitDetailModal === "function") {
                    openUnitDetailModal(selectedUnit);
                }
            }
        });
    }

    if (domElements.disbandUnitBtn) {
        domElements.disbandUnitBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                if (typeof handleDisbandUnit === "function") {
                    handleDisbandUnit(selectedUnit);
                } else {
                    console.error("Error: La función handleDisbandUnit no está definida.");
                }
            } else {
                logMessage("No hay unidad seleccionada para disolver.", "error");
            }
        });
    } else {
        console.warn("main.js: disbandUnitBtn no encontrado, no se pudo añadir listener.");
    }
    
    console.log("main.js: initApp() FINALIZADO.");
}

/**
 * Inicia la partida táctica con una configuración dada (para LAN).
 * @param {object} settings - El objeto con la configuración de la partida.
 */
function iniciarPartidaLAN(settings) {
    // --- CÓDIGO ORIGINAL (INTACTO) ---
    console.log("Iniciando partida LAN con la configuración:", settings);
    
    // 1. Resetear el estado del juego y variables
    if (typeof resetGameStateVariables === "function") resetGameStateVariables();

    // 2. Asignar la configuración recibida al gameState global
    gameState.playerTypes = settings.playerTypes;
    gameState.playerCivilizations = settings.playerCivilizations;
    gameState.deploymentUnitLimit = settings.deploymentUnitLimit;
    
    // Es una partida multijugador, no de campaña.
    gameState.isCampaignBattle = false;
    gameState.currentScenarioData = null;
    gameState.currentMapData = null;

    // 3. Ocultar el lobby y mostrar el tablero de juego
    showScreen(domElements.gameContainer);
    gameState.currentPhase = "deployment"; 

    // --- LÓGICA AÑADIDA PARA DIFERENCIAR ANFITRIÓN/CLIENTE ---
    gameState.myPlayerNumber = NetworkManager.esAnfitrion ? 1 : 2;
    console.log(`[iniciarPartidaLAN] Lógica de red iniciada. Soy Jugador: ${gameState.myPlayerNumber}`);

    if (NetworkManager.esAnfitrion) {
        console.log("[iniciarPartidaLAN - Anfitrión] Generando estado de juego para enviarlo al cliente...");
        // 4. (Solo Anfitrión) Inicializar el tablero con la configuración
        // Esto ejecuta el código original que ya teníamos
        if (typeof initializeNewGameBoardDOMAndData === "function") { 
            initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize);
        } else { 
            console.error("CRÍTICO: initializeNewGameBoardDOMAndData no está definida."); 
        }

        // 5. (Solo Anfitrión) Empaquetar y enviar el estado del juego al Cliente
        // Usamos JSON.stringify con un "replacer" para excluir las referencias a elementos del DOM.
        const replacer = (key, value) => (key === 'element' ? undefined : value);
        
        const initialGameSetupPacket = {
            type: 'initialGameSetup',
            payload: {
                board: JSON.parse(JSON.stringify(board, replacer)),
                gameState: JSON.parse(JSON.stringify(gameState, replacer)),
                units: JSON.parse(JSON.stringify(units, replacer)),
                unitIdCounter: unitIdCounter,
                settings: settings
            }
        };

        NetworkManager.enviarDatos(initialGameSetupPacket);
        console.log("[iniciarPartidaLAN - Anfitrión] Paquete de estado inicial enviado al cliente.");

        // 6. (Solo Anfitrión) Actualizar la UI local del Anfitrión
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) { 
            UIManager.updateAllUIDisplays();
        }
        
        // 7. (Solo Anfitrión) Mostrar mensaje de inicio
        if (typeof logMessage === "function") {
            const miNumeroDeJugador = NetworkManager.esAnfitrion ? 1 : 2;
            logMessage(`¡Comienza la partida! Eres Jugador ${miNumeroDeJugador}.`);
            logMessage(`Fase de Despliegue. ¡Coloca tus fuerzas!`);
        }

    } else {
        // El Cliente no hace nada más aquí. Esperará pasivamente a recibir el paquete 'initialGameSetup'
        // que activará la lógica en 'onDatosLANRecibidos'.
        console.log("[iniciarPartidaLAN - Cliente] Esperando a que el anfitrión envíe el estado del juego...");
        logMessage("Esperando datos del anfitrión para sincronizar la partida...");
    }
}

document.addEventListener('DOMContentLoaded', initApp);