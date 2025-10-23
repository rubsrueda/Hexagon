// tutorialManager.js
console.log("tutorialManager.js CARGADO - v.Final Estable");

let tutorialCheckInterval = null;

const TutorialManager = {
    currentSteps: [],
    currentIndex: -1,
    initialUnitCount: 0,

    start: function(steps) {
        console.log("%c--- TUTORIAL MANAGER: START ---", "background: #222; color: #bada55; font-size: 1.2em;"); 
        if (!steps || steps.length === 0) { console.error("TutorialManager.start: No se proporcionaron pasos."); return; }
        
        this.currentSteps = steps;
        this.currentIndex = -1;
        this.advanceToNextStep();
    },
    
advanceToNextStep: function() {
    // Limpia cualquier comprobación anterior que pudiera estar activa
    if (tutorialCheckInterval) clearInterval(tutorialCheckInterval);
    
    // Limpia los resaltados visuales del paso anterior
    UIManager.clearTutorialHighlights(); 

    // Avanza al siguiente índice
    this.currentIndex++;
    if (this.currentIndex >= this.currentSteps.length) {
        this.stop(); // Si no hay más pasos, termina el tutorial
        return;
    }

    const step = this.currentSteps[this.currentIndex];
    console.log(`[TUTORIAL] Ejecutando paso #${this.currentIndex + 1}: ${step.id}`);

    // Ejecuta la lógica de inicio de paso (crear unidades, etc.)
    if (step.onStepStart) step.onStepStart();

    // Muestra el mensaje y los resaltados
    UIManager.showTutorialMessage(step.message);
    if (step.highlightElementId) UIManager.highlightTutorialElement(step.highlightElementId);
    if (step.highlightHexCoords) UIManager.highlightTutorialElement(null, step.highlightHexCoords);
    
    // =============================================================
    // === LÓGICA DE CONTROL DE PASOS (LA PARTE IMPORTANTE) ===
    // =============================================================

    // CASO 1: El paso es una simple pausa (tiene 'duration' pero no 'actionCondition')
    if (step.duration && !step.actionCondition) {
        console.log(`[TutorialManager] El paso #${step.id} es una pausa de ${step.duration}ms.`);
        setTimeout(() => {
            if (step.onStepComplete) step.onStepComplete();
            this.advanceToNextStep();
        }, step.duration);
    } 
    // CASO 2: El paso espera una acción del jugador (tiene 'actionCondition')
    else if (step.actionCondition) {
        this._startCompletionCheck(step);
    }
    // CASO 3: El paso no tiene ni duración ni condición (error o paso final)
    else {
        console.log(`[TutorialManager] El paso #${step.id} no tiene condición ni duración. Se asume que es el final o requiere una acción manual.`);
        // No hacemos nada, el paso se quedará aquí hasta que algo (como un botón de "Finalizar") lo mueva.
    }
},

_startCompletionCheck: function(step) {
    // Guarda de seguridad
    if (!step || typeof step.actionCondition !== 'function') {
        console.error(`[TutorialManager] El paso #${step.id} no tiene una condition a comprobar. El tutorial no puede avanzar.`);
        return;
    }

    // Limpiamos cualquier intervalo anterior por si acaso.
    if (tutorialCheckInterval) {
        clearInterval(tutorialCheckInterval);
    }

    console.log(`[TutorialManager] Iniciando comprobación para el paso #${step.id}...`);

    // <<== CAMBIO CLAVE: El interior del intervalo ahora es una función 'async' ==>>
    tutorialCheckInterval = setInterval(async () => {
        try {
            // <<== CAMBIO CLAVE: Usamos 'await' para esperar el resultado ==>>
            // Esto funciona tanto para condiciones normales (devuelven true/false)
            // como para promesas (espera a que se resuelvan).
            if (await step.actionCondition()) {
                console.log(`%c[TutorialManager] ¡Condición CUMPLIDA para el paso #${step.id}!`, "color: lightgreen; font-weight: bold;");
                
                clearInterval(tutorialCheckInterval);
                
                if (step.onStepComplete) {
                    step.onStepComplete();
                }
                
                this.advanceToNextStep();
            }
        } catch (e) {
            console.error(`Error al evaluar la condición del paso #${step.id}:`, e);
            clearInterval(tutorialCheckInterval);
        }
    }, 500); // Comprueba cada medio segundo.
},

    stop: function() {
        console.log("[TUTORIAL] Finalizado.");
        if (tutorialCheckInterval) clearInterval(tutorialCheckInterval);
        
        window.TUTORIAL_MODE_ACTIVE = false;
        gameState.isTutorialActive = false;

        UIManager.hideTutorialMessage();
        UIManager.clearHighlights();
        UIManager.restoreEndTurnButton();
        logMessage("¡Has completado el tutorial!");
        showScreen(domElements.mainMenuScreenEl);
    },

    notifyActionCompleted: function(actionType) {
        if (!gameState.isTutorialActive || !gameState.tutorial) return;
        if (actionType in gameState.tutorial) {
            console.log(`[TUTORIAL] Flag activado: ${actionType}`);
            gameState.tutorial[actionType] = true;
            if (actionType === 'turnEnded') gameState.tutorial.unitHasMoved = false;
        }
    }
};