import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: [
        'src/stationListYaml.ts',
        'src/directionBadgeCondense.ts',
        'src/features/generatorSlice.ts',
        'src/hooks/useDebouncedGeneratorField.ts',
        'src/lineIdBadgeMetrics.ts',
        'src/normalizeTransfer.ts',
        'src/badgeTextCondense.ts',
      ],
    },
  },
});
