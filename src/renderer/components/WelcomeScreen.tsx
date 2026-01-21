import React from 'react';
import { FolderOpen, FilePlus, Clock } from 'lucide-react';
import SplashImage from '../../../assets/splash.png';
import { formatRelativeTime } from '../lib/utils';
import { Button, Kbd } from 'adnia-ui';

import { t } from '../i18n/t';

declare const __BUILD_VERSION__: string;
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
                <div className="text-center mb-8 animate-fade-in-up animate-fill-both">
                    <div className="inline-block rounded-xl p-6 mb-4 shadow-sm">
                        <img
                            src={SplashImage}
                            alt="Dexteria"
                            className="h-20 w-auto mx-auto"
                        />
                    </div>
                    <p className="text-muted-foreground animate-fade-in animate-fill-both animate-stagger-2">{t('views.welcome.tagline')}</p>
                </div>

                {/* Actions */}
                <div className="space-y-3 mb-8">
                    <Button
                        variant="outline"
                        onClick={onOpenProject}
                        className="w-full h-auto flex items-center gap-4 p-4 justify-start text-left shadow-sm hover-lift btn-press animate-fade-in-up animate-fill-both animate-stagger-2"
                    >
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                            <FolderOpen size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">{t('views.welcome.openProject')}</div>
                            <div className="text-sm text-muted-foreground font-normal">{t('views.welcome.openProjectDesc')}</div>
                        </div>
                    </Button>

                    <Button
                        variant="outline"
                        onClick={onNewProject}
                        className="w-full h-auto flex items-center gap-4 p-4 justify-start text-left shadow-sm hover-lift btn-press animate-fade-in-up animate-fill-both animate-stagger-3"
                    >
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 group-hover:bg-green-500/20 transition-colors">
                            <FilePlus size={20} />
                        </div>
                        <div>
                            <div className="font-medium text-foreground">{t('actions.newProject')}</div>
                            <div className="text-sm text-muted-foreground font-normal">{t('views.welcome.newProjectDesc')}</div>
                        </div>
                    </Button>
                </div>

                {/* Recent Projects */}
                {recentProjects.length > 0 && (
                    <div className="animate-fade-in-up animate-fill-both animate-stagger-4">
                        <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                            <Clock size={14} />
                            Recent Projects
                        </h3>
                        <div className="space-y-1 bg-card rounded-lg border border-border overflow-hidden">
                            {recentProjects.map((project, idx) => (
                                <Button
                                    key={idx}
                                    variant="ghost"
                                    onClick={() => window.dexteria?.project?.openPath?.(project.path)}
                                    className="w-full h-auto flex items-center justify-between p-3 rounded-none border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FolderOpen size={16} className="text-muted-foreground shrink-0" />
                                        <div className="min-w-0 text-left">
                                            <div className="font-medium text-foreground truncate">{project.name}</div>
                                            <div className="text-xs text-muted-foreground truncate font-normal">{project.path}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0 ml-2 font-normal">
                                        {formatRelativeTime(project.lastOpened)}
                                    </span>
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 text-center text-xs text-muted-foreground animate-fade-in animate-fill-both animate-stagger-5">
                    <p>{t('views.welcome.pressToOpen')} <Kbd>Ctrl+O</Kbd> {t('views.welcome.toOpenProject')}</p>
                    <p className="mt-2 text-[10px] opacity-50">v{__BUILD_VERSION__}</p>
                </div>
            </div>
        </div>
    );
};
