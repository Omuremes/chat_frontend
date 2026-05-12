type OnlineStatusProps = {
  online: boolean;
  label?: string;
};

export function OnlineStatus({ online, label }: OnlineStatusProps) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {label ?? (online ? "Online" : "Offline")}
    </span>
  );
}
