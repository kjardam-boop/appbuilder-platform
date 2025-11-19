import * as React from "react";

export function useIsLandscape() {
  const [isLandscape, setIsLandscape] = React.useState<boolean>(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(orientation: landscape)");
    const onChange = () => {
      setIsLandscape(mql.matches);
    };
    mql.addEventListener("change", onChange);
    setIsLandscape(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isLandscape;
}
