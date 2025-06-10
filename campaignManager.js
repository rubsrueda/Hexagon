// campaignManager.js

// Se asume que las variables de elementos DOM como mainMenuScreenEl, worldMapScreenEl, etc.,
// y GAME_DATA_REGISTRY, WORLD_MAP_DATA son globales y definidas en otros archivos
// que se cargan antes (domElements.js, state.js, datos de mapa/escenario).

let worldData = null;
let campaignState = {
    conqueredTerritories: new Set(),
    currentTerritoryIdForBattle: null,
    currentScenarioDataForBattle: null,
    currentMapTacticalDataForBattle: null,
};

// --- INICIALIZACIÓN Y NAVEGACIÓN ENTRE PANTALLAS ---
function showScreen(screenToShow) {
    // console.log("[CM] showScreen intentando mostrar:", screenToShow ? screenToShow.id : "null");
    [mainMenuScreenEl, setupScreen, worldMapScreenEl, gameContainer, scenarioBriefingModalEl].forEach(s => {
        if (s) s.style.display = 'none';
    });
    if (screenToShow) {
        const displayStyle = screenToShow.classList.contains('modal') || screenToShow === gameContainer ? 'flex' : 'block';
        screenToShow.style.display = displayStyle;
    }
}

function initializeCampaignMode() {
    console.log("CampaignManager: Initializing Campaign Mode...");
    showScreen(worldMapScreenEl);

    if (typeof WORLD_MAP_DATA === 'undefined') {
        console.error("CampaignManager Error: WORLD_MAP_DATA no está definido.");
        if (campaignMessagesEl) campaignMessagesEl.textContent = "Error: Datos de campaña global no encontrados.";
        return;
    }
    worldData = WORLD_MAP_DATA;

    if (worldMapImageEl && worldData.mapImage) {
         worldMapImageEl.src = worldData.mapImage;
    } else if (worldMapImageEl) {
        worldMapImageEl.src = "";
    }

    loadCampaignProgress();
    renderWorldMap();
    updateCampaignMessages(`Bienvenido, General. Selecciona un territorio para actuar.`);
}

function setupMainMenuListeners() { // Esta función será llamada por main.js -> initApp
    console.log("CampaignManager: setting up main menu listeners...");
    if (!startCampaignBtnEl || !startSkirmishBtnEl || !backToMainMenuBtn_fromCampaign || !backToMainMenuBtn_fromSetup || !closeScenarioBriefingBtnEl || !startScenarioBattleBtnEl) {
        console.error("CampaignManager: Faltan uno o más botones del menú principal/navegación. Asegúrate que domElements.js los inicializó.");
        return;
    }

    startCampaignBtnEl.addEventListener('click', initializeCampaignMode);
    startSkirmishBtnEl.addEventListener('click', () => showScreen(setupScreen));
    backToMainMenuBtn_fromCampaign.addEventListener('click', () => showScreen(mainMenuScreenEl));
    backToMainMenuBtn_fromSetup.addEventListener('click', () => showScreen(mainMenuScreenEl));
    closeScenarioBriefingBtnEl.addEventListener('click', closeScenarioBriefing);
    startScenarioBattleBtnEl.addEventListener('click', handleStartScenarioBattle);
}

// --- LÓGICA DEL MAPA MUNDIAL ---
function renderWorldMap() {
    if (!worldData || !territoryMarkerContainerEl) {
        console.warn("CampaignManager - renderWorldMap: worldData o territoryMarkerContainerEl no listos.");
        return;
    }
    territoryMarkerContainerEl.innerHTML = '';
    for (const territoryId in worldData.territories) {
        const territory = worldData.territories[territoryId];
        const terrEl = document.createElement('div');
        terrEl.classList.add('territory-on-map');
        if (territory.position) {
            terrEl.style.left = territory.position.x + 'px';
            terrEl.style.top = territory.position.y + 'px';
        }
        terrEl.textContent = territory.displayName || territory.name.substring(0, 3);
        terrEl.title = territory.name;
        let ownerClass = 'neutral-territory';
        if (campaignState.conqueredTerritories.has(territoryId)) ownerClass = 'player-controlled';
        else if (territory.initialOwner?.startsWith('ai_')) ownerClass = `ai-controlled ai-owner-${territory.initialOwner}`;
        terrEl.classList.add(ownerClass);
        let canBeSelected = false;
        if (!campaignState.conqueredTerritories.has(territoryId)) {
            if (campaignState.conqueredTerritories.size === 0 && territoryId === worldData.playerStartTerritory) canBeSelected = true;
            else territory.adjacent?.forEach(adjId => { if (campaignState.conqueredTerritories.has(adjId)) canBeSelected = true; });
        }
        if (canBeSelected) {
            terrEl.classList.add('selectable-territory');
            terrEl.addEventListener('click', () => onTerritoryClick(territoryId));
        }
        territoryMarkerContainerEl.appendChild(terrEl);
    }
}

