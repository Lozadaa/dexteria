/**
 * NotificationService
 *
 * Handles cross-platform sound and badge notifications for task completion.
 */

import { app, shell, BrowserWindow, nativeImage } from 'electron';
import { execFile } from 'child_process';
import { getStore } from './LocalKanbanStore';
import type { NotificationSound } from '../../shared/types';

let badgeSet = false;

// Preset sound definitions - frequencies and durations for generated tones
const SOUND_PRESETS: Record<NotificationSound, { frequency: number; duration: number; pattern?: number[] }> = {
  system: { frequency: 0, duration: 0 }, // Uses shell.beep()
  chime: { frequency: 800, duration: 150, pattern: [800, 1000, 1200] },
  bell: { frequency: 1000, duration: 200 },
  success: { frequency: 600, duration: 100, pattern: [600, 800] },
  ding: { frequency: 1200, duration: 80 },
  complete: { frequency: 500, duration: 150, pattern: [500, 700, 900] },
};

/**
 * Play a preset sound using PowerShell on Windows or afplay on macOS.
 * Falls back to system beep on other platforms.
 */
async function playPresetSound(preset: NotificationSound): Promise<void> {
  if (preset === 'system') {
    shell.beep();
    return;
  }

  const platform = process.platform;
  const config = SOUND_PRESETS[preset];

  if (platform === 'win32') {
    // Windows: Use PowerShell to generate beep tones
    const frequencies = config.pattern || [config.frequency];
    const commands = frequencies.map(freq =>
      `[Console]::Beep(${freq}, ${config.duration})`
    ).join('; ');

    execFile('powershell', ['-Command', commands], (err) => {
      if (err) {
        console.error('[Notification] PowerShell beep failed, using system beep:', err);
        shell.beep();
      }
    });
  } else if (platform === 'darwin') {
    // macOS: Use osascript for beep - multiple beeps for patterns
    const frequencies = config.pattern || [config.frequency];
    const script = frequencies.map(() =>
      `osascript -e "beep"`
    ).join(' && ');

    execFile('sh', ['-c', script], (err) => {
      if (err) {
        shell.beep();
      }
    });
  } else {
    // Linux and others: Fall back to system beep
    shell.beep();
  }
}

/**
 * Play notification sound based on settings.
 * Only plays if settings.notifications.soundOnTaskComplete is true.
 */
export async function playTaskCompleteSound(): Promise<void> {
  try {
    const store = getStore();
    const settings = store.getSettings();

    if (!settings.notifications.soundOnTaskComplete) {
      return;
    }

    const sound = settings.notifications.sound || 'system';
    await playPresetSound(sound);
    console.log(`[Notification] Played ${sound} sound`);
  } catch (error) {
    console.error('[Notification] Failed to play sound:', error);
  }
}

/**
 * Play a specific preset sound (for testing in settings).
 */
export async function playPresetSoundTest(preset: NotificationSound): Promise<void> {
  try {
    await playPresetSound(preset);
    console.log(`[Notification] Test played ${preset} sound`);
  } catch (error) {
    console.error('[Notification] Failed to play test sound:', error);
  }
}

/**
 * Set the app badge to indicate completed tasks.
 * Only sets if settings.notifications.badgeOnTaskComplete is true.
 */
export function setBadge(): void {
  try {
    const store = getStore();
    const settings = store.getSettings();

    if (!settings.notifications.badgeOnTaskComplete) {
      return;
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS: Use dock badge
      app.dock?.setBadge('!');
      app.setBadgeCount(1);
    } else if (platform === 'win32') {
      // Windows: Use overlay icon
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        // Create a simple badge overlay
        const badgeIcon = createBadgeOverlay();
        win.setOverlayIcon(badgeIcon, 'Task completed');
      }
    } else {
      // Linux: Best effort with setBadgeCount
      app.setBadgeCount(1);
    }

    badgeSet = true;
    console.log('[Notification] Badge set');
  } catch (error) {
    console.error('[Notification] Failed to set badge:', error);
  }
}

/**
 * Clear the app badge.
 */
export function clearBadge(): void {
  if (!badgeSet) return;

  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      app.dock?.setBadge('');
      app.setBadgeCount(0);
    } else if (platform === 'win32') {
      const win = BrowserWindow.getAllWindows()[0];
      if (win) {
        win.setOverlayIcon(null, '');
      }
    } else {
      app.setBadgeCount(0);
    }

    badgeSet = false;
    console.log('[Notification] Badge cleared');
  } catch (error) {
    console.error('[Notification] Failed to clear badge:', error);
  }
}

/**
 * Create a simple badge overlay icon for Windows.
 */
function createBadgeOverlay(): Electron.NativeImage {
  // Create a 16x16 green circle with checkmark
  const size = 16;
  const canvas = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" fill="#22c55e" stroke="#166534" stroke-width="1"/>
      <path d="M5 8 L7 10 L11 6" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  return nativeImage.createFromBuffer(
    Buffer.from(canvas),
    { width: size, height: size }
  );
}

/**
 * Initialize badge clearing on window events.
 * Call this after creating the main window.
 */
export function initBadgeClearing(win: BrowserWindow): void {
  // Clear badge when window is focused
  win.on('focus', () => {
    clearBadge();
  });

  // Clear badge when window is shown/restored
  win.on('show', () => {
    clearBadge();
  });

  win.on('restore', () => {
    clearBadge();
  });

  // macOS: Clear badge when app is activated
  app.on('activate', () => {
    clearBadge();
  });

  console.log('[Notification] Badge clearing initialized');
}

/**
 * Trigger notifications for Ralph task completion.
 */
export function notifyRalphTaskComplete(): void {
  playTaskCompleteSound();
  setBadge();
}
