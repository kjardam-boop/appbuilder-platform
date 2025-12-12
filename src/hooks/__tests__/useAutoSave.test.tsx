import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "@/hooks/useAutoSave";

describe("useAutoSave", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not let the saved->idle timer overwrite a new pending state", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ delay }) =>
        useAutoSave({
          onSave,
          delay,
          enabled: true,
        }),
      { initialProps: { delay: 100 } },
    );

    act(() => result.current.trigger("a"));
    expect(result.current.status).toBe("pending");

    // Debounce fires -> save executes
    act(() => {
      vi.advanceTimersByTime(100);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("saved");

    // User edits again before the "saved" status timeout fires.
    // Use a long debounce so we can advance past 2000ms without triggering a new save.
    rerender({ delay: 5000 });
    act(() => result.current.trigger("b"));
    expect(result.current.status).toBe("pending");

    // Advance past the saved->idle timeout; it should have been cancelled by trigger().
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.status).toBe("pending");
  });

  it("cleans up timers on unmount (no save after unmount)", () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() =>
      useAutoSave({
        onSave,
        delay: 100,
        enabled: true,
      }),
    );

    act(() => result.current.trigger("a"));
    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onSave).not.toHaveBeenCalled();
  });
});

