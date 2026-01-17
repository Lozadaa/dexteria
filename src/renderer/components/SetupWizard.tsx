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
} from 'lucide-react';
import { cn } from '../lib/utils';
import SplashImage from '../../../assets/splash.png';

type ProviderType = 'claude-code' | 'anthropic';
type WizardStep = 'select' | 'configure' | 'test' | 'theme';

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

    // Check if Claude Code CLI is available on mount
    useEffect(() => {
        checkClaudeCodeAvailability();
        loadPresetThemes();
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

    const checkClaudeCodeAvailability = async () => {
        setCheckingClaudeCode(true);
        try {
            // Try to set Claude Code as provider and check if it's ready
            const result = await window.dexteria?.settings?.setProvider?.('claude-code');
            if (result?.success) {
                const provider = await window.dexteria?.settings?.getProvider?.();
                setClaudeCodeAvailable(provider?.ready ?? false);
            } else {
                setClaudeCodeAvailable(false);
            }
        } catch (err) {
            setClaudeCodeAvailable(false);
        }
        setCheckingClaudeCode(false);
    };

    const handleSelectProvider = (provider: ProviderType) => {
        setSelectedProvider(provider);
        setTestResult(null);

        if (provider === 'claude-code') {
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

    const handleComplete = () => {
        // Pass selected theme ID to parent, theme will be applied when project opens
        onComplete(selectedTheme);
    };

    const handleBack = () => {
        if (step === 'theme') {
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
                        <h1 className="text-2xl font-bold mb-2">Welcome to Dexteria</h1>
                        <p className="text-muted-foreground">
                            {step === 'theme'
                                ? 'Choose a theme for your workspace'
                                : "Let's configure your AI provider to get started"
                            }
                        </p>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center justify-center gap-2 mb-8">
                        {[1, 2, 3, 4].map((num, idx) => (
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
                                {idx < 3 && <div className="w-8 h-0.5 bg-border" />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step: Select Provider */}
                    {step === 'select' && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-center mb-4">
                                Choose your AI Provider
                            </h2>

                            {checkingClaudeCode ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label="Checking Claude Code CLI..." />
                                </div>
                            ) : (
                                <div className="space-y-3">
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
                                                            Detected
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                                        Recommended
                                                    </span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Uses the Claude Code CLI for powerful agentic capabilities.
                                                    {!claudeCodeAvailable && " Requires installation."}
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
                                                    <span className="font-semibold">Anthropic API</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    Direct API access. Requires an API key from Anthropic.
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
                                {selectedProvider === 'claude-code'
                                    ? 'Install Claude Code CLI'
                                    : 'Enter your API Key'
                                }
                            </h2>

                            {selectedProvider === 'claude-code' && !claudeCodeAvailable && (
                                <div className="space-y-4">
                                    <AlertBanner
                                        variant="warning"
                                        title="Claude Code CLI not found"
                                        description="Install the CLI to use Claude Code with Dexteria."
                                    />

                                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                        <p className="text-sm font-medium">Installation steps:</p>
                                        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                                            <li>Open a terminal</li>
                                            <li>Run: <code className="bg-background px-1.5 py-0.5 rounded text-foreground">npm install -g @anthropic-ai/claude-code</code></li>
                                            <li>Verify: <code className="bg-background px-1.5 py-0.5 rounded text-foreground">claude --version</code></li>
                                            <li>Click "Check Again" below</li>
                                        </ol>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button variant="ghost" onClick={handleBack}>
                                            Back
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
                                            <span className="ml-2">Check Again</span>
                                        </Button>
                                    </div>

                                    {claudeCodeAvailable && (
                                        <AlertBanner
                                            variant="success"
                                            icon={<CheckCircle size={16} />}
                                            description="Claude Code CLI detected! Click Continue to proceed."
                                        />
                                    )}

                                    {claudeCodeAvailable && (
                                        <Button onClick={() => setStep('test')} className="w-full">
                                            Continue
                                            <ArrowRight size={16} className="ml-2" />
                                        </Button>
                                    )}
                                </div>
                            )}

                            {selectedProvider === 'anthropic' && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-muted/50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-3">
                                            Get your API key from the Anthropic Console:
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
                                            API Key
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
                                                    Continue
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
                                Test Connection
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
                                        {selectedProvider === 'claude-code' ? 'Claude Code CLI' : 'Anthropic API'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {isTesting
                                            ? 'Testing connection...'
                                            : testResult?.success
                                                ? 'Connection successful!'
                                                : testResult
                                                    ? 'Connection failed'
                                                    : 'Click below to test the connection'
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
                                    Back
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
                                                Test Connection
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
                                Choose a Theme
                            </h2>

                            {loadingThemes ? (
                                <div className="flex items-center justify-center py-8">
                                    <Spinner size="md" label="Loading themes..." />
                                </div>
                            ) : presetThemes.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No preset themes found.</p>
                                    <p className="text-sm mt-2">Add theme files to assets/themes/</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {presetThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setSelectedTheme(theme.id)}
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
                                You can change your theme later in Settings
                            </p>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={handleBack}>
                                    Back
                                </Button>
                                <Button
                                    onClick={handleComplete}
                                    className="flex-1"
                                    disabled={loadingThemes}
                                >
                                    <Palette size={16} className="mr-2" />
                                    Get Started
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
