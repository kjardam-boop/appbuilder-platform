import * as React from "react";

export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = React.useState<boolean>(false);

  React.useEffect(() => {
    const update = () => {
      if (typeof window === "undefined") return;
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    update(); // Call on mount

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isLandscape;
}
