import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white dark:bg-[#16171d] sign-in-bg">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#1a1b22] p-10 shadow-sm max-w-md w-full mx-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 text-center">
          Sign in to Think
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 text-center max-w-xs">
          Sign in with your Google account to access your sessions and projects.
        </p>
        <button
          type="button"
          onClick={() => void signIn("google")}
          className="flex items-center justify-center gap-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-6 py-3 font-medium hover:opacity-90 transition-opacity w-full"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
