// cheats.js
// Funciones de trucos y depuración para el juego.

console.log("cheats.js CARGADO - Funciones de trucos disponibles en la consola.");

/**
 * Añade una gran cantidad de todos los recursos al jugador 1.
 * Uso en consola: modoDios()
 */
function modoDios() {
    if (!gameState || !gameState.playerResources[1]) {
        console.error("No se puede activar el modo Dios: la partida no ha comenzado o el jugador 1 no existe.");
        return;
    }
    const playerRes = gameState.playerResources[1];
    playerRes.oro = (playerRes.oro || 0) + 5000;
    playerRes.comida = (playerRes.comida || 0) + 1000;
    playerRes.hierro = (playerRes.hierro || 0) + 1000;
    playerRes.piedra = (playerRes.piedra || 0) + 1000;
    playerRes.madera = (playerRes.madera || 0) + 1000;
    playerRes.researchPoints = (playerRes.researchPoints || 0) + 500;
    
    // Forzar actualización de la UI
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }
    
    const message = "¡MODO DIOS! Recursos y Puntos de Investigación añadidos al Jugador 1.";
    if (typeof logMessage === "function") logMessage(message);
    else console.log(message);
}

/**
 * Da una cantidad específica de un recurso al jugador especificado.
 * @param {string} resourceType - El tipo de recurso ('oro', 'comida', 'researchPoints', etc.).
 * @param {number} amount - La cantidad a añadir.
 * @param {number} [playerNum=1] - El número del jugador (1 o 2). Por defecto es 1.
 * Uso en consola: darRecurso('oro', 1000) o darRecurso('researchPoints', 200, 2)
 */
function darRecurso(resourceType, amount, playerNum = 1) {
    if (!gameState || !gameState.playerResources[playerNum]) {
        console.error(`No se puede dar recurso: la partida no ha comenzado o el jugador ${playerNum} no existe.`);
        return;
    }
    if (typeof gameState.playerResources[playerNum][resourceType] === 'undefined') {
        console.warn(`El recurso "${resourceType}" no parece existir. Se creará, pero revisa el nombre.`);
    }

    gameState.playerResources[playerNum][resourceType] = (gameState.playerResources[playerNum][resourceType] || 0) + amount;
    
    if (typeof UIManager !== 'undefined' && UIManager.updateAllUIDisplays) {
        UIManager.updateAllUIDisplays();
    }
    
    const message = `+${amount} de ${resourceType} añadido al Jugador ${playerNum}.`;
    if (typeof logMessage === "function") logMessage(message);
    else console.log(message);
}

/**
 * Investiga instantáneamente una tecnología para el jugador actual.
 * @param {string} techId - El ID de la tecnología en mayúsculas (ej: 'GUNPOWDER').
 * Uso en consola: investigar('GUNPOWDER')
 */
function investigar(techId) {
    const playerNum = gameState.currentPlayer;
    if (!gameState || !gameState.playerResources[playerNum]) {
        console.error("No se puede investigar: la partida no ha comenzado o no hay un jugador activo.");
        return;
    }
    if (!TECHNOLOGY_TREE_DATA[techId]) {
        console.error(`Tecnología con ID "${techId}" no encontrada en TECHNOLOGY_TREE_DATA.`);
        return;
    }

    const playerTechs = gameState.playerResources[playerNum].researchedTechnologies;
    if (playerTechs.includes(techId)) {
        console.warn(`El jugador ${playerNum} ya ha investigado ${techId}.`);
        return;
    }

    playerTechs.push(techId);
    
    // Refrescar lógicas que dependen de tecnologías
    if (typeof populateAvailableRegimentsForModal === "function") {
        populateAvailableRegimentsForModal();
    }
    
    const message = `¡Truco! ${TECHNOLOGY_TREE_DATA[techId].name} (${techId}) investigada para el Jugador ${playerNum}.`;
    if (typeof logMessage === "function") logMessage(message);
    else console.log(message);
}

/**
 * Hace visible todo el mapa para el jugador actual (desactiva la niebla de guerra).
 * Uso en consola: revelarMapa()
 */
function revelarMapa() {
    if (!board || board.length === 0) {
        console.error("No se puede revelar el mapa: el tablero no está inicializado.");
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
    if (typeof logMessage === "function") logMessage(message);
    else console.log(message);
}