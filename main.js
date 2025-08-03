// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
    // --- GUARDIÁN DE TURNO LÓGICO ---
    // Este bloque es el primero que se ejecuta. Si es una partida en red
    // y no es tu turno, muestra un mensaje y detiene toda la función.
    // Esto impide que el jugador inactivo pueda realizar CUALQUIER acción.
    if (isNetworkGame() && gameState.currentPlayer !== gameState.myPlayerNumber) {
        console.log(`[Acción Bloqueada] Clic ignorado. Turno actual: ${gameState.currentPlayer}, Yo soy: ${gameState.myPlayerNumber}`);
        UIManager.showMessageTemporarily(`Es el turno del Jugador ${gameState.currentPlayer}`, 1500, true);
        return;
    }
    // --- FIN DEL GUARDIÁN ---

    // --- MANEJO DEL MODO DE COLOCACIÓN ---
    // Si el guardián anterior permitió pasar, lo siguiente más importante es
    // comprobar si estás en modo "colocar unidad". Si es así, toda la lógica
    // se delega a la función correspondiente y se detiene aquí.
    if (placementMode.active) {
        if (typeof handlePlacementModeClick === "function") {
            handlePlacementModeClick(r, c);
        } else {
            console.error("Error crítico: handlePlacementModeClick no está definido.");
        }
        return; 
    }
    
    // --- VERIFICACIONES GENERALES DEL JUEGO ---
    // Se comprueba si el juego está en una condición que no permite clics,
    // como justo después de mover el mapa, si no hay estado de juego o si la partida ha terminado.
    if (gameState?.justPanned || !gameState || gameState.currentPhase === "gameOver") {
        if (gameState) gameState.justPanned = false;
        return;
    }
    
    // Obtenemos los datos del hexágono en el que se hizo clic.
    const hexDataClicked = board[r]?.[c];
    if (!hexDataClicked) return;
    
    // Obtenemos la unidad que pueda estar en ese hexágono.
    const clickedUnit = getUnitOnHex(r, c);
    console.log(`[DIAGNÓSTICO getUnitOnHex] Para el clic en (${r},${c}), la función encontró:`, clickedUnit ? clickedUnit.name : 'ninguna unidad');
    
    // --- LÓGICA DE SELECCIÓN Y ACCIÓN ---
    // Este es el corazón de la interacción del jugador durante su turno.

    // CASO 1: YA tienes una unidad seleccionada (selectedUnit existe).
    if (selectedUnit) {
        // Se intenta realizar una acción con la unidad seleccionada en el hexágono objetivo.
        const actionTaken = handleActionWithSelectedUnit(r, c, clickedUnit);
        
        // Si no se realizó ninguna acción (por ejemplo, hiciste clic en una casilla vacía
        // a la que no te puedes mover), se deselecciona la unidad actual
        // y se procede a seleccionar lo que haya en la nueva casilla.
    if (actionTaken) {
            // Si se tomó una acción, refrescamos la UI de la unidad seleccionada.
            // Esto es crucial para mostrar que ya no tiene movimiento, actualizar sus botones, etc.
            UIManager.showUnitContextualInfo(selectedUnit, true);
        } else {
            deselectUnit();
            if (clickedUnit) {
                // Si hay una unidad en la nueva casilla, la seleccionas.
                selectUnit(clickedUnit);
                UIManager.showUnitContextualInfo(clickedUnit, clickedUnit.player === gameState.currentPlayer);
            } else {
                // Si no hay unidad, muestras la información del hexágono.
                UIManager.showHexContextualInfo(r, c, hexDataClicked);
            }
        }
    } 
    // CASO 2: NO tienes ninguna unidad seleccionada.
    else { 
        if (clickedUnit) {
            // Si hay una unidad en la casilla, la seleccionas.
            selectUnit(clickedUnit);
            UIManager.showUnitContextualInfo(clickedUnit, clickedUnit.player === gameState.currentPlayer);
        } else {
            // Si no hay unidad, simplemente muestras la información del hexágono.
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
        console.log(`%c[VIAJE-3] Datos recibidos por Jugador ${gameState.myPlayerNumber}. Anfitrión: ${NetworkManager.esAnfitrion}`, 'color: #90EE90; font-weight: bold;', datos);

        // --- Lógica del CLIENTE: Reaccionar a mensajes del anfitrión ---
        if (!NetworkManager.esAnfitrion) {
            switch (datos.type) {
                case 'startGame':
                    logMessage("¡El anfitrión ha iniciado la partida! Preparando tablero...");
                    iniciarPartidaLAN(datos.settings);
                    break;

                case 'initialGameSetup':
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                case 'actionBroadcast':
                    // El cliente SÍ procesa las retransmisiones del anfitrión.
                    executeConfirmedAction(datos.action);
                    break;

                default:
                    console.warn(`[Red - Cliente] Recibido paquete desconocido del anfitrión: '${datos.type}'. Se ignora.`);
                    break;
            }
        }

        // --- Lógica del ANFITRIÓN: Procesar peticiones de los clientes ---
        if (NetworkManager.esAnfitrion) {
            switch (datos.type) {
                case 'actionRequest':
                    // El anfitrión SÍ procesa las peticiones de acción de los clientes.
                    processActionRequest(datos.action);
                    break;

                default:
                    console.warn(`[Red - Anfitrión] Recibido paquete desconocido del cliente: '${datos.type}'. Se ignora.`);
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

     if (domElements.expandPanelBtn && domElements.contextualInfoPanel) {
        domElements.expandPanelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const panel = domElements.contextualInfoPanel;
            // Alterna la clase que controla la expansión
            panel.classList.toggle('is-expanded');
            // Cambia el icono del botón para que indique la acción posible
            domElements.expandPanelBtn.textContent = panel.classList.contains('is-expanded') ? '▼' : '▲';
        });
    } else {
        console.warn("main.js: No se encontraron los elementos necesarios para el panel contextual colapsable (expandPanelBtn o contextualInfoPanel).");
    }

    if (domElements.floatingEndTurnBtn) { 
        domElements.floatingEndTurnBtn.addEventListener('click', () => { 
            // La única responsabilidad del botón es llamar a la función principal.
            // Toda la lógica compleja (red, local, IA) estará dentro de handleEndTurn.
            if (typeof handleEndTurn === "function") {
                handleEndTurn();
            } else {
                console.error("main.js Error: La función handleEndTurn no está definida en gameFlow.js."); 
            }
        }); 
    } else { 
        console.warn("main.js: floatingEndTurnBtn no encontrado."); 
    }

    
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
    

    if (domElements.closeContextualPanelBtn) { 
        domElements.closeContextualPanelBtn.addEventListener('click', (event) => {
            
            // Paso 1: Evitar el "clic fantasma" que reabre el panel.
            event.stopPropagation();
            event.preventDefault(); // Añadimos una capa extra de prevención

            console.log("%c[FORZANDO CIERRE] Clic en 'X' detectado. Ejecutando cierre directo...", "background: red; color: white; font-size: 14px;");

            // Paso 2: Localizar el panel en el momento del clic.
            const panel = document.getElementById('contextualInfoPanel');
            
            if (panel) {
                // Paso 3: LA ORDEN DIRECTA Y BRUTAL. Esto anula CUALQUIER CSS.
                panel.style.display = 'none';

                console.log("[FORZANDO CIERRE] ¡Panel ocultado con 'display: none'!");

                // Paso 4: Llamar a la función de limpieza de UIManager DESPUÉS
                // para que limpie el estado del juego (deseleccionar unidad, etc.)
                if (typeof UIManager !== 'undefined' && UIManager.hideContextualPanel) {
                    UIManager.hideContextualPanel(); // Se ejecutará sin intentar ocultar el panel de nuevo.
                }

            } else {
                console.error("[FORZANDO CIERRE] No se pudo encontrar #contextualInfoPanel en el DOM al hacer clic en 'X'.");
            }
        });
        console.log("Listener de cierre FINAL y FORZADO añadido al botón 'X'.");
    }

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

function isNetworkGame() {
    return NetworkManager.conn && NetworkManager.conn.open;
}

function reconstruirJuegoDesdeDatos(datos) {
   // console.log("[Red - Cliente] Reconstruyendo el juego desde los datos del anfitrión...");
    try {
        // --- ¡SOLUCIÓN DE IDENTIDAD! (Paso A) ---
        // 1. ANTES de sobrescribir, guardamos nuestra identidad local, que es la correcta.
        const miIdentidadLocal = gameState.myPlayerNumber;

        // Limpiar el estado local
        if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
        board = [];
        units = [];

        // 2. Sincronizamos el estado. ESTO SOBREESCRIBE myPlayerNumber TEMPORALMENTE.
        Object.assign(gameState, datos.gameState);
        const boardData = datos.board;
        const unitsData = datos.units;
        unitIdCounter = datos.unitIdCounter;
        
        // 3. DESPUÉS de sobrescribir, restauramos nuestra verdadera identidad.
        gameState.myPlayerNumber = miIdentidadLocal;
        // --- FIN DE LA SOLUCIÓN (Paso A) ---

        // Reconstrucción del tablero (tu código original intacto)
        const boardSize = { rows: boardData.length, cols: boardData[0].length };
        domElements.gameBoard.style.width = `${boardSize.cols * HEX_WIDTH + HEX_WIDTH / 2}px`;
        domElements.gameBoard.style.height = `${boardSize.rows * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;
        board = Array(boardSize.rows).fill(null).map(() => Array(boardSize.cols).fill(null));
        for (let r = 0; r < boardSize.rows; r++) {
            for (let c = 0; c < boardSize.cols; c++) {
                const hexElement = createHexDOMElementWithListener(r, c);
                domElements.gameBoard.appendChild(hexElement);
                board[r][c] = { ...boardData[r][c], element: hexElement, unit: null };
            }
        }
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

        // Renderizar y llamar a la función de bloqueo, que ahora funcionará correctamente.
        renderFullBoardVisualState();
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();

        logMessage("¡Sincronización completada! La partida está lista.");

    } catch (error) {
        console.error("Error crítico al reconstruir el juego en el cliente:", error);
        logMessage("Error: No se pudo sincronizar la partida con el anfitrión.", "error");
    }
}

function executeConfirmedAction(action) {
    
    console.log(`%c[VIAJE-7] Cliente ${gameState.myPlayerNumber} ha recibido un 'actionBroadcast' y está dentro de executeConfirmedAction. Acción: ${action.type}`, 'color: #DAA520; font-weight: bold;', action.payload);

    if (NetworkManager.esAnfitrion && action.payload.playerId === gameState.myPlayerNumber && action.type !== 'syncGameState') {
         if (UIManager) UIManager.updateAllUIDisplays();
         return;
    }
    //console.log(`%c[VIAJE-7] Jugador ${gameState.myPlayerNumber} sincronizando acción retransmitida: ${action.type}`, 'color: #DAA520; font-weight: bold;', action.payload);
    console.log(`[Red - Sincronizando] Ejecutando acción retransmitida por anfitrión: ${action.type}`);
    const payload = action.payload;
    
    switch (action.type) {

        case 'syncGameState':
            const miNumero = gameState.myPlayerNumber; 
            Object.assign(gameState, payload.newGameState);
            gameState.myPlayerNumber = miNumero; 
            
            resetUnitsForNewTurn(gameState.currentPlayer);
            logMessage(`Turno del Jugador ${gameState.currentPlayer}.`);

            if (UIManager) {
                UIManager.updateTurnIndicatorAndBlocker();
                UIManager.updateAllUIDisplays();
            };
            break;

        case 'placeUnit':
            // 1. Se ejecuta la acción lógica: la unidad se añade al estado del juego.
            placeFinalizedDivision(payload.unitData, payload.r, payload.c);

            // --- ¡SOLUCIÓN CLAVE Y DEFINITIVA! ---
            // 2. Apagamos el "interruptor" de colocación en esta máquina.
            //    Esto asegura que el juego vuelva a su estado normal de "seleccionar y actuar"
            //    para TODOS los jugadores, no solo para el que inició la acción.
            placementMode.active = false;
            placementMode.unitData = null;
            placementMode.recruitHex = null;
            if (UIManager) UIManager.clearHighlights();
            // --- FIN DE LA SOLUCIÓN ---
            break;

        case 'researchTech': 
            attemptToResearch(payload.techId); 
            break;

        case 'moveUnit': 

            console.log(`%c[VIAJE-8] Cliente dentro del 'case moveUnit'. Intentando encontrar la unidad con ID: ${payload.unitId}`, 'color: #DAA520; font-weight: bold;');
            const unitToMove = units.find(u => u.id === payload.unitId); 
            if (unitToMove) _executeMoveUnit(unitToMove, payload.toR, payload.toC);
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
            const pillager = units.find(u => u.id === payload.unitId); 
            if (pillager) { selectedUnit = pillager; handlePillageAction(); selectedUnit = null; } 
            break;
        case 'disbandUnit': 
            const unitToDisband = units.find(u => u.id === payload.unitId); 
            if (unitToDisband) handleDisbandUnit(unitToDisband); 
            break;
        case 'buildStructure': 
            handleConfirmBuildStructure(payload); 
            break;
        case 'reinforceRegiment': 
            const divisionToReinforce = units.find(u => u.id === payload.divisionId); 
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId); 
            if (divisionToReinforce && regimentToReinforce) handleReinforceRegiment(divisionToReinforce, regimentToReinforce); 
            break;

        if (UIManager && action.type !== 'syncGameState') {
            UIManager.updateAllUIDisplays();
        }
    }
    
    // Al final de CUALQUIER acción, actualizamos la UI para asegurar la consistencia visual.
    if (UIManager && action.type !== 'syncGameState') {
        UIManager.updateAllUIDisplays();
    }
}

function iniciarPartidaLAN(settings) {
    //console.log("Iniciando partida LAN con la configuración:", settings);
    
    if (typeof resetGameStateVariables === "function") resetGameStateVariables();

    gameState.playerTypes = settings.playerTypes;
    gameState.playerCivilizations = settings.playerCivilizations;
    gameState.deploymentUnitLimit = settings.deploymentUnitLimit;
    gameState.isCampaignBattle = false;
    gameState.currentScenarioData = null;
    gameState.currentMapData = null;

    showScreen(domElements.gameContainer);
    gameState.currentPhase = "deployment"; 
    gameState.myPlayerNumber = NetworkManager.esAnfitrion ? 1 : 2;

    console.log(`[iniciarPartidaLAN] Lógica de red iniciada. Soy Jugador: ${gameState.myPlayerNumber}`);

    if (NetworkManager.esAnfitrion) {
        console.log("[iniciarPartidaLAN - Anfitrión] Generando el mapa y estado inicial...");
        initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize);
        
        // --- ¡SOLUCIÓN DE IDENTIDAD! ---
        // Creamos una copia del gameState para enviarla, y de esa copia eliminamos la identidad del anfitrión.
        const gameStateCopyForBroadcast = JSON.parse(JSON.stringify(gameState));
        delete gameStateCopyForBroadcast.myPlayerNumber; // ¡El cliente no debe saber quién es el anfitrión!
        // --- FIN SOLUCIÓN ---
        
        const replacer = (key, value) => (key === 'element' ? undefined : value);
        const initialGameSetupPacket = {
            type: 'initialGameSetup',
            payload: {
                board: JSON.parse(JSON.stringify(board, replacer)),
                gameState: JSON.parse(JSON.stringify(gameStateCopyForBroadcast, replacer)),
                units: JSON.parse(JSON.stringify(units, replacer)),
                unitIdCounter: unitIdCounter,
                settings: settings
            }
        };

        NetworkManager.enviarDatos(initialGameSetupPacket);
        
        UIManager.updateAllUIDisplays();
        if (UIManager) UIManager.updateTurnIndicatorAndBlocker(); 
        logMessage(`¡Partida iniciada! Eres el Anfitrión (Jugador 1).`);

    } else {
        logMessage("Esperando datos del anfitrión para sincronizar la partida...");
    }
}

function processActionRequest(action) {
    //console.log(`%c[VIAJE-4] Anfitrión procesando acción: ${action.type}`, 'color: #FF69B4; font-weight: bold;', action.payload);
    let payload = action.payload;
    let actionExecuted = false;
    let suppressBroadcast = false;

    switch (action.type) {
        // --- LÓGICA DE FIN DE TURNO COMPLETA Y CENTRALIZADA ---
        case 'endTurn':
            if (payload.playerId !== gameState.currentPlayer) {
                console.warn(`[Red - Anfitrión] RECHAZADO: Fin de turno de J${payload.playerId} pero el turno era de J${gameState.currentPlayer}.`);
                return;
            }

            console.log(`[Red - Anfitrión] Procesando fin de turno para J${payload.playerId}...`);
            const playerEndingTurn = gameState.currentPlayer;
            
            // --- INICIO DE LA LÓGICA DE JUEGO DEL FIN DE TURNO (DE TU FUNCIÓN handleEndTurn) ---
            if (gameState.currentPhase === "deployment") {
                if (gameState.currentPlayer === 1) {
                    gameState.currentPlayer = 2;
                } else {
                    gameState.currentPhase = "play";
                    gameState.currentPlayer = 1;
                    gameState.turnNumber = 1;
                }
            } else if (gameState.currentPhase === "play") {
                updateTerritoryMetrics(playerEndingTurn);
                collectPlayerResources(playerEndingTurn); 
                handleUnitUpkeep(playerEndingTurn);
                handleHealingPhase(playerEndingTurn);
                const tradeGold = calculateTradeIncome(playerEndingTurn);
                if (tradeGold > 0) gameState.playerResources[playerEndingTurn].oro += tradeGold;

                gameState.currentPlayer = playerEndingTurn === 1 ? 2 : 1;
                if (gameState.currentPlayer === 1) gameState.turnNumber++;
                
                handleBrokenUnits(gameState.currentPlayer);
                resetUnitsForNewTurn(gameState.currentPlayer);

                if (gameState.playerResources[gameState.currentPlayer]) {
                    const baseResearchIncome = BASE_INCOME.RESEARCH_POINTS_PER_TURN || 5; 
                    gameState.playerResources[gameState.currentPlayer].researchPoints += baseResearchIncome;
                }
                const player = gameState.currentPlayer;
                const playerRes = gameState.playerResources[player];
                if(playerRes) {
                    let foodProducedThisTurn = 0, foodActuallyConsumed = 0, unitsSufferingAttrition = 0, unitsDestroyedByAttrition = [];
                     units.filter(u => u.player === player && u.currentHealth > 0).forEach(unit => {
                        let unitConsumption = 0;
                        (unit.regiments || []).forEach(reg => { unitConsumption += REGIMENT_TYPES[reg.type]?.foodConsumption || 0; });
                        if (isHexSupplied(unit.r, unit.c, player) && playerRes.comida >= unitConsumption) {
                            playerRes.comida -= unitConsumption;
                            foodActuallyConsumed += unitConsumption;
                        } else {
                            unit.currentHealth -= (ATTRITION_DAMAGE_PER_TURN || 1);
                            unitsSufferingAttrition++;
                            if (unit.currentHealth <= 0) unitsDestroyedByAttrition.push(unit.id);
                        }
                    });
                    unitsDestroyedByAttrition.forEach(unitId => { const unit = units.find(u => u.id === unitId); if (unit && handleUnitDestroyed) handleUnitDestroyed(unit, null); });
                }
            }
            // --- FIN DE LA LÓGICA DE JUEGO ---
            
            console.log(`[Red - Anfitrión] Retransmitiendo nuevo estado: Turno de J${gameState.currentPlayer}`);
            const replacer = (key, value) => (key === 'element' ? undefined : value);
            const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
            
            NetworkManager.enviarDatos({
                type: 'actionBroadcast',
                action: { type: 'syncGameState', payload: { newGameState: gameStateForBroadcast } }
            });

            suppressBroadcast = true;
            actionExecuted = true;
            break;
            
        // --- El resto de tu función original, ahora sí, completa e intacta ---
        case 'researchTech':
            const tech = TECHNOLOGY_TREE_DATA[payload.techId];
            const playerRes = gameState.playerResources[payload.playerId];
            if (tech && playerRes && (playerRes.researchPoints || 0) >= (tech.cost.researchPoints || 0) && hasPrerequisites(playerRes.researchedTechnologies, payload.techId)) {
                attemptToResearch(payload.techId);
                actionExecuted = true;
            }
            break;

        case 'moveUnit':
            const unitToMove = units.find(u => u.id === payload.unitId);
            if (unitToMove && isValidMove(unitToMove, payload.toR, payload.toC)) {
                // <<== CAMBIO CLAVE AQUÍ: Llamamos a la función de ejecución pura ==>>
                _executeMoveUnit(unitToMove, payload.toR, payload.toC);
                actionExecuted = true;
            }
            break;

        case 'attackUnit':
            const attacker = units.find(u => u.id === payload.attackerId);
            const defender = units.find(u => u.id === payload.defenderId);
            if (attacker && defender && isValidAttack(attacker, defender)) {
                console.log(`%c[VIAJE-5] Anfitrión validó el ataque. Llamando a la función de combate...`, 'color: #FF69B4; font-weight: bold;');
                attackUnit(attacker, defender);
                actionExecuted = true;
            }
            break;
        case 'mergeUnits':
            const mergingUnit = units.find(u => u.id === payload.mergingUnitId);
            const targetUnitMerge = units.find(u => u.id === payload.targetUnitId);
            if(mergingUnit && targetUnitMerge) {
                mergeUnits(mergingUnit, targetUnitMerge);
                actionExecuted = true;
            }
            break;
        case 'splitUnit':
            const originalUnit = units.find(u => u.id === payload.originalUnitId);
            gameState.preparingAction = { newUnitRegiments: payload.newUnitRegiments, remainingOriginalRegiments: payload.remainingOriginalRegiments };
            if (originalUnit) {
                 splitUnit(originalUnit, payload.targetR, payload.targetC);
                 actionExecuted = true;
            }
            gameState.preparingAction = null;
            break;
        case 'pillageHex':
            const pillager = units.find(u => u.id === payload.unitId);
            if(pillager) {
                selectedUnit = pillager; 
                handlePillageAction();
                selectedUnit = null;
                actionExecuted = true;
            }
            break;
        case 'disbandUnit':
             const unitToDisband = units.find(u => u.id === payload.unitId);
             if(unitToDisband){
                handleDisbandUnit(unitToDisband);
                actionExecuted = true;
             }
             break;

        case 'placeUnit':
            const hexToPlace = board[payload.r]?.[payload.c];
            if (hexToPlace && !hexToPlace.unit) {
                //console.log(`%c[VIAJE-4] Anfitrión PROCESANDO 'placeUnit'. Chequeando si id es null... ID Recibido:`, 'color: #DAA520; font-weight: bold;', payload.unitData.id);
                if (payload.unitData.id === null) { // Solo si el ID no ha sido asignado
                    payload.unitData.id = `u${unitIdCounter++}`;
                    console.log(`[Red - Anfitrión] ID Asignado: ${payload.unitData.id} a la nueva unidad de J${payload.playerId}`);
                }

                placeFinalizedDivision(payload.unitData, payload.r, payload.c);
                actionExecuted = true;
            }
            break;

        case 'buildStructure':
            const builderPlayerRes = gameState.playerResources[payload.playerId];
            const structureCost = STRUCTURE_TYPES[payload.structureType].cost;
            let canAfford = true;
            for(const res in structureCost){
                if (res !== 'Colono' && (builderPlayerRes[res] || 0) < structureCost[res]) {
                    canAfford = false;
                    break;
                }
            }
            if(canAfford){
                handleConfirmBuildStructure(payload);
                actionExecuted = true;
            }
            break;
        case 'reinforceRegiment':
            const divisionToReinforce = units.find(u => u.id === payload.divisionId);
            const regimentToReinforce = divisionToReinforce?.regiments.find(r => r.id === payload.regimentId);
            if(divisionToReinforce && regimentToReinforce) {
                 handleReinforceRegiment(divisionToReinforce, regimentToReinforce);
                 actionExecuted = true;
            }
            break;
        default:
            console.warn(`[Red - Anfitrión] Recibida petición de acción desconocida: ${action.type}`);
            break;
    }

    if (actionExecuted && !suppressBroadcast) {
        const replacer = (key, value) => (key === 'element' ? undefined : value);
        const cleanPayload = JSON.parse(JSON.stringify(payload, replacer));
        const actionToBroadcast = { type: action.type, payload: cleanPayload };
        console.log(`%c[VIAJE-6] Anfitrión retransmitiendo acción '${action.type}' a todos los jugadores.`, 'color: #FF69B4; font-weight: bold;');
        NetworkManager.enviarDatos({ type: 'actionBroadcast', action: actionToBroadcast });
    }
}

document.addEventListener('DOMContentLoaded', initApp);