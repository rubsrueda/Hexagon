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
    // scope: 'unit_stats' -> Se aplica en calculateRegimentStats (stats permanentes).
    // scope: 'combat'     -> Se aplica en el flujo de combate (attackUnit/applyDamage).
    // scope: 'global'     -> Se aplica en otras partes del juego (upkeep, construcción).

    'increase_defense': {
        id: 1, name: "Aumento de Defensa", scope: 'unit_stats',
        description_template: "Aumenta la defensa base de las unidades filtradas en un {X}%.",
        effect: { type: 'stat_modifier', stat: 'defense', is_percentage: true },
        filters: { unit_category: ['infantry', 'all'] } 
    },
    'increase_attack': {
        id: 2, name: "Aumento de Ataque", scope: 'unit_stats',
        description_template: "Aumenta el ataque base de las unidades filtradas en un {X}%.",
        effect: { type: 'stat_modifier', stat: 'attack', is_percentage: true },
        filters: { unit_category: ['infantry', 'cavalry', 'artillery', 'naval', 'all'] } 
    },
    'active_attack_buff': { id: 33, name: "Grito de Guerra (Ataque)", description_template: "Al inicio del combate, aumenta el ataque del ejército un {X}% por 2 turnos.", 
        scope: 'unit_stats', effect: { type: 'stat_modifier', stat: 'attack', is_percentage: true, duration: 2 },
        filters: { unit_category: ['infantry', 'cavalry', 'artillery', 'naval', 'all']}
    },

    'increase_health': {
        id: 3, name: "Aumento de Salud", scope: 'unit_stats',
        description_template: "Aumenta la salud máxima de las unidades filtradas en un {X}%.",
        effect: { type: 'stat_modifier', stat: 'health', is_percentage: true },
        filters: { unit_category: ['infantry', 'cavalry', 'all'] } 
    },
    'increase_movement': {
        id: 4, name: "Marcha Forzada", scope: 'unit_stats',
        description_template: "Aumenta el movimiento de las unidades filtradas en {X}.",
        effect: { type: 'stat_modifier', stat: 'movement', is_percentage: false, value: 1 },
        filters: { unit_category: ['infantry', 'cavalry', 'all'] } 
    },

    'conditional_terrain_buff': {
        id: 5, name: "Bonus de Terreno", scope: 'combat',
        description_template: "En terreno favorable, aumenta ataque y defensa en un {X}%.",
        trigger: { event: 'on_terrain', condition: ['hills', 'forest', 'city', 'fortress'] },
        effects: [ { type: 'stat_modifier', stat: 'attack', is_percentage: true }, { type: 'stat_modifier', stat: 'defense', is_percentage: true } ],
        filters: { unit_category: ['infantry'] } 
    },
    'increase_skill_damage': { 
        id: 6, name: "Genio Militar", scope: 'global',
        description_template: "Aumenta el daño infligido por habilidades activas en un {X}%.",
        effect: {type:'skill_damage_increase', is_percentage:true} 
    },
     'conditional_low_health_buff': {
        id: 13, name: "Furia del Herido", scope: 'combat',
        description_template: "Con salud por debajo del 50%, modifica un stat en un {X}%.",
        trigger: { event: 'on_health_threshold', condition: { threshold: 50, comparison: 'less_than' } },
        effect: { type: 'stat_modifier', is_percentage: true } // Stat (atk/def) se toma del 'details' del héroe
    },
    'trigger_on_being_attacked': {
        id: 9, name: "Respuesta Defensiva", scope: 'combat',
        description_template: "Al ser atacado, tiene un 10% de prob. de ganar un {X}% de bonificación temporal.",
        trigger: { event: 'on_being_attacked', probability: 10 },
        effect: { type: 'temp_buff', is_percentage: true } // Stat (atk/def) se toma del 'details'
    },
    'increase_counter_attack': {
        id: 18, name: "Contraataque Mejorado", scope: 'combat',
        description_template: "Aumenta el daño de contraataque en un {X}%.",
        trigger: { event: 'on_counter_attack' },
        effect: { type: 'stat_modifier', stat: 'attack', is_percentage: true }
    },
    'active_shield': { 
        id: 10, name: "Aumento de Defensa", scope: 'unit_stats',
        description_template: "Al inicio del combate, crea un escudo que absorbe {X} de daño.",
        effect: { type: 'stat_modifier', stat: 'defense', is_percentage: false },
        filters: { unit_category: ['all'] } 
    },

    'conditional_numerical_advantage': { 
        id: 15, name: "Tácticas de Guerrilla", scope: 'combat',
        description_template: "Bajo ciertas condiciones numéricas, modifica un stat un {X}%.",
        trigger: { event: 'on_numerical_status' }, 
        effect: { type: 'stat_modifier', is_percentage: true } 
    },
    'trigger_on_kill': { 
        id: 16, name: "Recompensa del Vencedor", scope: 'combat',
        description_template: "Al destruir un enemigo, restaura un recurso (oro o moral).",
        trigger: { event: 'on_kill' }, 
        effect: { type: 'restore_resource' } 
    },
    'passive_glass_cannon': {
        id: 19, name: "El Peso de la Traición", scope: 'combat',
        description_template: "La división recibe un {X}% más de daño de ataques normales.",
        trigger: { event: 'on_being_attacked' },
        effect: { type: 'damage_taken_increase', is_percentage: true, value: 7 }
    },
    'trigger_on_death': {
        id: 21, name: "Legado del Caído", scope: 'combat',
        description_template: "Al morir, las unidades aliadas cercanas ganan un {X}% de ataque.",
        trigger: { event: 'on_death' }, 
        effect: { type: 'aoe_buff', stat: 'attack', is_percentage: true, radius: 1 } 
    },
    'conditional_high_health_buff': {
        id: 22, name: "Ímpetu Inicial", scope: 'combat',
        description_template: "Con salud por encima del 70%, modifica un stat en un {X}%.",
        trigger: { event: 'on_health_threshold', condition: { threshold: 70, comparison: 'greater_than' } },
        effect: { type: 'stat_modifier' }
    },
    // (AQUÍ IRÍAN EL RESTO de habilidades con sus descripciones completas)

    'active_damage_and_debuff': { id: 4, name: "Ataque Debilitante", description_template: "Tiene una prob. de infligir daño directo (Poder {X}) y aplicar un debuff.", scope: 'combat',  trigger: { event: 'on_attack_roll', probability: 20 }, effects: [ { type: 'direct_damage' }, { type: 'apply_temp_debuff' } ]},
    'active_direct_damage': { id: 7, name: "Golpe Certero", description_template: "Tiene una prob. de infligir daño directo (Poder {X}).", scope: 'combat',  trigger: { event: 'on_attack_roll', probability: 15 }, effect: { type: 'direct_damage' } },
    'active_stat_buff': { id: 10, name: "Buff de Táctico", description_template: "Al inicio del combate, aplica un buff temporal múltiple.", scope: 'combat',  trigger: { event: 'on_battle_start' }, effect: { type: 'apply_temp_buff_multiple', duration: 3 } },
    'active_heal_and_buff': { id: 17, name: "Bendición del General", description_template: "Al inicio del turno en combate, cura y aplica un buff.", scope: 'combat',  trigger: { event: 'on_turn_start_in_combat' }, effects: [ { type: 'heal' }, { type: 'apply_temp_buff' } ]},
    'active_defensive_stance': { id: 20, name: "Postura Defensiva", description_template: "Al inicio del combate, adopta una postura defensiva.", scope: 'combat',  trigger: { event: 'on_battle_start' }, effect: { type: 'apply_stance', duration: 1 } },
    'active_aoe_damage': { id: 26, name: "Ataque en Área", description_template: "Tiene una prob. de infligir daño a múltiples objetivos.", scope: 'combat',  trigger: { event: 'on_attack_roll', probability: 10 }, effect: { type: 'aoe_damage' } },
    'active_unique_defensa_de_granada': { id: 31, name: "Defensa de Granada", description_template: "Habilidad única de El Zagal para la defensa.", scope: 'combat', type: 'active'},
    'active_immortality': { id: 35, name: "Inmortalidad Temporal", description_template: "Cuando la salud baja del 20%, la división no puede morir por 2 turnos.", scope: 'combat',  trigger: { event: 'on_health_threshold', condition: { threshold: 20, comparison: 'less_than' } }, effect: { type: 'apply_buff', stat: 'death_defiance', duration: 2 } },
    'active_shield_and_counter': { id: 37, name: "Guardia con Escudo", description_template: "Al inicio del combate, crea un escudo y aumenta el contraataque.", scope: 'combat',  trigger: { event: 'on_battle_start' }, effects: [ { type: 'apply_shield' }, { type: 'apply_temp_buff', stat: 'counter_attack', is_percentage: true } ]},
    'active_defense_buff': { id: 44, name: "Reforzar Defensa", description_template: "Al inicio del combate, aumenta la defensa del ejército un {X}% por 2 turnos.", scope: 'combat',  trigger: { event: 'on_battle_start' }, effect: { type: 'apply_temp_buff', stat: 'defense', is_percentage: true, duration: 2 } },
    'active_heal': { id: 45, name: "Curación de Campo", description_template: "Al final de cada ronda de duelos, la división se cura {X} de salud.", scope: 'combat',  trigger: { event: 'on_turn_end_in_combat' }, effect: { type: 'heal' }},
    'passive_unique_lealtad_castellana': { id: 23, name: "Lealtad Castellana", description_template: "Si El Cid es un comandante aliado en el campo, esta división gana un 5% de ataque.", scope: 'combat' },
    'passive_unique_aura_de_santidad': { id: 24, name: "Aura de Santidad", description_template: "Otorga 5% de reducción de daño a divisiones aliadas adyacentes.", scope: 'combat'},
    'passive_unique_maestro_tactico': { id: 27, name: "Maestro Táctico", description_template: "Reduce el daño de ataques normales recibido un {X}%.", scope: 'combat' },
    'passive_unique_victoria_sin_batalla': { id: 30, name: "Victoria sin Batalla", description_template: "Las tropas sufren un {X}% menos de bajas al contraatacar desde una ciudad.", scope: 'combat' },
    'passive_unique_guerra_de_granada': { id: 29, name: "Guerra de Granada", description_template: "Aumenta el ataque en llanuras un {X}%.", scope: 'combat'},
    'passive_unique_senor_de_la_frontera': { id: 30, name: "Señor de la Frontera", description_template: "Aumenta el ataque en territorio aliado un {X}%.", scope: 'combat' },
    'passive_unique_experto_en_polvora': { id: 32, name: "Experto en Pólvora", description_template: "Reduce el daño recibido de Artillería un {X}%.", scope: 'combat' },
    'passive_unique_rompefilas': { id: 34, name: "Rompefilas", description_template: "Ataques normales tienen 10% de prob. de infligir {X} de daño en área.", scope: 'combat' },
    'passive_unique_lider_adorado': { id: 36, name: "Líder Adorado", description_template: "Aumenta la ganancia de moral de todas las fuentes un {X}%.", scope: 'global' },
    'passive_unique_tribunal_de_los_tumultos': { id: 38, name: "Tribunal de los Tumultos", description_template: "Reduce el daño de habilidad recibido un {X}%.", scope: 'combat' },
    'passive_unique_almirante_experimentado': { id: 39, name: "Almirante Experimentado", description_template: "Reduce el daño recibido de otras flotas un {X}%.", scope: 'combat' },
    'passive_unique_diplomacia_y_acero': { id: 40, name: "Diplomacia y Acero", description_template: "Reduce el daño recibido de guarniciones un {X}%.", scope: 'combat'},
    'passive_unique_tercio_viejo': { id: 43, name: "Tercio Viejo", description_template: "Aumenta el ataque al luchar fuera de territorio aliado un {X}%.", scope: 'combat' },

    // === HABILIDADES GLOBALES Y ECONÓMICAS ===
    'economic_morale_loss_reduction': { id: 11, name: "Administrador Estoico", description_template: "Reduce la pérdida de moral por falta de pago un {X}%.", scope: 'global' },
    'economic_build_cost_reduction': { id: 12, name: "Arquitecto", description_template: "Reduce el coste de construcción de Piedra un {X}%.", scope: 'global' },
    'economic_xp_gain_buff': { id: 13, name: "Instructor Veterano", description_template: "Aumenta la ganancia de experiencia de todas las fuentes un {X}%.", scope: 'global'},
    'economic_healing_cost_reduction': { id: 41, name: "Logista Experto", description_template: "Reduce el coste en oro para reforzar regimientos un {X}%.", scope: 'global' },
    'economic_casualty_reduction': { id: 42, name: "Médico de Campo", description_template: "Reduce el número de bajas permanentes en combate un {X}%.", scope: 'global'}
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