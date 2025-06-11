// En modalLogic.js

// Asegúrate de que las variables globales currentDivisionBuilder, hexToBuildOn, selectedStructureToBuild
// están declaradas al principio del archivo CON 'let' en state.js (o un archivo similar que se cargue antes).
// Si no están declaradas con `let` o `var` en un archivo global que se carga antes, 
// podrían causar un problema de "variable no definida" en ciertas ejecuciones.

// currentDivisionBuilder es para el constructor de unidades (divisiones)
let currentDivisionBuilder = []; 
// hexToBuildOn es el hexágono seleccionado en el mapa para construir una estructura
let hexToBuildOn = null; 
// selectedStructureToBuild es el tipo de estructura elegida en el modal de construcción
let selectedStructureToBuild = null;

// Función de inicialización de listeners. Solo esta función debería existir en el ámbito global.
function addModalEventListeners() {
    // Listeners para cerrar modales (botón 'x' y clic fuera)

    if (closeTechTreeBtn) { // Asegúrate de que closeTechTreeBtn está definida globalmente en domElements.js
        closeTechTreeBtn.addEventListener('click', () => {
            if (typeof closeTechTreeScreen === 'function') { // Asegúrate de que closeTechTreeScreen existe en techScreenUI.js
                closeTechTreeScreen();
            } else {
                console.error("modalLogic: closeTechTreeScreen no está definida para cerrar el árbol tecnológico.");
                // Fallback directo si la función de cierre no existe:
                const techTreeModal = document.getElementById('techTreeScreen');
                if(techTreeModal) techTreeModal.style.display = 'none';
            }
        });
    }

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                if (modal === createDivisionModal) currentDivisionBuilder = [];
                if (modal === buildStructureModal) selectedStructureToBuild = null;
                if (modal === welcomeHelpModalEl) closeWelcomeHelpModal(); 
            }
        });
    });

    // Listener GLOBAL para cerrar modales al hacer clic fuera de ellos.
    window.addEventListener('click', (event) => {
        // Si el clic es en un botón que abre un modal (ej. '➕' o '💡') o en un botón de acción dentro de un modal,
        // NO HACEMOS NADA. Permitimos que esos botones gestionen su propia lógica.
        // Esto es para evitar que un modal se abra y se cierre instantáneamente.
        const isModalToggleButtonOrActionBtn = 
            (floatingCreateDivisionBtn && event.target === floatingCreateDivisionBtn) || 
            (floatingTechTreeBtn && event.target === floatingTechTreeBtn) ||
            (startGameBtn && event.target === startGameBtn) ||
            (startCampaignBtnEl && event.target === startCampaignBtnEl) ||
            (startSkirmishBtnEl && event.target === startSkirmishBtnEl) ||
            (startScenarioBattleBtnEl && event.target === startScenarioBattleBtnEl) ||
            (closeScenarioBriefingBtnEl && event.target === closeScenarioBriefingBtnEl) ||
            (closeWelcomeHelpBtn && event.target === closeWelcomeHelpBtn) ||
            (confirmBuildBtn && event.target === confirmBuildBtn) || 
            (finalizeDivisionBtn && event.target === finalizeDivisionBtn) ||
            (event.target.tagName === 'BUTTON' && event.target.textContent.includes('Construir Estructura')) ||
            (event.target.tagName === 'BUTTON' && event.target.textContent.includes('Crear División Aquí'));

        if (isModalToggleButtonOrActionBtn) {
            return;
        }

        // Iterar sobre todos los modales que pueden estar abiertos
        // Asegúrate de que todas estas variables de modal están definidas en domElements.js
        const modalsToManage = [
            createDivisionModal, 
            buildStructureModal, 
            scenarioBriefingModalEl, 
            welcomeHelpModalEl, 
            techTreeScreen // <<== AÑADIR AQUI LA REFERENCIA AL MODAL DEL ARBOL
        ].filter(m => m !== null && m !== undefined); // Filtrar posibles nulos

        modalsToManage.forEach(modal => {
            // Si el modal está visible (display: flex) Y el clic no fue dentro de él
            if (modal.style.display === 'flex' && !modal.contains(event.target)) {
                modal.style.display = 'none'; // Oculta el modal

                // Lógica específica para limpiar el estado al cerrar
                if (modal === createDivisionModal) {
                    currentDivisionBuilder = [];
                    if (divisionNameInput) divisionNameInput.value = "Nueva División"; 
                } else if (modal === buildStructureModal) {
                    selectedStructureToBuild = null;
                    if (buildHexCoordsDisplay) buildHexCoordsDisplay.textContent = ""; 
                } else if (modal === welcomeHelpModalEl) {
                    if (typeof closeWelcomeHelpModal === 'function') closeWelcomeHelpModal();
                }
                // Para techTreeScreen y scenarioBriefingModal, modal.style.display = 'none'; es suficiente.
            }
        });
    });

    // Listeners para botones DENTRO de los modales (finalizar acciones)
    if (finalizeDivisionBtn) finalizeDivisionBtn.addEventListener('click', handleFinalizeDivision);
    else console.warn("modalLogic: finalizeDivisionBtn no encontrado.");
    if (confirmBuildBtn) confirmBuildBtn.addEventListener('click', handleConfirmBuildStructure);
    else console.warn("modalLogic: confirmBuildBtn no encontrado.");

    // Listeners específicos para los botones dentro del modal de bienvenida.
    if (closeWelcomeHelpBtn) {
        closeWelcomeHelpBtn.addEventListener('click', closeWelcomeHelpModal);
    }
    if (startGameFromHelpBtn) {
        startGameFromHelpBtn.addEventListener('click', () => {
            closeWelcomeHelpModal();
            if (typeof startSkirmishBtnEl !== 'undefined' && startSkirmishBtnEl) {
                startSkirmishBtnEl.click(); 
            } else {
                console.error("No se pudo simular el clic en el botón de Escaramuza. Volviendo al menú principal.");
                if (typeof showScreen === 'function' && typeof mainMenuScreenEl !== 'undefined') {
                    showScreen(mainMenuScreenEl); 
                }
            }
        });
    }
}

