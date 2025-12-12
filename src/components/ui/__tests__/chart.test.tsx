import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { ChartStyle } from "@/components/ui/chart";

describe("ChartStyle CSS injection hardening", () => {
  it("quotes/escapes the chart id and skips unsafe keys", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <ChartStyle
        id={`chart-bad"]{color:red;}/*`}
        config={{
          foo: { color: "red" },
          [`x;body{background:red}`]: { color: "blue" },
        }}
      />,
    );

    const style = container.querySelector("style");
    expect(style).toBeTruthy();
    const css = style?.innerHTML ?? "";

    // Attribute selector should be quoted; injected braces shouldn't appear as selector syntax.
    expect(css).toContain('[data-chart="');
    expect(css).not.toContain("]{color:red");

    // Safe key should render a CSS variable.
    expect(css).toContain("--color-foo: red;");

    // Unsafe key should not be emitted (prevents CSS injection / broken parsing).
    expect(css).not.toContain("--color-x;body");

    warnSpy.mockRestore();
  });
});

