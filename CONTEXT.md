# Dexteria - Contexto de Negocio

## Qué es Dexteria

**Dexteria** es un gestor de proyectos con IA integrada que combina un tablero Kanban con un agente autónomo llamado **Dexter**. Permite planificar, organizar y ejecutar tareas de desarrollo de software de forma automatizada.

### Propuesta de Valor

- **Planifica** tu trabajo visualmente con un tablero Kanban
- **Ejecuta** tareas automáticamente usando Claude AI
- **Aprende** de fallos y reintenta con contexto
- **Privacidad total** - todos los datos se guardan localmente

---

## Flujo de Usuario

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Welcome Screen │────▶│  Setup Wizard   │────▶│   Main App      │
│  (Sin proyecto) │     │  (Si no hay AI) │     │   (Con proyecto)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Pantallas y Secciones

### 1. Welcome Screen (Pantalla de Bienvenida)

**Cuándo aparece:** Al abrir la app sin un proyecto activo.

**Elementos:**
- Logo de Dexteria con tagline "Designed for humans. Powered by AI."
- Botón **"Open Project"** - Abre un proyecto existente
- Botón **"New Project"** - Crea un nuevo proyecto
- **Recent Projects** - Lista de proyectos abiertos recientemente con acceso rápido
- Shortcut `Ctrl+O` para abrir proyecto

**Propósito:** Punto de entrada para seleccionar o crear un proyecto.

---

### 2. Setup Wizard (Asistente de Configuración)

**Cuándo aparece:** Si no se detecta Claude Code CLI instalado.

**Elementos:**
- Instrucciones para instalar Claude Code
- Verificación de disponibilidad del CLI
- Botón para reintentar detección

**Propósito:** Asegurar que el usuario tiene la IA configurada antes de usar la app.

---

### 3. Main Layout (Layout Principal)

La interfaz principal se divide en tres áreas:

```
┌────────────────────────────────────────────────────────────┐
│                        TOP BAR                              │
├──────────────────────┬─────────────────────────────────────┤
│                      │                                      │
│    KANBAN BOARD      │         RIGHT PANEL                  │
│    (Centro)          │    (Chat / Task Detail)              │
│                      │                                      │
├──────────────────────┴─────────────────────────────────────┤
│                     BOTTOM PANEL                            │
│              (Task Runner / Run Output / Build)             │
└────────────────────────────────────────────────────────────┘
```

---

### 4. Top Bar (Barra Superior)

**Elementos:**
- **Logo** de Dexteria (izquierda)
- **Nombre del proyecto** actual
- **Mode Selector** - Toggle entre Planner Mode y Agent Mode
- **Settings** - Acceso a configuración (engranaje)

**Modos de operación:**

| Modo | Icono | Propósito | Capacidades |
|------|-------|-----------|-------------|
| **Planner** | 📋 | Planificar y analizar | Lee código, analiza, sugiere. NO ejecuta ni crea tareas |
| **Agent** | 🤖 | Ejecutar y crear | Todo lo anterior + crea tareas, ejecuta código |

---

### 5. Kanban Board (Tablero Kanban)

**Ubicación:** Centro de la pantalla.

**Columnas:**
| Columna | ID | Descripción |
|---------|-----|-------------|
| **Backlog** | `backlog` | Tareas pendientes sin asignar |
| **To Do** | `todo` | Tareas listas para ejecutar |
| **Doing** | `doing` | Tarea actualmente en ejecución |
| **Review** | `review` | Tareas completadas pendientes de revisión |
| **Done** | `done` | Tareas finalizadas |

**Interacciones:**
- **Drag & Drop** - Arrastra tareas entre columnas
- **Click en tarea** - Abre el detalle en el panel derecho
- **Click derecho** - Menú contextual (Run, Delete, etc.)
- **Botón +** en cada columna - Crear nueva tarea
- **Placeholder visual** - Al arrastrar, muestra dónde caerá la tarea

**Task Card (Tarjeta de Tarea):**
- Título de la tarea
- Indicador de prioridad (colores)
- Badge de ID (ej: `abc123`)
- Indicador si está corriendo (animación glow)
- Chip de tiempo completado (en columna Done)

---

### 6. Right Panel (Panel Derecho)

Tiene dos tabs intercambiables:

#### 6.1 Chat Tab

**Propósito:** Comunicación con Dexter (la IA).

**Elementos:**
- **History button** - Ver conversaciones anteriores
- **Mensajes** - Burbujas de chat (usuario azul, IA gris)
- **Thinking blocks** - Bloques colapsables morados que muestran el razonamiento de la IA
- **Input** - Campo de texto para escribir mensajes
- **Mode indicator** - Muestra si estás en Planner o Agent mode
- **Provider selector** - Seleccionar proveedor de IA