// --- LÓGICA DEL MODAL DE CREACIÓN DE DIVISIÓN ---

/**
 * Abre el modal de creación de división y prepara los datos.
 * Realiza validaciones previas si es necesario según la fase de juego.
 */
function openCreateDivisionModal() {
    console.log("%c[DEBUG MODAL - openCreateDivisionModal] Función de apertura y preparación de datos.", "background: #555; color: #fff;");

    // Validaciones para la fase de juego
    if (gameState.currentPhase === "play") {
        let canRecruit = gameState.cities.some(city => 
            city.owner === gameState.currentPlayer && 
            board[city.r]?.[city.c] && 
            (board[city.r][city.c].isCapital || board[city.r][c.c].structure === "Fortaleza") && // Corregido c.c a city.c
            !getUnitOnHex(city.r, city.c) 
        );
        if (!canRecruit) {
            logMessage("Debes controlar una Capital o Fortaleza VACÍA para crear unidades durante la partida.");
            return; // Si no puede reclutar, no abre el modal.
        }
    } else if (gameState.currentPhase !== "deployment") { // No es despliegue ni play
        logMessage("No se pueden crear unidades en esta fase del juego.");
        return; // Sale si la fase no permite.
    }
    // Para la fase de despliegue, no hay validación `canRecruit` aquí, ya la hace updateActionButtonsBasedOnPhase.

    // Reinicia el constructor de divisiones
    currentDivisionBuilder = []; 
    populateAvailableRegimentsForModal(); 
    updateCreateDivisionModalDisplay(); 
    if (divisionNameInput) divisionNameInput.value = `División P${gameState.currentPlayer} #${units.filter(u => u.player === gameState.currentPlayer).length + 1}`;
    
    // Muestra el modal
    if (createDivisionModal) {
        createDivisionModal.style.display = 'flex';
        console.log(`%c[DEBUG MODAL] Modal de Creación de División visible.`, "color: yellow;");
    } else {
        console.error("CRÍTICO: Elemento #createDivisionModal no encontrado para abrir.");
    }
}

