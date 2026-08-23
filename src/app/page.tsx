import Link from "next/link";
import Image from "next/image";
import LandingConfidenceDemo from "@/components/LandingConfidenceDemo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper text-ink font-body selection:bg-ink selection:text-paper">
      {/* Navigation */}
      <nav className="border-b border-line bg-paper sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="hover:opacity-85 transition-opacity flex items-center">
            <Image
              src="/brand/typography/hero_typography.png"
              alt="kisne bheja"
              width={200}
              height={46}
              priority
              className="h-9 sm:h-10 w-auto object-contain"
            />
          </Link>

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
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-[1.08]">
              Your payment arrived. <br />
              We find the order it belongs to.
            </h1>

            <p className="text-lg text-muted font-normal leading-relaxed max-w-lg">
              When customers pay through static QR codes or shared links, amounts collide. Kisne Bheja asks the customer one plain question only when unsure, and matches the order immediately.
            </p>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 rounded bg-ink text-paper font-mono text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
              >
                Open Dashboard →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <LandingConfidenceDemo />
          </div>
        </div>
      </section>

      {/* Problem Section — Plain Document List, No Boxes */}
      <section className="border-t border-line py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4 max-w-xl">
            Why Indian stores lose hours matching UPI payments
          </h2>
          <p className="text-base text-muted font-normal mb-12 max-w-xl leading-relaxed">
            When money lands in your bank, UPI notifications do not include customer cart details.
          </p>

          <div className="space-y-8 max-w-2xl text-sm leading-relaxed">
            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">01</span>
              <div>
                <strong className="text-ink font-medium text-base block mb-1">Same-price orders</strong>
                <p className="text-muted">
                  When three customers buy a ₹499 Blue Kurta, a ₹499 Red Kurta, and a ₹499 Gift Box around the same time, the price alone cannot tell you who paid.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">02</span>
              <div>
                <strong className="text-ink font-medium text-base block mb-1">Unmatched UPI names</strong>
                <p className="text-muted">
                  Customers frequently pay from a spouse or family member UPI ID that does not match the name entered on the delivery address.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="font-mono text-xs text-muted mt-1 w-6 shrink-0">03</span>
              <div>
                <strong className="text-ink font-medium text-base block mb-1">Chasing screenshots</strong>
                <p className="text-muted">
                  Store owners spend hours texting customers for payment screenshots and UTR numbers, delaying fulfillment and confusing customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Horizontal Numbered Sequence, No Card Wrappers */}
      <section className="border-t border-line py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-12">
            How it works
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="font-mono text-xs text-muted mb-2">01</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">Payment arrives</h3>
              <p className="text-xs text-muted leading-relaxed">
                The transaction notification arrives instantly from your payment gateway.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">02</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">We check your orders</h3>
              <p className="text-xs text-muted leading-relaxed">
                We compare amount, timing, order age, and past payment history against pending orders.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">03</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">If unsure, we ask</h3>
              <p className="text-xs text-muted leading-relaxed">
                If multiple orders share the same price, we ask one polite WhatsApp question.
              </p>
            </div>

            <div>
              <div className="font-mono text-xs text-muted mb-2">04</div>
              <h3 className="font-display font-bold text-lg text-ink mb-2">We match it</h3>
              <p className="text-xs text-muted leading-relaxed">
                Once confirmed, the order is marked paid. You can review or unlink anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety — Plain Document List, No Cards, No Borders */}
      <section className="border-t border-line py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink mb-4 max-w-xl">
            Your money stays under your control
          </h2>
          <p className="text-base text-muted font-normal mb-12 max-w-xl leading-relaxed">
            Every action is transparent, bounded, and reversible.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 max-w-3xl">
            <div>
              <div className="text-ink font-bold text-base mb-1.5">AI never touches your money</div>
              <p className="text-xs text-muted leading-relaxed">
                AI only drafts friendly customer questions and reads their replies. It never calculates amounts or moves bank balances.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1.5">Only one follow-up question</div>
              <p className="text-xs text-muted leading-relaxed">
                We never message a customer twice. If a customer reply is unclear, we route the payment directly to you for a quick check.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1.5">Every match is reversible</div>
              <p className="text-xs text-muted leading-relaxed">
                If an order is ever matched incorrectly, clicking Unlink restores the order to pending and ensures the system avoids repeating the error.
              </p>
            </div>

            <div>
              <div className="text-ink font-bold text-base mb-1.5">Built for privacy</div>
              <p className="text-xs text-muted leading-relaxed">
                Customer UPI IDs are securely hashed with SHA-256 so raw payment identifiers are never exposed or stored in plain text.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-12 font-mono text-xs text-muted">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/typography/hero_typography.png"
              alt="kisne bheja"
              width={140}
              height={32}
              className="h-7 w-auto object-contain"
            />
            <span className="text-muted">: UPI payment reconciliation</span>
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
