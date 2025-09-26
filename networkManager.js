// networkManager.js
console.log("networkManager.js CARGADO - Lógica de red lista.");

// <<== CONFIGURACIÓN: Estos valores podrían eventualmente salir a un archivo de configuración ==>>
const PEER_SERVER_CONFIG = {
    host: '0.peerjs.com',
    port: 443,
    path: '/',
    secure: true,
};


const NetworkManager = {
    peer: null,             // Nuestro objeto Peer principal.
    conn: null,             // La conexión de datos con el otro jugador.
    esAnfitrion: false,       // ¿Somos nosotros quienes creamos la sala?
    miId: null,             // Nuestro ID de PeerJS en la red.
    idRemoto: null,       // El ID del otro jugador.
    
    // --- FUNCIONES DE INICIALIZACIÓN Y CALLBACKS ---
    _onConexionAbierta: null,
    _onDatosRecibidos: null,
    _onConexionCerrada: null,

    /**
     * Prepara el manager para ser usado, asignando las funciones que se llamarán en cada evento.
     * @param {function} onConexionAbierta - Se llama cuando la conexión con el otro jugador es exitosa.
     * @param {function} onDatosRecibidos - Se llama cuando se recibe un paquete de datos.
     * @param {function} onConexionCerrada - Se llama cuando la conexión se pierde o se cierra.
     */
    preparar: function(onConexionAbierta, onDatosRecibidos, onConexionCerrada) {
        this._onConexionAbierta = onConexionAbierta;
        this._onDatosRecibidos = onDatosRecibidos;
        this._onConexionCerrada = onConexionCerrada;
    },

    /**
     * Inicia el proceso para ser el anfitrión de una partida.
     * Se conecta al servidor de señalización y espera a que otro jugador se una.
     * @param {function} onIdGenerado - Callback que se ejecuta cuando el servidor nos asigna un ID.
     */
    iniciarAnfitrion: function(onIdGenerado) {
        if (this.peer) {
            console.warn("PeerJS ya está inicializado. Desconectando instancia anterior.");
            this.desconectar();
        }

        this.esAnfitrion = true;
        this.peer = new Peer(undefined, PEER_SERVER_CONFIG); // ID aleatorio

        this.peer.on('open', (id) => {
            this.miId = id;
            console.log(`[NetworkManager] Anfitrión iniciado. Mi ID es: ${this.miId}`);
            if (onIdGenerado) onIdGenerado(this.miId);

            // Escuchamos por conexiones entrantes
            this.peer.on('connection', (newConnection) => {
                console.log(`[NetworkManager] ¡Conexión entrante de ${newConnection.peer}!`);
                this.conn = newConnection;
                this.idRemoto = newConnection.peer;
                this._configurarEventosDeConexion();
            });
        });

        this.peer.on('error', (err) => {
            console.error("[NetworkManager] Error en PeerJS:", err);
            alert(`Error de conexión: ${err.type}. Es posible que el servidor de señalización esté ocupado. Inténtalo de nuevo.`);
        });
    },

    /**
     * Inicia el proceso para unirse a la partida de un anfitrión.
     * @param {string} anfitrionId - El ID de la sala del anfitrión al que queremos conectarnos.
     */
    unirseAPartida: function(anfitrionId) {
        if (this.peer) {
            console.warn("PeerJS ya está inicializado. Desconectando instancia anterior.");
            this.desconectar();
        }

        this.esAnfitrion = false;
        this.peer = new Peer(undefined, PEER_SERVER_CONFIG);

        this.peer.on('open', (id) => {
            this.miId = id;
            console.log(`[NetworkManager] Cliente iniciado. Mi ID es: ${this.miId}. Intentando conectar a ${anfitrionId}`);
            
            this.conn = this.peer.connect(anfitrionId);
            this.idRemoto = anfitrionId;
            this._configurarEventosDeConexion();
        });

         this.peer.on('error', (err) => {
            console.error("[NetworkManager] Error en PeerJS:", err);
            alert(`Error de conexión: ${err.type}`);
        });
    },
    
    /**
     * Envía un objeto de datos al otro jugador. El objeto será convertido a JSON.
     * @param {object} datos - El objeto de datos a enviar (ej. una acción del juego).
     */
    enviarDatos: function(datos) {
        if (this.conn && this.conn.open) {
            // --- AÑADE ESTE LOG ---
            console.log(`%c[VIAJE-RED] Enviando datos a ${this.idRemoto}:`, 'color: #00FFFF;', datos);
            // --- FIN ---
            this.conn.send(datos);
        } else {
            console.warn("[NetworkManager] Intento de enviar datos sin una conexión activa.");
        }
    },

    /**
     * Cierra la conexión actual y destruye la instancia de Peer.
     */
    desconectar: function() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.miId = null;
        this.idRemoto = null;
        this.esAnfitrion = false;
        console.log("[NetworkManager] Desconectado.");
    },


    /**
     * Función privada para añadir los listeners a una nueva conexión.
     * @private
     */
    _configurarEventosDeConexion: function() {
        if (!this.conn) return;

        this.conn.on('open', () => {
            console.log(`[NetworkManager] ¡Conexión establecida con ${this.conn.peer}!`);
            if (this._onConexionAbierta) this._onConexionAbierta(this.idRemoto);
        });

        this.conn.on('data', (datos) => {
            console.log(`[NetworkManager] Datos recibidos de ${this.conn.peer}:`, datos);
            if (this._onDatosRecibidos) this._onDatosRecibidos(datos);
        });

        this.conn.on('close', () => {
            console.log(`[NetworkManager] La conexión con ${this.conn.peer} se ha cerrado.`);
            if (this._onConexionCerrada) this._onConexionCerrada();
            this.conn = null; // Limpiar la conexión
        });
    }
};

