// tutorialManager.js
console.log("tutorialManager.js CARGADO - v.Final Estable");

let tutorialCheckInterval = null;

const TutorialManager = {
    currentSteps: [],
    currentIndex: -1,
    initialUnitCount: 0,

    start: function(steps) {
        if (!steps || steps.length === 0) { console.error("TutorialManager.start: No se proporcionaron pasos."); return; }
        
        this.currentSteps = steps;
        this.currentIndex = -1;
        this.advanceToNextStep();
    },

    advanceToNextStep: function() {
        if (tutorialCheckInterval) clearInterval(tutorialCheckInterval);
        
        UIManager.clearHighlights();

        this.currentIndex++;
        if (this.currentIndex >= this.currentSteps.length) {
            this.stop(); // Renombrado a stop para evitar conflictos
            return;
        }

        const step = this.currentSteps[this.currentIndex];
        console.log(`[TUTORIAL] Ejecutando paso #${step.id}: ${step.id}`);

        if (step.onStepStart) step.onStepStart();

        UIManager.showTutorialMessage(step.message);
        if (step.highlightElementId) UIManager.highlightTutorialElement(step.highlightElementId);
        if (step.highlightHexCoords) UIManager.highlightTutorialElement(null, step.highlightHexCoords);
        
        this._startCompletionCheck(step);
    },

    _startCompletionCheck: function(step) {
        if (!step || !step.actionCondition) return;

        tutorialCheckInterval = setInterval(() => {
            let conditionMet = false;
            try {
                conditionMet = step.actionCondition();
            } catch (e) {
                console.error(`Error en la actionCondition del paso #${step.id}:`, e);
                clearInterval(tutorialCheckInterval);
                return;
            }
            if (conditionMet) {
                clearInterval(tutorialCheckInterval);
                Promise.resolve(conditionMet).then(() => {
                    if (step.onStepComplete) step.onStepComplete();
                    this.advanceToNextStep();
                });
            }
        }, 500);
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