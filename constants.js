// constants.js

const BOARD_ROWS = 12;
const BOARD_COLS = 15;
const BOARD_SIZES = {
    'small': { rows: 12, cols: 15 },
    'medium': { rows: 18, cols: 25 },
    'large': { rows: 24, cols: 35 },
    'iberia_magna': { rows: 75, cols: 120 }
};

const HEX_WIDTH = 50;
const HEX_HEIGHT = 57.73; // HEX_WIDTH * sqrt(3) / 2 * 2 (simplificado a HEX_WIDTH * 1.1547)
const HEX_VERT_SPACING = HEX_HEIGHT * 0.75;
const TRADE_INCOME_PER_ROUTE = 50;
const MAX_REGIMENTS_PER_DIVISION = 20;

// En constants.js

const REGIMENT_TYPES = {
    // Escala base: Stats y Costos x20. Salud = 200. Tácticos (mov, rango) sin cambios.
//    "Infantería Ligera": { category: "light_infantry", cost: { oro: 200, upkeep: 20 }, attack: 40, defense: 60, health: 200, movement: 2, sprite: '🚶', visionRange: 2, attackRange: 1, initiative: 8, goldValueOnDestroy: 140, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
//    "Infantería Pesada": { category: "heavy_infantry", cost: { oro: 300, upkeep: 40 }, attack: 60, defense: 100, health: 200, movement: 1, sprite: '🛡️', visionRange: 1, attackRange: 1, initiative: 5, goldValueOnDestroy: 220, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },

    "Infantería Ligera": { category: "light_infantry", cost: { oro: 200, upkeep: 20 }, attack: 40, defense: 60, health: 200, movement: 2, sprite: 'images/sprites/Infanteria_128x128.png', visionRange: 2, attackRange: 1, initiative: 8, goldValueOnDestroy: 140, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Infantería Pesada": { category: "heavy_infantry", cost: { oro: 300, upkeep: 40 }, attack: 60, defense: 100, health: 200, movement: 1, sprite:'images/sprites/Legionario.png', visionRange: 1, attackRange: 1, initiative: 5, goldValueOnDestroy: 220, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Caballería Ligera": { category: "light_cavalry", cost: { oro: 400, upkeep: 40 }, attack: 80, defense: 40, health: 200, movement: 4, sprite: 'images/sprites/cab_ligera_128x128.png', visionRange: 3, attackRange: 0, initiative: 15, goldValueOnDestroy: 280, foodConsumption: 2, puntosReclutamiento: 200, abilities: ["Jump"] },
    "Caballería Pesada": { category: "heavy_cavalry", cost: { oro: 600, upkeep: 60 }, attack: 100, defense: 100, health: 200, movement: 3, sprite: 'images/sprites/cab_pesada128.png', visionRange: 2, attackRange: 0, initiative: 12, goldValueOnDestroy: 400, foodConsumption: 2, puntosReclutamiento: 200, abilities: [] },
    
    "Arqueros a Caballo": { category: "light_cavalry", cost: { oro: 720, upkeep: 60 }, attack: 60, defense: 60, health: 200, movement: 4, sprite: '🏇', visionRange: 3, attackRange: 2, initiative: 16, goldValueOnDestroy: 480, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Arqueros": { category: "light_infantry", cost: { oro: 360, upkeep: 20 }, attack: 70, defense: 20, health: 200, movement: 2, sprite: '🏹', visionRange: 2, attackRange: 2, initiative: 11, goldValueOnDestroy: 240, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    
    "Arcabuceros": { category: "light_infantry", cost: { oro: 480, upkeep: 40 }, attack: 100, defense: 40, health: 200, movement: 1, sprite: '💂', visionRange: 2, attackRange: 2, initiative: 11, goldValueOnDestroy: 360, foodConsumption: 1, puntosReclutamiento: 200, abilities: [] },
    "Artillería": { category: "artillery", cost: { oro: 1000, upkeep: 80 }, attack: 200, defense: 20, health: 200, movement: 1, sprite: '💣', visionRange: 1, attackRange: 3, initiative: 20, goldValueOnDestroy: 800, foodConsumption: 2, puntosReclutamiento: 200, abilities: [] },

    // Unidades de Apoyo - Stats ajustados para equilibrio. Ataques bajos se escalan menos.
    "Cuartel General": {
        category: "support", cost: { oro: 800, upkeep: 100 },
        attack: 10, defense: 40, health: 200, movement: 3,
        sprite: '🚩', visionRange: 3, attackRange: 0, initiative: 10,
        goldValueOnDestroy: 600, foodConsumption: 2, puntosReclutamiento: 50,
        abilities: ["Jump","morale_boost"], provides_morale_boost: true
    },
    "Ingenieros": {
        category: "support", cost: { oro: 500, upkeep: 40 },
        attack: 10, defense: 80, health: 200, movement: 2,
        sprite: '👷', visionRange: 1, attackRange: 0, initiative: 6,
        goldValueOnDestroy: 400, foodConsumption: 1, puntosReclutamiento: 50,
        abilities: ["build_road", "build_fortifications"]
    },
    "Hospital de Campaña": {
        category: "support", cost: { oro: 600, upkeep: 60 },
        attack: 0, defense: 40, health: 200, movement: 2,
        sprite: '⚕️', visionRange: 1, attackRange: 0, initiative: 4,
        goldValueOnDestroy: 500, foodConsumption: 1, puntosReclutamiento: 50,
        abilities: ["heal_turn_end"], is_healer: true,
        heal_power: 60 // Heal Power x20 (3 * 20) para ser relevante
    },
    "Columna de Suministro": {
        category: "support", cost: { oro: 300, upkeep: 20 },
        attack: 0, defense: 20, health: 200, movement: 3,
        sprite: '📦', visionRange: 2, attackRange: 0, initiative: 3,
        goldValueOnDestroy: 200, foodConsumption: -5,
        abilities: ["provide_supply"]
    },
    // Unidades Navales y Especiales
    "Barco de Guerra": {
        category: "naval", is_naval: true,
        cost: { oro: 2000, upkeep: 100, madera: 25 },
        attack: 200, defense: 100, health: 200, movement: 5,
        sprite: '⛵', visionRange: 4, attackRange: 3, initiative: 10,
        goldValueOnDestroy: 1600, foodConsumption: 1, puntosReclutamiento: 50,
        abilities: ["transport", "coastal_bombardment"],
        canOnlyBeAttackedByRanged: true, transportCapacity: 2
    }, 
    "Colono": {
        category: "support",
        cost: { oro: 4000, comida: 50, puntosReclutamiento: 200 },
        attack: 0, defense: 20, health: 200, movement: 2, sprite: '🧑‍🌾',
        visionRange: 1, attackRange: 0, initiative: 5, foodConsumption: 1,
        isSettler: true
    },
    "Explorador": {
        category: "support", // Lo clasificamos como apoyo
        cost: { oro: 150, upkeep: 10 }, // Barato y de bajo mantenimiento
        attack: 5, defense: 10, health: 150, // Muy débil en combate
        movement: 3, // Rápido
        sprite: '👁️', // Un ojo, para representar la visión/exploración
        visionRange: 2, // Su visión base
        attackRange: 0,
        initiative: 12, // Alta iniciativa para actuar rápido
        goldValueOnDestroy: 50,
        foodConsumption: 1,
        puntosReclutamiento: 40,
        abilities: ["enhanced_vision", "reveal_details"] // Habilidades descriptivas
    },
};

// Iberia Magna

// Define el número máximo de jugadores para esta modalidad
const MAX_PLAYERS_MAGNA = 8;

// (MODIFICADO) Expande los recursos iniciales
const INITIAL_PLAYER_RESOURCES_MAGNA = [
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 1
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
    { oro: 1000, hierro: 200, piedra: 500, madera: 500, comida: 300, researchPoints: 0, puntosReclutamiento: 1000 }, // Jugador 2
];

// Define las facciones de Iberia
const CIVILIZATIONS_IBERIA = {
    "Castilla": { name: "Corona de Castilla", bonuses: { /* ... */ } },
    "Aragon": { name: "Corona de Aragón", bonuses: { /* ... */ } },
    "Portugal": { name: "Reino de Portugal", bonuses: { /* ... */ } },
    "Navarra": { name: "Reino de Navarra", bonuses: { /* ... */ } },
    "Granada": { name: "Emirato de Granada", bonuses: { /* ... */ } },
};

const XP_LEVELS = [
    // Nivel 0
    { currentLevelName: "Recluta", nextLevelXp: 50, attackBonus: 0, defenseBonus: 0, disciplineBonus: 0 },
    // Nivel 1
    { currentLevelName: "Regular", nextLevelXp: 150, attackBonus: 1, defenseBonus: 0, disciplineBonus: 5 },
    // Nivel 2
    { currentLevelName: "Veterano", nextLevelXp: 400, attackBonus: 1, defenseBonus: 1, disciplineBonus: 10 },
    // Nivel 3
    { currentLevelName: "Élite", nextLevelXp: 800, attackBonus: 2, defenseBonus: 1, disciplineBonus: 15 },
    // Nivel 4
    { currentLevelName: "Héroe", nextLevelXp: 'Max', attackBonus: 2, defenseBonus: 2, disciplineBonus: 20 }
];

const CIVILIZATIONS = {
    // Nota: Bonus de +1 original se escala a +20. Bonus tácticos sin cambios.
    "Roma": {
        name: "Roma",
        description: "Su infantería y movimiento táctico son superiores.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Pesada": { defenseBonus: 20, movementBonus: 1 } // +20 Defensa (antes +1), movimiento sin cambios
            }
        }
    },
    "Grecia": {
        name: "Grecia",
        description: "La infantería ligera griega es más resistente y ágil.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { defenseBonus: 20, movementBonus: 1 } // +20 Defensa (antes +1)
            }
        }
    },
    "Cartago": {
        name: "Cartago",
        description: "Potencia naval por excelencia.",
        bonuses: {
            unitTypeBonus: {
                "Artillería": { attackBonus: 20 }, // +20 Ataque (antes +1)
                "Barco de Guerra": { defenseBonus: 20, attackRange: 1 } // +20 Defensa (antes +1), rango sin cambios
            }
        }
    },
    "Egipto": {
        name: "Egipto",
        description: "Sus arqueros son célebres por su letalidad y alcance.",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20, attackRange: 1 } // +20 Ataque (antes +1)
            }
        }
    },
    "Galia": {
        name: "Galia",
        description: "Famosos por su caballería e infantería de choque.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 20 }, // +20 Ataque
                "Caballería Pesada": { attackBonus: 20 } // +20 Ataque
            }
        }
    },
    "Germania": {
        name: "Germania",
        description: "Una infantería ligera muy resistente.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { defenseBonus: 20 } // +20 Defensa
            }
        }
    },
    "Britania": {
        name: "Britania",
        description: "Sus arqueros son más resistentes y sus barcos ganan experiencia más rápido.",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { defenseBonus: 20 }, // +20 Defensa
                "Barco de Guerra": { xpGainModifier: 1 } // Lógica futura sin cambios
            }
        }
    },
    "Iberia": {
        name: "Iberia",
        description: "Guerreros versátiles, letales en varios frentes.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 40 }, // +40 Ataque (antes +2)
                "Caballería Ligera": { attackBonus: 20 }, // +20 Ataque
                "Artillería": { attackBonus: 20 } // +20 Ataque
            }
        }
    },
    "Persia": {
        name: "Persia",
        description: "Un imperio con unidades de élite y habilidades de regeneración únicas.",
        bonuses: {
            unitTypeBonus: {
                "Arcabuceros": { attackBonus: 20 }, // +20 Ataque
                "Barco de Guerra": { passiveHeal: 0.25 } // Bonus porcentual sin cambios
            },
            globalBonus: { noGoldUpkeep: true } // Bonus global sin cambios
        }
    },
    "China": {
        name: "China",
        description: "Maestros de las armas de pólvora y la organización militar.",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20 },
                "Arcabuceros": { attackBonus: 20 },
                "Barco de Guerra": { xpGainModifier: 1 }
            }
        }
    },
    "Vikingos": {
        name: "Vikingos",
        description: "Guerreros ágiles y rápidos en sus incursiones.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Ligera": { attackBonus: 20, movementBonus: 1 }
            }
        }
    },
    "Mongol": {
        name: "Mongolia",
        description: "La horda imparable, maestros de la caballería y el movimiento.",
        bonuses: {
            unitTypeBonus: {
                "Caballería Ligera": { movementBonus: 1 },
                "Arqueros a Caballo": { movementBonus: 1 }
            }
        }
    },
    "Arábiga": {
        name: "Arabia",
        description: "Jinetes del desierto rápidos y mortales.",
        bonuses: {
            unitTypeBonus: {
                "Caballería Ligera": { attackBonus: 20 }
            }
        }
    },
    "Mameluca": {
        name: "Sultanato Mameluco",
        description: "Tropas de élite que no cuestan mantenimiento de oro ni comida.",
        bonuses: {
            globalBonus: { noGoldUpkeep: true, noFoodUpkeep: true }
        }
    },
    "Otomana": {
        name: "Imperio Otomano",
        description: "Una potencia de asedio con una artillería y unidades de pólvora temibles.",
        bonuses: {
            unitTypeBonus: {
                "Arcabuceros": { attackBonus: 20 },
                "Artillería": { attackBonus: 20 }
            }
        }
    },
    "Maya": {
        name: "Civilización Maya",
        description: "Grandes arqueros que ganan experiencia rápidamente.",
        bonuses: {
            unitTypeBonus: {
                "Arqueros": { attackBonus: 20 },
                "Barco de Guerra": { xpGainModifier: 1 }
            }
        }
    },
    "ninguna": {
        name: "Ninguna",
        description: "Estándar, sin bonus especiales.",
        bonuses: {}
    },
    "Asiria": {
        name: "Asiria",
        description: "Pioneros del asedio y el terror. Su maquinaria de guerra y su infantería pesada son formidables.",
        bonuses: {
            unitTypeBonus: {
                "Artillería": { attackBonus: 40, buildCostModifier: -0.1 }, // +40 Ataque (antes +2)
                "Infantería Pesada": { moraleDamageBonus: 2 }
            }
        }
    },
    "Babilonia": {
        name: "Babilonia",
        description: "Cuna de la ley y la ciencia. Progresan tecnológicamente más rápido que nadie.",
        bonuses: {
            economyBonus: { researchPointBonus: 0.25 },
            unitTypeBonus: { "Arqueros": { defenseBonus: 20 } }
        }
    },
    "Japón": {
        name: "Japón",
        description: "Guerreros samurái cuyo código de honor los hace luchar hasta el final sin perder la moral.",
        bonuses: {
            unitTypeBonus: {
                "Infantería Pesada": { initiativeBonus: 5 }, // Iniciativa es táctica, no se escala
                "Arqueros": { attackBonus: 20 }
            },
            globalBonus: { moraleLossModifier: -0.25 }
        }
    }
};

