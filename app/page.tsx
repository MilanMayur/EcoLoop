import Image from "next/image";
import {
  ArrowRight, BarChart3, Building2, Check, CircleGauge, Clock3, CloudCog,
  Factory, GitBranch, Globe2, Leaf, LocateFixed, MapPin, PackageCheck, Recycle,
  Route, ScanLine, ShieldCheck, ShoppingBasket, Sparkles, Store, Trash2, TrendingUp,
  Truck, Users, Warehouse, Waves, Wind,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CountUp, Float, PulseDot, Reveal } from "@/components/motion";

const problems = [
  { icon: Trash2, title: "Overflowing bins", text: "No visibility into capacity or collection demand." },
  { icon: GitBranch, title: "Mixed waste", text: "Valuable materials are lost before they can be recovered." },
  { icon: Clock3, title: "Delayed pickups", text: "Manual coordination makes collection slow and uncertain." },
  { icon: TrendingUp, title: "Low recovery", text: "Untracked waste leaks value into already crowded landfills." },
];

const features = [
  { icon: ScanLine, title: "Segregate at source", text: "Simple, guided sorting that fits naturally into a vendor’s day.", tag: "Vendor app" },
  { icon: Truck, title: "Request smart pickups", text: "Raise, schedule, and track collections without phone-call chains.", tag: "On demand" },
  { icon: ShieldCheck, title: "Verified partners", text: "Route every waste stream only to authorized recycling partners.", tag: "Compliant" },
  { icon: Route, title: "Optimize every route", text: "Match loads, vehicles, and locations to reduce empty kilometres.", tag: "GPS enabled" },
  { icon: PackageCheck, title: "Trace every kilogram", text: "A verifiable chain of custody from market stall to final recovery.", tag: "Auditable" },
  { icon: BarChart3, title: "See impact live", text: "Turn everyday collection data into clear operational decisions.", tag: "Real time" },
];

const workflow = [
  { icon: ShoppingBasket, number: "01", title: "Vendor segregates", text: "Waste is sorted at source." },
  { icon: CloudCog, number: "02", title: "Pickup requested", text: "A collection is raised in seconds." },
  { icon: Users, number: "03", title: "Partner matched", text: "EcoLoop finds a verified recycler." },
  { icon: LocateFixed, number: "04", title: "Route optimized", text: "The smartest pickup route is set." },
  { icon: Factory, number: "05", title: "Material recovered", text: "Recycling and impact are recorded." },
];

const stakeholders = [
  { icon: Store, label: "For vendors", title: "A cleaner stall, without the coordination burden.", points: ["One-tap pickup requests", "Simple segregation guidance", "Collection status updates"] },
  { icon: Building2, label: "For BBMP", title: "Market-wide visibility for faster civic action.", points: ["Live ward-level dashboards", "Collection SLA monitoring", "Evidence-ready reports"] },
  { icon: Recycle, label: "For recyclers", title: "Reliable material supply and smarter routes.", points: ["Qualified pickup leads", "Load and route planning", "Digital proof of recovery"] },
  { icon: Warehouse, label: "For market admins", title: "One calm operating view across the market.", points: ["Issue and hotspot tracking", "Vendor participation insights", "Transparent performance data"] },
];

const stats = [
  { value: 850, suffix: " kg", label: "Waste collected today", trend: "+12% this week" },
  { value: 72, suffix: "%", label: "Recovered for recycling", trend: "Across 4 streams" },
  { value: 26, suffix: "", label: "Collections completed", trend: "98% on schedule" },
  { value: 210, suffix: " kg", label: "Estimated CO₂e avoided", trend: "Updated live" },
];

