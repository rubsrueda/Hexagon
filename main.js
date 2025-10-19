// main.js
// Punto de entrada para la lógica de batalla táctica y listeners de UI táctica.

function onHexClick(r, c) {
    //tutorial
    if (gameState.isTutorialActive && typeof TutorialManager !== 'undefined') {
        const currentStep = TutorialManager.currentSteps[TutorialManager.currentIndex];
        // Comprobamos si el paso actual espera la selección de un hexágono.
        if (currentStep && currentStep.actionCondition.toString().includes('hex_selected')) {
            // Comprobamos si las coordenadas del clic coinciden con las del objetivo.
            const targetCoords = currentStep.highlightHexCoords;
            if (targetCoords && targetCoords[0].r === r && targetCoords[0].c === c) {
                TutorialManager.notifyActionCompleted('hex_selected');
            }
        }
    }

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
    console.log("main.js: DOMContentLoaded -> initApp INICIADO (Versión CORREGIDA con Cuentas).");

    // ======================================================================
    // 1. VERIFICACIONES DE CARGA
    // ======================================================================
    
    if (typeof domElements === 'undefined' || !domElements.domElementsInitialized) {
         console.error("main.js: CRÍTICO: domElements no está definido."); return;
    }

    if (typeof GachaManager !== 'undefined' && GachaManager.init) GachaManager.init();
    
    if (typeof MailboxManager !== 'undefined' && MailboxManager.init) MailboxManager.init();

    if (typeof addModalEventListeners === "function") { addModalEventListeners(); } 
    else { console.error("main.js: CRÍTICO: addModalEventListeners no está definida."); }
    
    if (typeof UIManager !== 'undefined' && UIManager.setDomElements) { UIManager.setDomElements(domElements); } 
    else { console.error("main.js: CRÍTICO: UIManager no definido."); }
    
    if (typeof setupMainMenuListeners === "function") { setupMainMenuListeners(); } 
    else { console.error("main.js: CRÍTICO: setupMainMenuListeners no está definida."); }

    // ======================================================================
    // 2. LÓGICA DE CUENTAS DE USUARIO
    // ======================================================================

    const showMainMenu = () => {
        if (PlayerDataManager.currentPlayer) {
            domElements.currentGeneralName.textContent = PlayerDataManager.currentPlayer.username;
        }
        // La pantalla de bienvenida gestiona si mostrarse o ir directo al menú
        if (typeof showWelcomeHelpModal === 'function') {
            showWelcomeHelpModal();
        } else {
            showScreen(domElements.mainMenuScreenEl);
        }
    };

    const showLoginScreen = () => {
        showScreen(domElements.loginScreen);
        const lastUser = localStorage.getItem('lastUser');
        if (lastUser) {
            domElements.usernameInput.value = lastUser;
            domElements.passwordInput.focus();
        } else {
            domElements.usernameInput.focus();
        }
    };
    
    if (domElements.loginBtn) {
        domElements.loginBtn.addEventListener('click', () => {
            domElements.loginErrorMessage.textContent = "";
            const username = domElements.usernameInput.value;
            const password = domElements.passwordInput.value;
            const result = PlayerDataManager.login(username, password);
            if (result.success) {
                showMainMenu();
            } else {
                domElements.loginErrorMessage.textContent = result.message;
            }
        });
    }

    if (domElements.logoutBtn) {
        domElements.logoutBtn.addEventListener('click', () => {
            PlayerDataManager.logout();
            showLoginScreen();
        });
    }

    // ======================================================================
    // 3. RESTO DE TUS LISTENERS
    // ======================================================================

    
    // Listener del Buzón
    if (domElements.floatingInboxBtn) {
        domElements.floatingInboxBtn.addEventListener('click', (event) => {
            console.log("hice click"); // <--- AÑADE ESTA LÍNEA AQUÍ
            
            event.stopPropagation();

            const modal = document.getElementById('inboxModal');
            if (modal) {
                modal.style.display = 'flex';
                
                if (MailboxManager && MailboxManager.renderList) {
                    MailboxManager.renderList();
                }
            }
        });
    }
    // <<== "Forja" ==>>

    const openForgeBtn = document.getElementById('openForgeBtn');
    if (openForgeBtn) {
        openForgeBtn.addEventListener('click', () => {
            if (typeof openForgeModal === "function") {
                openForgeModal();
            }
        });
    }

    const closeForgeBtn = document.getElementById('closeForgeBtn');
    if (closeForgeBtn) {
        closeForgeBtn.addEventListener('click', () => {
            const modal = document.getElementById('forgeModal');
            if(modal) modal.style.display = 'none';
        });
    }

    const forgeItemBtn = document.getElementById('forgeItemBtn');
    if (forgeItemBtn) {
        forgeItemBtn.addEventListener('click', () => {
            if (typeof handleForgeItem === "function") {
                handleForgeItem();
            }
        });
    }

    // <<== "Cuartel" ==>>
    if (domElements.barracksBtn && !domElements.barracksBtn.hasListener) {
        domElements.barracksBtn.addEventListener('click', () => {
            if(typeof openBarracksModal === "function") {
                openBarracksModal(false); // Abrir en modo "solo vista"
            } else {
                console.error("main.js: La función openBarracksModal no está definida en modalLogic.js.");
            }
        });
        domElements.barracksBtn.hasListener = true; // Previene añadir múltiples listeners
    }

    if(domElements.player2TypeSelect && !domElements.player2TypeSelect.hasListener) {
        domElements.player2TypeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'human') {
                domElements.player2NameDiv.style.display = 'block';
            } else {
                domElements.player2NameDiv.style.display = 'none';
            }
        });
        domElements.player2TypeSelect.hasListener = true;
    }
    // <<==botón de IMPORTAR Perfil==>>
    if (domElements.importProfileInput) {
        domElements.importProfileInput.addEventListener('change', (event) => {
            importProfile(event);
        });
    }

    // <<== botón de EXPORTAR Perfil==>>
    if (domElements.exportProfileBtn_float) {
        domElements.exportProfileBtn_float.addEventListener('click', () => {
            exportProfile();
        });
    }