const HERO_PROGRESSION_CONFIG = {
    MAX_LEVEL: 50,
    BASE_XP: 1000,
    POWER: 1.2,
    XP_PER_BOOK: 500
};

const HERO_FRAGMENTS_PER_STAR = {
    // Para evolucionar A esta estrella
    2: 20,
    3: 50,
    4: 100,
    5: 200
};

const SKIRMISH_VICTORY_GOLD_BONUS = 200;

const STRUCTURE_TYPES = {
    // Nota: Costos de recursos y upkeep escalados x20. Bonus y otras propiedades sin cambios, salvo tradeValue.
    "Camino": { 
        name: "Camino", cost: { piedra: 100, madera: 100 }, sprite: '🟰', defenseBonus: 0, movementBonus: 1, 
        movementCost: 0.5, // <<== AÑADIDO: Moverse por un camino es muy rápido
        buildableOn: ['plains', 'hills'], upkeep: {}, requiredTech: "ENGINEERING",
        canBeUpgraded: true, 
        nextUpgrade: "Fortaleza",
        buildOrder: 1
    },

    "Fortaleza": { 
        name: "Fortaleza", cost: { piedra: 1000, hierro: 400, oro: 600 }, sprite: '🏰', defenseBonus: 3, 
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, integrity: 100,  upkeep: { comida: 40, oro: 20 },  buildableOn: [],
        requiredTech: "FORTIFICATIONS", isFortification: true,
        canBeUpgraded: true,
        nextUpgrade: "Fortaleza con Muralla",
        buildOrder: 2
    },
    
     "Fortaleza con Muralla": {
        name: "Fortaleza con Muralla", cost: { piedra: 2000, oro: 1000 }, sprite: '🧱', defenseBonus: 5,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, upkeep: { oro: 40 }, buildableOn: [],
        requiredTech: "SIEGE_CRAFT", isFortification: true, unlocksArtillery: true,
        canBeUpgraded: true, 
        nextUpgrade: "Aldea",
        buildOrder: 3
    },
    "Aldea": {
        name: "Aldea", 
        cost: { 'Colono': 1, oro: 2000 },
        sprite: '🏡', defenseBonus: 1,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 60 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 5,
        canBeUpgraded: true, 
        nextUpgrade: "Ciudad",
        buildOrder: 4
    },
    "Ciudad": {
        name: "Ciudad", 
        cost: { 'Colono': 1, oro: 5000 },
        sprite: '🏘️', defenseBonus: 2,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 100 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 10,
        canBeUpgraded: true, 
        nextUpgrade: "Metrópoli",
        buildOrder: 5
    },
    "Metrópoli": {
        name: "Metrópoli", 
        cost: { 'Colono': 1, oro: 10000 },
        sprite: '🏙️', defenseBonus: 3,
        movementCost: 1.0, // <<== AÑADIDO: Anula penalizaciones de terreno, coste estándar
        allowsRecruitment: true, 
        upkeep: { oro: 200 }, 
        buildableOn: ['plains', 'hills'],
        requiredTech: "COLONY", 
        tradeValue: 20,
        canBeUpgraded: false,
        nextUpgrade: null,
        buildOrder: 6
    }
};

