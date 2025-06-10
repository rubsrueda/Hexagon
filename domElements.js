// domElements.js
console.log("domElements.js: Script cargado. Variables declaradas, esperando inicialización.");

// ---para gameBoard---
let isPanning = false;
let boardInitialX = 0;
let boardInitialY = 0;
let panStartX = 0;     // Coordenada inicial del puntero/touch
let panStartY = 0;
let currentBoardTranslateX = 0;
let currentBoardTranslateY = 0;

let domElementsInitialized = false;

// --- Pantallas Principales y Menús ---
let mainMenuScreenEl, setupScreen, worldMapScreenEl, gameContainer, welcomeHelpModalEl; 

// --- Botones del Menú Principal ---
let startCampaignBtnEl, startSkirmishBtnEl;

// --- Elementos de Configuración de Escaramuza ---
let startGameBtn, player1TypeSelect, player1AiLevelDiv, player1AiLevelSelect,
    player2TypeSelect, resourceLevelSelect, initialUnitsCountSelect, backToMainMenuBtn_fromSetup,
    boardSizeSelect;

// --- Elementos del Mapa Mundial (Campaña) ---
let worldMapImageEl, territoryMarkerContainerEl, campaignMessagesEl, backToMainMenuBtn_fromCampaign;

// --- Modal de Briefing del Escenario ---
let scenarioBriefingModalEl, scenarioTitleEl, scenarioImageEl, scenarioDescriptionEl,
    startScenarioBattleBtnEl, closeScenarioBriefingBtnEl;

// --- Elementos del Juego Táctico (Flotantes y Tablero) ---
let gameBoard, floatingMenuBtn, floatingEndTurnBtn, floatingMenuPanel,
    contextualInfoPanel, closeContextualPanelBtn, gameMessagesMobile,
    floatingCreateDivisionBtn, floatingTechTreeBtn, closeTechTreeBtn;

// Elementos DENTRO del panel de menú flotante
let turnNumberDisplay_float, currentPlayerDisplay_float, floatingMenuTitle,
    concedeBattleBtn_float, saveGameBtn_float, loadGameInput_float, backToMainFromBattleBtn;

// Elementos DENTRO del panel contextual
let contextualTitle, contextualContent, contextualActions;

// --- REFERENCIAS A BOTONES DE ACCIÓN Y MODALES ---
let createDivisionBtn; // Variable global que apuntará al botón que ABRE el modal de crear división
let endTurnBtn;
let saveGameBtn;
let loadGameInput;

// Referencias a modales
let createDivisionModal, buildStructureModal;

// Elementos internos de los modales
let divisionNameInput, availableRegimentsListEl, currentDivisionRegimentsListEl,
    totalDivisionCostDisplay, totalDivisionStatsDisplay, finalizeDivisionBtn,
    buildHexCoordsDisplay, availableStructuresListModalEl, confirmBuildBtn;

// Variable para el mensaje de la UI (gameMessagesMobile.querySelector('p'))
let messagesDisplay;

// Variables para el modal de bienvenida
let closeWelcomeHelpBtn, welcomeHelpTitleEl, welcomeHelpSectionsEl, welcomeHelpFooterEl, doNotShowAgainCheckbox, startGameFromHelpBtn; 


