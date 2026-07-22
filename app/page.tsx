import Image from "next/image";
import {
  BrainCircuit, Building2, Check, Clock3, GitBranch, MapPin,
  Recycle, Store, Trash2, TrendingUp, Users, Warehouse, Waves,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Logo } from "@/components/logo";
import { CountUp, Float, PulseDot, Reveal } from "@/components/motion";
import {
  EcoLoopAIPreview,
  EnhancedWorkflow,
  LandingImpact,
  ThreePillarsSection,
  TransformationComparison,
} from "@/components/landing/vision";
import { HomepageContactActions, HomepageHeroActions, HomepageSessionProvider } from "@/components/landing/homepage-session";

const problems = [
  { icon: Trash2, title: "Overflowing bins", text: "No visibility into capacity or collection demand." },
  { icon: GitBranch, title: "Mixed waste", text: "Valuable materials are lost before they can be recovered." },
  { icon: Clock3, title: "Delayed pickups", text: "Manual coordination makes collection slow and uncertain." },
  { icon: TrendingUp, title: "Low recovery", text: "Untracked waste leaks value into already crowded landfills." },
];

const stakeholders = [
  { icon: Store, label: "For vendors", title: "A cleaner stall, without the coordination burden.", points: ["One-tap pickup requests", "Simple segregation guidance", "Collection status updates"] },
  { icon: Building2, label: "For TMC", title: "Market-wide visibility for faster civic action.", points: ["Live ward-level dashboards", "Collection SLA monitoring", "Evidence-ready reports"] },
  { icon: Recycle, label: "For recyclers", title: "Reliable material supply and smarter routes.", points: ["Qualified pickup leads", "Load and route planning", "Digital proof of recovery"] },
  { icon: Warehouse, label: "For market admins", title: "One calm operating view across the market.", points: ["Issue and hotspot tracking", "Vendor participation insights", "Transparent performance data"] },
];

const stats = [
  { value: 1.2, suffix: " tons", decimals: 1, label: "Inventory optimized", trend: "Across participating vendors" },
  { value: 420, suffix: " kg", decimals: 0, label: "Waste prevented", trend: "Before it reached the bin" },
  { value: 72, suffix: "%", decimals: 0, label: "Recycling rate", trend: "Across four waste streams" },
  { value: 210, suffix: " kg", decimals: 0, label: "Carbon saved", trend: "Estimated CO₂e avoided" },
];