/**
 * Rellena la lista de regimientos disponibles en el modal de creación de división
 * basándose en las tecnologías investigadas por el jugador actual.
 */
function populateAvailableRegimentsForModal() {
    if (!availableRegimentsListEl || typeof REGIMENT_TYPES === 'undefined' || !gameState || !gameState.playerResources || typeof TECHNOLOGY_TREE_DATA === 'undefined') {
        console.error("populateAvailableRegimentsForModal: Faltan dependencias críticas. No se pueden cargar regimientos.");
        if(availableRegimentsListEl) availableRegimentsListEl.innerHTML = '<li>Error: Componentes del juego no cargados.</li>';
        return;
    }
    
    availableRegimentsListEl.innerHTML = ''; 
    const currentPlayer = gameState.currentPlayer;
    const playerResearchedTechs = gameState.playerResources[currentPlayer]?.researchedTechnologies || [];

    console.log(`%c[DEBUG REGIMENTS] INICIO: populateAvailableRegimentsForModal para Jugador ${currentPlayer}`, "background: #222; color: #bada55; font-size: 1em;");
    console.log(`[DEBUG REGIMENTS] Tecnologías investigadas por el jugador ${currentPlayer}:`, playerResearchedTechs);

    let unlockedUnitTypesByTech = new Set();

    for (const techId of playerResearchedTechs) {
        const techData = TECHNOLOGY_TREE_DATA[techId];
        console.log(`[DEBUG REGIMENTS] Procesando tecnología investigada: ${techId}. Datos:`, techData);
        if (techData && techData.unlocksUnits && Array.isArray(techData.unlocksUnits)) {
            techData.unlocksUnits.forEach(unitTypeKey => {
                unlockedUnitTypesByTech.add(unitTypeKey);
            });
        }
    }

    console.log(`%c[DEBUG REGIMENTS] Tipos de unidades desbloqueadas TOTALES después de procesar techs:`, "background: #222; color: #bada55; font-size: 1em;", Array.from(unlockedUnitTypesByTech));

    let regimentsAddedCount = 0;

    for (const regimentKey in REGIMENT_TYPES) {
        console.log(`[DEBUG REGIMENTS] Chequeando si el regimiento "${regimentKey}" está desbloqueado: ${unlockedUnitTypesByTech.has(regimentKey)}`);
        // La unidad 'ORGANIZATION' debería ser la primera investigada por defecto para desbloquear Infantería Ligera
        // Para asegurar que al menos Infantería Ligera esté disponible desde el inicio si ORGANIZATION no está investigada:
        // O si tienes una lógica para unidades iniciales.
        // Asumiendo que 'ORGANIZATION' siempre está investigada al inicio o es la primera que se desbloquea.
        const isBaseUnitAlwaysAvailable = regimentKey === "Infantería Ligera"; // Permitir esta unidad siempre
        
        if (unlockedUnitTypesByTech.has(regimentKey) || isBaseUnitAlwaysAvailable) {
            const regiment = REGIMENT_TYPES[regimentKey];
            const listItem = document.createElement('li');
            
            let regimentInfo = `${regiment.sprite} ${regimentKey}`; // Añade el sprite al texto
            if (regiment.cost && typeof regiment.cost.oro === 'number') {
                regimentInfo += ` (Oro: ${regiment.cost.oro}`;
                if (regiment.cost.comida && typeof regiment.cost.comida === 'number') { 
                    regimentInfo += `, Comida: ${regiment.cost.comida}`;
                }
                regimentInfo += `)`;
            }
            
            listItem.innerHTML = regimentInfo; // Usar innerHTML para el emoji
            listItem.dataset.type = regimentKey; 
            
            // Verificación de existencia de addRegimentToBuilder antes de asignar onclick
            if (typeof addRegimentToBuilder === "function") { 
                listItem.onclick = () => addRegimentToBuilder(regimentKey); 
            } else {
                console.warn(`Función addRegimentToBuilder no definida. El clic en regimiento "${regimentKey}" no hará nada.`); 
            }
            availableRegimentsListEl.appendChild(listItem);
            regimentsAddedCount++;
        }
    }

    console.log(`%c[DEBUG REGIMENTS] Total de regimientos añadidos a la lista: ${regimentsAddedCount}`, "background: #222; color: #bada55; font-size: 1em;");

    if (regimentsAddedCount === 0) { 
        availableRegimentsListEl.innerHTML = '<li>No hay regimientos disponibles para reclutar (investiga más tecnologías).</li>';
    }
}