export default function Home() {
  return (
    <main className="overflow-hidden bg-[#F8FAFC]">
      <Navbar />

      <section id="top" className="relative min-h-screen overflow-hidden bg-[#F8FAFC] pt-28 sm:pt-32">
        <div className="noise" />
        <div className="absolute -left-32 top-48 size-80 rounded-full border border-emerald-200/70" aria-hidden="true" />
        <div className="absolute -left-12 top-68 size-28 rounded-full border border-emerald-200/80" aria-hidden="true" />
        <div className="container-page relative grid items-center gap-12 pb-20 lg:grid-cols-[.88fr_1.12fr] lg:gap-10 lg:pb-28">
          <Reveal className="relative z-10">
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-emerald-200 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-sm">
              <PulseDot />
              Building circular markets for Bengaluru
            </div>
            <h1 className="max-w-[650px] text-[clamp(3.5rem,7vw,6.7rem)] font-semibold leading-[.92] tracking-[-.075em] text-slate-950">
              Small stock.<br /><span className="text-emerald-600">Zero waste.</span><br />Smart market.
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              One intelligent platform connecting vendors, civic teams, and recyclers—so market waste becomes traceable, recoverable, and valuable.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg"><a href="#contact">Request a demo <ArrowRight className="size-4" /></a></Button>
              <Button asChild size="lg" variant="outline"><a href="#workflow"><span className="grid size-6 place-items-center rounded-full bg-slate-950 text-[10px] text-white">▶</span> See how it works</a></Button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
              <span className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> Built for Indian markets</span>
              <span className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> End-to-end traceability</span>
            </div>
          </Reveal>

          <Reveal delay={0.12} className="relative lg:-mr-20">
            <div className="absolute -inset-7 rounded-[3rem] border border-emerald-100" aria-hidden="true" />
            <Float className="relative overflow-hidden rounded-[2rem] border border-white bg-white p-2 shadow-[0_28px_70px_rgba(15,23,42,.14)] sm:rounded-[2.6rem] sm:p-3">
              <Image src="/ecoloop-circular-market.webp" alt="A vendor, smart sorting bins, electric collection vehicle and recycling facility connected in a circular system" width={1728} height={960} priority className="aspect-[1.28/1] w-full rounded-[1.55rem] object-cover sm:rounded-[2rem]" sizes="(max-width: 1024px) 92vw, 58vw" />
              <div className="absolute inset-x-5 bottom-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/92 px-4 py-3 shadow-xl backdrop-blur-md sm:inset-x-auto sm:bottom-7 sm:left-7 sm:min-w-64">
                <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">System status</p><p className="mt-1 text-sm font-semibold text-slate-900">Circular loop active</p></div>
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-50"><Recycle className="size-5 text-emerald-600" /></span>
              </div>
            </Float>
            <div className="absolute -right-1 -top-5 hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg sm:flex"><ShieldCheck className="size-5 text-blue-500" /> Verified recycler</div>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="live-heading" className="relative z-10 -mt-1 pb-24">
        <div className="container-page">
          <Reveal className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,.06)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-2.5"><PulseDot /><h2 id="live-heading" className="text-xs font-bold uppercase tracking-[.12em] text-slate-600">Live operations snapshot</h2></div>
              <span className="hidden text-xs text-slate-400 sm:block">KR Market · Today</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div key={stat.label} className={`relative px-6 py-7 sm:px-7 ${index > 0 ? "border-t border-slate-100 sm:border-t-0" : ""} ${index % 2 ? "sm:border-l" : ""} ${index > 1 ? "lg:border-l lg:border-t-0" : ""}`}>
                  <div className="text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl"><CountUp value={stat.value} suffix={stat.suffix} /></div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{stat.label}</p>
                  <p className="mt-3 text-[11px] font-medium text-emerald-700">{stat.trend}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
          <Reveal>
            <span className="eyebrow"><Waves className="size-4" /> The challenge</span>
            <h2 className="section-title">Markets are moving fast.<br />Waste systems aren’t.</h2>
            <p className="section-copy">Traditional collection relies on fragmented calls, fixed routes, and almost no data. The cost shows up in every overflowing bin.</p>
            <div className="mt-9 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-950">The hidden cost</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">When recyclable material is mixed at source, its recovery value can disappear before collection even begins.</p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {problems.map((item, index) => <Reveal key={item.title} delay={index * .06} className="group rounded-[1.75rem] border border-slate-200 bg-[#F8FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-xl"><span className="grid size-12 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 group-hover:text-emerald-600"><item.icon className="size-5" /></span><h3 className="mt-8 text-lg font-semibold tracking-[-.025em] text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="features" className="section-pad bg-slate-950 text-white">
        <div className="container-page">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div><span className="eyebrow !text-emerald-400"><Sparkles className="size-4" /> One connected platform</span><h2 className="section-title !text-white">Every handoff,<br />finally in the loop.</h2></div>
            <p className="max-w-md text-base leading-7 text-slate-400">EcoLoop turns a fragmented waste journey into one clear, accountable system—from first sort to final recovery.</p>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 3) * .07} className="group relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-900 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-800 hover:bg-slate-900/70">
                <div className="flex items-start justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"><feature.icon className="size-5" /></span><span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{feature.tag}</span></div>
                <h3 className="mt-9 text-xl font-semibold tracking-[-.03em]">{feature.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{feature.text}</p>
                <div className="mt-7 flex items-center gap-2 text-xs font-semibold text-emerald-400 opacity-60 transition-opacity group-hover:opacity-100">Explore capability <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" /></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="section-pad bg-white">
        <div className="container-page">
          <Reveal className="text-center"><span className="eyebrow"><CircleGauge className="size-4" /> How it works</span><h2 className="section-title mx-auto">From waste to resource,<br />without the guesswork.</h2><p className="section-copy mx-auto">A simple workflow for people on the ground. A complete data trail for everyone responsible.</p></Reveal>
          <div className="relative mt-16 grid gap-4 md:grid-cols-5">
            <div className="absolute left-[10%] right-[10%] top-9 hidden h-px bg-emerald-200 md:block" aria-hidden="true" />
            {workflow.map((step, index) => <Reveal key={step.title} delay={index * .08} className="relative rounded-2xl border border-slate-200 bg-[#F8FAFC] p-5 md:border-0 md:bg-transparent md:p-2 md:text-center"><div className="relative z-10 mx-0 grid size-16 place-items-center rounded-2xl border border-emerald-200 bg-white text-emerald-600 shadow-[0_8px_24px_rgba(22,163,74,.1)] md:mx-auto"><step.icon className="size-6" /><span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-slate-950 text-[9px] font-bold text-white">{step.number}</span></div><h3 className="mt-5 text-sm font-semibold text-slate-900">{step.title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{step.text}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="partners" className="section-pad bg-[#EEF7F1]">
        <div className="container-page">
          <Reveal><span className="eyebrow"><Users className="size-4" /> Built for the whole ecosystem</span><h2 className="section-title">One loop. Shared value.</h2><p className="section-copy">Each stakeholder gets exactly what they need—and the city gets a cleaner, more accountable market.</p></Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {stakeholders.map((item, index) => <Reveal key={item.label} delay={(index % 2) * .07} className="group rounded-[2rem] border border-emerald-100 bg-white p-7 shadow-[0_14px_40px_rgba(22,101,52,.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(22,101,52,.1)] sm:p-8"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><item.icon className="size-5" /></span><span className="text-xs font-bold uppercase tracking-[.12em] text-emerald-700">{item.label}</span></div><h3 className="mt-7 max-w-md text-2xl font-semibold leading-tight tracking-[-.04em] text-slate-950">{item.title}</h3><ul className="mt-6 grid gap-3">{item.points.map(point => <li key={point} className="flex items-center gap-3 text-sm text-slate-600"><span className="grid size-5 place-items-center rounded-full bg-emerald-100"><Check className="size-3 text-emerald-700" /></span>{point}</li>)}</ul></Reveal>)}
          </div>
        </div>
      </section>

      <section id="impact" className="section-pad bg-white">
        <div className="container-page">
          <Reveal className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-end"><div><span className="eyebrow"><Globe2 className="size-4" /> Measurable impact</span><h2 className="section-title">Better streets.<br />Stronger systems.</h2></div><p className="section-copy lg:justify-self-end">EcoLoop makes environmental outcomes visible—helping markets prove progress and improve it, collection by collection.</p></Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
            <Reveal className="relative overflow-hidden rounded-[2.2rem] bg-emerald-600 p-8 text-white sm:p-10">
              <div className="noise" /><div className="relative"><span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em]">Circularity score</span><div className="mt-14 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-6xl font-semibold tracking-[-.07em] sm:text-7xl"><CountUp value={72} suffix="%" /></p><p className="mt-3 max-w-sm text-base leading-7 text-emerald-50">of collected material returned to productive use in today’s operating snapshot.</p></div><div className="relative size-36 rounded-full border-[12px] border-white/20"><div className="absolute inset-2 grid place-items-center rounded-full bg-white/10"><Recycle className="size-9" /></div></div></div></div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              <Reveal delay={.07} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-7"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Wind className="size-5" /></span><span className="text-xs font-bold text-blue-600">−18%</span></div><p className="mt-8 text-2xl font-semibold tracking-[-.04em] text-slate-950">Lower route emissions</p><p className="mt-2 text-sm leading-6 text-slate-500">Smarter pickup density means fewer empty kilometres.</p></Reveal>
              <Reveal delay={.12} className="rounded-[2rem] border border-slate-200 bg-[#F8FAFC] p-7"><div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Leaf className="size-5" /></span><span className="text-xs font-bold text-emerald-600">2 SDGs</span></div><p className="mt-8 text-2xl font-semibold tracking-[-.04em] text-slate-950">Designed for the SDGs</p><div className="mt-4 flex gap-2"><span className="rounded-lg bg-[#F99D26] px-3 py-2 text-xs font-bold text-white">11 · Cities</span><span className="rounded-lg bg-[#BF8B2E] px-3 py-2 text-xs font-bold text-white">12 · Consumption</span></div></Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24 sm:pb-32">
        <div className="container-page">
          <Reveal className="grid overflow-hidden rounded-[2.5rem] bg-slate-950 lg:grid-cols-[1fr_.85fr]">
            <div className="relative p-8 sm:p-12 lg:p-16"><div className="noise" /><div className="relative"><span className="eyebrow !text-emerald-400"><Sparkles className="size-4" /> Why EcoLoop</span><h2 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.04] tracking-[-.055em] text-white sm:text-5xl">Technology that disappears into the work.</h2><p className="mt-6 max-w-lg text-base leading-7 text-slate-400">Simple enough for a busy vendor. Powerful enough for a city operations team.</p><div className="mt-10 flex flex-wrap gap-3">{["Smart", "Sustainable", "Scalable"].map(label => <span key={label} className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300">{label}</span>)}</div></div></div>
            <div className="grid gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-1">
              {[{ icon: CircleGauge, n: "01", t: "Smart by default", d: "One clear digital layer for every participant." }, { icon: Recycle, n: "02", t: "Circular by design", d: "Recovery is built into the workflow, not added later." }, { icon: Globe2, n: "03", t: "Ready to scale", d: "A repeatable system for every market and ward." }].map(item => <div key={item.t} className="bg-slate-900 p-7 sm:p-8"><div className="flex items-center justify-between"><item.icon className="size-5 text-emerald-400" /><span className="text-[10px] font-bold text-slate-600">{item.n}</span></div><h3 className="mt-8 font-semibold text-white">{item.t}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.d}</p></div>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="contact" className="relative overflow-hidden border-y border-emerald-100 bg-emerald-50 py-24 sm:py-32">
        <div className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200" aria-hidden="true" /><div className="absolute left-1/2 top-1/2 size-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200" aria-hidden="true" />
        <Reveal className="container-page relative text-center"><span className="eyebrow"><MapPin className="size-4" /> Start with one market</span><h2 className="mx-auto mt-5 max-w-3xl text-[clamp(2.7rem,6vw,5.5rem)] font-semibold leading-[.98] tracking-[-.07em] text-slate-950">Ready to close<br />the waste loop?</h2><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">See how EcoLoop can make your market cleaner, more accountable, and ready for a circular future.</p><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg"><a href="mailto:hello@ecoloop.city">Request a demo <ArrowRight className="size-4" /></a></Button><Button asChild size="lg" variant="outline"><a href="#features">Explore the platform</a></Button></div></Reveal>
      </section>

      <footer className="bg-white py-12">
        <div className="container-page">
          <div className="grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div><Logo /><p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">Smart circular waste management for cleaner markets, stronger communities, and a more sustainable Bengaluru.</p></div>
            <div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-900">Navigate</p><div className="mt-4 grid gap-3 text-sm text-slate-500"><a className="hover:text-emerald-600" href="#features">Platform</a><a className="hover:text-emerald-600" href="#workflow">How it works</a><a className="hover:text-emerald-600" href="#impact">Impact</a></div></div>
            <div><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-900">Connect</p><div className="mt-4 grid gap-3 text-sm text-slate-500"><a className="hover:text-emerald-600" href="mailto:hello@ecoloop.city">hello@ecoloop.city</a><span>Bengaluru, Karnataka</span><a className="hover:text-emerald-600" href="#top">Faculty & research</a></div></div>
          </div>
          <div className="flex flex-col gap-3 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 EcoLoop. Built for cleaner markets.</p><p>Small Stock. Zero Waste. Smart Market.</p></div>
        </div>
      </footer>
    </main>
  );
}
