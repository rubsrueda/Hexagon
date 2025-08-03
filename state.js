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

function resetGameStateVariables() {
    console.log("state.js: Ejecutando resetGameStateVariables() para escaramuza...");

    // 1. Crear el objeto de estado inicial completo (como objeto plano)
    const initialGameStateObject = {
        currentPlayer: 1,
        currentPhase: "setup",
        turnNumber: 1,
        playerTypes: { player1: 'human', player2: 'ai_normal' },
        playerAiLevels: { player2: 'normal' },
        playerCivilizations: { 1: 'ninguna', 2: 'ninguna' }, 
        capitalCityId: { 1: null, 2: null },
        playerResources: {
            // Crear copias profundas de los recursos iniciales
            1: JSON.parse(JSON.stringify(INITIAL_PLAYER_RESOURCES[0])),
            2: JSON.parse(JSON.stringify(INITIAL_PLAYER_RESOURCES[1]))
        },
        deploymentUnitLimit: 3,
        unitsPlacedByPlayer: { 1: 0, 2: 0 },
        isCampaignBattle: false,
        currentCampaignId: null,
        currentCampaignTerritoryId: null,
        currentScenarioData: null,
        currentMapData: null,
        cities: [],
        justPanned: false,
        selectedHexR: -1,
        selectedHexC: -1,
        preparingAction: null,
        selectedUnit: null
    };

    // Aplicar bonus de oro a la IA J2 en el objeto inicial
    if (initialGameStateObject.playerResources[2]) {
        initialGameStateObject.playerResources[2].oro = 12500;
    }

    // --- ¡CORRECCIÓN CLAVE AQUÍ! Inicializar researchedTechnologies en el objeto ANTES del Proxy ---
    // Asegurarse de que el array researchedTechnologies existe para ambos jugadores
    // e inicializarlo con "ORGANIZATION" si aún no existe o está vacío.
    initialGameStateObject.playerResources[1].researchedTechnologies = initialGameStateObject.playerResources[1].researchedTechnologies || [];
    if (!initialGameStateObject.playerResources[1].researchedTechnologies.includes("ORGANIZATION")) {
        initialGameStateObject.playerResources[1].researchedTechnologies.push("ORGANIZATION");
    }

    initialGameStateObject.playerResources[2].researchedTechnologies = initialGameStateObject.playerResources[2].researchedTechnologies || [];
     if (!initialGameStateObject.playerResources[2].researchedTechnologies.includes("ORGANIZATION")) {
        initialGameStateObject.playerResources[2].researchedTechnologies.push("ORGANIZATION");
    }
    // --- FIN CORRECCIÓN ---

    // 2. --- ¡CAMBIO CRUCIAL! Asignar el objeto inicial ENCAPSULADO EN UN PROXY a la variable global gameState ---
    // Esto sobrescribe la referencia anterior de gameState (si la había) con el nuevo Proxy.
    gameState = initialGameStateObject;
    // --- FIN CAMBIO CRUCIAL ---

    // Resetear otras variables globales que no son parte de gameState
    board = [];
    units = [];
    selectedUnit = null; // Asegurarnos de que la variable global también se limpia
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
    if (typeof AiManager !== 'undefined' && AiManager.unitRoles) {
        AiManager.unitRoles.clear();
    }
    
    // Limpiar variables de construcción/división de modales si existen (guardas de seguridad)
    if (typeof currentDivisionBuilder !== 'undefined') currentDivisionBuilder = [];
    if (typeof hexToBuildOn !== 'undefined') hexToBuildOn = null;
    if (typeof selectedStructureToBuild !== 'undefined') selectedStructureToBuild = null;
    if (typeof _unitBeingSplit !== 'undefined') _unitBeingSplit = null;
    if (typeof _tempOriginalRegiments !== 'undefined') _tempOriginalRegiments = [];
    if (typeof _tempNewUnitRegiments !== 'undefined') _tempNewUnitRegiments = [];


    console.log("state.js: gameState (Proxy) reseteado para escaramuza.", JSON.parse(JSON.stringify(gameState)));
    console.log("--- LOG ESTADO --- state.js -> resetGameStateVariables FIN: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));
}


async function resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignTerritoryId) {
    console.log("state.js: Resetting and setting up tactical game for scenario:", scenarioData.scenarioId, "on campaign territory:", campaignTerritoryId, "(con Proxy de depuración)"); // Modificado log

    // 1. Crear el objeto de estado inicial completo (como objeto plano)
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
        selectedUnit: null
    };

    // 2. --- ¡CAMBIO CRUCIAL! Asignar el objeto inicial ENCAPSULADO EN UN PROXY a la variable global gameState ---
    gameState = initialGameStateObject;
    // --- FIN CAMBIO CRUCIAL ---


    // Asegurarse de que las variables globales relacionadas con el tablero y unidades estén limpias
    board = [];
    units = [];
    selectedUnit = null; // Asegurarnos de que la variable global también se limpia
    unitIdCounter = 0;
    placementMode = { active: false, unitData: null, unitType: null };
    
    // Limpiar roles de la IA
     if (typeof AiManager !== 'undefined' && AiManager.unitRoles) {
        AiManager.unitRoles.clear();
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

    console.log("state.js: Finalizado resetAndSetupTacticalGame. gameState es ahora un Proxy.", JSON.parse(JSON.stringify(gameState)));
    console.log("--- LOG ESTADO --- state.js -> resetGameStateVariables FIN: researchedTechnologies =", JSON.parse(JSON.stringify(gameState?.playerResources?.[1]?.researchedTechnologies || [])));
}