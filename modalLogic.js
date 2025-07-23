// modalLogic.js

// NUEVA FUNCIÓN "REQUEST" PARA CONSTRUIR
function RequestConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) return;

    const isNetworkGame = NetworkManager.conn && NetworkManager.conn.open;
    if (isNetworkGame) {
         console.log(`[Red - Petición] Solicitando construir ${selectedStructureToBuild}.`);
         NetworkManager.enviarDatos({ /* ... payload de red ... */ });
         domElements.buildStructureModal.style.display = 'none';
         UIManager.hideContextualPanel();
         return;
    }
    handleConfirmBuildStructure();
}

function addModalEventListeners() {
    console.log("modalLogic: addModalEventListeners INICIADO.");

    if (typeof domElements === 'undefined' || !domElements.domElementsInitialized) {
         console.error("modalLogic: CRÍTICO: domElements no está definido o no se ha inicializado completamente.");
         return;
    }

    if (domElements.closeTechTreeBtn) {
        domElements.closeTechTreeBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (typeof closeTechTreeScreen === "function") closeTechTreeScreen();
            else console.error("modalLogic: closeTechTreeScreen no definida.");
        });
    } else { 
        console.warn("modalLogic: closeTechTreeBtn no encontrado en domElements."); 
    }

    if (domElements.closeAdvancedSplitModalBtn) {
        domElements.closeAdvancedSplitModalBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';
            if (typeof cancelPreparingAction === "function") cancelPreparingAction(); 
            _unitBeingSplit = null; 
        });
    } 

    if (domElements.cancelAdvancedSplitBtn) {
        domElements.cancelAdvancedSplitBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';
            if (typeof cancelPreparingAction === "function") cancelPreparingAction(); 
            _unitBeingSplit = null; 
        });
    } 
    
    if (domElements.finalizeAdvancedSplitBtn) {
        domElements.finalizeAdvancedSplitBtn.addEventListener('click', (event) => { 
            event.stopPropagation(); 
            if (typeof handleFinalizeSplit === "function") handleFinalizeSplit(); 
            else console.error("modalLogic: La función handleFinalizeSplit no está definida.");
        });
    }

    document.querySelectorAll('.modal .close-button').forEach(btn => {
        btn.addEventListener('click', function(event) {
            event.stopPropagation();
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                if (modal.id === 'advancedSplitUnitModal' || modal.id === 'createDivisionModal' || modal.id === 'buildStructureModal') {
                    if (typeof cancelPreparingAction === "function") cancelPreparingAction();
                }
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.matches('.modal')) {
            event.target.style.display = 'none';
            if (event.target.id === 'advancedSplitUnitModal' || event.target.id === 'createDivisionModal' || event.target.id === 'buildStructureModal') {
                if (typeof cancelPreparingAction === "function") cancelPreparingAction();
            }
        }
    });

    if (domElements.closeUnitManagementModalBtn) {
        domElements.closeUnitManagementModalBtn.addEventListener('click', closeUnitManagementModalAndCancel);
    } else {
        console.warn("modalLogic: closeUnitManagementModalBtn no encontrado.");
    }

    if (domElements.cancelUnitManagementBtn) {
        domElements.cancelUnitManagementBtn.addEventListener('click', closeUnitManagementModalAndCancel);
    } else {
        console.warn("modalLogic: cancelUnitManagementBtn no encontrado.");
    }

    if (domElements.finalizeUnitManagementBtn) {
        domElements.finalizeUnitManagementBtn.addEventListener('click', handleFinalizeDivision);
    } else {
        console.warn("modalLogic: finalizeUnitManagementBtn no encontrado.");
    }

    if (domElements.confirmBuildBtn) {
        domElements.confirmBuildBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof handleConfirmBuildStructure === 'function') handleConfirmBuildStructure();
            else console.error("modalLogic: handleConfirmBuildStructure no definida.");
        });
    } else console.warn("modalLogic: confirmBuildBtn (Construir Estructura) no encontrado.");
    
    if (domElements.closeWelcomeHelpBtn) {
        domElements.closeWelcomeHelpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof closeWelcomeHelpModal === 'function') closeWelcomeHelpModal();
            else console.error("modalLogic: closeWelcomeHelpModal no definida.");
        });
    } else console.warn("modalLogic: closeWelcomeHelpBtn no encontrado.");
    
    if (domElements.startGameFromHelpBtn) {
        domElements.startGameFromHelpBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (typeof closeWelcomeHelpModal === 'function') closeWelcomeHelpModal();
            else console.error("modalLogic: closeWelcomeHelpModal no definida para iniciar juego desde ayuda.");
        });
    } else console.warn("modalLogic: startGameFromHelpBtn no encontrado.");

    console.log("modalLogic: addModalEventListeners FINALIZADO.");
}