// Define qué terrenos son intransitables para cada categoría de unidad
const IMPASSABLE_TERRAIN_BY_UNIT_CATEGORY = {
    "all_land": ["water"],
    "heavy_infantry": ["forest", "hills"],
    "heavy_cavalry": ["forest", "hills"],
    "artillery": ["forest", "hills"],
    "light_cavalry": ["hills"],
    "light_infantry": [],
    "naval": ["plains", "forest", "hills"]
};

const UPGRADE_TO_CITY_COST = { oro: 3000, piedra: 1000, madera: 1000, comida: 400 };

const RESOURCE_NODES_DATA = { 
    'hierro': { sprite: '⛏️', income: 100, name: 'Hierro' },
    'madera': { sprite: '🌲', income: 100, name: 'Madera' },
    'piedra': { sprite: '⛰️', income: 100, name: 'Piedra' },
    'comida': { sprite: '🌾', income: 100, name: 'Comida' },
    'oro_mina': { sprite: '💰', income: 100, name: 'Oro' }, 
    'Puerto': {sprite: "⚓", income: 100, name: 'Oro',  buildableOn: ["coast"]}
};

const INITIAL_PLAYER_RESOURCES = [ 
    { oro: 4000, hierro: 500, piedra: 1000, madera: 1000, comida: 500, researchPoints: 100, puntosReclutamiento: 4000 },
    { oro: 4000, hierro: 500, piedra: 1000, madera: 1000, comida: 500, researchPoints: 100, puntosReclutamiento: 4000 }
];