function onTerritoryClick(territoryId) {
    campaignState.currentTerritoryIdForBattle = territoryId;
    if (!worldData || !worldData.territories[territoryId]) {
        console.error("CampaignManager - onTerritoryClick: No se encontraron datos para el territorio:", territoryId);
        return;
    }
    const territoryData = worldData.territories[territoryId];
    const scenarioDataKey = territoryData.scenarioFile;

    if (typeof GAME_DATA_REGISTRY === 'undefined' || !GAME_DATA_REGISTRY.scenarios) {
        console.error("CampaignManager Error: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.scenarios no está definido.");
        updateCampaignMessages(`Error crítico: Registro de escenarios no disponible.`);
        return;
    }
    const scenarioData = GAME_DATA_REGISTRY.scenarios[scenarioDataKey];

    if (typeof scenarioData === 'undefined') {
        console.error(`CampaignManager Error: Datos del escenario "${scenarioDataKey}" no encontrados EN EL REGISTRO.`);
        updateCampaignMessages(`Error al cargar datos para ${territoryData.name}. Clave: ${scenarioDataKey}`);
        campaignState.currentTerritoryIdForBattle = null;
        return;
    }
    campaignState.currentScenarioDataForBattle = scenarioData;

    if (scenarioTitleEl) scenarioTitleEl.textContent = scenarioData.displayName;
    if (scenarioDescriptionEl) scenarioDescriptionEl.textContent = scenarioData.description;
    if (scenarioImageEl) {
        scenarioImageEl.src = scenarioData.briefingImage || "";
        scenarioImageEl.style.display = (scenarioData.briefingImage && scenarioData.briefingImage !== "") ? 'block' : 'none';
    }
    if (scenarioBriefingModalEl) scenarioBriefingModalEl.style.display = 'flex';
}

function closeScenarioBriefing() {
    if (scenarioBriefingModalEl) scenarioBriefingModalEl.style.display = 'none';
    campaignState.currentTerritoryIdForBattle = null;
    campaignState.currentScenarioDataForBattle = null;
    campaignState.currentMapTacticalDataForBattle = null;
}

function handleStartScenarioBattle() {
    if (!campaignState.currentTerritoryIdForBattle || !campaignState.currentScenarioDataForBattle) {
        console.error("CampaignManager: No hay datos válidos para iniciar batalla.");
        updateCampaignMessages("Error al iniciar batalla: Faltan datos.");
        return;
    }
    const scenarioData = campaignState.currentScenarioDataForBattle;
    const mapTacticalDataKey = scenarioData.mapFile;

    if (typeof GAME_DATA_REGISTRY === 'undefined' || !GAME_DATA_REGISTRY.maps) {
        console.error("CampaignManager Error: GAME_DATA_REGISTRY o GAME_DATA_REGISTRY.maps no está definido.");
        updateCampaignMessages(`Error crítico: Registro de mapas no disponible.`);
        return;
    }
    const mapTacticalData = GAME_DATA_REGISTRY.maps[mapTacticalDataKey];

    if (typeof mapTacticalData === 'undefined') {
        console.error(`CampaignManager Error: Datos del mapa táctico "${mapTacticalDataKey}" no encontrados EN EL REGISTRO.`);
        updateCampaignMessages(`No se pudo iniciar batalla: falta mapa "${mapTacticalDataKey}".`);
        return;
    }
    campaignState.currentMapTacticalDataForBattle = mapTacticalData;
    closeScenarioBriefing();
    showScreen(gameContainer);

    if (typeof resetAndSetupTacticalGame === "function") { // resetAndSetupTacticalGame de state.js
        resetAndSetupTacticalGame(scenarioData, mapTacticalData, campaignState.currentTerritoryIdForBattle);
    } else {
        console.error("CampaignManager Error: La función resetAndSetupTacticalGame no está definida.");
    }
}