function openBuildStructureModal() {
    // --- Log inicial ---
    console.log("--- INICIO openBuildStructureModal ---");

    if (!hexToBuildOn) {
        console.error("  -> ERROR: hexToBuildOn es nulo. Saliendo.");
        return;
    }
    const { r, c } = hexToBuildOn;
    const hex = board[r]?.[c];
    if (!hex) {
        console.error(`  -> ERROR: No se encontró hexágono en board[${r}][${c}]. Saliendo.`);
        return;
    }
    if (!domElements.buildStructureModal || !domElements.availableStructuresListModalEl) {
        console.error("  -> ERROR: Elementos del DOM del modal no encontrados. Saliendo.");
        return;
    }

    console.log(`  [Paso 1] Preparando modal para hex (${r},${c}). Estructura actual: ${hex.structure || 'Ninguna'}.`);
    
    // Preparar UI
    domElements.buildHexCoordsDisplay.textContent = `${r},${c}`;
    domElements.availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    domElements.confirmBuildBtn.disabled = true;

    const playerResources = gameState.playerResources[gameState.currentPlayer];
    const playerTechs = playerResources.researchedTechnologies || [];
    let buildableOptions = [];

    console.log("  [Paso 2] Empezando a iterar sobre todas las estructuras en STRUCTURE_TYPES...");

    for (const structureId in STRUCTURE_TYPES) {
        const structureInfo = STRUCTURE_TYPES[structureId];
        console.log(`\n  --- Validando: ${structureId.toUpperCase()} ---`);
        let isOptionForHex = false;
        
        // **VALIDACIÓN DE PROGRESIÓN (MEJORA o NUEVA)**
        if (hex.structure) {
            console.log(`    - Hex tiene estructura: "${hex.structure}". ¿Es "${structureId}" la siguiente mejora?`);
            if (STRUCTURE_TYPES[hex.structure]?.nextUpgrade === structureId) {
                isOptionForHex = true;
                console.log(`      -> SÍ. Es una mejora válida.`);
            } else {
                console.log(`      -> NO. Se esperaba "${STRUCTURE_TYPES[hex.structure]?.nextUpgrade}", se está evaluando "${structureId}".`);
            }
        } else {
            console.log(`    - Hex está vacío. ¿Se puede construir "${structureId}" desde cero aquí (terreno "${hex.terrain}")?`);
            if (structureInfo.buildableOn?.includes(hex.terrain)) {
                isOptionForHex = true;
                console.log(`      -> SÍ. El terreno es compatible.`);
            } else {
                 console.log(`      -> NO. Terreno no compatible. Requiere: ${structureInfo.buildableOn?.join(', ')}.`);
            }
        }

        if (!isOptionForHex) {
            console.log(`    - RESULTADO: ${structureId} NO es una opción para este hex. Saltando a la siguiente.`);
            continue;
        }

        // Si es una opción, seguir validando los requisitos...
        console.log(`    - ${structureId} es una opción válida. Comprobando requisitos...`);
        let canBuild = true;

        // **VALIDACIÓN DE TECNOLOGÍA**
        if (structureInfo.requiredTech) {
             console.log(`      - Requiere tecnología: "${structureInfo.requiredTech}". ¿La tiene el jugador?`);
             if (playerTechs.includes(structureInfo.requiredTech)) {
                 console.log(`        -> SÍ. Tecnología encontrada.`);
             } else {
                 console.log(`        -> NO. Tecnología NO encontrada.`);
                 canBuild = false;
             }
        } else {
             console.log(`      - No requiere tecnología.`);
        }

        // **VALIDACIÓN DE COSTE**
        if (structureInfo.cost && canBuild) {
            console.log(`      - Comprobando coste: ${JSON.stringify(structureInfo.cost)}`);
            for (const resKey in structureInfo.cost) {
                const amountNeeded = structureInfo.cost[resKey];
                
                if (resKey === 'Colono') {
                    console.log(`        - Comprobando requisito: Colono`);
                    if (selectedUnit) {
                        console.log(`          - Unidad seleccionada: SÍ (${selectedUnit.name})`);
                        if (selectedUnit.isSettler) {
                             console.log(`          - ¿Es Colono?: SÍ`);
                             if (selectedUnit.r === r && selectedUnit.c === c) {
                                 console.log(`          - ¿Está en la casilla correcta?: SÍ`);
                             } else {
                                  console.log(`          - ¿Está en la casilla correcta?: NO. Unidad en (${selectedUnit.r},${selectedUnit.c})`);
                                  canBuild = false;
                             }
                        } else {
                             console.log(`          - ¿Es Colono?: NO`);
                             canBuild = false;
                        }
                    } else {
                         console.log(`          - Unidad seleccionada: NO`);
                         canBuild = false;
                    }

                } else { // Recursos normales
                    const playerAmount = playerResources[resKey] || 0;
                     console.log(`        - Comprobando requisito: ${amountNeeded} de ${resKey}. Tiene: ${playerAmount}`);
                    if (playerAmount < amountNeeded) {
                        console.log(`          -> NO. Fondos insuficientes.`);
                        canBuild = false;
                    } else {
                         console.log(`          -> SÍ. Fondos suficientes.`);
                    }
                }
                if (!canBuild) break; // Si ya falló un requisito del coste, no seguir.
            }
        }
        
        console.log(`    - RESULTADO FINAL PARA ${structureId}: ${canBuild ? "Se puede construir." : "NO se puede construir."}`);

        if (canBuild) {
            buildableOptions.push({
                type: structureId, name: structureInfo.name, sprite: structureInfo.sprite,
                costStr: Object.entries(structureInfo.cost || {}).map(([k,v]) => `${v} ${k}`).join(', ') || "Gratis"
            });
        }
    }
    
    // --- Lógica final para poblar y mostrar el modal (sin cambios) ---
    console.log(`\n  [Paso 3] Fin de la iteración. Opciones construibles encontradas: ${buildableOptions.length}`);
    
    if (buildableOptions.length === 0) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No hay mejoras o construcciones disponibles aquí (o no tienes los requisitos).</li>';
    } else {
        buildableOptions.forEach(option => {
            const li = document.createElement('li');
            li.textContent = `${option.sprite} ${option.name} (Coste: ${option.costStr})`;
            li.addEventListener('click', () => {
                domElements.availableStructuresListModalEl.querySelectorAll('li').forEach(item => item.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = option.type;
                domElements.confirmBuildBtn.disabled = false;
            });
            domElements.availableStructuresListModalEl.appendChild(li);
        });

        if (buildableOptions.length === 1) {
            domElements.availableStructuresListModalEl.querySelector('li').click();
        }
    }

    console.log("--- FIN openBuildStructureModal (Mostrando modal) ---");
    domElements.buildStructureModal.style.display = 'flex';
}

function populateAvailableStructuresForModal(r, c) {
    if (!domElements.availableStructuresListModalEl) return;
    domElements.availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    domElements.confirmBuildBtn.disabled = true;

    const hex = board[r]?.[c];
    if (!hex || hex.isCity) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No se puede construir aquí.</li>';
        return;
    }
    
    const playerResources = gameState.playerResources[gameState.currentPlayer];
    // ===>>> CORRECCIÓN AQUÍ: Obtenemos las tecnologías investigadas del jugador <<<===
    const playerTechs = playerResources.researchedTechnologies || [];
    let structureOffered = false;
    
    for (const type in STRUCTURE_TYPES) {
        const info = STRUCTURE_TYPES[type];
        let canBuild = true;
        let reason = "";

        // ===>>> ¡NUEVA VALIDACIÓN DE TECNOLOGÍA! <<<===
        if (info.requiredTech && !playerTechs.includes(info.requiredTech)) {
            canBuild = false;
            reason += `[Requiere ${TECHNOLOGY_TREE_DATA[info.requiredTech]?.name || info.requiredTech}]`;
        }
        // ===>>> FIN DE LA NUEVA VALIDACIÓN <<<===
        
        if (!info.buildableOn.includes(hex.terrain)) {
            canBuild = false; reason += "[Terreno Incorrecto]";
        }
        if (info.requiresStructure && hex.structure !== info.requiresStructure) {
            canBuild = false; reason += `[Requiere ${info.requiresStructure}]`;
        } else if (!info.requiresStructure && hex.structure) {
            canBuild = false; reason += "[Ya hay Estructura]";
        }

        let costStr = "";
        for (const res in info.cost) {
            costStr += `${info.cost[res]} ${res}, `;
            if ((playerResources[res] || 0) < info.cost[res]) {
                if (canBuild) reason += "[Fondos Insuficientes]";
                canBuild = false;
            }
        }
        costStr = costStr.slice(0, -2);
        
        const li = document.createElement('li');
        li.textContent = `${info.sprite} ${type} (${costStr}) ${reason}`;
        li.dataset.type = type;

        if (canBuild) {
            structureOffered = true;
            li.classList.add('buildable-structure-option');
            li.onclick = () => {
                domElements.availableStructuresListModalEl.querySelectorAll('li').forEach(i => i.classList.remove('selected-structure'));
                li.classList.add('selected-structure');
                selectedStructureToBuild = type;
                domElements.confirmBuildBtn.disabled = false;
            };
        } else {
            li.style.cssText = "opacity:0.6; cursor:not-allowed;";
        }
        domElements.availableStructuresListModalEl.appendChild(li);
    }
    if (!structureOffered) {
        domElements.availableStructuresListModalEl.innerHTML = '<li>No hay estructuras disponibles.</li>';
    }
}

function handleConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) return;

    const data = STRUCTURE_TYPES[selectedStructureToBuild];
    const { r, c } = hexToBuildOn;
    const playerRes = gameState.playerResources[gameState.currentPlayer];
    const unitOnHex = getUnitOnHex(r,c); // Comprobamos si hay una unidad para el coste de Colono

    // Volver a validar los costes justo antes de confirmar
    for (const res in data.cost) {
        if (res === 'Colono') {
            if (!unitOnHex || !unitOnHex.isSettler) {
                logMessage("Error: El Colono ya no está en la casilla.");
                return;
            }
        } else {
            if ((playerRes[res] || 0) < data.cost[res]) {
                logMessage(`Error: Ya no tienes suficientes ${res}.`);
                return;
            }
        }
    }

    // Deducir costes
    for (const res in data.cost) {
        if (res === 'Colono') {
            // Consumir la unidad de colono
            handleUnitDestroyed(unitOnHex, null); 
            logMessage("¡El Colono ha establecido una nueva Aldea!");
        } else {
            playerRes[res] -= data.cost[res];
        }
    }
    
    // Construir la estructura
    board[r][c].structure = selectedStructureToBuild;
    logMessage(`${data.name} construido en (${r},${c}).`);

    renderSingleHexVisuals(r, c);
    UIManager.updatePlayerAndPhaseInfo();
    domElements.buildStructureModal.style.display = 'none';
    UIManager.hideContextualPanel();
}

function showWelcomeHelpModal() {
    const doNotShow = localStorage.getItem('hexEvolvedDoNotShowHelp');
    if (doNotShow === 'true') {
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
        return;
    }
    if (!domElements.welcomeHelpModalEl || !TUTORIAL_MESSAGES) {
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
        return;
    }
    domElements.welcomeHelpTitleEl.textContent = TUTORIAL_MESSAGES.title;
    domElements.welcomeHelpSectionsEl.innerHTML = TUTORIAL_MESSAGES.sections.map(s => `<h3>${s.heading}</h3><p>${s.content}</p>`).join('');
    domElements.welcomeHelpFooterEl.textContent = TUTORIAL_MESSAGES.footer;
    domElements.welcomeHelpModalEl.style.display = 'flex';
}

function closeWelcomeHelpModal() {
    if (domElements.welcomeHelpModalEl) {
        domElements.welcomeHelpModalEl.style.display = 'none';
        if (domElements.doNotShowAgainCheckbox.checked) {
            localStorage.setItem('hexEvolvedDoNotShowHelp', 'true');
        }
        if (typeof showScreen === "function") showScreen(domElements.mainMenuScreenEl);
    }
}

function openAdvancedSplitUnitModal(unit) {
    if (!domElements.advancedSplitUnitModal || !unit) {
        if (UIManager) UIManager.hideContextualPanel();
        return;
    }
    _unitBeingSplit = unit;
    
    // Se crea un nuevo objeto que es una copia de todas las propiedades del regimiento original.
    _tempOriginalRegiments = (unit.regiments || []).map(reg => {
        return { ...reg }; 
    });

    _tempNewUnitRegiments = [];

    if (domElements.advancedSplitUnitNameDisplay) domElements.advancedSplitUnitNameDisplay.textContent = unit.name;
    updateAdvancedSplitModalDisplay();
    domElements.advancedSplitUnitModal.style.display = 'flex';
}

function moveRegimentToNewUnit(index) {
    if (index >= 0 && index < _tempOriginalRegiments.length) {
        if (_tempNewUnitRegiments.length >= MAX_REGIMENTS_PER_DIVISION) return;
        _tempNewUnitRegiments.push(_tempOriginalRegiments.splice(index, 1)[0]);
        updateAdvancedSplitModalDisplay();
    }
}

function moveRegimentToOriginalUnit(index) {
    if (index >= 0 && index < _tempNewUnitRegiments.length) {
        if (_tempOriginalRegiments.length >= MAX_REGIMENTS_PER_DIVISION) return;
        _tempOriginalRegiments.push(_tempNewUnitRegiments.splice(index, 1)[0]);
        updateAdvancedSplitModalDisplay();
    }
}

function updateAdvancedSplitModalDisplay() {
    if (!domElements.originalUnitRegimentsList || !domElements.newUnitRegimentsList) return;
    
    // Calcula los stats para ambas divisiones (original y nueva)
    let originalStats = calculateRegimentStats(_tempOriginalRegiments, _unitBeingSplit.player);
    let newStats = calculateRegimentStats(_tempNewUnitRegiments, _unitBeingSplit.player);
    
    // --- Panel de la Unidad Original ---
    domElements.originalUnitRegimentCount.textContent = `(${_tempOriginalRegiments.length})`; // Solo el contador
    domElements.originalUnitPreviewStats.textContent = `A/D: ${originalStats.attack}/${originalStats.defense}`; // Stats A/D
    domElements.originalUnitPreviewHealth.textContent = `Salud: ${originalStats.maxHealth}`; // Salud
    
    domElements.originalUnitRegimentsList.innerHTML = '';
    _tempOriginalRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        // <<== CAMBIO: Solo se muestra el sprite y la flecha. Se añade un 'title' para el tooltip. ==>>
        li.innerHTML = `${reg.sprite} <span class="regiment-actions" title="Mover">➡️</span>`;
        li.title = `${reg.type} (Salud: ${reg.health})`; // Tooltip con nombre y salud
        li.onclick = () => moveRegimentToNewUnit(i);
        domElements.originalUnitRegimentsList.appendChild(li);
    });

    // --- Panel de la Nueva Unidad ---
    domElements.newUnitRegimentCount.textContent = `(${_tempNewUnitRegiments.length})`;
    domElements.newUnitPreviewStats.textContent = `A/D: ${newStats.attack}/${newStats.defense}`;
    domElements.newUnitPreviewHealth.textContent = `Salud: ${newStats.maxHealth}`;

    domElements.newUnitRegimentsList.innerHTML = '';
    _tempNewUnitRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        // <<== CAMBIO: Solo se muestra la flecha y el sprite. Se añade un 'title' para el tooltip. ==>>
        li.innerHTML = `<span class="regiment-actions" title="Devolver">⬅️</span> ${reg.sprite}`;
        li.title = `${reg.type} (Salud: ${reg.health})`;
        li.onclick = () => moveRegimentToOriginalUnit(i);
        domElements.newUnitRegimentsList.appendChild(li);
    });

    // Habilita/deshabilita el botón de finalizar
    if (domElements.finalizeAdvancedSplitBtn) {
        domElements.finalizeAdvancedSplitBtn.disabled = _tempOriginalRegiments.length === 0 || _tempNewUnitRegiments.length === 0;
    }
}

