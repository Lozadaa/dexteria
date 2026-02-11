/**
 * InterviewScreen
 *
 * Main interview conversation screen with Ralph.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  MessageBubble,
  AutoGrowTextarea,
  ProgressMini,
  InlineActionRow,
  ScrollArea,
} from 'adnia-ui';
import { Bot, User, Send, HelpCircle, SkipForward, Lightbulb, X, Save } from 'lucide-react';
import { useInterviewStore } from '../../stores/interviewStore';
import type { InterviewState } from '../../../shared/types';

interface InterviewScreenProps {
  interview: InterviewState;
  isLoading: boolean;
  onSubmitAnswer: (answer: string) => Promise<void>;
  onSkip: () => Promise<void>;
  onGetOptions: () => Promise<string[]>;
  onGetExample: () => Promise<string>;
  onSaveAndExit: () => Promise<void>;
  onCancel: () => Promise<void>;
}

interface Message {
  id: string;
  type: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export function InterviewScreen({
  interview,
  isLoading,
  onSubmitAnswer,
  onSkip,
  onGetOptions,
  onGetExample,
  onSaveAndExit,
  onCancel,
}: InterviewScreenProps) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [generatingFirstQuestion, setGeneratingFirstQuestion] = useState(false);

  // Subscribe directly to store for currentQuestion to avoid stale prop issues
  const storeCurrentQuestion = useInterviewStore((state) => state.interview?.currentQuestion ?? null);
  const storeAnswers = useInterviewStore((state) => state.interview?.answers ?? []);

  // Use store values (more reliable) with prop fallback
  const currentQuestion = storeCurrentQuestion ?? interview.currentQuestion;
  const answers = storeAnswers.length > 0 ? storeAnswers : interview.answers;

  // Generate first question when entering interview stage without a question
  const questionGenerationStarted = useRef(false);

  useEffect(() => {
    // Only generate if we don't have a question and haven't started yet
    if (!currentQuestion && !questionGenerationStarted.current) {
      questionGenerationStarted.current = true;
      setGeneratingFirstQuestion(true);

      // Call backend to generate first question
      window.dexteria?.interview?.nextQuestion?.()
        .then((question) => {
          if (question) {
            useInterviewStore.getState().setCurrentQuestion(question as any);
          }
        })
        .catch((err) => {
          console.error('[InterviewScreen] Failed to generate first question:', err);
        })
        .finally(() => {
          setGeneratingFirstQuestion(false);
        });
    }
  }, []); // Run only on mount

  // Build messages from interview history and current question
  useEffect(() => {
    const newMessages: Message[] = [];

    // Add past Q&As
    answers.forEach((answer, i) => {
      // Question
      newMessages.push({
        id: `q-${i}`,
        type: 'assistant',
        content: answer.questionText,
        timestamp: new Date(answer.timestamp),
      });

      // Answer (if not skipped)
      if (!answer.skipped) {
        newMessages.push({
          id: `a-${i}`,
          type: 'user',
          content: answer.answer,
          timestamp: new Date(answer.timestamp),
        });
      } else {
        newMessages.push({
          id: `a-${i}`,
          type: 'user',
          content: t('interview.skipped', '(Skipped)'),
          timestamp: new Date(answer.timestamp),
        });
      }
    });

    // Add current question
    if (currentQuestion) {
      newMessages.push({
        id: `current-q`,
        type: 'assistant',
        content: currentQuestion.text,
        timestamp: new Date(),
      });
    }

    setMessages(newMessages);
  }, [answers, currentQuestion, t]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when question arrives
  useEffect(() => {
    if (currentQuestion && !isLoading) {
      inputRef.current?.focus();
    }
  }, [currentQuestion, isLoading]);

  const handleSubmit = async () => {
    const value = inputValue.trim();
    if (!value || isLoading) return;

    // Show user message immediately
    setPendingUserMessage(value);
    setInputValue('');
    setShowOptions(false);

    try {
      await onSubmitAnswer(value);
    } finally {
      // Clear pending message after backend responds (it's now in answers)
      setPendingUserMessage(null);
    }
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setShowOptions(false);
    await onSkip();
  };

  const handleGetOptions = async () => {
    if (isLoading || loadingOptions) return;

    setLoadingOptions(true);
    try {
      const opts = await onGetOptions();
      setOptions(opts);
      setShowOptions(true);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleSelectOption = (option: string) => {
    setInputValue(option);
    setShowOptions(false);
    inputRef.current?.focus();
  };

  const handleGetExample = async () => {
    if (isLoading) return;
    const example = await onGetExample();
    if (example) {
      setInputValue(example);
      inputRef.current?.focus();
    }
  };

  const quickActions = [
    {
      id: 'help',
      label: t('interview.actions.help', "I don't know"),
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    },
    {
      id: 'skip',
      label: t('interview.actions.skip', 'Skip'),
      icon: <SkipForward className="w-3.5 h-3.5" />,
    },
    {
      id: 'example',
      label: t('interview.actions.example', 'Example'),
      icon: <Lightbulb className="w-3.5 h-3.5" />,
    },
  ];

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'help':
        handleGetOptions();
        break;
      case 'skip':
        handleSkip();
        break;
      case 'example':
        handleGetExample();
        break;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold">{interview.projectName}</h1>
            <ProgressMini
              current={interview.currentIndex + 1}
              total={interview.nQuestions}
              size="sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSaveAndExit()}>
            <Save className="w-4 h-4 mr-2" />
            {t('interview.saveAndExit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onCancel()} title={t('interview.cancelWithoutSaving')}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !currentQuestion && (
            <MessageBubble
              variant="assistant"
              avatar={<Bot className="w-4 h-4" />}
              animate
            >
              {t('interview.welcome', "Hi! I'm Ralph. Let me ask you a few questions about {{name}} to help create your initial backlog.", {
                name: interview.projectName,
              })}
            </MessageBubble>
          )}

          {/* Conversation messages */}
          {messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              variant={message.type === 'assistant' ? 'assistant' : 'user'}
              avatar={
                message.type === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )
              }
              animate={i === messages.length - 1 && !pendingUserMessage}
              isStreaming={isLoading && message.id === 'current-q'}
            >
              {message.content}
            </MessageBubble>
          ))}

          {/* Pending user message (shown immediately before backend responds) */}
          {pendingUserMessage && (
            <MessageBubble
              key="pending-user"
              variant="user"
              avatar={<User className="w-4 h-4" />}
              animate
            >
              {pendingUserMessage}
            </MessageBubble>
          )}

          {/* Loading indicator for next question */}
          {isLoading && pendingUserMessage && (
            <MessageBubble
              variant="assistant"
              avatar={<Bot className="w-4 h-4" />}
              isStreaming
            >
              {t('interview.thinking', 'Thinking...')}
            </MessageBubble>
          )}

          {/* Loading indicator for first question */}
          {(isLoading || generatingFirstQuestion) && !currentQuestion && !pendingUserMessage && (
            <MessageBubble
              variant="assistant"
              avatar={<Bot className="w-4 h-4" />}
              isStreaming
            >
              {t('interview.thinking', 'Thinking...')}
            </MessageBubble>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Options panel */}
      {showOptions && options.length > 0 && (
        <div className="border-t bg-muted/50 p-4">
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground mb-3">
              {t('interview.selectOption', 'Select an option or type your own:')}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((option, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectOption(option)}
                  className="text-left"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input area */}
      <footer className="border-t bg-card p-4">
        <div className="max-w-2xl mx-auto">
          {/* Quick actions */}
          {currentQuestion && !isLoading && (
            <div className="mb-3">
              <InlineActionRow
                actions={quickActions}
                onAction={handleQuickAction}
                buttonSize="sm"
              />
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <AutoGrowTextarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onSubmit={handleSubmit}
              placeholder={t('interview.inputPlaceholder', 'Type your answer...')}
              disabled={isLoading || !currentQuestion}
              minRows={1}
              maxRows={4}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || !currentQuestion}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('interview.inputHint', 'Press Enter to send, Shift+Enter for new line')}
          </p>
        </div>
      </footer>
    </div>
  );
}
