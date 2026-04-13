import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: false,
      environment: 'happy-dom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}', 'convex/**/*.{test,spec}.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        /** Focus on modules covered by unit tests (not whole app surface). */
        include: [
          'src/lib/batchIndexFromLengthChange.ts',
          'src/lib/workspaceQueries.ts',
          'src/lib/conceptReferences.ts',
          'src/lib/chatMentions.ts',
          'src/lib/chatHistoryMentionSegments.ts',
          'src/lib/chatHistoryRender.tsx',
          'src/machines/appUiMachine.ts',
          'src/machines/appUiReducers.ts',
          'src/hooks/useNotesListModel.ts',
          'src/hooks/useSessionManager.ts',
          'convex/chatPipeline.ts',
          'convex/interactionPolicy.ts',
        ],
        exclude: ['**/*.d.ts', '**/convex/_generated/**'],
        thresholds: {
          lines: 55,
          functions: 50,
          branches: 45,
          statements: 55,
        },
      },
    },
  }),
)