// ========================================================================
// === LÓGICA PARA EL NUEVO MODAL DE GESTIÓN DE UNIDADES ==================
// ========================================================================

// Abre el nuevo modal y prepara su estado inicial.
function openUnitManagementModal() {
    if (!domElements?.unitManagementModal) return;

    currentDivisionBuilder = []; 
    
    const title = (placementMode.recruitHex) ? "Reclutar Nueva División" : "Preparar División para Despliegue";
    domElements.unitManagementTitle.textContent = title;
    domElements.divisionNameInput.value = `División ${units.filter(u => u.player === gameState.currentPlayer).length + 1}`;

    populateUnitManagementCategories(); // Rellena las pestañas de categorías
    updateDivisionSummary(); // Actualiza el panel de resumen (que estará vacío al principio)
    
    domElements.unitManagementModal.style.display = 'flex';
}

// Cierra el modal y cancela la acción de creación.
function closeUnitManagementModalAndCancel() {
    if (domElements.unitManagementModal) {
        domElements.unitManagementModal.style.display = 'none';
    }
    placementMode.active = false;
    placementMode.unitData = null;
    placementMode.recruitHex = null;
}

// Crea las pestañas de categorías (Infantería, Caballería, etc.).
function populateUnitManagementCategories() {
    if (!domElements.unitCategoryTabs) return;
    domElements.unitCategoryTabs.innerHTML = '';
    const categories = [...new Set(Object.values(REGIMENT_TYPES).map(reg => reg.category))];

    categories.forEach((category, index) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'tab-btn';
        tabBtn.dataset.category = category;
        tabBtn.textContent = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.category-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            tabBtn.classList.add('active');
            populateAvailableUnitsForCategory(category);
        });

        if (index === 0) {
            tabBtn.classList.add('active');
            populateAvailableUnitsForCategory(category); // Muestra la primera categoría por defecto
        }
        domElements.unitCategoryTabs.appendChild(tabBtn);
    });
}

// Muestra las unidades disponibles para la categoría seleccionada, validando tecnología.
function populateAvailableUnitsForCategory(category) {
    if (!domElements.availableUnitsList) return;
    domElements.availableUnitsList.innerHTML = '';

    const playerTechs = gameState.playerResources[gameState.currentPlayer]?.researchedTechnologies || [];
    const unlockedUnits = new Set();
    playerTechs.forEach(techId => {
        const techData = TECHNOLOGY_TREE_DATA[techId];
        if (techData?.unlocksUnits) {
            techData.unlocksUnits.forEach(unitKey => unlockedUnits.add(unitKey));
        }
    });

    let unitsInCategory = 0;
    for (const type in REGIMENT_TYPES) {
        const regiment = REGIMENT_TYPES[type];
        if (regiment.category === category) {
            if (unlockedUnits.has(type)) {
                unitsInCategory++;
                const unitEntry = document.createElement('div');
                unitEntry.className = 'unit-entry';
                unitEntry.innerHTML = `<span>${regiment.sprite} ${type}</span><div class="quantity-controls" data-type="${type}"><button class="quantity-btn minus">-</button><input type="number" class="quantity-input" value="0" min="0" readonly><button class="quantity-btn plus">+</button></div>`;
                
                const controls = unitEntry.querySelector('.quantity-controls');
                const input = controls.querySelector('.quantity-input');
                controls.querySelector('.plus').addEventListener('click', () => {
                    addRegimentToBuilder(type);
                    input.value = currentDivisionBuilder.filter(r => r.type === type).length;
                });
                controls.querySelector('.minus').addEventListener('click', () => {
                    removeRegimentFromBuilder(type);
                    input.value = currentDivisionBuilder.filter(r => r.type === type).length;
                });
                domElements.availableUnitsList.appendChild(unitEntry);
            }
        }
    }
    if (unitsInCategory === 0) {
        domElements.availableUnitsList.innerHTML = '<p style="text-align:center; padding:10px;">No hay unidades disponibles.</p>';
    }
}

// Añade un regimiento a la división en construcción.
function addRegimentToBuilder(type) {
    if (currentDivisionBuilder.length >= MAX_REGIMENTS_PER_DIVISION) {
        logMessage(`Una división no puede tener más de ${MAX_REGIMENTS_PER_DIVISION} regimientos.`);
        return;
    }
    if (REGIMENT_TYPES[type]) {
        // En lugar de una copia superficial, creamos un clon profundo y completo.
        // Cada regimiento será ahora un objeto totalmente independiente.
        const newRegiment = JSON.parse(JSON.stringify(REGIMENT_TYPES[type]));
        newRegiment.type = type; // Añadimos la propiedad 'type' que se pierde en la clonación del objeto anidado
        currentDivisionBuilder.push(newRegiment);
        
        updateDivisionSummary();
    }
}

// Quita el último regimiento del tipo especificado.
function removeRegimentFromBuilder(type) {
    const indexToRemove = currentDivisionBuilder.findLastIndex(reg => reg.type === type);
    if (indexToRemove > -1) {
        currentDivisionBuilder.splice(indexToRemove, 1);
        updateDivisionSummary();
    }
}

