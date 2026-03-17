import { Toaster as Sonner, type ToasterProps } from "sonner";

type SonnerToasterProps = ToasterProps & {
  theme?: "light" | "dark" | "system";
};

const Toaster = ({ theme = "system", ...props }: SonnerToasterProps) => {
  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-lg",
          description: "text-zinc-600 dark:text-zinc-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