// --- INGRESOS BASE POR TURNO ---
const BASE_INCOME = {
    RESEARCH_POINTS_PER_TURN: 8
};

// Habilidades de los héroes
const SKILL_DEFINITIONS = {
    // === HABILIDADES GENÉRICAS REUTILIZABLES ===
    'passive_infantry_defense_buff': {
        name: "Defensa de Infantería",
        description_template: "Aumenta la defensa de la Infantería en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_category: ['heavy_infantry', 'light_infantry'] }
    },
    'passive_infantry_attack_buff': {
        name: "Ataque de Infantería",
        description_template: "Aumenta el ataque de la Infantería en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_category: ['heavy_infantry', 'light_infantry'] }
    },
    'passive_cavalry_attack_buff': {
        name: "Ataque de Caballería",
        description_template: "Aumenta el ataque de la Caballería en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_category: ['heavy_cavalry', 'light_cavalry'] }
    },
    'passive_cavalry_health_buff': {
        name: "Salud de Caballería",
        description_template: "Aumenta la salud de la Caballería en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_category: ['heavy_cavalry', 'light_cavalry'] }
    },
    'passive_archer_attack_buff': {
        name: "Ataque de Arqueros",
        description_template: "Aumenta el ataque de los Arqueros en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_type: 'Arqueros' }
    },
    'passive_siege_damage_buff': {
        name: "Daño de Asedio",
        description_template: "Aumenta el daño de asedio en un {X}%.",
        effect_type: 'stat_modifier',
        filters: { unit_category: 'artillery' }
    },
    'passive_all_troops_health_buff': {
        name: "Salud de Tropas",
        description_template: "Aumenta la salud de todas las tropas en un {X}%.",
        effect_type: 'stat_modifier',
        filters: {} // Vacío para aplicar a todos
    },
    'active_direct_damage': { name: "Golpe Certero", description_template: "Inflige daño directo (Poder {X}).", effect_type: 'damage' },
    'active_shield': { name: "Escudo Defensivo", description_template: "Crea un escudo que absorbe {X} de daño.", effect_type: 'shield' },
    'active_heal': { name: "Curación de Campo", description_template: "Cura a las tropas (Poder {X}).", effect_type: 'heal' },
    'active_attack_buff': { name: "Grito de Guerra", description_template: "Aumenta el ataque de la división un {X}%.", effect_type: 'buff' },
    'passive_skill_damage_buff': { name: "Genio Militar", description_template: "Aumenta el daño de habilidad un {X}%.", effect_type: 'stat_modifier' },

    // === HABILIDADES ÚNICAS (Todas declaradas) ===
    'active_damage_and_slow': { name: "Emboscada Ilergete", description_template: "Inflige daño (Poder {X}) y ralentiza un {Y}%." },
    'passive_terrain_bonus': { name: "Guerra de Montaña", description_template: "Aumenta Atk/Def de Infantería un {X}% en Colinas/Bosques." },
    'active_mass_attack_speed_buff': { name: "Juramento de Odio", description_template: "Aumenta el ataque ({X}%) y la marcha ({Y}%) de las tropas." },
    'passive_inf_cav_health_buff': { name: "Veteranos de África", description_template: "Aumenta salud de Infantería y Caballería un {X}%." },
    'active_garrison_attack_buff': { name: "Qart Hadasht", description_template: "Aumenta el ataque un {X}% al defender en ciudades/fortalezas." },
    'active_berserk_rage': { name: "Furia Lusitana", description_template: "Aumenta ataque un {X}% pero reduce defensa un {Y}%." },
    'passive_low_health_defense_buff': { name: "Invencible", description_template: "Bajo el 50% de salud, aumenta su defensa en {X}%." },
    'passive_infantry_movement_buff': { name: "Tierra Quemada", description_template: "Aumenta la velocidad de marcha de la Infantería en 1." },
    'active_debuff_enemy': { name: "Táctica Envolvente", description_template: "Inflige daño (Poder {X}) y reduce la defensa enemiga un {Y}%." },
    'passive_all_troops_defense_buff': { name: "Legiones Disciplinadas", description_template: "Aumenta la defensa de todas las tropas un 10%." },
    'active_heal_and_speed_buff': { name: "Consejo de la Cierva Blanca", description_template: "Cura (Poder {X}) y aumenta la marcha un {Y}%." },
    'passive_counter_damage_reduction': { name: "Guerra Sertoriana", description_template: "Reduce el daño de contraataque recibido en {X}%." },
    'passive_mixed_army_buff': { name: "Lealtad Hispana", description_template: "Aumenta el ataque de tropas mixtas (3+ tipos) en {X}%." },
    'active_siege_conditional_damage': { name: "Majestad Gótica", description_template: "Inflige daño (Poder {X}). +20% de daño a guarniciones." },
    'passive_garrison_defense_bonus': { name: "Código de Leovigildo", description_template: "Aumenta defensa de guarnición un {X}%." },
    'active_finisher_damage': { name: "Carga Final", description_template: "Inflige daño masivo (Poder {X}). El daño aumenta a baja salud." },
    'passive_glass_cannon': { name: "El Peso de la Traición", description_template: "La división recibe un 7% más de daño de ataques normales." },
    'active_defensive_stance': { name: "Victoria de Covadonga", description_template: "Aumenta defensa ({X}%) y contraataque ({Y}%) pero inmoviliza a la unidad." },
    'active_aoe_damage': { name: "Aceifa Fulminante", description_template: "Inflige daño en área (Poder {X}) a hasta 3 objetivos." },
    'passive_full_army_buff': { name: "Señor de Valencia", description_template: "Aumenta atk, def y salud de tropas mixtas (3+ tipos) un {X}%." },
    'passive_on_death_aoe_buff': { name: "Ganar Batallas Después de Muerto", description_template: "Al ser derrotado, aliados cercanos ganan {X}% de ataque." },
    'active_heal_and_attack_buff': { name: "Fervor del Desierto", description_template: "Cura (Poder {X}) y aumenta el ataque un {Y}%." },
    'passive_high_health_damage_buff': { name: "Batalla de Sagrajas", description_template: "Con más del 70% de salud, el daño aumenta un {X}%." },
    'active_normal_attack_steroid': { name: "Siempre en la Brecha", description_template: "Aumenta el daño de ataque normal un {X}%." },
    'active_cavalry_charge': { name: "Carga Relámpago", description_template: "Aumenta la marcha ({Y}%) e inflige daño (Poder {X})." },
    'active_garrison_debuff_damage': { name: "Asalto Anfibio", description_template: "Inflige daño de asedio (Poder {X}) y reduce la defensa de la guarnición un {Y}%." },
    'active_heal_and_skill_defense': { name: "Bendición Divina", description_template: "Cura (Poder {X}) y otorga {Y}% de reducción de daño de habilidad." },
    'active_cavalry_buff_no_slow': { name: "¡Santiago y Cierra, España!", description_template: "Aumenta el ataque de caballería un {X}% y otorga inmunidad a ralentización." },
    'active_garrison_damage_reduction': { name: "Sacrificio Leal", description_template: "La guarnición recibe {X}% menos de daño." },
    'passive_garrison_conditional_attack': { name: "Defensa a ultranza", description_template: "Aumenta el ataque de guarnición un {X}% si está rodeada." },
    'active_aoe_damage_with_dot': { name: "¡Desperta Ferro!", description_template: "Inflige daño en área (Poder {X}) y aplica Sangrado (Poder {Y})." },
    'passive_infantry_rage': { name: "Furia Almogávar", description_template: "Aumenta el ataque de Infantería un {X}%, pero reduce su salud un 5%." },
    'passive_counter_attack_buff': { name: "Venganza Catalana", description_template: "El daño de contraataque aumenta un {X}%." },
    'active_aoe_debuff': { name: "Guerra de Desgaste", description_template: "Reduce ataque ({X}%) y defensa ({Y}%) de hasta 3 objetivos." },
    'active_heal_debuff': { name: "Conspiración Palaciega", description_template: "Reduce la defensa un {X}% y la curación recibida un {Y}%." },
    'active_siege_mine': { name: "Mina Socavadora", description_template: "Inflige daño de asedio masivo (Poder {X}) a una guarnición." },
    'active_death_defiance': { name: "Voluntad de Hierro", description_template: "Durante 2 turnos, las tropas no pueden caer por debajo del 10% de su fuerza." },
    'passive_low_health_defense_up': { name: "Batalla de Pavía", description_template: "Bajo el 50% de salud, la defensa aumenta en {X}%." },
    'active_heal_and_skill_buff': { name: "Inspirar a las Tropas", description_template: "Cura (Poder {X}) y aumenta el daño de habilidad de tropas cercanas un 10%." },
    'active_shield_and_counter': { name: "Disciplina de Hierro", description_template: "Otorga un escudo (Poder {X}) y aumenta el contraataque un {Y}%." },
    'active_naval_aoe_damage_and_buff': { name: "Carga de la Liga Santa", description_template: "Inflige daño a hasta 5 flotas (Poder {X}) y aumenta el ataque de flotas aliadas un {Y}%." },
    'active_naval_damage_and_debuff': { name: "Dominio de los Mares", description_template: "Inflige daño a una flota (Poder {X}) y reduce su ataque y marcha un {Y}%." },
    'passive_naval_attack_defense_buff': { name: "Nunca Derrotado", description_template: "Aumenta ataque y defensa de unidades navales un {X}%." },
    'active_siege_attack_buff': { name: "Asalto Metódico", description_template: "Aumenta el ataque de las tropas que atacan una ciudad en un {X}%." },
    'passive_cavalry_infantry_speed_buff': { name: "Maestro de Flandes", description_template: "Aumenta la velocidad de marcha de Caballería e Infantería en 1." },
    'active_heal_and_counter_buff': { name: "Indomable", description_template: "Cura (Poder {X}) y aumenta el contraataque en {Y}%." },
    'passive_low_health_damage_up': { name: "Veterano Marcado", description_template: "Cuanta menos vida tiene, más daño inflige (hasta un +{X}% de ataque)." },
    'active_defense_buff': { name: "Cabeza de Puente", description_template: "Aumenta la defensa de sus tropas en un {X}%." }
};

