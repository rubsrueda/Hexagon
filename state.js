// state.js
// Contiene las variables globales que definen el estado del juego.
console.log("state.js CARGADO (con Proxy de depuración)"); // Modificado log

var gameState = {}; // Variable global para el estado
let board = [];
let units = [];
let selectedUnit = null;
let unitIdCounter = 0;
let VISUAL_DEBUG_MODE = false;

// ===>>> CORRECCIÓN AQUÍ: Declarar las variables de estado para la división <<<===
let _unitBeingSplit = null;         // La unidad original que se está dividiendo.
let _tempOriginalRegiments = [];  // Copia de los regimientos que quedan en la unidad original durante el modal.
let _tempNewUnitRegiments = [];   // Copia de los regimientos que irán a la nueva unidad durante el modal.

// ===>>> CORRECCIÓN AQUÍ: Declarar las variables de estado para la construcción <<<===
let hexToBuildOn = null;                // Guarda las coordenadas {r, c} del hexágono donde se va a construir.
let selectedStructureToBuild = null;    // Guarda el tipo de estructura (string) que se ha seleccionado en el modal.

gameState.capitalCityId = {
    1: null, // Coordenadas o null si no hay capital
    2: null
};

let placementMode = {
    active: false,
    unitData: null,
    unitType: null
};

const GAME_DATA_REGISTRY = {
    scenarios: {},
    maps: {} 
};

console.log('GAME_DATA_REGISTRY definido:', typeof GAME_DATA_REGISTRY, GAME_DATA_REGISTRY);

const gameStateProxyHandler = {
    set: function(target, property, value, receiver) {
        // Este código se ejecuta CADA VEZ que una propiedad de gameState cambia
        // Por ejemplo, gameState.currentPlayer = 2; o gameState.playerResources = {...}
        console.groupCollapsed(`%c[PROXY DETECT - STATE] Modificando gameState.${String(property)}`, "color: red; font-weight: bold;");
        console.log("Objeto afectado (gameState):", target);
        console.log(`Propiedad: '${String(property)}'`);
        console.log("Valor Anterior:", JSON.parse(JSON.stringify(target[property])));
        console.log("Nuevo Valor:", JSON.parse(JSON.stringify(value)));
        console.trace("Pila de llamadas:"); // Esto nos dirá QUIÉN está haciendo el cambio
        console.groupEnd();
        
        // Realiza la modificación real
        target[property] = value;
        return true; // Indica que la operación fue exitosa
    },
     // Agregar 'get' para depurar LECTURAS de gameState también
     get: function(target, property, receiver) {
         // Evitar logs ruidosos para propiedades muy comunes
         if (property !== 'justPanned' && property !== 'selectedHexR' && property !== 'selectedHexC' && property !== 'preparingAction' && property !== 'selectedUnit' && property !== 'element' && property !== 'playerResources') {
             console.log(`%c[PROXY READ - STATE] Accediendo a gameState.${String(property)}`, "color: blue;");
         }
         return Reflect.get(target, property, receiver);
     }
};

function resetGameStateVariables(playerCount = 2) { // <-- Acepta un parámetro, con 2 como valor por defecto
    console.log(`state.js: Ejecutando resetGameStateVariables() para ${playerCount} jugadores...`);

    const p1civ = domElements.player1Civ ? domElements.player1Civ.value : 'ninguna';
    const p2civ = domElements.player2Civ ? domElements.player2Civ.value : 'ninguna';

    const initialGameStateObject = {
        numPlayers: playerCount, // <-- Usa el parámetro
        currentPlayer: 1,
        eliminatedPlayers: [],
        currentPhase: "deployment",
        turnNumber: 1,
        playerTypes: {},
        playerAiLevels: {},
        playerCivilizations: {},
        activeCommanders: {},
        capitalCityId: {},
        playerResources: {},
        unitsPlacedByPlayer: {},
        isCampaignBattle: false,
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // Este bucle ahora creará los jugadores necesarios dinámicamente
    for (let i = 1; i <= playerCount; i++) {
        initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(INITIAL_PLAYER_RESOURCES[i - 1]));
        initialGameStateObject.playerResources[i].researchedTechnologies = ["ORGANIZATION"];
        initialGameStateObject.activeCommanders[i] = [];
        initialGameStateObject.capitalCityId[i] = null;
        initialGameStateObject.unitsPlacedByPlayer[i] = 0;
    }
    
    // Asignaciones específicas para escaramuza (se pueden mover a la llamada si es necesario)
    initialGameStateObject.playerTypes['player1'] = domElements.player1TypeSelect.value;
    initialGameStateObject.playerTypes['player2'] = domElements.player2TypeSelect.value;
    initialGameStateObject.playerCivilizations[1] = p1civ;
    initialGameStateObject.playerCivilizations[2] = p2civ;

    gameState = initialGameStateObject;

    // Reseteo de variables globales
    board = [];
    units = [];
    selectedUnit = null;
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
        AiGameplayManager.unitRoles.clear();
    }
    
    // Limpiar variables de construcción/división de modales si existen (guardas de seguridad)
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;
    if (typeof _unitBeingSplit !== 'undefined') _unitBeingSplit = null;
    if (typeof _tempOriginalRegiments !== 'undefined') _tempOriginalRegiments = [];
    if (typeof _tempNewUnitRegiments !== 'undefined') _tempNewUnitRegiments = [];
    
    console.log(`state.js: gameState reseteado para ${playerCount} jugadores.`);
}

