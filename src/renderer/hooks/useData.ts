import { useState, useEffect, useCallback } from 'react';
import type { Board, Task, AgentState, Chat } from '../../shared/types';

const POLL_INTERVAL = 2000;

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([
        window.dexteria.board.get() as unknown as Promise<Board>,
        window.dexteria.tasks.getAll() as unknown as Promise<Task[]>
      ]);
      setBoard(b);
      setTasks(t);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch board data:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = fetchData;

  const moveTask = async (taskId: string, toColumnId: string, newOrder?: number) => {
    try {
      await window.dexteria.tasks.move(taskId, toColumnId, newOrder);
      await refresh();
    } catch (err) {
      console.error('Failed to move task:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const createTask = async (title: string, status: string = 'backlog') => {
    try {
      const task = await window.dexteria.tasks.create(title, status);
      await refresh();
      return task;
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await window.dexteria.tasks.delete(taskId);
      await refresh();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  const clearError = () => setError(null);

  return { board, tasks, loading, error, refresh, moveTask, createTask, deleteTask, clearError };
}

export function useAgentState() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    try {
      const s = await window.dexteria.state.get() as unknown as AgentState;
      setState(s);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch agent state:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchState]);

  const clearError = () => setError(null);

  return { state, loading, error, refresh: fetchState, clearError };
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      const c = await window.dexteria.chat.getAll() as unknown as Chat[];
      setChats(c);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchChats]);

  const clearError = () => setError(null);

  return { chats, loading, error, refresh: fetchChats, clearError };
}

export function useActiveTask(taskId: string | undefined) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchTask = async () => {
      try {
        const t = await window.dexteria.tasks.get(taskId) as unknown as Task;
        setTask(t);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch task:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
    const interval = setInterval(fetchTask, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [taskId]);

  const clearError = () => setError(null);

  return { task, loading, error, clearError };
}

// Provider state hook for settings
export function useProvider() {
  const [provider, setProvider] = useState<{
    name: string;
    ready: boolean;
    type: 'mock' | 'anthropic';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProvider = useCallback(async () => {
    try {
      const p = await window.dexteria.settings.getProvider();
      setProvider(p);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch provider:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProvider();
  }, [fetchProvider]);

  const setApiKey = async (apiKey: string) => {
    setLoading(true);
    try {
      const result = await window.dexteria.settings.setApiKey(apiKey);
      if (result.success) {
        await fetchProvider();
      } else {
        throw new Error(result.error || 'Failed to set API key');
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const testProvider = async () => {
    setLoading(true);
    try {
      const result = await window.dexteria.settings.testProvider();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { provider, loading, error, refresh: fetchProvider, setApiKey, testProvider, clearError };
}
