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
            "group toast rounded-lg border border-border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