// Actualiza el panel de resumen de la derecha (costes, stats, etc.).
function updateDivisionSummary() {
    if (!domElements.divisionCompositionList) return;
    
    // Actualiza la lista de regimientos
    const compositionCounter = {};
    currentDivisionBuilder.forEach(reg => {
        compositionCounter[reg.type] = (compositionCounter[reg.type] || 0) + 1;
    });
    domElements.divisionCompositionList.innerHTML = '';
    for (const type in compositionCounter) {
        const li = document.createElement('li');
        li.textContent = `${compositionCounter[type]} x ${REGIMENT_TYPES[type].sprite} ${type}`;
        domElements.divisionCompositionList.appendChild(li);
    }
    
    // Calcula costes y stats
    let totalCost = {};
    currentDivisionBuilder.forEach(reg => {
        for (const res in reg.cost) {
            if (res !== 'upkeep') totalCost[res] = (totalCost[res] || 0) + reg.cost[res];
        }
    });
    const stats = calculateRegimentStats(currentDivisionBuilder, gameState.currentPlayer);
    
    // Muestra la información
    domElements.divisionCostSummary.textContent = `${totalCost.oro || 0} Oro, ${totalCost.puntosReclutamiento || 0} PR`;
    domElements.divisionStatsSummary.textContent = `A:${stats.attack} D:${stats.defense} M:${stats.movement}`;
    domElements.divisionRegimentCount.textContent = `${currentDivisionBuilder.length} / ${MAX_REGIMENTS_PER_DIVISION}`;
    
    // Habilita/deshabilita el botón final
    const playerCanAfford = (gameState.playerResources[gameState.currentPlayer].oro >= (totalCost.oro || 0)) && (gameState.playerResources[gameState.currentPlayer].puntosReclutamiento >= (totalCost.puntosReclutamiento || 0));
    domElements.finalizeUnitManagementBtn.disabled = currentDivisionBuilder.length === 0 || !playerCanAfford;
}

function handleFinalizeDivision() {
    if (currentDivisionBuilder.length === 0) {
        logMessage("Una división debe tener al menos un regimiento.");
        return;
    }

    // 1. Calcular el coste total de la división
    const finalCost = {};
    currentDivisionBuilder.forEach(reg => {
        for (const res in reg.cost) {
            if (res !== 'upkeep') {
                finalCost[res] = (finalCost[res] || 0) + reg.cost[res];
            }
        }
    });

    // 2. Validar que el jugador puede pagar
    const playerRes = gameState.playerResources[gameState.currentPlayer];
    for (const res in finalCost) {
        if ((playerRes[res] || 0) < finalCost[res]) {
            logMessage(`No tienes suficiente ${res} para crear esta división.`);
            return;
        }
    }
    console.log(`%c[VIAJE-1] Unidad CREADA en el cliente. ID debería ser null.`, 'color: #90EE90; font-weight: bold;', newDivisionDataObject);
    
    // 3. Deducir los recursos si puede pagar
    for (const res in finalCost) {
        playerRes[res] -= finalCost[res];
    }
    
    // 4. Calcular los stats finales de la nueva división
    const stats = calculateRegimentStats(currentDivisionBuilder, gameState.currentPlayer);

    // 5. Crear el objeto de la nueva unidad CON TODAS SUS PROPIEDADES INICIALES
    const newDivisionDataObject = {
        id: null, 
        player: gameState.currentPlayer,
        name: domElements.divisionNameInput.value.trim() || "Nueva División",
        // <<== MODIFICACIÓN LÓGICA NECESARIA: Asignamos un ID único a cada regimiento para poder rastrearlo ==>>
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)).map((reg, index) => ({
            ...reg,
            // Asignamos el ID único aquí. Es crucial para el diagnóstico.
            id: `r${Date.now()}${index}`
        })),
        
        // Stats calculados
        attack: stats.attack,
        defense: stats.defense,
        maxHealth: stats.maxHealth,
        currentHealth: stats.maxHealth, // Nace con la salud al máximo
        movement: stats.movement,
        currentMovement: stats.movement, // Movimiento completo al nacer
        visionRange: stats.visionRange,
        attackRange: stats.attackRange,
        initiative: stats.initiative,
        sprite: stats.sprite,
        
        // Propiedades de estado y experiencia
        level: 0,
        experience: 0,
        maxExperience: 500, // O el valor que tuvieras en constants.js
        morale: 50,         // <-- LA LÍNEA CLAVE QUE FALTABA
        maxMorale: 125,      // <-- AÑADIDO PARA CONSISTENCIA
        isDemoralized: false,// <-- AÑADIDO PARA CONSISTENCIA
        
        // Propiedades de acción y posición
        r: -1, 
        c: -1,
        element: null,
        hasMoved: gameState.currentPhase === 'play',    // Si se crea en juego, no puede actuar
        hasAttacked: gameState.currentPhase === 'play', // Si se crea en juego, no puede actuar
        hasRetaliatedThisTurn: false,
        
        // Otras propiedades
        cost: finalCost,
        isSettler: currentDivisionBuilder.some(reg => reg.isSettler === true),
        lastMove: null // Inicializar lastMove como nulo
    };
    
    // 6. Activar el modo de colocación
    placementMode.active = true;
    placementMode.unitData = newDivisionDataObject;
    
    // 7. Ocultar el modal
    if (domElements.unitManagementModal) {
        domElements.unitManagementModal.style.display = 'none';
    }
    
    logMessage(`División "${newDivisionDataObject.name}" lista. Haz clic para colocarla.`);
    if (UIManager) UIManager.updatePlayerAndPhaseInfo();
}

function handleFinalizeSplit() {
    if (!_unitBeingSplit || _tempOriginalRegiments.length === 0 || _tempNewUnitRegiments.length === 0) {
        logMessage("División inválida: ambas unidades deben tener regimientos.");
        return;
    }
    
    if (domElements.advancedSplitUnitModal) domElements.advancedSplitUnitModal.style.display = 'none';

    gameState.preparingAction = { 
        type: 'split_unit', 
        unitId: _unitBeingSplit.id, 
        originalR: _unitBeingSplit.r, 
        originalC: _unitBeingSplit.c,
        newUnitRegiments: JSON.parse(JSON.stringify(_tempNewUnitRegiments)),
        remainingOriginalRegiments: JSON.parse(JSON.stringify(_tempOriginalRegiments))
    };

    if (typeof UIManager !== 'undefined' && UIManager.highlightPossibleSplitHexes) {
        UIManager.highlightPossibleSplitHexes(_unitBeingSplit);
    } 
    if (typeof logMessage === "function") logMessage(`Haz clic en un hex adyacente para colocar la nueva unidad.`);
    
    _unitBeingSplit = null;
    _tempOriginalRegiments = [];
    _tempNewUnitRegiments = [];
}

/**
 * Abre el modal de detalles de la división y lo rellena con la información de los regimientos.
 * @param {object} unit - La unidad seleccionada para mostrar.
 */
