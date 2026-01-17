# Plan de Migración Dexteria → adnia-ui

## Fase 1: Análisis de Estilos Actuales

### 🔘 BUTTON - Estilos encontrados en Dexteria

#### 1. Botones de Acción Primarios
```css
/* TopBar - Run/Build buttons (stopped) */
bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded

/* KanbanBoard - Create task */
bg-primary text-primary-foreground rounded hover:bg-primary/90

/* TaskComments - Submit */
bg-primary text-primary-foreground rounded hover:bg-primary/90
```
**adnia-ui tiene:** ✅ `variant="default"` y `variant="secondary"`

---

#### 2. Botones de Estado con Color (Running/Building)
```css
/* Running state - verde */
bg-green-500/10 border border-green-500/20 text-green-400 rounded hover:bg-green-500/20

/* Building state - amarillo */
bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/20

/* Error/Stop state - rojo */
bg-red-500/20 hover:bg-red-500/30 text-red-300

/* Blue state (instruction type) */
bg-blue-500/20 text-blue-300 border border-blue-500/30
```
**adnia-ui tiene:** ⚠️ Parcialmente - tiene `success-soft`, `warning-soft`, `danger-soft` pero no con bordes

**FALTA:** Variantes `status-success`, `status-warning`, `status-danger`, `status-info` con bordes

---

#### 3. Botones Ghost/Muted
```css
/* Cancel buttons */
bg-muted text-muted-foreground rounded hover:bg-muted/80

/* TopBar menu button inactive */
hover:bg-muted transition-colors

/* Settings dropdown items */
hover:bg-muted transition-colors text-left
```
**adnia-ui tiene:** ✅ `variant="ghost"` y `variant="secondary"`

---

#### 4. Botones muy pequeños (xs)
```css
/* TopBar - múltiples */
px-2 py-1 text-xs rounded

/* KanbanBoard */
px-2 py-1 text-xs rounded
```
**adnia-ui tiene:** ⚠️ Solo `size="sm"` (h-8)

**FALTA:** `size="xs"` para botones más pequeños

---

#### 5. Botones de Menú (full width, left aligned)
```css
/* TopBar File menu items */
w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-left

/* TopBar exit button */
w-full ... text-red-400
```
**adnia-ui tiene:** ❌ No tiene

**FALTA:** `variant="menu-item"` o crear componente `MenuItem`

---

#### 6. Toggle Group (Agent/Planner)
```css
/* Container */
bg-muted rounded-full p-0.5

/* Active item */
bg-primary text-primary-foreground shadow-sm rounded-full

/* Inactive item */
text-muted-foreground hover:text-foreground rounded-full
```
**adnia-ui tiene:** ❌ No tiene

**FALTA:** Componente `ToggleGroup` o `SegmentedControl`

---

#### 7. Botones de Control de Ventana
```css
/* Minimize/Maximize */
w-11 h-full hover:bg-muted text-muted-foreground hover:text-foreground

/* Close */
w-11 h-full hover:bg-red-500 hover:text-white text-muted-foreground
```
**adnia-ui tiene:** ❌ No tiene (son específicos de Electron)

**DECISIÓN:** Mantener custom - son específicos de window chrome

---

#### 8. Card Buttons (WelcomeScreen)
```css
/* Action cards */
w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent text-left shadow-sm
```
**adnia-ui tiene:** ❌ No tiene

**FALTA:** `variant="card"` o usar composición con Card component

---

### 🔘 ICON BUTTON - Estilos encontrados

#### 1. Tamaños actuales en adnia-ui
- `sm`: h-7 w-7
- `md`: h-8 w-8
- `lg`: h-10 w-10

#### 2. Estilos faltantes
```css
/* Extra small */
p-1 rounded (≈ h-6 w-6)

/* Con color específico */
hover:bg-red-500/20 text-red-400 hover:text-red-300
hover:bg-green-500/20 text-green-500
```
**FALTA:**
- `size="xs"`
- Variantes `danger`, `success`, `warning`

---

### 🏷️ BADGE - Estilos encontrados

#### Badges de Estado (TaskCard)
```css
/* Running badge */
bg-green-500/20 border-green-500/30 text-green-400

/* Blocked status */
bg-red-500/10 text-red-400 border-red-500/20

/* Doing status */
bg-blue-500/10 text-blue-400 border-blue-500/20

/* Default muted */
bg-muted/30 border-border
```
**adnia-ui tiene:** ⚠️ Tiene `success`, `warning` pero sin transparencia