export default function Home() {
  return (
    <HomepageSessionProvider><main className="landing-page overflow-hidden bg-[#F8FAFC]">
      <Navbar />

      <section id="top" className="relative overflow-hidden bg-[#F8FAFC] pt-24 sm:min-h-screen sm:pt-32">
        <div className="noise" />
        <div className="absolute -left-32 top-48 size-80 rounded-full border border-emerald-200/70" aria-hidden="true" />
        <div className="absolute -left-12 top-68 size-28 rounded-full border border-emerald-200/80" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-8 pb-12 sm:gap-12 sm:pb-20 lg:grid-cols-[.88fr_1.12fr] lg:gap-10 lg:pb-28">
          <Reveal className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-sm sm:mb-7 sm:gap-2.5 sm:px-3.5 sm:py-2 sm:text-xs">
              <PulseDot />
              Building circular markets for Bengaluru
            </div>
            <h1 className="max-w-[650px] break-words text-[clamp(2.5rem,13vw,6.7rem)] font-semibold leading-[.94] tracking-[-.07em] text-slate-950 sm:leading-[.92] sm:tracking-[-.075em]">
              Small stock.<br /><span className="text-emerald-600">Zero waste.</span><br />Smart market.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:mt-7 sm:text-lg sm:leading-8">
              EcoLoop is an AI-powered Smart Market Sustainability Platform that helps vendors optimize inventory, prevent excess stock, reduce waste, and connect with TMC and recycling partners through one intelligent digital ecosystem.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
              <HomepageHeroActions />
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-medium text-slate-500 sm:mt-9 sm:gap-x-6 sm:gap-y-3 sm:text-xs">
              <span className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> Built for Indian markets</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> End-to-end traceability</span>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="relative xl:-mr-20">
            <div className="absolute -inset-7 rounded-[3rem] border border-emerald-100" aria-hidden="true" />
            <Float className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-[0_28px_70px_rgba(15,23,42,.14)] sm:rounded-[2.6rem] sm:p-3">
              <Image src="/ecoloop-circular-market.webp" alt="A vendor, smart sorting bins, electric collection vehicle and recycling facility connected in a circular system" width={1728} height={960} priority className="aspect-[1.28/1] w-full rounded-[1.55rem] object-cover sm:rounded-[2rem]" sizes="(max-width: 1024px) 92vw, 58vw" />
              <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-xl border border-white/80 bg-white/92 px-3 py-2 shadow-xl backdrop-blur-md sm:inset-x-auto sm:bottom-7 sm:left-7 sm:min-w-72 sm:rounded-2xl sm:px-4 sm:py-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">AI inventory insight</p><p className="mt-1 text-sm font-semibold text-slate-900">15 kg overstock prevented</p></div>
                <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 sm:size-10 sm:rounded-xl"><BrainCircuit className="size-4 text-emerald-600 sm:size-5" /></span>
              </div>
            </Float>
            <div className="absolute -right-1 -top-5 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg sm:flex"><Building2 className="size-5 text-blue-500" /> TMC dashboard connected</div>
            <div className="absolute -left-3 top-20 hidden rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg xl:block"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Forecast accuracy</p><p className="mt-1 text-lg font-semibold tracking-tight text-slate-950">94%</p></div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="live-heading" className="relative z-10 -mt-1 pb-12 sm:pb-24">
        <div className="container-page">
          <Reveal className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.06)] sm:rounded-[2rem]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2.5"><PulseDot /><h2 id="live-heading" className="text-xs font-bold uppercase tracking-[.12em] text-slate-600">Live operations snapshot</h2></div>
              <span className="hidden text-xs text-slate-400 sm:block">KR Market · Today</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.label} className={`relative px-3.5 py-4 sm:px-7 sm:py-7 ${index > 1 ? "border-t border-slate-100 lg:border-t-0" : ""} ${index % 2 ? "border-l border-slate-100" : ""} ${index > 0 ? "lg:border-l" : ""}`}>
                  <div className="text-2xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl"><CountUp value={stat.value} suffix={stat.suffix} decimals={stat.decimals} /></div>
                  <p className="mt-1.5 text-xs font-medium text-slate-700 sm:mt-2 sm:text-sm">{stat.label}</p>
                  <p className="mt-2 text-[9px] font-medium leading-4 text-emerald-700 sm:mt-3 sm:text-[11px]">{stat.trend}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page grid gap-8 sm:gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <span className="eyebrow"><Waves className="size-4" /> The challenge</span>
            <h2 className="section-title">Markets are moving fast.<br />Waste systems aren’t.</h2>
            <p className="section-copy">Traditional collection relies on fragmented calls, fixed routes, and almost no data. The cost shows up in every overflowing bin.</p>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:mt-9 sm:rounded-2xl sm:p-5">
              <p className="text-sm font-semibold text-amber-950">The hidden cost</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">When recyclable material is mixed at source, its recovery value can disappear before collection even begins.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {problems.map((item, index) => <Reveal key={item.title} delay={index * .06} className="group rounded-xl border border-slate-200 bg-[#F8FAFC] p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-xl sm:rounded-[1.75rem] sm:p-6"><span className="grid size-9 place-items-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 group-hover:text-emerald-600 sm:size-12 sm:rounded-2xl"><item.icon className="size-4 sm:size-5" /></span><h3 className="mt-4 text-sm font-semibold tracking-[-.025em] text-slate-950 sm:mt-8 sm:text-lg">{item.title}</h3><p className="mt-1.5 text-xs leading-5 text-slate-500 sm:mt-2 sm:text-sm sm:leading-6">{item.text}</p></Reveal>)}
          </div>
        </div>
      </section>

      <ThreePillarsSection />
      <TransformationComparison />
      <EcoLoopAIPreview />
      <EnhancedWorkflow />

      <section id="partners" className="section-pad bg-[#EEF7F1]">
        <div className="container-page">
          <Reveal><span className="eyebrow"><Users className="size-4" /> Built for the whole ecosystem</span><h2 className="section-title">One loop. Shared value.</h2><p className="section-copy">Each stakeholder gets exactly what they need—and the city gets a cleaner, more accountable market.</p></Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-14 sm:gap-5">
            {stakeholders.map((item, index) => <Reveal key={item.label} delay={(index % 2) * .07} className="group rounded-xl border border-emerald-100 bg-white p-3.5 shadow-[0_14px_40px_rgba(22,101,52,.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(22,101,52,.1)] sm:rounded-[2rem] sm:p-8"><div className="flex items-center gap-2 sm:gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 sm:size-11 sm:rounded-xl"><item.icon className="size-4 sm:size-5" /></span><span className="text-[9px] font-bold uppercase tracking-[.08em] text-emerald-700 sm:text-xs sm:tracking-[.12em]">{item.label}</span></div><h3 className="mt-4 max-w-md text-base font-semibold leading-tight tracking-[-.04em] text-slate-950 sm:mt-7 sm:text-2xl">{item.title}</h3><ul className="mt-4 grid gap-2 sm:mt-6 sm:gap-3">{item.points.map(point => <li key={point} className="flex items-start gap-2 text-[11px] leading-4 text-slate-600 sm:items-center sm:gap-3 sm:text-sm"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-emerald-100 sm:mt-0 sm:size-5"><Check className="size-2.5 text-emerald-700 sm:size-3" /></span>{point}</li>)}</ul></Reveal>)}
          </div>
        </div>
      </section>

      <LandingImpact />

      <section id="contact" className="relative overflow-hidden border-y border-emerald-100 bg-emerald-50 py-14 sm:py-32">
        <div className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200" aria-hidden="true" /><div className="absolute left-1/2 top-1/2 size-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200" aria-hidden="true" />
        <Reveal className="container-page relative text-center"><span className="eyebrow"><MapPin className="size-4" /> Start with one market</span><h2 className="mx-auto mt-3 max-w-3xl text-[clamp(2.25rem,11vw,5.5rem)] font-semibold leading-[.98] tracking-[-.07em] text-slate-950 sm:mt-5">Ready to build<br />a smarter market?</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:mt-6 sm:text-lg sm:leading-7">Bring inventory intelligence, responsible waste recovery, and civic operations into one connected sustainability platform.</p><div className="mt-6 flex flex-col justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3"><HomepageContactActions /></div></Reveal>
      </section>

      <footer className="bg-white py-6 sm:py-12">
        <div className="container-page">
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 border-b border-slate-200 pb-5 sm:gap-10 sm:pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="col-span-2 md:col-span-1"><Logo /><p className="mt-3 max-w-sm text-xs leading-5 text-slate-500 sm:mt-5 sm:text-sm sm:leading-6">AI-Powered Smart Market Sustainability Platform for cleaner markets, resilient vendors, and a more circular Bengaluru.</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-900 sm:text-xs">Platform</p><div className="mt-2 grid text-xs text-slate-500 sm:mt-4 sm:gap-1 sm:text-sm"><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="#smart-stock">Smart Stock</a><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="#zero-waste">Zero Waste</a><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="#smart-market">Smart Market</a><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="#impact">Impact</a></div></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-900 sm:text-xs">Connect</p><div className="mt-2 grid text-xs text-slate-500 sm:mt-4 sm:gap-1 sm:text-sm"><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="mailto:hello@ecoloop.city">hello@ecoloop.city</a><span className="flex min-h-8 items-center sm:min-h-11">Bengaluru, Karnataka</span><a className="flex min-h-8 items-center hover:text-emerald-600 sm:min-h-11" href="#top">Faculty & research</a></div></div>
          </div>
          <div className="flex flex-col items-center gap-1.5 pt-4 text-center text-[10px] text-slate-400 sm:flex-row sm:justify-between sm:gap-3 sm:pt-6 sm:text-left sm:text-xs"><p>© 2026 EcoLoop. Built for cleaner markets.</p><p>Small Stock · Zero Waste · Smart Market</p></div>
        </div>
      </footer>
    </main></HomepageSessionProvider>
  );
}
