import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-sunk",
        "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r",
        "after:from-transparent after:via-cream/70 after:to-transparent after:animate-[shimmer_1.6s_infinite]",
        className,
      )}
      {...props}
    />
  );
}