/**
 * Añade un regimiento al constructor de divisiones temporal del jugador.
 * @param {string} type - El tipo de regimiento a añadir (ej. "Infantería Ligera").
 */
function addRegimentToBuilder(type) {
    if (!REGIMENT_TYPES[type]) { console.warn("Tipo de regimiento desconocido:", type); return; }
    // Añade una COPIA del objeto regimiento al constructor, para no modificar el original.
    currentDivisionBuilder.push({ ...REGIMENT_TYPES[type], type: type }); 
    updateCreateDivisionModalDisplay();
}

/**
 * Elimina un regimiento del constructor de divisiones temporal del jugador.
 * @param {number} index - El índice del regimiento a eliminar en el array `currentDivisionBuilder`.
 */
function removeRegimentFromBuilder(index) {
    if (index >= 0 && index < currentDivisionBuilder.length) {
        currentDivisionBuilder.splice(index, 1); 
        updateCreateDivisionModalDisplay();
    }
}

/**
 * Actualiza la información (costo y estadísticas) mostrada en el modal de creación de división.
 */
function updateCreateDivisionModalDisplay() {
    // Asegurarse de que todos los elementos DOM necesarios existan.
    if (!currentDivisionRegimentsListEl || !totalDivisionCostDisplay || !totalDivisionStatsDisplay || !finalizeDivisionBtn) return;
    
    currentDivisionRegimentsListEl.innerHTML = ''; // Limpiar la lista actual de regimientos en la división
    let calculatedTotalCost = { oro: 0, comida: 0, hierro: 0, piedra: 0, madera: 0 }; // Inicializar todos los recursos a 0
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    // Iterar sobre los regimientos en el constructor actual
    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        // Mostrar el sprite, tipo y añadir un botón/texto "Quitar"
        li.innerHTML = `${reg.sprite} ${reg.type} <span style="float:right; cursor:pointer; color:red;">(Quitar)</span>`;
        // Asignar el listener para quitar el regimiento
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        // Sumar costos y estadísticas
        if (reg.cost) {
            for (const resourceType in reg.cost) {
                calculatedTotalCost[resourceType] = (calculatedTotalCost[resourceType] || 0) + reg.cost[resourceType];
            }
        }
        calculatedTotalAttack += reg.attack || 0;
        calculatedTotalDefense += reg.defense || 0;
        calculatedTotalHealth += reg.health || 0;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement || Infinity);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange || 0);
        calculatedMaxAttackRange = Math.max(calculatedMaxAttackRange, reg.attackRange || 0); 
    });

    // Formatear el string de costo total
    let costString = [];
    for (const resType in calculatedTotalCost) {
        if (calculatedTotalCost[resType] > 0) {
            costString.push(`${calculatedTotalCost[resType]} ${resType.charAt(0).toUpperCase() + resType.slice(1)}`);
        }
    }
    totalDivisionCostDisplay.textContent = costString.length > 0 ? costString.join(', ') : '0 Oro'; 

    // Actualizar las estadísticas agregadas
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    
    // Habilitar o deshabilitar el botón de finalizar según si hay regimientos
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

