import React, { useState, useEffect, useRef } from 'react';
import { useAgentState } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';
import Ralph from '../../../assets/ralph.png'
import { Activity, Settings, Minus, Square, X, Maximize2, Bot, ClipboardList, Terminal, PlayCircle, StopCircle, Loader2 } from 'lucide-react';

  interface RalphProgress {
      total: number;
      completed: number;
      failed: number;
      blocked: number;
      currentTaskId: string | null;
      currentTaskTitle: string | null;
      status: string;
  }

  export const TopBar: React.FC = () => {
      const { state, refresh } = useAgentState();
      const { mode, setMode, triggerPlannerBlock } = useMode();
      const [isMaximized, setIsMaximized] = useState(false);
      const [showSettings, setShowSettings] = useState(false);
      const [ralphRunning, setRalphRunning] = useState(false);
      const [ralphProgress, setRalphProgress] = useState<RalphProgress | null>(null);
      const settingsRef = useRef<HTMLDivElement>(null);
      const ralphIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

      // Close settings dropdown when clicking outside
      useEffect(() => {
          const handleClickOutside = (e: MouseEvent) => {
              if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                  setShowSettings(false);
              }
          };
          if (showSettings) {
              document.addEventListener('mousedown', handleClickOutside);
          }
          return () => document.removeEventListener('mousedown', handleClickOutside);
      }, [showSettings]);

      // Poll Ralph progress when running
      useEffect(() => {
          const checkRalph = async () => {
              try {
                  const running = await window.dexteria?.ralph?.isRunning?.();
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
      }, []);

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
              await window.dexteria.ralph.stop();
              setRalphRunning(false);
              setRalphProgress(null);
              refresh();
          } catch (err) {
              console.error('Failed to stop Ralph:', err);
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

      return (
          <div className="h-10 border-b border-border bg-background flex items-center justify-between select-none">
              {/* Left side - Draggable area with logo */}
              <div
                  className="flex-1 flex items-center h-full px-4 gap-4"
                  style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-primary" />
                      <span className="font-semibold text-sm tracking-tight">Dexteria</span>
                  </div>

                  {/* Agent / Planner Toggle - Global Mode */}
                  <div
                      className="flex items-center bg-muted rounded-full p-0.5"
                      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                      <button
                          onClick={() => setMode('agent')}
                          className={cn(
                              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all",
                              mode === 'agent'
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                          )}
                      >
                          <Bot size={12} />
                          Agent
                      </button>
                      <button
                          onClick={() => setMode('planner')}
                          className={cn(
                              "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all",
                              mode === 'planner'
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "text-muted-foreground hover:text-foreground"
                          )}
                      >
                          <ClipboardList size={12} />
                          Planner
                      </button>
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
                  {/* Ralph Run All Button */}
                  {ralphRunning ? (
                      <div className="flex items-center gap-2 px-3">
                          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                              <Loader2 className="w-3 h-3 text-green-400 animate-spin" />
                              <span className="text-xs text-green-400 font-medium">
                                  {ralphProgress ? `${ralphProgress.completed}/${ralphProgress.total}` : 'Running...'}
                              </span>
                              {ralphProgress?.currentTaskTitle && (
                                  <span className="text-xs text-green-400/70 truncate max-w-[100px]">
                                      {ralphProgress.currentTaskTitle}
                                  </span>
                              )}
                          </div>
                          <button
                              onClick={handleStopRalph}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                              title="Stop Ralph"
                          >
                              <StopCircle size={16} />
                          </button>
                      </div>
                  ) : (
                      <button
                          onClick={handleStartRalph}
                          className="flex items-center gap-1.5 px-3 !py-1 max-h-[30px] mx-2 text-xs font-medium bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-lg transition-colors"
                          title="Run all pending tasks (Ralph Mode)"
                      >
                          <PlayCircle size={14} />
                          Run All (Ralph mode)<img src={Ralph} width={40} height={20} />
                      </button>
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
                      <button
                          onClick={() => setShowSettings(!showSettings)}
                          className={cn(
                              "px-3 h-10 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
                              showSettings && "bg-muted text-foreground"
                          )}
                      >
                          <Settings size={14} />
                      </button>

                      {/* Settings Dropdown */}
                      {showSettings && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg
  shadow-lg z-50 overflow-hidden">
                              <button
                                  onClick={handleOpenDevTools}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted
  transition-colors text-left"
                              >
                                  <Terminal size={14} />
                                  Open DevTools
                              </button>
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