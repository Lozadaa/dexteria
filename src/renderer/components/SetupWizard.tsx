/**
 * SetupWizard
 *
 * Initial setup wizard that ensures the user has a working AI provider
 * and selects a theme before being able to use the app.
 */

import React, { useState, useEffect } from 'react';
import {
    Button,
    Input,
    Spinner,
    AlertBanner,
} from 'adnia-ui';
import {
    Terminal,
    Key,
    CheckCircle,
    XCircle,
    ArrowRight,
    RefreshCw,
    ExternalLink,
    Cpu,
    Zap,
    Palette,
    Check,
    Code2,
    Download,
} from 'lucide-react';
import { cn } from '../lib/utils';
import SplashImage from '../../../assets/splash.png';
import { useThemeContext } from '../contexts/ThemeContext';

import { useTranslation } from '../i18n/useTranslation';
type ProviderType = 'opencode' | 'codex' | 'claude-code' | 'anthropic';
type WizardStep = 'select' | 'configure' | 'test' | 'theme' | 'codeViewing';

interface OpenCodeInstallProgress {
    phase: 'checking' | 'downloading' | 'extracting' | 'verifying' | 'complete' | 'error';
    percent: number;
    message: string;
}

interface CodexInstallProgress {
    phase: 'checking' | 'installing' | 'verifying' | 'complete' | 'error';
    percent: number;
    message: string;
}

interface PresetTheme {
    id: string;
    name: string;
    description?: string;
    preview: {
        background: string;
        foreground: string;
        primary: string;
        accent: string;
    };
}

interface SetupWizardProps {
    onComplete: (selectedThemeId?: string) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
    const { t } = useTranslation();
    const { setActiveTheme } = useThemeContext();
    const [step, setStep] = useState<WizardStep>('select');
    const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [claudeCodeAvailable, setClaudeCodeAvailable] = useState<boolean | null>(null);
    const [checkingClaudeCode, setCheckingClaudeCode] = useState(true);
    const [selectedTheme, setSelectedTheme] = useState<string>('default');
    const [presetThemes, setPresetThemes] = useState<PresetTheme[]>([]);
    const [loadingThemes, setLoadingThemes] = useState(true);

    // OpenCode state
    const [openCodeAvailable, setOpenCodeAvailable] = useState<boolean | null>(null);
    const [checkingOpenCode, setCheckingOpenCode] = useState(true);
    const [installingOpenCode, setInstallingOpenCode] = useState(false);
    const [openCodeInstallProgress, setOpenCodeInstallProgress] = useState<OpenCodeInstallProgress | null>(null);
    const [_openCodeError, setOpenCodeError] = useState<string | null>(null);

    // Codex state
    const [codexAvailable, setCodexAvailable] = useState<boolean | null>(null);
    const [checkingCodex, setCheckingCodex] = useState(true);
    const [installingCodex, setInstallingCodex] = useState(false);
    const [codexInstallProgress, setCodexInstallProgress] = useState<CodexInstallProgress | null>(null);
    const [codexError, setCodexError] = useState<string | null>(null);
    const [npmAvailable, setNpmAvailable] = useState<boolean | null>(null);

    // VSCode state
    const [vscodeInstalled, setVscodeInstalled] = useState<boolean | null>(null);
    const [checkingVscode, setCheckingVscode] = useState(true);
    const [wantsCodeViewing, setWantsCodeViewing] = useState<boolean | null>(null);
    const [_vscodeDownloadUrl, setVscodeDownloadUrl] = useState<string>('');

    // Helper function to reset OpenCode state on error or cancel
    const resetOpenCodeState = () => {
        setInstallingOpenCode(false);
        setCheckingOpenCode(false);
        setOpenCodeInstallProgress(null);
        setOpenCodeError(null);
    };

    // Helper function to reset Codex state on error or cancel
    const resetCodexState = () => {
        setInstallingCodex(false);
        setCheckingCodex(false);
        setCodexInstallProgress(null);
        setCodexError(null);
    };

    // Check if providers are available on mount
    useEffect(() => {
        checkOpenCodeAvailability();
        checkCodexAvailability();
        checkClaudeCodeAvailability();
        loadPresetThemes();
        checkVSCodeAvailability();
    }, []);

