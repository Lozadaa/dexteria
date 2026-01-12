import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type AppMode = 'planner' | 'agent';

interface ModeContextType {
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    showPlannerBlockModal: boolean;
    triggerPlannerBlock: () => void;
    closePlannerBlock: () => void;
    switchToAgentAndClose: () => void;
    // First message warning
    showFirstMessageWarning: boolean;
    dontShowFirstMessageWarning: boolean;
    triggerFirstMessageWarning: () => boolean; // returns true if warning was shown
    dismissFirstMessageWarning: (dontShowAgain: boolean) => void;
}

const ModeContext = createContext<ModeContextType | null>(null);

// LocalStorage key for "don't show again" preference
const DONT_SHOW_WARNING_KEY = 'dexteria_dont_show_planner_warning';

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [mode, setModeState] = useState<AppMode>('planner');
    const [showPlannerBlockModal, setShowPlannerBlockModal] = useState(false);
    const [showFirstMessageWarning, setShowFirstMessageWarning] = useState(false);
    const [dontShowFirstMessageWarning, setDontShowFirstMessageWarning] = useState(() => {
        return localStorage.getItem(DONT_SHOW_WARNING_KEY) === 'true';
    });

    // Sync mode with global state
    useEffect(() => {
        const syncMode = async () => {
            try {
                const state = await window.dexteria?.state?.get?.() as { agentMode?: AppMode } | null;
                if (state?.agentMode) {
                    setModeState(state.agentMode);
                }
            } catch (err) {
                console.error('Failed to sync mode:', err);
            }
        };
        syncMode();
        // Poll for changes every 1 second
        const interval = setInterval(syncMode, 1000);
        return () => clearInterval(interval);
    }, []);

    const setMode = useCallback(async (newMode: AppMode) => {
        try {
            await window.dexteria?.state?.set?.({ agentMode: newMode });
            setModeState(newMode);
        } catch (err) {
            console.error('Failed to set mode:', err);
        }
    }, []);

    const triggerPlannerBlock = useCallback(() => {
        if (mode === 'planner') {
            setShowPlannerBlockModal(true);
        }
    }, [mode]);

    const closePlannerBlock = useCallback(() => {
        setShowPlannerBlockModal(false);
    }, []);

    const switchToAgentAndClose = useCallback(async () => {
        await setMode('agent');
        setShowPlannerBlockModal(false);
        setShowFirstMessageWarning(false);
    }, [setMode]);

    // Returns true if warning was shown, false if should proceed without warning
    const triggerFirstMessageWarning = useCallback(() => {
        if (mode === 'planner' && !dontShowFirstMessageWarning) {
            setShowFirstMessageWarning(true);
            return true;
        }
        return false;
    }, [mode, dontShowFirstMessageWarning]);

    const dismissFirstMessageWarning = useCallback((dontShowAgain: boolean) => {
        setShowFirstMessageWarning(false);
        if (dontShowAgain) {
            setDontShowFirstMessageWarning(true);
            localStorage.setItem(DONT_SHOW_WARNING_KEY, 'true');
        }
    }, []);

    return (
        <ModeContext.Provider value={{
            mode,
            setMode,
            showPlannerBlockModal,
            triggerPlannerBlock,
            closePlannerBlock,
            switchToAgentAndClose,
            showFirstMessageWarning,
            dontShowFirstMessageWarning,
            triggerFirstMessageWarning,
            dismissFirstMessageWarning,
        }}>
            {children}
        </ModeContext.Provider>
    );
};

export const useMode = (): ModeContextType => {
    const context = useContext(ModeContext);
    if (!context) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
};
