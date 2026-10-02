# Smart Grammar Assistant

Smart Grammar Assistant es una extensión de Chrome (Manifest V3) que humaniza, parafrasea y corrige texto seleccionado en cualquier página web. Está construida en TypeScript y utiliza modelos de lenguaje para las tres tareas principales.

## Estado del proyecto

La extensión funciona completa en las siguientes plataformas:

- Wikipedia y webs con DOM estándar.
- Google Docs, con captura vía iframe interno y reemplazo asistido por `chrome.debugger`.
- Notion, Canva y Figma (interfaz).

El modo Corregir usa Qwen con diff local. Los modos Humanizar y Parafrasear usan GPT-OSS-120B con streaming SSE.

Las siguientes plataformas no están soportadas por limitaciones del navegador o del sitio:

- Gemini Web, por su política estricta de CSP.
- ChatGPT y DeepSeek, por el uso de shadow DOM cerrado.
- Figma canvas, por renderizar el texto como imagen.

## Estructura del proyecto

```
src/
├── background/
│   ├── index.ts              Punto de entrada del service worker
│   ├── context-menu.ts       Menu del clic derecho
│   └── docs-paste.ts         chrome.debugger para Docs
├── content/
│   ├── index.ts              Punto de entrada del content script
│   ├── core/
│   │   ├── init.ts           Registro de listeners globales
│   │   ├── mouse-handler.ts  Eventos de mouse
│   │   ├── generic-handler.ts    Seleccion en webs normales
│   │   ├── docs-handler.ts   Seleccion en Google Docs
│   │   └── selection-helpers.ts  Helpers de extraccion
│   ├── docs-canvas/
│   │   ├── index.ts          API publica
│   │   ├── constants.ts      Constantes de Docs
│   │   ├── clipboard.ts      Captura via portapapeles
│   │   ├── selection-rect.ts Rectangulo de seleccion
│   │   └── validators.ts     Deteccion de IDs internos
│   ├── replacer/
│   │   ├── index.ts          API publica
│   │   ├── types.ts          Tipos de resultado
│   │   ├── toast.ts          Aviso flotante
│   │   ├── docs.ts           Reemplazo en Docs
│   │   └── standard.ts       Reemplazo estandar
│   ├── ui/
│   │   ├── shadow.ts         Shadow host aislado
│   │   ├── components.ts     Spinner y errores
│   │   └── modal/
│   │       ├── index.ts      Orquestador del modal
│   │       ├── types.ts      Tipos del modal
│   │       ├── state.ts      Estado compartido
│   │       ├── styles.ts     CSS del menu y modal
│   │       ├── floating-menu.ts    Boton circular
│   │       ├── modal-html.ts       Estructura HTML
│   │       ├── modal-drag.ts       Arrastre del modal
│   │       ├── modal-click-outside.ts  Cierre al clic fuera
│   │       ├── rewrite-mode.ts     Humanizar y Parafrasear
│   │       └── grammar-mode.ts     Corregir con diff local
│   ├── selection.ts          Lectura de seleccion con shadow DOM
│   └── types.ts              Tipos compartidos
├── popup/
│   ├── index.html            Interfaz de configuracion
│   ├── popup.ts              Logica del popup
│   └── style.css             Estilos del popup
└── services/
    └── groq/
        ├── index.ts          API publica del modulo
        ├── client.ts         Cliente con streaming SSE
        ├── prompts.ts        Prompts para cada modo
        ├── humanize.ts       Humanizar y Parafrasear
        └── grammar.ts        Corregir con Qwen
```

Cada carpeta tiene una responsabilidad clara:

- `background/` contiene el service worker. No tiene acceso al DOM.
- `content/` es el codigo que se inyecta en las paginas. Se divide en `core/` (logica de eventos), `ui/` (interfaz visual) y subcarpetas especificas por responsabilidad.
- `popup/` es la interfaz del icono de la extension.
- `services/` contiene los clientes de APIs externas.

## Inicio rapido

### Requisitos

- Node.js 18 o superior, con npm incluido.
- Chrome o Edge, version 110 o superior.
- Una API Key de Groq obtenida en console.groq.com/keys.

### Instalar y compilar

```
git clone https://github.com/Esteban342/smart-grammar-assistant.git
cd smart-grammar-assistant
npm install
npm run build
```

### Cargar en el navegador

1. Abrir chrome://extensions/ o edge://extensions/.
2. Activar el Modo de desarrollador.
3. Pulsar "Cargar descomprimida" y seleccionar la carpeta dist/.

### Configurar la API Key

1. Hacer clic en el icono de la extension.
2. Pegar la API Key de Groq.
3. Pulsar Guardar.

## Uso

Seleccionar texto en cualquier pagina. Aparece un boton circular junto a la seleccion. Al pulsarlo, se expande mostrando tres opciones:

- **Humanizar.** Reescribe el texto para que suene natural.
- **Parafrasear.** Cambia la redaccion manteniendo el significado. Ofrece cinco tonos.
- **Corregir.** Arregla ortografia, puntuacion y gramatica. Muestra la lista de cambios y permite aplicarlos individualmente o de golpe.

El resultado aparece en un modal centrado. Desde ahi se puede reemplazar el texto original, copiarlo al portapapeles o volver a analizarlo.

Tambien se puede usar el menu del clic derecho sobre texto seleccionado para abrir directamente el modal.

## Desarrollo

Comandos disponibles:

```
npm run build     Compila el proyecto a dist/
npm run dev       Inicia el modo de desarrollo con Vite
```

Despues de compilar, es necesario recargar la extension en chrome://extensions/ y refrescar las pestañas donde se este probando.

## Modelos usados

La extension utiliza dos modelos de Groq segun la tarea:

- openai/gpt-oss-120b para humanizar y parafrasear.
- qwen/qwen3.8-27b para corregir gramatica.

Groq aplica un limite gratuito de 30 peticiones por minuto y 1,000 por dia. Si se supera, la extension muestra un aviso de cuota alcanzada.

## Ramas de trabajo

- main contiene la version estable.
- feature/gemini-api-integration contiene el desarrollo en curso.

Los cambios se integran a main mediante Pull Requests.

## Problemas habituales

- **La extension no responde tras recargar.** Refrescar la pestaña con Ctrl+Shift+R. El content script viejo se destruye al recargar la extension.
- **Error "Extension context invalidated".** Mismo caso: refrescar la pestaña.
- **Error de API Key.** Verificar que la clave sea de Groq (empieza con gsk_).
- **Limite de cuota alcanzado.** Esperar un minuto o reducir el numero de peticiones seguidas.
- **Aviso amarillo en Google Docs.** Es el banner del chrome.debugger y desaparece al terminar la operacion.

## Licencia

MIT. Consultar el archivo LICENSE para mas detalles.