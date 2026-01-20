import React, { useState, useEffect, useRef } from 'react';
import { useAgentState } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';
import Ralph from '../../../assets/ralph.png'
import { Activity, Settings, Minus, Square, X, Maximize2, Bot, ClipboardList, Terminal, PlayCircle, StopCircle, Loader2, FolderOpen, FilePlus, FolderX, ChevronDown, Play, Hammer, CircleStop, LayoutGrid, MessageSquare, PanelBottom } from 'lucide-react';
import LogoIcon from '../../../assets/logoicon.png';
import { Button, IconButton, ToggleGroup } from 'adnia-ui';
import type { ProjectProcessStatus } from '../../shared/types';
import { Slot } from './extension/Slot';
import { useLayoutStore } from '../docking';

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
  }

  export const TopBar: React.FC<TopBarProps> = ({ onOpenSettings }) => {
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

      const handleStartRun = async () => {
          try {
              const result = await window.dexteria.project.startRun();
              if (!result.success) {
                  console.error('Failed to start run:', result.error);
              }
          } catch (err) {
              console.error('Failed to start run:', err);
          }
      };

      const handleStopRun = async () => {
          try {
              await window.dexteria.project.stopRun();
          } catch (err) {
              console.error('Failed to stop run:', err);
          }
      };

      const handleStartBuild = async () => {
          try {
              const result = await window.dexteria.project.startBuild();
              if (!result.success) {
                  console.error('Failed to start build:', result.error);
              }
          } catch (err) {
              console.error('Failed to start build:', err);
          }
      };

      const handleStopBuild = async () => {
          try {
              await window.dexteria.project.stopBuild();
          } catch (err) {
              console.error('Failed to stop build:', err);
          }
      };

      const handleStartRalph = async () => {
          if (mode === 'planner') {
              triggerPlannerBlock();
              return;
          }
          try {
              setRalphRunning(true);
              await window.dexteria.ralph.start();
              refresh();
          } catch (err) {
              console.error('Failed to start Ralph:', err);
              setRalphRunning(false);
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

      const handleOpenDevTools = () => {
          window.dexteria?.window?.openDevTools?.();
          setShowSettings(false);
      };

      const handleOpenProject = async () => {
          setShowFileMenu(false);
          try {
              await window.dexteria?.project?.open?.();
          } catch (err) {
              console.error('Failed to open project:', err);
          }
      };

      const handleNewProject = async () => {
          setShowFileMenu(false);
          try {
              await window.dexteria?.project?.create?.();
          } catch (err) {
              console.error('Failed to create project:', err);
          }
      };

      const handleCloseProject = async () => {
          setShowFileMenu(false);
          try {
              await window.dexteria?.project?.close?.();
          } catch (err) {
              console.error('Failed to close project:', err);
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
                          File
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
                                  Open Project...
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleNewProject}
                                  className="w-full justify-start rounded-none"
                              >
                                  <FilePlus size={14} />
                                  New Project...
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCloseProject}
                                  className="w-full justify-start rounded-none"
                              >
                                  <FolderX size={14} />
                                  Close Project
                              </Button>
                              <div className="h-px bg-border my-1" />
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleClose}
                                  className="w-full justify-start rounded-none text-red-400 hover:text-red-300"
                              >
                                  <X size={14} />
                                  Exit
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
                          Window
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
                                  Board
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('chat'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <MessageSquare size={14} />
                                  Chat
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('taskRunner'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <PanelBottom size={14} />
                                  Task Runner
                              </Button>
                              <div className="h-px bg-border my-1" />
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { openView('settings'); setShowWindowMenu(false); }}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Settings size={14} />
                                  Settings
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
                              { value: 'agent', label: 'Agent', icon: <Bot size={12} /> },
                              { value: 'planner', label: 'Planner', icon: <ClipboardList size={12} /> },
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
                          <span className="text-blue-400/80 font-medium">Running:</span>
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
                              title="Stop dev server"
                          >
                              <CircleStop size={12} />
                              <span className="max-w-[60px] truncate">Running</span>
                          </Button>
                      ) : (
                          <Button
                              variant="muted"
                              size="xs"
                              onClick={handleStartRun}
                              title="Start dev server"
                          >
                              <Play size={12} />
                              Run
                          </Button>
                      )}

                      {/* Build */}
                      {buildStatus?.running ? (
                          <Button
                              variant="status-warning"
                              size="xs"
                              onClick={handleStopBuild}
                              title="Stop build"
                          >
                              <Loader2 size={12} className="animate-spin" />
                              <span>Building</span>
                          </Button>
                      ) : (
                          <Button
                              variant="muted"
                              size="xs"
                              onClick={handleStartBuild}
                              title="Build project"
                          >
                              <Hammer size={12} />
                              Build
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
                                  {stoppingRalph ? 'Stopping...' : (ralphProgress ? `${ralphProgress.completed}/${ralphProgress.total}` : 'Running...')}
                              </span>
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
                              title={stoppingRalph ? "Stopping..." : "Stop Ralph"}
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
                          title="Run all pending tasks (Ralph Mode)"
                      >
                          <PlayCircle size={14} />
                          Run All (Ralph mode)<img src={Ralph} width={40} height={20} />
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
                      <span>{state?.isRunning ? 'Running' : 'Idle'}</span>
                  </div>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Settings button with dropdown */}
                  <div className="relative" ref={settingsRef}>
                      <IconButton
                          variant={showSettings ? "secondary" : "ghost"}
                          size="lg"
                          onClick={() => setShowSettings(!showSettings)}
                          className="rounded-none h-10 w-10"
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
                                  Project Settings
                              </Button>
                              <div className="h-px bg-border" />
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleOpenDevTools}
                                  className="w-full justify-start rounded-none"
                              >
                                  <Terminal size={14} />
                                  Open DevTools
                              </Button>
                          </div>
                      )}
                  </div>

                  <div className="h-4 w-px bg-border" />

                  {/* Window controls */}
                  <button
                      onClick={handleMinimize}
                      className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground
  hover:text-foreground transition-colors"
                      title="Minimize"
                  >
                      <Minus size={14} />
                  </button>
                  <button
                      onClick={handleMaximize}
                      className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground
  hover:text-foreground transition-colors"
                      title={isMaximized ? "Restore" : "Maximize"}
                  >
                      {isMaximized ? <Square size={12} /> : <Maximize2 size={14} />}
                  </button>
                  <button
                      onClick={handleClose}
                      className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white
  text-muted-foreground transition-colors"
                      title="Close"
                  >
                      <X size={14} />
                  </button>
              </div>
          </div>
      );
  };