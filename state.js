// state.js
// Contiene las variables globales que definen el estado del juego.

let gameState = {};
// ... (tus variables existentes: board, units, selectedUnit, etc.) ...
let board = []; // Representación lógica del tablero (array de arrays de hexágonos)
let units = []; // Array de todas las unidades en el juego
let selectedUnit = null; // Referencia a la unidad actualmente seleccionada por el jugador
let unitIdCounter = 0; // Para generar IDs únicos para las unidades
let VISUAL_DEBUG_MODE = false;

// Modo de colocación de unidades (usado en la fase de despliegue)
let placementMode = {
    active: false,
    unitData: null, // Objeto de datos de la unidad a colocar (pre-configurado)
    unitType: null  // Tipo de unidad si se crea desde cero (ej. 'INFANTRY_LIGHT')
};

const GAME_DATA_REGISTRY = {
    scenarios: {},
    maps: {} 
};

console.log('GAME_DATA_REGISTRY definido:', typeof GAME_DATA_REGISTRY, GAME_DATA_REGISTRY); // Log para confirmar

// Función original para escaramuzas
function resetGameStateVariables() {
    console.log("state.js: Ejecutando resetGameStateVariables()...");

    gameState = {
        currentPlayer: 1,
        currentPhase: "setup", // "setup", "deployment", "play", "gameOver"
        turnNumber: 1,

        playerTypes: { // Tipos de jugador (human, ai_easy, ai_normal, ai_hard)
            player1: 'human',
            player2: 'ai_normal'
        },
        playerAiLevels: { // Niveles de IA si el jugador es IA
            // player1: 'normal', // Solo si player1 es IA
            player2: 'normal'
        },
        playerResources: { // Recursos iniciales o actuales por jugador
            1: { oro: 100, hierro: 20, piedra: 20, madera: 20, comida: 20, researchedTechnologies: ["ORGANIZATION"]}, // Ejemplo para Jugador 1
            2: { oro: 100, hierro: 20, piedra: 20, madera: 20, comida: 20, researchedTechnologies: ["ORGANIZATION"]}  // Ejemplo para Jugador 2
        },
        
        deploymentUnitLimit: 3, // Límite de unidades a desplegar por jugador
        unitsPlacedByPlayer: { 1: 0, 2: 0 }, // Contador de unidades desplegadas

        isCampaignBattle: false,
        currentCampaignId: null,
        currentCampaignTerritoryId: null,
        currentScenarioId: null, // ID del escenario actual (de campaignManager o skirmish)
        currentMapId: null,      // ID del mapa táctico actual

        // Variables que podrían ser parte de un escenario cargado
        currentScenarioData: null, // Objeto completo del escenario cargado
        currentMapData: null,      // Objeto completo del mapa táctico cargado

        cities: [], // Array de objetos ciudad en el mapa actual
        
        // Para la lógica de paneo
        justPanned: false,

        // Puedes añadir más propiedades según las necesidades de tu juego
        // Por ejemplo, tecnologías investigadas, etc.
        // researchedTechnologies: { 1: [], 2: [] },
    };

    // Resetear otras variables globales si es necesario
    board = [];
    units = [];
    selectedUnit = null;
    unitIdCounter = 0; // O podrías querer que persista entre algunas cosas
    placementMode = { active: false, unitData: null, unitType: null };

    console.log("state.js: gameState reseteado:", JSON.parse(JSON.stringify(gameState))); // Usar stringify para una copia profunda en el log
}

// Nueva función para configurar el estado para una batalla de campaña
async function resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignTerritoryId) {
    console.log("state.js: Resetting and setting up tactical game for scenario:", scenarioData.scenarioId, "on campaign territory:", campaignTerritoryId);

    // Reinicializar gameState con la configuración base del escenario
    gameState = {
        currentPhase: "deployment", // La fase inicial es despliegue
        playerTypes: {
            player1: "human", // Asumimos que el jugador humano es siempre el Player 1
            player2: scenarioData.enemySetup.aiProfile || "ai_normal" // Perfil de IA del enemigo o normal por defecto
        },
        currentPlayer: 1, // El jugador 1 siempre comienza el despliegue
        turnNumber: 0, // El turno comienza en 0 durante el despliegue, luego se va a 1
        playerResources: {
            1: JSON.parse(JSON.stringify(scenarioData.playerSetup.initialResources || INITIAL_PLAYER_RESOURCES[0])),
            2: JSON.parse(JSON.stringify(scenarioData.enemySetup.initialResources || INITIAL_PLAYER_RESOURCES[1]))
        },
        deploymentUnitLimit: scenarioData.deploymentUnitLimit || Infinity, // Límite de unidades para desplegar
        unitsPlacedByPlayer: { 1: 0, 2: 0 }, // Contador de unidades desplegadas por jugador
        cities: [], // Se poblará durante la inicialización del tablero
        isCampaignBattle: true,
        currentScenarioData: scenarioData,
        currentMapData: mapTacticalData,
        currentCampaignTerritoryId: campaignTerritoryId,
        
        // Mantener estas variables reseteadas al inicio del juego táctico
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // Asegurarse de que las variables globales relacionadas con el tablero y unidades estén limpias
    board = []; // Limpiar la referencia al tablero lógico
    units = []; // Limpiar el array de unidades
    selectedUnit = null; // Limpiar la unidad seleccionada
    unitIdCounter = 0; // Resetear el contador de IDs de unidades
    placementMode = { active: false, unitData: null, unitType: null }; // Resetear el modo de colocación
    // También limpiar otras variables globales que no son parte de gameState si es necesario
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;


    // Inicializar el tablero visual y lógico (se encarga de poblar 'board' y 'gameState.cities')
    // Esta función también colocará unidades iniciales si la fase no es 'deployment'
    await initializeGameBoardForScenario(mapTacticalData, scenarioData); // LLAMADA ÚNICA

    // Actualizar la UI después de que el tablero esté listo y las unidades iniciales (si hay) estén en el estado
    if (typeof updateAllUIDisplays === "function") updateAllUIDisplays();
    else console.warn("updateAllUIDisplays no definida en state.js.");

    // Preparar UI para el despliegue
    if (gameState.currentPhase === "deployment") {
        if (typeof populateAvailableRegimentsForModal === "function") populateAvailableRegimentsForModal();
        if (typeof logMessage === "function") logMessage(`Despliegue para ${scenarioData.displayName}. Jugador 1, coloca tus fuerzas.`);
    } else { // Si no es despliegue, significa que ya hay unidades pre-colocadas (modo escaramuza o escenario sin despliegue)
        if (typeof logMessage === "function") logMessage(`¡Comienza la batalla por ${scenarioData.displayName}!`);
    }

    console.log("state.js: Finalizado resetAndSetupTacticalGame. Estado actual:", JSON.parse(JSON.stringify(gameState)));
}
