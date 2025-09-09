// commanders.js
// Base de datos completa para los Generales, con Rareza, Habilidades y Roles.

const COMMANDERS = {

    // === COMUNES (Disponibles al principio, fiables y fáciles de mejorar) ===

    "g_fabius": {
        id: "g_fabius", name: "Fabio Máximo", title: "El Cunctátor", rarity: "Común", sprite: "🏛️",
        description: "Un maestro de la defensa y la guerra de desgaste. Sus tropas de infantería son un muro inexpugnable.",
        activeSkill: { name: "Formación de Testudo", description: "Otorga a las tropas un escudo que absorbe una cantidad moderada de daño (Factor 800) durante 3 segundos." },
        passiveSkills: [
            { name: "Muro de Escudos", description: "Aumenta la defensa de la Infantería en un 10%." },
            { name: "Guerra de Desgaste", description: "Reduce la pérdida de moral de esta división en un 15%." }
        ],
        roles: "Defensa, Tanque, Infantería"
    },
    "g_istolacio": {
        id: "g_istolacio", name: "Istolacio", title: "El Ariete", rarity: "Común", sprite: "🐗",
        description: "General celta cuya carga frontal es capaz de romper cualquier línea defensiva por pura fuerza bruta.",
        activeSkill: { name: "Carga de los Túrdulos", description: "Ordena una carga inmediata, infligiendo daño directo (Factor 600) a un solo objetivo." },
        passiveSkills: [
            { name: "Fuerza Bruta", description: "Aumenta el ataque de la Infantería en un 10%." },
            { name: "Sin Miedo", description: "Cuando es atacado, tiene un 10% de probabilidad de aumentar su propio ataque en un 10% durante 3 segundos." }
        ],
        roles: "Infantería, Ataque, Daño Directo"
    },
    "g_ataulfo": {
        id: "g_ataulfo", name: "Ataúlfo", title: "El Unificador", rarity: "Común", sprite: "👑",
        description: "Rey visigodo que intentó fusionar la fuerza goda con la cultura romana, creando un ejército híbrido.",
        activeSkill: { name: "Pacto de Sangre", description: "Otorga un pequeño escudo que absorbe daño (Factor 600) a sus tropas durante 3 segundos." },
        passiveSkills: [
            { name: "Comitatus", description: "Aumenta el ataque de la Caballería un 5%." },
            { name: "Fusión Cultural", description: "Aumenta la defensa de la Infantería un 5%." }
        ],
        roles: "Apoyo, Liderazgo"
    },
    
    // === RAROS (Especializados y con mayor potencial) ===

    "g_indibil": {
        id: "g_indibil", name: "Indíbil", title: "El Insurgente", rarity: "Raro", sprite: "⛰️",
        description: "Un maestro de la guerra de guerrillas que utiliza el terreno para diezmar a enemigos superiores.",
        activeSkill: { name: "Emboscada Ilergete", description: "Inflige daño directo (Factor 700) a un solo objetivo y reduce su velocidad de marcha un 20% durante 2 segundos." },
        passiveSkills: [
            { name: "Guerra de Montaña", description: "Aumenta el ataque de la Infantería en un 10% y la defensa en un 10% al luchar en Colinas o Bosques." },
            { name: "Ataque Sorpresa", description: "Otorga un 10% más de daño de habilidad al atacar." }
        ],
        roles: "Guerrilla, Control, Infantería"
    },
    "g_viriato": {
        id: "g_viriato", name: "Viriato", title: "El Pastor", rarity: "Raro", sprite: "🐑",
        description: "La pesadilla de Roma. Un líder indomable que convierte a hombres comunes en guerreros de élite.",
        activeSkill: { name: "Furia Lusitana", description: "Otorga a sus tropas un 30% de aumento de ataque, pero reduce su defensa en un 10% durante 4 segundos." },
        passiveSkills: [
            { name: "Invencible", description: "Cuando la fuerza de la división cae por debajo del 50%, aumenta su defensa en un 20%." },
            { name: "Tierra Quemada", description: "Aumenta la velocidad de marcha de la Infantería en 1." }
        ],
        roles: "Infantería, Ataque, Riesgo/Recompensa"
    },
    "g_corocotta": {
        id: "g_corocotta", name: "Corocotta", title: "El Insobornable", rarity: "Raro", sprite: "💰",
        description: "Caudillo cántabro audaz y especialista en incursiones rápidas para obtener botín y gloria.",
        activeSkill: { name: "Cobrar la Recompensa", description: "Inflige daño directo (Factor 900) a un solo objetivo." },
        passiveSkills: [
            { name: "Orgullo Cántabro", description: "Las tropas que lidera ganan un 10% más de ataque cuando luchan contra un enemigo con más regimientos." },
            { name: "Guerra de Frontera", description: "Aumenta el movimiento de la Caballería en 1." }
        ],
        roles: "Saqueo, Ataque, Caballería"
    },
    "g_quinto_sertorio": {
        id: "g_quinto_sertorio", name: "Quinto Sertorio", title: "El Rebelde", rarity: "Raro", sprite: "🦌",
        description: "General romano proscrito, un maestro de la guerra irregular que conoce todos los secretos del terreno.",
        activeSkill: { name: "Consejo de la Cierva Blanca", description: "Aumenta la velocidad de marcha de sus propias tropas en un 15% y otorga un pequeño factor de curación (Factor 200) durante 3 segundos." },
        passiveSkills: [
            { name: "Guerra Sertoriana", description: "Reduce el daño de contraataque recibido en un 10%." },
            { name: "Lealtad Hispana", description: "Aumenta la ganancia de experiencia de esta división en un 10%." }
        ],
        roles: "Control, Movilidad, Versátil"
    },
    "g_pelayo_perez_correa": {
        id: "g_pelayo_perez_correa", name: "Pelayo Pérez Correa", title: "El Maestro", rarity: "Raro", sprite: "☀️",
        description: "Maestre de la Orden de Santiago, tan tenaz que ni el sol se le resiste.",
        activeSkill: { name: "¡Santiago y Cierra, España!", description: "Aumenta el ataque de la Caballería un 20% durante 4 segundos." },
        passiveSkills: [
            { name: "Maestre de Santiago", description: "Aumenta la salud de la Caballería un 15%." },
            { name: "No detengas el Sol", description: "Las tropas bajo su mando infligen un 5% más de daño a ejércitos con menos regimientos." }
        ],
        roles: "Caballería, Mejora (Buff)"
    },

    // === ÉPICOS (Poderosos, con habilidades que definen estrategias) ===

    "g_amilcar_barca": {
        id: "g_amilcar_barca", name: "Amílcar Barca", title: "El León", rarity: "Épico", sprite: "🦁",
        description: "Estratega implacable y experto en logística que mantiene a su ejército siempre listo para la batalla.",
        activeSkill: { name: "Juramento de Odio", description: "Aumenta el ataque de todas sus tropas en un 30% y su velocidad de marcha en un 20% durante 4 segundos." },
        passiveSkills: [
            { name: "Líneas de Suministro Púnicas", description: "Reduce el consumo de comida de la división en un 25%." },
            { name: "Veteranos de África", description: "Aumenta la salud de la Infantería y la Caballería en un 10%." }
        ],
        roles: "Liderazgo, Mejora (Buff), Versátil"
    },
    "g_escipion_africano": {
        id: "g_escipion_africano", name: "Escipión el Africano", title: "El Estratega", rarity: "Épico", sprite: "🦅",
        description: "Un genio táctico que se adapta a cualquier enemigo, convirtiendo sus fortalezas en debilidades.",
        activeSkill: { name: "Táctica Envolvente", description: "Inflige un gran daño a un solo objetivo (Factor 1400) y le aplica 'Reducción de Defensa' del 25% durante 3 segundos." },
        passiveSkills: [
            { name: "Genio Militar", description: "Aumenta el daño de todas las habilidades en un 15%." },
            { name: "Legiones Disciplinadas", description: "Aumenta la defensa de todas las tropas en un 10%." }
        ],
        roles: "Habilidad, Debuff, Liderazgo"
    },
    "g_don_rodrigo": {
        id: "g_don_rodrigo", name: "Don Rodrigo", title: "El Último Godo", rarity: "Épico", sprite: "💔",
        description: "El último rey visigodo, cuya valentía en la batalla no pudo compensar las traiciones internas.",
        activeSkill: { name: "Carga Final", description: "Inflige un daño masivo (Factor 1700) a un solo objetivo. Esta habilidad inflige más daño cuantas menos unidades le queden." },
        passiveSkills: [
            { name: "Por Hispania", description: "Aumenta el ataque de la Caballería en un 25%." },
            { name: "El Peso de la Traición", description: "Aumenta el daño recibido de los ataques normales en un 7%." }
        ],
        roles: "Caballería, Daño Directo, Riesgo/Recompensa"
    },
    "g_tariq_ibn_ziyad": {
        id: "g_tariq_ibn_ziyad", name: "Táriq ibn Ziyad", title: "El Conquistador", rarity: "Épico", sprite: "🌙",
        description: "Su audacia le llevó a conquistar un reino. Un general que quema sus naves y solo mira hacia adelante.",
        activeSkill: { name: "Quemar las Naves", description: "Aumenta el ataque de todas las tropas un 25% y la velocidad de marcha un 20% durante 5 segundos." },
        passiveSkills: [
            { name: "Jinete Bereber", description: "Aumenta la salud de la Caballería en un 20%." },
            { name: "Paso del Estrecho", description: "Aumenta la velocidad de movimiento de toda la división en 1." }
        ],
        roles: "Caballería, Ataque, Movilidad"
    },
    "g_almanzor": {
        id: "g_almanzor", name: "Almanzor", title: "El Victorioso", rarity: "Épico", sprite: "🔥",
        description: "El terror de los reinos cristianos. Sus campañas son un torbellino de fuego y acero que no deja nada a su paso.",
        activeSkill: { name: "Aceifa Fulminante", description: "Inflige daño en un área de abanico frente a él (Factor 1200) a hasta 3 objetivos." },
        passiveSkills: [
            { name: "El Martillo", description: "Aumenta el ataque de la Caballería en un 20%." },
            { name: "Botín de Guerra", description: "Otorga Oro adicional al derrotar unidades enemigas." }
        ],
        roles: "Caballería, Daño en Área, Saqueo"
    },
    "g_fernando_iii": {
        id: "g_fernando_iii", name: "Fernando III", title: "El Santo", rarity: "Épico", sprite: "⚜️",
        description: "Unificador de reinos y conquistador piadoso, su fe inquebrantable inspira a sus ejércitos.",
        activeSkill: { name: "Bendición Divina", description: "Cura una porción de las unidades levemente heridas en su ejército (Factor de curación 1100)." },
        passiveSkills: [
            { name: "Rey de Tres Culturas", description: "Aumenta la defensa de la Infantería en un 15% y la salud de los Arqueros en un 15%." },
            { name: "Aura de Santidad", description: "Otorga un 5% de reducción de daño a las divisiones aliadas adyacentes." }
        ],
        roles: "Apoyo, Tanque, Infantería"
    },
    "g_roger_de_flor": {
        id: "g_roger_de_flor", name: "Roger de Flor", title: "El Almogávar", rarity: "Épico", sprite: "🔪",
        description: "Líder de una fuerza de choque temida en todo el Mediterráneo. Su lema es 'Desperta Ferro!'.",
        activeSkill: { name: "¡Desperta Ferro!", description: "Inflige daño en un área de abanico (Factor 1000) e inflige un efecto de 'Sangrado' (Daño en el Tiempo, Factor 200) durante 3 segundos." },
        passiveSkills: [
            { name: "Furia Almogávar", description: "Aumenta el ataque de la Infantería en un 25%, pero reduce su salud en un 5%." },
            { name: "Venganza Catalana", description: "El daño de contraataque aumenta un 15%." }
        ],
        roles: "Infantería, Daño en Área, Ataque"
    },

    // === LEGENDARIOS (Cambian el juego, habilidades únicas y poderosas) ===
    
    "g_el_cid": {
        id: "g_el_cid", name: "Rodrigo Díaz de Vivar", title: "El Campeador", rarity: "Legendario", sprite: "🧔",
        description: "Un maestro de la guerra que sirve a quien le place, ganando batallas con ejércitos de todos los credos.",
        activeSkill: { name: "Carga de Tizona", description: "Inflige un daño masivo a un solo objetivo (Factor 1800) y reduce su defensa en un 30% durante 3 segundos." },
        passiveSkills: [
            { name: "Señor de la Guerra", description: "Aumenta el ataque, la defensa y la salud de las divisiones con tropas mixtas (3 o más tipos de unidad) en un 10%." },
            { name: "Ganar Batallas Después de Muerto", description: "Al ser derrotado, los ejércitos aliados adyacentes reciben un aumento del 15% de ataque durante 10 segundos." }
        ],
        roles: "Liderazgo, Habilidad, Versátil"
    },
    "g_gonzalo_fernandez_de_cordoba": {
        id: "g_gonzalo_fernandez_de_cordoba", name: "Gonzalo Fernández de Córdoba", title: "El Gran Capitán", rarity: "Legendario", sprite: "🏆",
        description: "El padre de la guerra moderna. Sus tácticas innovadoras le dieron la victoria contra todo pronóstico.",
        activeSkill: { name: "Revolución Táctica", description: "Otorga a sus tropas un 25% de ataque, 25% de defensa y 15% de velocidad de marcha durante 5 segundos. Un buff muy completo." },
        passiveSkills: [
            { name: "Coronelías", description: "Aumenta el ataque de la Infantería un 15% y el de los Arqueros un 15%." },
            { name: "Genio de Ceriñola", description: "Cuando su división tiene menos del 70% de salud, aumenta el daño de habilidad en un 20%." }
        ],
        roles: "Liderazgo, Mejora (Buff), Versátil"
    },
    "g_duque_de_alba": {
        id: "g_duque_de_alba", name: "Fernando Álvarez de Toledo", title: "El Duque de Hierro", rarity: "Legendario", sprite: "⛓️",
        description: "Un general metódico y severo. Su disciplina es legendaria, y sus ejércitos, un muro infranqueable.",
        activeSkill: { name: "Disciplina de Hierro", description: "Otorga a sus tropas un escudo que absorbe una gran cantidad de daño (Factor 1400) y aumenta el daño de contraataque en un 30% durante 4 segundos." },
        passiveSkills: [
            { name: "Camino Español", description: "Aumenta la defensa de la Infantería un 20% y reduce en 1 el coste de movimiento en Llanuras." },
            { name: "Tribunal de los Tumultos", description: "Reduce el daño de habilidad recibido en un 15%." }
        ],
        roles: "Infantería, Tanque, Defensa"
    },
    "g_alejandro_farnesio": {
        id: "g_alejandro_farnesio", name: "Alejandro Farnesio", title: "El Rayo de la Guerra", rarity: "Legendario", sprite: "⚡",
        description: "Un genio de la maniobra y la diplomacia, capaz de tomar fortalezas y someter provincias enteras.",
        activeSkill: { name: "Asalto Metódico", description: "Aumenta el daño de asedio de todas las tropas en un 50% durante 10 segundos." },
        passiveSkills: [
            { name: "Maestro de Flandes", description: "Aumenta la velocidad de marcha de la Caballería y la Infantería en 1." },
            { name: "Diplomacia y Acero", description: "Reduce el daño recibido de las guarniciones y torres en un 15%." }
        ],
        roles: "Asedio, Movilidad, Liderazgo"
    },
    "g_juan_de_austria": {
        id: "g_juan_de_austria", name: "Don Juan de Austria", title: "El Héroe de Lepanto", rarity: "Legendario", sprite: "✝️",
        description: "Un líder carismático y audaz, destinado a la gloria en las más grandes batallas navales.",
        activeSkill: { name: "Carga de la Liga Santa", description: "Inflige daño directo (Factor 1000) a hasta 5 flotas enemigas en un área y aumenta el ataque de las flotas aliadas cercanas en un 15% durante 5 segundos." },
        passiveSkills: [
            { name: "Comandante Naval", description: "Aumenta el ataque de las unidades navales en un 25%." },
            { name: "Inspiración Cristiana", description: "Aumenta la ganancia de Experiencia de todos los generales aliados en la misma batalla en un 10%." }
        ],
        roles: "Naval, Daño en Área, Apoyo"
    }
};