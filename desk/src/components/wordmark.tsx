import clsx from "clsx";

/**
 * The Inkloom wordmark — set like a title page: serif, small caps tracking,
 * with the woven-ink dot that stands for the loom. No images, no canvas;
 * it is type, so it renders identically on server and client.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={clsx("inline-flex items-baseline gap-[0.32em] font-display font-semibold", className)}
    >
      <span className="leading-none tracking-[0.01em]">Inkloom</span>
      <span
        aria-hidden
        className="inline-block h-[0.34em] w-[0.34em] translate-y-[-0.08em] rounded-full bg-flag"
      />
    </span>
  );
}