**Uso típico:**
- "Analiza este código" (Planner)
- "Crea tareas para implementar login" (Agent)
- "Explica cómo funciona X" (Ambos)

#### 6.2 Task Detail Tab

**Propósito:** Ver y editar detalles de una tarea seleccionada.

**Elementos:**
- **Título** (editable)
- **Descripción** (editable, markdown)
- **Status** - Estado actual
- **Priority** - Prioridad (Low, Medium, High, Critical)
- **Acceptance Criteria** - Lista de criterios de aceptación
- **Dependencies** - Tareas de las que depende
- **Comments** - Historial de comentarios y actividad
  - Notas del usuario
  - Instrucciones
  - Comentarios de fallos (con contexto)
  - Mensajes del agente

---

### 7. Bottom Panel (Panel Inferior)

Tiene tres tabs:

#### 7.1 Task Runner

**Propósito:** Ver la ejecución de tareas por la IA.

**Estados:**
- **Sin tarea** - Muestra lista de tareas pendientes con botón Play
- **Ejecutando** - Muestra output en tiempo real con indicadores de herramientas usadas
- **Completado** - Muestra resumen de la ejecución

**Indicadores de herramientas:**
- 📖 Reading: `archivo.ts`
- 📝 Editing: `archivo.ts`
- 💻 Running: `comando`
- 🔍 Searching: `patrón`
- ✓ (checkmark cuando completa)

#### 7.2 Run Output

**Propósito:** Output del comando `npm run dev` o similar.

**Controles:**
- ▶️ Play - Inicia el proceso de desarrollo
- ⏹️ Stop - Detiene el proceso

#### 7.3 Build Output

**Propósito:** Output del comando de build (`npm run build`).

**Controles:**
- ▶️ Play - Inicia el build
- ⏹️ Stop - Detiene el build

---

### 8. Settings Modal (Configuración)

**Acceso:** Click en el ícono de engranaje en el Top Bar.

**Secciones:**
- **Provider** - Configuración del proveedor de IA (Claude Code)
- **Project** - Configuración específica del proyecto
- **Commands** - Comandos personalizados (run, build, test)

---

## Conceptos Clave

### Ralph Mode (Modo Autopiloto)

Sistema de ejecución autónoma que:
1. Toma todas las tareas del **backlog**
2. Respeta **dependencias** entre tareas
3. Ejecuta **una por una** en orden
4. **Aprende de fallos** y reintenta
5. Mueve tareas exitosas a **review**

### Ciclo de Vida de una Tarea

```
Backlog ──▶ To Do ──▶ Doing ──▶ Review ──▶ Done
   │          │          │          │
   └──────────┴──────────┴──────────┘
        (La IA puede mover entre estos)
```

### Comentarios de Tarea

| Tipo | Icono | Descripción |
|------|-------|-------------|
| **note** | 📝 | Nota del usuario |
| **instruction** | 📋 | Instrucción para la IA |
| **failure** | ❌ | Registro de fallo con contexto |
| **agent** | 🤖 | Mensaje del agente |
| **system** | ⚙️ | Mensaje del sistema |

### Feedback Loop de Fallos

Cuando una tarea falla:
1. Se agrega comentario de fallo con contexto
2. En el siguiente intento, la IA lee los fallos anteriores
3. La IA aprende y ajusta su approach
4. Después de N intentos, se marca como **blocked**

---

## Almacenamiento Local

Todos los datos se guardan en `.local-kanban/` dentro del proyecto:

```
.local-kanban/
├── board.json          # Configuración de columnas
├── tasks.json          # Todas las tareas
├── state.json          # Estado actual (modo, etc.)
├── settings.json       # Configuración del usuario
├── chats/              # Conversaciones con la IA
│   ├── index.json
│   └── chat-*.json
├── agent-runs/         # Historial de ejecuciones
│   └── <taskId>/
│       └── <runId>.json
└── backups/            # Backups automáticos
```

---

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+O` | Abrir proyecto |
| `Ctrl+N` | Nueva tarea |
| `Escape` | Cerrar modal/cancelar |
| `Enter` | Confirmar/enviar |

---

## Seguridad

- **Datos locales** - Nada se envía a servidores externos (excepto las llamadas a Claude API)
- **Sin tracking** - No hay analytics ni telemetría
- **Git branches** - Cada ejecución de Ralph crea un branch para rollback fácil
- **Límites** - Máximo de intentos y tiempo por tarea

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Desktop | Electron 28 |
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS |
| IA | Claude Code CLI |
| Drag & Drop | dnd-kit |
| Validación | Zod |