function initializeDomElements() {
    if (domElementsInitialized) return;
    console.log("domElements.js: Inicializando referencias a elementos DOM...");
    
    // Inicialización de elementos del modal de bienvenida
    welcomeHelpModalEl = document.getElementById('welcomeHelpModal');
    closeWelcomeHelpBtn = document.getElementById('closeWelcomeHelpBtn');
    welcomeHelpTitleEl = document.getElementById('welcomeHelpTitle');
    welcomeHelpSectionsEl = document.getElementById('welcomeHelpSections');
    welcomeHelpFooterEl = document.getElementById('welcomeHelpFooter');
    doNotShowAgainCheckbox = document.getElementById('doNotShowAgainCheckbox');
    startGameFromHelpBtn = document.getElementById('startGameFromHelpBtn');

    // Inicialización de elementos principales y de menú
    floatingTechTreeBtn = document.getElementById('floatingTechTreeBtn');
    mainMenuScreenEl = document.getElementById('mainMenuScreen');
    setupScreen = document.getElementById('setupScreen');
    worldMapScreenEl = document.getElementById('worldMapScreen');
    gameContainer = document.querySelector('.game-container');
    startCampaignBtnEl = document.getElementById('startCampaignBtn');
    startSkirmishBtnEl = document.getElementById('startSkirmishBtn');
    startGameBtn = document.getElementById('startGameBtn');
    player1TypeSelect = document.getElementById('player1Type');
    player1AiLevelDiv = document.getElementById('player1AiLevelDiv');
    player1AiLevelSelect = document.getElementById('player1AiLevel');
    player2TypeSelect = document.getElementById('player2Type');
    resourceLevelSelect = document.getElementById('resourceLevel');
    initialUnitsCountSelect = document.getElementById('initialUnitsCount');
    boardSizeSelect = document.getElementById('boardSizeSelect');
    backToMainMenuBtn_fromSetup = document.getElementById('backToMainMenuBtn_fromSetup');
    worldMapImageEl = document.getElementById('worldMapImage');
    territoryMarkerContainerEl = document.getElementById('territoryMarkerContainer');
    campaignMessagesEl = document.getElementById('campaignMessages');
    backToMainMenuBtn_fromCampaign = document.getElementById('backToMainMenuBtn_fromCampaign');
    scenarioBriefingModalEl = document.getElementById('scenarioBriefingModal');
    scenarioTitleEl = document.getElementById('scenarioTitle');
    scenarioImageEl = document.getElementById('scenarioImage');
    scenarioDescriptionEl = document.getElementById('scenarioDescription');
    startScenarioBattleBtnEl = document.getElementById('startScenarioBattleBtn');
    closeScenarioBriefingBtnEl = document.getElementById('closeScenarioBriefingBtn');
    gameBoard = document.getElementById('gameBoard');
    floatingMenuBtn = document.getElementById('floatingMenuBtn');
    floatingEndTurnBtn = document.getElementById('floatingEndTurnBtn');
    floatingMenuPanel = document.getElementById('floatingMenuPanel');
    contextualInfoPanel = document.getElementById('contextualInfoPanel');
    closeContextualPanelBtn = document.getElementById('closeContextualPanelBtn');
    gameMessagesMobile = document.getElementById('gameMessagesMobile');
    turnNumberDisplay_float = document.getElementById('turnNumberDisplay_float');
    currentPlayerDisplay_float = document.getElementById('currentPlayerDisplay_float');
    floatingMenuTitle = document.getElementById('floatingMenuTitle');
    floatingCreateDivisionBtn = document.getElementById('floatingCreateDivisionBtn');
    concedeBattleBtn_float = document.getElementById('concedeBattleBtn_float');
    saveGameBtn_float = document.getElementById('saveGameBtn_float');
    loadGameInput_float = document.getElementById('loadGameInput_float');
    backToMainFromBattleBtn = document.getElementById('backToMainFromBattleBtn');
    contextualTitle = document.getElementById('contextualTitle');
    contextualContent = document.getElementById('contextualContent');
    contextualActions = document.getElementById('contextualActions');

    // Inicialización de modales específicos
    createDivisionModal = document.getElementById('createDivisionModal');
    divisionNameInput = document.getElementById('divisionNameInput');
    availableRegimentsListEl = document.getElementById('availableRegimentsList');
    currentDivisionRegimentsListEl = document.getElementById('currentDivisionRegimentsList');
    totalDivisionCostDisplay = document.getElementById('totalDivisionCostDisplay');
    totalDivisionStatsDisplay = document.getElementById('totalDivisionStatsDisplay');
    finalizeDivisionBtn = document.getElementById('finalizeDivisionBtn');

    buildStructureModal = document.getElementById('buildStructureModal');
    buildHexCoordsDisplay = document.getElementById('buildHexCoordsDisplay');
    availableStructuresListModalEl = document.getElementById('availableStructuresList');
    confirmBuildBtn = document.getElementById('confirmBuildBtn');

    // Asignaciones a variables más generales o de conveniencia
    endTurnBtn = floatingEndTurnBtn;
    saveGameBtn = saveGameBtn_float;
    loadGameInput = loadGameInput_float;
    messagesDisplay = gameMessagesMobile ? gameMessagesMobile.querySelector('p') : null;
    createDivisionBtn = floatingCreateDivisionBtn;

    // Verificaciones y logs de inicialización
    if (!floatingCreateDivisionBtn) console.warn("DOM WARN: floatingCreateDivisionBtn (ID: 'floatingCreateDivisionBtn') NO ENCONTRADO");
    else console.log("DOM OK: floatingCreateDivisionBtn encontrado.");
    if (!finalizeDivisionBtn) console.error("DOM ERROR: finalizeDivisionBtn (ID: 'finalizeDivisionBtn') NO ENCONTRADO");
    else console.log("DOM OK: finalizeDivisionBtn encontrado.");
    if (!confirmBuildBtn) console.error("DOM ERROR: confirmBuildBtn (ID: 'confirmBuildBtn') NO ENCONTRADO");
    else console.log("DOM OK: confirmBuildBtn encontrado.");
    if (!floatingTechTreeBtn) console.warn("DOM WARN: floatingTechTreeBtn no encontrado.");
    else console.log("DOM OK: floatingTechTreeBtn encontrado.")

    domElementsInitialized = true;
    console.log("domElements.js: Referencias a elementos DOM completamente inicializadas.");
}