/**
 * [SOLO ANFITRIÓN] Empaqueta el estado COMPLETO del juego (gameState, board, units)
 * y lo retransmite a todos los clientes conectados.
 * Esta es la "fuente de la verdad".
 */
NetworkManager.broadcastFullState = function() {
    if (!this.esAnfitrion || !this.conn || !this.conn.open) return;

    console.log("%c[Anfitrión Broadcast] Empaquetando y enviando estado completo del juego...", "background: #FFD700; color: black;");

    // Preparamos un objeto de estado limpio para no enviar elementos del DOM
    const replacer = (key, value) => (key === 'element' ? undefined : value);
    
    // El gameState se envía tal cual, el cliente lo fusionará
    const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
    // Limpiamos la identidad del jugador para que el cliente use la suya propia
    delete gameStateForBroadcast.myPlayerNumber;

    const fullStatePacket = {
        type: 'fullStateUpdate', // Un nuevo tipo de mensaje claro y único
        payload: {
            gameState: gameStateForBroadcast,
            board: JSON.parse(JSON.stringify(board, replacer)),
            units: JSON.parse(JSON.stringify(units, replacer)),
            unitIdCounter: unitIdCounter
        }
    };
    
    this.enviarDatos(fullStatePacket);
}; 

// EN networkManager.js -> AÑADE ESTA NUEVA FUNCIÓN COMPLETA

/**
 * [SOLO ANFITRIÓN] Empaqueta el estado COMPLETO del juego (gameState, board, units)
 * y lo retransmite a todos los clientes conectados.
 * Esta es la "fuente de la verdad".
 */
NetworkManager.broadcastFullState = function() {
    if (!this.esAnfitrion || !this.conn || !this.conn.open) return;

    console.log("%c[Anfitrión Broadcast] Empaquetando y enviando estado completo del juego...", "background: #FFD700; color: black;");

    // Preparamos un objeto de estado limpio para no enviar elementos del DOM
    const replacer = (key, value) => (key === 'element' ? undefined : value);
    
    // El gameState se envía tal cual, el cliente lo fusionará
    const gameStateForBroadcast = JSON.parse(JSON.stringify(gameState, replacer));
    // Limpiamos la identidad del jugador para que el cliente use la suya propia
    delete gameStateForBroadcast.myPlayerNumber;

    const fullStatePacket = {
        type: 'fullStateUpdate', // Un nuevo tipo de mensaje claro y único
        payload: {
            gameState: gameStateForBroadcast,
            board: JSON.parse(JSON.stringify(board, replacer)),
            units: JSON.parse(JSON.stringify(units, replacer)),
            unitIdCounter: unitIdCounter
        }
    };
    
    this.enviarDatos(fullStatePacket);
}