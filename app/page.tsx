import { CustomerRequestForm } from "@/components/customer-request-form";

export default function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(237,106,36,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(23,33,43,0.08),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#f4f7fb_45%,_#eef2f6_100%)]" />
      <div className="animate-soft-pulse absolute left-[-4rem] top-14 -z-10 h-48 w-48 rounded-full bg-orange-300/25 blur-3xl" />
      <div className="animate-soft-pulse absolute right-[-5rem] top-1/3 -z-10 h-64 w-64 rounded-full bg-slate-300/25 blur-3xl" style={{ animationDelay: "1.8s" }} />
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="max-w-2xl animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "40ms" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuel-500">Fuel10</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">No fuel? We bring it to you.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A production-oriented emergency fuel platform with location-aware intake, configurable pricing, and a dispatch-ready backend foundation.</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "120ms" }}>
              <p className="text-sm font-semibold text-slate-900">Location aware</p>
              <p className="mt-1 text-sm text-slate-600">Browser GPS first, manual coordinates when needed.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "170ms" }}>
              <p className="text-sm font-semibold text-slate-900">Dispatch ready</p>
              <p className="mt-1 text-sm text-slate-600">Serviceability scoring and persistence are in place.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "220ms" }}>
              <p className="text-sm font-semibold text-slate-900">SMS fallback</p>
              <p className="mt-1 text-sm text-slate-600">FUEL 3 PETROL can become a fallback request.</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-950 p-5 text-slate-100 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "260ms" }}>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-300">Customer flow</p>
            <p className="mt-3 text-base leading-7 text-slate-300">Open Fuel10, capture location, choose fuel and quantity, confirm the request, and hand it off to the dispatch pipeline.</p>
          </div>
        </section>

        <section className="lg:pl-4 animate-rise-in motion-reduce:animate-none" style={{ animationDelay: "140ms" }}>
          <CustomerRequestForm />
        </section>
      </div>
    </main>
  );
}
