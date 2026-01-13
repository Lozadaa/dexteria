/**
 * NotificationService
 *
 * Handles cross-platform sound and badge notifications for task completion.
 */

import { app, shell, BrowserWindow, nativeImage } from 'electron';
import { getStore } from './LocalKanbanStore';

let badgeSet = false;

/**
 * Play a system beep sound.
 * Only plays if settings.notifications.soundOnTaskComplete is true.
 */
export function playTaskCompleteSound(): void {
  try {
    const store = getStore();
    const settings = store.getSettings();

    if (!settings.notifications.soundOnTaskComplete) {
      return;
    }

    // Use Electron's shell.beep() for cross-platform sound
    shell.beep();
    console.log('[Notification] Played task complete sound');
  } catch (error) {
    console.error('[Notification] Failed to play sound:', error);
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
