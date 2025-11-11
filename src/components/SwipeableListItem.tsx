import { ReactNode, useRef, useState, TouchEvent } from "react";
import { cn } from "@/lib/utils";

interface SwipeableListItemProps {
  children: ReactNode;
  onSwipeAction: () => void;
  actionLabel?: string;
  actionIcon?: ReactNode;
  swipeThreshold?: number;
  disabled?: boolean;
}

export const SwipeableListItem = ({
  children,
  onSwipeAction,
  actionLabel = "Edit",
  actionIcon,
  swipeThreshold = 80,
  disabled = false,
}: SwipeableListItemProps) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    if (disabled) return;
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (disabled || !isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    const deltaX = touchStartX.current - currentX.current;
    
    // Only allow left swipe (positive deltaX) and limit to max swipe
    if (deltaX > 0) {
      setSwipeX(Math.min(deltaX, swipeThreshold + 20));
    }
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsSwiping(false);
    
    // If swiped past threshold, trigger action
    if (swipeX > swipeThreshold) {
      onSwipeAction();
      setSwipeX(0);
    } else {
      // Snap back
      setSwipeX(0);
    }
  };

  const handleActionClick = () => {
    onSwipeAction();
    setSwipeX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action button revealed on swipe */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full flex items-center justify-center bg-blue-600 text-white px-4 transition-all",
          swipeX > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ width: `${Math.min(swipeX, swipeThreshold)}px` }}
      >
        {swipeX > swipeThreshold * 0.7 && (
          <button
            onClick={handleActionClick}
            className="flex items-center gap-1 text-sm font-medium"
          >
            {actionIcon}
            {actionLabel}
          </button>
        )}
      </div>

      {/* Main content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
        className="bg-background"
      >
        {children}
      </div>
    </div>
  );
};
