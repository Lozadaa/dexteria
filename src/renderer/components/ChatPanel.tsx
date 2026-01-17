import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChats } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';
import { Send, Plus, MessageSquare, Bot, User, History, X, Check, StopCircle, FileText, AlertTriangle, Trash2, Cpu, ChevronDown } from 'lucide-react';
import { MarkdownRenderer, ThinkingIndicator } from './MarkdownRenderer';
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

// Creative placeholders for the chat input
const CHAT_PLACEHOLDERS = [
    "Ask me to build something amazing...",
    "What shall we create today?",
    "Describe your next feature...",
    "Tell me about that bug you're hunting...",
    "What code needs my attention?",
    "Ready to ship something cool?",
    "Let's turn your idea into code...",
    "What's on your dev wishlist?",
    "Paint me a picture of your next feature...",
    "Got a challenge for me?",
    "What should we refactor today?",
    "Bring me your wildest requirements...",
    "Let's squash some bugs together...",
    "What's blocking your progress?",
    "Describe the dream feature...",
    "What would make your life easier?",
    "Got an idea brewing?",
    "Let's architect something great...",
    "What needs fixing?",
    "How can I help ship faster?",
];

interface ChatPanelProps {
    className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ className }) => {
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
    const {
        mode,
        showFirstMessageWarning,
        triggerFirstMessageWarning,
        dismissFirstMessageWarning,
        switchToAgentAndClose
    } = useMode();

    // Load provider info on mount
    useEffect(() => {
        window.dexteria?.settings?.getProvider?.().then((info) => {
            if (info) {
                setCurrentProvider(info.type);
                setProviderName(info.name);
            }
        });
    }, []);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const userScrolledUpRef = useRef(false);

    // Random placeholder that changes when chat changes
    const randomPlaceholder = useMemo(() => {
        return CHAT_PLACEHOLDERS[Math.floor(Math.random() * CHAT_PLACEHOLDERS.length)];
    }, [activeChatId]);

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
            console.log('Stream update:', data.chatId, 'active:', activeChatId, 'done:', data.done, 'isNewMessage:', data.isNewMessage);
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

        // Create abort controller for this request
        abortControllerRef.current = new AbortController();

        // Add only user message immediately
        const tempUserMsg: ChatMessage = {
            id: `temp-user-${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, tempUserMsg]);

        try {
            // Send message and get response with timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 600000); // 10 min timeout
            });

            const response = await Promise.race([
                window.dexteria.chat.sendMessage(activeChatId, userMessage, mode),
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
            // Add error message
            const errorContent = `Error: ${err instanceof Error ? err.message : 'Failed to get response'}. Please try again.`;
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
            const newChat = await window.dexteria.chat.create("New Conversation") as unknown as Chat;
            setActiveChatId(newChat.id);
            setActiveChat(newChat);
            setMessages([]);
            setShowHistory(false);
            refresh();
        } catch (err) {
            console.error(err);
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
        } catch (err) {
            console.error('Failed to delete chat:', err);
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
                            title="Chat History"
                        >
                            <History size={16} />
                        </IconButton>

                        {/* History Popup */}
                        {showHistory && (
                            <div className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-scale-in origin-top-left">
                                <div className="p-2 border-b border-border flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        History
                                    </span>
                                    <IconButton
                                        variant="ghost"
                                        size="xs"
                                        onClick={() => setShowHistory(false)}
                                    >
                                        <X size={12} />
                                    </IconButton>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {chatsWithMessages.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-xs">
                                            No conversations yet
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
                                                        {chat.title || "Untitled"}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {chat.messages?.length || 0} messages
                                                    </div>
                                                </div>
                                                <IconButton
                                                    variant="ghost"
                                                    size="xs"
                                                    onClick={(e) => handleDeleteChat(chat.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-muted-foreground hover:text-red-500"
                                                    title="Delete conversation"
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
                                        New Conversation
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
                    title="New Chat"
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
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground animate-fade-in">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-border/30 animate-scale-in">
                            <MessageSquare size={40} className="text-primary/40 mb-3 mx-auto" />
                            <p className="text-sm text-center opacity-70">Start a conversation with Dexter</p>
                            <p className="text-xs text-center opacity-40 mt-1">Ask anything about your project</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
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
                                {/* Message bubble */}
                                <div className={cn(
                                    "p-3 rounded-2xl text-sm leading-relaxed break-words overflow-hidden transition-all duration-200",
                                    msg.role === 'user'
                                        ? "bg-gradient-to-br from-primary to-primary/90 text-white rounded-tr-md whitespace-pre-wrap shadow-md hover:shadow-lg hover:shadow-primary/20"
                                        : "bg-card border border-border/50 rounded-tl-md shadow-sm hover:shadow-md hover:border-border"
                                )}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <MarkdownRenderer content={msg.content} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Completed streaming messages (from delimiter splits) */}
                        {isSending && streamingMessages.map((content, idx) => (
                            <div
                                key={`streaming-complete-${idx}`}
                                className="flex gap-3 max-w-[85%] mr-auto animate-slide-in-left"
                            >
                                {/* Avatar - rounded square */}
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20">
                                    <Bot size={16} />
                                </div>
                                {/* Message bubble */}
                                <div className="p-3 rounded-2xl rounded-tl-md bg-card border border-border/50 text-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
                                    <MarkdownRenderer content={content} />
                                </div>
                            </div>
                        ))}

                        {/* Current streaming message (in progress) */}
                        {isSending && (
                            <div className="flex gap-3 max-w-[85%] mr-auto animate-slide-in-left">
                                {/* Avatar - rounded square matching message history */}
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-primary/30 to-primary/10 text-primary shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-lg hover:shadow-primary/20">
                                    <Bot size={16} className="animate-pulse" />
                                </div>
                                <div className="p-3 rounded-2xl rounded-tl-md bg-card border border-border/50 text-sm shadow-sm transition-all duration-200 hover:shadow-md hover:border-border">
                                    {streamingContent ? (
                                        <div className="break-words">
                                            <MarkdownRenderer content={streamingContent} />
                                            {/* Loading indicator after content */}
                                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                                                <span className="flex gap-0.5">
                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <ThinkingIndicator />
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-3 border-t border-border">
                {/* Mode and Provider indicator */}
                <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                    <div className={cn(
                        "flex items-center gap-2",
                        mode === 'planner' ? "text-yellow-500/80" : "text-green-500/80"
                    )}>
                        <FileText size={12} />
                        <span>
                            {mode === 'planner'
                                ? "Planner Mode: analyze & plan"
                                : "Agent Mode: create tasks"
                            }
                        </span>
                    </div>

                    {/* Provider Selector */}
                    <DropdownMenuRoot>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                                <Cpu size={12} />
                                <span className="font-medium">{providerName}</span>
                                <ChevronDown size={10} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>AI Provider</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                                value={currentProvider}
                                onValueChange={async (value) => {
                                    const result = await window.dexteria?.settings?.setProvider?.(value as 'mock' | 'anthropic' | 'claude-code');
                                    if (result?.success) {
                                        setCurrentProvider(value);
                                        setProviderName(result.provider);
                                    }
                                }}
                            >
                                <DropdownMenuRadioItem value="claude-code">
                                    <div className="flex flex-col">
                                        <span>Claude Code</span>
                                        <span className="text-xs text-muted-foreground">Uses CLI (recommended)</span>
                                    </div>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="anthropic">
                                    <div className="flex flex-col">
                                        <span>Anthropic API</span>
                                        <span className="text-xs text-muted-foreground">Direct API (requires key)</span>
                                    </div>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="mock">
                                    <div className="flex flex-col">
                                        <span>Mock</span>
                                        <span className="text-xs text-muted-foreground">For testing</span>
                                    </div>
                                </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenuRoot>
                </div>
                <div className="flex gap-2">
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
                        placeholder={isSending ? "Waiting for response..." : (activeChatId ? randomPlaceholder : "Creating chat...")}
                        disabled={!activeChatId}
                        className="flex-1 min-h-[40px] max-h-[200px] resize-y"
                        rows={1}
                    />
                    {isSending ? (
                        <Button
                            variant="danger"
                            onClick={handleCancel}
                            title="Cancel"
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
                            <DialogTitle>Planner Mode</DialogTitle>
                        </div>
                    </DialogHeader>
                    <div className="p-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            You are in <strong className="text-foreground">Planner Mode</strong>.
                            The AI will help you plan and create tasks, but won't execute any code changes.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Switch to <strong className="text-foreground">Agent Mode</strong> if you want
                            the AI to execute tasks automatically.
                        </p>

                        {/* Don't show again toggle */}
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                            <Switch
                                size="sm"
                                checked={dontShowAgainChecked}
                                onCheckedChange={setDontShowAgainChecked}
                            />
                            Don't show this again
                        </label>
                    </div>
                    <DialogFooter className="p-4 border-t border-border">
                        <Button variant="ghost" onClick={handleCancelWarning}>
                            Cancel
                        </Button>
                        <Button variant="secondary" onClick={handleContinueInPlanner}>
                            Continue in Planner
                        </Button>
                        <Button onClick={handleSwitchToAgent}>
                            Switch to Agent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>
        </div>
    );
};
