function calculateRegimentStats(unit) {
    // 1. VALIDACIÓN (Sin cambios, tuya es correcta)
    if (!unit || !Array.isArray(unit.regiments)) {
        console.error("calculateRegimentStats recibió una unidad inválida.", unit);
        Object.assign(unit, { attack: 0, defense: 0, maxHealth: 0, movement: 0, visionRange: 0, attackRange: 1 });
        return;
    }

    // 2. INICIALIZACIÓN (Sin cambios, tuya es correcta)
    let finalStats = { attack: 0, defense: 0, maxHealth: 0, movement: Infinity, visionRange: 0, attackRange: 0, sprite: '❓' };
    if (unit.regiments.length === 0) {
        finalStats.movement = 0; Object.assign(unit, finalStats); return;
    }
    
// 3. OBTENCIÓN DE DATOS DESDE LA UNIDAD: Ahora sacamos la info del propio objeto 'unit'.    
    const playerNum = unit.player;
    const playerCivName = gameState?.playerCivilizations?.[playerNum] || 'ninguna';
    const civBonuses = CIVILIZATIONS[playerCivName]?.bonuses || {};
    
    // --- LÓGICA DE HÉROE (dentro de la función principal) ---
    let commanderData = null, heroInstance = null;
    if (unit.commander) {
        commanderData = COMMANDERS[unit.commander];
        const playerProfile = PlayerDataManager.getCurrentPlayer(); // Simplificación para IA
        if (playerProfile) heroInstance = playerProfile.heroes.find(h => h.id === unit.commander);
    }
    unit.base_regiment_stats = {}; // Inicializar
    console.log(`[calculateRegimentStats] Procesando unidad: ${unit.name} (ID: ${unit.id}). Creando base_regiment_stats.`);

    unit.regiments.forEach((reg, index) => {
        const baseRegData = REGIMENT_TYPES[reg.type];
        if (!baseRegData) return;
        
        let regAttack = baseRegData.attack || 0;
        let regDefense = baseRegData.defense || 0;
        let regHealth = baseRegData.health || 0;
        let regMovement = baseRegData.movement || 0;
        let regAttackRange = baseRegData.attackRange || 1;
        
        // 1. APLICAR BONUS DE CIVILIZACIÓN
        const civUnitBonus = civBonuses.unitTypeBonus?.[reg.type] || {};
        regAttack += civUnitBonus.attackBonus || 0;
        regDefense += civUnitBonus.defenseBonus || 0;
        regMovement += civUnitBonus.movementBonus || 0;
        regAttackRange += civUnitBonus.attackRange || 0; 

        // 2. APLICAR BONUS PASIVOS DEL HÉROE
        if (commanderData && heroInstance) {
            commanderData.passiveSkills.forEach((skillData, index) => {
                const skillLevel = heroInstance.skill_levels[`passive${index + 1}`] || 0;
                if (skillLevel > 0 && heroInstance.stars >= index + 1 && skillData.skill_id) {
                    const definition = SKILL_DEFINITIONS[skillData.skill_id];
                    if (definition?.effect_type === 'stat_modifier') {
                        const unitCategory = baseRegData.category.split('_')[0];
                        const filters = definition.filters;
                        
                        // Condición universal de filtro
                        if (filters?.unit_category && filters.unit_category.includes(unitCategory)) {
                            const bonusValue = skillData.scaling_override[skillLevel - 1];
                            if (bonusValue) {
                                // Lógica genérica
                                if (definition.effect.is_percentage) {
                                    if (definition.effect.stat === 'defense') regDefense *= (1 + bonusValue / 100);
                                    if (definition.effect.stat === 'attack') regAttack *= (1 + bonusValue / 100);
                                    if (definition.effect.stat === 'health') regHealth *= (1 + bonusValue / 100);
                                } else {
                                    if (definition.effect.stat === 'movement') regMovement += bonusValue;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Guardar stats "de fábrica" para el regimiento
        if (commanderData && heroInstance) {
            // Lógica de héroes que modifica stats permanentes va aquí
        }

        const regId = reg.logId || `reg_${index}`;
        reg.logId = regId;

        // Asignamos los stats calculados (con bonus) al objeto que ahora sí existe.
        unit.base_regiment_stats[regId] = {
            attack: regAttack,
            defense: regDefense
        };

        // Sumar al total de la división
        finalStats.attack += regAttack;
        finalStats.defense += regDefense;
        
        // Así, si un héroe o civilización modifica la vida, se refleja en el total.
        finalStats.maxHealth += regHealth;
        finalStats.movement = Math.min(finalStats.movement, regMovement);
        finalStats.visionRange = Math.max(finalStats.visionRange, baseRegData.visionRange || 0);
        finalStats.attackRange = Math.max(finalStats.attackRange, regAttackRange || 1);
        finalStats.initiative = Math.max(finalStats.initiative, baseRegData.initiative || 1);
        finalStats.is_naval = finalStats.is_naval || baseRegData.is_naval || false;
        if (finalStats.sprite === '❓') finalStats.sprite = baseRegData.sprite;
    });

    // Finalizar y asignar (Tu lógica, es correcta)
    finalStats.movement = (finalStats.movement === Infinity) ? 0 : finalStats.movement;
    Object.assign(unit, finalStats);
    
    // LOG de depuración final
    console.log(`[calculateRegimentStats] Unidad ${unit.name} procesada. Stats finales: Atk=${finalStats.attack}, Def=${finalStats.defense}. base_regiment_stats CREADO.`);
    
    if (typeof unit.currentHealth === 'undefined') {
        unit.currentHealth = unit.maxHealth;
    }
}