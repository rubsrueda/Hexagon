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

function showCityContextualInfo(cityData) { // Modificar función existente o crear una nueva
    if (!cityData || !domElements) return;
    
    const currentPlayer = gameState.currentPlayer;
    const isOwnCity = cityData.owner === currentPlayer;
    // Determinar si la ciudad es "Avanzada" (Aldea o superior).
    // Esto puede depender de si tiene una estructura definida ('Aldea', 'Ciudad', 'Metrópoli')
    // o si 'isCapital' ya está set true (indicando que fue establecida previamente).
    // Si no hay estructura pero es 'isCity' y no es la capital, podemos considerarla al menos como una Aldea.
    const isAdvancedCity = cityData.isCapital || (cityData.structure && STRUCTURE_TYPES[cityData.structure]?.typeHierarchy >= "Aldea") || (cityData.isCity && !cityData.isCapital);
    
    const setCapitalBtn = document.getElementById('setAsCapitalBtn'); // El botón que añadiremos en HTML

     if (isOwnCity && isAdvancedCity && !cityData.isCapital) {
        if (setCapitalBtn) {
            setCapitalBtn.style.display = 'block'; // Mostrar botón
            setCapitalBtn.onclick = () => {
                requestChangeCapital(cityData.r, cityData.c);
                // Opcionalmente cerrar panel si la acción es final
                if (UIManager.hideContextualPanel) UIManager.hideContextualPanel(); 
            };
        } else {
            console.warn("UIManager: Botón 'setAsCapitalBtn' no encontrado.");
        }
    } else {
        if (setCapitalBtn) setCapitalBtn.style.display = 'none'; // Ocultar si no es aplicable
    }
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
        if (event.target.matches('.modal') && !event.target.classList.contains('no-close-on-click')) {
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

    const closeHeroDetailBtn = document.getElementById('closeHeroDetailBtn');
    if (closeHeroDetailBtn) {
        closeHeroDetailBtn.addEventListener('click', () => {
            const modal = document.getElementById('heroDetailModal');
            if (modal) modal.style.display = 'none';
        });
    } else {
        console.warn("modalLogic: closeHeroDetailBtn no encontrado.");
    }

    console.log("modalLogic: addModalEventListeners FINALIZADO.");
}

function openBuildStructureModal() {
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
    
    // <<== Guardamos los datos en el modal ==>>
    domElements.buildStructureModal.dataset.r = r;
    domElements.buildStructureModal.dataset.c = c;

    if (!domElements.buildStructureModal || !domElements.availableStructuresListModalEl) {
        console.error("  -> ERROR: Elementos del DOM del modal no encontrados. Saliendo.");
        return;
    }
    
    // Preparar UI
    domElements.buildHexCoordsDisplay.textContent = `${r},${c}`;
    domElements.availableStructuresListModalEl.innerHTML = '';
    selectedStructureToBuild = null;
    domElements.confirmBuildBtn.disabled = true;

    const playerResources = gameState.playerResources[gameState.currentPlayer];
    const playerTechs = playerResources.researchedTechnologies || [];
    let buildableOptions = [];

    // --- INICIO DE LA LÓGICA DE DECISIÓN CORREGIDA ---
    if (hex.structure) {

        // MODO MEJORA: Solo validamos la posible siguiente estructura.
        console.log("  [Paso 2] MODO MEJORA detectado.");
        const upgradeId = STRUCTURE_TYPES[hex.structure]?.nextUpgrade;

        if (upgradeId) {
            // Se encontró una posible mejora, ahora aplicamos tu bloque de validación completo a ESE ÚNICO ID.
            const structureId = upgradeId; 
            const structureInfo = STRUCTURE_TYPES[structureId];
            
            console.log(`\n  --- Validando Mejora: ${structureId.toUpperCase()} ---`);
            let isOptionForHex = true; // Sabemos que es una opción porque es 'nextUpgrade'
            
            console.log(`    - ${structureId} es una opción válida. Comprobando requisitos...`);
            let canBuild = true;

            // **VALIDACIÓN DE TECNOLOGÍA** (Tu código original)
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

            // **VALIDACIÓN DE COSTE** (Tu código original)
            if (structureInfo.cost && canBuild) {
                console.log(`      - Comprobando coste: ${JSON.stringify(structureInfo.cost)}`);
                for (const resKey in structureInfo.cost) {
                    const amountNeeded = structureInfo.cost[resKey];
                    if (resKey === 'Colono') {
                        console.log(`        - Comprobando requisito: Colono`);
                        // La validación correcta: mira si la unidad seleccionada es un colono en ESA casilla.
                        const unitOnHex = getUnitOnHex(r, c);
                        if (unitOnHex && unitOnHex.player === gameState.currentPlayer && unitOnHex.isSettler) {
                            console.log(`          -> SÍ. Colono válido presente en (${r},${c}).`);
                        } else {
                            console.log(`          -> NO. No hay un Colono propio en (${r},${c}) para realizar la mejora.`);
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
                    if (!canBuild) break;
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
    } else {
        // MODO CONSTRUCCIÓN NUEVA: Ejecutamos tu bucle original completo, sin tocarlo.
        console.log("  [Paso 2] MODO CONSTRUCCIÓN NUEVA detectado.");
        console.log("  Empezando a iterar sobre todas las estructuras en STRUCTURE_TYPES...");

        for (const structureId in STRUCTURE_TYPES) {
            const structureInfo = STRUCTURE_TYPES[structureId];
            console.log(`\n  --- Validando: ${structureId.toUpperCase()} ---`);
            let isOptionForHex = false;
            
            if (hex.structure) { 
                console.log(`    - Hex tiene estructura: "${hex.structure}". ¿Es "${structureId}" la siguiente mejora?`);
                if (STRUCTURE_TYPES[hex.structure]?.nextUpgrade === structureId) {
                    isOptionForHex = true;
                } } 
            else {
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

            console.log(`    - ${structureId} es una opción válida. Comprobando requisitos...`);
            let canBuild = true;

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
                    if (!canBuild) break;
                }
            }
            
            console.log(`    - RESULTADO FINAL PARA ${structureId}: ${canBuild ? "Se puede construir." : "NO se puede construir."}`);
            if (canBuild) {
                buildableOptions.push({
                    type: structureId, name: structureInfo.name, sprite: structureInfo.sprite,
                    costStr: Object.entries(structureInfo.cost || {}).map(([k,v]) => `${v} ${k}`).join(', ') || "Gratis"
                });
            }
        } // fin del 'for' original
    }
    
    // --- Lógica final para poblar y mostrar el modal (tu código original, sin cambios) ---
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
    
    // Calcula stats
    let originalTempUnit = { player: _unitBeingSplit.player, regiments: _tempOriginalRegiments };
    calculateRegimentStats(originalTempUnit); // La función modificará este objeto
    let originalStats = originalTempUnit; // Los stats están ahora DENTRO del objeto

    let newTempUnit = { player: _unitBeingSplit.player, regiments: _tempNewUnitRegiments };
    calculateRegimentStats(newTempUnit); // La función modificará este otro objeto
    let newStats = newTempUnit; // Los stats están aquí
    
    // --- Panel de la Unidad Original ---
    domElements.originalUnitRegimentCount.textContent = `(${_tempOriginalRegiments.length})`; // Solo el contador
    domElements.originalUnitPreviewStats.textContent = `A/D: ${originalStats.attack}/${originalStats.defense}`; // Stats A/D
    domElements.originalUnitPreviewHealth.textContent = `Salud: ${originalStats.maxHealth}`; // Salud
    
    domElements.newUnitRegimentCount.textContent = `(${_tempNewUnitRegiments.length})`;
    domElements.newUnitPreviewStats.textContent = `A/D: ${newStats.attack}/${newStats.defense}`;
    domElements.newUnitPreviewHealth.textContent = `Salud: ${newStats.maxHealth}`;

    // Función auxiliar para crear el elemento de sprite (img o span)
    const createSpriteElement = (reg) => {
        const spriteValue = reg.sprite;
        let spriteElement;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
            spriteElement = document.createElement('img');
            spriteElement.src = spriteValue;
            spriteElement.alt = reg.type;
            spriteElement.style.width = '24px';
            spriteElement.style.height = '24px';
            spriteElement.style.verticalAlign = 'middle';
        } else {
            spriteElement = document.createElement('span');
            spriteElement.textContent = spriteValue;
        }
        return spriteElement;
    };
    
    // --- PARA MOSTRAR SALUD ---
    const createRegimentDisplay = (reg) => {
        const regData = REGIMENT_TYPES[reg.type];
        const container = document.createElement('span');
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        
        const spriteEl = createSpriteElement(reg);
        const healthText = document.createTextNode(` (${reg.health}/${regData.health})`);

        container.appendChild(spriteEl);
        container.appendChild(healthText);
        return container;
    };
    
    // Rellenar lista de Unidad Original
    domElements.originalUnitRegimentsList.innerHTML = '';
    _tempOriginalRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        li.style.justifyContent = 'space-between'; // Asegura que el botón se vaya a la derecha

        const regDisplay = createRegimentDisplay(reg);
        
        const actionSpan = document.createElement('span');
        actionSpan.className = 'regiment-actions';
        actionSpan.title = 'Mover';
        actionSpan.textContent = '➡️';
        
        li.appendChild(regDisplay); // Contenedor con sprite y salud
        li.appendChild(document.createTextNode(' ')); // Añade un espacio
        li.appendChild(actionSpan);
        
        li.title = `${reg.type} (Salud: ${reg.health})`;
        li.onclick = () => moveRegimentToNewUnit(i);
        domElements.originalUnitRegimentsList.appendChild(li);
    });

    // Rellenar lista de Nueva Unidad
    domElements.newUnitRegimentsList.innerHTML = '';
    _tempNewUnitRegiments.forEach((reg, i) => {
        const li = document.createElement('li');
        li.style.justifyContent = 'space-between';

        const regDisplay = createRegimentDisplay(reg);

        const actionSpan = document.createElement('span');
        actionSpan.className = 'regiment-actions';
        actionSpan.title = 'Devolver';
        actionSpan.textContent = '⬅️';
        
        li.appendChild(actionSpan);
        li.appendChild(document.createTextNode(' ')); // Añade un espacio
        li.appendChild(regDisplay);

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

                // Contenedor para el sprite y el nombre
                const unitInfoSpan = document.createElement('span');
                
                // Lógica condicional para el sprite (img o span)
                const spriteValue = regiment.sprite;
                let spriteElement;

                if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
                    // Si es una ruta de imagen, crea un elemento <img>
                    spriteElement = document.createElement('img');
                    spriteElement.src = spriteValue;
                    spriteElement.alt = type;
                    spriteElement.style.width = '24px'; // Ajusta el tamaño como necesites
                    spriteElement.style.height = '24px';
                    spriteElement.style.marginRight = '8px';
                    spriteElement.style.verticalAlign = 'middle';
                } else {
                    // Si no, crea un elemento <span> para el emoji/texto
                    spriteElement = document.createElement('span');
                    spriteElement.textContent = spriteValue;
                    spriteElement.style.marginRight = '8px';
                }

                // --- Añadimos la salud máxima ---
                const healthText = ` (${regiment.health}/${regiment.health})`;
                
                unitInfoSpan.appendChild(spriteElement);
                unitInfoSpan.appendChild(document.createTextNode(type + healthText)); // Se añade la salud al texto

                // 4. Crear los controles de cantidad
                const controlsDiv = document.createElement('div');
                controlsDiv.className = 'quantity-controls';
                controlsDiv.dataset.type = type;
                controlsDiv.innerHTML = `<button class="quantity-btn minus">-</button><input type="number" class="quantity-input" value="0" min="0" readonly><button class="quantity-btn plus">+</button>`;
                
                // 5. Añadir todo al 'unitEntry' principal
                unitEntry.appendChild(unitInfoSpan);
                unitEntry.appendChild(controlsDiv);

                // La lógica de los listeners se mantiene igual
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

// PÉGA ESTA FUNCIÓN COMPLETA EN modalLogic.js

// Actualiza todo el panel de resumen de la división en construcción.
function updateDivisionSummary() {
    if (!domElements.divisionCompositionList || !domElements.divisionCostSummary || !domElements.divisionStatsSummary || !domElements.divisionRegimentCount) {
        console.error("updateDivisionSummary: Faltan elementos del DOM del panel de resumen.");
        return;
    }

    // 1. Calcular Coste Total
    const finalCost = { oro: 0, puntosReclutamiento: 0 };
    currentDivisionBuilder.forEach(reg => {
        const costData = REGIMENT_TYPES[reg.type]?.cost || {};
        for (const res in costData) {
            if (res !== 'upkeep') {
                finalCost[res] = (finalCost[res] || 0) + costData[res];
            }
        }
    });
    const costString = Object.entries(finalCost)
        .filter(([, val]) => val > 0)
        .map(([res, val]) => `${val} ${res}`)
        .join(', ') || '0 Recursos';
    domElements.divisionCostSummary.textContent = costString;
    
    // 2. Calcular Stats Agregados
    let tempDivisionObject = { player: gameState.currentPlayer, regiments: currentDivisionBuilder };
    calculateRegimentStats(tempDivisionObject);
    const statsString = `A: ${tempDivisionObject.attack} D: ${tempDivisionObject.defense} M: ${tempDivisionObject.movement}`;
    domElements.divisionStatsSummary.textContent = statsString;

    // 3. Actualizar Contador de Regimientos
    domElements.divisionRegimentCount.textContent = `${currentDivisionBuilder.length} / ${MAX_REGIMENTS_PER_DIVISION}`;
    
    // 4. Rellenar la lista de composición (MODO CORREGIDO)
    const regimentCounts = {};
    currentDivisionBuilder.forEach(reg => {
        regimentCounts[reg.type] = (regimentCounts[reg.type] || 0) + 1;
    });
    
    domElements.divisionCompositionList.innerHTML = ''; // Limpiar la lista primero

    // Iterar y construir cada elemento de la lista de forma segura
    for (const [type, count] of Object.entries(regimentCounts)) {
        const regiment = REGIMENT_TYPES[type];
        if (!regiment) continue;

        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';

        const spriteValue = regiment.sprite;
        let spriteElement;

        // Crear <img> o <span> según el tipo de sprite
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
            spriteElement = document.createElement('img');
            spriteElement.src = spriteValue;
            spriteElement.alt = type;
            spriteElement.style.width = '24px';
            spriteElement.style.height = '24px';
            spriteElement.style.marginRight = '8px';
        } else {
            spriteElement = document.createElement('span');
            spriteElement.textContent = spriteValue;
            spriteElement.style.marginRight = '8px';
        }
        
        li.appendChild(spriteElement);

        // Añadir el texto con nombre, contador y salud
        const textNode = document.createTextNode(`${type} x ${count} (${regiment.health}/${regiment.health})`);
        li.appendChild(textNode);

        domElements.divisionCompositionList.appendChild(li);
    }
    // --- FIN DE LA CORRECCIÓN ---

    // 5. Habilitar/deshabilitar el botón de finalizar
    if (domElements.finalizeUnitManagementBtn) {
        domElements.finalizeUnitManagementBtn.disabled = currentDivisionBuilder.length === 0;
    }
}

function handleFinalizeDivision() {
    if (currentDivisionBuilder.length === 0) {
        logMessage("Una división debe tener al menos un regimiento.");
        return;
    }

    // 1. Calcular el coste total y validar recursos
    const finalCost = {};
    currentDivisionBuilder.forEach(reg => {
        const costData = REGIMENT_TYPES[reg.type]?.cost || {};
        for (const res in costData) {
            if (res !== 'upkeep') {
                finalCost[res] = (finalCost[res] || 0) + costData[res];
            }
        }
    });

    const playerRes = gameState.playerResources[gameState.currentPlayer];
    for (const res in finalCost) {
        if ((playerRes[res] || 0) < finalCost[res]) {
            logMessage(`No tienes suficientes recursos para crear esta división.`);
            return;
        }
    }
    
    // 2. Deducir los recursos
    for (const res in finalCost) {
        playerRes[res] -= finalCost[res];
    }
    
    // 3. Crear el objeto "cáscara" de la unidad
    const newDivisionDataObject = {
        id: null, // Se asignará en placeFinalizedDivision
        player: gameState.currentPlayer,
        name: domElements.divisionNameInput.value.trim() || "Nueva División",
        commander: null,
        regiments: JSON.parse(JSON.stringify(currentDivisionBuilder)),
        r: -1, c: -1, element: null, 
        hasMoved: false,
        hasAttacked: false,
        level: 0, experience: 0, 
        morale: 50, maxMorale: 125,
        cost: finalCost,
        isSettler: currentDivisionBuilder.some(reg => REGIMENT_TYPES[reg.type]?.isSettler === true)
    };

    // 4. Pasar el objeto completo para que se rellene con stats
    calculateRegimentStats(newDivisionDataObject);

    // 5. Inicializar salud y movimiento usando los valores recién calculados
    newDivisionDataObject.currentHealth = newDivisionDataObject.maxHealth;
    newDivisionDataObject.currentMovement = newDivisionDataObject.movement;
    
    // 6. Activar el modo de colocación
    placementMode.active = true;
    placementMode.unitData = newDivisionDataObject;
    
    if (domElements.unitManagementModal) {
        domElements.unitManagementModal.style.display = 'none';
    }
    
    logMessage(`División "${newDivisionDataObject.name}" lista. Haz clic en un hexágono válido para colocarla.`);
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
    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('unit_split');
    }
    
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

    domElements.unitDetailTitle.textContent = `Gestión de: ${unit.name}`;

    // Contenedor para la información del general
    let commanderHTML = '';
    if (unit.commander && COMMANDERS[unit.commander]) {
        const cmdr = COMMANDERS[unit.commander];
        commanderHTML = `
            <div class="commander-details-section" style="background-color: #fff; padding: 10px; border-radius: 5px; border: 1px solid gold; margin-bottom: 15px; text-align: center;">
                <h4 style="margin: 0 0 5px 0; color: #333;">Líder de la División</h4>
                <p style="font-size: 1.2em; font-weight: bold; margin: 0; color: #555;">
                    <span style="font-size: 1.5em; vertical-align: middle;">${cmdr.sprite}</span> ${cmdr.name}
                </p>
                <p style="font-size: 0.9em; font-style: italic; margin: 2px 0 0 0; color: #6c757d;">
                    ${cmdr.title}
                </p>
            </div>
        `;
    }
    
    // Rellenar Stats Principales
    const statsContainer = domElements.unitDetailModal.querySelector('.unit-main-stats');
    if (statsContainer) {
        // Inyectamos el HTML del comandante (si existe) y luego los stats
        statsContainer.innerHTML = commanderHTML + `
            <div class="stat-row">
                <span class="stat-label">Salud:</span>
                <div class="unit-total-health-bar-container">
                    <div id="unitDetailTotalHealthBar" class="unit-total-health-bar" style="width: ${(unit.currentHealth / unit.maxHealth) * 100}%;"></div>
                </div>
                <span id="unitDetailTotalHealthText">${unit.currentHealth} / ${unit.maxHealth}</span>
            </div>
            <div class="stat-row stat-summary">
                <span id="unitDetailCombatStats">A/D: ${unit.attack}/${unit.defense}</span>
                <span id="unitDetailMovementStats">Mov: ${unit.currentMovement || unit.movement}</span>
                <span id="unitDetailVisionStats">Vis: ${unit.visionRange}</span>
            </div>
            <div class="stat-row">
                <span id="unitDetailMorale">Moral: ...</span>
                <span id="unitDetailXP">XP: ...</span>
            </div>
        `;

        // Re-asignamos referencias a los elementos internos de stats después de sobreescribir el HTML
        
        // Moral
        const moralStatusMap = { high: "Exaltada", low: "Baja", breaking: "Vacilante" };
        const moralColorMap = { high: "#2ecc71", low: "#f39c12", breaking: "#e74c3c" };
        let moralStatus = "Normal", moralColor = "#f0f0f0";
        if (unit.morale > 100) { moralStatus = moralStatusMap.high; moralColor = moralColorMap.high; }
        else if (unit.morale <= 24) { moralStatus = moralStatusMap.breaking; moralColor = moralColorMap.breaking; }
        else if (unit.morale < 50) { moralStatus = moralStatusMap.low; moralColor = moralColorMap.low; }
        
        statsContainer.querySelector('#unitDetailMorale').innerHTML = `Moral: <strong style="color:${moralColor};">${unit.morale}/${unit.maxMorale || 125} (${moralStatus})</strong>`;

        // Experiencia
        const levelData = XP_LEVELS[unit.level || 0];
        if (levelData) {
            const nextLevelXP = levelData.nextLevelXp;
            let xpText = `XP: ${levelData.currentLevelName}`;
            if (nextLevelXP !== 'Max') {
                xpText += ` (${unit.experience || 0} / ${nextLevelXP})`;
            }
            statsContainer.querySelector('#unitDetailXP').textContent = xpText;
        }
    }


    // --- Rellenar la Lista de Regimientos ---
    const listEl = domElements.unitDetailRegimentList;
    listEl.innerHTML = ''; // Limpiar la lista

    if (!unit.regiments || unit.regiments.length === 0) {
        listEl.innerHTML = '<li>No hay regimientos en esta división.</li>';
        return;
    }
    
    // <<== Comprobamos si la unidad es del jugador actual para el "modo consulta" ==>>
    const isOwnUnit = unit.player === gameState.currentPlayer;

    // --- INICIO DE LA SOLUCIÓN ---
    unit.regiments.forEach(reg => {
        const regData = REGIMENT_TYPES[reg.type];
        if (!regData) return;

        const maxHealth = regData.health;
        const currentHealth = reg.health;
        const healthPercentage = (currentHealth / maxHealth) * 100;
        
        const li = document.createElement('li');
        li.className = 'regiment-detail-item';

        // 2. Crear el icono (condicionalmente como <img> o <span>)
        const iconSpan = document.createElement('span');
        iconSpan.className = 'regiment-icon';
        const spriteValue = regData.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg') || spriteValue.includes('.gif')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.alt = reg.type;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            iconSpan.appendChild(img);
        } else {
            iconSpan.textContent = spriteValue;
        }

        // 3. Crear los demás elementos programáticamente
        const nameSpan = document.createElement('span');
        nameSpan.className = 'regiment-name';
        nameSpan.textContent = getAbbreviatedName(reg.type);

        const healthBarContainer = document.createElement('div');
        healthBarContainer.className = 'regiment-health-bar-container';
        healthBarContainer.innerHTML = `<div class="regiment-health-bar" style="width: ${healthPercentage}%;"></div>`;

        const healthTextSpan = document.createElement('span');
        healthTextSpan.className = 'regiment-health-text';
        healthTextSpan.textContent = `${currentHealth}/${maxHealth}`;

        // 4. Montar la estructura usando appendChild
        li.appendChild(iconSpan);
        li.appendChild(nameSpan);
        li.appendChild(healthBarContainer);
        li.appendChild(healthTextSpan);
        
        // 5. Añadir el botón de reforzar o el placeholder (sin cambios)
        if (isOwnUnit && currentHealth < maxHealth && isHexSuppliedForReinforce(unit.r, unit.c, unit.player)) {
            const reinforceBtn = document.createElement('button');
            reinforceBtn.className = 'reinforce-regiment-btn';
            reinforceBtn.title = 'Reforzar este regimiento (Coste en oro)';
            reinforceBtn.textContent = '➕';
            reinforceBtn.onclick = (e) => {
                e.stopPropagation();
                RequestReinforceRegiment(unit, reg);
            };
            li.appendChild(reinforceBtn);
        } else {
             const placeholder = document.createElement('div');
             placeholder.className = 'reinforce-placeholder';
             li.appendChild(placeholder);
        }
        
        listEl.appendChild(li);
    });

    // --- Lógica del Botón de Disolver ---
    if (domElements.disbandUnitBtn) {
        const hex = board[unit.r]?.[unit.c];
        // Se puede disolver si la unidad es propia y está en territorio propio
        const canDisband = isOwnUnit && hex && hex.owner === unit.player;
        
        domElements.disbandUnitBtn.style.display = isOwnUnit ? 'inline-block' : 'none';
        domElements.disbandUnitBtn.disabled = !canDisband;
        domElements.disbandUnitBtn.title = canDisband ? "Disuelve esta unidad" : "Debe estar en territorio propio";
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

        if (gameState.isTutorialActive) {
            // Usamos el nombre de la bandera que espera el paso 23 del guion
            TutorialManager.notifyActionCompleted('unitReinforced'); 
        }
        
        if (gameState.isTutorialActive) gameState.tutorial.unitReinforced = true;
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

    // 1. Limpiar tabla y crear cabecera
    table.innerHTML = `
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
                <th>Limitaciones Terreno</th>
            </tr>
        </thead>
    `;
    const tbody = document.createElement('tbody');

    // Funciones auxiliares (se mantienen igual)
    const getStars = (value, max) => {
        const score = (value / max) * 5;
        const fullStars = Math.floor(score);
        let stars = '⭐'.repeat(fullStars);
        if (score - fullStars > 0.5) stars += '✨';
        return `<span class="wiki-stars" title="${value}">${stars}</span>`;
    };
    const maxAttack = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attack));
    const maxDefense = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.defense));
    const maxHealth = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.health));
    const maxMovement = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.movement));
    const maxRange = Math.max(...Object.values(REGIMENT_TYPES).map(r => r.attackRange));

    // 2. Iterar y construir filas y celdas
    for (const type in REGIMENT_TYPES) {
        const reg = REGIMENT_TYPES[type];
        const tr = tbody.insertRow(); // Crear una nueva fila

        // Celda de Icono (con la lógica corregida)
        const iconCell = tr.insertCell();
        iconCell.className = 'wiki-regiment-icon';
        const spriteValue = reg.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            iconCell.appendChild(img);
        } else {
            iconCell.textContent = spriteValue;
        }

        // Celdas de texto
        tr.insertCell().textContent = type;
        tr.insertCell().textContent = `${reg.cost.oro || 0} Oro, ${reg.cost.puntosReclutamiento || 0} PR`;
        tr.insertCell().textContent = `${reg.cost.upkeep || 0} Oro`;
        tr.insertCell().innerHTML = getStars(reg.attack, maxAttack);
        tr.insertCell().innerHTML = getStars(reg.defense, maxDefense);
        tr.insertCell().innerHTML = getStars(reg.health, maxHealth);
        tr.insertCell().innerHTML = getStars(reg.movement, maxMovement);
        tr.insertCell().innerHTML = getStars(reg.attackRange, maxRange);

        // Celda de Limitaciones (lógica sin cambios)
        let limitationsStr = 'Ninguna';
        if (reg.category && !reg.is_naval) {
            const categoryLimitations = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY[reg.category] || [];
            const allLandLimitations = IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY.all_land || [];
            const allLimitations = [...new Set([...allLandLimitations, ...categoryLimitations])];
            if (allLimitations.length > 0) {
                limitationsStr = allLimitations.map(t => TERRAIN_TYPES[t]?.name || t).join(', ');
            }
        } else if (reg.is_naval) {
            limitationsStr = "Solo Agua";
        }
        tr.insertCell().textContent = limitationsStr;
    }

    table.appendChild(tbody);
}