/**
 * Maneja la finalización de la creación de una nueva división (unidad).
 * Valida recursos, deduce costos y prepara la unidad para su colocación.
 */
function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { 
        logMessage("La división debe tener al menos un regimiento.");
        return;
    }
    const name = divisionNameInput.value.trim() || "División Anónima";

    let finalCost = { oro: 0, comida: 0, hierro: 0, piedra: 0, madera: 0 };
    let finalAttack = 0, finalDefense = 0, finalHealth = 0;
    let finalMovement = Infinity, finalVision = 0, finalAttackRange = 0, finalInitiative = 0;
    let baseSprite = currentDivisionBuilder.length > 0 ? currentDivisionBuilder[0].sprite : '❓';

    currentDivisionBuilder.forEach(reg => {
        if (reg.cost) {
            for (const resourceType in reg.cost) {
                finalCost[resourceType] = (finalCost[resourceType] || 0) + reg.cost[resourceType];
            }
        }
        finalAttack += reg.attack || 0;
        finalDefense += reg.defense || 0;
        finalHealth += reg.health || 0;
        finalMovement = Math.min(finalMovement, reg.movement || Infinity);
        finalVision = Math.max(finalVision, reg.visionRange || 0);
        finalAttackRange = Math.max(finalAttackRange, reg.attackRange || 0);
        finalInitiative = Math.max(finalInitiative, reg.initiative || 0);
    });
    finalMovement = (finalMovement === Infinity) ? 1 : finalMovement; // Si no hay movimiento, por defecto 1

    let canAfford = true;
    for (const resourceType in finalCost) {
        if (finalCost[resourceType] > 0 && (gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < finalCost[resourceType]) {
            canAfford = false;
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    // Deduce los costos de los recursos del jugador
    for (const resourceType in finalCost) {
        if (finalCost[resourceType] > 0) {
            gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
        }
    }

    // Actualiza la UI de recursos del jugador
    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); 
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    // Crea el objeto de datos de la nueva unidad
    const newDivisionDataObject = {
        id: `u${unitIdCounter++}`, // unitIdCounter viene de state.js
        player: gameState.currentPlayer,
        name: name,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)), // Clonar regimientos para evitar referencias
        attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
        movement: finalMovement, currentMovement: finalMovement,
        visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
        experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
        r: -1, c: -1, // Posición inicial -1,-1, se asignará al colocar
        sprite: baseSprite,
        element: null, // El elemento DOM se creará al colocar
        // Las unidades nuevas se marcan como ya movidas/atacadas en fase de 'play' para no poder actuar en el mismo turno que se crean.
        // En la fase de 'deployment', no se marcan para que puedan ser movidas/atacadas si hay lógica para ello.
        hasMoved: gameState.currentPhase === 'play',
        hasAttacked: gameState.currentPhase === 'play',
        cost: JSON.parse(JSON.stringify(finalCost)) // Guardar el costo final de la unidad
    };

    // Activa el modo de colocación de unidades para que el jugador la sitúe en el mapa.
    placementMode = { active: true, unitData: newDivisionDataObject }; // placementMode viene de state.js
    if (createDivisionModal) createDivisionModal.style.display = 'none'; // Cierra el modal
    currentDivisionBuilder = []; // Limpia el constructor para la próxima división

    logMessage(`División "${name}" creada. Haz clic en el tablero para colocarla.`);
}

// --- LÓGICA DEL MODAL DE CONSTRUCCIÓN DE ESTRUCTURAS ---

