import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number; // milliseconds to wait before saving (default: 1000)
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  status: AutoSaveStatus;
  trigger: (content?: string) => void;
  error: Error | null;
}

/**
 * Hook for debounced auto-save functionality
 * 
 * Usage:
 * const { status, trigger } = useAutoSave({
 *   onSave: async () => { await saveData(); },
 *   delay: 1000,
 *   enabled: !!applicationId
 * });
 * 
 * // Call trigger() whenever data changes
 * useEffect(() => { trigger(); }, [data]);
 */
export function useAutoSave({
  onSave,
  delay = 1500,
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const statusResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const isSavingRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastSaveContentRef = useRef<string>('');
  const saveTokenRef = useRef(0);
  const isMountedRef = useRef(true);

  const performSave = useCallback(async (content?: string) => {
    if (!enabled || isSavingRef.current) return;
    const saveToken = ++saveTokenRef.current;

    isSavingRef.current = true;
    setStatus('saving');
    setError(null);

    try {
      await onSave();
      if (!isMountedRef.current) return;
      if (content !== undefined) {
        lastSaveContentRef.current = content;
      }
      setStatus('saved');
      retryCountRef.current = 0;
      
      // Reset to idle after showing "saved" status for 2 seconds
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
      }
      statusResetTimeoutRef.current = setTimeout(() => {
        // Avoid stale timers overwriting a newer state transition (e.g. pending/saving)
        if (!isMountedRef.current) return;
        if (saveTokenRef.current !== saveToken) return;
        setStatus((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
    } catch (err) {
      console.error('[useAutoSave] Save failed:', err);
      if (!isMountedRef.current) return;
      
      // Retry once on network errors
      if (retryCountRef.current === 0 && err instanceof Error && err.message.includes('fetch')) {
        console.log('[useAutoSave] Retrying save...');
        retryCountRef.current++;
        isSavingRef.current = false;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          // Only retry if this is still the latest save attempt
          if (saveTokenRef.current !== saveToken) return;
          performSave(content);
        }, 1000);
        return;
      }
      
      setStatus('error');
      setError(err instanceof Error ? err : new Error(String(err)));
      retryCountRef.current = 0;
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, enabled]);

  const trigger = useCallback((content?: string) => {
    if (!enabled) return;

    // If the user edits after a successful save, cancel the "saved -> idle" timer
    // so we don't overwrite 'pending' with an old timeout.
    if (statusResetTimeoutRef.current) {
      clearTimeout(statusResetTimeoutRef.current);
      statusResetTimeoutRef.current = undefined;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = undefined;
    }

    // Don't trigger if content hasn't changed
    if (content !== undefined && content === lastSaveContentRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setStatus('pending');
    setError(null);

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => performSave(content), delay);
  }, [performSave, delay, enabled]);

  // Cleanup - only clear timeout, don't force save
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return { status, trigger, error };
}
