import Link from "next/link";
import LandingConfidenceDemo from "@/components/LandingConfidenceDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body selection:bg-ink selection:text-paper">
      {/* Navigation */}
      <nav className="border-b border-line bg-paper/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ink" />
              Kisne Bheja
            </Link>
            <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-line/60 text-muted">
              UPI Order Matching
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <Link href="/dashboard/metrics" className="text-muted hover:text-ink transition-colors">
              How well it worked
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
              <span className="w-1.5 h-1.5 rounded-full bg-green" />
              Automated UPI payment matching for Indian stores
            </div>

            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-ink leading-[1.15]">
              Your payment arrived. <br />
              <span className="underline decoration-line decoration-2 underline-offset-4">We find the order it belongs to.</span>
            </h1>

            <p className="text-base sm:text-lg text-muted font-normal leading-relaxed max-w-xl">
              When customers pay through static QR codes or shared links, identical amounts collide. Kisne Bheja matches the payment to the right order in seconds, asking the customer one simple question only when unsure.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-md bg-ink text-paper font-mono text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
              >
                Launch Dashboard →
              </Link>
              <Link
                href="/dashboard/metrics"
                className="px-5 py-3 rounded-md border border-line bg-white text-ink font-mono text-sm hover:bg-paper transition-colors"
              >
                How well it worked
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 border-t border-line font-mono text-xs">
              <div>
                <div className="font-display text-2xl font-bold text-ink">100%</div>
                <div className="text-muted mt-0.5">Clear reasons for every match</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-green">0.0%</div>
                <div className="text-muted mt-0.5">Wrong automatic matches</div>
              </div>
              <div>
                <div className="font-display text-2xl font-bold text-ink">1 ask max</div>
                <div className="text-muted mt-0.5">Never spams your customers</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-center">
            <LandingConfidenceDemo />
            <p className="text-[11px] font-mono text-muted mt-3 text-center">
              This is a live preview. Try it for real in the merchant dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* Problem Framing */}
      <section className="border-t border-line bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">The problem</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              Why Indian stores lose hours matching payments
            </h2>
            <p className="text-sm text-muted font-body mt-2">
              When money lands in your bank, UPI notifications do not tell you which cart was paid for.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-red mb-3">01 · Same-amount orders</div>
              <h3 className="font-display text-base font-bold mb-2">Multiple orders cost the same</h3>
              <p className="text-xs text-muted leading-relaxed">
                When three customers buy a ₹499 Blue Kurta, ₹499 Red Kurta, and ₹499 Gift Box around the same time, the price alone cannot tell you who paid.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-amber mb-3">02 · Unmatched UPI names</div>
              <h3 className="font-display text-base font-bold mb-2">Paying from family accounts</h3>
              <p className="text-xs text-muted leading-relaxed">
                Customers often pay from a spouse or family member UPI ID that does not match the name on the shipping address.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper shadow-2xs">
              <div className="font-mono text-xs font-bold uppercase text-ink mb-3">03 · Chasing screenshots</div>
              <h3 className="font-display text-base font-bold mb-2">Manual back-and-forth messages</h3>
              <p className="text-xs text-muted leading-relaxed">
                Store owners waste hours texting customers &ldquo;Please send payment screenshot with UTR number&rdquo;, delaying fulfillment and causing confusion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Resolves */}
      <section className="border-t border-line py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">How it works</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              From incoming payment to matched order
            </h2>
            <p className="text-sm text-muted font-body mt-2">
              Every check is transparent, and the system only matches automatically when it is certain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 1</div>
              <h3 className="font-display font-bold text-base mb-2">Payment arrives</h3>
              <p className="text-xs text-muted leading-relaxed">
                The incoming transaction notification arrives securely from your payment gateway.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 2</div>
              <h3 className="font-display font-bold text-base mb-2">We check your orders</h3>
              <p className="text-xs text-muted leading-relaxed">
                We compare the amount, arrival time, order age, and past payment history against your pending orders.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 3</div>
              <h3 className="font-display font-bold text-base mb-2">If unsure, we ask</h3>
              <p className="text-xs text-muted leading-relaxed">
                If multiple orders share the same amount, we draft one clear WhatsApp question asking what they ordered.
              </p>
            </div>

            <div className="bg-white border border-line rounded-lg p-5 shadow-xs">
              <div className="font-mono text-xs text-muted mb-2">STEP 4</div>
              <h3 className="font-display font-bold text-base mb-2">We match it</h3>
              <p className="text-xs text-muted leading-relaxed">
                Once confirmed, the order is marked paid. You can review or unlink any payment anytime with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="border-t border-line bg-white py-16">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="text-xs uppercase tracking-widest text-muted font-mono mb-2">Trust and control</div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink">
              Your money stays under your control
            </h2>
            <p className="text-sm text-muted font-body mt-2">
              We never guess with your money. Every action is bounded and reversible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">AI never touches your money</div>
              <p className="text-xs text-muted leading-relaxed">
                AI only writes friendly questions and understands customer replies. It never calculates amounts or moves bank balances.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Only one follow-up question</div>
              <p className="text-xs text-muted leading-relaxed">
                We never message a customer twice. If a customer reply is unclear, we route the payment directly to you for a quick check.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Every match is reversible</div>
              <p className="text-xs text-muted leading-relaxed">
                If an order is ever matched incorrectly, clicking Unlink restores the order to pending and ensures the system avoids that mistake again.
              </p>
            </div>

            <div className="border border-line rounded-lg p-6 bg-paper">
              <div className="font-mono text-xs font-bold text-ink uppercase mb-2">Built for privacy</div>
              <p className="text-xs text-muted leading-relaxed">
                Customer UPI IDs are securely hashed with SHA-256 so raw payment identifiers are never exposed or stored in plain text.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-paper py-10 font-mono text-xs text-muted">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-display font-bold text-ink">Kisne Bheja</span> : UPI payment reconciliation
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-ink transition-colors">
              Dashboard
            </Link>
            <Link href="/dashboard/metrics" className="hover:text-ink transition-colors">
              How well it worked
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
