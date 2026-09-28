# Smart Grammar Assistant

Smart Grammar Assistant es una extensión de Chrome (Manifest V3) que humaniza, parafrasea y corrige texto seleccionado en cualquier página web. Está construida en TypeScript y utiliza modelos de lenguaje para las tres tareas principales.

## Estado del proyecto

La extensión funciona completa en las siguientes plataformas:

- Wikipedia y webs con DOM estándar.
- Google Docs, con captura vía iframe interno y reemplazo asistido por `chrome.debugger`.
- Notion, Canva y Figma (interfaz).

El modo Corregir usa dos motores en secuencia: primero LanguageTool para errores ortográficos básicos, luego Qwen como respaldo para puntuación, mayúsculas y tildes. Los modos Humanizar y Parafrasear usan GPT-OSS-120B con streaming SSE.

Las siguientes plataformas no están soportadas por limitaciones del navegador o del sitio:

- Gemini Web, por su política estricta de CSP.
- ChatGPT y DeepSeek, por el uso de shadow DOM cerrado.
- Figma canvas, por renderizar el texto como imagen.

## Estructura principal

```
corrector-ia-extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── background/
    │   └── index.ts
    ├── content/
    │   ├── content.ts
    │   ├── selection.ts
    │   ├── docs-canvas.ts
    │   ├── replacer.ts
    │   ├── types.ts
    │   └── ui/
    │       ├── modal.ts
    │       ├── shadow.ts
    │       └── components.ts
    ├── popup/
    │   ├── index.html
    │   ├── popup.ts
    │   └── style.css
    ├── services/
    │   └── groq.ts
    └── utils/
        └── storage.ts
```

La carpeta content/ contiene la lógica que se inyecta en cada página. La subcarpeta ui/ agrupa los archivos visuales del menú flotante y el modal. La carpeta services/ contiene los clientes de las APIs externas. La carpeta popup/ contiene la interfaz de configuración.

## Inicio rápido

### Requisitos y dependencias

- Node.js 18 o superior, con npm incluido.
- Chrome o Edge, versión 110 o superior.
- Una API Key de Groq obtenida en console.groq.com/keys.

### Instalar y compilar

git clone https://github.com/Esteban342/smart-grammar-assistant.git
cd smart-grammar-assistant
npm install
npm run build

### Cargar en el navegador

1. Abrir chrome://extensions/ o edge://extensions/.
2. Activar el Modo de desarrollador.
3. Pulsar "Cargar descomprimida" y seleccionar la carpeta dist/.

### Configurar la API Key

1. Hacer clic en el icono de la extensión.
2. Pegar la API Key de Groq.
3. Pulsar Guardar.

## Uso

Seleccionar texto en cualquier página. Aparecerá un botón circular junto a la selección. Al pulsarlo, se expande mostrando tres opciones:

- Humanizar. Reescribe el texto para que suene natural.
- Parafrasear. Cambia la redacción manteniendo el significado. Ofrece cinco tonos.
- Corregir. Arregla ortografía, puntuación y gramática.

El resultado aparece en un modal centrado. Desde ahí se puede reemplazar el texto original, copiarlo al portapapeles o analizarlo de nuevo.

## Desarrollo

Comandos disponibles:

npm run build     Compila el proyecto a dist/
npm run watch     Recompila automáticamente al guardar

Los archivos fuente están en src/. El contenido inyectado en las páginas se compila desde src/content/. El service worker desde src/background/. El popup desde src/popup/.

Después de compilar, es necesario recargar la extensión en chrome://extensions/ y refrescar las pestañas donde se esté probando.

## Modelos usados

La extensión utiliza dos modelos de Groq según la tarea:

- openai/gpt-oss-120b para humanizar y parafrasear.
- qwen/qwen3.8-27b para corregir gramática.

Groq aplica un límite gratuito de 30 peticiones por minuto y 1,000 por día. Si se supera, la extensión muestra un aviso de cuota alcanzada.

## Ramas de trabajo

- main contiene la versión estable.
- feature/gemini-api-integration contiene el desarrollo en curso.

Los cambios se integran a main mediante Pull Requests.

## Problemas habituales

- La extensión no aparece en una pestaña abierta. Recargar la página con Ctrl+Shift+R después de cada recarga de la extensión.
- Error de API Key. Verificar que la clave sea de Groq (empieza con gsk_) y no de Gemini.
- Límite de cuota alcanzado. Esperar un minuto o reducir el número de peticiones seguidas.
- El reemplazo en Google Docs muestra un aviso amarillo del navegador. Es el banner del chrome.debugger y desaparece al terminar la operación.

## Licencia

MIT. Consultar el archivo LICENSE para más detalles.