/**
 * Abre el modal de construcción de estructuras.
 * @param {object} hexData - Los datos del hexágono donde se desea construir.
 */
function openBuildStructureModal() {
    if (!hexToBuildOn) { 
        logMessage("Error: No hay hexágono seleccionado en el mapa para construir."); 
        return; 
    }
    if (buildHexCoordsDisplay) buildHexCoordsDisplay.textContent = `${hexToBuildOn.r},${hexToBuildOn.c}`;
    populateAvailableStructuresForModal(hexToBuildOn.r, hexToBuildOn.c);
    if (buildStructureModal) buildStructureModal.style.display = 'flex';
}

/**
 * Rellena la lista de estructuras disponibles en el modal de construcción
 * basándose en el hexágono seleccionado, los recursos del jugador y las tecnologías.
 * @param {number} r - Fila del hexágono.
 * @param {number} c - Columna del hexágono.
 */
function populateAvailableStructuresForModal(r, c) {
    if (!availableStructuresListModalEl || !confirmBuildBtn) return;
    availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    confirmBuildBtn.disabled = true;

    const hexData = board[r]?.[c]; // board viene de state.js
    if (!hexData) { logMessage("Error interno: datos de hexágono no encontrados para construcción."); return; }

    if (hexData.isCity) {
        availableStructuresListModalEl.innerHTML = '<li>No se pueden construir Caminos o Fortalezas directamente en una Ciudad.</li>';
        return; 
    }

    const currentPlayer = gameState.currentPlayer; // gameState viene de state.js
    const playerResources = gameState.playerResources[currentPlayer];
    const playerResearchedTechs = playerResources?.researchedTechnologies || [];

    let structureOffered = false;

    // Itera sobre todos los tipos de estructura definidos en STRUCTURE_TYPES (de constants.js)
    for (const type in STRUCTURE_TYPES) {
        const structInfo = STRUCTURE_TYPES[type];
        let canBuildThisStructure = false;
        let reasonForNotBuilding = "";

        // --- LÓGICA DE DESBLOQUEO POR TECNOLOGÍA ---
        let techUnlocked = false;
        if (type === "Camino" && playerResearchedTechs.includes("ENGINEERING")) {
            techUnlocked = true;
        } else if (type === "Fortaleza" && playerResearchedTechs.includes("FORTIFICATIONS")) {
            techUnlocked = true;
        }

        if (!techUnlocked) {
            reasonForNotBuilding = "[Tecnología no investigada]";
        } else {
            // Comprobaciones de terreno y pre-estructura
            if (type === "Camino") {
                // Un camino se puede construir si el terreno es apto Y no hay ya una estructura
                if (!structInfo.buildableOn.includes(hexData.terrain)) {
                    reasonForNotBuilding = "[Terreno no apto]";
                } else if (hexData.structure) { 
                    reasonForNotBuilding = "[Hexágono ya tiene estructura]";
                } else {
                    canBuildThisStructure = true;
                }
            } else if (type === "Fortaleza") {
                // Una fortaleza requiere un Camino existente en ese hexágono Y el terreno base sea apto
                if (hexData.structure !== "Camino") { 
                    reasonForNotBuilding = "[Requiere Camino]";
                } else if (!structInfo.buildableOn.includes(hexData.terrain)) { // Comprueba el terreno base
                    reasonForNotBuilding = "[Terreno base no apto]";
                } else {
                    canBuildThisStructure = true;
                }
            } else { 
                console.warn("Tipo de estructura no manejado en populateAvailableStructuresForModal:", type);
                reasonForNotBuilding = "[Tipo desconocido]";
            }
        }

        // Comprobar recursos
        let hasEnoughResources = true;
        let costString = "";
        if (structInfo.cost) {
            for (const resourceType in structInfo.cost) {
                const costAmount = structInfo.cost[resourceType];
                const playerResourceAmount = playerResources[resourceType] || 0;
                // Formatear el costo para mostrar en la lista
                costString += `${costAmount} ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1).substring(0,2)}, `;
                if (playerResourceAmount < costAmount) {
                    hasEnoughResources = false;
                }
            }
            costString = costString.length > 2 ? costString.slice(0, -2) : "Gratis";
        } else {
            costString = "Gratis";
        }
        if (!hasEnoughResources) {
            reasonForNotBuilding += " [Recursos insuficientes]";
        }

        const li = document.createElement('li');
        li.textContent = `${type} (Costo: ${costString}) ${reasonForNotBuilding}`;
        li.dataset.type = type;

        // Si se puede construir (por tecnología, terreno y recursos), se hace seleccionable
        if (canBuildThisStructure && hasEnoughResources && techUnlocked) {
            structureOffered = true;
            li.addEventListener('click', () => {
                availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type; // Guarda el tipo de estructura seleccionada
                confirmBuildBtn.disabled = false; // Habilita el botón de confirmar
            });
        } else {
            // Si no se puede construir, se desactiva visualmente
            li.style.opacity = 0.6;
            li.style.cursor = 'not-allowed';
        }
        availableStructuresListModalEl.appendChild(li);
    }
    
    // Si no se ofreció ninguna estructura, muestra un mensaje por defecto
    if (!structureOffered && !hexData.isCity) { 
         availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles para construir aquí o con tus recursos.</li>';
    }
}

