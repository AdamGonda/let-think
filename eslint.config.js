import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'convex/_generated/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // Files that export helpers or hooks alongside components (fast refresh still works in practice).
  {
    files: [
      'src/components/Tutorial.tsx',
      'src/components/ui/button.tsx',
      'src/contexts/SessionDataContext.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Intentional state resets when props/signals change (sync with external UI state).
  {
    files: [
      'src/components/chat/HistoricalBatchPrompt.tsx',
      'src/components/session-sidebar/useSessionSidebarWorkspace.ts',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
