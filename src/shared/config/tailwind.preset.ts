import type { Config } from 'tailwindcss';

export const tailwindPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'on-surface': 'var(--color-text-on-surface)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        sans: 'var(--font-stack)',
      },
    },
  },
};
