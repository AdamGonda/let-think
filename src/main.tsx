import "./instrument"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reactErrorHandler } from "@sentry/react"
import { ConvexReactClient } from 'convex/react'
import { ConvexAuthProvider } from "@convex-dev/auth/react"
import './index.css'
import { AppRouter } from './router.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler(),
}).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <AppRouter />
    </ConvexAuthProvider>
  </StrictMode>,
)
