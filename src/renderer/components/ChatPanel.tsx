import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChats } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';
import { Send, Plus, MessageSquare, Bot, User, History, X, Check, StopCircle, AlertTriangle, Trash2, Cpu, ChevronDown, Paperclip, File, Play, Eye, Lightbulb, Code, Bug, FileSearch } from 'lucide-react';
import { MarkdownRenderer, ThinkingIndicator, ThinkingBlock, extractThinking } from './MarkdownRenderer';
import {
    Button,
    IconButton,
    Textarea,
    ScrollArea,
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    Switch,
    DropdownMenuRoot,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from 'adnia-ui';
import type { Chat, ChatMessage } from '../../shared/types';

import { useTranslation } from '../i18n/useTranslation';

interface ChatPanelProps {
    className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className }) => {
    const { t } = useTranslation();
    const { error: showError, success } = useToast();
    const { chats, refresh } = useChats();
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [activeChat, setActiveChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [streamingContent, setStreamingContent] = useState<string>('');
    const [streamingMessages, setStreamingMessages] = useState<string[]>([]); // Completed messages during streaming
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<string>('claude-code');
    const [providerName, setProviderName] = useState<string>('Claude Code');
    const [availableProviders, setAvailableProviders] = useState<Array<{
        type: string;
        name: string;
        description: string;
        available: boolean;
    }>>([]);
    const [changingProvider, setChangingProvider] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<string[]>([]); // Array of file paths
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const [taskRunRequest, setTaskRunRequest] = useState<{ taskId: string; taskTitle: string; reason: string } | null>(null);
    const [isExecutingTask, setIsExecutingTask] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {
        mode,
        showFirstMessageWarning,
        triggerFirstMessageWarning,
        dismissFirstMessageWarning,
        switchToAgentAndClose
    } = useMode();

    // Load provider info and available providers on mount
    useEffect(() => {
        const loadProviders = async () => {
            try {
                const [providerInfo, availableInfo] = await Promise.all([
                    window.dexteria?.settings?.getProvider?.(),
                    window.dexteria?.settings?.getAvailableProviders?.()
                ]);

                if (providerInfo) {
                    setCurrentProvider(providerInfo.type);
                    setProviderName(providerInfo.name);
                }

                if (availableInfo?.providers) {
                    setAvailableProviders(availableInfo.providers);
                }
            } catch (err) {
                console.error('Failed to load providers:', err);
            }
        };

        loadProviders();
    }, []);

    // Handle provider change
    const handleProviderChange = async (providerType: string) => {
        if (providerType === currentProvider || changingProvider) return;

        setChangingProvider(true);
        try {
            const result = await window.dexteria?.settings?.setProvider?.(providerType as 'opencode' | 'codex' | 'claude-code' | 'anthropic' | 'mock');
            if (result?.success) {
                setCurrentProvider(providerType);
                setProviderName(result.provider);
            } else {
                console.error('Failed to change provider:', result?.error);
                showError(t('views.chat.providerChangeFailed'));
            }
        } catch (err) {
            console.error('Failed to change provider:', err);
            showError(t('views.chat.providerChangeFailed'));
        } finally {
            setChangingProvider(false);
        }
    };

    // File attachment handlers
    const handleFileSelect = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const paths = Array.from(files).map(f => (f as any).path || f.name);
            setAttachedFiles(prev => [...new Set([...prev, ...paths])]);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleRemoveFile = useCallback((filePath: string) => {
        setAttachedFiles(prev => prev.filter(f => f !== filePath));
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const paths = Array.from(files).map(f => (f as any).path || f.name);
            setAttachedFiles(prev => [...new Set([...prev, ...paths])]);
        }
    }, []);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const userScrolledUpRef = useRef(false);

    // Random placeholder that changes when chat changes (from i18n)
    const randomPlaceholder = useMemo(() => {
        const placeholders = t('chatPlaceholders', { returnObjects: true }) as string[];
        if (Array.isArray(placeholders) && placeholders.length > 0) {
            return placeholders[Math.floor(Math.random() * placeholders.length)];
        }
        return t('placeholders.typeMessage');
    }, [activeChatId, t]);

    // Filter chats to only show ones with messages (non-empty)
    const chatsWithMessages = chats.filter(c => c.messages && c.messages.length > 0);

    // Create a new chat on mount (but don't save it until a message is sent)
    useEffect(() => {
        if (!activeChatId) {
            handleCreateChat();
        }
    }, []);

    // Load messages when active chat changes
    useEffect(() => {
        if (activeChatId) {
            const chat = chats.find(c => c.id === activeChatId);
            if (chat) {
                setActiveChat(chat);
                setMessages(chat.messages || []);
            }
        }
    }, [activeChatId, chats]);

    // Scroll to bottom only if user hasn't scrolled up
    useEffect(() => {
        if (!userScrolledUpRef.current) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingContent]);

    // Detect if user scrolled up
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        userScrolledUpRef.current = !isNearBottom;
    }, []);

    // Reset scroll flag when sending a new message
    useEffect(() => {
        if (isSending) {
            userScrolledUpRef.current = false;
        }
    }, [isSending]);

    // Auto-resize textarea
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue, adjustTextareaHeight]);

    // Close history popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
                setShowHistory(false);
            }
        };
        if (showHistory) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showHistory]);

    // Listen for streaming updates
    useEffect(() => {
        const cleanup = window.dexteria?.chat?.onStreamUpdate?.((data) => {
            if (data.chatId === activeChatId) {
                if (data.done) {
                    // Reset streaming content when done
                    setStreamingContent('');
                    setStreamingMessages([]);
                } else if (data.isNewMessage) {
                    // A new message was completed - add it to streaming messages
                    setStreamingMessages(prev => {
                        // Only add if content is different from last message
                        if (prev.length === 0 || prev[prev.length - 1] !== data.content) {
                            return [...prev, data.content];
                        }
                        return prev;
                    });
                    setStreamingContent(''); // Reset current streaming for next message
                } else {
                    // Replace streaming content with latest (backend filters JSON before sending)
                    setStreamingContent(data.content);
                }
            }
        });

        return () => cleanup?.();
    }, [activeChatId]);

    // Listen for task run requests from AI
    useEffect(() => {
        const cleanup = window.dexteria?.chat?.onTaskRunRequested?.((data) => {
            setTaskRunRequest(data);
        });

        return () => cleanup?.();
    }, []);

    const handleCancel = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Remove the streaming assistant message
        setMessages(prev => prev.filter(m => m.id !== 'streaming-response'));
        setIsSending(false);
        setStreamingContent('');
        setStreamingMessages([]);
        abortControllerRef.current = null;
    }, []);

    const handleSendMessage = async (messageOverride?: string) => {
        const userMessage = (messageOverride || inputValue).trim();
        if (!userMessage || !activeChatId || isSending) return;

        // Check if this is the first message and we need to show warning
        if (messages.length === 0 && !messageOverride) {
            const warningShown = triggerFirstMessageWarning();
            if (warningShown) {
                setPendingMessage(userMessage);
                return;
            }
        }

        setInputValue('');
        setIsSending(true);
        setStreamingContent('');
        setStreamingMessages([]);
        setPendingMessage(null);
        const filesToSend = [...attachedFiles]; // Copy before clearing
        setAttachedFiles([]); // Clear attached files

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Add only user message immediately (include attached files for display)
        const tempUserMsg: ChatMessage = {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
            attachedFiles: filesToSend.length > 0 ? filesToSend : undefined,
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            // Send message and get response with timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 600000); // 10 min timeout
            });

            const response = await Promise.race([
                window.dexteria.chat.sendMessage(activeChatId, userMessage, mode, filesToSend),
                timeoutPromise
            ]) as ChatMessage;

            // Check if cancelled
            if (abortControllerRef.current?.signal.aborted) {
                return;
            }

            // Set final content first, then add message and stop sending atomically
            setStreamingContent(response.content);
            // Small delay to ensure the streaming bubble shows final content before switching
            await new Promise(r => setTimeout(r, 50));
            setMessages(prev => [...prev, response]);
            setIsSending(false);
            setStreamingContent('');
            refresh();
        } catch (err) {
            // Don't show error if it was cancelled
            if (abortControllerRef.current?.signal.aborted) {
                return;
            }
            console.error(err);
            // Add error message with specific timeout handling
            const isTimeout = err instanceof Error && err.message === 'Request timeout';
            const errorContent = isTimeout
                ? t('views.chat.requestTimeout')
                : `${t('views.chat.errorPrefix')}: ${err instanceof Error ? err.message : 'Failed to get response'}. ${t('views.chat.tryAgainSuffix')}`;
            setStreamingContent(errorContent);
            await new Promise(r => setTimeout(r, 50));
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant' as const,
                content: errorContent,
                timestamp: Date.now(),
            }]);
            setIsSending(false);
            setStreamingContent('');
        } finally {
            abortControllerRef.current = null;
        }
    };

    const handleCreateChat = async () => {
        try {
            const newChat = await window.dexteria.chat.create(t('views.chat.newConversation')) as unknown as Chat;
            setActiveChatId(newChat.id);
            setActiveChat(newChat);
            setMessages([]);
            setShowHistory(false);
            refresh();
        } catch (err) {
            console.error(err);
            showError(t('toasts.chatCreateFailed'));
        }
    };

    const handleSelectChat = (chatId: string) => {
        setActiveChatId(chatId);
        setShowHistory(false);
    };

    const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await window.dexteria.chat.delete(chatId);
            // If deleted chat was active, create a new one
            if (activeChatId === chatId) {
                handleCreateChat();
            }
            refresh();
            success(t('toasts.chatDeleted'));
        } catch (err) {
            console.error('Failed to delete chat:', err);
            showError(t('toasts.chatDeleteFailed'));
        }
    };

    // Handle warning modal actions
    const handleContinueInPlanner = () => {
        dismissFirstMessageWarning(dontShowAgainChecked);
        setDontShowAgainChecked(false);
        if (pendingMessage) {
            handleSendMessage(pendingMessage);
        }
    };

    const handleSwitchToAgent = () => {
        switchToAgentAndClose();
        setDontShowAgainChecked(false);
        if (pendingMessage) {
            // Small delay to let mode switch propagate
            setTimeout(() => handleSendMessage(pendingMessage), 100);
        }
    };

    const handleCancelWarning = () => {
        dismissFirstMessageWarning(false);
        setPendingMessage(null);
        setDontShowAgainChecked(false);
    };

    // Task run request handlers
    const handleConfirmTaskRun = async () => {
        if (!taskRunRequest) return;

        setIsExecutingTask(true);
        try {
            await window.dexteria.agent.runTask(taskRunRequest.taskId);
            // Add a system message to the chat about the task execution
            setMessages(prev => [...prev, {
                id: `system-${Date.now()}`,
                role: 'assistant' as const,
                content: `✅ Task "${taskRunRequest.taskTitle}" has been started in the TaskRunner panel. Check the panel for execution progress.`,
                timestamp: Date.now(),
            }]);
        } catch (err) {
            console.error('Failed to run task:', err);
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant' as const,
                content: `❌ Failed to start task: ${err instanceof Error ? err.message : 'Unknown error'}`,
                timestamp: Date.now(),
            }]);
        } finally {
            setIsExecutingTask(false);
            setTaskRunRequest(null);
        }
    };

    const handleCancelTaskRun = () => {
        setTaskRunRequest(null);
    };

    return (
        <div className={cn("flex flex-col h-full w-full overflow-hidden bg-background", className)}>
            {/* Header with history button on LEFT */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* History button on the left */}
                    <div className="relative" ref={historyRef}>
                        <IconButton
                            variant={showHistory ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            title={t('views.chat.chatHistory')}
                            aria-label={t('views.chat.chatHistory')}
                        >
                            <History size={16} />
                        </IconButton>

                        {/* History Popup */}
                        {showHistory && (
                            <div className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in origin-top-left">
                                <div className="p-2 border-b border-border flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {t('views.chat.history')}
                                    </span>
                                    <IconButton
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setShowHistory(false)}
                                        aria-label={t('actions.close')}
                                    >
                                        <X size={12} />
                                    </IconButton>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {chatsWithMessages.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-xs">
                                            {t('views.chat.noConversations')}
                                        </div>
                                    ) : (
                                        chatsWithMessages.map(chat => (
                                            <div
                                                key={chat.id}
                                                onClick={() => handleSelectChat(chat.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer group",
                                                    activeChatId === chat.id && "bg-primary/10"
                                                )}
                                            >
                                                <MessageSquare size={14} className="text-muted-foreground shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm truncate">
                                                        {chat.title || t('views.chat.untitled')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('views.chat.messagesCount', { count: chat.messages?.length || 0 })}
                                                    </div>
                                                </div>
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
                                                    title={t('views.chat.deleteConversation')}
                                                    aria-label={t('views.chat.deleteConversation')}
                                                >
                                                    <Trash2 size={12} />
                                                </IconButton>
                                                {activeChatId === chat.id && (
                                                    <Check size={14} className="text-primary shrink-0" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-border">
                                    <Button
                                        onClick={handleCreateChat}
                                        className="w-full"
                                        size="sm"
                                    >
                                        <Plus size={14} />
                                        {t('views.chat.newConversation')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Bot size={18} className="text-primary" />
                    <span className="text-sm font-medium">
                        {activeChat?.title || 'Chat'}
                    </span>
                </div>

                <IconButton
                    variant="ghost"
                    size="sm"
                    onClick={handleCreateChat}
                    title={t('views.chat.newChat')}
                    aria-label={t('views.chat.newChat')}
                >
                    <Plus size={16} />
                </IconButton>
            </div>

            {/* Messages Area */}
            <ScrollArea
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 p-4 space-y-4"
            >
                {messages.length === 0 && !isSending ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-fade-in px-4">
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-border/30 animate-scale-in max-w-md w-full">
                            <MessageSquare size={40} className="text-primary/40 mb-3 mx-auto" />
                            <p className="text-sm text-center opacity-70 mb-1">{t('views.chat.startConversation')}</p>
                            <p className="text-xs text-center opacity-40 mb-4">{t('views.chat.askAnything')}</p>

                            {/* Suggested prompts */}
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground/70 mb-2">{t('views.chat.suggestions')}</p>
                                <button
                                    type="button"
                                    onClick={() => setInputValue(t('views.chat.suggestPlan'))}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs flex items-center gap-2 group"
                                >
                                    <Lightbulb size={14} className="text-yellow-500/70 group-hover:text-yellow-500" />
                                    <span className="text-muted-foreground group-hover:text-foreground">{t('views.chat.suggestPlan')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputValue(t('views.chat.suggestAnalyze'))}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs flex items-center gap-2 group"
                                >
                                    <FileSearch size={14} className="text-blue-500/70 group-hover:text-blue-500" />
                                    <span className="text-muted-foreground group-hover:text-foreground">{t('views.chat.suggestAnalyze')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputValue(t('views.chat.suggestFix'))}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs flex items-center gap-2 group"
                                >
                                    <Bug size={14} className="text-red-500/70 group-hover:text-red-500" />
                                    <span className="text-muted-foreground group-hover:text-foreground">{t('views.chat.suggestFix')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputValue(t('views.chat.suggestCreate'))}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-xs flex items-center gap-2 group"
                                >
                                    <Code size={14} className="text-green-500/70 group-hover:text-green-500" />
                                    <span className="text-muted-foreground group-hover:text-foreground">{t('views.chat.suggestCreate')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => {
                            // Extract thinking for assistant messages
                            const { thinking, content: cleanContent, isThinkingComplete } =
                                msg.role === 'assistant' ? extractThinking(msg.content) : { thinking: null, content: msg.content, isThinkingComplete: true };

                            return (
                                <div
                                    key={msg.id || idx}
                                    className={cn(
                                        "flex gap-3 max-w-[85%] group",
                                        msg.role === 'user'
                                            ? "ml-auto flex-row-reverse animate-slide-in-right"
                                            : "mr-auto animate-slide-in-left"
                                    )}
                                    style={{ animationDelay: `${Math.min(idx * 50, 200)}ms`, animationFillMode: 'both' }}
                                >
                                    {/* Avatar - rounded square */}
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 hover:scale-110 hover:shadow-lg",
                                        msg.role === 'user'
                                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-primary/30"
                                            : "bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-sm hover:shadow-primary/20"
                                    )}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    {/* Message content with optional thinking above */}
                                    <div className="flex flex-col">
                                        {/* Thinking block above the bubble */}
                                        {thinking && (
                                            <ThinkingBlock content={thinking} isComplete={isThinkingComplete} />
                                        )}
                                        {/* Message bubble */}
                                        <div className={cn(
                                            "p-3 rounded-2xl text-sm leading-relaxed break-words overflow-hidden transition-all duration-200",
                                            msg.role === 'user'
                                                ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-tr-md whitespace-pre-wrap shadow-md hover:shadow-lg hover:shadow-primary/20"
                                                : "bg-card border border-border/50 rounded-tl-md shadow-sm hover:shadow-md hover:border-border"
                                        )}>
                                            {msg.role === 'user' ? (
                                                <>
                                                    {cleanContent}
                                                    {/* Show attached files */}
                                                    {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1.5">
                                                            {msg.attachedFiles.map((filePath, fileIdx) => {
                                                                const fileName = filePath.split(/[/\\]/).pop() || filePath;
                                                                return (
                                                                    <span
                                                                        key={fileIdx}
                                                                        className="inline-flex items-center gap-1 text-xs text-sky-200 hover:text-sky-100"
                                                                        title={filePath}
                                                                    >
                                                                        <Paperclip size={10} />
                                                                        <span className="underline underline-offset-2">{fileName}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <MarkdownRenderer content={cleanContent} />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Completed streaming messages (from delimiter splits) */}
                        {isSending && streamingMessages.map((content, idx) => {
                            const { thinking, content: cleanContent, isThinkingComplete } = extractThinking(content);
                            return (
                                <div
                                    key={`streaming-complete-${idx}`}
                                    className="flex gap-3 max-w-[85%] mr-auto animate-slide-in-left"
                                >
                                    {/* Avatar - rounded square */}
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20">
                                        <Bot size={16} />
                                    </div>
                                    {/* Message content with optional thinking above */}
                                    <div className="flex flex-col">
                                        {thinking && (
                                            <ThinkingBlock content={thinking} isComplete={isThinkingComplete} />
                                        )}
                                        <div className="p-3 rounded-2xl rounded-tl-md bg-card border border-border/50 text-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
                                            <MarkdownRenderer content={cleanContent} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Current streaming message (in progress) */}
                        {isSending && (() => {
                            const { thinking, content: cleanContent, isThinkingComplete } = extractThinking(streamingContent || '');
                            return (
                                <div className="flex gap-3 max-w-[85%] mr-auto animate-slide-in-left">
                                    {/* Avatar - rounded square matching message history */}
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20">
                                        <Bot size={16} className="animate-pulse" />
                                    </div>
                                    <div className="flex flex-col">
                                        {/* Thinking block above bubble while streaming */}
                                        {thinking && (
                                            <ThinkingBlock content={thinking} isComplete={isThinkingComplete} />
                                        )}
                                        <div className="p-3 rounded-2xl rounded-tl-md bg-card border border-border/50 text-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
                                            {cleanContent ? (
                                                <div className="break-words">
                                                    <MarkdownRenderer content={cleanContent} />
                                                    {/* Loading indicator after content */}
                                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                                                        <span className="flex gap-0.5">
                                                            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : thinking ? (
                                                // If only thinking, show minimal indicator
                                                <div className="flex items-center gap-1 text-muted-foreground/50 text-xs">
                                                    <span>{t('views.chat.formulatingResponse')}</span>
                                                    <span className="flex gap-0.5">
                                                        <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </span>
                                                </div>
                                            ) : (
                                                <ThinkingIndicator />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
                <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div
                className={cn(
                    "p-3 border-t border-border transition-colors",
                    isDraggingFile && "bg-primary/5 border-primary/30"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                />

                {/* Attached files chips */}
                {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {attachedFiles.map((filePath) => {
                            const fileName = filePath.split(/[/\\]/).pop() || filePath;
                            return (
                                <div
                                    key={filePath}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full border border-primary/20 group hover:bg-primary/20 transition-colors"
                                    title={filePath}
                                >
                                    <File size={12} />
                                    <span className="max-w-[150px] truncate">{fileName}</span>
                                    <button
                                        onClick={() => handleRemoveFile(filePath)}
                                        className="ml-0.5 p-0.5 rounded-full hover:bg-primary/30 transition-colors"
                                        aria-label={t('actions.remove')}
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Drag overlay hint */}
                {isDraggingFile && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-primary/40 pointer-events-none z-10">
                        <div className="flex flex-col items-center gap-2 text-primary">
                            <Paperclip size={24} />
                            <span className="text-sm font-medium">{t('views.chat.dropFilesToAttach')}</span>
                        </div>
                    </div>
                )}

                {/* Mode and Provider indicator */}
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <div
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition-colors",
                            mode === 'planner'
                                ? "bg-yellow-500/15 text-yellow-500 border border-yellow-500/30"
                                : "bg-green-500/15 text-green-500 border border-green-500/30"
                        )}
                        title={mode === 'planner'
                            ? t('views.chat.plannerModeTooltip')
                            : t('views.chat.agentModeTooltip')
                        }
                    >
                        {mode === 'planner' ? <Eye size={14} /> : <Bot size={14} />}
                        <span>
                            {mode === 'planner'
                                ? t('views.chat.plannerModeLabel')
                                : t('views.chat.agentModeLabel')
                            }
                        </span>
                    </div>

                    {/* Provider Selector */}
                    <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                                disabled={changingProvider}
                            >
                                <Cpu size={12} className={changingProvider ? 'animate-spin' : ''} />
                                <span className="font-medium">{providerName}</span>
                                <ChevronDown size={10} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>{t('views.chat.aiProvider')}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup value={currentProvider} onValueChange={handleProviderChange}>
                                {availableProviders.map((provider) => (
                                    <DropdownMenuRadioItem
                                        key={provider.type}
                                        value={provider.type}
                                        disabled={!provider.available}
                                    >
                                        <div className="flex flex-col">
                                            <span>{provider.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {provider.available ? provider.description : 'Not installed'}
                                            </span>
                                        </div>
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenuRoot>
                </div>
                <div className="flex gap-2 items-end">
                    {/* Attach file button */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFileSelect}
                        disabled={!activeChatId}
                        className="shrink-0 h-10 w-10 p-0"
                        title={t('tooltips.attachFiles')}
                    >
                        <Paperclip size={18} className={attachedFiles.length > 0 ? "text-primary" : ""} />
                    </Button>
                    <Textarea
                        ref={textareaRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={isSending ? t('placeholders.waitingForResponse') : (activeChatId ? randomPlaceholder : t('placeholders.creatingChat'))}
                        disabled={!activeChatId}
                        className="flex-1 min-h-[40px] max-h-[200px] resize-y"
                        rows={1}
                    />
                    {isSending ? (
                        <Button
                            variant="danger"
                            onClick={handleCancel}
                            title={t('actions.cancel')}
                            className="animate-pulse"
                        >
                            <StopCircle size={16} />
                        </Button>
                    ) : (
                        <Button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || !activeChatId}
                            className={cn(
                                "transition-all duration-200",
                                inputValue.trim() && activeChatId
                                    ? "shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
                                    : ""
                            )}
                        >
                            <Send size={16} />
                        </Button>
                    )}
                </div>
            </div>

            {/* First Message Warning Modal */}
            <DialogRoot open={showFirstMessageWarning} onOpenChange={(open) => !open && handleCancelWarning()}>
                <DialogContent size="md" className="p-0">
                    <DialogHeader className="p-4 border-b border-border bg-yellow-500/10">
                        <div className="flex items-center gap-2 text-yellow-500">
                            <AlertTriangle size={20} />
                            <DialogTitle>{t('views.chat.plannerModeTitle')}</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <p
                            className="text-sm text-muted-foreground [&_strong]:text-foreground"
                            dangerouslySetInnerHTML={{ __html: t('views.chat.plannerModeWarning') }}
                        />
                        <p
                            className="text-sm text-muted-foreground [&_strong]:text-foreground"
                            dangerouslySetInnerHTML={{ __html: t('views.chat.switchToAgentHint') }}
                        />

                        {/* Don't show again toggle */}
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <Switch
                                size="sm"
                                checked={dontShowAgainChecked}
                                onCheckedChange={setDontShowAgainChecked}
                            />
                            {t('views.chat.dontShowAgain')}
                        </label>
                    </div>
                    <DialogFooter className="p-4 border-t border-border">
                        <Button variant="ghost" onClick={handleCancelWarning}>
                            {t('actions.cancel')}
                        </Button>
                        <Button variant="secondary" onClick={handleContinueInPlanner}>
                            {t('views.chat.continueInPlanner')}
                        </Button>
                        <Button onClick={handleSwitchToAgent}>
                            {t('views.chat.switchToAgent')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>

            {/* Task Run Request Modal */}
            <DialogRoot open={taskRunRequest !== null} onOpenChange={(open) => !open && handleCancelTaskRun()}>
                <DialogContent size="md" className="p-0">
                    <DialogHeader className="p-4 border-b border-border bg-primary/10">
                        <div className="flex items-center gap-2 text-primary">
                            <Play size={20} />
                            <DialogTitle>{t('views.chat.runTaskTitle')}</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            {t('views.chat.aiRequestingTask')}
                        </p>
                        <div className="p-3 bg-muted/50 rounded-lg border border-border">
                            <p className="font-medium text-foreground">
                                {taskRunRequest?.taskTitle}
                            </p>
                            {taskRunRequest?.reason && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    {taskRunRequest.reason}
                                </p>
                            )}
                        </div>
                        <p
                            className="text-sm text-muted-foreground [&_strong]:text-foreground"
                            dangerouslySetInnerHTML={{ __html: t('views.chat.taskRunnerHint') }}
                        />
                    </div>
                    <DialogFooter className="p-4 border-t border-border">
                        <Button variant="ghost" onClick={handleCancelTaskRun} disabled={isExecutingTask}>
                            {t('actions.cancel')}
                        </Button>
                        <Button onClick={handleConfirmTaskRun} disabled={isExecutingTask}>
                            {isExecutingTask ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('actions.starting')}
                                </>
                            ) : (
                                <>
                                    <Play size={16} />
                                    {t('actions.runTask')}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </div>
    );
};
