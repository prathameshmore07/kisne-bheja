import Link from "next/link";
import LandingConfidenceDemo from "@/components/LandingConfidenceDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body selection:bg-ink selection:text-paper">
      {/* Navigation */}
      <nav className="border-b border-line bg-paper/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ink" />
              Kisne Bheja
            </Link>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-line/60 text-muted">
              UPI Reconciliation
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <Link href="/dashboard/metrics" className="text-muted hover:text-ink transition-colors">
              Benchmark (100 Tx)
            </Link>
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded bg-ink text-paper hover:opacity-90 transition-opacity font-medium shadow-xs"
            >
              Open Dashboard →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-white text-xs font-mono text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              Deterministic Confidence Ledger + Gemini 2.5
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.15]">
              When ₹499 arrives on UPI, <span className="underline decoration-line decoration-2 underline-offset-4">who sent it?</span>
            </h1>

            <p className="text-base sm:text-lg text-muted font-normal leading-relaxed max-w-xl">
              Indian direct-to-consumer merchants lose hours manually matching identical payment amounts from static QR codes and shared links.
              Kisne Bheja pairs a pure mathematical Confidence Ledger with bounded AI clarification to resolve payments with mathematical certainty.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-md bg-ink text-paper font-mono text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
              >
                Launch Merchant Dashboard →
              </Link>
              <Link
                href="/dashboard/metrics"
                className="px-5 py-3 rounded-md border border-line bg-white text-ink font-mono text-sm hover:bg-paper transition-colors"
              >
                View Benchmark Metrics
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-line font-mono text-xs">
              <div>
                <div className="font-display text-2xl font-bold text-ink">100%</div>
                <div className="text-muted mt-0.5">Deterministic Math</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-green">0.0%</div>
                <div className="text-muted mt-0.5">False Auto-Links</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-ink">Max 1</div>
                <div className="text-muted mt-0.5">Follow-Up Rule</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            <LandingConfidenceDemo />
          </div>
        </div>
      </section>

      {/* Problem Framing */}
      <section className="border-t border-line bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">The Problem</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              The Indian UPI Reconciliation Blind Spot
            </h2>
            <p className="text-sm text-muted font-mono mt-2">
              Static QR codes and unlinked payment links decouple the payment notification from the customer cart.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-red mb-3">01 · Amount Collisions</div>
              <h3 className="font-display text-base font-bold mb-2">Multiple Identical Orders</h3>
              <p className="text-xs text-muted leading-relaxed">
                When three customers order a ₹499 Blue Kurta, ₹499 Red Kurta, and ₹499 Tuition Fee within 10 minutes, amount alone cannot identify the buyer.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-amber mb-3">02 · VPA Obfuscation</div>
              <h3 className="font-display text-base font-bold mb-2">Unlinked Payer Identities</h3>
              <p className="text-xs text-muted leading-relaxed">
                Customers often pay from family members UPI IDs (<code className="font-mono text-[11px]">husband_upi@okaxis</code>) that do not match their registered checkout names.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-ink mb-3">03 · Manual Screenshot Chasing</div>
              <h3 className="font-display text-base font-bold mb-2">Merchant Overhead</h3>
              <p className="text-xs text-muted leading-relaxed">
                Merchants spend hours texting customers &ldquo;Please send payment screenshot with UTR number&rdquo;, causing shipping delays and abandoned carts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Resolves */}
      <section className="border-t border-line py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">Pipeline Architecture</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              How the Confidence Ledger Resolves Payments
            </h2>
            <p className="text-sm text-muted font-mono mt-2">
              A transparent, multi-signal evidence accumulator that only takes automated action when thresholds are cleared.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 1</div>
              <h3 className="font-display font-bold text-base mb-2">Webhook Ingestion</h3>
              <p className="text-xs text-muted leading-relaxed">
                HMAC SHA-256 verified ingestion with strict idempotency guards against duplicate webhook deliveries.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 2</div>
              <h3 className="font-display font-bold text-base mb-2">Multi-Signal Scoring</h3>
              <p className="text-xs text-muted leading-relaxed">
                Evaluates exact amount match, time decay curves, order age penalties, and privacy-hashed VPA history.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 3</div>
              <h3 className="font-display font-bold text-base mb-2">Bounded Clarification</h3>
              <p className="text-xs text-muted leading-relaxed">
                If ambiguous (≤60%), drafts a single disambiguating question via Gemini 2.5 with strict Zod validation.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 4</div>
              <h3 className="font-display font-bold text-base mb-2">Reversible Settlement</h3>
              <p className="text-xs text-muted leading-relaxed">
                Auto-links at ≥85% confidence. Any decision can be unlinked with one click, restoring state and logging negative evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Guardrails */}
      <section className="border-t border-line bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">Trust & Safety</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              What AI Does NOT Do
            </h2>
            <p className="text-sm text-muted font-mono mt-2">
              Financial safety requires strict architectural boundaries between probabilistic language models and deterministic accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">No LLM Math or Balance Modification</div>
              <p className="text-xs text-muted leading-relaxed">
                Gemini never calculates confidence scores, sums weights, or changes database records. Scoring math is 100% pure TypeScript.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Strict Schema Validation (Zod)</div>
              <p className="text-xs text-muted leading-relaxed">
                Raw LLM outputs are validated against strict Zod schemas before touching the pipeline. Invalid responses immediately fall back to offline keyword matchers.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Max 1 Follow-Up Stopping Rule</div>
              <p className="text-xs text-muted leading-relaxed">
                The system will never send multiple messages to a customer. If a customer reply is vague or inconclusive, the payment routes safely to manual review.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Deterministic Self-Correction</div>
              <p className="text-xs text-muted leading-relaxed">
                Rejecting or unlinking an order injects a -100% negative evidence signal into the SQLite ledger, ensuring the system never repeats a mistake.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-10 font-mono text-xs text-muted">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-display font-bold text-ink">Kisne Bheja</span> — Deterministic UPI & Razorpay Reconciliation
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-ink transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/metrics" className="hover:text-ink transition-colors">
              Benchmark
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
