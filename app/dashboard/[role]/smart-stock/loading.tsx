export default function SmartStockLoading() {
  return <div className="animate-pulse space-y-5"><div className="h-24 rounded-2xl bg-slate-200/70 dark:bg-slate-800" /><div className="h-64 rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-800" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-40 rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}</div></div>;
}
