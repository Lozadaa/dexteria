import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { KanbanBoard } from './components/KanbanBoard';
import { ChatPanel } from './components/ChatPanel';
import { TaskDetail } from './components/TaskDetail';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ModeProvider, useMode } from './contexts/ModeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { useSystemTheme } from './hooks/useTheme';
import { AlertTriangle, X } from 'lucide-react';
import type { Task } from '../shared/types';
import './index.css';

// Planner Block Modal - shown at App level so it appears regardless of active tab
const PlannerBlockModal: React.FC = () => {
  const { showPlannerBlockModal, closePlannerBlock, switchToAgentAndClose } = useMode();

  if (!showPlannerBlockModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
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

function AppContent() {
  // Sync with system theme
  useSystemTheme();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'task'>('chat');

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setActiveTab('task'); // Auto-switch to task tab when selecting
  };

  const handleCloseTask = () => {
    setSelectedTask(null);
    setActiveTab('chat'); // Switch back to chat when closing task
  };

  return (
    <>
      <Layout
        boardSlot={
          <div className="h-full w-full">
            <ErrorBoundary>
              <KanbanBoard
                onTaskSelect={handleTaskSelect}
                activeTaskId={selectedTask?.id}
              />
            </ErrorBoundary>
          </div>
        }
        rightSlot={
          <div className="h-full w-full flex flex-col">
            <ErrorBoundary>
              {/* Tabs */}
              <div className="flex border-b border-border bg-background">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === 'chat'
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Chat
                  {activeTab === 'chat' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                {selectedTask && (
                  <button
                    onClick={() => setActiveTab('task')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                      activeTab === 'task'
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="truncate max-w-[120px]">{selectedTask.title}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseTask();
                      }}
                      className="ml-1 p-0.5 hover:bg-muted rounded"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                    {activeTab === 'task' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'chat' && <ChatPanel />}
                {activeTab === 'task' && selectedTask && (
                  <TaskDetail
                    taskId={selectedTask.id}
                    onClose={handleCloseTask}
                  />
                )}
              </div>
            </ErrorBoundary>
          </div>
        }
      />
      {/* Global modal for planner mode block */}
      <PlannerBlockModal />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <ModeProvider>
          <AppContent />
        </ModeProvider>
      </ConfirmProvider>
    </ErrorBoundary>
  );
}

export default App;
