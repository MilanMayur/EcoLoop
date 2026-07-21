export default function SmartStockLoading() {
  return <div className="animate-pulse space-y-3 sm:space-y-5"><div className="h-16 rounded-xl sm:h-24 sm:rounded-2xl bg-slate-200/70 dark:bg-slate-800" /><div className="h-48 rounded-xl sm:h-64 sm:rounded-[1.75rem] bg-slate-200/70 dark:bg-slate-800" /><div className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-28 rounded-xl sm:h-40 sm:rounded-2xl bg-slate-200/70 dark:bg-slate-800" />)}</div></div>;
}
