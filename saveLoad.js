// saveLoad.js
// Funciones para guardar y cargar el estado del juego.

function handleSaveGame() {
    if (!gameState || !board || !units) {
        logMessage("Error: Estado del juego no inicializado para guardar.");
        return;
    }
    const gameDataToSave = {
        gameState: gameState,
        board: board.map(row => row.map(hex => ({ // Solo guardar datos serializables, no el 'element' DOM
            terrain: hex.terrain,
            owner: hex.owner,
            structure: hex.structure,
            isCity: hex.isCity,
            isCapital: hex.isCapital,
            resourceNode: hex.resourceNode,
            visibility: hex.visibility // Guardar estado de niebla
        }))),
        units: units.map(unit => ({ // Excluir 'element'
            ...unit, // Copia todas las propiedades de la unidad
            element: undefined // Asegura que 'element' no se guarde
        })),
        unitIdCounter: unitIdCounter
    };

    try {
        const dataStr = JSON.stringify(gameDataToSave);
        const blob = new Blob([dataStr], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hexGeneralEvolved_save.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logMessage("Partida Guardada.");
    } catch (error) {
        logMessage("Error al guardar la partida: " + error.message);
        console.error("Error de guardado:", error);
    }
}

function handleLoadGame(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedData = JSON.parse(e.target.result);
            if (!loadedData.gameState || !loadedData.board || !loadedData.units) {
                throw new Error("Archivo de guardado inválido o corrupto.");
            }

            // 1. Limpiar estado actual y DOM del tablero
            if (gameBoard) gameBoard.innerHTML = ''; // Limpiar el DOM del tablero
            resetGameStateVariables(); // Restablecer variables de estado globales

            // 2. Restaurar gameState y contadores del archivo cargado
            // Es crucial hacer copias profundas de objetos anidados si es necesario,
            // aunque aquí la asignación directa de gameState debería funcionar si la estructura es simple.
            Object.assign(gameState, loadedData.gameState); // Copia superficial, podría necesitar ajuste para objetos anidados
            // Asegurar que playerResources es una copia correcta
            gameState.playerResources = JSON.parse(JSON.stringify(loadedData.gameState.playerResources));
            gameState.cities = JSON.parse(JSON.stringify(loadedData.gameState.cities));


            unitIdCounter = loadedData.unitIdCounter;
            
            // 3. Recrear `board` array y elementos DOM de hexágonos
            board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
            if (gameBoard) {
                 gameBoard.style.width = `${BOARD_COLS * HEX_WIDTH + HEX_WIDTH / 2}px`;
                 gameBoard.style.height = `${BOARD_ROWS * HEX_VERT_SPACING + HEX_HEIGHT * 0.25}px`;
            }


            for (let r_load = 0; r_load < BOARD_ROWS; r_load++) {
                for (let c_load = 0; c_load < BOARD_COLS; c_load++) {
                    const hexElement = createHexDOMElementWithListener(r_load, c_load); // Crea hex y añade listener
                    if (gameBoard) gameBoard.appendChild(hexElement);
                    
                    const loadedHexData = loadedData.board[r_load]?.[c_load];
                    if (loadedHexData) {
                        board[r_load][c_load] = { 
                            element: hexElement,
                            terrain: loadedHexData.terrain,
                            owner: loadedHexData.owner,
                            structure: loadedHexData.structure,
                            isCity: loadedHexData.isCity,
                            isCapital: loadedHexData.isCapital,
                            resourceNode: loadedHexData.resourceNode,
                            visibility: loadedHexData.visibility, // Restaurar visibilidad
                            unit: null // La unidad se asignará después
                        };
                    } else {
                        // Crear un hexágono base si falta en los datos guardados (menos probable)
                         board[r_load][c_load] = { element: hexElement, terrain: 'plains', owner: null, structure: null, isCity: false, isCapital: false, resourceNode: null, visibility: {player1: 'hidden', player2: 'hidden'}, unit: null };
                    }
                }
            }

            // 4. Recrear unidades (datos y DOM)
            units = []; // Asegurar que el array de unidades está vacío
            loadedData.units.forEach(unitData => {
                const unitElement = document.createElement('div');
                unitElement.classList.add('unit', `player${unitData.player}`);
                unitElement.textContent = unitData.sprite;
                unitElement.dataset.id = unitData.id;

                const strengthDisplay = document.createElement('div');
                strengthDisplay.classList.add('unit-strength');
                // unitData.currentHealth ya debería estar en el objeto cargado
                strengthDisplay.textContent = unitData.currentHealth;
                unitElement.appendChild(strengthDisplay);
                
                if (gameBoard) gameBoard.appendChild(unitElement);
                
                const fullUnit = { ...unitData, element: unitElement }; // Re-enlazar el elemento DOM
                units.push(fullUnit);
                
                // Enlazar la unidad al hexágono en la estructura 'board'
                if (fullUnit.r !== -1 && fullUnit.c !== -1 && board[fullUnit.r]?.[fullUnit.c]) {
                    board[fullUnit.r][fullUnit.c].unit = fullUnit;
                }
            });
            
            // 5. Renderizar estado y actualizar UI
            renderFullBoardVisualState(); // Aplicar clases y posicionar unidades
            updateAllUIDisplays();    // Actualizar sidebar, fase, niebla, etc.
            deselectUnit();         // Asegurar que no hay nada seleccionado
            logMessage("Partida Cargada Correctamente.");
            
            if(setupScreen) setupScreen.style.display = 'none';
            if(gameContainer) gameContainer.style.display = 'flex';

        } catch (error) {
            logMessage("Error al cargar la partida: " + error.message);
            console.error("Error de Carga Detallado:", error);
            // Opcional: volver al estado inicial si la carga falla
            initApp(); // initApp se definirá en main.js
        }
    };
    reader.readAsText(file);
    if (loadGameInput) loadGameInput.value = ""; // Resetear input para permitir cargar mismo archivo
}