function openUnitDetailModal(unit) {
    if (!domElements.unitDetailModal || !unit) return;
    
    domElements.unitDetailTitle.textContent = `Gestión de: ${unit.name}`;
    populateUnitDetailList(unit); // Llama a la función que crea la lista
    domElements.unitDetailModal.style.display = 'flex';
}

/**
 * Rellena la lista de regimientos en el modal de detalles.
 * @param {object} unit - La unidad cuyos regimientos se van a mostrar.
 */
function populateUnitDetailList(unit) {
    if (!unit) return;

    // --- Rellenar Stats Principales de la División ---
    const totalHealthPercentage = (unit.currentHealth / unit.maxHealth) * 100;
    domElements.unitDetailTotalHealthBar.style.width = `${totalHealthPercentage}%`;
    domElements.unitDetailTotalHealthText.textContent = `${unit.currentHealth} / ${unit.maxHealth}`;
    
    domElements.unitDetailCombatStats.textContent = `A/D: ${unit.attack}/${unit.defense}`;
    domElements.unitDetailMovementStats.textContent = `Mov: ${unit.currentMovement || unit.movement}`;
    domElements.unitDetailVisionStats.textContent = `Vis: ${unit.visionRange}`;
    
    // Moral
    let moralStatus = "Normal", moralColor = "#f0f0f0";
    if (unit.morale > 100) { moralStatus = "Exaltada"; moralColor = "#2ecc71"; }
    else if (unit.morale <= 24) { moralStatus = "Vacilante"; moralColor = "#e74c3c"; }
    else if (unit.morale < 50) { moralStatus = "Baja"; moralColor = "#f39c12"; }
    domElements.unitDetailMorale.innerHTML = `Moral: <strong style="color:${moralColor};">${unit.morale}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

    // Experiencia
    const levelData = XP_LEVELS[unit.level || 0];
    if (levelData) {
        const nextLevelXP = levelData.nextLevelXp;
        let xpText = `XP: ${levelData.currentLevelName}`;
        if (nextLevelXP !== 'Max') {
            xpText += ` (${unit.experience || 0} / ${nextLevelXP})`;
        }
        domElements.unitDetailXP.textContent = xpText;
    }


    // --- Rellenar la Lista de Regimientos ---
    const listEl = domElements.unitDetailRegimentList;
    listEl.innerHTML = ''; // Limpiar la lista

    if (!unit.regiments || unit.regiments.length === 0) {
        listEl.innerHTML = '<li>No hay regimientos en esta división.</li>';
        return;
    }
    
    // <<== MODIFICACIÓN: Comprobamos si la unidad es del jugador actual para el "modo consulta" ==>>
    const isOwnUnit = unit.player === gameState.currentPlayer;

    unit.regiments.forEach(reg => {
        const regData = REGIMENT_TYPES[reg.type];
        if (!regData) return; 

        const maxHealth = regData.health;
        const currentHealth = reg.health;
        const healthPercentage = (currentHealth / maxHealth) * 100;
        
        const li = document.createElement('li');
        li.className = 'regiment-detail-item';

        let innerHTML = `
            <span class="regiment-icon">${regData.sprite}</span>
            <span class="regiment-name">${getAbbreviatedName(reg.type)}</span>
            <div class="regiment-health-bar-container">
                <div class="regiment-health-bar" style="width: ${healthPercentage}%;"></div>
            </div>
            <span class="regiment-health-text">${currentHealth}/${maxHealth}</span>
        `;
        
        // <<== MODIFICACIÓN: El botón de reforzar solo se muestra si la unidad es propia y cumple condiciones ==>>
        if (isOwnUnit && currentHealth < maxHealth && isHexSuppliedForReinforce(unit.r, unit.c, unit.player)) {
            innerHTML += `<button class="reinforce-regiment-btn" title="Reforzar este regimiento (Coste en oro)">➕</button>`;
        } else {
             // Para unidades enemigas o unidades propias sanas/sin suministro, mostramos un hueco para mantener el alineado.
             innerHTML += `<div class="reinforce-placeholder"></div>`;
        }
        
        li.innerHTML = innerHTML;

        // Añadir el listener al botón de reforzar solo si lo creamos
        const reinforceBtn = li.querySelector('.reinforce-regiment-btn');
        if (reinforceBtn) {
            reinforceBtn.onclick = (e) => {
                e.stopPropagation();
                handleReinforceRegiment(unit, reg);
            };
        }
        
        listEl.appendChild(li);
    });
    
    // <<== LÓGICA AÑADIDA PARA EL BOTÓN DE DISOLVER ==>>
    if (domElements.disbandUnitBtn) {
        const isOwnUnit = unit.player === gameState.currentPlayer;
        const hex = board[unit.r]?.[unit.c];
        // Se puede disolver si la unidad es propia y está en territorio propio
        const canDisband = isOwnUnit && hex && hex.owner === unit.player;
        
        domElements.disbandUnitBtn.style.display = isOwnUnit ? 'inline-block' : 'none'; // Mostrar solo para unidades propias
        domElements.disbandUnitBtn.disabled = !canDisband; // Deshabilitar si no está en territorio propio
        domElements.disbandUnitBtn.title = canDisband ? "Disuelve esta unidad para recuperar recursos" : "La unidad debe estar en territorio propio para ser disuelta";
    }
}

/**
 * Gestiona la acción de reforzar un único regimiento.
 * @param {object} division - La división a la que pertenece el regimiento.
 * @param {object} regiment - El regimiento específico a reforzar.
 */
function handleReinforceRegiment(division, regiment) {
    const regData = REGIMENT_TYPES[regiment.type];
    const healthToRestore = regData.health - regiment.health;
    if (healthToRestore <= 0) return;

    // <<== NUEVO CÁLCULO DE COSTE: más realista. ==>>
    // Costo para reforzar = (coste total del regimiento / salud total) * puntos de vida a curar * factor de sobrecoste
    const reinforceCostMultiplier = 1.5; // Reforzar es un 50% más caro que reclutar.
    const baseRegCost = regData.cost.oro || 0;
    const costPerHp = baseRegCost / regData.health;
    const totalCost = Math.ceil(costPerHp * healthToRestore * reinforceCostMultiplier);
    
    const playerRes = gameState.playerResources[division.player];
    if (playerRes.oro < totalCost) {
        logMessage(`Oro insuficiente. Necesitas ${totalCost} para reforzar.`, 'error');
        return;
    }

    // Usamos el `confirm` de siempre para la interacción
    if (confirm(`¿Reforzar ${getAbbreviatedName(regiment.type)} por ${totalCost} de oro?`)) {
        playerRes.oro -= totalCost;
        regiment.health = regData.health; // Restaurar salud del regimiento
        
        recalculateUnitHealth(division); // Actualizar la salud total de la división

        logMessage(`${regiment.type} en ${division.name} ha sido reforzado.`);
        
        // Volvemos a poblar el modal para reflejar los cambios inmediatamente
        populateUnitDetailList(division); 

        // Actualizar la UI del juego principal
        if (UIManager) {
            UIManager.updatePlayerAndPhaseInfo();
            UIManager.updateUnitStrengthDisplay(division);
        }
    }
}

// Añadir el listener para el botón de cerrar del nuevo modal
document.addEventListener('DOMContentLoaded', () => {
    if(domElements.closeUnitDetailModalBtn) {
        domElements.closeUnitDetailModalBtn.addEventListener('click', () => {
            if(domElements.unitDetailModal) domElements.unitDetailModal.style.display = 'none';
        });
    }
});

// ======================================================================
// =================== LÓGICA PARA LA WIKI INTERNA DEL JUEGO ==================
// ======================================================================

// --- FUNCIÓN PRINCIPAL PARA ABRIR Y GESTIONAR LA WIKI ---

/**
 * Abre el modal de la Wiki y rellena su contenido dinámicamente.
 */
function openWikiModal() {
    if (!domElements.wikiModal) return;

    // Rellenar cada pestaña con su contenido
    populateWikiRegimentsTab();
    populateWikiStructuresTab();
    populateWikiTechTab();
    populateWikiConceptsTab();
    
    // Configurar los listeners de las pestañas
    const tabs = document.querySelectorAll('.wiki-tab-btn');
    const pages = document.querySelectorAll('.wiki-page');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Desactivar todas las pestañas y páginas
            tabs.forEach(t => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Activar la pestaña y página seleccionada
            tab.classList.add('active');
            const pageId = `wiki-tab-${tab.dataset.tab}`;
            const pageToShow = document.getElementById(pageId);
            if (pageToShow) {
                pageToShow.classList.add('active');
            }
        });
    });

    // Forzar clic en la primera pestaña para mostrar su contenido por defecto
    document.querySelector('.wiki-tab-btn[data-tab="regimientos"]').click();

    // Mostrar el modal
    domElements.wikiModal.style.display = 'flex';
}

// --- FUNCIONES AUXILIARES PARA RELLENAR CADA PESTAÑA ---

/**
 * Rellena la tabla de regimientos en la Wiki.
 */
function populateWikiRegimentsTab() {
    const table = document.getElementById('wikiRegimentsTable');
    if (!table) return;

    let html = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste</th>
                <th>Upkeep</th>
                <th>Ataque</th>
                <th>Defensa</th>
                <th>Salud</th>
                <th>Mov.</th>
                <th>Rango</th>
            </tr>
        </thead>
        <tbody>
    `;

    // Función auxiliar para puntuar con estrellas
    const getStars = (value, max, higherIsBetter = true) => {
        const score = (value / max) * 5;
        const fullStars = Math.floor(score);
        let stars = '⭐'.repeat(fullStars);
        if (score - fullStars > 0.5) stars += '✨'; // Media estrella
        return `<span class="wiki-stars" title="${value}">${stars}</span>`;
    };

    // Obtenemos los valores máximos para normalizar la puntuación de estrellas
    const maxAttack = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attack));
    const maxDefense = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.defense));
    const maxHealth = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.health));
    const maxMovement = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.movement));
    const maxRange = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attackRange));

    for (const type in REGIMENT_TYPES) {
        const reg = REGIMENT_TYPES[type];
        html += `
            <tr>
                <td class="wiki-regiment-icon">${reg.sprite}</td>
                <td>${type}</td>
                <td>${reg.cost.oro || 0} Oro, ${reg.cost.puntosReclutamiento || 0} PR</td>
                <td>${reg.cost.upkeep || 0} Oro</td>
                <td>${getStars(reg.attack, maxAttack)}</td>
                <td>${getStars(reg.defense, maxDefense)}</td>
                <td>${getStars(reg.health, maxHealth)}</td>
                <td>${getStars(reg.movement, maxMovement)}</td>
                <td>${getStars(reg.attackRange, maxRange)}</td>
            </tr>
        `;
    }

    html += `</tbody>`;
    table.innerHTML = html;
}