    // Listen for OpenCode install progress
    useEffect(() => {
        let isMounted = true;

        // Check if OpenCode API is available
        if (!window.dexteria?.opencode?.onInstallProgress) {
            console.warn('[SetupWizard] OpenCode API not available for progress updates');
            return;
        }

        const cleanup = window.dexteria.opencode.onInstallProgress((progress) => {
            // Don't update state if component is unmounted
            if (!isMounted) return;

            setOpenCodeInstallProgress(progress);

            if (progress.phase === 'complete') {
                setInstallingOpenCode(false);
                setOpenCodeAvailable(true);
                // Move to test step after successful install
                setStep('test');
            } else if (progress.phase === 'error') {
                resetOpenCodeState();
                setOpenCodeError(progress.message);
                setTestResult({
                    success: false,
                    message: progress.message,
                });
            }
        });

        return () => {
            isMounted = false;
            cleanup?.();
        };
    }, []);

    // Listen for Codex install progress
    useEffect(() => {
        let isMounted = true;

        // Check if Codex API is available
        if (!window.dexteria?.codex?.onInstallProgress) {
            console.warn('[SetupWizard] Codex API not available for progress updates');
            return;
        }

        const cleanup = window.dexteria.codex.onInstallProgress((progress) => {
            // Don't update state if component is unmounted
            if (!isMounted) return;

            setCodexInstallProgress(progress);

            if (progress.phase === 'complete') {
                setInstallingCodex(false);
                setCodexAvailable(true);
                // Move to test step after successful install
                setStep('test');
            } else if (progress.phase === 'error') {
                resetCodexState();
                setCodexError(progress.message);
                setTestResult({
                    success: false,
                    message: progress.message,
                });
            }
        });

        return () => {
            isMounted = false;
            cleanup?.();
        };
    }, []);

    const loadPresetThemes = async () => {
        setLoadingThemes(true);
        try {
            const themes = await window.dexteria?.settings?.getPresetThemes?.();
            if (themes && themes.length > 0) {
                setPresetThemes(themes);
                // Set default selected theme if available
                if (!themes.find(t => t.id === selectedTheme) && themes.length > 0) {
                    setSelectedTheme(themes[0].id);
                }
            }
        } catch (err) {
            console.error('Failed to load preset themes:', err);
        }
        setLoadingThemes(false);
    };

    const checkOpenCodeAvailability = async () => {
        setCheckingOpenCode(true);
        setOpenCodeError(null);

        // Check if OpenCode API is available
        if (!window.dexteria?.opencode) {
            console.warn('[SetupWizard] OpenCode API not available');
            setOpenCodeAvailable(false);
            setCheckingOpenCode(false);
            return;
        }

        try {
            const isInstalled = await window.dexteria.opencode.isInstalled?.();
            setOpenCodeAvailable(isInstalled ?? false);
        } catch (err) {
            console.error('[SetupWizard] Error checking OpenCode:', err);
            setOpenCodeAvailable(false);
        }
        setCheckingOpenCode(false);
    };

    const handleInstallOpenCode = async () => {
        // Check if OpenCode API is available
        if (!window.dexteria?.opencode?.install) {
            setTestResult({
                success: false,
                message: 'OpenCode installer API not available',
            });
            return;
        }

        setInstallingOpenCode(true);
        setOpenCodeInstallProgress(null);
        setOpenCodeError(null);
        setTestResult(null);

        try {
            const result = await window.dexteria.opencode.install();
            if (!result?.success) {
                resetOpenCodeState();
                const errorMessage = result?.error || 'Installation failed';
                setOpenCodeError(errorMessage);
                setTestResult({
                    success: false,
                    message: errorMessage,
                });
            }
            // Success is handled by the progress listener
        } catch (err) {
            resetOpenCodeState();
            const errorMessage = err instanceof Error ? err.message : 'Installation failed';
            setOpenCodeError(errorMessage);
            setTestResult({
                success: false,
                message: errorMessage,
            });
        }
    };

