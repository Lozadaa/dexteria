# Release Workflow

This workflow enables creating multi-platform releases of Dexteria for Windows, macOS, and Linux.

## Usage

### Option 1: GitHub Actions (Recommended)

1. Go to the **Actions** tab in your GitHub repository
2. Select the **Release** workflow
3. Click **Run workflow**
4. Enter the version you want to release (e.g., `0.1.0`)
5. Click **Run workflow**

The workflow will automatically:
- Build the application for Windows, macOS, and Linux in parallel
- Create (or overwrite) the release with tag `vX.X.X`
- Upload all artifacts:
  - **Windows**: `Dexteria-Setup.exe`, `Dexteria-Portable.exe`
  - **macOS**: `Dexteria-macOS.dmg`, `Dexteria-macOS.zip`
  - **Linux**: `Dexteria-Linux.AppImage`, `Dexteria-Linux.deb`

### Option 2: Local Build

To build locally:

```bash
# Build for current platform only
npm run package

# Build for Windows only
npm run package:win

# Build for macOS only
npm run package:mac

# Build for Linux only
npm run package:linux

# Build for all platforms (requires Docker for cross-compilation)
npm run package:all
```

### Option 3: Release from Local

To create a release manually from your machine:

```bash
# Make sure your package.json has the correct version
# Then run:
npm run release
```

This will:
1. Build for all platforms
2. Delete the existing release if it exists
3. Create a new release with all artifacts

**Note**: To build all platforms from a single machine:
- On macOS: can build macOS natively, but Windows/Linux require Docker
- On Windows: can build Windows natively, but macOS/Linux require additional configuration
- On Linux: can build Linux and Windows, but macOS requires a Mac

This is why GitHub Actions is recommended - it has native runners for each platform.

## Requirements

- Node.js 18+
- GitHub CLI (`gh`) installed and authenticated
- For local releases: write permissions on the repository
- For GitHub Actions: workflow permissions are already configured

## Troubleshooting

### Error: "gh: command not found"

Install GitHub CLI:
- macOS: `brew install gh`
- Windows: `winget install GitHub.cli`
- Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

### Permission errors in GitHub Actions

Verify that the repository has write permissions enabled for workflows:
1. Go to Settings → Actions → General
2. Under "Workflow permissions", select "Read and write permissions"
3. Save changes
