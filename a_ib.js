// En uiUpdates.js, REEMPLAZA la función showUnitContextualInfo

showUnitContextualInfo: function(unit, isOwnUnit = true) {
    // --- PREPARACIÓN INICIAL (Sin cambios) ---
    this.hideAllActionButtons();
    if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.style.display = 'flex';
    hexToBuildOn = null;
    if (!this._domElements.contextualInfoPanel || !unit) return;
    gameState.selectedHexR = unit.r;
    gameState.selectedHexC = unit.c;
    if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.remove('is-expanded');
    if (this._domElements.expandPanelBtn) this._domElements.expandPanelBtn.textContent = '▲';

    // --- RELLENAR CONTENIDO DEL PANEL (Sin cambios) ---
    const isPlayerUnit = unit.player === gameState.currentPlayer;
    this._domElements.contextualTitle.textContent = `Unidad: ${unit.name} (J${unit.player})`;
    this._domElements.contextualContent.innerHTML = this._buildUnitDetailsHTML(unit);

    // --- LÓGICA DE VISIBILIDAD DE BOTONES (Mejorada) ---
    
    // (Lógica para el botón de detalles del enemigo explorado, sin cambios)
    const isScoutedEnemy = !isPlayerUnit && isEnemyScouted(unit);
    if (isPlayerUnit || isScoutedEnemy) {
        if (this._domElements.floatingReinforceBtn) {
            this._domElements.floatingReinforceBtn.style.display = 'flex';
            this._domElements.floatingReinforceBtn.title = isPlayerUnit ? "Gestionar/Reforzar Unidad" : "Ver Detalles de Unidad Enemiga";
            this._domElements.floatingReinforceBtn.innerHTML = isPlayerUnit ? "💪" : "👁️";
        }
    }
    
    // El resto de los botones solo deben aparecer para unidades propias y en la fase de juego
    if (isPlayerUnit && gameState.currentPhase === 'play') {
        const canAct = !unit.hasMoved && !unit.hasAttacked;
        const unitHex = board[unit.r]?.[unit.c];

        // <<== NUEVA LÓGICA PARA "ASIGNAR HÉROE" ==>>
        if (this._domElements.floatingAssignGeneralBtn && unitHex) {
            const hasHQ = unit.regiments.some(r => r.type === "Cuartel General");
            const isAtRecruitmentPoint = unitHex.isCity || unitHex.isCapital || unitHex.structure === "Fortaleza";
            const maxGenerals = gameState.cities.filter(c => c.owner === unit.player).length;
            const currentGenerals = gameState.activeCommanders[unit.player]?.length || 0;
            
            // Condiciones para mostrar el botón:
            // 1. La unidad NO tiene ya un comandante.
            // 2. La unidad TIENE un "Cuartel General".
            // 3. La unidad ESTÁ en una ciudad o fortaleza.
            // 4. El jugador NO ha alcanzado su límite de generales activos.
            if (!unit.commander && hasHQ && isAtRecruitmentPoint && currentGenerals < maxGenerals) {
                this._domElements.floatingAssignGeneralBtn.style.display = 'flex';
            }
        }

        // (El resto de la lógica de los otros botones (deshacer, dividir, etc.) se mantiene igual)
        if (canAct) {
            // ... (lógica de dividir, saquear, construir, consolidar) ...
        }
        if (unit.lastMove && !unit.hasAttacked) {
            if (this._domElements.floatingUndoMoveBtn) this._domElements.floatingUndoMoveBtn.style.display = 'flex';
        }
    }
    
    // --- FINALIZACIÓN (Sin cambios) ---
    if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) {
        this.attachAttackPredictionListener(unit);
    } else { 
        this.removeAttackPredictionListener();
    }
    if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.add('visible');
},