    const handleInstallCodex = async () => {
        // Check if Codex API is available
        if (!window.dexteria?.codex?.install) {
            setTestResult({
                success: false,
                message: 'Codex installer API not available',
            });
            return;
        }

        // Check if npm is available
        if (!npmAvailable) {
            setCodexError('npm is not available. Please install Node.js first.');
            setTestResult({
                success: false,
                message: 'npm is not available. Please install Node.js first.',
            });
            return;
        }

        setInstallingCodex(true);
        setCodexInstallProgress(null);
        setCodexError(null);
        setTestResult(null);

        try {
            const result = await window.dexteria.codex.install();
            if (!result?.success) {
                resetCodexState();
                const errorMessage = result?.error || 'Installation failed';
                setCodexError(errorMessage);
                setTestResult({
                    success: false,
                    message: errorMessage,
                });
            }
            // Success is handled by the progress listener
        } catch (err) {
            resetCodexState();
            const errorMessage = err instanceof Error ? err.message : 'Installation failed';
            setCodexError(errorMessage);
            setTestResult({
                success: false,
                message: errorMessage,
            });
        }
    };

    const checkClaudeCodeAvailability = async () => {
        setCheckingClaudeCode(true);
        try {
            // Try to set Claude Code as provider and check if it's ready
            const result = await window.dexteria?.settings?.setProvider?.('claude-code');
            if (result?.success) {
                const provider = await window.dexteria?.settings?.getProvider?.();
                // Use providerReady instead of ready (ready includes hasCompletedSetup check)
                setClaudeCodeAvailable(provider?.providerReady ?? false);
            } else {
                setClaudeCodeAvailable(false);
            }
        } catch (err) {
            setClaudeCodeAvailable(false);
        }
        setCheckingClaudeCode(false);
    };

    const checkCodexAvailability = async () => {
        setCheckingCodex(true);
        try {
            // Check if Codex is installed via the installer API
            const isInstalled = await window.dexteria?.codex?.isInstalled?.();
            setCodexAvailable(isInstalled ?? false);

            // Also check if npm is available for installation
            const hasNpm = await window.dexteria?.codex?.isNpmAvailable?.();
            setNpmAvailable(hasNpm ?? false);

            // If installed, set it as the provider
            if (isInstalled) {
                await window.dexteria?.settings?.setProvider?.('codex');
            }
        } catch (err) {
            setCodexAvailable(false);
            setNpmAvailable(false);
        }
        setCheckingCodex(false);
    };

    const checkVSCodeAvailability = async () => {
        setCheckingVscode(true);
        try {
            const status = await window.dexteria?.vscode?.getStatus?.();
            setVscodeInstalled(status?.installed ?? false);

            // Get download URL
            const url = await window.dexteria?.vscode?.getDownloadUrl?.();
            setVscodeDownloadUrl(url || 'https://code.visualstudio.com/download');
        } catch (err) {
            console.error('[SetupWizard] Error checking VSCode:', err);
            setVscodeInstalled(false);
        }
        setCheckingVscode(false);
    };

    const handleSelectProvider = (provider: ProviderType) => {
        setSelectedProvider(provider);
        setTestResult(null);

        if (provider === 'opencode') {
            if (openCodeAvailable) {
                // OpenCode is ready, go straight to test
                setStep('test');
            } else {
                // Show install/configure step
                setStep('configure');
            }
        } else if (provider === 'codex') {
            if (codexAvailable) {
                // Codex is ready, go straight to test
                setStep('test');
            } else {
                // Show instructions to install
                setStep('configure');
            }
        } else if (provider === 'claude-code') {
            if (claudeCodeAvailable) {
                // Claude Code is ready, go straight to test
                setStep('test');
            } else {
                // Show instructions to install
                setStep('configure');
            }
        } else {
            // Anthropic needs API key
            setStep('configure');
        }
    };

