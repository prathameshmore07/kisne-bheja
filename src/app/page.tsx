import Link from "next/link";
import LandingConfidenceDemo from "@/components/LandingConfidenceDemo";
import BrandWordmark from "@/components/BrandWordmark";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body selection:bg-ink selection:text-paper">
      {/* Top Navigation */}
      <nav className="border-b border-line bg-paper sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center">
            <BrandWordmark size="md" />
          </Link>

          <div className="flex items-center gap-4 sm:gap-6 text-xs font-mono">
            <Link href="/dashboard/metrics" className="text-muted hover:text-ink transition-colors">
              Accuracy benchmark
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="px-3.5 py-1.5 rounded bg-ink text-paper hover:opacity-90 transition-opacity font-medium shadow-xs"
            >
              Open Ledger →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="text-[11px] font-mono uppercase tracking-widest text-muted font-semibold">
              Track 04 · AI Finance Controller
            </div>

            <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.08]">
              Money arrives. <br />
              The system finds which order it belongs to.
            </h1>

            <p className="text-base sm:text-lg text-muted font-normal leading-relaxed max-w-xl">
              When multiple orders share a price, Kisne Bheja checks the evidence and asks you directly only when it is genuinely unsure — never guessing.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
              <Link
                href="/dashboard"
                className="px-5 py-3 rounded bg-ink text-paper font-semibold hover:opacity-90 transition-opacity shadow-xs"
              >
                Open merchant ledger →
              </Link>
              <Link
                href="/dashboard/metrics"
                className="px-5 py-3 rounded border border-line bg-paper text-ink font-semibold hover:border-ink transition-colors"
              >
                View accuracy benchmark →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <LandingConfidenceDemo />
          </div>
        </div>
      </section>

      {/* Problem Section — Plain Document Prose & List, No Card Box */}
      <section className="border-t border-line py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-10 max-w-2xl">
            Why online stores lose hours matching incoming payments
          </h2>

          <div className="space-y-8 max-w-2xl text-sm leading-relaxed">
            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">01</span>
              <div>
                <strong className="text-ink font-semibold text-base block mb-1">
                  Same-price orders collide
                </strong>
                <p className="text-muted">
                  When three customers buy a ₹499 Blue Kurta, a ₹499 Red Kurta, and a ₹499 Gift Box around the same time, the price alone cannot tell you who paid.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">02</span>
              <div>
                <strong className="text-ink font-semibold text-base block mb-1">
                  No order ID on incoming bank transfers
                </strong>
                <p className="text-muted">
                  Payments arriving via direct card, netbanking, or wallet links contain bank authorization codes but no cart or checkout metadata.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">03</span>
              <div>
                <strong className="text-ink font-semibold text-base block mb-1">
                  Account names rarely match delivery addresses
                </strong>
                <p className="text-muted">
                  Customers frequently pay using a family member or spouse account, making name matching an unreliable signal on its own.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Seller Voice Quote */}
      <section className="border-t border-line py-16 bg-paper/40">
        <div className="max-w-3xl mx-auto px-6">
          <blockquote className="space-y-4">
            <p className="font-display text-xl sm:text-2xl font-normal text-ink leading-relaxed italic">
              &ldquo;Every evening around 8 PM, I sit with bank alerts on my phone, trying to match timestamps. When two customers pay ₹499 in the same hour, the notification only gives me an authorization code. I have to text both and wait before packing the box.&rdquo;
            </p>
            <footer className="flex items-center gap-3 text-xs font-mono pt-1 text-muted">
              <span className="w-8 h-[1px] bg-line inline-block" />
              <span className="font-bold text-ink">Ananya Mehra</span>
              <span>· Founder, Chidiya Handlooms (Jaipur)</span>
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Four-Stage Flow — Connected Un-Boxed Numbered Sequence */}
      <section className="border-t border-line py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-12">
            How payment reconciliation works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="font-mono text-xs text-muted mb-2">01</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">Payment arrives</h3>
              <p className="text-xs text-muted leading-relaxed">
                The transaction notification arrives instantly from Razorpay test mode.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">02</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">Evidence is checked</h3>
              <p className="text-xs text-muted leading-relaxed">
                Amount, arrival timing, order age, and past card/bank history are weighted against all pending orders.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">03</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">If unsure, you are asked</h3>
              <p className="text-xs text-muted leading-relaxed">
                When candidates share a price, the system frames the exact distinction in your dashboard with recent pattern recognition.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">04</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">Payment is matched</h3>
              <p className="text-xs text-muted leading-relaxed">
                The order is marked paid and ready to fulfill. Every match remains fully reversible if a mistake is made.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Invariants — Plain List, No Borders, No Cards */}
      <section className="border-t border-line py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-10 max-w-xl">
            What the system never does
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-3xl">
            <div>
              <div className="text-ink font-bold text-base mb-1">It does not move money</div>
              <p className="text-xs text-muted leading-relaxed">
                The controller only reconciles accounting records. It never initiates refunds, debits, or transfers.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1">It does not decide alone</div>
              <p className="text-xs text-muted leading-relaxed">
                When evidence is below the auto-resolution threshold, the decision is held for your review rather than guessed.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1">Unclear cases go to the merchant</div>
              <p className="text-xs text-muted leading-relaxed">
                If the model or evidence cannot clearly differentiate two candidates, the payment is held safely in the manual review queue.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1">Every decision is recorded</div>
              <p className="text-xs text-muted leading-relaxed">
                Every signal weight, framing question, and merchant tap is logged into an immutable audit trail.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-12 font-mono text-xs text-muted">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandWordmark size="sm" />
            <span className="text-muted">: All benchmark numbers are measured against 100 synthetic payments with known ground truth, not assumed.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-ink transition-colors">
              Ledger
            </Link>
            <Link href="/dashboard/metrics" className="hover:text-ink transition-colors">
              Benchmark results
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