async function resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignTerritoryId) {
    console.log("state.js: Resetting and setting up tactical game for scenario:", scenarioData.scenarioId);

    const initialP1Resources = JSON.parse(JSON.stringify(scenarioData.playerSetup.initialResources || INITIAL_PLAYER_RESOURCES[0]));
    const initialP2Resources = JSON.parse(JSON.stringify(scenarioData.enemySetup.initialResources || INITIAL_PLAYER_RESOURCES[1]));
    if (scenarioData.enemySetup.aiProfile?.startsWith('ai_')) {
        initialP2Resources.oro = (initialP2Resources.oro || 0) + 150;
    }

    initialP1Resources.researchedTechnologies = initialP1Resources.researchedTechnologies || ["ORGANIZATION"];
    initialP2Resources.researchedTechnologies = initialP2Resources.researchedTechnologies || ["ORGANIZATION"];
    
    const initialGameStateObject = {
        currentPhase: "deployment",
        playerTypes: {
            player1: "human",
            player2: scenarioData.enemySetup.aiProfile || "ai_normal"
        },
        currentPlayer: 1,
        turnNumber: 0,
        playerResources: {
            1: initialP1Resources,
            2: initialP2Resources
        },
        activeCommanders: { 1: [], 2: [] }, // Se asegura de que SIEMPRE exista
        deploymentUnitLimit: scenarioData.deploymentUnitLimit || Infinity,
        unitsPlacedByPlayer: { 1: 0, 2: 0 },
        cities: [],
        isCampaignBattle: true,
        currentScenarioData: scenarioData,
        currentMapData: mapTacticalData,
        currentCampaignTerritoryId: campaignTerritoryId,
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null,
        // Y añadimos la propiedad de Civilizaciones que también faltaba aquí
        playerCivilizations: { 1: 'ninguna', 2: 'ninguna' }
    };

    gameState = initialGameStateObject;
    

    // Asegurarse de que las variables globales relacionadas con el tablero y unidades estén limpias
    board = [];
    units = [];
    selectedUnit = null; // Asegurarnos de que la variable global también se limpia
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
    if (typeof AiGameplayManager !== 'undefined' && AiGameplayManager.unitRoles) {
        AiGameplayManager.unitRoles.clear();
    }

    // Limpiar variables de construcción/división de modales (guardas de seguridad)
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;
     if (typeof _unitBeingSplit !== 'undefined') _unitBeingSplit = null;
    if (typeof _tempOriginalRegiments !== 'undefined') _tempOriginalRegiments = [];
    if (typeof _tempNewUnitRegiments !== 'undefined') _tempNewUnitRegiments = [];


    // Inicializar el tablero visual y lógico
    await initializeGameBoardForScenario(mapTacticalData, scenarioData);

    // Preparar UI para el despliegue o juego
    if (gameState.currentPhase === "deployment") {
        if (typeof populateAvailableRegimentsForModal === "function") populateAvailableRegimentsForModal();
        if (typeof logMessage === "function") logMessage(`Despliegue para ${scenarioData.displayName}. Jugador 1, coloca tus fuerzas.`);
    } else { // Si no es despliegue
        if (typeof logMessage === "function") logMessage(`¡Comienza la batalla por ${scenarioData.displayName}!`);
    }

    console.log("state.js: Finalizado resetAndSetupTacticalGame.", JSON.parse(JSON.stringify(gameState)));
}

function resetGameStateForIberiaMagna() {
    console.log("state.js: Ejecutando resetGameStateForIberiaMagna() para 8 jugadores...");

    const numPlayers = 8;
    const initialResources = INITIAL_PLAYER_RESOURCES_MAGNA; // Usamos la nueva constante

    // 1. Crear el objeto de estado inicial completo
    const initialGameStateObject = {
        numPlayers: numPlayers,
        currentPlayer: 1,
        eliminatedPlayers: [], // (NUEVO) Array para rastrear jugadores derrotados
        currentPhase: "deployment", // O directamente "play" si no hay fase de despliegue
        turnNumber: 1,
        
        // Estructuras de datos para N jugadores
        playerTypes: {},
        playerAiLevels: {},
        playerCivilizations: {},
        activeCommanders: {},
        capitalCityId: {},
        playerResources: {},
        unitsPlacedByPlayer: {},

        // Propiedades de estado generales
        isCampaignBattle: false, // Esto es una partida "Magna", no una misión de campaña
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // 2. Rellenar los datos para cada uno de los 8 jugadores
    for (let i = 1; i <= numPlayers; i++) {
        const playerKey = `player${i}`;
        
        // Asumimos que todos son humanos por ahora. Esto se podría configurar en una futura pantalla de lobby.
        initialGameStateObject.playerTypes[playerKey] = 'human'; 
        
        // Copiamos los recursos iniciales para cada jugador
        initialGameStateObject.playerResources[i] = JSON.parse(JSON.stringify(initialResources[i - 1]));
        
        // Inicializamos el resto de arrays/objetos
        initialGameStateObject.playerCivilizations[i] = 'ninguna'; // Se puede asignar después
        initialGameStateObject.activeCommanders[i] = [];
        initialGameStateObject.capitalCityId[i] = null;
        initialGameStateObject.unitsPlacedByPlayer[i] = 0;
    }

    // 3. Asignar el nuevo objeto de estado a la variable global
    gameState = initialGameStateObject;

    // 4. Resetear las otras variables globales
    board = [];
    units = [];
    selectedUnit = null;
    unitIdCounter = 0;
    
    console.log("state.js: gameState reseteado para Tronos de Iberia.", JSON.parse(JSON.stringify(gameState)));
}