    const handleConfigureProvider = async () => {
        if (selectedProvider === 'anthropic' && !apiKey.trim()) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await window.dexteria?.settings?.setProvider?.(
                selectedProvider!,
                selectedProvider === 'anthropic' ? apiKey.trim() : undefined
            );

            if (result?.success) {
                setStep('test');
            } else {
                setTestResult({
                    success: false,
                    message: result?.error || 'Failed to configure provider',
                });
            }
        } catch (err) {
            setTestResult({
                success: false,
                message: err instanceof Error ? err.message : 'Unknown error',
            });
        }
        setIsLoading(false);
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const result = await window.dexteria?.settings?.testProvider?.();
            setTestResult({
                success: result?.success ?? false,
                message: result?.message ?? 'Test completed',
            });
        } catch (err) {
            setTestResult({
                success: false,
                message: err instanceof Error ? err.message : 'Connection test failed',
            });
        }

        setIsTesting(false);
    };

    const handleTestSuccess = () => {
        if (testResult?.success) {
            setStep('theme');
        }
    };

    const handleThemeComplete = () => {
        setStep('codeViewing');
    };

    const handleVSCodeChoice = async (wants: boolean) => {
        setWantsCodeViewing(wants);
        // Save the preference
        try {
            await window.dexteria?.settings?.setVSCodePreference?.(wants);
        } catch (err) {
            console.error('Failed to save VSCode preference:', err);
        }
    };

    const handleOpenDownloadPage = async () => {
        try {
            await window.dexteria?.vscode?.openDownloadPage?.();
        } catch (err) {
            console.error('Failed to open download page:', err);
        }
    };

    const handleComplete = () => {
        // Pass selected theme ID to parent, theme will be applied when project opens
        onComplete(selectedTheme);
    };

    const handleBack = () => {
        if (step === 'codeViewing') {
            setStep('theme');
        } else if (step === 'theme') {
            setStep('test');
        } else if (step === 'test') {
            setStep('configure');
        } else if (step === 'configure') {
            setStep('select');
            setSelectedProvider(null);
        }
        setTestResult(null);
    };

    const getStepNumber = (s: WizardStep) => {
        switch (s) {
            case 'select': return 1;
            case 'configure': return 2;
            case 'test': return 3;
            case 'theme': return 4;
            case 'codeViewing': return 5;
        }
    };

    const currentStepNum = getStepNumber(step);

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Minimal top bar for window controls */}
            <div className="h-10 border-b border-border flex items-center justify-end select-none">
                <div
                    className="flex-1 h-full"
                    style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
                />
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
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 2l8 8M10 2l-8 8" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <div className="max-w-xl w-full">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-block rounded-xl p-4 mb-4">
                            <img
                                src={SplashImage}
                                alt="Dexteria"
                                className="h-16 w-auto mx-auto"
                            />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">{t('setup.welcome')}</h1>
                        <p className="text-muted-foreground">
                            {step === 'theme'
                                ? t('setup.chooseTheme')
                                : step === 'codeViewing'
                                    ? t('setup.codeViewing')
                                    : t('setup.configureProvider')
                            }
                        </p>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[1, 2, 3, 4, 5].map((num, idx) => (
                            <React.Fragment key={num}>
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                    currentStepNum === num
                                        ? "bg-primary text-primary-foreground"
                                        : currentStepNum > num
                                            ? "bg-green-500/20 text-green-500"
                                            : "bg-muted text-muted-foreground"
                                )}>
                                    {currentStepNum > num ? <Check size={14} /> : num}
                                </div>
                                {idx < 4 && <div className="w-6 h-0.5 bg-border" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step: Select Provider */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                {t('setup.chooseProvider')}
                            </h2>

                            {(checkingOpenCode || checkingCodex || checkingClaudeCode) ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label={t('setup.checkingProviders')} />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* OpenCode Option - Default/Recommended */}
                                    <button
                                        onClick={() => handleSelectProvider('opencode')}
                                        className={cn(
                                            "w-full p-4 rounded-lg border text-left transition-all",
                                            "hover:border-primary/50 hover:bg-muted/50",
                                            openCodeAvailable
                                                ? "border-green-500/30 bg-green-500/5"
                                                : "border-primary/30 bg-primary/5"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                                openCodeAvailable ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                                            )}>
                                                <Zap size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold">OpenCode</span>
                                                    {openCodeAvailable && (
                                                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                                                            {t('labels.installed')}
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                                        {t('setup.recommended')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.opencode.description')}
                                                </p>
                                            </div>
                                            <ArrowRight size={20} className="text-muted-foreground mt-3" />
                                        </div>
                                    </button>

                                    {/* Codex CLI Option */}
                                    <button
                                        onClick={() => handleSelectProvider('codex')}
                                        className={cn(
                                            "w-full p-4 rounded-lg border text-left transition-all",
                                            "hover:border-primary/50 hover:bg-muted/50",
                                            codexAvailable
                                                ? "border-green-500/30 bg-green-500/5"
                                                : "border-border"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                                codexAvailable ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                                            )}>
                                                <Cpu size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Codex CLI</span>
                                                    {codexAvailable && (
                                                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                                                            {t('setup.detected')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.codex.description')}
                                                    {!codexAvailable && ` ${t('setup.claudeCode.requiresInstall')}`}
                                                </p>
                                            </div>
                                            <ArrowRight size={20} className="text-muted-foreground mt-3" />
                                        </div>
                                    </button>

                                    {/* Claude Code Option */}
                                    <button
                                        onClick={() => handleSelectProvider('claude-code')}
                                        className={cn(
                                            "w-full p-4 rounded-lg border text-left transition-all",
                                            "hover:border-primary/50 hover:bg-muted/50",
                                            claudeCodeAvailable
                                                ? "border-green-500/30 bg-green-500/5"
                                                : "border-border"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                                claudeCodeAvailable ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"
                                            )}>
                                                <Terminal size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">Claude Code CLI</span>
                                                    {claudeCodeAvailable && (
                                                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                                                            {t('setup.detected')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.claudeCode.description')}
                                                    {!claudeCodeAvailable && ` ${t('setup.claudeCode.requiresInstall')}`}
                                                </p>
                                            </div>
                                            <ArrowRight size={20} className="text-muted-foreground mt-3" />
                                        </div>
                                    </button>

                                    {/* Anthropic API Option */}
                                    <button
                                        onClick={() => handleSelectProvider('anthropic')}
                                        className="w-full p-4 rounded-lg border border-border text-left transition-all hover:border-primary/50 hover:bg-muted/50"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                                <Key size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{t('views.chat.anthropicApi')}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.anthropic.description')}
                                                </p>
                                            </div>
                                            <ArrowRight size={20} className="text-muted-foreground mt-3" />
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Configure */}
                    {step === 'configure' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                {selectedProvider === 'opencode'
                                    ? t('setup.opencode.installTitle')
                                    : selectedProvider === 'codex'
                                        ? t('setup.codex.installTitle')
                                        : selectedProvider === 'claude-code'
                                            ? t('setup.claudeCode.installTitle')
                                            : t('setup.anthropic.enterApiKey')
                                }
                            </h2>

                            {/* OpenCode Installation */}
                            {selectedProvider === 'opencode' && (
                                <div className="space-y-4">
                                    {openCodeAvailable ? (
                                        <>
                                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                                                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 mx-auto mb-4 flex items-center justify-center">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="font-medium text-green-500">{t('setup.opencode.installed')}</p>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('setup.opencode.continueHint')}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={handleBack}>
                                                    {t('setup.buttons.back')}
                                                </Button>
                                                <Button onClick={() => setStep('test')} className="flex-1">
                                                    {t('setup.buttons.continue')}
                                                    <ArrowRight size={16} className="ml-2" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : !installingOpenCode ? (
                                        <>
                                            <div className="p-4 bg-muted/50 rounded-lg text-center">
                                                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto mb-4 flex items-center justify-center">
                                                    <Zap size={32} />
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {t('setup.opencode.installDesc')}
                                                </p>
                                            </div>

                                            {testResult && !testResult.success && (
                                                <AlertBanner
                                                    variant="error"
                                                    icon={<XCircle size={16} />}
                                                    description={testResult.message}
                                                />
                                            )}

                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={handleBack}>
                                                    {t('setup.buttons.back')}
                                                </Button>
                                                <Button
                                                    onClick={handleInstallOpenCode}
                                                    className="flex-1"
                                                >
                                                    <Zap size={16} className="mr-2" />
                                                    {t('setup.opencode.installButton')}
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                                                    <Spinner size="lg" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {openCodeInstallProgress?.message || 'Installing OpenCode...'}
                                                    </p>
                                                    {openCodeInstallProgress && (
                                                        <div className="mt-4">
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary transition-all duration-300"
                                                                    style={{ width: `${openCodeInstallProgress.percent}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                {Math.round(openCodeInstallProgress.percent)}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {selectedProvider === 'codex' && (
                                <div className="space-y-4">
                                    {codexAvailable ? (
                                        <>
                                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                                                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 mx-auto mb-4 flex items-center justify-center">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="font-medium text-green-500">{t('setup.codex.installed')}</p>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('setup.codex.continueHint')}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={handleBack}>
                                                    {t('setup.buttons.back')}
                                                </Button>
                                                <Button onClick={() => setStep('test')} className="flex-1">
                                                    {t('setup.buttons.continue')}
                                                    <ArrowRight size={16} className="ml-2" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : !installingCodex ? (
                                        <>
                                            {codexError && (
                                                <AlertBanner
                                                    variant="destructive"
                                                    title={t('errors.installationError')}
                                                    description={codexError}
                                                />
                                            )}

                                            {!npmAvailable ? (
                                                <>
                                                    <AlertBanner
                                                        variant="warning"
                                                        title={t('setup.codex.npmNotFound')}
                                                        description={t('setup.codex.npmNotFoundDesc')}
                                                    />

                                                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                                        <p className="text-sm font-medium">{t('setup.codex.installNodeSteps')}</p>
                                                        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                                            <li>{t('setup.codex.installNodeStep1')}</li>
                                                            <li>{t('setup.codex.installNodeStep2')}</li>
                                                            <li>{t('setup.codex.installNodeStep3')}</li>
                                                            <li>{t('setup.codex.installNodeStep4')}</li>
                                                        </ol>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" onClick={handleBack}>
                                                            Back
                                                        </Button>
                                                        <Button
                                                            onClick={checkCodexAvailability}
                                                            disabled={checkingCodex}
                                                            className="flex-1"
                                                        >
                                                            {checkingCodex ? (
                                                                <Spinner size="xs" />
                                                            ) : (
                                                                <RefreshCw size={16} />
                                                            )}
                                                            <span className="ml-2">{t('actions.checkAgain')}</span>
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
                                                        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                                                            <Download size={32} />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{t('setup.codex.installTitle')}</p>
                                                            <p className="text-sm text-muted-foreground mt-2">
                                                                {t('setup.codex.installDesc')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" onClick={handleBack}>
                                                            {t('setup.buttons.back')}
                                                        </Button>
                                                        <Button
                                                            onClick={handleInstallCodex}
                                                            className="flex-1 gap-2"
                                                        >
                                                            <Zap size={16} className="mr-2" />
                                                            {t('setup.codex.installButton')}
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
                                                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                                                    <Spinner size="lg" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">
                                                        {codexInstallProgress?.message || t('setup.codex.installing')}
                                                    </p>
                                                    {codexInstallProgress && (
                                                        <div className="mt-4">
                                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary transition-all duration-300"
                                                                    style={{ width: `${codexInstallProgress.percent}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mt-2">
                                                                {Math.round(codexInstallProgress.percent)}%
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {selectedProvider === 'claude-code' && (
                                <div className="space-y-4">
                                    {claudeCodeAvailable ? (
                                        <>
                                            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                                                <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-500 mx-auto mb-4 flex items-center justify-center">
                                                    <CheckCircle size={32} />
                                                </div>
                                                <p className="font-medium text-green-500">{t('setup.claudeCode.installed')}</p>
                                                <p className="text-sm text-muted-foreground mt-2">
                                                    {t('setup.claudeCode.continueHint')}
                                                </p>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={handleBack}>
                                                    {t('setup.buttons.back')}
                                                </Button>
                                                <Button onClick={() => setStep('test')} className="flex-1">
                                                    {t('setup.buttons.continue')}
                                                    <ArrowRight size={16} className="ml-2" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <AlertBanner
                                                variant="warning"
                                                title={t('setup.claudeCode.notFound')}
                                                description={t('setup.claudeCode.notFoundDesc')}
                                            />

                                            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                                <p className="text-sm font-medium">{t('setup.claudeCode.installSteps')}</p>
                                                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                                    <li>{t('setup.claudeCode.step1')}</li>
                                                    <li>{t('setup.claudeCode.step2')} <code className="bg-background px-1.5 py-0.5 rounded text-foreground">npm install -g @anthropic-ai/claude-code</code></li>
                                                    <li>{t('setup.claudeCode.step3')} <code className="bg-background px-1.5 py-0.5 rounded text-foreground">claude --version</code></li>
                                                    <li>{t('setup.claudeCode.step4')}</li>
                                                </ol>
                                            </div>

                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={handleBack}>
                                                    {t('setup.buttons.back')}
                                                </Button>
                                                <Button
                                                    onClick={checkClaudeCodeAvailability}
                                                    disabled={checkingClaudeCode}
                                                    className="flex-1"
                                                >
                                                    {checkingClaudeCode ? (
                                                        <Spinner size="xs" />
                                                    ) : (
                                                        <RefreshCw size={16} />
                                                    )}
                                                    <span className="ml-2">{t('actions.checkAgain')}</span>
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {selectedProvider === 'anthropic' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-3">
                                            {t('setup.anthropic.getApiKey')}
                                        </p>
                                        <a
                                            href="https://console.anthropic.com/settings/keys"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                        >
                                            console.anthropic.com/settings/keys
                                            <ExternalLink size={14} />
                                        </a>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            {t('setup.anthropic.apiKeyLabel')}
                                        </label>
                                        <Input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk-ant-..."
                                            className="font-mono"
                                        />
                                    </div>

                                    {testResult && !testResult.success && (
                                        <AlertBanner
                                            variant="error"
                                            icon={<XCircle size={16} />}
                                            description={testResult.message}
                                        />
                                    )}

                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={handleBack}>
                                            Back
                                        </Button>
                                        <Button
                                            onClick={handleConfigureProvider}
                                            disabled={!apiKey.trim() || isLoading}
                                            className="flex-1"
                                        >
                                            {isLoading ? (
                                                <Spinner size="xs" />
                                            ) : (
                                                <>
                                                    {t('setup.buttons.continue')}
                                                    <ArrowRight size={16} className="ml-2" />
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step: Test */}
                    {step === 'test' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                {t('setup.test.title')}
                            </h2>

                            <div className="p-6 bg-muted/50 rounded-lg text-center space-y-4">
                                <div className={cn(
                                    "w-16 h-16 rounded-full mx-auto flex items-center justify-center",
                                    testResult?.success
                                        ? "bg-green-500/20 text-green-500"
                                        : testResult && !testResult.success
                                            ? "bg-red-500/20 text-red-500"
                                            : "bg-primary/20 text-primary"
                                )}>
                                    {isTesting ? (
                                        <Spinner size="lg" />
                                    ) : testResult?.success ? (
                                        <CheckCircle size={32} />
                                    ) : testResult && !testResult.success ? (
                                        <XCircle size={32} />
                                    ) : (
                                        <Zap size={32} />
                                    )}
                                </div>

                                <div>
                                    <p className="font-medium">
                                        {selectedProvider === 'opencode'
                                            ? 'OpenCode'
                                            : selectedProvider === 'codex'
                                                ? 'Codex CLI'
                                            : selectedProvider === 'claude-code'
                                                ? 'Claude Code CLI'
                                                : 'Anthropic API'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {isTesting
                                            ? t('setup.test.testing')
                                            : testResult?.success
                                                ? t('setup.test.success')
                                                : testResult
                                                    ? t('setup.test.failed')
                                                    : t('setup.test.clickToTest')
                                        }
                                    </p>
                                </div>

                                {testResult && (
                                    <p className={cn(
                                        "text-sm",
                                        testResult.success ? "text-green-500" : "text-red-500"
                                    )}>
                                        {testResult.message}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleBack}>
                                    {t('setup.buttons.back')}
                                </Button>
                                {!testResult?.success ? (
                                    <Button
                                        onClick={handleTestConnection}
                                        disabled={isTesting}
                                        className="flex-1"
                                    >
                                        {isTesting ? (
                                            <Spinner size="xs" />
                                        ) : (
                                            <>
                                                <Cpu size={16} className="mr-2" />
                                                {t('setup.test.testButton')}
                                            </>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleTestSuccess}
                                        className="flex-1"
                                    >
                                        Continue
                                        <ArrowRight size={16} className="ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step: Theme Selection */}
                    {step === 'theme' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                {t('setup.chooseTheme')}
                            </h2>

                            {loadingThemes ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label={t('setup.loadingThemes')} />
                                </div>
                            ) : presetThemes.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>{t('setup.theme.noThemes')}</p>
                                    <p className="text-sm mt-2">{t('setup.theme.addThemes')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {presetThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={async () => {
                                                setSelectedTheme(theme.id);
                                                // Get full theme data and import it to user themes
                                                const fullTheme = await window.dexteria?.settings?.getPresetTheme?.(theme.id);
                                                if (fullTheme) {
                                                    // Import the theme (this will copy it to user themes directory)
                                                    const imported = await window.dexteria?.theme?.import?.(JSON.stringify(fullTheme));
                                                    if (imported?.id) {
                                                        await setActiveTheme(imported.id);
                                                    }
                                                }
                                            }}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-all relative overflow-hidden",
                                                selectedTheme === theme.id
                                                    ? "border-primary ring-2 ring-primary/20"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            {/* Color preview bar */}
                                            <div className="flex gap-1 mb-2">
                                                <div
                                                    className="w-full h-8 rounded"
                                                    style={{ backgroundColor: `hsl(${theme.preview.background})` }}
                                                >
                                                    <div className="flex items-center justify-center h-full gap-1 px-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
                                                        />
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: `hsl(${theme.preview.accent})` }}
                                                        />
                                                        <div
                                                            className="flex-1 h-1 rounded"
                                                            style={{ backgroundColor: `hsl(${theme.preview.foreground})`, opacity: 0.3 }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-sm">{theme.name}</p>
                                                    {theme.description && (
                                                        <p className="text-xs text-muted-foreground">{theme.description}</p>
                                                    )}
                                                </div>
                                                {selectedTheme === theme.id && (
                                                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                        <Check size={12} className="text-primary-foreground" />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground text-center">
                                {t('setup.theme.changeLater')}
                            </p>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleBack}>
                                    {t('setup.buttons.back')}
                                </Button>
                                <Button
                                    onClick={handleThemeComplete}
                                    className="flex-1"
                                    disabled={loadingThemes}
                                >
                                    {t('setup.buttons.continue')}
                                    <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step: Code Viewing (VSCode Integration) */}
                    {step === 'codeViewing' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                {t('setup.vscode.title')}
                            </h2>

                            <p className="text-sm text-muted-foreground text-center mb-6">
                                {t('setup.vscode.desc')}
                            </p>

                            {checkingVscode ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label={t('setup.checkingVscode')} />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {/* Yes, enable VSCode integration */}
                                    <button
                                        onClick={() => handleVSCodeChoice(true)}
                                        className={cn(
                                            "w-full p-4 rounded-lg border text-left transition-all",
                                            "hover:border-primary/50 hover:bg-muted/50",
                                            wantsCodeViewing === true
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-border"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                                wantsCodeViewing === true
                                                    ? "bg-primary/20 text-primary"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                <Code2 size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold">{t('setup.vscode.yesEnable')}</span>
                                                    {vscodeInstalled && (
                                                        <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
                                                            {t('setup.vscode.detected')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.vscode.yesDesc')}
                                                </p>
                                            </div>
                                            {wantsCodeViewing === true && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-3">
                                                    <Check size={12} className="text-primary-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </button>

                                    {/* Show download link if VSCode not installed but user wants it */}
                                    {wantsCodeViewing === true && !vscodeInstalled && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <Download size={18} className="text-amber-500 mt-0.5" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-amber-500">
                                                        {t('views.settings.integrations.vscodeNotDetected')}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {t('setup.vscode.installLater')}
                                                    </p>
                                                    <button
                                                        onClick={handleOpenDownloadPage}
                                                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2"
                                                    >
                                                        <ExternalLink size={12} />
                                                        {t('views.settings.integrations.downloadVscode')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* No, skip this feature */}
                                    <button
                                        onClick={() => handleVSCodeChoice(false)}
                                        className={cn(
                                            "w-full p-4 rounded-lg border text-left transition-all",
                                            "hover:border-primary/50 hover:bg-muted/50",
                                            wantsCodeViewing === false
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-border"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                                wantsCodeViewing === false
                                                    ? "bg-primary/20 text-primary"
                                                    : "bg-muted text-muted-foreground"
                                            )}>
                                                <XCircle size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-semibold">{t('setup.vscode.noSkip')}</span>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {t('setup.vscode.noDesc')}
                                                </p>
                                            </div>
                                            {wantsCodeViewing === false && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center mt-3">
                                                    <Check size={12} className="text-primary-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground text-center">
                                {t('setup.vscode.changeLater')}
                            </p>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleBack}>
                                    {t('setup.buttons.back')}
                                </Button>
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1"
                                    disabled={wantsCodeViewing === null}
                                >
                                    <Palette size={16} className="mr-2" />
                                    {t('setup.buttons.getStarted')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
