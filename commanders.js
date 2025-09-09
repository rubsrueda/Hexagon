const COMMANDERS = {
    "g_fabius": {
        id: "g_fabius", name: "Fabio Máximo", title: "El Cunctátor", rarity: "Común", sprite: "🏛️", description: "Un maestro de la defensa y la guerra de desgaste.",
        activeSkill: { skill_id: "active_shield", scaling_override: [800, 900, 1000, 1200, 1400]},
        passiveSkills: [
            { skill_id: "increase_defense", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "economic_morale_loss_reduction", scaling_override: [15, 18, 21, 25, 30] }
        ]
    },
    "g_indibil": {
        id: "g_indibil", name: "Indíbil", title: "El Insurgente", rarity: "Raro", sprite: "⛰️", description: "Maestro de la guerrilla que usa el terreno para diezmar a enemigos.",
        activeSkill: { skill_id: "active_damage_and_debuff", scaling_override: [{dmg: 700, slow: 20}, {dmg: 800, slow: 22}, {dmg: 900, slow: 25}, {dmg: 1100, slow: 28}, {dmg: 1300, slow: 30}]},
        passiveSkills: [
            { skill_id: "conditional_terrain_buff", scaling_override: [10, 12, 14, 17, 20]},
            { skill_id: "increase_skill_damage", scaling_override: [10, 12, 14, 17, 20] }
        ]
    },
    "g_istolacio": {
        id: "g_istolacio", name: "Istolacio", rarity: "Común", sprite: "🐗", description: "General celta cuya carga frontal es capaz de romper cualquier línea defensiva.",
        activeSkill: { skill_id: "active_direct_damage", scaling_override: [600, 700, 800, 950, 1100]},
        passiveSkills: [
            { skill_id: "increase_attack", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [5, 7, 9, 12, 15] },
            { skill_id: "trigger_on_being_attacked", details: { probability: 10 }, scaling_override: [15, 18, 21, 25, 30]}
        ]
    },
    "g_amilcar_barca": {
        id: "g_amilcar_barca", name: "Amílcar Barca", rarity: "Épico", sprite: "🦁", description: "Estratega implacable y experto en logística.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: ['attack', 'movement'] }, scaling_override: [{atk: 25, mov: 15}, {atk: 30, mov: 15}, {atk: 35, mov: 20}, {atk: 40, mov: 20}, {atk: 50, mov: 25}]},
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "Infantería y Caballería", unit_filter: "infantry_cavalry" }, scaling_override: [5, 7, 9, 12, 15] } ]
    },
    "g_asdrubal_bello": {
        id: "g_asdrubal_bello", name: "Asdrúbal el Bello", rarity: "Raro", sprite: "🏛️", description: "Diplomático y constructor que defiende sus ciudades con tenacidad.",
        activeSkill: { skill_id: "conditional_terrain_buff", details: { terrain: ['city', 'fortress'], stat: 'attack' }, scaling_override: [10, 12, 14, 17, 20]},
        passiveSkills: [ { skill_id: "economic_build_cost_reduction", details: { resource: "piedra" }, scaling_override: [5, 7, 9, 12, 15] } ]
    },
    "g_viriato": {
        id: "g_viriato", name: "Viriato", rarity: "Épico", sprite: "🐑", description: "La pesadilla de Roma. Un líder indomable.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: ['attack'], debuff: ['defense']}, scaling_override: [{atk: 30, def: -10}, {atk: 35, def: -10}, {atk: 40, def: -10}, {atk: 45, def: -15}, {atk: 50, def: -15}]},
        passiveSkills: [ { skill_id: "conditional_low_health_buff", details: { stat: "defense"}, scaling_override: [20, 24, 28, 32, 40] }, { skill_id: "increase_movement", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [1,1,1,1,1] } ]
    },
    "g_corocotta": {
        id: "g_corocotta", name: "Corocotta", rarity: "Raro", sprite: "💰", description: "Caudillo cántabro especialista en incursiones rápidas.",
        activeSkill: { skill_id: "active_direct_damage", scaling_override: [600, 700, 800, 950, 1100]},
        passiveSkills: [ { skill_id: "conditional_numerical_advantage", details: { advantage: "outnumbered", stat: "attack"}, scaling_override: [5, 7, 9, 12, 15] }, { skill_id: "trigger_on_kill", details: { resource: "oro" } } ]
    },
    "g_escipion_africano": {
        id: "g_escipion_africano", name: "Escipión el Africano", rarity: "Legendario", sprite: "🦅", description: "Genio táctico que se adapta a cualquier enemigo.",
        activeSkill: { skill_id: "active_damage_and_debuff", scaling_override: [{dmg: 1000, def: 20}, {dmg: 1100, def: 22}, {dmg: 1200, def: 25}, {dmg: 1300, def: 28}, {dmg: 1400, def: 30}]},
        passiveSkills: [ { skill_id: "increase_skill_damage", scaling_override: [5, 7, 9, 12, 15] }, { skill_id: "increase_defense", details: { filter_desc: "todas las tropas", unit_filter: "all"}, scaling_override: [10,10,10,10,10]} ]
    },
    "g_quinto_sertorio": {
        id: "g_quinto_sertorio", name: "Quinto Sertorio", rarity: "Épico", sprite: "🦌", description: "General romano proscrito, maestro de la guerra irregular.",
        activeSkill: { skill_id: "active_heal_and_buff", scaling_override: [{heal: 400, mov: 15}, {heal: 450, mov: 15}, {heal: 500, mov: 20}, {heal: 600, mov: 20}, {heal: 700, mov: 25}]},
        passiveSkills: [ { skill_id: "increase_counter_attack", scaling_override: [5, 7, 9, 12, 15] }, { skill_id: "conditional_numerical_advantage", details: { advantage: "mixed_army", stat: "attack"}, scaling_override: [3, 4, 5, 6, 7]} ]
    },
    "g_ataulfo": {
        id: "g_ataulfo", name: "Ataúlfo", rarity: "Común", sprite: "👑", description: "Rey visigodo que intentó fusionar la fuerza goda con la cultura romana.",
        activeSkill: { skill_id: "active_shield", scaling_override: [500, 600, 700, 800, 900]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "la Caballería", unit_filter: "cavalry"}, scaling_override: [4, 5, 6, 8, 10] }, { skill_id: "increase_defense", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [4, 5, 6, 8, 10] } ]
    },
    "g_leovigildo": {
        id: "g_leovigildo", name: "Leovigildo", rarity: "Raro", sprite: "🔨", description: "Restaurador del reino visigodo, un rey conquistador.",
        activeSkill: { skill_id: "active_direct_damage", details: { condition: "on_garrison" }, scaling_override: [700, 800, 900, 1000, 1100]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "asedio", unit_filter: "artillery" }, scaling_override: [5, 7, 9, 12, 15] }, { skill_id: "conditional_terrain_buff", details: { terrain: ['city', 'fortress'], stat: 'defense' }, scaling_override: [5, 7, 9, 12, 15]} ]
    },
    "g_don_rodrigo": {
        id: "g_don_rodrigo", name: "Don Rodrigo", rarity: "Épico", sprite: "💔", description: "El último rey visigodo, valiente pero traicionado.",
        activeSkill: { skill_id: "active_direct_damage", details: { condition: "low_target_health" }, scaling_override: [1200, 1300, 1400, 1500, 1700]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "la Caballería", unit_filter: "cavalry"}, scaling_override: [10, 12, 14, 16, 20] }, { name: "El Peso de la Traición", description: "La división recibe un 7% más de daño." } ]
    },
    "g_tariq_ibn_ziyad": {
        id: "g_tariq_ibn_ziyad", name: "Táriq ibn Ziyad", rarity: "Épico", sprite: "🌙", description: "Audaz conquistador que quema sus naves y solo mira hacia adelante.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: ['attack', 'movement']}, scaling_override: [{atk: 25, mov: 15}, {atk: 28, mov: 15}, {atk: 31, mov: 20}, {atk: 35, mov: 20}, {atk: 40, mov: 25}]},
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "la Caballería", unit_filter: "cavalry" }, scaling_override: [5, 8, 11, 15, 20] }, { skill_id: "increase_movement", details: { filter_desc: "la división", unit_filter: "all"}, scaling_override: [1,1,1,1,1] } ]
    },
    "g_musa_ibn_nusair": {
        id: "g_musa_ibn_nusair", name: "Musa ibn Nusair", rarity: "Raro", sprite: "🗺️", description: "Gran administrador y pacificador de territorios.",
        activeSkill: { skill_id: "active_damage_and_debuff", details: { damage: false, debuff: 'attack'}, scaling_override: [15, 18, 21, 25, 30]},
        passiveSkills: [ { name: "Pacificador", description: "Aumenta el daño a bárbaros un X%.", scaling: [10, 15, 20, 25, 35] } ]
    },
    "g_don_pelayo": {
        id: "g_don_pelayo", name: "Don Pelayo", rarity: "Épico", sprite: "🛡️", description: "Iniciador de la Reconquista y maestro de la defensa tenaz.",
        activeSkill: { skill_id: "active_defensive_stance", scaling_override: [{def: 30, cntr: 20}, {def: 35, cntr: 22}, {def: 40, cntr: 25}, {def: 45, cntr: 28}, {def: 50, cntr: 30}]},
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [10, 12, 14, 17, 20] }, { skill_id: "conditional_terrain_buff", details: { terrain: ['city', 'fortress'], stat: 'attack' }, scaling_override: [3, 4, 5, 6, 7]} ]
    },
    "g_abderraman_i": {
        id: "g_abderraman_i", name: "Abderramán I", rarity: "Épico", sprite: "🌴", description: "Fundador del Emirato de Córdoba, un superviviente nato.",
        activeSkill: { skill_id: "active_shield", scaling_override: [800, 950, 1100, 1250, 1400]},
        passiveSkills: [ { skill_id: "trigger_on_being_attacked", details: { probability: 10, buff: "defense" }, scaling_override: [10, 12, 14, 17, 20] }, { skill_id: "economic_build_cost_reduction", details: { resource: "piedra"}, scaling_override: [10,10,10,10,10]} ]
    },
    "g_almanzor": {
        id: "g_almanzor", name: "Almanzor", rarity: "Legendario", sprite: "🔥", description: "El terror de los reinos cristianos, un torbellino de fuego y acero.",
        activeSkill: { skill_id: "active_aoe_damage", scaling_override: [1000, 1100, 1200, 1300, 1400]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "la Caballería", unit_filter: "cavalry"}, scaling_override: [15, 18, 21, 25, 30] }, { skill_id: "trigger_on_kill", details: { resource: "oro"} } ]
    },
    "g_el_cid": {
        id: "g_el_cid", name: "Rodrigo Díaz de Vivar", rarity: "Legendario", sprite: "🧔", description: "Maestro de la guerra que sirve a quien le place.",
        activeSkill: { skill_id: "active_direct_damage", details: { condition: 'low_target_health'}, scaling_override: [1200, 1350, 1500, 1650, 1800]},
        passiveSkills: [ { skill_id: "conditional_numerical_advantage", details: { advantage: 'mixed_army', stats: ['attack','defense','health'] }, scaling_override: [4, 5, 6, 8, 10] }, { skill_id: "trigger_on_death", scaling_override: [5, 7, 9, 12, 15] } ]
    },
    "g_yusuf_ibn_tasufin": {
        id: "g_yusuf_ibn_tasufin", name: "Yusuf ibn Tasufin", rarity: "Épico", sprite: "🏜️", description: "Líder almorávide, un monje guerrero de fe inquebrantable.",
        activeSkill: { skill_id: "active_heal_and_buff", scaling_override: [{heal: 400, atk: 15}, {heal: 450, atk: 18}, {heal: 500, atk: 21}, {heal: 550, atk: 25}, {heal: 600, atk: 30}]},
        passiveSkills: [ { skill_id: "increase_defense", details: { filter_desc: "la Infantería", unit_filter: "infantry"}, scaling_override: [10, 12, 14, 17, 20] }, { skill_id: "conditional_high_health_buff", details: { stat: "attack"}, scaling_override: [5, 7, 9, 12, 15] } ]
    },
    "g_alfonso_i_batallador": {
        id: "g_alfonso_i_batallador", name: "Alfonso I", rarity: "Épico", sprite: "⚔️", description: "Un rey que pasó su vida en campaña, incansable en la batalla.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: "normal_attack" }, scaling_override: [20, 24, 28, 32, 40]},
        passiveSkills: [ { skill_id: "trigger_on_kill", details: { resource: "moral"}, scaling_override: [50,50,50,50,50]}, { skill_id: "increase_attack", details: { filter_desc: "asedio", unit_filter: "artillery" }, scaling_override: [3, 4, 5, 6, 7] } ]
    },
    "g_alvar_fanez": {
        id: "g_alvar_fanez", name: "Álvar Fáñez", rarity: "Raro", sprite: "⚡", description: "El leal y veloz lugarteniente de El Cid.",
        activeSkill: { skill_id: "active_damage_and_debuff", scaling_override: [{dmg: 600, mov: 20}, {dmg: 650, mov: 22}, {dmg: 700, mov: 25}, {dmg: 750, mov: 28}, {dmg: 800, mov: 30}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "la Caballería", unit_filter: "cavalry"}, scaling_override: [5, 7, 9, 12, 15] }, { name: "Lealtad Castellana", description: "Si El Cid es aliado en el campo, esta división gana un 5% de ataque."} ]
    },
    "g_jaime_i": {
        id: "g_jaime_i", name: "Jaime I", rarity: "Legendario", sprite: "🐉", description: "El Conquistador de Mallorca y Valencia, un estratega brillante.",
        activeSkill: { skill_id: "active_damage_and_debuff", details: { target: "garrison"}, scaling_override: [{dmg: 700, def: -10}, {dmg: 800, def: -12}, {dmg: 900, def: -15}, {dmg: 1000, def: -18}, {dmg: 1100, def: -20}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "asedio", unit_filter: "artillery"}, scaling_override: [10, 15, 20, 25, 30] }, { skill_id: "economic_xp_gain_buff", scaling_override: [10, 12, 14, 16, 20] } ]
    },
    "g_fernando_iii": {
        id: "g_fernando_iii", name: "Fernando III", rarity: "Épico", sprite: "⚜️", description: "Unificador de reinos, su piedad inspira a sus ejércitos.",
        activeSkill: { skill_id: "active_heal_and_buff", details: { buff: "skill_damage_reduction" }, scaling_override: [{heal: 800, reduc: 10}, {heal: 900, reduc: 12}, {heal: 1000, reduc: 15}, {heal: 1100, reduc: 18}, {heal: 1200, reduc: 20}]},
        passiveSkills: [ { skill_id: "increase_defense", details: { filter_desc: "Infantería y salud de Arqueros", unit_filter: "infantry_archer_mix" }, scaling_override: [10, 12, 14, 16, 20]}, { name: "Aura de Santidad", description: "Otorga 5% de reducción de daño a divisiones aliadas adyacentes." } ]
    },
    "g_pelayo_perez_correa": {
        id: "g_pelayo_perez_correa", name: "Pelayo Pérez Correa", rarity: "Raro", sprite: "☀️", description: "Maestre de la Orden de Santiago, tan tenaz que ni el sol se le resiste.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: "attack", unit_filter: "cavalry" }, scaling_override: [20, 24, 28, 32, 40]},
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "la Caballería", unit_filter: "cavalry" }, scaling_override: [10, 12, 14, 17, 20] }, { skill_id: "conditional_numerical_advantage", details: { advantage: "less_regiments", stat: "damage" }, scaling_override: [3, 4, 5, 6, 7]} ]
    },
    "g_alonso_perez_de_guzman": {
        id: "g_alonso_perez_de_guzman", name: "Guzmán el Bueno", rarity: "Épico", sprite: "🏰", description: "Símbolo de la lealtad inquebrantable, prefiere la muerte a la deshonra.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: "damage_reduction", target: "garrison"}, scaling_override: [10, 12, 14, 17, 20]},
        passiveSkills: [ { skill_id: "conditional_terrain_buff", details: { stat: "attack", terrain: "surrounded_garrison"}, scaling_override: [5, 7, 9, 12, 15] }, { skill_id: "conditional_low_health_buff", details: { stat: "attack", target: "garrison" }, scaling_override: [10, 12, 14, 17, 20]} ]
    },
    "g_roger_de_flor": {
        id: "g_roger_de_flor", name: "Roger de Flor", rarity: "Legendario", sprite: "🔪", description: "Líder de una fuerza de choque temida en todo el Mediterráneo. Su lema es 'Desperta Ferro!'.",
        activeSkill: { skill_id: "active_aoe_damage", details: { debuff: "bleed" }, scaling_override: [{dmg: 800, dot: 150}, {dmg: 900, dot: 175}, {dmg: 1000, dot: 200}, {dmg: 1100, dot: 225}, {dmg: 1200, dot: 250}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "la Infantería", unit_filter: "infantry" }, scaling_override: [15, 18, 21, 25, 30]}, { skill_id: "increase_counter_attack", scaling_override: [10, 12, 14, 17, 20]} ]
    },
    "g_bertran_du_guesclin": {
        id: "g_bertran_du_guesclin", name: "Bertrán du Guesclin", rarity: "Épico", sprite: "⚜️", description: "Maestro de la guerra de desgaste y la victoria sin batalla.",
        activeSkill: { skill_id: "active_damage_and_debuff", details: { damage: false, debuff: ['attack', 'defense']}, scaling_override: [{atk: -15, def: -10}, {atk: -18, def: -12}, {atk: -21, def: -15}, {atk: -25, def: -18}, {atk: -30, def: -20}]},
        passiveSkills: [ { name: "Maestro Táctico", description: "Reduce el daño normal recibido un {X}%.", scaling: [5, 7, 9, 12, 15] }, { name: "Victoria sin Batalla", description: "Las tropas sufren un {X}% menos de bajas al atacar ciudades.", scaling: [5, 7, 9, 12, 15]} ]
    },
    "g_juan_pacheco": {
        id: "g_juan_pacheco", name: "Juan Pacheco", rarity: "Raro", sprite: "🐍", description: "Maestro de la intriga y la conspiración palaciega.",
        activeSkill: { skill_id: "active_damage_and_debuff", details: { damage: false, debuff: ['defense', 'healing_received']}, scaling_override: [{def: -15, heal: -20}, {def: -18, heal: -22}, {def: -21, heal: -25}, {def: -25, heal: -28}, {def: -30, heal: -30}]},
        passiveSkills: [ { skill_id: "increase_movement", details: { filter_desc: "la división", unit_filter: "all"}, scaling_override: [1,1,1,1,1]}, { skill_id: "conditional_numerical_advantage", details: { advantage: "outnumbering", stat: "defense" }, scaling_override: [3, 4, 5, 6, 7]} ]
    },
    "g_marques_de_cadiz": {
        id: "g_marques_de_cadiz", name: "Rodrigo Ponce de León", rarity: "Raro", sprite: "🤺", description: "Un noble audaz, famoso por sus rápidas incursiones.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff:['attack', 'movement'], unit_filter:'cavalry' }, scaling_override: [{atk: 20, mov: 10}, {atk: 22, mov: 12}, {atk: 25, mov: 15}, {atk: 28, mov: 18}, {atk: 30, mov: 20}]},
        passiveSkills: [ { name: "Guerra de Granada", description: "Aumenta el daño en campo abierto un {X}%.", scaling: [3, 4, 5, 6, 7]}, { name: "Señor de la Frontera", description: "Aumenta el daño en territorio aliado un {X}%.", scaling: [3, 4, 5, 6, 7] } ]
    },
    "g_el_zagal": {
        id: "g_el_zagal", name: "Muhammad XIII", rarity: "Épico", sprite: "🏔️", description: "El Valiente, defensor incansable de Granada hasta el final.",
        activeSkill: { name: "Defensa de Granada", description: "Aumenta defensa de guarnición ({X}%). Al terminar, inflige daño (Poder {Y}).", scaling: [{def: 20, dmg: 600}, {def: 22, dmg: 650}, {def: 25, dmg: 700}, {def: 28, dmg: 750}, {def: 30, dmg: 800}]},
        passiveSkills: [ { skill_id: "conditional_low_health_buff", details: { stat: 'attack', target: 'garrison' }, scaling_override: [10, 12, 14, 17, 20]}, { skill_id: "increase_health", details: { filter_desc: "la Infantería en guarnición", unit_filter: 'infantry_in_garrison' }, scaling_override: [5, 8, 11, 15, 20]} ]
    },
    "g_gonzalo_fernandez_de_cordoba": {
        id: "g_gonzalo_fernandez_de_cordoba", name: "El Gran Capitán", rarity: "Legendario", sprite: "🏆", description: "El padre de la guerra moderna, un genio táctico.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: ['attack', 'defense'] }, scaling_override: [{atk: 20, def: 20}, {atk: 22, def: 22}, {atk: 25, def: 25}, {atk: 28, def: 28}, {atk: 30, def: 30}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "Infantería y Arqueros", unit_filter: "infantry_archer_mix" }, scaling_override: [10, 12, 14, 17, 20]}, { skill_id: "conditional_high_health_buff", details: { stat: 'skill_damage' }, scaling_override: [10, 15, 20, 25, 30]} ]
    },
    "g_pedro_navarro": {
        id: "g_pedro_navarro", name: "Pedro Navarro", rarity: "Épico", sprite: "💣", description: "Ingeniero militar pionero en el uso de la pólvora para el asedio.",
        activeSkill: { skill_id: "active_direct_damage", details: { target: "garrison"}, scaling_override: [1000, 1150, 1300, 1450, 1600]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "asedio", unit_filter: 'artillery' }, scaling_override: [10, 15, 20, 25, 30]}, { name: "Experto en Pólvora", description: "Reduce el daño recibido por Artillería un {X}%.", scaling: [5, 7, 9, 12, 15]} ]
    },
    "g_diego_garcia_de_paredes": {
        id: "g_diego_garcia_de_paredes", name: "Diego G. de Paredes", rarity: "Raro", sprite: "💪", description: "El Sansón de Extremadura, famoso por su increíble fuerza física.",
        activeSkill: { skill_id: "active_attack_buff", scaling_override: [20, 25, 30, 35, 40]},
        passiveSkills: [ { name: "Rompefilas", description: "Ataques normales tienen 10% de prob. de infligir daño en área (Poder {X}).", scaling: [200, 220, 240, 260, 300]} ]
    },
    "g_antonio_de_leyva": {
        id: "g_antonio_de_leyva", name: "Antonio de Leyva", rarity: "Legendario", sprite: "🦾", description: "Veterano de innumerables batallas, su voluntad de hierro es legendaria.",
        activeSkill: { skill_id: "active_immortality", scaling_override: [2,2,2,2,2] }, // 2 turnos
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "todas las tropas", unit_filter: "all"}, scaling_override: [5, 7, 9, 12, 15]}, { skill_id: "conditional_low_health_buff", details: { stat: 'defense'}, scaling_override: [10, 15, 20, 25, 30]} ]
    },
    "g_marques_de_pescara": {
        id: "g_marques_de_pescara", name: "Marqués de Pescara", rarity: "Épico", sprite: "✨", description: "Táctico innovador y un líder adorado por sus hombres.",
        activeSkill: { skill_id: "active_heal_and_buff", details: { buff: 'skill_damage_aura'}, scaling_override: [400, 450, 500, 600, 700]},
        passiveSkills: [ { name: "Líder Adorado", description: "Aumenta la ganancia de moral un {X}%.", scaling: [10, 12, 14, 17, 20]}, { skill_id: "increase_attack", details: { filter_desc: "los Arqueros", unit_filter: "Arqueros" }, scaling_override: [10, 12, 14, 16, 20]} ]
    },
    "g_duque_de_alba": {
        id: "g_duque_de_alba", name: "Duque de Alba", rarity: "Legendario", sprite: "⛓️", description: "El Duque de Hierro. Su disciplina es legendaria, y sus ejércitos, un muro infranqueable.",
        activeSkill: { skill_id: "active_shield_and_counter", scaling_override: [{shield: 1000, cntr: 20}, {shield: 1100, cntr: 22}, {shield: 1200, cntr: 25}, {shield: 1300, cntr: 28}, {shield: 1400, cntr: 30}]},
        passiveSkills: [ { skill_id: "increase_defense", details: { filter_desc: "la Infantería", unit_filter: "infantry" }, scaling_override: [10, 12, 14, 17, 20]}, { name: "Tribunal de los Tumultos", description: "Reduce el daño de habilidad recibido un {X}%.", scaling: [5, 8, 11, 15, 20]} ]
    },
    "g_juan_de_austria": {
        id: "g_juan_de_austria", name: "Don Juan de Austria", rarity: "Legendario", sprite: "✝️", description: "Héroe de Lepanto, destinado a la gloria en las más grandes batallas navales.",
        activeSkill: { skill_id: "active_aoe_damage", details: { target_filter: "naval", buff: "naval_allies"}, scaling_override: [{dmg: 800, atk: 10}, {dmg: 850, atk: 12}, {dmg: 900, atk: 15}, {dmg: 950, atk: 18}, {dmg: 1000, atk: 20}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "unidades navales", unit_filter: "naval" }, scaling_override: [10, 15, 20, 25, 30]}, { skill_id: "economic_xp_gain_buff", details: { target: "allies" }, scaling_override: [5, 7, 9, 12, 15]} ]
    },
    "g_alvaro_de_bazan": {
        id: "g_alvaro_de_bazan", name: "Álvaro de Bazán", rarity: "Legendario", sprite: "⚓", description: "El marino nunca derrotado, un almirante legendario.",
        activeSkill: { skill_id: "active_damage_and_debuff", details: { target_filter: "naval", debuff: ['attack', 'movement']}, scaling_override: [{dmg: 1100, debuff: 15}, {dmg: 1200, debuff: 18}, {dmg: 1300, debuff: 21}, {dmg: 1400, debuff: 25}, {dmg: 1500, debuff: 30}]},
        passiveSkills: [ { skill_id: "increase_attack", details: { filter_desc: "unidades navales", unit_filter: "naval", stat: ['attack','defense']}, scaling_override: [5, 7, 9, 12, 15]}, { name: "Almirante Experimentado", description: "Reduce el daño recibido de otras flotas un {X}%.", scaling: [5, 7, 9, 12, 15]} ]
    },
    "g_alejandro_farnesio": {
        id: "g_alejandro_farnesio", name: "Alejandro Farnesio", rarity: "Legendario", sprite: "⚡", description: "El Rayo de la Guerra. Genio de la maniobra y el asedio.",
        activeSkill: { skill_id: "active_stat_buff", details: { buff: 'attack', condition: 'attacking_city'}, scaling_override: [10, 12, 14, 16, 20]},
        passiveSkills: [ { skill_id: "increase_movement", details: { filter_desc: "Caballería e Infantería", unit_filter: "cavalry_infantry_mix"}, scaling_override: [1,1,1,1,1]}, { name: "Diplomacia y Acero", description: "Reduce el daño recibido de guarniciones un {X}%.", scaling: [5, 8, 11, 15, 20]} ]
    },
    "g_ambrosio_spinola": {
        id: "g_ambrosio_spinola", name: "Ambrosio Spínola", rarity: "Épico", sprite: "🏦", description: "Un banquero genovés convertido en general, maestro de la logística.",
        activeSkill: { skill_id: "active_heal", scaling_override: [500, 600, 700, 800, 900]},
        passiveSkills: [ { skill_id: "economic_healing_cost_reduction", scaling_override: [10, 12, 14, 17, 20]} ]
    },
    "g_julian_romero": {
        id: "g_julian_romero", name: "Julián Romero", rarity: "Épico", sprite: "🦾", description: "El Manco de Flandes. Un soldado de fortuna indomable.",
        activeSkill: { skill_id: "active_heal_and_buff", details: { buff: 'counter_attack'}, scaling_override: [{heal: 300, cntr: 30}, {heal: 350, cntr: 35}, {heal: 400, cntr: 40}, {heal: 450, cntr: 45}, {heal: 500, cntr: 50}]},
        passiveSkills: [ { skill_id: "increase_health", details: { filter_desc: "la Infantería", unit_filter: 'infantry' }, scaling_override: [10, 12, 14, 17, 20]}, { skill_id: "conditional_low_health_buff", details: { stat: 'attack' }, scaling_override: [5, 8, 11, 15, 20]} ]
    },
    "g_juan_del_aguila": {
        id: "g_juan_del_aguila", name: "Juan del Águila", rarity: "Raro", sprite: "🗺️", description: "Un veterano de los Tercios, experto en campañas expedicionarias.",
        activeSkill: { skill_id: "active_defense_buff", scaling_override: [20, 25, 30, 35, 40]},
        passiveSkills: [ { skill_id: "economic_casualty_reduction", scaling_override: [10, 15, 20, 25, 30]}, { name: "Tercio Viejo", description: "Aumenta el ataque al luchar fuera de territorio aliado un {X}%.", scaling: [3, 4, 5, 6, 7] } ]
    }
};