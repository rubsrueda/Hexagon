// cheats.js
// Funciones de trucos y depuración para el juego.
// Este archivo ahora define un objeto 'Cheats' en el ámbito global.

// Las variables globales como gameState, board, units, TECHNOLOGY_TREE_DATA, logMessage, UIManager,
// REGIMENT_TYPES, unitIdCounter, getHexNeighbors, hexDistance, positionUnitElement,
// renderSingleHexVisuals, endTacticalBattle, handleEndTurn, selectedUnit, placeFinalizedDivision
// se asumen accesibles globalmente debido al orden de carga de scripts en index.html.

console.log("cheats.js CARGADO - Funciones de trucos disponibles en la consola (Modo Clásico).");

// 'logToConsole' ahora es una función global definida en debugConsole.js
// No se importa, se asume su existencia global.

const Cheats = { // ¡Ya no es 'export const', ahora es 'const' en el ámbito global!
    /**
     * Añade una gran cantidad de todos los recursos al jugador 1.
     * Uso en consola: modo_dios
     */
    modo_dios: () => { 
        if (!gameState || !gameState.playerResources[1]) {
            // logToConsole es global ahora
            if (typeof logToConsole === "function") logToConsole("Error: No se pudo activar modo Dios (partida no iniciada o J1 no existe).", 'error');
            if (typeof logMessage === "function") logMessage("Error: No se pudo activar modo Dios.");
            return;
        }
        const playerRes = gameState.playerResources[1];
        playerRes.oro = (playerRes.oro || 0) + 5000;
        playerRes.comida = (playerRes.comida || 0) + 1000;
        playerRes.hierro = (playerRes.hierro || 0) + 1000;
        playerRes.piedra = (playerRes.piedra || 0) + 1000;
        playerRes.madera = (playerRes.madera || 0) + 1000;
        playerRes.researchPoints = (playerRes.researchPoints || 0) + 500;
        
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
        
        const message = "¡MODO DIOS! Recursos y Puntos de Investigación añadidos al Jugador 1.";
        if (typeof logToConsole === "function") logToConsole(message, 'success');
        if (typeof logMessage === "function") logMessage(message);
    },

    /**
     * Da una cantidad específica de un recurso al jugador especificado.
     * @param {string} resourceType - El tipo de recurso ('oro', 'comida', 'researchPoints', etc.).
     * @param {string} amount - La cantidad a añadir (como string, se parseará).
     * @param {string} [playerNumStr='1'] - El número del jugador (como string, se parseará). Por defecto es '1'.
     * Uso en consola: add_resource oro 1000 (Jugador 1), add_resource researchPoints 200 2 (Jugador 2)
     */
    add_resource: (resourceType, amount, playerNumStr = '1') => { 
        const value = parseInt(amount);
        const playerNum = parseInt(playerNumStr);
        if (isNaN(value) || isNaN(playerNum)) {
            throw new Error("Uso: add_resource <tipo_recurso> <cantidad> [numero_jugador]. Cantidad y número de jugador deben ser números.");
        }

        if (!gameState || !gameState.playerResources[playerNum]) {
            if (typeof logToConsole === "function") logToConsole(`No se puede dar recurso: la partida no ha comenzado o el jugador ${playerNum} no existe.`, 'error');
            if (typeof logMessage === "function") logMessage(`Error: Jugador ${playerNum} no encontrado.`);
            return;
        }
        if (typeof gameState.playerResources[playerNum][resourceType] === 'undefined') {
            if (typeof logToConsole === "function") logToConsole(`Advertencia: El recurso "${resourceType}" no parece existir. Se creará, pero revisa el nombre.`, 'warning');
        }

        gameState.playerResources[playerNum][resourceType] = (gameState.playerResources[playerNum][resourceType] || 0) + value;
        
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
        
        const message = `+${value} de ${resourceType} añadido al Jugador ${playerNum}.`;
        if (typeof logToConsole === "function") logToConsole(message, 'success');
        if (typeof logMessage === "function") logMessage(message);
    },

    /**
     * Investiga instantáneamente una tecnología para el jugador actual.
     * @param {string} techId - El ID de la tecnología en mayúsculas (ej: 'GUNPOWDER').
     * Uso en consola: research_tech GUNPOWDER
     */
    research_tech: (techId) => { 
        const playerNum = gameState.currentPlayer;
        if (!gameState || !gameState.playerResources || !gameState.playerResources[playerNum]) {
            if (typeof logToConsole === "function") logToConsole("Error: No se puede investigar (partida no iniciada o jugador no activo).", 'error');
            if (typeof logMessage === "function") logMessage("Error: No se pudo investigar la tecnología.");
            return;
        }
        if (typeof TECHNOLOGY_TREE_DATA === 'undefined' || !TECHNOLOGY_TREE_DATA[techId]) {
            if (typeof logToConsole === "function") logToConsole(`Error: Tecnología con ID "${techId}" no encontrada.`, 'error');
            if (typeof logMessage === "function") logMessage(`Error: Tecnología "${techId}" no encontrada.`);
            return;
        }

        const playerTechs = gameState.playerResources[playerNum].researchedTechnologies;
        if (playerTechs.includes(techId)) {
            if (typeof logToConsole === "function") logToConsole(`Advertencia: El jugador ${playerNum} ya ha investigado ${techId}.`, 'warning');
            if (typeof logMessage === "function") logMessage(`"${TECHNOLOGY_TREE_DATA[techId].name}" ya investigada.`);
            return;
        }

        playerTechs.push(techId);
        
        if (typeof populateAvailableRegimentsForModal === "function") {
            populateAvailableRegimentsForModal();
        }
        if (typeof refreshTechTreeContent === "function") { 
             refreshTechTreeContent();
        }
        
        const message = `¡Truco! ${TECHNOLOGY_TREE_DATA[techId].name} (${techId}) investigada para el Jugador ${playerNum}.`;
        if (typeof logToConsole === "function") logToConsole(message, 'success');
        if (typeof logMessage === "function") logMessage(message);
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
            UIManager.updateAllUIDisplays();
        }
    },

    /**
     * Hace visible todo el mapa para el jugador actual (desactiva la niebla de guerra).
     * Uso en consola: reveal_map
     */
    reveal_map: () => { 
        if (!board || board.length === 0) {
            if (typeof logToConsole === "function") logToConsole("Error: No se puede revelar el mapa (tablero no inicializado).", 'error');
            if (typeof logMessage === "function") logMessage("Error: Mapa no inicializado para revelar.");
            return;
        }
        const playerKey = `player${gameState.currentPlayer}`;
        for (let r = 0; r < board.length; r++) {
            for (let c = 0; c < board[0].length; c++) {
                if (board[r][c]) {
                    board[r][c].visibility[playerKey] = 'visible';
                }
            }
        }
        if (typeof updateFogOfWar === "function") { 
            updateFogOfWar();
        }
        const message = "Niebla de guerra desactivada para el jugador actual.";
        if (typeof logToConsole === "function") logToConsole(message, 'info');
        if (typeof logMessage === "function") logMessage(message);
    },

    /**
     * Crea una unidad en el mapa.
     * Uso: create_unit <tipo_unidad_key> <r> <c> [player_id]
     * Ejemplo: create_unit Infanteria_Ligera 5 5 1 (Nota el case-sensitive)
     * unitTypeKey debe ser una clave de REGIMENT_TYPES (ej. 'Infantería Ligera', 'Caballería Ligera').
     */
    create_unit: (unitTypeKey, rStr, cStr, playerIdStr = null) => {
        const targetR = parseInt(rStr);
        const targetC = parseInt(cStr);
        const targetPlayerId = playerIdStr === null ? gameState.currentPlayer : parseInt(playerIdStr);

        if (!unitTypeKey || isNaN(targetR) || isNaN(targetC) || isNaN(targetPlayerId)) {
            throw new Error("Uso: create_unit <tipo_unidad_key> <r> <c> [player_id]. r, c, y player_id deben ser números.");
        }

        const regimentType = REGIMENT_TYPES[unitTypeKey]; 
        
        if (!regimentType) {
            if (typeof logToConsole === "function") {
                logToConsole(`Error: Tipo de unidad desconocido: "${unitTypeKey}".`, 'error');
                logToConsole(`Tipos disponibles: ${Object.keys(REGIMENT_TYPES).join(', ')}`, 'info');
            }
            throw new Error(`Tipo de unidad desconocido: ${unitTypeKey}.`);
        }

        if (targetR < 0 || targetR >= board.length || targetC < 0 || targetC >= board[0].length) {
            throw new Error(`Coordenadas de hexágono inválidas: (${targetR}, ${targetC}). Fuera de los límites del tablero.`);
        }
        if (board[targetR][targetC].unit) {
            throw new Error(`El hexágono (${targetR}, ${targetC}) ya está ocupado por una unidad: ${board[targetR][targetC].unit.name}.`);
        }

        const newUnitData = {
            id: `u${unitIdCounter++}`,
            player: targetPlayerId,
            name: `${unitTypeKey} Truco`, 
            regiments: [ { ...regimentType, type: unitTypeKey } ], 
            attack: regimentType.attack,
            defense: regimentType.defense,
            maxHealth: regimentType.health,
            currentHealth: regimentType.health,
            movement: regimentType.movement,
            currentMovement: regimentType.movement, 
            visionRange: regimentType.visionRange,
            attackRange: regimentType.attackRange,
            initiative: regimentType.initiative,
            experience: 0,
            maxExperience: 500, 
            hasRetaliatedThisTurn: false,
            r: targetR,
            c: targetC,
            sprite: regimentType.sprite,
            element: null, 
            hasMoved: false, 
            hasAttacked: false,
            cost: { oro: regimentType.cost?.oro || 0 } 
        };

        // Utilizar la función existente `placeFinalizedDivision`
        if (typeof placeFinalizedDivision === 'function') {
            const prevPhase = gameState.currentPhase;
            const prevUnitHasMoved = newUnitData.hasMoved;
            const prevUnitHasAttacked = newUnitData.hasAttacked;
            gameState.currentPhase = "cheat_deployment"; // Establecer fase temporal
            newUnitData.hasMoved = false; 
            newUnitData.hasAttacked = false; 

            placeFinalizedDivision(newUnitData, targetR, targetC);

            gameState.currentPhase = prevPhase; 
            newUnitData.hasMoved = prevUnitHasMoved; 
            newUnitData.hasAttacked = prevUnitHasAttacked;

        } else {
            board[targetR][targetC].unit = newUnitData;
            units.push(newUnitData);
            const unitElement = document.createElement('div');
            unitElement.classList.add('unit', `player${newUnitData.player}`);
            unitElement.textContent = newUnitData.sprite;
            unitElement.dataset.id = newUnitData.id;
            const strengthDisplay = document.createElement('div');
            strengthDisplay.classList.add('unit-strength');
            strengthDisplay.textContent = newUnitData.currentHealth;
            unitElement.appendChild(strengthDisplay);
            // gameBoard debe ser accesible globalmente si no se usa placeFinalizedDivision
            if (typeof gameBoard !== 'undefined' && gameBoard) {
                gameBoard.appendChild(unitElement);
            } else {
                console.error("DEBUG CHEATS: gameBoard no está definido globalmente, no se puede añadir el elemento de la unidad.");
            }
            newUnitData.element = unitElement;
            if (typeof positionUnitElement === 'function') positionUnitElement(newUnitData); 
            if (typeof UIManager !== 'undefined' && UIManager.updateUnitStrengthDisplay) UIManager.updateUnitStrengthDisplay(newUnitData);
        }
        
        if (typeof logToConsole === "function") logToConsole(`Unidad "${newUnitData.name}" (ID: ${newUnitData.id}) creada para el Jugador ${targetPlayerId} en (${targetR}, ${targetC}).`, 'success');
        if (typeof logMessage === "function") logMessage(`Unidad "${newUnitData.name}" creada.`);
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
    },

    /**
     * Teletransporta una unidad.
     * Uso: teleport_unit <unit_id> <r> <c>
     * Ejemplo: teleport_unit u12 3 4
     */
    teleport_unit: (unitId, rStr, cStr) => {
        const targetR = parseInt(rStr);
        const targetC = parseInt(cStr);

        if (!unitId || isNaN(targetR) || isNaN(targetC)) {
            throw new Error("Uso: teleport_unit <unit_id> <r> <c>. unit_id, r, c deben ser válidos.");
        }

        const unitToTeleport = units.find(u => u.id === unitId); 
        if (!unitToTeleport) {
            throw new Error(`Unidad con ID "${unitId}" no encontrada.`);
        }

        const currentHexData = board[unitToTeleport.r]?.[unitToTeleport.c];
        const targetHexData = board[targetR]?.[targetC];

        if (!targetHexData) {
            throw new Error(`Coordenadas de destino inválidas: (${targetR}, ${targetC}).`);
        }
        if (targetHexData.unit && targetHexData.unit.id !== unitToTeleport.id) {
            throw new Error(`El hexágono (${targetR}, ${targetC}) ya está ocupado por otra unidad: ${targetHexData.unit.name}.`);
        }

        if (currentHexData && currentHexData.unit && currentHexData.unit.id === unitToTeleport.id) {
            currentHexData.unit = null;
            if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(currentHexData.r, currentHexData.c);
        }

        targetHexData.unit = unitToTeleport;
        
        unitToTeleport.r = targetR;
        unitToTeleport.c = targetC;

        if (targetHexData.owner !== unitToTeleport.player) {
            targetHexData.owner = unitToTeleport.player;
        }

        if (typeof positionUnitElement === "function") positionUnitElement(unitToTeleport);
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(targetR, targetC);

        if (typeof logToConsole === "function") logToConsole(`Unidad "${unitToTeleport.name}" (ID: ${unitId}) teletransportada a (${targetR}, ${targetC}).`, 'success');
        if (typeof logMessage === "function") logMessage(`Unidad "${unitToTeleport.name}" teletransportada.`);
        
        if (selectedUnit && selectedUnit.id === unitToTeleport.id && typeof UIManager !== 'undefined' && UIManager.showUnitContextualInfo) {
            UIManager.showUnitContextualInfo(selectedUnit, true); 
        }
        if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) UIManager.updateAllUIDisplays();
    },

    /**
     * Avanza al siguiente turno.
     * Uso: next_turn
     */
    next_turn: () => {
        if (typeof handleEndTurn === "function") { 
            if (typeof logToConsole === "function") logToConsole("Avanzando al siguiente turno...");
            handleEndTurn();
        } else {
            throw new Error("La función handleEndTurn (fin de turno) no está definida.");
        }
    },
    
    /**
     * Termina la partida con victoria para el jugador actual.
     * Uso: win_game
     */
    win_game: () => {
        if (typeof endTacticalBattle === "function") { 
            endTacticalBattle(gameState.currentPlayer);
            if (typeof logToConsole === "function") logToConsole("¡Victoria forzada!", 'success');
        } else {
            throw new Error("La función endTacticalBattle no está definida.");
        }
    },

    /**
     * Termina la partida con derrota para el jugador actual (victoria para el oponente).
     * Uso: lose_game
     */
    lose_game: () => {
        if (typeof endTacticalBattle === "function") {
            const winningPlayer = gameState.currentPlayer === 1 ? 2 : 1; 
            endTacticalBattle(winningPlayer);
            if (typeof logToConsole === "function") logToConsole("¡Derrota forzada!", 'error');
        } else {
            throw new Error("La función endTacticalBattle no está definida.");
        }
    },
};