/**
 * Rellena las tablas de estructuras e ingresos en la Wiki.
 */
function populateWikiStructuresTab() {
    const structuresTable = document.getElementById('wikiStructuresTable');
    const incomeTable = document.getElementById('wikiIncomeTable');
    if (!structuresTable || !incomeTable) return;

    // --- Tabla de Estructuras (con la corrección) ---
    structuresTable.innerHTML = `
        <thead>
            <tr>
                <th>Icono</th>
                <th>Nombre</th>
                <th>Coste</th>
                <th>Efectos</th>
            </tr>
        </thead>
    `;
    const sTbody = document.createElement('tbody');
    for(const type in STRUCTURE_TYPES){
        const s = STRUCTURE_TYPES[type];
        const sTr = sTbody.insertRow();
        
        // Celda de Icono (con la lógica corregida)
        const sIconCell = sTr.insertCell();
        sIconCell.className = 'wiki-regiment-icon';
        const spriteValue = s.sprite;
        if (spriteValue.includes('.png') || spriteValue.includes('.jpg')) {
            const img = document.createElement('img');
            img.src = spriteValue;
            img.style.width = '24px';
            img.style.height = '24px';
            img.style.verticalAlign = 'middle';
            sIconCell.appendChild(img);
        } else {
            sIconCell.textContent = spriteValue;
        }

        // Celdas de texto
        sTr.insertCell().textContent = s.name;
        const costStr = Object.entries(s.cost).map(([res, val]) => `${val} ${res}`).join(', ');
        sTr.insertCell().textContent = costStr;
        let effectsStr = (s.defenseBonus ? `+${s.defenseBonus} Defensa. ` : '') +
                         (s.allowsRecruitment ? 'Permite reclutar. ' : '');
        sTr.insertCell().textContent = effectsStr;
    }
    structuresTable.appendChild(sTbody);

    // --- Tabla de Ingresos (sin cambios, ya era segura) ---
    incomeTable.innerHTML = `
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
//== FUNCIONES DE RED EN modalLogic.js              ==
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

//=======================================================================
//== FUNCIONES DE Heroes                                               ==
//=======================================================================

/**
 * Abre el modal del Cuartel y muestra la colección de héroes del jugador.
 * Si 'assignmentMode' es true, permite seleccionar un héroe para asignarlo.
 * @param {boolean} assignmentMode - Si se está asignando un héroe a una división.
 * @param {object|null} targetUnit - La unidad a la que se le asignará el héroe.
 */ 
 function openBarracksModal(assignmentMode = false, targetUnit = null) {
    const modal = document.getElementById('barracksModal');
    const container = document.getElementById('heroCollectionContainer');
    if (!modal || !container || !PlayerDataManager.currentPlayer) return;

    container.innerHTML = '';
    const playerData = PlayerDataManager.getCurrentPlayer();

    // Lógica para el modo asignación (sin cambios)
    modal.dataset.assignmentMode = assignmentMode;
    if (targetUnit) {
        modal.dataset.targetUnitId = targetUnit.id;
    } else {
        delete modal.dataset.targetUnitId;
    }

    if (!playerData.heroes || playerData.heroes.length === 0) {
        container.innerHTML = '<p>No has reclutado a ningún héroe todavía.</p>';
    } else {
        // <<== LÓGICA MODIFICADA PARA MOSTRAR HÉROES DESBLOQUEADOS Y BLOQUEADOS ==>>
        
        // Primero, ordena la lista para mostrar siempre los desbloqueados (stars > 0) primero.
    playerData.heroes.sort((a, b) => b.stars - a.stars);
    
    playerData.heroes.forEach(heroInstance => {
        const heroData = COMMANDERS[heroInstance.id];
        // 1. Primero nos aseguramos de que heroData exista
        if (!heroData) return;
        
        // 2. <<== CORRECCIÓN: Ahora que heroData existe, creamos el spriteHTML ==>>
        let spriteHTML = '';
        if (heroData.sprite.includes('.png') || heroData.sprite.includes('.jpg')) {
            // Usamos una clase para que el CSS la controle
            spriteHTML = `<img src="${heroData.sprite}" alt="${heroData.name}" class="hero-card-image">`;
        } else {
            // Mantenemos la lógica para los emojis como fallback
            spriteHTML = `<div class="hero-sprite">${heroData.sprite}</div>`;
        }
        // <<== FIN DE LA CORRECCIÓN ==>>

        const isLocked = heroInstance.stars === 0;
        const card = document.createElement('div');
            // Añadimos la clase 'is-locked' si el héroe no está desbloqueado
        card.className = `hero-card ${heroData.rarity} ${isLocked ? 'is-locked' : ''}`;
        
            // Si está bloqueado, mostramos la tarjeta "fantasma" con el progreso de fragmentos
        if (isLocked) {
                // Asumimos un coste de 20 fragmentos para desbloquear (a 1 estrella)
            const fragmentsNeededToUnlock = HERO_FRAGMENTS_PER_STAR[1] || 20;
            // Usamos la variable spriteHTML que acabamos de crear
            card.innerHTML = `
                ${spriteHTML} 
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-fragments-progress">Fragmentos: ${heroInstance.fragments}/${fragmentsNeededToUnlock}</div>
                <div class="hero-stars">BLOQUEADO</div>
            `;
        } else {
                // Si está desbloqueado, mostramos la tarjeta normal
            card.innerHTML = `
                ${spriteHTML}
                <div class="hero-name">${heroData.name}</div>
                <div class="hero-level">Nivel ${heroInstance.level}</div>
                <div class="hero-stars">${'⭐'.repeat(heroInstance.stars)}</div>
            `;
        }

        card.onclick = () => {
            openHeroDetailModal(heroInstance);
        };
        container.appendChild(card);
    });
    }
    
    modal.style.display = 'flex';
}

/**
 * Abre y rellena la pantalla de detalles de un héroe específico.
 * Muestra un botón de "Asignar" solo si se viene desde el flujo de asignación.
 * @param {object} heroInstance - La instancia del héroe del jugador (con su nivel, xp, etc.).
 */
// En modalLogic.js

function openHeroDetailModal(heroInstance) {
    const modal = document.getElementById('heroDetailModal');
    if (!modal) return;

    const heroData = COMMANDERS[heroInstance.id];
    const playerData = PlayerDataManager.getCurrentPlayer();
    if (!heroData || !playerData) {
        console.error("No se pueden mostrar los detalles del héroe: Faltan datos del héroe o del jugador.");
        return;
    }

    // --- COLUMNA CENTRAL: Retrato, Stats y Progresión ---
    // Retrato grande
    const portraitContainer = document.getElementById('hero-portrait-container');
    if(portraitContainer) portraitContainer.innerHTML = `<img src="${heroData.sprite}" alt="${heroData.name}">`;
    // Nombre y Título
    document.getElementById('heroDetailName').textContent = heroData.name;
    document.getElementById('heroDetailTitle').textContent = heroData.title;
    // Nivel y XP
    const currentLevel = heroInstance.level;
    const xpForNextLevel = getXpForNextLevel(currentLevel);
    document.getElementById('heroDetailLevel').textContent = `${currentLevel} (${heroInstance.skill_points_unspent || 0} Ptos.)`;
    document.getElementById('heroDetailXpBar').style.width = `${xpForNextLevel === 'Max' ? 100 : Math.min(100, (heroInstance.xp / xpForNextLevel) * 100)}%`;
    document.getElementById('heroDetailXpText').textContent = `${heroInstance.xp} / ${xpForNextLevel}`;
    // Evolución y Fragmentos
    const nextStar = heroInstance.stars + 1;
    const fragmentsNeeded = HERO_FRAGMENTS_PER_STAR[nextStar] || 'Max';
    document.getElementById('heroDetailStars').textContent = '⭐'.repeat(heroInstance.stars);
    document.getElementById('heroDetailFragmentBar').style.width = `${fragmentsNeeded === 'Max' ? 100 : Math.min(100, (heroInstance.fragments / fragmentsNeeded) * 100)}%`;
    document.getElementById('heroDetailFragmentText').textContent = `${heroInstance.fragments} / ${fragmentsNeeded}`;
    
    // Botones de acción
    document.getElementById('heroLevelUpBtn').disabled = (playerData.inventory.xp_books || 0) <= 0 || xpForNextLevel === 'Max';
    document.getElementById('heroEvolveBtn').disabled = heroInstance.fragments < fragmentsNeeded || fragmentsNeeded === 'Max';

    // --- COLUMNA IZQUIERDA: Habilidades ---
    const skillsContainer = document.getElementById('heroDetailSkillsContainer');
    if(skillsContainer) {
        skillsContainer.innerHTML = ''; // Limpiar
        
        // La "traducción" de índice a clave del perfil del jugador
        const skillLevelKeys = ['active', 'passive1', 'passive2', 'passive3'];

        heroData.skills.forEach((skillData, index) => {
            if (!skillData) return;
            
            const skillDef = SKILL_DEFINITIONS[skillData.skill_id];
            if (!skillDef) return;
            
            const skillKey = skillLevelKeys[index];
            const skillLevel = heroInstance.skill_levels[skillKey] || 0;
            const starsRequired = index + 1;
            const isUnlocked = heroInstance.stars >= starsRequired;

            const skillDiv = document.createElement('div');
            skillDiv.className = 'skill-item-rok';
            skillDiv.style.opacity = isUnlocked ? '1' : '0.6';

            if (isUnlocked) {
                skillDiv.style.cursor = 'pointer';
                skillDiv.onclick = () => openSkillDetailModal(heroInstance, index);
            }

            let skillHTML = `
                <div class="skill-icon ${index === 0 ? 'active' : ''}">
                    ${skillDef.sprite || 'H'}
                    <div class="skill-level">${isUnlocked ? skillLevel : 0}/5</div>
                </div>
                <div class="skill-info">
                    <h5>${skillDef.name}</h5>
                    <p>${isUnlocked ? skillDef.description_template.substring(0, 50)+'...' : `Se desbloquea con ${starsRequired} ⭐`}</p>
                </div>
            `;
            skillDiv.innerHTML = skillHTML;
            skillsContainer.appendChild(skillDiv);
        });
    }

    // --- COLUMNA DERECHA: Pestañas de Talentos y Equipo ---
    const tabs = modal.querySelectorAll('.tab-button');
    const contents = modal.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const contentToShow = document.getElementById(tab.dataset.tab);
            if (contentToShow) contentToShow.classList.add('active');
        });
    });
    // Forzar la primera pestaña como activa por defecto
    document.querySelector('.tab-button[data-tab="talents"]').click();

    // --- LÓGICA FINAL: ASIGNACIÓN Y VISUALIZACIÓN ---
    const barracksModal = document.getElementById('barracksModal');
    const assignmentMode = barracksModal.dataset.assignmentMode === 'true';
    const footer = document.querySelector('.hero-main-layout'); // Añadiremos el botón aquí
    
    // Limpiar botón de asignación previo
    const oldAssignBtn = document.getElementById('heroAssignBtn');
    if (oldAssignBtn) oldAssignBtn.remove();
    
    if (assignmentMode && footer) {
        const targetUnitId = barracksModal.dataset.targetUnitId;
        const targetUnit = units.find(u => u.id === targetUnitId);
        
        if (targetUnit) {
            const assignBtn = document.createElement('button');
            assignBtn.id = 'heroAssignBtn';
            assignBtn.textContent = 'Asignar a esta División';
            assignBtn.style.cssText = 'grid-column: 2; margin-top: 15px; padding: 12px; font-size: 1.1em; background-color: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;';
            
            assignBtn.onclick = () => {
                assignHeroToUnit(targetUnit, heroInstance.id);
                modal.style.display = 'none';
                barracksModal.style.display = 'none';
            };
            footer.appendChild(assignBtn);
        }
    }
    
    modal.style.display = 'flex';
}

function openSkillDetailModal(heroInstance, skillIndex) {
    const modal = document.getElementById('skillDetailModal');
    if (!modal) return;

    const heroData = COMMANDERS[heroInstance.id];
    const skillData = heroData.skills[skillIndex];
    const skillDef = SKILL_DEFINITIONS[skillData.skill_id];
    
    // Rellenar cabecera
    document.getElementById('skillDetailIcon').textContent = skillDef.sprite || 'H';
    document.getElementById('skillDetailName').textContent = skillDef.name;
    let currentLevel = heroInstance.skill_levels[skillIndex] || 0;
    if (skillIndex === 0 && currentLevel === 0) {
        currentLevel = 1;
    }
    document.getElementById('skillDetailCurrentLevel').textContent = `Nivel Actual: ${currentLevel}/5`;
    
    // Rellenar cuerpo
    document.getElementById('skillDetailDescription').textContent = skillDef.description_template.replace('{filter_desc}', 'las tropas aplicables');
    
    // Rellenar vista previa de niveles
    const levelPreviewContainer = document.getElementById('skillLevelPreview');
    levelPreviewContainer.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const level = i + 1;
        const bonusValue = skillData.scaling_override[i];
        let description = skillDef.description_template.replace('{X}', bonusValue);
        
        const row = document.createElement('div');
        row.className = 'level-row';
        if (level === currentLevel) {
            row.classList.add('current');
        }
        row.textContent = `Nivel ${level}: ${description}`;
        levelPreviewContainer.appendChild(row);
    }
    
    // Rellenar pie y configurar botón
    const upgradeBtn = document.getElementById('upgradeSkillBtn');
    const canUpgrade = (heroInstance.skill_points_unspent || 0) > 0 && currentLevel < 5 && currentLevel > 0;
    upgradeBtn.disabled = !canUpgrade;
    
    upgradeBtn.onclick = () => {
        // Lógica de mejora (la implementaremos después, ahora solo cierra)
        modal.style.display = 'none';
    };

    document.getElementById('closeSkillDetailBtn').onclick = () => {
        modal.style.display = 'none';
    };

    modal.style.display = 'flex';
}

/**
 * Asigna un héroe a una división y recalcula sus stats.
 * @param {object} unit - La división objetivo.
 * @param {string} commanderId - El ID del héroe a asignar.
 */
function assignHeroToUnit(unit, commanderId) {
    if (!unit || !commanderId) return;

    if (gameState.isTutorialActive) {
        TutorialManager.notifyActionCompleted('hero_assigned'); 
    }
    

    const playerActiveCommanders = gameState.activeCommanders[unit.player];
    
    // Comprobar que el héroe no esté ya en uso
    if (playerActiveCommanders.includes(commanderId)) {
        logMessage(`Error: El general ${COMMANDERS[commanderId].name} ya está comandando otra división.`);
        return;
    }
    
    // Añadir al héroe a la lista de activos
    playerActiveCommanders.push(commanderId);
    unit.commander = commanderId;
    
    Chronicle.logEvent('commander_assigned', { unit, commander: COMMANDERS[commanderId] });
    logMessage(`¡El general ${COMMANDERS[commanderId].name} ha tomado el mando de la división "${unit.name}"!`);
    
    recalculateUnitStats(unit);
    UIManager.updateUnitStrengthDisplay(unit);
    UIManager.showUnitContextualInfo(unit, true);
    UIManager.renderAllUnitsFromData();
}

// AÑADIR ESTE BLOQUE AL FINAL DE modalLogic.js

/**
 * Abre el modal del "Altar de los Deseos" y actualiza los datos.
 */
function openDeseosModal() {
    const modal = document.getElementById('deseosModal');
    if (!modal || !PlayerDataManager.currentPlayer) return;

    // Actualizar el contador de sellos
    document.getElementById('sellosCount').textContent = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
    
    // Ocultar resultados de tiradas anteriores al abrir
    document.getElementById('gachaResultContainer').style.display = 'none';

    // Llama a la función centralizada para mostrar la pantalla
    showScreen(modal);
}

/**
 * Muestra los resultados de una tirada de gacha en el modal.
 * @param {Array<object>} results - El array de objetos de resultado devuelto por GachaManager.
 */
function showGachaResults(results) {
    const resultContainer = document.getElementById('gachaResultContainer');
    const resultList = document.getElementById('gachaResultList');
    if (!resultContainer || !resultList) return;
    
    resultList.innerHTML = ''; // Limpiar resultados anteriores
    
    // Animar la aparición de cada resultado
    results.forEach((res, index) => {
        setTimeout(() => {
            const heroData = COMMANDERS[res.heroId];
            const li = document.createElement('li');

            // Añadir clase de rareza para el color del CSS
            const rarityKey = res.rarity.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            li.classList.add(`rarity-${rarityKey}`);

            li.innerHTML = `Has obtenido <strong>${res.fragments} fragmentos</strong> de [${res.rarity}] ${heroData.sprite} ${heroData.name}`;
            
            // Animación simple de entrada
            li.style.opacity = '0';
            li.style.transition = 'opacity 0.3s ease-in-out';
            resultList.appendChild(li);
            requestAnimationFrame(() => li.style.opacity = '1');
            
        }, index * 100); // Aparece un resultado cada 100ms
    });

    resultContainer.style.display = 'block';

    // Actualizar el contador de sellos en la UI después de haberlos gastado.
    document.getElementById('sellosCount').textContent = PlayerDataManager.currentPlayer.currencies.sellos_guerra || 0;
}

/**
 * Escucha eventos del DOM relacionados con el modal del gacha.
 * Se debe llamar una vez al iniciar la aplicación.
 */
function setupGachaModalListeners() {
    const openBtn = document.getElementById('openDeseosBtn');
    const closeBtn = document.getElementById('closeDeseosBtn');
    const wishOnceBtn = document.getElementById('wishOnceBtn');
    const wishTenTimesBtn = document.getElementById('wishTenTimesBtn');

    if (openBtn) openBtn.addEventListener('click', openDeseosModal);
    
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('deseosModal').style.display = 'none';
    });
    
    if (wishOnceBtn) wishOnceBtn.addEventListener('click', () => {
        const activeBannerId = document.querySelector('.banner.active').dataset.bannerId;
        GachaManager.executeWish(activeBannerId, 1);
    });
    
    if (wishTenTimesBtn) wishTenTimesBtn.addEventListener('click', () => {
        const activeBannerId = document.querySelector('.banner.active').dataset.bannerId;
        GachaManager.executeWish(activeBannerId, 10);
    });
}

// Asegurarse de que los listeners se configuran cuando el DOM está listo
document.addEventListener('DOMContentLoaded', setupGachaModalListeners);