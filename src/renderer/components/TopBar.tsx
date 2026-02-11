import React, { useState, useEffect, useRef } from 'react';
import { useAgentState } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';
import Ralph from '../../../assets/ralph.png'
import { Activity, Settings, Minus, Square, X, Maximize2, Bot, ClipboardList, PlayCircle, StopCircle, Loader2, FolderOpen, FilePlus, FolderX, ChevronDown, Play, Hammer, CircleStop, LayoutGrid, MessageSquare, Wrench, Code2, History, Shield, Puzzle, Palette, HelpCircle, Files, Calendar, LayoutDashboard } from 'lucide-react';
import LogoIcon from '../../../assets/logoicon.png';
import { Button, IconButton, ToggleGroup } from 'adnia-ui';
import type { ProjectProcessStatus } from '../../shared/types';
import { Slot } from './extension/Slot';
import { useLayoutStore } from '../docking';

import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../contexts/ToastContext';
  interface RalphProgress {
      total: number;
      completed: number;
      failed: number;
      blocked: number;
      currentTaskId: string | null;
      currentTaskTitle: string | null;
      status: string;
  }

  interface TopBarProps {
      onOpenSettings?: () => void;
      onOpenThemeEditor?: (themeId: string, themeName?: string) => void;
      onNewProject?: () => void;
      onShowHelp?: () => void;
  }

  export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings, onNewProject, onShowHelp }) => {
      const { t } = useTranslation();
      const toast = useToast();
      const { state, refresh } = useAgentState();
      const { mode, setMode, triggerPlannerBlock } = useMode();
      const [isMaximized, setIsMaximized] = useState(false);
      const [showSettings, setShowSettings] = useState(false);
      const [showFileMenu, setShowFileMenu] = useState(false);
      const [showWindowMenu, setShowWindowMenu] = useState(false);
      const [ralphRunning, setRalphRunning] = useState(false);
      const [ralphProgress, setRalphProgress] = useState<RalphProgress | null>(null);
      const [stoppingRalph, setStoppingRalph] = useState(false);
      const [runStatus, setRunStatus] = useState<ProjectProcessStatus | null>(null);
      const [buildStatus, setBuildStatus] = useState<ProjectProcessStatus | null>(null);
      const [vscodeEnabled, setVscodeEnabled] = useState(false);
      const [vscodeInstalled, setVscodeInstalled] = useState(false);
      const settingsRef = useRef<HTMLDivElement>(null);
      const fileMenuRef = useRef<HTMLDivElement>(null);
      const windowMenuRef = useRef<HTMLDivElement>(null);
      const ralphIntervalRef = useRef<NodeJS.Timeout | null>(null);

      const openView = useLayoutStore((s) => s.openView);

      useEffect(() => {
          // Check initial maximized state
          if (window.dexteria?.window?.isMaximized) {
              window.dexteria.window.isMaximized().then(setIsMaximized);
          }

          // Listen for maximize/unmaximize events
          const cleanup = window.dexteria?.window?.onMaximizedChange?.((maximized) => {
              setIsMaximized(maximized);
          });

          return () => cleanup?.();
      }, []);

      // Close dropdowns when clicking outside
      useEffect(() => {
          const handleClickOutside = (e: MouseEvent) => {
              if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                  setShowSettings(false);
              }
              if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
                  setShowFileMenu(false);
              }
              if (windowMenuRef.current && !windowMenuRef.current.contains(e.target as Node)) {
                  setShowWindowMenu(false);
              }
          };
          if (showSettings || showFileMenu || showWindowMenu) {
              document.addEventListener('mousedown', handleClickOutside);
          }
          return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [showSettings, showFileMenu, showWindowMenu]);

      // Poll Ralph progress when running
      useEffect(() => {
          const checkRalph = async () => {
              try {
                  const running = await window.dexteria?.ralph?.isRunning?.();

                  // If we're stopping, don't update state until confirmed stopped
                  if (stoppingRalph) {
                      if (!running) {
                          // Backend confirmed it stopped
                          setRalphRunning(false);
                          setRalphProgress(null);
                          setStoppingRalph(false);
                      }
                      // If still running, keep waiting - don't update UI
                      return;
                  }

                  setRalphRunning(running ?? false);
                  if (running) {
                      const progress = await window.dexteria?.ralph?.getProgress?.() as RalphProgress;
                      setRalphProgress(progress);
                  } else {
                      setRalphProgress(null);
                  }
              } catch (err) {
                  console.error('Ralph check error:', err);
              }
          };

          // Initial check
          checkRalph();

          // Poll every 2 seconds when Ralph might be running
          ralphIntervalRef.current = setInterval(checkRalph, 2000);

          return () => {
              if (ralphIntervalRef.current) {
                  clearInterval(ralphIntervalRef.current);
              }
          };
      }, [stoppingRalph]);

      // Listen for process status updates
      useEffect(() => {
          const loadInitialStatus = async () => {
              try {
                  const statuses = await window.dexteria.project.getAllProcessStatus() as ProjectProcessStatus[];
                  for (const status of statuses) {
                      if (status.type === 'run') setRunStatus(status);
                      if (status.type === 'build') setBuildStatus(status);
                  }
              } catch (err) {
                  console.error('Failed to load process status:', err);
              }
          };

          loadInitialStatus();

          const cleanup = window.dexteria.project.onStatusUpdate((status: unknown) => {
              const s = status as ProjectProcessStatus;
              if (s.type === 'run') setRunStatus(s);
              if (s.type === 'build') setBuildStatus(s);
          });

          return () => cleanup?.();
      }, []);

      // Check VSCode preference and installation status
      useEffect(() => {
          const checkVSCode = async () => {
              try {
                  // Check user preference
                  const pref = await window.dexteria?.settings?.getVSCodePreference?.();
                  setVscodeEnabled(pref?.wantsCodeViewing ?? false);

                  // Check if installed
                  const status = await window.dexteria?.vscode?.getStatus?.();
                  setVscodeInstalled(status?.installed ?? false);
              } catch (err) {
                  console.error('Failed to check VSCode status:', err);
              }
          };

          checkVSCode();
      }, []);

      const handleStartRun = async () => {
          try {
              const result = await window.dexteria.project.startRun();
              if (!result.success) {
                  console.error('Failed to start run:', result.error);
                  toast.error(t('toasts.runStartFailed'));
              }
          } catch (err) {
              console.error('Failed to start run:', err);
              toast.error(t('toasts.runStartFailed'));
          }
      };

      const handleStopRun = async () => {
          try {
              await window.dexteria.project.stopRun();
          } catch (err) {
              console.error('Failed to stop run:', err);
              toast.error(t('toasts.runStopFailed'));
          }
      };

      const handleStartBuild = async () => {
          try {
              const result = await window.dexteria.project.startBuild();
              if (!result.success) {
                  console.error('Failed to start build:', result.error);
                  toast.error(t('toasts.buildStartFailed'));
              }
          } catch (err) {
              console.error('Failed to start build:', err);
              toast.error(t('toasts.buildStartFailed'));
          }
      };

      const handleStopBuild = async () => {
          try {
              await window.dexteria.project.stopBuild();
          } catch (err) {
              console.error('Failed to stop build:', err);
              toast.error(t('toasts.buildStopFailed'));
          }
      };

      const handleStartRalph = async () => {
          if (mode === 'planner') {
              triggerPlannerBlock();
              return;
          }
          try {
              setRalphRunning(true);
              const result = await window.dexteria.ralph.start();
              if (result && result.processed === 0) {
                  toast.info(t('views.topbar.ralphNoTasks'));
              }
              refresh();
          } catch (err) {
              console.error('Failed to start Ralph:', err);
              setRalphRunning(false);
              toast.error(t('toasts.ralphStartFailed'));
          }
      };

      const handleStopRalph = async () => {
          try {
              // Set stopping flag to prevent polling from overwriting state
              setStoppingRalph(true);
              await window.dexteria.ralph.stop();

              // The polling will detect when backend confirms it stopped
              // and will clear stoppingRalph flag and update UI
              refresh();
          } catch (err) {
              console.error('Failed to stop Ralph:', err);
              // On error, reset the stopping flag
              setStoppingRalph(false);
              toast.error(t('toasts.ralphStopFailed'));
          }
      };

      const handleMinimize = () => {
          window.dexteria?.window?.minimize?.();
      };

      const handleMaximize = async () => {
          await window.dexteria?.window?.maximize?.();
          const maximized = await window.dexteria?.window?.isMaximized?.() ?? false;
          setIsMaximized(maximized);
      };

      const handleClose = () => {
          window.dexteria?.window?.close?.();
      };

      const handleOpenProject = async () => {
          setShowFileMenu(false);
          try {
              await window.dexteria?.project?.open?.();
          } catch (err) {
              console.error('Failed to open project:', err);
              toast.error(t('toasts.projectOpenFailed'));
          }
      };

      const handleNewProject = () => {
          setShowFileMenu(false);
          if (onNewProject) {
              onNewProject();
          }
      };

      const handleCloseProject = async () => {
          setShowFileMenu(false);
          try {
              await window.dexteria?.project?.close?.();
          } catch (err) {
              console.error('Failed to close project:', err);
              toast.error(t('toasts.projectCloseFailed'));
          }
      };

      const handleOpenInVSCode = async () => {
          setShowFileMenu(false);
          try {
              const result = await window.dexteria?.vscode?.openProject?.();
              if (!result?.success) {
                  console.error('Failed to open in VSCode:', result?.error);
                  toast.error(t('toasts.vscodeFailed'));
              }
          } catch (err) {
              console.error('Failed to open in VSCode:', err);
              toast.error(t('toasts.vscodeFailed'));
          }
      };

      return (
          <div className="h-10 border-b border-border bg-background flex items-center justify-between select-none">
              {/* Left side - Draggable area with logo */}
              <div
                  className="flex-1 flex items-center h-full px-4 gap-4"
                  style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                  <div className="flex items-center gap-2">
                      <img src={LogoIcon} alt="Dexteria" className="w-10" />
                  </div>

                  {/* File Menu */}
                  <div
                      className="relative"
                      ref={fileMenuRef}
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                      <Button
                          variant={showFileMenu ? "muted" : "ghost"}
                          size="xs"
                          onClick={() => setShowFileMenu(!showFileMenu)}
                      >
                          {t('views.topbar.file')}
                          <ChevronDown size={12} className={cn("transition-transform", showFileMenu && "rotate-180")} />
                      </Button>

                      {showFileMenu && (
                          <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleOpenProject}
                                  className="w-full justify-start rounded-none"
                              >
                                  <FolderOpen size={14} />
                                  {t('views.topbar.openProject')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleNewProject}
                                  className="w-full justify-start rounded-none"
                              >
                                  <FilePlus size={14} />
                                  {t('views.topbar.newProject')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCloseProject}
                                  className="w-full justify-start rounded-none"
                              >
                                  <FolderX size={14} />
                                  {t('views.topbar.closeProject')}
                              </Button>
                                                            <div className="h-px bg-border my-1" />
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleClose}
                                  className="w-full justify-start rounded-none text-red-400 hover:text-red-300"
                              >
                                  <X size={14} />
                                  {t('views.topbar.exit')}
                              </Button>
                          </div>
                      )}
                  </div>

                  {/* Window Menu */}
                  <div
                      className="relative"
                      ref={windowMenuRef}
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                      <Button
                          variant={showWindowMenu ? "muted" : "ghost"}
                          size="xs"
                          onClick={() => setShowWindowMenu(!showWindowMenu)}
                      >
                          {t('views.topbar.window')}
                          <ChevronDown size={12} className={cn("transition-transform", showWindowMenu && "rotate-180")} />
                      </Button>

                      {showWindowMenu && (
                          <div className="absolute left-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('board'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <LayoutGrid size={14} />
                                  {t('views.topbar.board')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('chat'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <MessageSquare size={14} />
                                  {t('labels.chat')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('taskRunner'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Wrench size={14} />
                                  {t('views.topbar.tools')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('runHistory'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <History size={14} />
                                  {t('views.runHistory.title')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('policyEditor'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Shield size={14} />
                                  {t('views.policyEditor.title')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('templates'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Files size={14} />
                                  {t('views.templates.title')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('roadmap'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Calendar size={14} />
                                  {t('views.roadmap.title')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('dashboard'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <LayoutDashboard size={14} />
                                  {t('views.dashboard.title')}
                              </Button>
                              <div className="border-t border-border my-1" />
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('plugins'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Puzzle size={14} />
                                  {t('views.plugins.title')}
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('themeEditor'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Palette size={14} />
                                  {t('views.themeEditor.title')}
                              </Button>
                          </div>
                      )}
                  </div>

                  {/* Agent / Planner Toggle - Global Mode */}
                  <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                      <ToggleGroup
                          value={mode}
                          onValueChange={(value) => setMode(value as 'agent' | 'planner')}
                          options={[
                              { value: 'agent', label: t('views.topbar.agent'), icon: <Bot size={12} /> },
                              { value: 'planner', label: t('views.topbar.planner'), icon: <ClipboardList size={12} /> },
                          ]}
                      />
                  </div>

                  {/* Plugin slot for left side of TopBar */}
                  <div
                      className="flex items-center gap-2"
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                      <Slot id="topbar:left" className="flex items-center gap-2" />
                  </div>

                  {state?.activeTaskId && (
                      <div
                          className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-blue-500/10 border
  border-blue-500/20 text-xs"
                          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                      >
                          <Activity className="w-3 h-3 text-blue-400 animate-pulse" />
                          <span className="text-blue-400/80 font-medium">{t('views.topbar.runningTask')}</span>
                          <span className="font-mono text-blue-300">{state.activeTaskId?.substring(0, 6)}</span>
                      </div>
                  )}
              </div>

              {/* Right side - Status and controls */}
              <div
                  className="flex items-center h-full"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                  {/* Plugin slot for right side of TopBar */}
                  <Slot id="topbar:right" className="flex items-center gap-2 px-2" />

                  {/* Project Run/Build Controls */}
                  <div className="flex items-center gap-1 px-2">
                      {/* Play/Stop Run */}
                      {runStatus?.running ? (
                          <Button
                              variant="status-success"
                              size="xs"
                              onClick={handleStopRun}
                              title={t('tooltips.stopDevServer')}
                          >
                              <CircleStop size={12} />
                              <span className="max-w-[60px] truncate">{t('views.topbar.running')}</span>
                          </Button>
                      ) : (
                          <Button
                              variant="muted"
                              size="xs"
                              onClick={handleStartRun}
                              title={t('tooltips.startDevServer')}
                          >
                              <Play size={12} />
                              {t('actions.run')}
                          </Button>
                      )}

                      {/* Build */}
                      {buildStatus?.running ? (
                          <Button
                              variant="status-warning"
                              size="xs"
                              onClick={handleStopBuild}
                              title={t('tooltips.stopBuild')}
                          >
                              <Loader2 size={12} className="animate-spin" />
                              <span>{t('views.topbar.building')}</span>
                          </Button>
                      ) : (
                          <Button
                              variant="muted"
                              size="xs"
                              onClick={handleStartBuild}
                              title={t('tooltips.buildProject')}
                          >
                              <Hammer size={12} />
                              {t('views.settings.commands.build')}
                          </Button>
                      )}

                      {/* Open in VSCode */}
                      {vscodeEnabled && vscodeInstalled && (
                          <Button
                              variant="muted"
                              size="xs"
                              onClick={handleOpenInVSCode}
                              title={t('views.topbar.openInVscode')}
                          >
                              <Code2 size={12} />
                              {t('views.topbar.openInVscode')}
                          </Button>
                      )}
                  </div>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Ralph Run All Button */}
                  {ralphRunning || stoppingRalph ? (
                      <div className="flex items-center gap-2 px-3">
                          <div className={cn(
                              "flex items-center gap-2 px-2 py-1 rounded-full border",
                              stoppingRalph
                                  ? "bg-orange-500/10 border-orange-500/20"
                                  : ralphProgress?.failed || ralphProgress?.blocked
                                      ? "bg-yellow-500/10 border-yellow-500/20"
                                      : "bg-green-500/10 border-green-500/20"
                          )}>
                              <Loader2 className={cn(
                                  "w-3 h-3 animate-spin",
                                  stoppingRalph ? "text-orange-400" : "text-green-400"
                              )} />
                              <span className={cn(
                                  "text-xs font-medium",
                                  stoppingRalph ? "text-orange-400" : "text-green-400"
                              )}>
                                  {stoppingRalph ? t('views.topbar.stopping') : (ralphProgress ? `${ralphProgress.completed}/${ralphProgress.total}` : t('views.topbar.running'))}
                              </span>
                              {/* Show failed/blocked count if any */}
                              {!stoppingRalph && ralphProgress && (ralphProgress.failed > 0 || ralphProgress.blocked > 0) && (
                                  <span className="flex items-center gap-1 text-xs">
                                      {ralphProgress.failed > 0 && (
                                          <span className="text-red-400" title={t('views.topbar.failedTasks')}>
                                              {ralphProgress.failed} {t('views.topbar.failed')}
                                          </span>
                                      )}
                                      {ralphProgress.failed > 0 && ralphProgress.blocked > 0 && (
                                          <span className="text-muted-foreground">·</span>
                                      )}
                                      {ralphProgress.blocked > 0 && (
                                          <span className="text-yellow-400" title={t('views.topbar.blockedTasks')}>
                                              {ralphProgress.blocked} {t('views.topbar.blocked')}
                                          </span>
                                      )}
                                  </span>
                              )}
                              {!stoppingRalph && ralphProgress?.currentTaskTitle && (
                                  <span className="text-xs text-green-400/70 truncate max-w-[100px]">
                                      {ralphProgress.currentTaskTitle}
                                  </span>
                              )}
                          </div>
                          <IconButton
                              variant="danger"
                              size="sm"
                              onClick={handleStopRalph}
                              disabled={stoppingRalph}
                              title={stoppingRalph ? t('views.topbar.stopping') : t('tooltips.stopExecution')}
                              aria-label={stoppingRalph ? t('views.topbar.stopping') : t('tooltips.stopExecution')}
                          >
                              <StopCircle size={16} />
                          </IconButton>
                      </div>
                  ) : (
                      <Button
                          variant="status-success"
                          size="xs"
                          onClick={handleStartRalph}
                          className="mx-2"
                          title={t('tooltips.runAllPending')}
                      >
                          <PlayCircle size={14} />
                          {t('tooltips.runAllRalph')}<img src={Ralph} width={40} height={20} />
                      </Button>
                  )}

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Status indicator */}
                  <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider mr-2",
                      state?.isRunning
                          ? "text-green-400"
                          : "text-muted-foreground"
                  )}>
                      {state?.isRunning
                          ? <Activity className="w-3 h-3" />
                          : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      }
                      <span>{state?.isRunning ? t('views.topbar.running') : t('views.topbar.idle')}</span>
                  </div>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Settings button with dropdown */}
                  <div className="relative" ref={settingsRef}>
                      <IconButton
                          variant={showSettings ? "secondary" : "ghost"}
                          size="lg"
                          onClick={() => setShowSettings(!showSettings)}
                          className="rounded-none h-10 w-10"
                          aria-label={t('views.settings.title')}
                      >
                          <Settings size={14} />
                      </IconButton>

                      {/* Settings Dropdown */}
                      {showSettings && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                      setShowSettings(false);
                                      onOpenSettings?.();
                                  }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Settings size={14} />
                                  {t('views.topbar.projectSettings')}
                              </Button>
                          </div>
                      )}
                  </div>

                  {/* Help button */}
                  <button
                      onClick={onShowHelp}
                      className="w-9 h-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={t('shortcuts.title') + ' (?)'}
                  >
                      <HelpCircle size={16} />
                  </button>

                  <div className="h-4 w-px bg-border" />

                  {/* Window controls */}
                  <button
                      onClick={handleMinimize}
                      className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground
  hover:text-foreground transition-colors"
                      title={t('views.topbar.minimize')}
                  >
                      <Minus size={14} />
                  </button>
                  <button
                      onClick={handleMaximize}
                      className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground
  hover:text-foreground transition-colors"
                      title={isMaximized ? t('tooltips.restore') : t('tooltips.maximize')}
                  >
                      {isMaximized ? <Square size={12} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                      onClick={handleClose}
                      className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white
  text-muted-foreground transition-colors"
                      title={t('actions.close')}
                  >
                      <X size={14} />
                  </button>
              </div>
          </div>
      );
  };