/**
 * Maneja la confirmación de la construcción de una estructura.
 * Deduce costos, actualiza el estado del hexágono y refresca la UI.
 */
function handleConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) {
        logMessage("Error: No hay estructura seleccionada o hexágono de destino.");
        return;
    }

    const structureTypeKey = selectedStructureToBuild;
    const r = hexToBuildOn.r;
    const c = hexToBuildOn.c;
    const structureData = STRUCTURE_TYPES[structureTypeKey]; // STRUCTURE_TYPES viene de constants.js
    const hexCurrentData = board[r]?.[c]; // board viene de state.js

    // Validaciones de último minuto (para evitar cheats o inconsistencias)
    if (!hexCurrentData) {
        logMessage("Error: Hexágono no válido para construir.");
        return;
    }
    if (hexCurrentData.isCity) {
        logMessage("No se puede construir aquí, ya es una ciudad.");
        return;
    }
    if (structureTypeKey === "Fortaleza" && hexCurrentData.structure !== "Camino") {
        logMessage("La Fortaleza requiere un Camino existente en este hexágono.");
        return;
    }
    if (structureTypeKey === "Camino" && hexCurrentData.structure) {
        logMessage("Ya hay una estructura aquí, no se puede construir un Camino.");
        return;
    }

    // Verificar y deducir recursos
    for (const resourceType in structureData.cost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < structureData.cost[resourceType]) {
            logMessage(`No tienes suficientes ${resourceType}. Necesitas ${structureData.cost[resourceType]}.`); 
            return;
        }
    }
    for (const resourceType in structureData.cost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= structureData.cost[resourceType]; 
    }

    // Asignar la estructura al hexágono
    hexCurrentData.structure = structureTypeKey;
    logMessage(`${structureTypeKey} construido en (${r},${c}).`);

    // Actualizar la visualización del hexágono y la UI
    if (typeof renderSingleHexVisuals === "function") { // renderSingleHexVisuals viene de boardManager.js
        renderSingleHexVisuals(r, c);
    } else {
        console.warn("handleConfirmBuildStructure: renderSingleHexVisuals no está definida.");
    }
    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo();
    } else {
        console.warn("handleConfirmBuildStructure: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    // Cerrar el modal y resetear el estado de construcción
    if (buildStructureModal) buildStructureModal.style.display = 'none';
    if (typeof deselectUnit === "function") deselectUnit(); // Deseleccionar la unidad después de construir
    
    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
        UIManager.hideContextualPanel();
    }

    hexToBuildOn = null;
    selectedStructureToBuild = null;
    if (confirmBuildBtn) confirmBuildBtn.disabled = true;
}

