// commanders.js - VERSIÓN COMPLETA Y VERIFICADA

const COMMANDERS = {
    "g_fabius": {
        id: "g_fabius", name: "Fabio Máximo", title: "El Cunctátor", rarity: "Común", sprite: "images/comandantes/g_fabius.png", description: "Un maestro de la defensa y la guerra de desgaste.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [100, 120, 140, 160, 200] },
            { skill_id: "defense_percentage_infantry", scaling_override: [5, 6, 7, 8, 10] },
            { skill_id: "health_flat_infantry", scaling_override: [20, 25, 30, 35, 40] },
            { skill_id: "upkeep_reduction_percentage_all", scaling_override: [10, 12, 14, 16, 20] }
        ]
    },
    "g_indibil": {
        id: "g_indibil", name: "Indíbil", title: "El Insurgente", rarity: "Raro", sprite: "images/comandantes/g_indibil.png", description: "Maestro de la guerrilla que usa el terreno para diezmar a enemigos.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [150, 200, 250, 300, 400]},
            { skill_id: "attack_percentage_infantry", scaling_override: [8, 10, 12, 14, 16]},
            { skill_id: "movement_flat_infantry", scaling_override: [1, 1, 1, 1, 2] },
            { skill_id: "defense_percentage_all", scaling_override: [4, 5, 6, 7, 8] }
        ]
    },
    "g_istolacio": {
        id: "g_istolacio", name: "Istolacio", rarity: "Común", sprite: "images/comandantes/g_istolacio.png", description: "General celta cuya carga frontal es capaz de romper cualquier línea defensiva.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [100, 150, 200, 250, 300]},
            { skill_id: "attack_flat_infantry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "health_percentage_infantry", scaling_override: [5, 6, 7, 8, 10] },
            { skill_id: "morale_flat_all", scaling_override: [5, 6, 7, 8, 10] }
        ]
    },
    "g_amilcar_barca": {
        id: "g_amilcar_barca", name: "Amílcar Barca", rarity: "Épico", sprite: "images/comandantes/g_amilcar_barca.png", description: "Estratega implacable y experto en logística.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [250, 300, 350, 400, 500]},
            { skill_id: "attack_percentage_all", scaling_override: [5, 6, 7, 8, 10] },
            { skill_id: "movement_flat_all", scaling_override: [1, 1, 1, 2, 2] },
            { skill_id: "xp_gain_percentage_all", scaling_override: [10, 15, 20, 25, 30] }
        ]
    },
    "g_asdrubal_bello": {
        id: "g_asdrubal_bello", name: "Asdrúbal el Bello", rarity: "Raro", sprite: "images/comandantes/g_asdrubal_bello.png", description: "Diplomático y constructor que defiende sus ciudades con tenacidad.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [200, 250, 300, 350, 400]},
            { skill_id: "defense_percentage_all", scaling_override: [5, 7, 9, 12, 15] },
            { skill_id: "health_flat_all", scaling_override: [30, 40, 50, 60, 70] },
            { skill_id: "book_drop_chance_percentage", scaling_override: [5, 6, 7, 8, 10] }
        ]
    },
    "g_viriato": {
        id: "g_viriato", name: "Viriato", rarity: "Épico", sprite: "images/comandantes/g_viriato.png", description: "La pesadilla de Roma. Un líder indomable.",
        skills: [
            { skill_id: "movement_flat_infantry", scaling_override: [1, 2, 2, 3, 3] },
            { skill_id: "attack_flat_all", scaling_override: [30, 35, 40, 45, 55]},
            { skill_id: "defense_percentage_infantry", scaling_override: [10, 12, 15, 18, 20] },
            { skill_id: "attack_percentage_infantry", scaling_override: [10, 12, 15, 18, 20] }
        ]
    },

    "g_lucius_velox": {
        id: "g_lucius_velox", 
        name: "Lucio Velox", 
        title: "El Rápido", 
        rarity: "Raro", 
        sprite: "images/comandantes/g_lucius_velox.png", 
        description: "Un explorador legendario, experto en maniobras rápidas y en liderar la vanguardia de caballería.",
        skills: [
            {                 skill_id: "attack_flat_all",                 scaling_override: [150, 180, 210, 250, 300]            },
            {                 skill_id: "movement_flat_cavalry",                 scaling_override: [1, 1, 2, 2, 3]             },
            {                 skill_id: "initiative_flat_cavalry",                 scaling_override: [5, 7, 9, 11, 14]             },
            {                 skill_id: "xp_gain_percentage_all",                 scaling_override: [10, 12, 15, 20, 25]             }
        ]
    },

    "g_ballista": {
        id: "g_ballista",         name: "Marco Balista",         title: "El Artillero",         rarity: "Raro", 
        sprite: "images/comandantes/g_ballista.png", // Necesitarás crear esta imagen
        description: "Un ingeniero obsesionado con la trayectoria y el alcance, capaz de hacer que sus máquinas de asedio golpeen donde nadie más puede.",
        skills: [
            {                 skill_id: "range_flat_ranged",                 scaling_override: [1, 1, 1, 1, 2]            },
            {                 skill_id: "attack_flat_all",                 scaling_override: [200, 250, 300, 350, 400]            },
            {                 skill_id: "attack_percentage_ranged",                 scaling_override: [10, 12, 14, 16, 20]             },
            {                 skill_id: "defense_flat_ranged",                 scaling_override: [15, 20, 25, 30, 40]             }
        ]
    },

    "g_celer": {
        id: "g_celer",         name: "Cayo Celer",         title: "El Presto",         rarity: "Raro", 
        sprite: "images/comandantes/g_celer.png", // Necesitarás crear esta imagen
        description: "Un comandante que valora la velocidad por encima de todo. Sus tropas siempre cargan primero.",
        skills: [
            { skill_id: "initiative_flat_all",                 scaling_override: [5, 7, 9, 12, 15]             },
            { skill_id: "attack_flat_all",                 scaling_override: [200, 240, 280, 330, 400]            },
            { skill_id: "attack_percentage_cavalry",                 scaling_override: [8, 10, 12, 15, 20]             },
            { skill_id: "movement_flat_all",                 scaling_override: [1, 1, 1, 2, 2]             }
        ]
    },

    // En commanders.js

    "g_caius_admin": {
        id: "g_caius_admin",         name: "Cayo Administrador",         title: "El Intendente",         rarity: "Raro", 
        sprite: "images/comandantes/g_caius_admin.png", // Necesitarás crear esta imagen
        description: "Un logista brillante que sabe que las batallas se ganan tanto con la espada como con el grano y el oro. Sus divisiones son un ejemplo de eficiencia y disciplina.",
        skills: [
            {  // <<== HABILIDAD CLAVE 1 PARA LA PRUEBA (MORAL) ==>>
                skill_id: "morale_flat_all",                 scaling_override: [10, 15, 20, 25, 30] // Aumenta la moral máxima
            },
            { // <<== HABILIDAD CLAVE 2 PARA LA PRUEBA (CONSUMO) ==>>
              skill_id: "upkeep_reduction_percentage_all", scaling_override: [10, 15, 20, 25, 35] // Reduce el mantenimiento en %            
            },
            {                 skill_id: "defense_flat_all", 
                scaling_override: [100, 120, 140, 160, 200]
            },
            { skill_id: "xp_gain_percentage_all",                 scaling_override: [5, 7, 9, 12, 15]             }
        ]
    },

    "g_marcus_austerus": {
        id: "g_marcus_austerus", 
        name: "Marco el Austero", 
        title: "El Logista", 
        rarity: "Común", 
        sprite: "images/comandantes/g_marcus_austerus.png", // Necesitarás crear esta imagen
        description: "Un intendente experto cuya principal habilidad es optimizar las líneas de suministro y reducir los costes de mantenimiento del ejército.",
        skills: [
            {                 // <<== HABILIDAD CLAVE PARA LA PRUEBA ==>>
                skill_id: "upkeep_reduction_percentage_all",                 scaling_override: [10, 30, 40, 50, 60] // Reduce el mantenimiento en %
            },
            { 
                skill_id: "defense_flat_all",                 scaling_override: [80, 100, 120, 140, 160] // Habilidad defensiva modesta
            },
            { 
                skill_id: "health_flat_all",                 scaling_override: [20, 25, 30, 35, 40]
            },
            { 
                skill_id: "morale_flat_all",                 scaling_override: [5, 6, 7, 8, 10] // Pequeño bonus de moral
            }
        ]
    },

    "g_corocotta": {
        id: "g_corocotta", name: "Corocotta", rarity: "Raro", sprite: "images/comandantes/g_corocotta.png", description: "Caudillo cántabro especialista en incursiones rápidas.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [180, 220, 260, 300, 350]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [8, 10, 12, 15, 18] },
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 1, 2, 2, 2]},
            { skill_id: "health_percentage_all", scaling_override: [3, 4, 5, 6, 7] }
        ]
    },
    "g_escipion_africano": {
        id: "g_escipion_africano", name: "Escipión el Africano", rarity: "Legendario", sprite: "images/comandantes/g_escipion_africano.png", description: "Genio táctico que se adapta a cualquier enemigo.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [350, 450, 550, 650, 750]},
            { skill_id: "attack_percentage_all", scaling_override: [8, 9, 10, 12, 15] },
            { skill_id: "defense_percentage_all", scaling_override: [8, 9, 10, 12, 15] },
            { skill_id: "morale_flat_all", scaling_override: [10, 12, 15, 18, 20] }
        ]
    },
    "g_Lucio_Hirtuleyo": {
        id: "g_Lucio_Hirtuleyo", name: "Lucio Hirtuleyo", rarity: "Épico", sprite: "images/comandantes/g_Lucio_Hirtuleyo.png", description: "General romano proscrito lear a Sertorio, maestro de la guerra irregular.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [20, 25, 30, 35, 40]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "defense_percentage_infantry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "xp_gain_percentage_all", scaling_override: [10, 15, 20, 25, 30] }
        ]
    },
    "g_ataulfo": {
        id: "g_ataulfo", name: "Ataúlfo", rarity: "Común", sprite: "images/comandantes/g_ataulfo.png", description: "Rey visigodo que intentó fusionar la fuerza goda con la cultura romana.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [150, 200, 250, 300, 350]},
            { skill_id: "attack_flat_cavalry", scaling_override: [8, 10, 12, 15, 18] },
            { skill_id: "defense_flat_infantry", scaling_override: [8, 10, 12, 15, 18] },
            { skill_id: "health_percentage_all", scaling_override: [2, 3, 4, 5, 6] }
        ]
    },
    "g_leovigildo": {
        id: "g_leovigildo", name: "Leovigildo", rarity: "Raro", sprite: "images/comandantes/g_leovigildo.png", description: "Restaurador del reino visigodo, un rey conquistador.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [200, 250, 300, 350, 400]},
            { skill_id: "attack_percentage_ranged", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "defense_flat_all", scaling_override: [15, 20, 25, 30, 40] },
            { skill_id: "attack_flat_infantry", scaling_override: [8, 10, 12, 14, 16] }
        ]
    },
    "g_don_rodrigo": {
        id: "g_don_rodrigo", name: "Don Rodrigo", rarity: "Épico", sprite: "images/comandantes/g_don_rodrigo.png", description: "El último rey visigodo, valiente pero traicionado.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [300, 400, 500, 600, 700]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [15, 18, 21, 25, 30] },
            { skill_id: "initiative_flat_cavalry", scaling_override: [5, 6, 7, 8, 10] },
            { skill_id: "defense_percentage_cavalry", scaling_override: [-10, -10, -10, -10, -10] }
        ]
    },
    "g_tariq_ibn_ziyad": {
        id: "g_tariq_ibn_ziyad", name: "Táriq ibn Ziyad", rarity: "Épico", sprite: "images/comandantes/g_tariq_ibn_ziyad.png", description: "Audaz conquistador que quema sus naves y solo mira hacia adelante.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [280, 340, 400, 480, 550]},
            { skill_id: "attack_percentage_all", scaling_override: [8, 10, 12, 14, 16] },
            { skill_id: "movement_flat_all", scaling_override: [1, 2, 2, 2, 3] },
            { skill_id: "morale_flat_all", scaling_override: [10, 12, 15, 18, 20] }
        ]
    },
    "g_musa_ibn_nusair": {
        id: "g_musa_ibn_nusair", name: "Musa ibn Nusair", rarity: "Raro", sprite: "images/comandantes/g_musa_ibn_nusair.png", description: "Gran administrador y pacificador de territorios.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [25, 30, 35, 40, 45]},
            { skill_id: "upkeep_reduction_percentage_all", scaling_override: [10, 15, 20, 25, 30] },
            { skill_id: "xp_gain_percentage_all", scaling_override: [10, 15, 20, 25, 30] },
            { skill_id: "fragment_drop_chance_percentage", scaling_override: [5, 6, 7, 8, 10] }
        ]
    },
    "g_don_pelayo": {
        id: "g_don_pelayo", name: "Don Pelayo", rarity: "Épico", sprite: "images/comandantes/g_don_pelayo.png", description: "Iniciador de la Reconquista y maestro de la defensa tenaz.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [30, 38, 46, 54, 65]},
            { skill_id: "defense_percentage_infantry", scaling_override: [20, 24, 28, 32, 40], filters: { location: 'own_territory' } },
            { skill_id: "health_percentage_infantry", scaling_override: [8, 10, 12, 15, 20] },
            { skill_id: "attack_flat_infantry", scaling_override: [15, 20, 25, 30, 40] }
        ]
    },
    "g_abderraman_i": {
        id: "g_abderraman_i", name: "Abderramán I", rarity: "Épico", sprite: "images/comandantes/g_abderraman_i.png", description: "Fundador del Emirato de Córdoba, un superviviente nato.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [200, 250, 300, 350, 400]},
            { skill_id: "defense_percentage_cavalry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "attack_percentage_cavalry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 1, 2, 2, 3] }
        ]
    },
    "g_almanzor": {
        id: "g_almanzor", name: "Almanzor", rarity: "Legendario", sprite: "images/comandantes/g_almanzor.png", description: "El terror de los reinos cristianos, un torbellino de fuego y acero.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [40, 50, 60, 70, 80]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [20, 24, 28, 32, 40], filters: { location: 'enemy_territory' } },
            { skill_id: "initiative_flat_cavalry", scaling_override: [5, 7, 9, 12, 15] },
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 2, 3, 3, 4] }
        ]
    },
    "g_el_cid": {
        id: "g_el_cid", name: "Rodrigo Díaz de Vivar", rarity: "Legendario", sprite: "images/comandantes/g_el_cid.png", description: "Maestro de la guerra que sirve a quien le place.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [450, 550, 650, 750, 900]},
            { skill_id: "attack_percentage_all", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "defense_percentage_all", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "xp_gain_percentage_all", scaling_override: [15, 20, 25, 30, 35] }
        ]
    },
    "g_yusuf_ibn_tasufin": {
        id: "g_yusuf_ibn_tasufin", name: "Yusuf ibn Tasufin", rarity: "Épico", sprite: "images/comandantes/g_yusuf_ibn_tasufin.png", description: "Líder almorávide, un monje guerrero de fe inquebrantable.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [250, 300, 350, 400, 500]},
            { skill_id: "defense_percentage_infantry", scaling_override: [15, 18, 21, 25, 30] },
            { skill_id: "attack_percentage_infantry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "morale_flat_all", scaling_override: [10, 15, 20, 25, 30] }
        ]
    },
    "g_alfonso_i_batallador": {
        id: "g_alfonso_i_batallador", name: "Alfonso I", rarity: "Épico", sprite: "images/comandantes/g_alfonso_i_batallador.png", description: "Un rey que pasó su vida en campaña, incansable en la batalla.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [280, 340, 400, 480, 550]},
            { skill_id: "attack_percentage_ranged", scaling_override: [10, 12, 15, 18, 25] },
            { skill_id: "attack_flat_infantry", scaling_override: [15, 18, 21, 25, 30] },
            { skill_id: "health_percentage_all", scaling_override: [4, 5, 6, 7, 8] }
        ]
    },
    "g_alvar_fanez": {
        id: "g_alvar_fanez", name: "Álvar Fáñez", rarity: "Raro", sprite: "images/comandantes/g_alvar_fanez.png", description: "El leal y veloz lugarteniente de El Cid.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [200, 240, 280, 320, 380]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [10, 12, 14, 16, 18] },
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 2, 2, 3, 3] },
            { skill_id: "initiative_flat_cavalry", scaling_override: [5, 6, 7, 8, 10] }
        ]
    },
    "g_jaime_i": {
        id: "g_jaime_i", name: "Jaime I", rarity: "Legendario", sprite: "images/comandantes/g_jaime_i.png", description: "El Conquistador de Mallorca y Valencia, un estratega brillante.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [350, 420, 500, 600, 700]},
            { skill_id: "attack_percentage_ranged", scaling_override: [15, 20, 25, 30, 35] },
            { skill_id: "attack_percentage_naval", scaling_override: [15, 20, 25, 30, 35] },
            { skill_id: "xp_gain_percentage_all", scaling_override: [10, 15, 20, 25, 30] }
        ]
    },
    "g_fernando_iii": {
        id: "g_fernando_iii", name: "Fernando III", rarity: "Épico", sprite: "images/comandantes/g_fernando_iii.png", description: "Unificador de reinos, su piedad inspira a sus ejércitos.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [300, 350, 400, 450, 500]},
            { skill_id: "defense_percentage_all", scaling_override: [8, 10, 12, 14, 16] },
            { skill_id: "morale_flat_all", scaling_override: [15, 20, 25, 30, 40] },
            { skill_id: "health_flat_infantry", scaling_override: [25, 30, 35, 40, 50] }
        ]
    },
    "g_pelayo_perez_correa": {
        id: "g_pelayo_perez_correa", name: "Pelayo Pérez Correa", rarity: "Raro", sprite: "images/comandantes/g_pelayo_perez_correa.png", description: "Maestre de la Orden de Santiago, tan tenaz que ni el sol se le resiste.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [180, 210, 250, 300, 350]},
            { skill_id: "health_percentage_cavalry", scaling_override: [10, 12, 14, 17, 20] },
            { skill_id: "attack_flat_cavalry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "defense_percentage_cavalry", scaling_override: [8, 10, 12, 15, 18] }
        ]
    },
    "g_alonso_perez_de_guzman": {
        id: "g_alonso_perez_de_guzman", name: "Guzmán el Bueno", rarity: "Épico", sprite: "images/comandantes/g_alonso_perez_de_guzman.png", description: "Símbolo de la lealtad inquebrantable, prefiere la muerte a la deshonra.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [350, 420, 500, 600, 700]},
            { skill_id: "defense_percentage_infantry", scaling_override: [20, 23, 26, 30, 35], filters: { location: 'own_territory' } },
            { skill_id: "morale_flat_all", scaling_override: [20, 25, 30, 40, 50] },
            { skill_id: "health_flat_infantry", scaling_override: [30, 35, 40, 50, 60] }
        ]
    },
    "g_roger_de_flor": {
        id: "g_roger_de_flor", name: "Roger de Flor", rarity: "Legendario", sprite: "images/comandantes/g_roger_de_flor.png", description: "Líder de una fuerza de choque temida. Su lema es 'Desperta Ferro!'.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [380, 460, 540, 620, 750]},
            { skill_id: "attack_percentage_infantry", scaling_override: [20, 22, 25, 28, 32], filters: { location: 'enemy_territory' }},
            { skill_id: "attack_flat_infantry", scaling_override: [15, 20, 25, 30, 40] },
            { skill_id: "initiative_flat_all", scaling_override: [5, 6, 7, 8, 10] }
        ]
    },
    "g_bertran_du_guesclin": {
        id: "g_bertran_du_guesclin", name: "Bertrán du Guesclin", rarity: "Épico", sprite: "images/comandantes/g_bertran_du_guesclin.png", description: "Maestro de la guerra de desgaste y la victoria sin batalla.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [250, 300, 380, 450, 550]},
            { skill_id: "defense_percentage_all", scaling_override: [8, 10, 12, 14, 16] },
            { skill_id: "upkeep_reduction_percentage_all", scaling_override: [15, 20, 25, 30, 40] },
            { skill_id: "health_percentage_infantry", scaling_override: [5, 7, 9, 12, 15] }
        ]
    },
    "g_juan_pacheco": {
        id: "g_juan_pacheco", name: "Juan Pacheco", rarity: "Raro", sprite: "images/comandantes/g_juan_pacheco.png", description: "Maestro de la intriga y la conspiración palaciega.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [120, 150, 180, 210, 250]},
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 2, 2, 3, 3] },
            { skill_id: "initiative_flat_cavalry", scaling_override: [5, 7, 9, 11, 13] },
            { skill_id: "fragment_drop_chance_percentage", scaling_override: [5, 7, 10, 12, 15] }
        ]
    },
    "g_marques_de_cadiz": {
        id: "g_marques_de_cadiz", name: "Rodrigo Ponce de León", rarity: "Raro", sprite: "images/comandantes/g_marques_de_cadiz.png", description: "Un noble audaz, famoso por sus rápidas incursiones.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [200, 240, 280, 330, 400]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [8, 10, 12, 14, 16] },
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 1, 2, 2, 3] },
            { skill_id: "defense_flat_cavalry", scaling_override: [10, 12, 14, 16, 20] }
        ]
    },
    "g_el_zagal": {
        id: "g_el_zagal", name: "Muhammad XIII", rarity: "Épico", sprite: "images/comandantes/g_el_zagal.png", description: "El Valiente, defensor incansable de Granada hasta el final.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [300, 360, 420, 500, 600]},
            { skill_id: "defense_percentage_infantry", scaling_override: [10, 12, 15, 18, 20] },
            { skill_id: "attack_flat_infantry", scaling_override: [10, 12, 15, 18, 20] },
            { skill_id: "morale_flat_all", scaling_override: [10, 15, 20, 25, 30] }
        ]
    },
    "g_gonzalo_fernandez_de_cordoba": {
        id: "g_gonzalo_fernandez_de_cordoba", name: "El Gran Capitán", rarity: "Legendario", sprite: "images/comandantes/g_gonzalo_fernandez_de_cordoba.png", description: "El padre de la guerra moderna, un genio táctico.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [380, 450, 520, 600, 700]},
            { skill_id: "attack_percentage_infantry", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "defense_percentage_ranged", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "initiative_flat_all", scaling_override: [5, 7, 9, 12, 15] }
        ]
    },
    "g_pedro_navarro": {
        id: "g_pedro_navarro", name: "Pedro Navarro", rarity: "Épico", sprite: "images/comandantes/g_pedro_navarro.png", description: "Ingeniero militar pionero en el uso de la pólvora para el asedio.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [320, 380, 450, 530, 620]},
            { skill_id: "attack_percentage_ranged", scaling_override: [15, 18, 21, 25, 30] },
            { skill_id: "range_flat_ranged", scaling_override: [0, 0, 1, 1, 1] },
            { skill_id: "defense_flat_ranged", scaling_override: [15, 20, 25, 30, 40] }
        ]
    },
    "g_diego_garcia_de_paredes": {
        id: "g_diego_garcia_de_paredes", name: "Diego G. de Paredes", rarity: "Raro", sprite: "images/comandantes/g_diego_garcia_de_paredes.png", description: "El Sansón de Extremadura, famoso por su increíble fuerza física.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [220, 260, 310, 370, 430]},
            { skill_id: "attack_flat_infantry", scaling_override: [20, 25, 30, 35, 40] },
            { skill_id: "health_flat_infantry", scaling_override: [20, 25, 30, 35, 40] },
            { skill_id: "defense_flat_infantry", scaling_override: [10, 12, 14, 16, 20] }
        ]
    },
    "g_antonio_de_leyva": {
        id: "g_antonio_de_leyva", name: "Antonio de Leyva", rarity: "Legendario", sprite: "images/comandantes/g_antonio_de_leyva.png", description: "Veterano de innumerables batallas, su voluntad de hierro es legendaria.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [400, 480, 560, 650, 750]},
            { skill_id: "health_percentage_all", scaling_override: [5, 7, 9, 12, 15]},
            { skill_id: "defense_percentage_all", scaling_override: [8, 10, 12, 15, 20]},
            { skill_id: "morale_flat_all", scaling_override: [15, 18, 21, 25, 30] }
        ]
    },
    "g_marques_de_pescara": {
        id: "g_marques_de_pescara", name: "Marqués de Pescara", rarity: "Épico", sprite: "images/comandantes/g_marques_de_pescara.png", description: "Táctico innovador y un líder adorado por sus hombres.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [180, 220, 260, 300, 350]},
            { skill_id: "xp_gain_percentage_all", scaling_override: [15, 20, 25, 30, 35]},
            { skill_id: "attack_percentage_ranged", scaling_override: [10, 12, 14, 16, 20]},
            { skill_id: "initiative_flat_all", scaling_override: [4, 5, 6, 7, 8] }
        ]
    },
    "g_duque_de_alba": {
        id: "g_duque_de_alba", name: "Duque de Alba", rarity: "Legendario", sprite: "images/comandantes/g_duque_de_alba.png", description: "El Duque de Hierro. Su disciplina es legendaria, y sus ejércitos, un muro infranqueable.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [350, 420, 500, 600, 700]},
            { skill_id: "defense_percentage_infantry", scaling_override: [20, 25, 30, 35, 40], filters: { location: 'own_territory' } },
            { skill_id: "defense_flat_infantry", scaling_override: [15, 20, 25, 30, 40] },
            { skill_id: "attack_flat_ranged", scaling_override: [10, 12, 15, 18, 20] }
        ]
    },
    "g_juan_de_austria": {
        id: "g_juan_de_austria", name: "Don Juan de Austria", rarity: "Legendario", sprite: "images/comandantes/g_juan_de_austria.png", description: "Héroe de Lepanto, destinado a la gloria en las más grandes batallas navales.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [350, 420, 500, 600, 700]},
            { skill_id: "attack_percentage_naval", scaling_override: [20, 25, 30, 35, 45], filters: { location: 'enemy_territory' } },
            { skill_id: "xp_gain_percentage_all", scaling_override: [10, 12, 14, 16, 20] },
            { skill_id: "initiative_flat_naval", scaling_override: [5, 7, 9, 12, 15] }
        ]
    },
    "g_alvaro_de_bazan": {
        id: "g_alvaro_de_bazan", name: "Álvaro de Bazán", rarity: "Legendario", sprite: "images/comandantes/g_alvaro_de_bazan.png", description: "El marino nunca derrotado, un almirante legendario.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [380, 450, 530, 620, 720]},
            { skill_id: "defense_percentage_naval", scaling_override: [20, 25, 30, 35, 45], filters: { location: 'own_territory' } },
            { skill_id: "attack_flat_naval", scaling_override: [15, 20, 25, 30, 40]},
            { skill_id: "movement_flat_naval", scaling_override: [1, 1, 1, 2, 2] }
        ]
    },
    "g_alejandro_farnesio": {
        id: "g_alejandro_farnesio", name: "Alejandro Farnesio", rarity: "Legendario", sprite: "images/comandantes/g_alejandro_farnesio.png", description: "El Rayo de la Guerra. Genio de la maniobra y el asedio.",
        skills: [
            { skill_id: "attack_flat_all", scaling_override: [360, 430, 510, 600, 700]},
            { skill_id: "movement_flat_cavalry", scaling_override: [1, 2, 3, 3, 4]},
            { skill_id: "attack_percentage_cavalry", scaling_override: [10, 12, 15, 18, 20]},
            { skill_id: "attack_percentage_ranged", scaling_override: [10, 12, 15, 18, 20]}
        ]
    },
    "g_ambrosio_spinola": {
        id: "g_ambrosio_spinola", name: "Ambrosio Spínola", rarity: "Épico", sprite: "images/comandantes/g_ambrosio_spinola.png", description: "Un banquero genovés convertido en general, maestro de la logística.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [200, 250, 300, 350, 400]},
            { skill_id: "upkeep_reduction_percentage_all", scaling_override: [15, 20, 25, 30, 35] },
            { skill_id: "defense_flat_all", scaling_override: [15, 20, 25, 30, 35] },
            { skill_id: "health_flat_all", scaling_override: [15, 20, 25, 30, 35] }
        ]
    },
    "g_julian_romero": {
        id: "g_julian_romero", name: "Julián Romero", rarity: "Épico", sprite: "images/comandantes/g_julian_romero.png", description: "El Manco de Flandes. Un soldado de fortuna indomable.",
        skills: [
            { skill_id: "health_flat_all", scaling_override: [150, 180, 210, 250, 300]},
            { skill_id: "attack_flat_infantry", scaling_override: [15, 20, 25, 30, 35] },
            { skill_id: "health_percentage_infantry", scaling_override: [10, 12, 14, 17, 20]},
            { skill_id: "defense_percentage_infantry", scaling_override: [10, 12, 14, 17, 20]}
        ]
    },
    "g_juan_del_aguila": {
        id: "g_juan_del_aguila", name: "Juan del Águila", rarity: "Raro", sprite: "images/comandantes/g_juan_del_aguila.png", description: "Un veterano de los Tercios, experto en campañas expedicionarias.",
        skills: [
            { skill_id: "defense_flat_all", scaling_override: [180, 220, 260, 300, 350]},
            { skill_id: "attack_percentage_infantry", scaling_override: [10, 12, 15, 18, 22], filters: { location: 'enemy_territory' } },
            { skill_id: "defense_percentage_infantry", scaling_override: [8, 9, 10, 12, 15] },
            { skill_id: "movement_flat_infantry", scaling_override: [1, 1, 1, 1, 2] }
        ]
    }, 
    "g_sertorius": {
        id: "g_sertorius", name: "Quinto Sertorio", title: "El Rebelde Romano", rarity: "Épico", 
        sprite: "images/comandantes/g_sertorius.png", // Necesitarás crear esta imagen
        description: "General romano proscrito, maestro de la guerra irregular, Un brillante táctico y estratega que entrenó a sus ejércitos hispanos hasta la perfección. Las tropas bajo su mando aprenden el doble de rápido en cada batalla.",
        skills: [
            { 
              // <<== HABILIDAD CLAVE PARA LA PRUEBA (Ganancia de XP) ==>>
              skill_id: "xp_gain_percentage_all", scaling_override: [20, 30, 40, 50, 60]  },
            { skill_id: "attack_flat_all", scaling_override: [25, 30, 35, 40, 50] },
            { skill_id: "defense_percentage_infantry", scaling_override: [12, 14, 16, 18, 20] },
            { skill_id: "movement_flat_infantry", scaling_override: [1, 1, 1, 1, 2] }
        ]
    },

    "g_isidore": {
        id: "g_isidore", name: "Isidoro de Sevilla", title: "El Erudito", rarity: "Raro", 
        sprite: "images/comandantes/g_isidore.png", // Necesitarás crear esta imagen
        description: "Un sabio cuyo conocimiento abarca todas las disciplinas. Se dice que sus seguidores encuentran inspiración y conocimiento escrito en los lugares más insospechados.",
        skills: [
            { // <<== HABILIDAD CLAVE PARA LA PRUEBA (Libros de XP) ==>>
                skill_id: "book_drop_chance_percentage", scaling_override: [10, 15, 20, 25, 30] 
            },
            { skill_id: "defense_flat_all", scaling_override: [200, 240, 280, 320, 380] },
            { skill_id: "upkeep_reduction_percentage_all", scaling_override: [8, 10, 12, 14, 16] },
            { skill_id: "morale_flat_all", scaling_override: [10, 12, 14, 16, 20]}
        ]
    },

    "g_orosius": {
        id: "g_orosius", name: "Paulo Orosio", title: "El Historiador", 
        rarity: "Raro", sprite: "images/comandantes/g_orosius.png", // Necesitarás crear esta imagen
        description: "Un cronista de grandes hazañas que posee una habilidad única para descubrir las leyendas de otros héroes en los relatos de la guerra.",
        skills: [
            { 
                // <<== HABILIDAD CLAVE PARA LA PRUEBA (Fragmentos de Héroe) ==>>
                skill_id: "fragment_drop_chance_percentage", scaling_override: [25, 40, 60, 80, 100] // Un gran aumento en la probabilidad
            },
            { skill_id: "health_flat_all", scaling_override: [10, 12, 14, 16, 18]            },
            { skill_id: "xp_gain_percentage_all", scaling_override: [5, 6, 7, 8, 10]    },
            { skill_id: "book_drop_chance_percentage",  scaling_override: [5, 6, 7, 8, 10]}
        ]
    },

};