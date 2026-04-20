/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL: string;
  /** Optional self-hosted product demo (e.g. `/demo.mp4` in public/). */
  readonly VITE_PRODUCT_DEMO_VIDEO_URL?: string;
  /** Optional poster frame; keeps first paint light without decoding video. */
  readonly VITE_PRODUCT_DEMO_VIDEO_POSTER_URL?: string;
  // Extend with other VITE_ prefixed env vars as needed, e.g.:
  // readonly VITE_APP_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