/**
 * Rellena las tablas de estructuras e ingresos en la Wiki.
 */
function populateWikiStructuresTab() {
    const structuresTable = document.getElementById('wikiStructuresTable');
    const incomeTable = document.getElementById('wikiIncomeTable');
    if (!structuresTable || !incomeTable) return;

    // Rellenar tabla de estructuras
    let sHtml = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste</th>
                <th>Efectos</th>
            </tr>
        </thead>
        <tbody>
    `;
    for(const type in STRUCTURE_TYPES){
        const s = STRUCTURE_TYPES[type];
        const costStr = Object.entries(s.cost).map(([res, val]) => `${val} ${res}`).join(', ');
        sHtml += `
            <tr>
                <td class="wiki-regiment-icon">${s.sprite}</td>
                <td>${s.name}</td>
                <td>${costStr}</td>
                <td>${s.defenseBonus ? `+${s.defenseBonus} Defensa. ` : ''}${s.allowsRecruitment ? 'Permite reclutar. ' : ''}</td>
            </tr>
        `;
    }
    sHtml += `</tbody>`;
    structuresTable.innerHTML = sHtml;

    // Rellenar tabla de ingresos
    let iHtml = `
        <thead>
            <tr>
                <th>Fuente</th>
                <th>Ingreso Base de Oro</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>Hexágono Normal</td><td>${GOLD_INCOME.PER_HEX}</td></tr>
            <tr><td>Camino</td><td>${GOLD_INCOME.PER_ROAD}</td></tr>
            <tr><td>Fortaleza</td><td>${GOLD_INCOME.PER_FORT}</td></tr>
            <tr><td>Ciudad</td><td>${GOLD_INCOME.PER_CITY}</td></tr>
            <tr><td>Capital</td><td>${GOLD_INCOME.PER_CAPITAL}</td></tr>
        </tbody>
    `;
    incomeTable.innerHTML = iHtml;
}

/**
 * Rellena la tabla de tecnologías en la Wiki.
 */
function populateWikiTechTab() {
    const table = document.getElementById('wikiTechTable');
    if (!table) return;

     let html = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste (Inv.)</th>
                <th>Desbloquea</th>
            </tr>
        </thead>
        <tbody>
    `;
    for(const id in TECHNOLOGY_TREE_DATA){
        const t = TECHNOLOGY_TREE_DATA[id];
        const unlocks = [...(t.unlocksUnits || []), ...(t.unlocksStructures || [])].join(', ');
        html += `
            <tr>
                <td class="wiki-regiment-icon">${t.sprite}</td>
                <td>${t.name}</td>
                <td>${t.cost.researchPoints}</td>
                <td>${unlocks || '-'}</td>
            </tr>
        `;
    }
    html += `</tbody>`;
    table.innerHTML = html;
}

