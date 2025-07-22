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
    if (domElements.createNetworkGameBtn) {
        domElements.createNetworkGameBtn.addEventListener('click', () => {
             console.log("[Anfitrión] Clic en 'Crear Partida en Red'. Preparando lobby...");

             // 1. Recopilar la configuración del juego desde la pantalla de setup.
             const gameSettings = {
                 playerTypes: { player1: 'human', player2: 'human' },
                 playerCivilizations: {
                     1: domElements.player1Civ.value,
                     2: domElements.player2Civ.value
                 },
                 resourceLevel: domElements.resourceLevelSelect.value,
                 boardSize: domElements.boardSizeSelect.value,
                 deploymentUnitLimit: domElements.initialUnitsCountSelect.value === "unlimited" ? Infinity : parseInt(domElements.initialUnitsCountSelect.value)
             };
             
             // 2. Transicionar a la pantalla del lobby de anfitrión.
             showScreen(domElements.hostLobbyScreen);
             
             // 3. Guardar la configuración en un atributo del propio elemento del lobby
             // para que 'onConexionLANEstablecida' pueda acceder a ella más tarde.
             domElements.hostLobbyScreen.dataset.gameSettings = JSON.stringify(gameSettings);
             gameState.currentPhase = "hostLobby";

             // 4. Iniciar el proceso de red para esperar a un cliente.
             NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
             NetworkManager.iniciarAnfitrion((idGenerado) => {
                 if (domElements.shortGameCodeEl) domElements.shortGameCodeEl.textContent = idGenerado;
                 if (domElements.hostPlayerListEl) domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li>`;
             });
        });
    } else {
        console.warn("main.js: createNetworkGameBtn no encontrado.");
    }
    
    // Función que se ejecuta cuando nos conectamos con éxito a otro jugador
    function onConexionLANEstablecida(idRemoto) {
        if (NetworkManager.esAnfitrion) {
            // -- SOY EL ANFITRIÓN: un cliente se ha unido --
            if (domElements.hostStatusEl && domElements.hostPlayerListEl) {
                domElements.hostStatusEl.textContent = 'Jugador Conectado. Iniciando...';
                domElements.hostStatusEl.className = 'status conectado';
                domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li><li>J2: ${idRemoto}</li>`;
            }

            console.log("[Red - Anfitrión] Cliente conectado. Iniciando la partida automáticamente para ambos...");
            
            // 1. Recupera la configuración que guardamos al entrar al lobby.
            const gameSettings = JSON.parse(domElements.hostLobbyScreen.dataset.gameSettings || "{}");
            
            // 2. Envía el paquete 'startGame' que le dirá al cliente que comience.
            const dataPacket = { type: 'startGame', settings: gameSettings };
            NetworkManager.enviarDatos(dataPacket);
            
            // 3. Inicia la propia partida del anfitrión, un instante después.
            setTimeout(() => {
                 iniciarPartidaLAN(gameSettings);
            }, 500);

        } else {
            // -- SOY EL CLIENTE: me he conectado con éxito al anfitrión --
            // El cliente ya no necesita una pantalla de lobby compleja. Loguea y espera.
            console.log(`[Red - Cliente] Conexión establecida con Anfitrión ${idRemoto}. Esperando inicio de partida...`);
        }
    }
    
    // Función que se ejecuta cuando recibimos datos del otro jugador
    function onDatosLANRecibidos(datos) {
    console.log("%c[Receptor de Red] Datos recibidos:", "background: #28a745; color: white;", datos);

    // --- Lógica del CLIENTE: Reaccionar a mensajes del anfitrión ---
    if (!NetworkManager.esAnfitrion) {
        switch (datos.type) {
            case 'startGame':
                logMessage("¡El anfitrión ha iniciado la partida! Preparando tablero...");
                iniciarPartidaLAN(datos.settings);
                break;

            // --- ¡NUEVA LÓGICA AÑADIDA! ---
            case 'initialGameSetup':
                reconstruirJuegoDesdeDatos(datos.payload);
                break;

            case 'actionBroadcast':
                executeConfirmedAction(datos.action);
                break;

            default:
                console.warn("Cliente ha recibido un tipo de paquete de datos desconocido:", datos.type);
                break;
        }
    }

    // --- Lógica del ANFITRIÓN: Procesar peticiones y retransmitir ---
    if (NetworkManager.esAnfitrion) {
        switch (datos.type) {
            case 'actionRequest':
                processActionRequest(datos.action);
                break;
                
            // El anfitrión NO debe procesar retransmisiones (actionBroadcast) aquí,
            // ya que él es quien las origina y ejecuta la acción en processActionRequest.
            // Si lo necesita para acciones propias, debe manejarse de otra forma.

            default:
                console.log(`Anfitrión recibió un paquete tipo '${datos.type}' del cliente (lógica de manejo futura).`);
                break;
        }
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
        
        alert("El otro jugador se ha desconectado.");
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
                // CAMBIO: Apuntamos al botón correcto antes del cual insertar. El original fue renombrado
                originalParent.insertBefore(optionsContainer, domElements.startLocalGameBtn.parentElement);
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
    
    // 1. Botón para que el CLIENTE se una a una partida
    if (domElements.joinNetworkGameBtn) {
        domElements.joinNetworkGameBtn.addEventListener('click', () => {
            const shortCode = prompt("Introduce el ID de la partida:");
            if (shortCode && shortCode.trim() !== "") {
                logMessage(`Intentando unirse a ${shortCode}...`);
                NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
                NetworkManager.unirseAPartida(shortCode.trim());
            } else {
                if (shortCode !== null) alert("Código inválido.");
            }
        });
    }

    // 2. Botón para que el ANFITRIÓN cree una partida en red
    if (domElements.createNetworkGameBtn) {
        domElements.createNetworkGameBtn.addEventListener('click', () => {
            console.log("[Anfitrión] Clic en 'Crear Partida en Red'. Preparando lobby...");
            const gameSettings = {
                playerTypes: { player1: 'human', player2: 'human' },
                playerCivilizations: {
                    1: domElements.player1Civ.value,
                    2: domElements.player2Civ.value,
                },
                resourceLevel: domElements.resourceLevelSelect.value,
                boardSize: domElements.boardSizeSelect.value,
                deploymentUnitLimit: domElements.initialUnitsCountSelect.value === "unlimited" ? Infinity : parseInt(domElements.initialUnitsCountSelect.value)
            };
            
            showScreen(domElements.hostLobbyScreen);
            domElements.hostLobbyScreen.dataset.gameSettings = JSON.stringify(gameSettings);
            gameState.currentPhase = "hostLobby";

            NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
            NetworkManager.iniciarAnfitrion((idGenerado) => {
                if(domElements.shortGameCodeEl) domElements.shortGameCodeEl.textContent = idGenerado;
                if(domElements.hostPlayerListEl) domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li>`;
            });
        });
    }

    // 3. Botón para que el ANFITRIÓN cancele el lobby
    if(domElements.backToMainMenuBtn_fromHostLobby) {
        domElements.backToMainMenuBtn_fromHostLobby.addEventListener('click', () => {
             NetworkManager.desconectar();
             showScreen(domElements.setupScreen); // Vuelve a la pantalla de configuración
        });
    }
    
    // 4. Se asegura de que el listener de partida local apunte al ID correcto.
    if (domElements.startLocalGameBtn) {
        domElements.startLocalGameBtn.addEventListener('click', () => {
            //... Tu código original para iniciar una partida local va aquí ...
            // (No necesitas copiarlo, solo asegúrate de que el 'if' apunte a 'startLocalGameBtn')
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

    if (domElements.startLocalGameBtn) { 
        domElements.startLocalGameBtn.addEventListener('click', () => { 
            console.log("main.js: Botón 'Empezar Partida (Local)' clickeado."); // Mensaje corregido
            if (typeof resetGameStateVariables === "function") resetGameStateVariables();
            else { console.error("main.js: resetGameStateVariables no definida."); return; }

            gameState.isCampaignBattle = false; gameState.currentScenarioData = null; gameState.currentMapData = null;

             if (!domElements.player1TypeSelect || !domElements.player2TypeSelect) {
                  console.error("main.js: Faltan elementos de selección de jugador para iniciar partida."); return;
             }
            
             if (!domElements.player1Civ || !domElements.player2Civ) {
                console.error("main.js: Elementos de selección de civilización no encontrados. Usando 'ninguna' por defecto.");
            } else {
                console.log("[DIAGNÓSTICO] Elemento domElements.player1Civ:", domElements.player1Civ);
                console.log("[DIAGNÓSTICO] Elemento domElements.player2Civ:", domElements.player2Civ);
                gameState.playerCivilizations[1] = domElements.player1Civ.value;
                gameState.playerCivilizations[2] = domElements.player2Civ.value;

                console.log('%c[CIV INIT en main.js] Civilizaciones establecidas -> J1: ' + gameState.playerCivilizations[1] + ', J2: ' + gameState.playerCivilizations[2], "background: #222; color: #bada55");
            }
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
    } else { console.warn("main.js: startLocalGameBtn no encontrado."); }

    if (domElements.floatingEndTurnBtn) { 
    domElements.floatingEndTurnBtn.addEventListener('click', () => { 
        // <<== INICIO DE LA MODIFICACIÓN ==>>
        const isNetworkGame = NetworkManager.conn && NetworkManager.conn.open;
        const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;

        if (isNetworkGame) {
            // Es un juego en red
            if (isMyTurn) {
                console.log("[Red] Solicitando terminar el turno...");
                // 1. Enviamos la PETICIÓN al anfitrión
                NetworkManager.enviarDatos({
                    type: 'actionRequest',
                    action: {
                        type: 'endTurn',
                        payload: { playerId: gameState.myPlayerNumber }
                    }
                });
                domElements.floatingEndTurnBtn.disabled = true; // Deshabilitamos el botón para no enviarlo múltiples veces
            } else {
                logMessage("No es tu turno.");
            }
        } else {
            // Es un juego local, funciona como siempre
            if (typeof handleEndTurn === "function") handleEndTurn();
            else console.error("main.js Error: handleEndTurn no definida."); 
        }
        // <<== FIN DE LA MODIFICACIÓN ==>>
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
                
                if (gameState.isCampaignBattle && typeof campaignManager.handleTacticalBattleResult === "function") {
                     campaignManager.handleTacticalBattleResult(false, gameState.currentCampaignTerritoryId); 
                } else { 
                     gameState.currentPhase = "gameOver"; 
                     if (typeof showScreen === "function" && domElements.mainMenuScreenEl) showScreen(domElements.mainMenuScreenEl);
                     else console.error("main.js: showScreen (de campaignManager) o domElements.mainMenuScreenEl no disponibles.");
                } 
            } 
        }); 
    }
    
    if (domElements.floatingCreateDivisionBtn) {
        domElements.floatingCreateDivisionBtn.addEventListener('click', () => {
            console.log("%c[+] Botón 'Crear División' presionado.", "color: #28a745; font-weight: bold;"); 
            
            if (typeof gameState === 'undefined' || typeof placementMode === 'undefined') {
                console.error("main.js: CRÍTICO: gameState o placementMode no definidos. Abortando acción.");
                return;
            }
            const isRecruitingInPlayPhase = gameState.currentPhase === 'play' && typeof hexToBuildOn !== 'undefined' && hexToBuildOn !== null;
            
            if (isRecruitingInPlayPhase) {
                placementMode.recruitHex = { r: hexToBuildOn.r, c: hexToBuildOn.c }; 
                console.log(`[+] MODO: Reclutamiento en partida. Origen: hex (${placementMode.recruitHex.r},${placementMode.recruitHex.c}).`);
            } else if (gameState.currentPhase === 'deployment') {
                placementMode.recruitHex = null; 
                console.log("[+] MODO: Despliegue inicial de partida.");
            } else {
                console.warn(`[!] ADVERTENCIA: Botón de crear división presionado en un contexto no válido. Fase: ${gameState.currentPhase}.`);
                logMessage("No se puede crear una unidad en este momento.");
                return;
            }
            if (typeof openUnitManagementModal === "function") {
                console.log("[>] Llamando a openUnitManagementModal() para mostrar la nueva interfaz...");
                openUnitManagementModal(); 
            } else {
                console.error("main.js: CRÍTICO: La función 'openUnitManagementModal' no está definida en modalLogic.js.");
            }
        });
    } else { 
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

    if (domElements.floatingReinforceBtn) {
        domElements.floatingReinforceBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[DEBUG Botón Gestionar] click detectado");
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

    // --- CÓDIGO AÑADIDO (bifurcación anfitrión/cliente) ---
    gameState.myPlayerNumber = NetworkManager.esAnfitrion ? 1 : 2;
    console.log(`[iniciarPartidaLAN] Lógica de red iniciada. Soy Jugador: ${gameState.myPlayerNumber}`);

    if (NetworkManager.esAnfitrion) {
        console.log("[iniciarPartidaLAN - Anfitrión] Generando el mapa y estado inicial...");
        initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize);
        
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

        console.log("[iniciarPartidaLAN - Anfitrión] Paquete de configuración inicial listo para enviar.");
        NetworkManager.enviarDatos(initialGameSetupPacket);
        
        UIManager.updateAllUIDisplays();
        logMessage(`¡Partida iniciada! Eres el Anfitrión (Jugador 1). Esperando despliegue...`);
    } else {
        console.log("[iniciarPartidaLAN - Cliente] Esperando a que el anfitrión envíe el estado del juego...");
        logMessage("Esperando datos del anfitrión para sincronizar la partida...");
    }
}

/**
 * [SOLO ANFITRIÓN] Procesa una PETICIÓN de acción de cualquier jugador.
 * Valida la acción contra el estado autoritario del juego, la ejecuta si es válida,
 * y luego retransmite la acción confirmada a todos los jugadores.
 * @param {object} action - El objeto de acción enviado por un jugador.
 */
function processActionRequest(action) {
    // Validación básica: un jugador no puede actuar fuera de su turno.
    if (action.payload.playerId !== gameState.currentPlayer) {
        console.warn(`[Red - Anfitrión] Acción rechazada: El jugador ${action.payload.playerId} intentó actuar fuera de turno (Turno actual: ${gameState.currentPlayer}).`);
        return;
    }

    let actionToBroadcast = null;
    let payload = action.payload;
    let isValid = true; // Asumimos que la acción es válida hasta que se demuestre lo contrario.

    switch (action.type) {
        // --- ACCIONES DE TURNO Y GESTIÓN ---
        case 'endTurn':
            // La lógica de 'endTurn' es compleja y ya la manejas dentro de handleEndTurn,
            // que a su vez se encarga de retransmitir el nuevo estado.
            handleEndTurn();
            return; // Detenemos la ejecución aquí, handleEndTurn se encarga del resto.

        case 'researchTech':
            const tech = TECHNOLOGY_TREE_DATA[payload.techId];
            const playerRes = gameState.playerResources[payload.playerId];
            // Validación del anfitrión: ¿Puede el jugador pagarlo y tiene los prerrequisitos?
            if (tech && playerRes && (playerRes.researchPoints || 0) >= (tech.cost.researchPoints || 0) && hasPrerequisites(playerRes.researchedTechnologies, payload.techId)) {
                attemptToResearch(payload.techId); // El anfitrión ejecuta la acción
                actionToBroadcast = { type: 'researchTech', payload };
            }
            break;

        // --- ACCIONES DE UNIDAD EN EL MAPA ---
        case 'moveUnit':
            const unitToMove = units.find(u => u.id === payload.unitId);
            if (unitToMove && isValidMove(unitToMove, payload.toR, payload.toC)) {
                moveUnit(unitToMove, payload.toR, payload.toC);
                actionToBroadcast = { type: 'moveUnit', payload };
            }
            break;

        case 'attackUnit':
            const attacker = units.find(u => u.id === payload.attackerId);
            const defender = units.find(u => u.id === payload.defenderId);
            if (attacker && defender && isValidAttack(attacker, defender)) {
                attackUnit(attacker, defender);
                actionToBroadcast = { type: 'attackUnit', payload };
            }
            break;
            
        case 'mergeUnits':
            const mergingUnit = units.find(u => u.id === payload.mergingUnitId);
            const targetUnitMerge = units.find(u => u.id === payload.targetUnitId);
            if(mergingUnit && targetUnitMerge) { // La validación completa está dentro de mergeUnits
                mergeUnits(mergingUnit, targetUnitMerge);
                actionToBroadcast = { type: 'mergeUnits', payload };
            }
            break;
            
        case 'splitUnit':
            const originalUnit = units.find(u => u.id === payload.originalUnitId);
            // El anfitrión asigna los datos de los regimientos a su gameState.preparingAction temporalmente para ejecutar la acción.
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments };
            if (originalUnit) {
                 splitUnit(originalUnit, payload.targetR, payload.targetC);
                 actionToBroadcast = { type: 'splitUnit', payload };
            }
            gameState.preparingAction = null; // Limpiar después de usar
            break;
            
        case 'pillageHex':
            const pillager = units.find(u => u.id === payload.unitId);
            if(pillager) { // La validación está dentro de la función handle
                handlePillageAction();
                actionToBroadcast = { type: 'pillageHex', payload };
            }
            break;

        case 'disbandUnit':
             const unitToDisband = units.find(u => u.id === payload.unitId);
             if(unitToDisband){
                handleDisbandUnit(unitToDisband);
                actionToBroadcast = { type: 'disbandUnit', payload };
             }
             break;
            
        // --- ACCIONES DESDE MODALES ---
        case 'placeUnit': 
             if (isValid) {
                // El anfitrión ejecuta la acción. ESTO AÑADE .element a payload.unitData
                placeFinalizedDivision(payload.unitData, payload.r, payload.c);
                
                // <<== ¡SOLUCIÓN CLAVE AQUÍ! ==>>
                // Creamos un nuevo payload para la retransmisión, asegurándonos de que
                // la unidad se vuelve a limpiar para no enviar el elemento DOM.
                const replacer = (key, value) => (key === 'element' ? undefined : value);
                const cleanUnitDataForBroadcast = JSON.parse(JSON.stringify(payload.unitData, replacer));

                const broadcastPayload = {
                    ...payload, // Copia otras propiedades como r, c, playerId
                    unitData: cleanUnitDataForBroadcast // Usa la versión limpia de unitData
                };

                actionToBroadcast = { type: 'placeUnit', payload: broadcastPayload };
             }
             break;
            
        case 'buildStructure':
            // El anfitrión valida que el jugador tiene los recursos.
            const builderPlayerRes = gameState.playerResources[payload.playerId];
            const structureCost = STRUCTURE_TYPES[payload.structureType].cost;
            isValid = true;
            for(const res in structureCost){
                if((builderPlayerRes[res] || 0) < structureCost[res]) isValid = false;
            }
            if(isValid){
                handleConfirmBuildStructure(payload);
                actionToBroadcast = { type: 'buildStructure', payload };
            }
            break;

        case 'reinforceRegiment':
            const divisionToReinforce = units.find(u => u.id === payload.divisionId);
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId);
            if(divisionToReinforce && regimentToReinforce) { // Validación de coste y condiciones está dentro de la función.
                 handleReinforceRegiment(divisionToReinforce, regimentToReinforce);
                 actionToBroadcast = { type: 'reinforceRegiment', payload };
            }
            break;

        default:
            console.warn(`[Red - Anfitrión] Recibida petición de acción desconocida: ${action.type}`);
            break;
    }

    if (actionToBroadcast) {
        console.log(`[Red - Anfitrión] Acción '${action.type}' validada. Retransmitiendo...`);
        NetworkManager.enviarDatos({ type: 'actionBroadcast', action: actionToBroadcast });
    } else {
        console.warn(`[Red - Anfitrión] Acción '${action.type}' rechazada por validación fallida.`);
    }
}


/**
 * [TODOS LOS JUGADORES] Ejecuta una ACCIÓN CONFIRMADA que el anfitrión ha retransmitido.
 * Esto actualiza el estado local de todos para que coincida con el del anfitrión.
 * No se necesita validación aquí, ya que se confía en la decisión del anfitrión.
 * @param {object} action - El objeto de acción retransmitido por el anfitrión.
 */
function executeConfirmedAction(action) {
    console.log("[Red - Sincronizando] Ejecutando acción confirmada por el anfitrión:", action.type);
    const payload = action.payload;

    // Detener la simulación de la IA del cliente si el anfitrión va a ejecutar el turno de la IA
    const isMyTurn = gameState.currentPlayer === gameState.myPlayerNumber;
    if (!isMyTurn && gameState.playerTypes[`player${gameState.currentPlayer}`]?.startsWith('ai_')) {
        console.log("[Red - Cliente] Es el turno de una IA, deteniendo cualquier simulación local y esperando broadcast del anfitrión.");
    }
    
    switch (action.type) {
        // --- ACCIONES DE TURNO Y GESTIÓN ---
        case 'syncGameState': // Se recibe tras un endTurn
            Object.assign(gameState, action.payload.newGameState);
            resetUnitsForNewTurn(gameState.currentPlayer);
            logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);
            UIManager.updateAllUIDisplays();
            if (gameState.currentPlayer === gameState.myPlayerNumber) {
                domElements.floatingEndTurnBtn.disabled = false;
            }
            break;

        case 'researchTech':
            attemptToResearch(payload.techId);
            break;

        // --- ACCIONES DE UNIDAD EN EL MAPA ---
        case 'moveUnit':
            const unitToMove = units.find(u => u.id === payload.unitId);
            if (unitToMove) moveUnit(unitToMove, payload.toR, payload.toC);
            break;

        case 'attackUnit':
            const attacker = units.find(u => u.id === payload.attackerId);
            const defender = units.find(u => u.id === payload.defenderId);
            if (attacker && defender) attackUnit(attacker, defender);
            break;
            
        case 'mergeUnits':
             const mergingUnit = units.find(u => u.id === payload.mergingUnitId);
             const targetUnitMerge = units.find(u => u.id === payload.targetUnitId);
             if(mergingUnit && targetUnitMerge) mergeUnits(mergingUnit, targetUnitMerge);
             break;
            
        case 'splitUnit':
            const originalUnit = units.find(u => u.id === payload.originalUnitId);
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments };
            if (originalUnit) splitUnit(originalUnit, payload.targetR, payload.targetC);
            gameState.preparingAction = null;
            break;
        
        case 'pillageHex':
            // 'selectedUnit' necesita ser establecido temporalmente para que handlePillageAction funcione.
            const pillager = units.find(u => u.id === payload.unitId);
            if (pillager) {
                selectedUnit = pillager;
                handlePillageAction();
                selectedUnit = null; // Limpiar después de la acción.
            }
            break;

        case 'disbandUnit':
             const unitToDisband = units.find(u => u.id === payload.unitId);
             if (unitToDisband) handleDisbandUnit(unitToDisband);
             break;

        // --- ACCIONES DESDE MODALES ---
        case 'placeUnit':
            placeFinalizedDivision(payload.unitData, payload.r, payload.c);
            break;
            
        case 'buildStructure':
             handleConfirmBuildStructure(payload);
             break;

        case 'reinforceRegiment':
             const divisionToReinforce = units.find(u => u.id === payload.divisionId);
             const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId);
             if (divisionToReinforce && regimentToReinforce) handleReinforceRegiment(divisionToReinforce, regimentToReinforce);
             break;
    }
}

/**
 * [TODOS LOS JUGADORES] Ejecuta una ACCIÓN CONFIRMADA que el anfitrión ha retransmitido.
 * Esto actualiza el estado local de todos para que coincida con el del anfitrión.
 * @param {object} action - El objeto de acción retransmitido por el anfitrión.
 */
function executeConfirmedAction(action) {
    console.log("[Red - Sincronizando] Ejecutando acción confirmada:", action.type);

    switch (action.type) {
        case 'syncGameState':
            // Por ahora, la forma más simple de sincronizar es reemplazar nuestro gameState
            // con el que nos envía el anfitrión.
            const oldPlayer = gameState.currentPlayer;
            Object.assign(gameState, action.payload.newGameState);
            
            // Después de sincronizar, actualizamos toda la UI.
            UIManager.updateAllUIDisplays();

            // Lógica específica que debe ocurrir al cambiar de turno
            if (oldPlayer !== gameState.currentPlayer) {
                 logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);
                 resetUnitsForNewTurn(gameState.currentPlayer);
                 
                 // Si ahora es el turno del jugador local, habilitamos su botón de fin de turno.
                 if (gameState.currentPlayer === gameState.myPlayerNumber) {
                     domElements.floatingEndTurnBtn.disabled = false;
                 }
                 
                 // Si es un turno de IA en red, el anfitrión lo ejecuta.
                 const playerForAICheck = `player${gameState.currentPlayer}`;
                 const isAITurn = gameState.playerTypes[playerForAICheck]?.startsWith('ai_');
                 if (isAITurn && NetworkManager.esAnfitrion) {
                     console.log("[Red - Anfitrión] Es turno de una IA, ejecutándola...");
                     setTimeout(simpleAiTurn, 700);
                 }
            }
            break;

                // <<== NUEVO: Case para ejecutar un movimiento confirmado ==>>
        case 'moveUnitConfirmed':
            const { unitId, toR, toC } = action.payload;
            const unit = units.find(u => u.id === unitId);
            if (unit) {
                console.log(`[Red - Sincronizando] Moviendo ${unit.name} a (${toR},${toC}).`);
                
                // Todos los jugadores ejecutan la versión LOCAL de la función
                moveUnit_LOCAL(unit, toR, toC);
            } else {
                console.error(`[Red - Sincronización] Error: No se encontró la unidad ${unitId} para mover.`);
            }
            break;
    }
}

/**
 * [SOLO CLIENTE] Construye todo el estado visual y lógico del juego a partir 
 * de los datos recibidos del anfitrión.
 * @param {object} datos - El payload del paquete 'initialGameSetup'.
 */
function reconstruirJuegoDesdeDatos(datos) {
    console.log("[Red - Cliente] Reconstruyendo el juego desde los datos del anfitrión...");

    try {
        // Limpiar el estado local antes de cargar el nuevo
        if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
        board = [];
        units = [];

        // Cargar estado del juego, tablero, unidades y contador
        Object.assign(gameState, datos.gameState);
        const boardData = datos.board;
        const unitsData = datos.units;
        unitIdCounter = datos.unitIdCounter;

        // Reconstruir el tablero (board y elementos DOM)
        const boardSize = { rows: boardData.length, cols: boardData[0].length };
        domElements.gameBoard.style.width = `${boardSize.cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
        domElements.gameBoard.style.height = `${boardSize.rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;

        board = Array(boardSize.rows).fill(null).map(() => Array(boardSize.cols).fill(null));

        for (let r = 0; r < boardSize.rows; r++) {
            for (let c = 0; c < boardSize.cols; c++) {
                const hexElement = createHexDOMElementWithListener(r, c);
                domElements.gameBoard.appendChild(hexElement);
                board[r][c] = {
                    ...boardData[r][c],
                    element: hexElement,
                    unit: null
                };
            }
        }

        // Reconstruir las unidades (units y elementos DOM)
        unitsData.forEach(unitData => {
            const unitElement = document.createElement('div');
            unitElement.classList.add('unit', `player${unitData.player}`);
            unitElement.textContent = unitData.sprite;
            unitElement.dataset.id = unitData.id;
            const strengthDisplay = document.createElement('div');
            strengthDisplay.classList.add('unit-strength');
            unitElement.appendChild(strengthDisplay);
            domElements.gameBoard.appendChild(unitElement);

            unitData.element = unitElement;
            units.push(unitData);

            if (unitData.r !== -1 && board[unitData.r]?.[unitData.c]) {
                board[unitData.r][unitData.c].unit = unitData;
            }
        });

        // Renderizar todo y actualizar la UI
        renderFullBoardVisualState();
        UIManager.updateAllUIDisplays();
        logMessage("¡Sincronización completada! La partida está lista.");

    } catch (error) {
        console.error("Error crítico al reconstruir el juego en el cliente:", error);
        logMessage("Error: No se pudo sincronizar la partida con el anfitrión.", "error");
    }
}

document.addEventListener('DOMContentLoaded', initApp);