function handleTacticalBattleResult(playerWon, battleTerritoryId) {
    console.log(`CampaignManager: Resultado de batalla en ${battleTerritoryId}: Jugador ${playerWon ? 'GANÓ' : 'PERDIÓ'}`);
    showScreen(worldMapScreenEl);
    if (!worldData || !worldData.territories[battleTerritoryId]) {
        console.error("CampaignManager - handleTacticalBattleResult: Datos de territorio no encontrados:", battleTerritoryId);
        updateCampaignMessages("Error procesando resultado de batalla.");
        return;
    }
    const territoryName = worldData.territories[battleTerritoryId].name;
    if (playerWon) {
        campaignState.conqueredTerritories.add(battleTerritoryId);
        updateCampaignMessages(`¡${territoryName} ha sido conquistado!`);
        saveCampaignProgress();
        renderWorldMap();
        checkGlobalVictory();
    } else {
        updateCampaignMessages(`Derrota en ${territoryName}. El territorio sigue en manos enemigas.`);
    }
    campaignState.currentTerritoryIdForBattle = null;
    campaignState.currentScenarioDataForBattle = null;
    campaignState.currentMapTacticalDataForBattle = null;
}

function checkGlobalVictory() {
    if (!worldData) return;
    const totalTerritoriesToConquer = Object.keys(worldData.territories).filter(id => {
        const territory = worldData.territories[id];
        return territory.initialOwner !== 'player';
    }).length;
    let playerOwnedNonStartTerritories = 0;
    campaignState.conqueredTerritories.forEach(id => {
        const terr = worldData.territories[id];
        if (terr && terr.initialOwner !== 'player') playerOwnedNonStartTerritories++;
    });
    const allPlayerStartTerritoriesConquered = worldData.playerStartTerritory ? campaignState.conqueredTerritories.has(worldData.playerStartTerritory) : true;
    if (totalTerritoriesToConquer > 0 && playerOwnedNonStartTerritories >= totalTerritoriesToConquer && allPlayerStartTerritoriesConquered) {
        updateCampaignMessages("¡VICTORIA GLOBAL! Has conquistado todos los territorios.");
        alert("¡FELICIDADES, HAS CONQUISTADO EL MUNDO!");
    } else if (totalTerritoriesToConquer === 0 && allPlayerStartTerritoriesConquered && Object.keys(worldData.territories).length > 0) {
         updateCampaignMessages("¡Todos los territorios ya son tuyos!");
         alert("¡Mapa de prueba completado!");
    }
}

function saveCampaignProgress() {
    try {
        localStorage.setItem('hexEvolvedCampaignState', JSON.stringify({
            conqueredTerritories: Array.from(campaignState.conqueredTerritories)
        }));
        console.log("CampaignManager: Progreso de campaña guardado.");
    } catch (e) { console.error("CampaignManager: Error guardando progreso de campaña:", e); }
}

function loadCampaignProgress() {
    const savedState = localStorage.getItem('hexEvolvedCampaignState');
    if (savedState) {
        try {
            const parsedState = JSON.parse(savedState);
            campaignState.conqueredTerritories = new Set(parsedState.conqueredTerritories || []);
            console.log("CampaignManager: Progreso de campaña cargado:", campaignState.conqueredTerritories);
        } catch (e) {
            console.error("CampaignManager: Error parseando estado de campaña guardado:", e);
            campaignState.conqueredTerritories = new Set();
        }
    } else {
        campaignState.conqueredTerritories = new Set();
        console.log("CampaignManager: No hay progreso de campaña guardado, iniciando nuevo.");
    }
}

function updateCampaignMessages(message) {
    if (campaignMessagesEl) campaignMessagesEl.textContent = message;
    else console.warn("CampaignManager: campaignMessagesEl no encontrado para mostrar mensaje:", message);
    console.log("CAMPAIGN MSG: " + message);
}

// --- INICIALIZACIÓN DEL CAMPAIGN MANAGER ---
// El listener DOMContentLoaded aquí es principalmente para asegurar que este script
// se ejecuta después de que el DOM está listo, PERO la inicialización principal
// de listeners y la muestra de la primera pantalla ahora es orquestada por main.js -> initApp
document.addEventListener('DOMContentLoaded', () => {
    console.log("CampaignManager: DOMContentLoaded. Las funciones de CampaignManager están listas.");
    // Ya no llamamos a initializeDomElements() aquí.
    // Ya no llamamos a setupMainMenuListeners() ni showScreen() aquí directamente.
    // main.js -> initApp se encargará de llamar a setupMainMenuListeners()
    // y a showScreen(mainMenuScreenEl) después de que initializeDomElements() se haya completado.
});