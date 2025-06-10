// En modalLogic.js

// ... (asegúrate de que las variables globales currentDivisionBuilder, hexToBuildOn, selectedStructureToBuild
// están declaradas al principio del archivo CON 'let') ...

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
function openCreateDivisionModal() {
    console.log("%c[DEBUG MODAL - openCreateDivisionModal] Función de apertura y preparación de datos.", "background: #555; color: #fff;");

    // Validaciones para la fase de juego
    if (gameState.currentPhase === "play") {
        let canRecruit = gameState.cities.some(city => 
            city.owner === gameState.currentPlayer && 
            board[city.r]?.[city.c] && 
            (board[city.r][city.c].isCapital || board[city.r][city.c].structure === "Fortaleza") &&
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
        if (unlockedUnitTypesByTech.has(regimentKey)) {
            const regiment = REGIMENT_TYPES[regimentKey];
            const listItem = document.createElement('li');
            
            let regimentInfo = `${regimentKey}`;
            if (regiment.cost && typeof regiment.cost.oro === 'number') {
                regimentInfo += ` (Oro: ${regiment.cost.oro}`;
                if (regiment.cost.comida && typeof regiment.cost.comida === 'number') { 
                    regimentInfo += `, Comida: ${regiment.cost.comida}`;
                }
                regimentInfo += `)`;
            }
            
            listItem.textContent = regimentInfo;
            listItem.dataset.type = regimentKey; 
            
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

function addRegimentToBuilder(type) {
    if (!REGIMENT_TYPES[type]) { console.warn("Tipo de regimiento desconocido:", type); return; }
    currentDivisionBuilder.push({ ...REGIMENT_TYPES[type], type: type }); 
    updateCreateDivisionModalDisplay();
}

function removeRegimentFromBuilder(index) {
    if (index >= 0 && index < currentDivisionBuilder.length) {
        currentDivisionBuilder.splice(index, 1); 
        updateCreateDivisionModalDisplay();
    }
}

function updateCreateDivisionModalDisplay() {
    if (!currentDivisionRegimentsListEl || !totalDivisionCostDisplay || !totalDivisionStatsDisplay || !finalizeDivisionBtn) return;
    
    currentDivisionRegimentsListEl.innerHTML = '';
    let calculatedTotalCost = { oro: 0 }; 
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        li.textContent = `${reg.type} (Quitar)`;
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        if(reg.cost.oro) calculatedTotalCost.oro += reg.cost.oro;
        calculatedTotalAttack += reg.attack;
        calculatedTotalDefense += reg.defense;
        calculatedTotalHealth += reg.health;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange);
        calculatedMaxAttackRange = Math.max(calculatedMaxAttackRange, reg.attackRange);
    });

    totalDivisionCostDisplay.textContent = `${calculatedTotalCost.oro} Oro`; 
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { 
        logMessage("La división debe tener al menos un regimiento.");
        return;
    }
    const name = divisionNameInput.value.trim() || "División Anónima";

    let finalCost = { oro: 0 };
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
        finalMovement = Math.min(finalMovement, reg.movement || 1);
        finalVision = Math.max(finalVision, reg.visionRange || 0);
        finalAttackRange = Math.max(finalAttackRange, reg.attackRange || 0);
        finalInitiative = Math.max(finalInitiative, reg.initiative || 0);
    });
    finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;

    let canAfford = true;
    for (const resourceType in finalCost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < finalCost[resourceType]) {
            canAfford = false;
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    for (const resourceType in finalCost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); 
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    const newDivisionDataObject = {
        id: `u${unitIdCounter++}`,
        player: gameState.currentPlayer,
        name: name,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
        movement: finalMovement, currentMovement: finalMovement,
        visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
        experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
        r: -1, c: -1,
        sprite: baseSprite,
        element: null,
        hasMoved: gameState.currentPhase === 'play',
        hasAttacked: gameState.currentPhase === 'play',
        cost: JSON.parse(JSON.stringify(finalCost))
    };

    placementMode = { active: true, unitData: newDivisionDataObject };
    if (createDivisionModal) createDivisionModal.style.display = 'none';
    currentDivisionBuilder = [];

    logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

// --- LÓGICA DEL MODAL DE CONSTRUCCIÓN DE ESTRUCTURAS ---
function openBuildStructureModal() {
    if (!hexToBuildOn) { 
        logMessage("Error: No hay hexágono seleccionado en el mapa para construir."); 
        return; 
    }
    if (buildHexCoordsDisplay) buildHexCoordsDisplay.textContent = `${hexToBuildOn.r},${hexToBuildOn.c}`;
    populateAvailableStructuresForModal(hexToBuildOn.r, hexToBuildOn.c);
    if (buildStructureModal) buildStructureModal.style.display = 'flex';
}

function populateAvailableStructuresForModal(r, c) {
    if (!availableStructuresListModalEl || !confirmBuildBtn) return;
    availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    confirmBuildBtn.disabled = true;

    const hexData = board[r]?.[c];
    if (!hexData) { logMessage("Error interno: datos de hexágono no encontrados para construcción."); return; }

    if (hexData.isCity) {
        availableStructuresListModalEl.innerHTML = '<li>No se pueden construir Caminos o Fortalezas directamente en una Ciudad.</li>';
        return; 
    }

    const currentPlayer = gameState.currentPlayer;
    const playerResources = gameState.playerResources[currentPlayer];
    const playerResearchedTechs = playerResources?.researchedTechnologies || [];

    let structureOffered = false;

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
                if (!structInfo.buildableOn.includes(hexData.terrain)) {
                    reasonForNotBuilding = "[Terreno no apto]";
                } else if (hexData.structure) { 
                    reasonForNotBuilding = "[Hexágono ya tiene estructura]";
                } else {
                    canBuildThisStructure = true;
                }
            } else if (type === "Fortaleza") {
                if (hexData.structure !== "Camino") { 
                    reasonForNotBuilding = "[Requiere Camino]";
                } else if (!structInfo.buildableOn.includes(hexData.terrain)) {
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

        if (canBuildThisStructure && hasEnoughResources && techUnlocked) {
            structureOffered = true;
            li.addEventListener('click', () => {
                availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type;
                confirmBuildBtn.disabled = false;
            });
        } else {
            li.style.opacity = 0.6;
            li.style.cursor = 'not-allowed';
        }
        availableStructuresListModalEl.appendChild(li);
    }
    
    // Esta sección se movió a populateAvailableRegimentsForModal, aquí no aplica
    // for (const techId of playerResearchedTechs) {
    //     const techData = TECHNOLOGY_TREE_DATA[techId];
    //     if (techData && techData.unlocksUnits && Array.isArray(techData.unlocksUnits)) {
    //         techData.unlocksUnits.forEach(unitTypeKey => {
    //             unlockedUnitTypesByTech.add(unitTypeKey);
    //         });
    //     }
    // }

    if (!structureOffered && !hexData.isCity) { 
         availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles para construir aquí o con tus recursos.</li>';
    }
}

function addRegimentToBuilder(type) {
    if (!REGIMENT_TYPES[type]) { console.warn("Tipo de regimiento desconocido:", type); return; }
    currentDivisionBuilder.push({ ...REGIMENT_TYPES[type], type: type }); 
    updateCreateDivisionModalDisplay();
}

function removeRegimentFromBuilder(index) {
    if (index >= 0 && index < currentDivisionBuilder.length) {
        currentDivisionBuilder.splice(index, 1); 
        updateCreateDivisionModalDisplay();
    }
}

function updateCreateDivisionModalDisplay() {
    if (!currentDivisionRegimentsListEl || !totalDivisionCostDisplay || !totalDivisionStatsDisplay || !finalizeDivisionBtn) return;
    
    currentDivisionRegimentsListEl.innerHTML = '';
    let calculatedTotalCost = { oro: 0 }; 
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        li.textContent = `${reg.type} (Quitar)`;
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        if(reg.cost.oro) calculatedTotalCost.oro += reg.cost.oro;
        calculatedTotalAttack += reg.attack;
        calculatedTotalDefense += reg.defense;
        calculatedTotalHealth += reg.health;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange);
        calculatedMaxAttackRange = Math.max(calculatedTotalAttackRange, reg.attackRange); // Corregido: calculatedMaxAttackRange en lugar de calculatedTotalAttackRange
    });

    totalDivisionCostDisplay.textContent = `${calculatedTotalCost.oro} Oro`; 
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { 
        logMessage("La división debe tener al menos un regimiento.");
        return;
    }
    const name = divisionNameInput.value.trim() || "División Anónima";

    let finalCost = { oro: 0 };
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
        finalMovement = Math.min(finalMovement, reg.movement || 1);
        finalVision = Math.max(finalVision, reg.visionRange || 0);
        finalAttackRange = Math.max(finalAttackRange, reg.attackRange || 0);
        finalInitiative = Math.max(finalInitiative, reg.initiative || 0);
    });
    finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;

    let canAfford = true;
    for (const resourceType in finalCost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < finalCost[resourceType]) {
            canAfford = false;
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    for (const resourceType in finalCost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); 
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    const newDivisionDataObject = {
        id: `u${unitIdCounter++}`,
        player: gameState.currentPlayer,
        name: name,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
        movement: finalMovement, currentMovement: finalMovement,
        visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
        experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
        r: -1, c: -1,
        sprite: baseSprite,
        element: null,
        hasMoved: gameState.currentPhase === 'play',
        hasAttacked: gameState.currentPhase === 'play',
        cost: JSON.parse(JSON.stringify(finalCost))
    };

    placementMode = { active: true, unitData: newDivisionDataObject };
    if (createDivisionModal) createDivisionModal.style.display = 'none';
    currentDivisionBuilder = [];

    logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

// --- LÓGICA DEL MODAL DE CONSTRUCCIÓN DE ESTRUCTURAS ---
function openBuildStructureModal() {
    if (!hexToBuildOn) { 
        logMessage("Error: No hay hexágono seleccionado en el mapa para construir."); 
        return; 
    }
    if (buildHexCoordsDisplay) buildHexCoordsDisplay.textContent = `${hexToBuildOn.r},${hexToBuildOn.c}`;
    populateAvailableStructuresForModal(hexToBuildOn.r, hexToBuildOn.c);
    if (buildStructureModal) buildStructureModal.style.display = 'flex';
}

function populateAvailableStructuresForModal(r, c) {
    if (!availableStructuresListModalEl || !confirmBuildBtn) return;
    availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    confirmBuildBtn.disabled = true;

    const hexData = board[r]?.[c];
    if (!hexData) { logMessage("Error interno: datos de hexágono no encontrados para construcción."); return; }

    if (hexData.isCity) {
        availableStructuresListModalEl.innerHTML = '<li>No se pueden construir Caminos o Fortalezas directamente en una Ciudad.</li>';
        return; 
    }

    const currentPlayer = gameState.currentPlayer;
    const playerResources = gameState.playerResources[currentPlayer];
    const playerResearchedTechs = playerResources?.researchedTechnologies || [];

    let structureOffered = false;

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
                if (!structInfo.buildableOn.includes(hexData.terrain)) {
                    reasonForNotBuilding = "[Terreno no apto]";
                } else if (hexData.structure) { 
                    reasonForNotBuilding = "[Hexágono ya tiene estructura]";
                } else {
                    canBuildThisStructure = true;
                }
            } else if (type === "Fortaleza") {
                if (hexData.structure !== "Camino") { 
                    reasonForNotBuilding = "[Requiere Camino]";
                } else if (!structInfo.buildableOn.includes(hexData.terrain)) {
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

        if (canBuildThisStructure && hasEnoughResources && techUnlocked) {
            structureOffered = true;
            li.addEventListener('click', () => {
                availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type;
                confirmBuildBtn.disabled = false;
            });
        } else {
            li.style.opacity = 0.6;
            li.style.cursor = 'not-allowed';
        }
        availableStructuresListModalEl.appendChild(li);
    }
    
    // Esta sección se movió a populateAvailableRegimentsForModal, aquí no aplica
    // for (const techId of playerResearchedTechs) {
    //     const techData = TECHNOLOGY_TREE_DATA[techId];
    //     if (techData && techData.unlocksUnits && Array.isArray(techData.unlocksUnits)) {
    //         techData.unlocksUnits.forEach(unitTypeKey => {
    //             unlockedUnitTypesByTech.add(unitTypeKey);
    //         });
    //     }
    // }

    if (!structureOffered && !hexData.isCity) { 
         availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles para construir aquí o con tus recursos.</li>';
    }
}

function addRegimentToBuilder(type) {
    if (!REGIMENT_TYPES[type]) { console.warn("Tipo de regimiento desconocido:", type); return; }
    currentDivisionBuilder.push({ ...REGIMENT_TYPES[type], type: type }); 
    updateCreateDivisionModalDisplay();
}

function removeRegimentFromBuilder(index) {
    if (index >= 0 && index < currentDivisionBuilder.length) {
        currentDivisionBuilder.splice(index, 1); 
        updateCreateDivisionModalDisplay();
    }
}

function updateCreateDivisionModalDisplay() {
    if (!currentDivisionRegimentsListEl || !totalDivisionCostDisplay || !totalDivisionStatsDisplay || !finalizeDivisionBtn) return;
    
    currentDivisionRegimentsListEl.innerHTML = '';
    let calculatedTotalCost = { oro: 0 }; 
    let calculatedTotalAttack = 0, calculatedTotalDefense = 0, calculatedTotalHealth = 0;
    let calculatedMinMovement = Infinity, calculatedMaxVision = 0, calculatedMaxAttackRange = 0;

    currentDivisionBuilder.forEach((reg, index) => {
        const li = document.createElement('li');
        li.textContent = `${reg.type} (Quitar)`;
        li.addEventListener('click', () => removeRegimentFromBuilder(index));
        currentDivisionRegimentsListEl.appendChild(li);

        if(reg.cost.oro) calculatedTotalCost.oro += reg.cost.oro;
        calculatedTotalAttack += reg.attack;
        calculatedTotalDefense += reg.defense;
        calculatedTotalHealth += reg.health;
        calculatedMinMovement = Math.min(calculatedMinMovement, reg.movement);
        calculatedMaxVision = Math.max(calculatedMaxVision, reg.visionRange);
        calculatedMaxAttackRange = Math.max(calculatedMaxAttackRange, reg.attackRange); // Corregido: calculatedMaxAttackRange en lugar de calculatedTotalAttackRange
    });

    totalDivisionCostDisplay.textContent = `${calculatedTotalCost.oro} Oro`; 
    totalDivisionStatsDisplay.textContent = 
        `${calculatedTotalAttack}A / ${calculatedTotalDefense}D / ${calculatedTotalHealth}S / ` +
        `${calculatedMinMovement === Infinity ? 0 : calculatedMinMovement}M / ` +
        `${calculatedMaxVision}V / ${calculatedMaxAttackRange}R.A`;
    finalizeDivisionBtn.disabled = currentDivisionBuilder.length === 0;
}

function handleFinalizeDivision() {
    if (!currentDivisionBuilder || currentDivisionBuilder.length === 0) { 
        logMessage("La división debe tener al menos un regimiento.");
        return;
    }
    const name = divisionNameInput.value.trim() || "División Anónima";

    let finalCost = { oro: 0 };
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
        finalMovement = Math.min(finalMovement, reg.movement || 1);
        finalVision = Math.max(finalVision, reg.visionRange || 0);
        finalAttackRange = Math.max(finalAttackRange, reg.attackRange || 0);
        finalInitiative = Math.max(finalInitiative, reg.initiative || 0);
    });
    finalMovement = (finalMovement === Infinity) ? 1 : finalMovement;

    let canAfford = true;
    for (const resourceType in finalCost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < finalCost[resourceType]) {
            canAfford = false;
            logMessage(`No tienes suficiente ${resourceType}. Necesitas ${finalCost[resourceType]}.`);
            break;
        }
    }

    if (!canAfford) {
        return;
    }

    for (const resourceType in finalCost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= finalCost[resourceType];
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo(); 
    } else {
        console.warn("modalLogic: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    const newDivisionDataObject = {
        id: `u${unitIdCounter++}`,
        player: gameState.currentPlayer,
        name: name,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        attack: finalAttack, defense: finalDefense, maxHealth: finalHealth, currentHealth: finalHealth,
        movement: finalMovement, currentMovement: finalMovement,
        visionRange: finalVision, attackRange: finalAttackRange, initiative: finalInitiative,
        experience: 0, maxExperience: 500, hasRetaliatedThisTurn: false,
        r: -1, c: -1,
        sprite: baseSprite,
        element: null,
        hasMoved: gameState.currentPhase === 'play',
        hasAttacked: gameState.currentPhase === 'play',
        cost: JSON.parse(JSON.stringify(finalCost))
    };

    placementMode = { active: true, unitData: newDivisionDataObject };
    if (createDivisionModal) createDivisionModal.style.display = 'none';
    currentDivisionBuilder = [];

    logMessage(`División "${name}" creada. Haz clic para colocarla.`);
}

function handleConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) {
        logMessage("Error: No hay estructura seleccionada o hexágono de destino.");
        return;
    }

    const structureTypeKey = selectedStructureToBuild;
    const r = hexToBuildOn.r;
    const c = hexToBuildOn.c;
    const structureData = STRUCTURE_TYPES[structureTypeKey];
    const hexCurrentData = board[r]?.[c];

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

    for (const resourceType in structureData.cost) {
        if ((gameState.playerResources[gameState.currentPlayer][resourceType] || 0) < structureData.cost[resourceType]) {
            logMessage(`No tienes suficientes ${resourceType}. Necesitas ${structureData.cost[resourceType]}.`); // Corregido: `finalCost` a `structureData.cost`
            return;
        }
    }
    for (const resourceType in structureData.cost) {
        gameState.playerResources[gameState.currentPlayer][resourceType] -= structureData.cost[resourceType]; // <<== CORREGIDO AQUÍ
    }

    hexCurrentData.structure = structureTypeKey;
    logMessage(`${structureTypeKey} construido en (${r},${c}).`);

    if (typeof renderSingleHexVisuals === "function") {
        renderSingleHexVisuals(r, c);
    } else {
        console.warn("handleConfirmBuildStructure: renderSingleHexVisuals no está definida.");
    }

    if (typeof UIManager !== 'undefined' && typeof UIManager.updatePlayerAndPhaseInfo === 'function') {
        UIManager.updatePlayerAndPhaseInfo();
    } else {
        console.warn("handleConfirmBuildStructure: UIManager.updatePlayerAndPhaseInfo no disponible para actualizar UI de recursos.");
    }

    if (buildStructureModal) buildStructureModal.style.display = 'none';
    if (typeof deselectUnit === "function") deselectUnit();
    
    if (typeof UIManager !== 'undefined' && typeof UIManager.hideContextualPanel === 'function') {
        UIManager.hideContextualPanel();
    }

    hexToBuildOn = null;
    selectedStructureToBuild = null;
    if (confirmBuildBtn) confirmBuildBtn.disabled = true;
}

function showWelcomeHelpModal() {
    // Comprobar si el usuario ha marcado "No mostrar de nuevo"
    const doNotShow = localStorage.getItem('hexEvolvedDoNotShowHelp');
    if (doNotShow === 'true') {
        console.log("Modal de bienvenida no mostrado: el usuario lo ha desactivado.");
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl); // Ir directamente al menú principal
        }
        return;
    }

    if (!welcomeHelpModalEl || !TUTORIAL_MESSAGES) {
        console.error("Error: Elementos del modal de bienvenida o mensajes no encontrados.");
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl);
        }
        return;
    }

    // Llenar el contenido del modal
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

function closeWelcomeHelpModal() {
    if (welcomeHelpModalEl) {
        welcomeHelpModalEl.style.display = 'none';
        // Guardar la preferencia si el checkbox está marcado
        if (doNotShowAgainCheckbox && doNotShowAgainCheckbox.checked) {
            localStorage.setItem('hexEvolvedDoNotShowHelp', 'true');
        }
        // Después de cerrar el modal de ayuda, mostrar el menú principal
        if (typeof showScreen === "function" && mainMenuScreenEl) {
            showScreen(mainMenuScreenEl);
        }
    }
}

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