**FALTA:** Variantes soft/ghost: `success-soft`, `warning-soft`, `danger-soft`, `info-soft`, `muted`

---

## Fase 2: Modificaciones a adnia-ui

### 2.1 Button - Agregar variantes

```typescript
// Nuevas variantes para button.tsx
variant: {
  // ... existentes ...

  // Status buttons con borde (para indicadores de estado)
  "status-success": "bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20",
  "status-warning": "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20",
  "status-danger": "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
  "status-info": "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20",

  // Muted button
  "muted": "bg-muted text-muted-foreground hover:bg-muted/80",
},
size: {
  // ... existentes ...
  xs: "h-7 rounded px-2 text-xs",
}
```

### 2.2 IconButton - Agregar variantes y tamaños

```typescript
// Nuevas variantes para icon-button.tsx
variant: "default" | "ghost" | "outline" | "danger" | "success" | "warning"
size: "xs" | "sm" | "md" | "lg"

// xs = h-6 w-6
// Variantes de color con hover states apropiados
```

### 2.3 Badge - Agregar variantes soft

```typescript
// Nuevas variantes para badge.tsx
variant: {
  // ... existentes ...

  "success-soft": "bg-green-500/10 border-green-500/20 text-green-400",
  "warning-soft": "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
  "danger-soft": "bg-red-500/10 border-red-500/20 text-red-400",
  "info-soft": "bg-blue-500/10 border-blue-500/20 text-blue-400",
  "muted": "bg-muted/30 border-border text-muted-foreground",
}
```

### 2.4 Nuevo: ToggleGroup Component

```typescript
// Crear components/ui/toggle-group.tsx
interface ToggleGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  size?: "sm" | "md";
}

// Estilo: bg-muted rounded-full p-0.5
// Items activos: bg-primary text-primary-foreground shadow-sm rounded-full
// Items inactivos: text-muted-foreground hover:text-foreground rounded-full
```

---

## Fase 3: Orden de Migración

### Paso 1: Actualizar adnia-ui (antes de migrar)
1. ✏️ Modificar `button.tsx` - agregar variantes
2. ✏️ Modificar `icon-button.tsx` - agregar variantes y tamaños
3. ✏️ Modificar `badge.tsx` - agregar variantes soft
4. ➕ Crear `toggle-group.tsx`
5. 🔄 Rebuild adnia-ui

### Paso 2: Migrar componentes (orden de riesgo)
1. **KanbanBoard** - Bajo riesgo, pocas interacciones
2. **TaskComments** - Medio riesgo, interacciones de formulario
3. **WelcomeScreen** - Bajo riesgo, solo botones
4. **TaskRunner** - Medio riesgo, estados de ejecución
5. **TopBar** - Alto riesgo, muchos controles críticos

### Paso 3: Componentes que NO migrar
- **Window controls** (minimize/maximize/close) - específicos de Electron
- **MarkdownRenderer** - evaluar si MarkdownViewer de adnia-ui tiene las mismas features

---

## Mapeo de Estilos Dexteria → adnia-ui

| Estilo Dexteria | adnia-ui Equivalente |
|-----------------|---------------------|
| `bg-primary text-primary-foreground` | `Button variant="default"` |
| `bg-muted text-muted-foreground` | `Button variant="muted"` ⭐ NUEVO |
| `hover:bg-muted` (ghost) | `Button variant="ghost"` |
| `bg-green-500/10 border-green-500/20 text-green-400` | `Button variant="status-success"` ⭐ NUEVO |
| `bg-yellow-500/10 border-yellow-500/20 text-yellow-400` | `Button variant="status-warning"` ⭐ NUEVO |
| `bg-red-500/10 border-red-500/20 text-red-400` | `Button variant="status-danger"` ⭐ NUEVO |
| `bg-blue-500/20 text-blue-300 border-blue-500/30` | `Button variant="status-info"` ⭐ NUEVO |
| `px-2 py-1 text-xs` | `Button size="xs"` ⭐ NUEVO |
| Toggle Agent/Planner | `ToggleGroup` ⭐ NUEVO |
| `p-1 hover:bg-muted rounded` small icon | `IconButton size="xs"` ⭐ NUEVO |
| `hover:bg-red-500/20 text-red-400` | `IconButton variant="danger"` ⭐ NUEVO |

---

## Verificación Final

Después de migrar cada componente:
- [ ] Comparar visualmente con screenshots antes/después
- [ ] Verificar todos los estados hover/active/disabled
- [ ] Probar en light y dark mode
- [ ] Verificar que no hay cambios de tamaño/spacing
