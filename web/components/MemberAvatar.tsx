import { avatarColors, initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-8 w-8 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
} as const;

export function MemberAvatar({
  address,
  label,
  size = "md",
  ring = false,
  className,
}: {
  address: string;
  label: string;
  size?: keyof typeof sizes;
  ring?: boolean;
  className?: string;
}) {
  const { bg, fg } = avatarColors(address);
  return (
    <span
      aria-hidden
      title={label}
      className={cn(
        "inline-grid shrink-0 place-items-center rounded-full font-display font-semibold leading-none",
        sizes[size],
        ring && "ring-2 ring-gold-bright ring-offset-2 ring-offset-surface",
        className,
      )}
      style={{ backgroundColor: bg, color: fg }}
    >
      {initials(label)}
    </span>
  );
}
