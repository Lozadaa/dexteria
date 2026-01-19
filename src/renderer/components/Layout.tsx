import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { TopBar } from './TopBar';
import { BottomPanel } from './BottomPanel';

interface LayoutProps {
    boardSlot: React.ReactNode;
    rightSlot: React.ReactNode;
    onOpenThemeEditor?: (themeId: string, themeName?: string) => void;
    onOpenSettings?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ boardSlot, rightSlot, onOpenThemeEditor, onOpenSettings }) => {
    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
            <TopBar onOpenThemeEditor={onOpenThemeEditor} onOpenSettings={onOpenSettings} />

            <div className="flex-1 flex overflow-hidden">
                <PanelGroup direction="vertical">
                    <Panel defaultSize={75} minSize={20}>
                        <PanelGroup direction="horizontal">
                            {/* Left Panel - Board */}
                            <Panel defaultSize={60} minSize={20}>
                                <div className="h-full w-full overflow-hidden">
                                    {boardSlot}
                                </div>
                            </Panel>

                            {/* Vertical Resize Handle */}
                            <PanelResizeHandle className="w-px bg-border hover:bg-primary/50 transition-colors" />

                            {/* Right Panel - Chat/Task Detail */}
                            <Panel defaultSize={40} minSize={20}>
                                <div className="h-full w-full overflow-hidden">
                                    {rightSlot}
                                </div>
                            </Panel>
                        </PanelGroup>
                    </Panel>

                    {/* Horizontal Resize Handle */}
                    <PanelResizeHandle className="h-px bg-border hover:bg-primary/50 transition-colors" />

                    {/* Bottom Panel */}
                    <Panel defaultSize={25} minSize={10} collapsible>
                        <div className="h-full w-full overflow-hidden">
                            <BottomPanel />
                        </div>
                    </Panel>
                </PanelGroup>
            </div>
        </div>
    );
};
