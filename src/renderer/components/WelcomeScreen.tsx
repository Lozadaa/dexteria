import React from 'react';
import { FolderOpen, FilePlus, Clock } from 'lucide-react';
import SplashImage from '../../../assets/splash.png';

interface WelcomeScreenProps {
    onOpenProject: () => void;
    onNewProject: () => void;
    recentProjects?: Array<{ path: string; name: string; lastOpened: string }>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    onOpenProject,
    onNewProject,
    recentProjects = []
}) => {
    return (
        <div className="flex-1 flex items-center justify-center bg-background">
            <div className="max-w-lg w-full px-8">
                {/* Splash Image - always on light background for gray text visibility */}
                <div className="text-center mb-8">
                    <div className="inline-block rounded-xl p-6 mb-4 shadow-sm">
                        <img
                            src={SplashImage}
                            alt="Dexteria"
                            className="h-20 w-auto mx-auto"
                        />
                    </div>
                    <p className="text-muted-foreground">AI-powered task management for developers</p>
                </div>

                {/* Actions */}
                <div className="space-y-3 mb-8">
                    <button
                        onClick={onOpenProject}
                        className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">Open Project</div>
                            <div className="text-sm text-muted-foreground">Open an existing project folder</div>
                        </div>
                    </button>

                    <button
                        onClick={onNewProject}
                        className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left group shadow-sm"
                    >
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors">
                            <FilePlus size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">New Project</div>
                            <div className="text-sm text-muted-foreground">Create a new Dexteria project</div>
                        </div>
                    </button>
                </div>

                {/* Recent Projects */}
                {recentProjects.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Clock size={14} />
                            Recent Projects
                        </h3>
                        <div className="space-y-1 bg-card rounded-lg border border-border overflow-hidden">
                            {recentProjects.map((project, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => window.dexteria?.project?.openPath?.(project.path)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors text-left group border-b border-border last:border-b-0"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <div className="font-medium text-foreground truncate">{project.name}</div>
                                            <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                        {project.lastOpened}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-muted-foreground">
                    <p>Press <kbd className="px-1.5 py-0.5 rounded bg-card border border-border font-mono shadow-sm">Ctrl+O</kbd> to open a project</p>
                </div>
            </div>
        </div>
    );
};
