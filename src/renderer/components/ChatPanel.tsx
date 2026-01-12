import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChats } from '../hooks/useData';
import { useMode } from '../contexts/ModeContext';
import { cn } from '../lib/utils';
import { Send, Plus, MessageSquare, Bot, User, History, X, Check, StopCircle, FileText, AlertTriangle } from 'lucide-react';
import { MarkdownRenderer, ThinkingIndicator } from './MarkdownRenderer';
import type { Chat, ChatMessage } from '../../shared/types';

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
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
    const {
        mode,
        showFirstMessageWarning,
        triggerFirstMessageWarning,
        dismissFirstMessageWarning,
        switchToAgentAndClose
    } = useMode();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const userScrolledUpRef = useRef(false);

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
            console.log('Stream update:', data.chatId, 'active:', activeChatId, 'done:', data.done);
            if (data.chatId === activeChatId) {
                if (data.done) {
                    // Reset streaming content when done
                    setStreamingContent('');
                } else {
                    // Replace streaming content with latest (backend accumulates)
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
                setTimeout(() => reject(new Error('Request timeout')), 120000); // 2 min timeout
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
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={cn(
                                "p-2 hover:bg-muted rounded-lg transition-colors",
                                showHistory && "bg-muted"
                            )}
                            title="Chat History"
                        >
                            <History size={16} />
                        </button>

                        {/* History Popup */}
                        {showHistory && (
                            <div className="absolute left-0 top-full mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                                <div className="p-2 border-b border-border flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        History
                                    </span>
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="p-1 hover:bg-muted rounded"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto">
                                    {chatsWithMessages.length === 0 ? (
                                        <div className="p-4 text-center text-muted-foreground text-xs">
                                            No conversations yet
                                        </div>
                                    ) : (
                                        chatsWithMessages.map(chat => (
                                            <button
                                                key={chat.id}
                                                onClick={() => handleSelectChat(chat.id)}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-muted transition-colors",
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
                                                {activeChatId === chat.id && (
                                                    <Check size={14} className="text-primary shrink-0" />
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                                <div className="p-2 border-t border-border">
                                    <button
                                        onClick={handleCreateChat}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus size={14} />
                                        New Conversation
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <Bot size={18} className="text-primary" />
                    <span className="text-sm font-medium">
                        {activeChat?.title || 'Chat'}
                    </span>
                </div>
                <button
                    onClick={handleCreateChat}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="New Chat"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Messages Area */}
            <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-4"
            >
                {messages.length === 0 && !isSending ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <MessageSquare size={32} className="mb-2" />
                        <p className="text-sm">Start a conversation with Dexter</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, idx) => (
                            <div
                                key={msg.id || idx}
                                className={cn(
                                    "flex gap-3 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                                )}
                            >
                                <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-primary/20 text-primary"
                                )}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={cn(
                                    "p-3 rounded-xl text-sm leading-relaxed",
                                    msg.role === 'user'
                                        ? "bg-primary text-primary-foreground rounded-br-sm whitespace-pre-wrap"
                                        : "bg-muted border border-border rounded-bl-sm"
                                )}>
                                    {msg.role === 'user' ? (
                                        msg.content
                                    ) : (
                                        <MarkdownRenderer content={msg.content} />
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Assistant response bubble - thinking/streaming/done */}
                        {isSending && (
                            <div className="flex gap-3 max-w-[85%] mr-auto">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-primary/20 text-primary">
                                    <Bot size={14} />
                                </div>
                                <div className="p-3 rounded-xl rounded-bl-sm bg-muted border border-border text-sm">
                                    {streamingContent ? (
                                        <div className="break-words">
                                            <MarkdownRenderer content={streamingContent} />
                                            <span className="inline-block w-1.5 h-4 bg-primary/50 animate-pulse ml-0.5 align-middle" />
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
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
                {/* Mode indicator - just informational, toggle is in TopBar */}
                <div className={cn(
                    "flex items-center gap-2 mb-2 text-xs",
                    mode === 'planner' ? "text-yellow-500/80" : "text-green-500/80"
                )}>
                    <FileText size={12} />
                    <span>
                        {mode === 'planner'
                            ? "Planner Mode: Will create tasks but won't execute"
                            : "Agent Mode: Will create and execute tasks"
                        }
                    </span>
                </div>
                <div className="flex gap-2">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isSending) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={isSending ? "Waiting for response..." : (activeChatId ? "Message Dexter..." : "Creating chat...")}
                        disabled={!activeChatId}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none min-h-[40px] max-h-32"
                        rows={1}
                    />
                    {isSending ? (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                            title="Cancel"
                        >
                            <StopCircle size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSendMessage()}
                            disabled={!inputValue.trim() || !activeChatId}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* First Message Warning Modal */}
            {showFirstMessageWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-yellow-500/10">
                            <div className="flex items-center gap-2 text-yellow-500">
                                <AlertTriangle size={20} />
                                <h3 className="font-semibold">Planner Mode</h3>
                            </div>
                            <button
                                onClick={handleCancelWarning}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You are in <strong className="text-foreground">Planner Mode</strong>.
                                The AI will help you plan and create tasks, but won't execute any code changes.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Switch to <strong className="text-foreground">Agent Mode</strong> if you want
                                the AI to execute tasks automatically.
                            </p>

                            {/* Don't show again checkbox */}
                            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={dontShowAgainChecked}
                                    onChange={(e) => setDontShowAgainChecked(e.target.checked)}
                                    className="rounded border-border"
                                />
                                Don't show this again
                            </label>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    onClick={handleCancelWarning}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleContinueInPlanner}
                                    className="px-4 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
                                >
                                    Continue in Planner
                                </button>
                                <button
                                    onClick={handleSwitchToAgent}
                                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                >
                                    Switch to Agent
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
