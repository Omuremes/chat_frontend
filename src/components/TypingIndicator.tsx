export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400">
      {names.join(", ")} {names.length === 1 ? "is" : "are"} typing
    </div>
  );
}
