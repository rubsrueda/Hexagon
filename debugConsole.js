// debugConsole.js
// Lógica para la consola de depuración en pantalla (Versión Clásica).

let consoleElement;
let consoleOutput;
let consoleInput;
// floatingConsoleBtn ya no se declara aquí, se crea localmente.

const DEBUG_MODE = true; 

// En scripts clásicos, no se usa 'import'.
// Se asume que 'Cheats' y 'logMessage' (de utils.js) son variables globales.

/**
 * Inicializa la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function initDebugConsole() {
    if (!DEBUG_MODE) {
        // Si el modo debug está desactivado, no hacemos nada y no creamos el botón.
        return;
    }

    console.log("DEBUG CONSOLE: Iniciando initDebugConsole() (Versión Clásica)."); 

    const gameContainer = document.querySelector('.game-container');
    if (!gameContainer) {
        console.error("DEBUG CONSOLE: CRÍTICO: 'game-container' no encontrado. No se puede inyectar el botón de la consola. El juego no está en la fase adecuada o el HTML ha cambiado.");
        return; 
    }
    console.log("DEBUG CONSOLE: 'game-container' encontrado. Procediendo a crear botón."); 

    // Creamos el botón de la consola dinámicamente.
    const floatingConsoleBtn = document.createElement('button');
    floatingConsoleBtn.id = 'floatingConsoleBtn';
    floatingConsoleBtn.classList.add('floating-btn', 'force-console-button'); // Usamos la clase CSS para el botón.
    floatingConsoleBtn.textContent = 'CMD';
    
    // Aplicamos estilos directamente para forzar su visibilidad y posición, anulando cualquier CSS.
    floatingConsoleBtn.style.setProperty('position', 'fixed', 'important');
    floatingConsoleBtn.style.setProperty('top', '15px', 'important');
    floatingConsoleBtn.style.setProperty('left', '80px', 'important');
    floatingConsoleBtn.style.setProperty('width', '50px', 'important');
    floatingConsoleBtn.style.setProperty('height', '50px', 'important');
    floatingConsoleBtn.style.setProperty('font-size', '16px', 'important');
    floatingConsoleBtn.style.setProperty('border-radius', '50%', 'important');
    floatingConsoleBtn.style.setProperty('background-color', 'rgba(255, 0, 0, 0.9)', 'important'); // ¡ROJO INTENSO!
    floatingConsoleBtn.style.setProperty('color', 'white', 'important');
    floatingConsoleBtn.style.setProperty('box-shadow', '0 0 10px 5px rgba(255, 255, 0, 0.8)', 'important'); 
    floatingConsoleBtn.style.setProperty('z-index', '999999999', 'important'); // ¡Por encima de todo!
    floatingConsoleBtn.style.setProperty('display', 'flex', 'important'); // ¡FORZAMOS DISPLAY FLEX!
    floatingConsoleBtn.style.setProperty('justify-content', 'center', 'important');
    floatingConsoleBtn.style.setProperty('align-items', 'center', 'important');
    
    // Insertamos el botón en el game-container.
    // Asumo que floatingMenuBtn está disponible globalmente si se usa getElementById.
    const floatingMenuBtn = document.getElementById('floatingMenuBtn');
    if (floatingMenuBtn && floatingMenuBtn.parentElement === gameContainer) {
        gameContainer.insertBefore(floatingConsoleBtn, floatingMenuBtn.nextSibling);
        console.log("DEBUG CONSOLE: Botón de consola inyectado después de floatingMenuBtn."); 
    } else {
        gameContainer.appendChild(floatingConsoleBtn); 
        console.log("DEBUG CONSOLE: Botón de consola inyectado al final del game-container."); 
    }
    
    // Ahora, intentamos obtener las referencias a los elementos de la consola principal (HTML)
    consoleElement = document.getElementById('debug-console');
    consoleOutput = document.getElementById('console-output');
    consoleInput = document.getElementById('console-input');

    if (!consoleElement || !consoleOutput || !consoleInput) {
        console.error("DEBUG CONSOLE: CRÍTICO: Los elementos internos de la consola (output/input/contenedor) no fueron encontrados. La consola no funcionará.");
        return;
    }
    console.log("DEBUG CONSOLE: Elementos internos de la consola encontrados."); 

    // Listener para el botón de la consola
    floatingConsoleBtn.addEventListener('click', () => {
        toggleConsole();
    });

    // Desactivar comportamiento por defecto de teclas ` y F12 (si se prefiere)
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === 'Dead' || e.key === 'F12') { 
            e.preventDefault(); 
        }
    });

    // Listener para procesar el comando al presionar Enter en el input
    consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const command = consoleInput.value.trim();
            if (command) {
                logToConsole(`> ${command}`, 'command'); 
                processCommand(command);
                consoleInput.value = ''; 
            }
        }
    });

    logToConsole("Consola de Depuración inicializada. Pulsa 'CMD' (Botón Rojo) para alternar visibilidad.", 'info');
}

/**
 * Alterna la visibilidad de la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function toggleConsole() {
    if (!consoleElement) return;
    consoleElement.style.display = consoleElement.style.display === 'none' ? 'flex' : 'none';
    if (consoleElement.style.display === 'flex') {
        consoleInput.focus(); 
    }
}

/**
 * Añade un mensaje al historial de la consola de depuración.
 * Este es un script clásico, así que no es 'export'. Se llama globalmente.
 */
function logToConsole(message, type = 'info') {
    if (!consoleOutput) return;

    const entry = document.createElement('div');
    entry.textContent = message;
    entry.classList.add(`console-${type}`); 
    consoleOutput.appendChild(entry);
    consoleOutput.scrollTop = consoleOutput.scrollHeight; 
}

/**
 * Procesa una cadena de comando introducida en la consola.
 * Asume que 'Cheats' es un objeto global definido por cheats.js.
 */
function processCommand(commandString) {
    const parts = commandString.split(' ').map(p => p.trim());
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Accede al objeto global 'Cheats'.
    if (typeof Cheats !== 'undefined' && Cheats.hasOwnProperty(commandName) && typeof Cheats[commandName] === 'function') {
        try {
            Cheats[commandName](...args);
            logToConsole(`Comando '${commandName}' ejecutado.`, 'success');
        } catch (error) {
            logToConsole(`Error al ejecutar '${commandName}': ${error.message}`, 'error');
            console.error(error); 
        }
    } else {
        logToConsole(`Comando desconocido o Cheats no definido: ${commandName}`, 'error');
    }
}