// ======================================================================    
//Juego en red   
// ====================================================================== 
if (domElements.createNetworkGameBtn) {
        domElements.createNetworkGameBtn.addEventListener('click', () => {
             console.log("[Anfitrión] Clic en 'Crear Partida en Red'. Preparando lobby...");
             const gameSettings = {
                 playerTypes: { player1: 'human', player2: 'human' },
                 playerCivilizations: { 1: domElements.player1Civ.value, 2: domElements.player2Civ.value },
                 resourceLevel: domElements.resourceLevelSelect.value,
                 boardSize: domElements.boardSizeSelect.value,
                 deploymentUnitLimit: domElements.initialUnitsCountSelect.value === "unlimited" ? Infinity : parseInt(domElements.initialUnitsCountSelect.value)
             };
             showScreen(domElements.hostLobbyScreen);
             domElements.hostLobbyScreen.dataset.gameSettings = JSON.stringify(gameSettings);
             gameState.currentPhase = "hostLobby";
             NetworkManager.preparar(onConexionLANEstablecida, onDatosLANRecibidos, onConexionLANCerrada);
             NetworkManager.iniciarAnfitrion((idGenerado) => {
                 if (domElements.shortGameCodeEl) domElements.shortGameCodeEl.textContent = idGenerado;
                 if (domElements.hostPlayerListEl) domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li>`;
             });
        });
    } else {
        console.warn("main.js: createNetworkGameBtn no encontrado.");
    }
    
    function onConexionLANEstablecida(idRemoto) {
        if (NetworkManager.esAnfitrion) {
            if (domElements.hostStatusEl && domElements.hostPlayerListEl) {
                domElements.hostStatusEl.textContent = 'Jugador Conectado. Iniciando...';
                domElements.hostStatusEl.className = 'status conectado';
                domElements.hostPlayerListEl.innerHTML = `<li>J1: Tú (Anfitrión)</li><li>J2: ${idRemoto}</li>`;
            }
            console.log("[Red - Anfitrión] Cliente conectado. Iniciando la partida automáticamente para ambos...");
            const gameSettings = JSON.parse(domElements.hostLobbyScreen.dataset.gameSettings || "{}");
            const dataPacket = { type: 'startGame', settings: gameSettings };
            NetworkManager.enviarDatos(dataPacket);
            setTimeout(() => { iniciarPartidaLAN(gameSettings); }, 500);
        } else {
            console.log(`[Red - Cliente] Conexión establecida con Anfitrión ${idRemoto}. Esperando inicio de partida...`);
        }
    }
    
    function onDatosLANRecibidos(datos) {
        
        console.log(`%c[PROCESS DATA] onDatosLANRecibidos procesando paquete tipo: ${datos.type}`, 'background: #DAA520; color: black;');
        // Lógica del Cliente (cuando NO es anfitrión)
        if (!NetworkManager.esAnfitrion) {
            switch (datos.type) {
                case 'startGame':
                    // Esto es para la configuración inicial, antes de que el tablero exista
                    iniciarPartidaLAN(datos.settings);
                    break;
                    
                case 'initialGameSetup':
                    // La primera "fotografía" completa del juego al empezar
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                case 'fullStateUpdate':
                    // CUALQUIER otra actualización del juego durante la partida
                    reconstruirJuegoDesdeDatos(datos.payload);
                    break;

                default:
                    console.warn(`[Cliente] Recibido paquete desconocido del anfitrión: '${datos.type}'.`);
                    break;
            }
        }
        // Lógica del Anfitrión (recibiendo peticiones del cliente)
        else {
            if (datos.type === 'actionRequest') {
                console.log(`%c[HOST PROCESS] Anfitrión va a procesar acción solicitada: ${datos.action.type}`, 'background: #DC143C; color: white;', datos.action.payload);
                processActionRequest(datos.action);
            } else {
                console.warn(`[Anfitrión] Recibido paquete desconocido del cliente: '${datos.type}'.`);
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
             showScreen(domElements.setupScreen);
        });
    }

    if (domElements.floatingAssignGeneralBtn && !domElements.floatingAssignGeneralBtn.hasListener) {
        domElements.floatingAssignGeneralBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit) {
                console.log(`Abriendo Cuartel para asignar un Héroe a ${selectedUnit.name}.`);
                if (typeof openBarracksModal === "function") {
                    openBarracksModal(true, selectedUnit);
                }
            }
        });
        domElements.floatingAssignGeneralBtn.hasListener = true;
    }

    if (domElements.floatingBuildBtn) {
        domElements.floatingBuildBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[DEBUG Botón Construir] click detectado.");
            if (selectedUnit) {
                hexToBuildOn = { r: selectedUnit.r, c: selectedUnit.c };
                console.log(`Modo construcción iniciado por unidad seleccionada en (${hexToBuildOn.r}, ${hexToBuildOn.c}).`);
            }
            if (hexToBuildOn) {
                if (typeof openBuildStructureModal === "function") { openBuildStructureModal(); } 
                else { console.error("CRÍTICO: La función openBuildStructureModal no está definida en modalLogic.js"); }
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
            RequestPillageAction(); 
        });
    } else {
        console.warn("main.js: floatingPillageBtn no encontrado, no se pudo añadir listener.");
    }

    if (domElements.player1TypeSelect && domElements.player1AiLevelDiv) {
        if (domElements.player1TypeSelect.value.startsWith('ai_')) { domElements.player1AiLevelDiv.style.display = 'block'; } 
        else { domElements.player1AiLevelDiv.style.display = 'none'; }
        domElements.player1TypeSelect.addEventListener('change', () => { 
            if (domElements.player1TypeSelect.value.startsWith('ai_')) { domElements.player1AiLevelDiv.style.display = 'block'; } 
            else { domElements.player1AiLevelDiv.style.display = 'none'; } 
        });
    } else { console.warn("main.js: domElements.player1TypeSelect o domElements.player1AiLevelDiv no encontrados para lógica de AI level."); }

    if (domElements.player2TypeSelect) {} 
    else { console.warn("main.js: domElements.player2TypeSelect no encontrado."); }

    //Partida local???
    if (domElements.startLocalGameBtn) { 
        domElements.startLocalGameBtn.addEventListener('click', () => { 
            console.log("main.js: Botón 'Empezar Partida (Local)' clickeado.");
            if (typeof resetGameStateVariables === "function") {
                resetGameStateVariables(2);
                gameState.myPlayerNumber = 1; // La lógica va DENTRO del 'if'
            } else {
                console.error("main.js: resetGameStateVariables no definida.");
                return;
            }
            gameState.isCampaignBattle = false; gameState.currentScenarioData = null; gameState.currentMapData = null;
            if (!domElements.player1TypeSelect || !domElements.player2TypeSelect) { console.error("main.js: Faltan elementos de selección de jugador para iniciar partida."); return; }
            if (!domElements.player1Civ || !domElements.player2Civ) {
                console.error("main.js: Elementos de selección de civilización no encontrados.");
            } else {
                gameState.playerCivilizations[1] = domElements.player1Civ.value;
                gameState.playerCivilizations[2] = domElements.player2Civ.value;
            }
            gameState.playerTypes.player1 = domElements.player1TypeSelect.value;
            if (domElements.player1TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player1 = domElements.player1TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player1')) { delete gameState.playerAiLevels.player1; } }
            gameState.playerTypes.player2 = domElements.player2TypeSelect.value;
            if (domElements.player2TypeSelect.value.startsWith('ai_')) { gameState.playerAiLevels.player2 = domElements.player2TypeSelect.value.split('_')[1] || 'normal'; } else { if (gameState.playerAiLevels && gameState.playerAiLevels.hasOwnProperty('player2')) { delete gameState.playerAiLevels.player2; } }
            if (!domElements.resourceLevelSelect || !domElements.boardSizeSelect || !domElements.initialUnitsCountSelect) { console.error("main.js: Faltan elementos de configuración de partida para iniciar."); return; }
            const selectedResourceLevel = domElements.resourceLevelSelect.value;
            const selectedBoardSize = domElements.boardSizeSelect.value;
            const selectedInitialUnits = domElements.initialUnitsCountSelect.value; 
            gameState.deploymentUnitLimit = selectedInitialUnits === "unlimited" ? Infinity : parseInt(selectedInitialUnits);
            
            if (typeof showScreen === "function" && domElements.gameContainer) { showScreen(domElements.gameContainer); } 
            else { console.error("main.js: CRÍTICO: showScreen o domElements.gameContainer no disponibles."); }
            gameState.currentPhase = "deployment"; 
            if (typeof initializeNewGameBoardDOMAndData === "function") { initializeNewGameBoardDOMAndData(selectedResourceLevel, selectedBoardSize); } 
            else { console.error("CRÍTICO: initializeNewGameBoardDOMAndData NO es una función."); }
            if (typeof UIManager !== 'undefined' && typeof UIManager.updateAllUIDisplays === "function") { UIManager.updateAllUIDisplays(); } 
            else { console.warn("main.js: UIManager.updateAllUIDisplays no definida."); }
            if (typeof logMessage === "function") {
                const player1CivName = CIVILIZATIONS[gameState.playerCivilizations[1]]?.name || 'Desconocida';
                logMessage(`Fase de Despliegue. Jugador 1 (${player1CivName}) | Límite: ${gameState.deploymentUnitLimit === Infinity ? 'Ilimitado' : gameState.deploymentUnitLimit}.`);
            }
            else console.warn("main.js: logMessage no definida.");
        });
    } else { console.warn("main.js: startLocalGameBtn no encontrado."); }


    //iberia Magna
    if (domElements.startIberiaMagnaBtn) {
        // La función del listener ahora es 'async' para poder usar 'await'.
        domElements.startIberiaMagnaBtn.addEventListener('click', async () => {
            console.log("Iniciando modo de juego: Tronos de Iberia...");
            logMessage("Cargando el mapa de la península, por favor espera...");

            // 1. Prepara el estado del juego para 8 jugadores
            resetGameStateForIberiaMagna(); // Esta función la creaste en el paso anterior.

            // 2. ESPERA a que tu mapa CSV se cargue y se procese.
            // El 'await' es la clave: el código no continuará hasta que el mapa esté listo.
            await initializeIberiaMagnaData();
            
            // 3. Ahora que el mapa está listo, inicializa el tablero visual.
            initializeIberiaMagnaMap();
            
            // 4. Muestra la pantalla del juego.
            showScreen(domElements.gameContainer);
        });
    }


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

            // Notifica al tutorial de forma limpia
            if (gameState.isTutorialActive) {
                if (!isVisible) {
                    TutorialManager.notifyActionCompleted('menu_opened');
                } else {
                    TutorialManager.notifyActionCompleted('menu_closed');
                }
            }
            
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
            console.log("[Botón 💪/👁️] Clic detectado.");

            // Obtenemos las coordenadas de la última unidad sobre la que se mostró el panel.
            // Esto es más fiable que depender de `selectedUnit`, que es solo para unidades controlables.
            const unitR = gameState.selectedHexR;
            const unitC = gameState.selectedHexC;

            if (typeof unitR !== 'undefined' && unitR !== -1) {
                const unitToShow = getUnitOnHex(unitR, unitC);

                if (unitToShow) {
                    console.log(`[Botón 💪/👁️] Abriendo modal para: ${unitToShow.name}`);
                    if (typeof openUnitDetailModal === "function") {
                        // La función openUnitDetailModal ya sabe cómo manejar
                        // una unidad propia vs. una unidad enemiga.
                        openUnitDetailModal(unitToShow);
                    } else {
                        console.error("CRÍTICO: La función 'openUnitDetailModal' no está definida en modalLogic.js.");
                    }
                } else {
                    console.warn(`[Botón 💪/👁️] Clic, pero no se encontró ninguna unidad en las coordenadas guardadas (${unitR}, ${unitC}).`);
    }
            } else {
                console.warn("[Botón 💪/👁️] Clic, pero no hay coordenadas de unidad seleccionada en el gameState.");
            }
        });
    } else { 
            console.warn("main.js: floatingReinforceBtn no encontrado, no se pudo añadir listener."); 
    }

    if (domElements.floatingNextUnitBtn) {
        domElements.floatingNextUnitBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (typeof selectNextIdleUnit === "function") {
                selectNextIdleUnit();
            } else {
                console.error("Error: La función selectNextIdleUnit no está definida en gameFlow.js");
            }
        });
    } else {
        console.warn("main.js: floatingNextUnitBtn no encontrado.");
    }

    if (domElements.floatingConsolidateBtn) {
        domElements.floatingConsolidateBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (selectedUnit && typeof consolidateRegiments === "function") {
                consolidateRegiments(selectedUnit);
            }
        });
    } else {
        console.warn("main.js: floatingConsolidateBtn no encontrado.");
    }
/*
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
*/
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

    if (domElements.setAsCapitalBtn) {
        domElements.setAsCapitalBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            console.log("[Botón Capital] Clic detectado.");

            // Usamos el estado global para saber qué hexágono está seleccionado.
            const selectedR = gameState.selectedHexR;
            const selectedC = gameState.selectedHexC;

            if (typeof selectedR !== 'undefined' && selectedR !== -1) {
                // Llamamos a la función principal que maneja la lógica
                if (typeof requestChangeCapital === "function") {
                    requestChangeCapital(selectedR, selectedC);
                } else {
                    console.error("Error: La función requestChangeCapital no está definida en gameFlow.js");
                }
            } else {
                console.warn("[Botón Capital] Clic, pero no hay hexágono seleccionado en el gameState.");
            }
        });
    } else {
        console.warn("main.js: setAsCapitalBtn no encontrado, no se pudo añadir listener.");
    } 

    // ======================================================================
    // 4. LÓGICA DE ARRANQUE
    // ======================================================================
    const lastUser = localStorage.getItem('lastUser');
    if (lastUser && PlayerDataManager.autoLogin(lastUser)) {
        showMainMenu();
    } else {
        showLoginScreen();
    }
    
    console.log("main.js: initApp() FINALIZADO.");
}

function isNetworkGame() {
    return NetworkManager.conn && NetworkManager.conn.open;
}

function reconstruirJuegoDesdeDatos(datos) {
   console.log("[Red - Cliente] Reconstruyendo el juego desde los datos del anfitrión...");
    try {
        
        // --- ¡SOLUCIÓN DE IDENTIDAD! (Paso A) ---
        // 1. ANTES de sobrescribir, guardamos nuestra identidad local, que es la correcta.
        console.log("%c[REBUILD] Iniciando reconstrucción del estado del juego en el cliente...", "color: #00BFFF");
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
        console.error("%c[REBUILD FAILED] ¡ERROR CRÍTICO AL RECONSTRUIR EL JUEGO!", "color: red; font-size: 1.5em;");
        console.error("Datos recibidos que causaron el error:", JSON.parse(JSON.stringify(datos)));
        console.error("El error fue:", error);
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
    resetGameStateVariables(2); // Reinicia el estado para 2 jugadores

    gameState.playerTypes = settings.playerTypes;
    gameState.playerCivilizations = settings.playerCivilizations;
    gameState.deploymentUnitLimit = settings.deploymentUnitLimit;
    gameState.isCampaignBattle = false;

    showScreen(domElements.gameContainer);
    gameState.currentPhase = "deployment"; 
    
    // El anfitrión es J1, el cliente es J2
    gameState.myPlayerNumber = NetworkManager.esAnfitrion ? 1 : 2;
    console.log(`[iniciarPartidaLAN] Lógica de red iniciada. Soy Jugador: ${gameState.myPlayerNumber}`);

    if (NetworkManager.esAnfitrion) {
        console.log("[Anfitrión] Generando el mapa y el estado inicial...");
        initializeNewGameBoardDOMAndData(settings.resourceLevel, settings.boardSize);
        
        // El anfitrión crea una "fotografía" del estado del juego
        const replacer = (key, value) => (key === 'element' ? undefined : value);
        const gameStateCopy = JSON.parse(JSON.stringify(gameState, replacer));
        delete gameStateCopy.myPlayerNumber; // El cliente no necesita saber nuestra identidad

        const initialGameSetupPacket = {
            type: 'initialGameSetup',
            payload: {
                board: JSON.parse(JSON.stringify(board, replacer)),
                gameState: gameStateCopy,
                units: JSON.parse(JSON.stringify(units, replacer)),
                unitIdCounter: unitIdCounter
            }
        };

        // Y la envía al cliente
        NetworkManager.enviarDatos(initialGameSetupPacket);
        
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();
        logMessage(`¡Partida iniciada! Eres el Anfitrión (Jugador 1).`);

    } else {
        // El cliente no hace NADA. Simplemente espera la "fotografía" del anfitrión.
        logMessage("Esperando datos del anfitrión para sincronizar la partida...");
    }
}

// ========== VERSIÓN DE CÓDIGO: v3.1 - DEDUPLICACIÓN ACTIVA ==========
console.log("%c[SISTEMA] main.js v3.1 CARGADO - Sistema de deduplicación activo", "background: #00FF00; color: #000; font-weight: bold; padding: 4px;");

// Cache de deduplicación de acciones (para evitar procesar la misma acción múltiples veces)
const _processedActions = new Map(); // actionId -> timestamp
const _ACTION_CACHE_DURATION = 5000; // 5 segundos

// Limpiar cache antiguo periódicamente
setInterval(() => {
    const now = Date.now();
    for (const [actionId, timestamp] of _processedActions.entries()) {
        if (now - timestamp > _ACTION_CACHE_DURATION) {
            _processedActions.delete(actionId);
        }
    }
}, _ACTION_CACHE_DURATION);

async function processActionRequest(action) { // <<== async
    // DIAGNÓSTICO: Log explícito de la acción recibida
    console.log(`%c[processActionRequest] Acción recibida: ${action.type}`, 'background: #4169E1; color: white; font-weight: bold;');
    console.log(`  - actionId presente: ${!!action.actionId}`);
    if (action.actionId) {
        console.log(`  - actionId valor: ${action.actionId}`);
    } else {
        console.warn(`  - ⚠️ ADVERTENCIA: Esta acción NO tiene actionId, NO se puede deduplicar`);
    }
    
    // DEDUPLICACIÓN: Verificar si esta acción ya fue procesada
    if (action.actionId) {
        if (_processedActions.has(action.actionId)) {
            console.warn(`%c[DEDUPLICACIÓN] Acción duplicada detectada (${action.type}, ID: ${action.actionId}), IGNORANDO.`, 'background: #FF4500; color: white;');
            return; // Ignorar esta acción duplicada
        }
        // Registrar esta acción como procesada
        _processedActions.set(action.actionId, Date.now());
        console.log(`%c[DEDUPLICACIÓN] Acción registrada (${action.type}, ID: ${action.actionId})`, 'color: #32CD32;');
    }
    
    console.log(`%c[Anfitrión] Procesando petición de acción: ${action.type}`, 'color: #FF69B4; font-weight: bold;', action.payload);
    
    // Si la acción no es del anfitrión, la ignora para evitar que procese sus propias retransmisiones
    if (action.payload.playerId !== NetworkManager.miId && NetworkManager.esAnfitrion && action.payload.playerId !== gameState.currentPlayer) {
        // Excepción: permitimos que las acciones se procesen si son del jugador actual, independientemente de quién sea.
    }
    
    let payload = action.payload;
    let actionExecuted = false;

    // Tu switch completo con toda su lógica se mantiene intacto.
    // Solo hemos modificado ligeramente el final del case 'endTurn'.
    switch (action.type) {
        case 'endTurn':
            if (payload.playerId !== gameState.currentPlayer) {
                console.warn(`[Red - Anfitrión] RECHAZADO: Fin de turno de J${payload.playerId} pero el turno era de J${gameState.currentPlayer}.`);
                // Ya no retornamos de la función `processActionRequest`, solo salimos del switch.
                break;
            }

            console.log(`[Red - Anfitrión] Procesando fin de turno para J${payload.playerId}...`);
            
            // ¡Llamamos a la función centralizada de gameFlow.js pasándole el flag!
            handleEndTurn(true);
            
            actionExecuted = true;
            break;    

            // Se ejecuta toda tu lógica de fin de turno que cambia el estado del juego.
            const playerEndingTurn = gameState.currentPlayer;
            
            // --- INICIO DE LA LÓGICA DE JUEGO DEL FIN DE TURNO (DE TU FUNCIÓN handleEndTurn) ---
            if (gameState.currentPhase === "deployment") {
                if (gameState.currentPlayer === 1) gameState.currentPlayer = 2;
                else { gameState.currentPhase = "play"; gameState.currentPlayer = 1; gameState.turnNumber = 1; }
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
            
            actionExecuted = true;
            break;
            
        case 'attackUnit': // <<== MODIFICACIÓN IMPORTANTE AQUÍ
            const attacker = units.find(u => u.id === payload.attackerId);
            const defender = units.find(u => u.id === payload.defenderId);
            if (attacker && defender && isValidAttack(attacker, defender)) {
                await attackUnit(attacker, defender); // <<== AWAIT
                actionExecuted = true;
            }
            break;

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
                await _executeMoveUnit(unitToMove, payload.toR, payload.toC); // await aquí también es una buena práctica
                actionExecuted = true;
            }
            break;

        case 'mergeUnits': 
            console.log(`[DEBUG] Recibida solicitud mergeUnits:`, payload);
            
            const mergingUnit = units.find(u => u.id === payload.mergingUnitId); 
            const targetUnitMerge = units.find(u => u.id === payload.targetUnitId); 
            
            console.log(`[DEBUG] Unidades encontradas - Fusionar: ${!!mergingUnit}, Objetivo: ${!!targetUnitMerge}`);
            
            if (mergingUnit && targetUnitMerge) {
                console.log(`[DEBUG] Posiciones - Fusionar: (${mergingUnit.r}, ${mergingUnit.c}), Objetivo: (${targetUnitMerge.r}, ${targetUnitMerge.c})`);
                
                // Solo verificamos que pertenezcan al mismo jugador
                const esElMismoJugador = mergingUnit.player === payload.playerId && targetUnitMerge.player === payload.playerId;
                
                console.log(`[DEBUG] Validación - Mismo jugador: ${esElMismoJugador}`);
                
                if (esElMismoJugador) {
                    try {
                        console.log(`[DEBUG] Ejecutando mergeUnits...`);
                        
                        // Guardamos el estado de salud antes de la fusión para validar el éxito
                        const healthBefore = {
                            merging: mergingUnit.currentHealth,
                            target: targetUnitMerge.currentHealth
                        };
                        
                        await mergeUnits(mergingUnit, targetUnitMerge);
                        
                        // Si llegamos aquí sin errores, consideramos la fusión exitosa
                        // Ya no validamos por conteo de unidades, sino por ejecución sin errores
                        actionExecuted = true;
                        console.log(`[Red - Anfitrión] ✅ Fusión ejecutada exitosamente`);
                        
                        // Log adicional para debugging
                        const healthAfter = {
                            merging: mergingUnit.currentHealth,
                            target: targetUnitMerge.currentHealth
                        };
                        console.log(`[DEBUG] Salud antes:`, healthBefore, `después:`, healthAfter);
                        
                    } catch (error) {
                        console.error(`[Red - Anfitrión] ❌ Error en mergeUnits:`, error);
                        // Solo si hay error real no marcamos como exitosa
                    }
                } else {
                    console.log(`[Red - Anfitrión] ❌ Fusión rechazada: unidades no pertenecen al jugador ${payload.playerId}`);
                    console.log(`  - mergingUnit.player: ${mergingUnit.player}`);
                    console.log(`  - targetUnitMerge.player: ${targetUnitMerge.player}`);
                }
            } else {
                console.log(`[Red - Anfitrión] ❌ Una o ambas unidades no encontradas`);
                console.log(`IDs buscados: ${payload.mergingUnitId}, ${payload.targetUnitId}`);
                console.log(`IDs disponibles:`, units.map(u => u.id));
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
                // EL ANFITRIÓN ES EL ÚNICO QUE ASIGNA EL ID
                if (payload.unitData.id === null) { 
                    payload.unitData.id = `u${unitIdCounter++}`;
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

    // Si CUALQUIER acción (incluida endTurn) se ejecutó y cambió el estado...
    if (actionExecuted) {
        // ...el Anfitrión llama a su nueva función para retransmitir el ESTADO COMPLETO Y FINAL.
        // Ya no enviamos la acción, sino el resultado.
        NetworkManager.broadcastFullState();
    } else {
        // Tu log de advertencia original, que es muy útil, se mantiene.
        console.warn(`[Red - Anfitrión] La acción ${action.type} fue recibida pero no se ejecutó (probablemente por una condición inválida).`);
    }
}

function reconstruirJuegoDesdeDatos(datos) {
    try {
        // Guardamos nuestra identidad, que es lo único que nos pertenece
        const miIdentidadLocal = gameState.myPlayerNumber;

        // Limpiar el estado y el tablero local
        if (domElements.gameBoard) domElements.gameBoard.innerHTML = '';
        board = [];
        units = [];

        // Sincronizamos el estado principal (esto sobrescribe nuestra identidad temporalmente)
        Object.assign(gameState, datos.gameState);
        unitIdCounter = datos.unitIdCounter;
        
        if (miIdentidadLocal) {
            gameState.myPlayerNumber = miIdentidadLocal;
        }
        // ¡Restauramos nuestra verdadera identidad!
        gameState.myPlayerNumber = miIdentidadLocal;
        
        // Reconstruir el tablero desde los datos del anfitrión
        const boardData = datos.board;
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
        
        // Reconstruir las unidades desde los datos del anfitrión
        datos.units.forEach(unitData => {
            placeFinalizedDivision(unitData, unitData.r, unitData.c);
        });

        // Refrescar toda la UI con el estado recién sincronizado
        renderFullBoardVisualState();
        UIManager.updateAllUIDisplays();
        UIManager.updateTurnIndicatorAndBlocker();

        logMessage("¡Sincronización con el anfitrión completada! La partida está lista.");

    } catch (error) {
        console.error("Error crítico al reconstruir el juego en el cliente:", error);
        logMessage("Error: No se pudo sincronizar la partida con el anfitrión.", "error");
    }
}

document.addEventListener('DOMContentLoaded', initApp);