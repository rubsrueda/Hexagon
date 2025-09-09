showUnitContextualInfo: function(unit, isOwnUnit = true) {
        // --- PREPARACIÓN INICIAL ---
        this.hideAllActionButtons();
        if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.style.display = 'flex';
        hexToBuildOn = null;
        if (!this._domElements.contextualInfoPanel || !unit) return;

            // Guardar la selección actual en el estado del juego
        gameState.selectedHexR = unit.r;
        gameState.selectedHexC = unit.c;

            // Reinicia el panel a su estado colapsado por defecto
        if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.remove('is-expanded');
        if (this._domElements.expandPanelBtn) this._domElements.expandPanelBtn.textContent = '▲';

            // --- RELLENAR CONTENIDO DEL PANEL ---
        const isPlayerUnit = unit.player === gameState.currentPlayer;
        this._domElements.contextualTitle.textContent = `Unidad: ${unit.name} (J${unit.player})`;
        this._domElements.contextualContent.innerHTML = this._buildUnitDetailsHTML(unit);

        // --- LÓGICA DE VISIBILIDAD DE BOTONES (MODIFICADA) ---
        
        // Primero, comprobamos si es un enemigo explorado
        const isScoutedEnemy = !isPlayerUnit && isEnemyScouted(unit);

        // Botón Reforzar / Ver Detalles (floatingReinforceBtn)
        // Se muestra si la unidad es PROPIA, O si es un ENEMIGO EXPLORADO.
        if (isPlayerUnit || isScoutedEnemy) {
            if (this._domElements.floatingReinforceBtn) {
                this._domElements.floatingReinforceBtn.style.display = 'flex';
                // Cambiamos el icono y el tooltip según el contexto
                this._domElements.floatingReinforceBtn.title = isPlayerUnit ? "Gestionar/Reforzar Unidad" : "Ver Detalles de Unidad Enemiga";
                this._domElements.floatingReinforceBtn.innerHTML = isPlayerUnit ? "💪" : "👁️";
            }
        }
        
        // El resto de los botones (dividir, construir, etc.) solo deben aparecer para unidades propias.
        if (isPlayerUnit && gameState.currentPhase === 'play') {
            const canAct = !unit.hasMoved && !unit.hasAttacked;

                // Botón Deshacer
            if (unit.lastMove && !unit.hasAttacked) {
                if (this._domElements.floatingUndoMoveBtn) this._domElements.floatingUndoMoveBtn.style.display = 'flex';
            }

                // Botones que solo aparecen si la unidad aún puede actuar
            if (canAct) {
                    // Botón Dividir
                if ((unit.regiments?.length || 0) > 1 && this._domElements.floatingSplitBtn) {
                    this._domElements.floatingSplitBtn.style.display = 'flex';
                }
                
                const unitHex = board[unit.r]?.[unit.c];
                if (unitHex) {
                        // *** LÓGICA DE SAQUEO RESTAURADA ***
                    if (unitHex.owner !== null && unitHex.owner !== unit.player && this._domElements.floatingPillageBtn) {
                        this._domElements.floatingPillageBtn.style.display = 'flex';
                    }
                    
                        // Lógica de Construcción
                    const isBuilderUnit = unit.regiments.some(reg => REGIMENT_TYPES[reg.type]?.isSettler || REGIMENT_TYPES[reg.type]?.abilities?.includes("build_road"));
                    if (isBuilderUnit && this._domElements.floatingBuildBtn) {
                        hexToBuildOn = { r: unit.r, c: unit.c };
                        this._domElements.floatingBuildBtn.style.display = 'flex';
                    }
                }

                // Comprueba si hay al menos un tipo de regimiento que se repita y esté dañado.
                const regimentTypes = unit.regiments.map(r => r.type);
                const hasDamagedDuplicates = [...new Set(regimentTypes)].some(type => {
                    const group = unit.regiments.filter(r => r.type === type);
                    return group.length > 1 && group.some(r => r.health < REGIMENT_TYPES[type].health);
                });

                if (hasDamagedDuplicates && this._domElements.floatingConsolidateBtn) {
                    this._domElements.floatingConsolidateBtn.style.display = 'flex';
                }
            }
            
                // *** LÓGICA DE CAPITAL CORREGIDA Y FUNCIONAL ***
                // Esta lógica es independiente de si la unidad ya actuó
            const hexUnderUnit = board[unit.r]?.[unit.c];
            if (hexUnderUnit && this._domElements.setAsCapitalBtn) {
                const isEligibleCity = hexUnderUnit.isCity || ['Aldea', 'Ciudad', 'Metrópoli'].includes(hexUnderUnit.structure);
                if (isEligibleCity && !hexUnderUnit.isCapital) {
                    this._domElements.setAsCapitalBtn.style.display = 'block';
                }
            }
        }
        
            // --- FINALIZACIÓN ---
        if (isOwnUnit && gameState.currentPhase === 'play' && !unit.hasAttacked) {
            this.attachAttackPredictionListener(unit);
        } else { 
            this.removeAttackPredictionListener();
        }
        
        if (this._domElements.contextualInfoPanel) this._domElements.contextualInfoPanel.classList.add('visible');
    },