/**
 * Rellena la pestaña de conceptos clave.
 */
function populateWikiConceptsTab() {
    const container = document.getElementById('wikiConceptsContent');
    if (!container) return;

    container.innerHTML = `
        <div>
            <h4>Victoria y Derrota</h4>
            <p>La victoria se logra de dos maneras: <strong>conquistando la capital del enemigo</strong> o <strong>destruyendo todas sus divisiones</strong> en el campo de batalla. ¡Protege tu propia capital y tus unidades a toda costa!</p>
        </div>
        <hr>
        <div>
            <h4>Economía y Territorio</h4>
            <p><strong>Estabilidad (0-5):</strong> Representa el control y orden. Es el modificador más importante de tus ingresos. Un territorio con Estabilidad 5 produce un <strong>+50% de recursos</strong>, mientras que uno con Estabilidad 1 solo produce un 25%.</p>
            <p><strong>Nacionalidad (0-5):</strong> Representa la lealtad de la población. También multiplica tus ingresos. Para que la Nacionalidad de un territorio aumente, su Estabilidad debe ser de <strong>al menos 3</strong>. La conquista de territorios es un proceso lento que requiere pacificar (subir Estabilidad) y luego asimilar (bajar Nacionalidad enemiga).</p>
            <p><strong>Mantenimiento (Upkeep):</strong> ¡Tu mayor gasto! Cada regimiento de tu ejército cuesta Oro por turno. Un ejército grande sin una economía fuerte llevará rápidamente a la bancarrota y a una pérdida masiva de moral en tus tropas.</p>
        </div>
        <hr>
        <div>
            <h4>Logística y Suministro</h4>
             <p><strong>Suministro:</strong> Las unidades necesitan estar conectadas a tu capital o a una fortaleza a través de una cadena ininterrumpida de territorios propios. Una unidad sin suministro <strong>pierde 10 de moral por turno</strong>, sufre <strong>daño de atrición</strong> y <strong>no puede ser reforzada</strong>.</p>
             <p><strong>Refuerzos y Disolución:</strong> Reforzar regimientos dañados cuesta un 150% de su valor original, ¡es caro perder hombres! Solo puedes reforzar en o adyacente a una ciudad/fortaleza. Disolver una unidad en territorio propio te devuelve el 50% de su coste.</p>
        </div>
        <hr>
        <div>
            <h4>Tácticas de Combate</h4>
            <p><strong>Moral (0-125):</strong> Es la voluntad de lucha. Tropas con moral alta luchan mejor. La moral baja si no pagas el mantenimiento, estás sin suministros o eres flanqueado. Si la moral de una división llega a 0, <strong>romperá filas y huirá</strong> o se rendirá.</p>
            <p><strong>Experiencia y Niveles:</strong> Las unidades ganan XP en combate. Al subir de nivel, obtienen bonus permanentes de ataque y defensa, convirtiéndose en tropas de élite.</p>
            <p><strong>Uso del Terreno:</strong> Los <strong>bosques</strong> ofrecen una enorme protección contra ataques a distancia. Las <strong>colinas</strong> dan bonus de defensa y un bonus de ataque a las unidades cuerpo a cuerpo. Usar el terreno a tu favor es clave para la victoria.</p>
            <p><strong>Flanqueo:</strong> Atacar a una unidad enemiga que ya está en combate con otra de tus unidades la considera "flanqueada", reduciendo drásticamente su defensa y moral.</p>
        </div>
    `;
}

//=======================================================================
//== AÑADE ESTAS NUEVAS FUNCIONES DE RED EN modalLogic.js              ==
//=======================================================================

function RequestConfirmBuildStructure() {
    if (!selectedStructureToBuild || !hexToBuildOn) return;

    if (isNetworkGame()) {
        const { r, c } = hexToBuildOn;
        const unitOnHex = getUnitOnHex(r,c);
        console.log(`[Red - Petición] Solicitando construir ${selectedStructureToBuild} en (${r},${c}).`);
        
        NetworkManager.enviarDatos({
            type: 'actionRequest',
            action: {
                type: 'buildStructure',
                payload: {
                    playerId: gameState.currentPlayer,
                    r: r, c: c,
                    structureType: selectedStructureToBuild,
                    builderUnitId: unitOnHex && STRUCTURE_TYPES[selectedStructureToBuild].cost.Colono ? unitOnHex.id : null
                }
            }
        });

        // Feedback inmediato para el jugador
        domElements.buildStructureModal.style.display = 'none';
        UIManager.hideContextualPanel();
        cancelPreparingAction();
        return;
    }
    
    // Si es un juego local, llama a la función original.
    handleConfirmBuildStructure();
}

function RequestReinforceRegiment(division, regiment) {
    // La validación y el `confirm` se quedan aquí, porque son parte de la "intención" del jugador.
    const regData = REGIMENT_TYPES[regiment.type];
    const healthToRestore = regData.health - regiment.health;
    if (healthToRestore <= 0) return;

    // --- CÓDIGO DE CÁLCULO DE COSTE AÑADIDO (tomado de handleReinforceRegiment) ---
    const reinforceCostMultiplier = 1.5;
    const baseRegCost = regData.cost.oro || 0;
    const costPerHp = baseRegCost / regData.health;
    const totalCost = Math.ceil(costPerHp * healthToRestore * reinforceCostMultiplier);
    
    if (confirm(`¿Reforzar ${getAbbreviatedName(regiment.type)} por ${totalCost} de oro?`)) {
        if (isNetworkGame()) {
            console.log(`[Red - Petición] Solicitando reforzar regimiento en ${division.name}.`);
            NetworkManager.enviarDatos({
                type: 'actionRequest',
                action: {
                    type: 'reinforceRegiment',
                    payload: {
                        playerId: division.player,
                        divisionId: division.id,
                        regimentId: regiment.id // Requiere IDs únicos, ¡asegúrate de que los regimientos los tengan!
                    }
                }
            });
            logMessage("Petición de refuerzo enviada...");
            return;
        }

        // Si es juego local, llama a la función original que ya incluye el confirm.
        handleReinforceRegiment(division, regiment);
    }
}
