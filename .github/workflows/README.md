# Release Workflow

Este workflow permite crear releases multiplataforma de Dexteria para Windows, macOS y Linux.

## Uso

### Opción 1: GitHub Actions (Recomendado)

1. Ve a la pestaña **Actions** en tu repositorio de GitHub
2. Selecciona el workflow **Release**
3. Haz clic en **Run workflow**
4. Ingresa la versión que deseas liberar (ej: `0.1.0`)
5. Haz clic en **Run workflow**

El workflow automáticamente:
- Compilará la aplicación para Windows, macOS y Linux en paralelo
- Creará (o sobrescribirá) el release con tag `vX.X.X`
- Subirá todos los artefactos:
  - **Windows**: `Dexteria-Setup.exe`, `Dexteria-Portable.exe`
  - **macOS**: `Dexteria-macOS.dmg`, `Dexteria-macOS.zip`
  - **Linux**: `Dexteria-Linux.AppImage`, `Dexteria-Linux.deb`

### Opción 2: Build Local

Para hacer builds locales:

```bash
# Build solo para tu plataforma actual
npm run package

# Build solo para Windows
npm run package:win

# Build solo para macOS
npm run package:mac

# Build solo para Linux
npm run package:linux

# Build para todas las plataformas (requiere Docker para Linux/Windows en Mac)
npm run package:all
```

### Opción 3: Release desde Local

Para crear un release manualmente desde tu máquina:

```bash
# Asegúrate de que tu package.json tenga la versión correcta
# Luego ejecuta:
npm run release
```

Esto:
1. Hará build para todas las plataformas
2. Borrará el release existente si existe
3. Creará un nuevo release con todos los artefactos

**Nota**: Para hacer build de todas las plataformas desde una sola máquina, necesitarás:
- En macOS: puede hacer builds de macOS, pero Windows/Linux requieren Docker
- En Windows: puede hacer builds de Windows, pero macOS/Linux requieren configuración adicional
- En Linux: puede hacer builds de Linux y Windows, pero macOS requiere macOS nativo

Por eso se recomienda usar GitHub Actions que tiene runners nativos para cada plataforma.

## Requisitos

- Node.js 18+
- GitHub CLI (`gh`) instalado y autenticado
- Para releases locales: permisos de escritura en el repositorio
- Para GitHub Actions: el workflow ya tiene los permisos configurados

## Troubleshooting

### Error: "gh: command not found"

Instala GitHub CLI:
- macOS: `brew install gh`
- Windows: `winget install GitHub.cli`
- Linux: Ver https://github.com/cli/cli/blob/trunk/docs/install_linux.md

### Error de permisos en GitHub Actions

Verifica que el repositorio tenga habilitados los permisos de escritura para workflows:
1. Ve a Settings → Actions → General
2. En "Workflow permissions", selecciona "Read and write permissions"
3. Guarda los cambios