// --- INGRESOS BASE DE ORO POR CONTROL TERRITORIAL ---
const GOLD_INCOME = {
    PER_HEX: 10,
    PER_ROAD: 20,
    PER_FORT: 40,
    PER_CITY: 80,
    PER_CAPITAL: 160
};

const RESOURCE_MULTIPLIERS_V2 = { // Renombrado para no confundir, puedes eliminar el antiguo
    BASE: 10,      
    CAMINO: 20,    
    FORTALEZA: 40, 
    ALDEA: 80, 
    CIUDAD: 160, 
    METROPOLI: 320 // Corregido acento   
};

const RESOURCE_MULTIPLIERS = {
    BASE: 10,      
    CAMINO: 20,    
    FORTALEZA: 40, 
    ALDEA: 80, 
    CIUDAD: 160, 
    METRóPOLI: 320     
};

const TERRAIN_TYPES = {
    plains: {
        name: "Llanura",
        movementCostMultiplier: 1.0,
        defenseBonus: 0,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 0
    },
    forest: {
        name: "Bosque",
        movementCostMultiplier: 2.0,
        defenseBonus: 1.25,
        rangedDefenseBonus: 2,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 1.0,
        visionPenalty: 0.5,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 1
    },
    hills: {
        name: "Colinas",
        movementCostMultiplier: 2.0,
        defenseBonus: 1.5,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 1,
        resourceYieldMultiplier: 1.1,
        visionPenalty: 0,
        isImpassableForLand: false,
        isImpassableForNaval: true,
        minMovement: 1
    },
    water: {
        name: "Agua", 
        movementCostMultiplier: 1.0,
        defenseBonus: 0,
        rangedDefenseBonus: 0,
        meleeAttackBonus: 0,
        resourceYieldMultiplier: 0,
        visionPenalty: 0,
        isImpassableForLand: true,
        isImpassableForNaval: false,
        minMovement: 0
    },
};

