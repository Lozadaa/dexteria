import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SetupWizard } from './components/SetupWizard';
import { TopBar } from './components/TopBar';
import { ModeProvider, useMode } from './contexts/ModeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ExtensionPointsProvider } from './contexts/ExtensionPointsContext';
import { useSystemTheme } from './hooks/useTheme';
import {
  DockingProvider,
  ComponentRegistryProvider,
  ComponentInstancesProvider,
  dockingComponents,
  DockingEventsProvider,
  PluginPanelsRegistrar,
} from './docking';
import { DockingLayout } from './docking/DockingLayout';
import { AlertTriangle, X } from 'lucide-react';
import './index.css';

// Planner Block Modal - shown at App level so it appears regardless of active tab
const PlannerBlockModal: React.FC = () => {
  const { showPlannerBlockModal, closePlannerBlock, switchToAgentAndClose } = useMode();

  if (!showPlannerBlockModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border bg-yellow-500/10">
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle size={20} />
            <h3 className="font-semibold">Planner Mode Active</h3>
          </div>
          <button
            onClick={closePlannerBlock}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            You are currently in <strong className="text-foreground">Planner Mode</strong>.
            In this mode, you can create and organize tasks, but cannot execute them.
          </p>
          <p className="text-sm text-muted-foreground">
            To run tasks, switch to <strong className="text-foreground">Agent Mode</strong>.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={closePlannerBlock}
              className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={switchToAgentAndClose}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Switch to Agent Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RecentProject {
  path: string;
  name: string;
  lastOpened: string;
}

// Main content with docking system
const DockingContent: React.FC = () => {
  return (
    <ComponentInstancesProvider>
      <DockingEventsProvider>
        <DockingLayout components={dockingComponents} />
      </DockingEventsProvider>
    </ComponentInstancesProvider>
  );
};

function AppContent() {
  // Sync with system theme
  useSystemTheme();
  const [currentProject, setCurrentProject] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningProject, setIsOpeningProject] = useState(false);
  const [providerReady, setProviderReady] = useState<boolean | null>(null);
  const [pendingThemeId, setPendingThemeId] = useState<string | null>(null);

  // Check for provider and project on mount
  useEffect(() => {
    const init = async () => {
      try {
        // First check if we have a ready provider
        const provider = await window.dexteria?.settings?.getProvider?.();
        const isProviderReady = provider?.ready ?? false;
        setProviderReady(isProviderReady);

        // Only load project info if provider is ready
        if (isProviderReady) {
          const [current, recent] = await Promise.all([
            window.dexteria?.project?.getCurrent?.(),
            window.dexteria?.project?.getRecent?.(),
          ]);
          setCurrentProject(current ?? null);
          setRecentProjects(recent ?? []);
        }
      } catch (err) {
        console.error('Failed to init app:', err);
        setProviderReady(false);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Listen for project opening (show loader immediately)
    const cleanupOpening = window.dexteria?.project?.onProjectOpening?.(() => {
      setIsOpeningProject(true);
    });

    // Listen for project changes
    const cleanupProject = window.dexteria?.project?.onProjectChanged?.((path) => {
      setCurrentProject(path);
      setIsOpeningProject(false); // Reset loading state when project changes
      // Refresh recent projects
      window.dexteria?.project?.getRecent?.().then(setRecentProjects);
    });

    // Listen for Ctrl+O shortcut
    const cleanupShortcut = window.dexteria?.project?.onOpenShortcut?.(() => {
      window.dexteria?.project?.open?.();
    });

    return () => {
      cleanupOpening?.();
      cleanupProject?.();
      cleanupShortcut?.();
    };
  }, []);

  const handleOpenProject = async () => {
    setIsOpeningProject(true);
    try {
      const result = await window.dexteria?.project?.open?.();
      // If cancelled, don't keep loading
      if (!result?.success) {
        setIsOpeningProject(false);
      }
      // If success, the project:changed event will update currentProject
    } catch (err) {
      console.error('Failed to open project:', err);
      setIsOpeningProject(false);
    }
  };

  const handleNewProject = async () => {
    setIsOpeningProject(true);
    try {
      const result = await window.dexteria?.project?.create?.();
      // If cancelled, don't keep loading
      if (!result?.success) {
        setIsOpeningProject(false);
      }
      // If success, the project:changed event will update currentProject
    } catch (err) {
      console.error('Failed to create project:', err);
      setIsOpeningProject(false);
    }
  };

  // Handler for when setup wizard completes
  const handleSetupComplete = async (selectedThemeId?: string) => {
    setProviderReady(true);
    // Store selected theme ID to apply when project opens
    if (selectedThemeId) {
      setPendingThemeId(selectedThemeId);
    }
    // Load project info now that provider is ready
    try {
      const [current, recent] = await Promise.all([
        window.dexteria?.project?.getCurrent?.(),
        window.dexteria?.project?.getRecent?.(),
      ]);
      setCurrentProject(current ?? null);
      setRecentProjects(recent ?? []);
    } catch (err) {
      console.error('Failed to load project info:', err);
    }
  };

  // Apply pending theme when project opens
  useEffect(() => {
    const applyPendingTheme = async () => {
      if (currentProject && pendingThemeId) {
        try {
          // Get the preset theme content
          const presetTheme = await window.dexteria?.settings?.getPresetTheme?.(pendingThemeId);
          if (presetTheme) {
            // Import the preset theme to the project's theme service
            const imported = await window.dexteria?.theme?.import?.(JSON.stringify(presetTheme));
            if (imported) {
              // Set it as the active theme
              await window.dexteria?.theme?.setActive?.((imported as { id: string }).id);
            }
          }
        } catch (err) {
          console.error('Failed to apply preset theme:', err);
        }
        // Clear pending theme regardless of success
        setPendingThemeId(null);
      }
    };

    applyPendingTheme();
  }, [currentProject, pendingThemeId]);

  // Show loading state
  if (isLoading || isOpeningProject) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4 animate-fade-in">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        {isOpeningProject && (
          <p className="text-sm text-muted-foreground animate-fade-in-up animate-fill-both animate-stagger-2">Opening project...</p>
        )}
      </div>
    );
  }

  // Show setup wizard if no provider is ready
  if (!providerReady) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // Show welcome screen if no project is open
  if (!currentProject) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Minimal top bar for window controls */}
        <div className="h-10 border-b border-border flex items-center justify-between select-none">
          <div
            className="flex-1 flex items-center h-full px-4"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="font-semibold text-sm tracking-tight">Dexteria</span>
            </div>
          </div>
          <div
            className="flex items-center h-full"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => window.dexteria?.window?.minimize?.()}
              className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6h8" />
              </svg>
            </button>
            <button
              onClick={() => window.dexteria?.window?.maximize?.()}
              className="w-11 h-full flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="1" width="10" height="10" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => window.dexteria?.window?.close?.()}
              className="w-11 h-full flex items-center justify-center hover:bg-red-500 hover:text-white text-muted-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <WelcomeScreen
          onOpenProject={handleOpenProject}
          onNewProject={handleNewProject}
          recentProjects={recentProjects}
        />
      </div>
    );
  }

  // Main app with docking - wrap with providers so TopBar can access docking
  return (
    <ComponentRegistryProvider defaultComponents={dockingComponents}>
      <ExtensionPointsProvider>
        {/* PluginPanelsRegistrar dynamically registers plugin docking panels */}
        <PluginPanelsRegistrar>
          <DockingProvider>
            <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
              <TopBar />
              <div className="flex-1 overflow-hidden">
                <DockingContent />
              </div>
            </div>
            {/* Global modal for planner mode block */}
            <PlannerBlockModal />
          </DockingProvider>
        </PluginPanelsRegistrar>
      </ExtensionPointsProvider>
    </ComponentRegistryProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <ModeProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </ModeProvider>
      </ConfirmProvider>
    </ErrorBoundary>
  );
}

export default App;
