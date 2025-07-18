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

// ============================= INICIO DEL BLOQUE MODIFICADO =============================
const Cheats = { // ¡Reemplaza el objeto Cheats completo con esto!

    // --- COMANDOS ORIGINALES (Mantenidos por compatibilidad) ---
    modo_dios: () => { Cheats.indiano_rico(1); },
    add_resource: (resourceType, amount, playerNumStr = '1') => { /* ... la lógica original se mantiene abajo... */ },
    research_tech: (techId) => { Cheats.momento_eureka(techId); },
    reveal_map: () => { /* ... la lógica original se mantiene abajo... */ },
    create_unit: (unitTypeKey, rStr, cStr, playerIdStr = null) => { /* ... la lógica original se mantiene abajo... */ },
    teleport_unit: (unitId, rStr, cStr) => { /* ... la lógica original se mantiene abajo... */ },
    next_turn: () => { /* ... la lógica original se mantiene abajo... */ },
    win_game: () => { /* ... la lógica original se mantiene abajo... */ },
    lose_game: () => { /* ... la lógica original se mantiene abajo... */ },


    // --- 1. GESTIÓN DE RECURSOS ---

    /**
     * ¡Un indiano vuelve a casa! Añade una gran cantidad de todos los recursos al jugador.
     * Uso: indiano_rico [jugador]
     * Ejemplo: indiano_rico 2 (para el jugador 2)
     */
    indiano_rico: (playerNumStr = '1') => {
        const playerNum = parseInt(playerNumStr);
        if (isNaN(playerNum) || !gameState.playerResources[playerNum]) {
            return logToConsole(`Error en 'indiano_rico': El jugador ${playerNumStr} no es válido.`, 'error');
        }
        const playerRes = gameState.playerResources[playerNum];
        playerRes.oro = (playerRes.oro || 0) + 10000;
        playerRes.comida = (playerRes.comida || 0) + 5000;
        playerRes.hierro = (playerRes.hierro || 0) + 5000;
        playerRes.piedra = (playerRes.piedra || 0) + 5000;
        playerRes.madera = (playerRes.madera || 0) + 5000;
        playerRes.researchPoints = (playerRes.researchPoints || 0) + 1000;
        // <<== NUEVO: Añadimos Puntos de Reclutamiento a la bonanza ==>>
        playerRes.puntosReclutamiento = (playerRes.puntosReclutamiento || 0) + 8000;
        if (UIManager) UIManager.updateAllUIDisplays();
        logToConsole(`¡El jugador ${playerNum} ha vuelto de las Indias cargado de riquezas!`, 'success');
    },

    /**
     * ¡Las minas del Potosí nunca se agotan! Añade oro a un jugador.
     * Uso: potosi <cantidad> [jugador]
     * Ejemplo: potosi 5000 1
     */
    potosi: (amount, playerNumStr = '1') => {
        Cheats.add_resource('oro', amount, playerNumStr);
    },

    /**
     * Un nuevo impuesto de la Pérfida Albión... Quita recursos a un jugador.
     * Uso: tasazo_britanico <recurso> <cantidad> [jugador]
     * Ejemplo: tasazo_britanico comida 200 2
     */
    tasazo_britanico: (resourceType, amount, playerNumStr = '1') => {
        const value = parseInt(amount);
        const playerNum = parseInt(playerNumStr);
        if (isNaN(value) || isNaN(playerNum)) {
            return logToConsole("Uso: tasazo_britanico <recurso> <cantidad> [jugador]", 'error');
        }
        if (!gameState.playerResources[playerNum]) {
            return logToConsole(`Error en 'tasazo_britanico': El jugador ${playerNum} no existe.`, 'error');
        }

        const playerRes = gameState.playerResources[playerNum];
        if (typeof playerRes[resourceType] === 'undefined') {
            return logToConsole(`Advertencia: El recurso "${resourceType}" no existe para este jugador.`, 'warning');
        }
        
        playerRes[resourceType] = Math.max(0, (playerRes[resourceType] || 0) - value);
        
        if (UIManager) UIManager.updateAllUIDisplays();
        logToConsole(`¡El jugador ${playerNum} sufre un tasazo británico! -${value} de ${resourceType}.`, 'success');
    },

    /**
     * Un ingreso extra inesperado por gracia divina o real. Añade cualquier recurso a un jugador.
     * Uso: diezmo_favorable <recurso> <cantidad> [jugador]
     * Ejemplo: diezmo_favorable hierro 1000 1
     */
    diezmo_favorable: (resourceType, amount, playerNumStr = '1') => {
        // Esta función es un alias temático.
        // Reutiliza la lógica robusta de la función original 'add_resource'.
        Cheats.add_resource(resourceType, amount, playerNumStr);
    },
    // --- 2. GESTIÓN DE TECNOLOGÍA ---
    
    /**
     * ¡Inspiración divina! Investiga instantáneamente una tecnología para el jugador.
     * Uso: momento_eureka <ID_TECNOLOGIA> [jugador]
     */
    momento_eureka: (techId, playerNumStr = null) => {
        const playerNum = playerNumStr ? parseInt(playerNumStr) : gameState.currentPlayer;
        if (isNaN(playerNum) || !gameState.playerResources[playerNum]) {
            return logToConsole(`Error en 'momento_eureka': Jugador no válido.`, 'error');
        }
        
        // Simulación temporal para llamar a la función original con el estado correcto.
        const originalPlayer = gameState.currentPlayer;
        gameState.currentPlayer = playerNum;
        Cheats.research_tech(techId); // Llama a la lógica original de research_tech
        gameState.currentPlayer = originalPlayer; // Restaura el jugador
    },

    /**
     * ¡Una desgracia! Olvidas cómo hacer algo...
     * Uso: fuga_de_cerebros <ID_TECNOLOGIA> [jugador]
     */
    fuga_de_cerebros: (techId, playerNumStr = '1') => {
        const playerNum = parseInt(playerNumStr);
        if (isNaN(playerNum) || !gameState.playerResources[playerNum]) {
            return logToConsole(`Error en 'fuga_de_cerebros': Jugador no válido.`, 'error');
        }

        const playerTechs = gameState.playerResources[playerNum].researchedTechnologies;
        const techIndex = playerTechs.indexOf(techId.toUpperCase());

        if (techIndex === -1) {
            return logToConsole(`El jugador ${playerNum} no había investigado la tecnología ${techId}.`, 'warning');
        }

        playerTechs.splice(techIndex, 1);
        
        if (typeof populateAvailableRegimentsForModal === "function") populateAvailableRegimentsForModal();
        if (typeof refreshTechTreeContent === "function") refreshTechTreeContent();
        
        logToConsole(`¡Fuga de cerebros! El jugador ${playerNum} ha olvidado ${techId}.`, 'success');
        if (UIManager) UIManager.updateAllUIDisplays();
    },

    
    // --- 3. GESTIÓN DE UNIDADES (MORAL Y EXPERIENCIA) ---

    /**
     * ¡Por España y por el Rey! Sube la moral de una unidad.
     * Uso: arenga_del_general <id_unidad> <cantidad>
     */
    arenga_del_general: (unitId, amountStr) => {
        const unit = units.find(u => u.id === unitId);
        const amount = parseInt(amountStr);
        if (!unit || isNaN(amount)) {
            return logToConsole("Uso: arenga_del_general <id_unidad> <cantidad>", 'error');
        }
        unit.morale = Math.min((unit.maxMorale || 125), (unit.morale || 50) + amount);
        if (UIManager && selectedUnit?.id === unit.id) UIManager.showUnitContextualInfo(unit, true);
        logToConsole(`¡La moral de ${unit.name} sube a ${unit.morale}!`, 'success');
    },

    /**
     * La moral de los soldados cae en picado...
     * Uso: moral_de_waterloo <id_unidad> <cantidad>
     */
    moral_de_waterloo: (unitId, amountStr) => {
        const unit = units.find(u => u.id === unitId);
        const amount = parseInt(amountStr);
        if (!unit || isNaN(amount)) {
            return logToConsole("Uso: moral_de_waterloo <id_unidad> <cantidad>", 'error');
        }
        unit.morale = Math.max(0, (unit.morale || 50) - amount);
        if (UIManager && selectedUnit?.id === unit.id) UIManager.showUnitContextualInfo(unit, true);
        logToConsole(`La moral de ${unit.name} cae a ${unit.morale}...`, 'success');
    },

    /**
     * Veteranos curtidos en mil batallas. Añade experiencia a una unidad.
     * Uso: tercios_viejos <id_unidad> <cantidad>
     */
    tercios_viejos: (unitId, amountStr) => {
        const unit = units.find(u => u.id === unitId);
        const amount = parseInt(amountStr);
        if (!unit || isNaN(amount)) {
            return logToConsole("Uso: tercios_viejos <id_unidad> <cantidad>", 'error');
        }
        unit.experience = (unit.experience || 0) + amount;
        checkAndApplyLevelUp(unit); // La función se encarga de loguear el ascenso
        if (UIManager && selectedUnit?.id === unit.id) UIManager.showUnitContextualInfo(unit, true);
        logToConsole(`${amount} de experiencia añadida a ${unit.name}.`, 'success');
    },


    // --- 4. CREACIÓN Y DESTRUCCIÓN DE UNIDADES ---

    /**
     * Elimina una unidad del mapa. "¡Que le corten la cabeza!"
     * Uso: la_purga_de_cromwell <id_unidad>
     */
    la_purga_de_cromwell: (unitId) => {
        const unitIndex = units.findIndex(u => u.id === unitId);
        if (unitIndex === -1) {
            return logToConsole(`No se encontró la unidad con ID ${unitId}.`, 'error');
        }
        const unitToDestroy = units[unitIndex];
        logToConsole(`Ejecutando la purga sobre ${unitToDestroy.name}...`, 'success');
        handleUnitDestroyed(unitToDestroy, null); // Llama a la lógica de destrucción
        if (UIManager) UIManager.updateAllUIDisplays();
    },

    /**
     * Crea un legendario general romano y su infantería pesada.
     * Uso: julio_cesar <r> <c> [jugador]
     */
    julio_cesar: (r, c, player) => Cheats.create_unit('Infantería Pesada', r, c, player),

    /**
     * Crea una horda de arqueros a caballo.
     * Uso: gengis_khan <r> <c> [jugador]
     */
    gengis_khan: (r, c, player) => Cheats.create_unit('Arqueros a Caballo', r, c, player),

    /**
     * Crea un colono para fundar nuevas ciudades.
     * Uso: cristobal_colon <r> <c> [jugador]
     */
    cristobal_colon: (r, c, player) => Cheats.create_unit('Colono', r, c, player),
    
    /**
     * Crea una unidad de arcabuceros, precursores de los Tercios.
     * Uso: el_gran_capitan <r> <c> [jugador]
     */
    el_gran_capitan: (r, c, player) => Cheats.create_unit('Arcabuceros', r, c, player),


    // --- IMPLEMENTACIÓN COMPLETA DE FUNCIONES ORIGINALES ---
    // (Añadidas aquí para que todo esté en un solo bloque)
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

    research_tech: (techId) => { 
        const playerNum = gameState.currentPlayer;
        if (!gameState || !gameState.playerResources || !gameState.playerResources[playerNum]) {
            if (typeof logToConsole === "function") logToConsole("Error: No se puede investigar (partida no iniciada o jugador no activo).", 'error');
            return;
        }
        if (typeof TECHNOLOGY_TREE_DATA === 'undefined' || !TECHNOLOGY_TREE_DATA[techId]) {
            if (typeof logToConsole === "function") logToConsole(`Error: Tecnología con ID "${techId}" no encontrada.`, 'error');
            return;
        }

        const playerTechs = gameState.playerResources[playerNum].researchedTechnologies;
        if (playerTechs.includes(techId)) {
            if (typeof logToConsole === "function") logToConsole(`Advertencia: El jugador ${playerNum} ya ha investigado ${techId}.`, 'warning');
            return;
        }

        playerTechs.push(techId);
        
        if (typeof populateAvailableRegimentsForModal === "function") populateAvailableRegimentsForModal();
        if (typeof refreshTechTreeContent === "function") refreshTechTreeContent();
        
        const message = `¡Truco! ${TECHNOLOGY_TREE_DATA[techId].name} (${techId}) investigada para el Jugador ${playerNum}.`;
        if (typeof logToConsole === "function") logToConsole(message, 'success');
        if (typeof UIManager !== 'undefined') UIManager.updateAllUIDisplays();
    },

    reveal_map: () => { 
        if (!board || board.length === 0) {
            if (typeof logToConsole === "function") logToConsole("Error: No se puede revelar el mapa (tablero no inicializado).", 'error');
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
        if (typeof updateFogOfWar === "function") updateFogOfWar();
        const message = "Niebla de guerra desactivada para el jugador actual.";
        if (typeof logToConsole === "function") logToConsole(message, 'info');
    },

    create_unit: (unitTypeKey, rStr, cStr, playerIdStr = null) => {
        const targetR = parseInt(rStr);
        const targetC = parseInt(cStr);
        const targetPlayerId = playerIdStr === null ? gameState.currentPlayer : parseInt(playerIdStr);

        if (!unitTypeKey || isNaN(targetR) || isNaN(targetC) || isNaN(targetPlayerId)) {
            throw new Error("Uso: create_unit <tipo_unidad_key> <r> <c> [player_id]. r, c, y player_id deben ser números.");
        }
        const regimentType = REGIMENT_TYPES[unitTypeKey]; 
        if (!regimentType) {
            if(typeof logToConsole === "function") logToConsole(`Tipos disponibles: ${Object.keys(REGIMENT_TYPES).join(', ')}`, 'info');
            throw new Error(`Tipo de unidad desconocido: ${unitTypeKey}.`);
        }
        if (targetR < 0 || targetR >= board.length || targetC < 0 || targetC >= board[0].length) {
            throw new Error(`Coordenadas de hexágono inválidas: (${targetR}, ${targetC}).`);
        }
        if (board[targetR][targetC].unit) {
            throw new Error(`El hexágono (${targetR}, ${targetC}) ya está ocupado por ${board[targetR][targetC].unit.name}.`);
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
            morale: 50, // Moral inicial para unidades de truco
            maxMorale: 125,
            hasRetaliatedThisTurn: false,
            r: targetR,
            c: targetC,
            sprite: regimentType.sprite,
            element: null, 
            hasMoved: false, 
            hasAttacked: false,
            cost: { oro: regimentType.cost?.oro || 0 } 
        };
        if (typeof placeFinalizedDivision === 'function') {
            placeFinalizedDivision(newUnitData, targetR, targetC);
        } else {
            console.error("placeFinalizedDivision no está definida, no se puede crear unidad.");
        }
        if (typeof logToConsole === "function") logToConsole(`Unidad "${newUnitData.name}" creada para Jugador ${targetPlayerId} en (${targetR}, ${targetC}).`, 'success');
        if (typeof UIManager !== 'undefined') UIManager.updateAllUIDisplays();
    },

    teleport_unit: (unitId, rStr, cStr) => { /* ...Lógica original sin cambios... */ },
    next_turn: () => { /* ...Lógica original sin cambios... */ },
    win_game: () => { /* ...Lógica original sin cambios... */ },
    lose_game: () => { /* ...Lógica original sin cambios... */ },
    // Pegar aquí las implementaciones originales de las 4 funciones de abajo si se borran accidentalmente
};

// Copiando las 4 funciones originales que faltaban
Cheats.teleport_unit = (unitId, rStr, cStr) => {
    const targetR = parseInt(rStr);
    const targetC = parseInt(cStr);
    if (!unitId || isNaN(targetR) || isNaN(targetC)) throw new Error("Uso: teleport_unit <unit_id> <r> <c>.");
    const unitToTeleport = units.find(u => u.id === unitId); 
    if (!unitToTeleport) throw new Error(`Unidad con ID "${unitId}" no encontrada.`);
    const currentHexData = board[unitToTeleport.r]?.[unitToTeleport.c];
    const targetHexData = board[targetR]?.[targetC];
    if (!targetHexData) throw new Error(`Coordenadas de destino inválidas: (${targetR}, ${targetC}).`);
    if (targetHexData.unit && targetHexData.unit.id !== unitToTeleport.id) throw new Error(`El hexágono (${targetR}, ${targetC}) ya está ocupado.`);
    if (currentHexData && currentHexData.unit?.id === unitToTeleport.id) {
        currentHexData.unit = null;
        if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(currentHexData.r, currentHexData.c);
    }
    targetHexData.unit = unitToTeleport;
    unitToTeleport.r = targetR; unitToTeleport.c = targetC;
    if (targetHexData.owner !== unitToTeleport.player) targetHexData.owner = unitToTeleport.player;
    if (typeof positionUnitElement === "function") positionUnitElement(unitToTeleport);
    if (typeof renderSingleHexVisuals === "function") renderSingleHexVisuals(targetR, targetC);
    if(typeof logToConsole === "function") logToConsole(`Unidad "${unitToTeleport.name}" teletransportada a (${targetR}, ${targetC}).`, 'success');
};
Cheats.next_turn = () => {
    if (typeof handleEndTurn === "function") { 
        if(typeof logToConsole === "function") logToConsole("Avanzando al siguiente turno...");
        handleEndTurn();
    } else throw new Error("handleEndTurn no está definida.");
};
Cheats.win_game = () => {
    if (typeof endTacticalBattle === "function") { 
        endTacticalBattle(gameState.currentPlayer);
        if(typeof logToConsole === "function") logToConsole("¡Victoria forzada!", 'success');
    } else throw new Error("endTacticalBattle no está definida.");
};
Cheats.lose_game = () => {
    if (typeof endTacticalBattle === "function") {
        const winningPlayer = gameState.currentPlayer === 1 ? 2 : 1; 
        endTacticalBattle(winningPlayer);
        if(typeof logToConsole === "function") logToConsole("¡Derrota forzada!", 'error');
    } else throw new Error("endTacticalBattle no está definida.");
};

