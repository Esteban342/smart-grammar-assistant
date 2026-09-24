# Smart Grammar Assistant & Humanizer

> Extensión de Chrome (Manifest V3) que **humaniza, parafrasea y corrige** texto seleccionado en cualquier web usando IA. Funciona especialmente bien en **Google Docs**, **Notion**, **Canva** y **Figma**.

<p align="center">
  <img src="docs/preview.gif" alt="Demo" width="720">
</p>

---

## ✨ Funcionalidades

- 🎯 **Menú flotante inteligente** — Aparece junto al texto que seleccionas, sin interrumpir tu flujo.
- 🧠 **Humanizar** — Reescribe el texto para que suene natural, humano y sin "olor a IA".
- 🔄 **Parafrasear** — 5 tonos distintos: Estándar, Formal, Académico, Sencillo y Creativo.
- 📋 **Copiar y Reemplazar** — Copia el resultado o sustituye el texto original directamente.
- ⚡ **Respuesta en streaming** — El texto aparece mientras se genera, sin esperas.
- 🎨 **UI aislada (Shadow DOM)** — No interfiere con los estilos de la página anfitriona.
- 🌐 **Multi-plataforma** — Funciona en cualquier web con DOM estándar.

---

## 🌍 Plataformas soportadas

| Plataforma | Estado | Notas |
|---|---|---|
| Wikipedia, blogs, webs normales | ✅ Completo | Menú flotante estándar |
| **Google Docs** | ✅ Completo | Captura vía iframe interno |
| Notion | ✅ Completo | Bloques de texto editables |
| Canva | ✅ Completo | Incluye texto dentro de diseños |
| Figma | ✅ UI | Interfaz; el canvas es imagen rasterizada |
| Gmail, WhatsApp Web | ✅ Completo | DOM estándar |
| Gemini Web / ChatGPT / DeepSeek | ⚠️ Limitado | Shadow DOM cerrado + CSP estricta |

---

## 🚀 Instalación

### Requisitos

- **Node.js** 18+ y **npm**
- **Chrome** o **Edge** (versión 110+)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Esteban342/smart-grammar-assistant.git
cd smart-grammar-assistant

# 2. Instalar dependencias
npm install

# 3. Compilar
npm run build
```

### Cargar en el navegador

1. Abre `chrome://extensions/` (o `edge://extensions/`)
2. Activa **Modo de desarrollador** (arriba a la derecha)
3. Pulsa **Cargar descomprimida** y selecciona la carpeta `dist/`
4. La extensión aparecerá en tu barra de herramientas

### Configurar API Key

1. Haz clic en el icono de la extensión
2. Pega tu **API Key de Groq** (obtén una gratis en [console.groq.com/keys](https://console.groq.com/keys))
3. Pulsa **Guardar**

---

## 🎮 Cómo usar

1. **Selecciona texto** con el ratón en cualquier web
2. Aparecerá un **menú flotante** cerca de la selección
3. Pulsa **Humanizar** o **Parafrasear**
4. El texto aparecerá en el modal en tiempo real
5. Usa los botones para **Copiar**, **Reemplazar** o **Reintentar**

---

## 🛠️ Tecnologías

- **TypeScript** — Tipado estricto en todo el código
- **Vite** — Build ultrarrápido
- **Manifest V3** — Última versión del estándar de extensiones de Chrome
- **Groq API** — Modelo `openai/gpt-oss-120b` (120B parámetros, 30 RPM gratis)
- **Shadow DOM** — Aislamiento de estilos para la UI

---

## 📁 Estructura del proyecto

```
src/
├── background/       # Service worker (menú contextual)
├── content/          # Content script (inyectado en cada web)
│   ├── content.ts        # Punto de entrada, listeners de mouse
│   ├── modal.ts          # UI del menú flotante y modal
│   ├── selection.ts      # Lectura de selección (Shadow DOM)
│   ├── docs-canvas.ts    # Lógica específica de Google Docs
│   ├── shadow.ts         # Host del Shadow Root aislado
│   ├── components.ts     # Spinner, botones, avisos
│   └── replacer.ts       # Reemplazo de texto en editores
├── services/         # Lógica de la API
│   ├── groq.ts           # Cliente de Groq (principal)
│   └── gemini.ts         # Cliente de Gemini (fallback)
├── popup/            # UI del popup de configuración
└── utils/            # Utilidades
    └── storage.ts        # Helpers de chrome.storage
```

---

## 🔬 Detalles técnicos interesantes

### Google Docs: cómo se lee la selección

Google Docs renderiza el texto en un `<canvas>` HTML5, así que `window.getSelection()` devuelve vacío. La extensión:

1. Accede al iframe interno `docs-texteventtarget-iframe` donde Docs mantiene la selección.
2. Ejecuta `execCommand('copy')` **dentro del user gesture del clic** del botón.
3. Captura el texto en el evento `copy` en fase **bubble** (Docs puebla `clipboardData` después).

### Shadow DOM cerrado

Para sitios con shadow DOM cerrado (Gemini, ChatGPT), la extensión usa `chrome.dom.openOrClosedShadowRoot` cuando está disponible. En sitios con CSP estricta + shadow DOM cerrado, la inyección es bloqueada por el propio navegador.

### Streaming SSE

La respuesta de la API se parsea línea por línea con `TextDecoder`. Cada chunk se coloca en una cola y se escribe carácter a carácter para efecto "typewriter".

---

## 🐛 Limitaciones conocidas

| Limitación | Causa |
|---|---|
| Gemini Web no soportado | CSP estricta + shadow DOM cerrado del editor |
| Figma canvas no soportado | El texto dentro del diseño es puro canvas sin DOM |
| ChatGPT / DeepSeek | Shadow DOM cerrado en el editor |
| Google Sheets | Similar a Docs pero no implementado |

---

## 🗺️ Roadmap

- [x] Menú flotante con Humanizar / Parafrasear
- [x] Soporte completo para Google Docs
- [x] Migración a Groq API (más rápido y más cuota)
- [ ] Modo "Corrector de Gramática"
- [ ] Caché local de resultados (ahorro de cuota)
- [ ] Rediseño UX estilo QuillBot
- [ ] Vista previa de diferencias (diff)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Si encuentras un bug o quieres añadir una funcionalidad:

1. Abre un **Issue** describiendo el problema o la propuesta
2. Si vas a implementarlo, crea una rama `feature/mi-mejora`
3. Abre un **Pull Request** con una descripción clara

---

## 📄 Licencia

MIT © 2026 Esteban

---

<p align="center">
  Hecho con ❤️ y muchas tazas de café ☕
</p>