const AI_RESOURCE_PRIORITY = {
    'oro': 100,
    'comida': 80,
    'hierro': 30,
    'piedra': 20,
    'madera': 10
};

const REINFORCE_COST_PER_HP_PERCENT = 2.4

const ATTRITION_DAMAGE_PER_TURN = 1; 
const ATTRITION_FOOD_SHORTAGE_THRESHOLD = 0;

const TUTORIAL_MESSAGES = {
    title: "Bienvenido a Hex General Evolved",
    sections: [
        {
            heading: "Tu Misión",
            content: "El Juego tiene 2 fases, una de Despliegue y otra de Juego, en la de Despliegue puedes poner unas pocas unidades, en la de juego solo podrás construir en fortalezas y ciudades. Tu misión es acabar y conquistar las ciudades del enemigo. <br>Para alcanzar la victoria, deberás gestionar tus recursos, expandir tu territorio, investigar nuevas tecnologías y comandar tus divisiones en el campo de batalla con astucia.<br><b>¡La victoria te espera!</b>"
        },
        {
            heading: "Antes de iniciar el Juego puedes decidir",
            content: "El Nivel de Recursos que encontrarás en el mapa (Mínimos, Medios, Muchos), El tamaño del mapa, la cantidad de unidades a desplegar (Fase Inicial) donde quieras."
        },
        {
            heading: "El Tablero de Juego",
            content: "El campo de batalla es un tablero de celdas hexagonales. Cada hexágono tiene un terreno (Llanuras, Bosque, etc.) y puede contener recursos (Oro, Comida, etc.)."
        },
        {
            heading: "Fases del Juego",
            content: "El juego tiene fases principales: <br>• <b>Despliegue:</b> Coloca tus unidades iniciales estratégicamente. Protege tu ciudad siempre! <br>• <b>Juego:</b> Mueve tus unidades, combate, investiga y construye. <br>• <b>Fin de Partida:</b> Cuando un jugador conquista la capital enemiga o elimina todas sus unidades."
        },
        {
            heading: "Unidades (Divisiones)",
            content: "Tus unidades se llaman Divisiones, compuestas por Regimientos. Cada tipo de Regimiento (Infantería, Caballería, Arqueros) tiene valores únicos de Ataque, Defensa, Salud y Movimiento. Ganan experiencia con la batalla."
        },
        {
            heading: "Recursos y Economía",
            content: "Domina hexágonos con recursos para aumentar tus ingresos. El Oro te permite crear nuevas unidades. La Comida es vital para mantener a tus tropas. También necesitarás Hierro, Piedra y Madera para construir estructuras."
        },
        {
            heading: "Árbol de Tecnología",
            content: "Investiga nuevas tecnologías para desbloquear unidades más avanzadas, estructuras defensivas y mejoras económicas. Accede desde el botón 💡."
        },
        {
            heading: "Controles Básicos",
            content: "• <b>Clic en hexágono/unidad:</b> Selecciona o interactúa. <br>• <b>Arrastrar tablero:</b> Panorámica del mapa. <br>• <b>Botón ►:</b> Terminar turno. <br>• <b>Botón ➕:</b> Crear nueva unidad (en fase de despliegue). <br>• <b>Botón Crear Unidad:</b> Crear nueva unidad (en ciudad o Fortaleza). <br>• <b>Botón Reforzar:</b> Refuerza unidad dañada (en ciudad o Fortaleza)."
        },
        {
            heading: "¿Necesitas ayuda?",
            content: "Si te pierdes, el panel contextual inferior te dará información y acciones disponibles. Puedes acceder al menú flotante (⋮) para opciones de guardar/cargar."
        }
    ],
    footer: "¡Mucha suerte, General! La historia espera tu legado."
};