// --- LÓGICA DEL MODAL DE BIENVENIDA Y AYUDA ---

/**
 * Muestra el modal de bienvenida y ayuda al inicio del juego.
 * Carga el contenido de TUTORIAL_MESSAGES.
 */
function showWelcomeHelpModal() {
    // Comprobar si el usuario ha marcado "No mostrar de nuevo"
    const doNotShow = localStorage.getItem('hexEvolvedDoNotShowHelp');
    if (doNotShow === 'true') {
        console.log("Modal de bienvenida no mostrado: el usuario lo ha desactivado.");
        if (typeof showScreen === "function" && mainMenuScreenEl) { // showScreen y mainMenuScreenEl de campaignManager.js
            showScreen(mainMenuScreenEl); // Ir directamente al menú principal
        }
        return;
    }

    // Asegurarse de que los elementos DOM y los mensajes existan
    if (!welcomeHelpModalEl || !TUTORIAL_MESSAGES || !welcomeHelpTitleEl || !welcomeHelpSectionsEl || !welcomeHelpFooterEl) {
        console.error("Error: Elementos del modal de bienvenida o mensajes no encontrados.");
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl);
        }
        return;
    }

    // Llenar el contenido del modal con los datos de TUTORIAL_MESSAGES (de constants.js)
    welcomeHelpTitleEl.textContent = TUTORIAL_MESSAGES.title;
    welcomeHelpSectionsEl.innerHTML = ''; // Limpiar secciones anteriores
    TUTORIAL_MESSAGES.sections.forEach(section => {
        const sectionDiv = document.createElement('div');
        const heading = document.createElement('h3');
        heading.textContent = section.heading;
        const content = document.createElement('p');
        content.innerHTML = section.content; // Usar innerHTML para permitir <br>, <b>, etc.
        sectionDiv.appendChild(heading);
        sectionDiv.appendChild(content);
        welcomeHelpSectionsEl.appendChild(sectionDiv);
    });
    welcomeHelpFooterEl.textContent = TUTORIAL_MESSAGES.footer;

    // Mostrar el modal
    welcomeHelpModalEl.style.display = 'flex';
}

/**
 * Cierra el modal de bienvenida y guarda la preferencia si el usuario lo indicó.
 */
function closeWelcomeHelpModal() {
    if (welcomeHelpModalEl) {
        welcomeHelpModalEl.style.display = 'none';
        // Guardar la preferencia si el checkbox está marcado (doNotShowAgainCheckbox de domElements.js)
        if (doNotShowAgainCheckbox && doNotShowAgainCheckbox.checked) {
            localStorage.setItem('hexEvolvedDoNotShowHelp', 'true');
        }
        // Después de cerrar el modal de ayuda, mostrar el menú principal
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl);
        }
    }
}

// Esta función parece ser una función de depuración para forzar la visualización.
// No parece estar siendo usada en el flujo normal, pero la mantengo si tiene un propósito específico.
function openCreateDivisionModalVisual() {
    const modal = document.getElementById('createDivisionModal');
    if (modal) {
        console.log(`%c[DEBUG MODAL APERTURA] Forzando visualización del modal CreateDivisionModal.`, "background: #222; color: #fff; font-size: 1.1em;");
        console.log(`[DEBUG MODAL APERTURA] Estado inicial: display=${modal.style.display}, z-index=${window.getComputedStyle(modal).zIndex}`);
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '99999'; 
        console.log(`[DEBUG MODAL APERTURA] Estado final: display=${modal.style.display}, z-index=${window.getComputedStyle(modal).zIndex}`);
    } else {
        console.error("CRÍTICO: El elemento #createDivisionModal no se encontró en el DOM. NO SE PUEDE ABRIR VISUALMENTE.");
    }
}