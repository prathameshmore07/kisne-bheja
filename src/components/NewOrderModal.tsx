"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function NewOrderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [productName, setProductName] = useState("");
  const [rupees, setRupees] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerVpa, setCustomerVpa] = useState("");
  const [customerCardLast4, setCustomerCardLast4] = useState("");
  const [customerCardNetwork, setCustomerCardNetwork] = useState("Visa");
  const [staleDays, setStaleDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confidence forecast state
  const [collidingOrders, setCollidingOrders] = useState<any[]>([]);
  const [isCheckingCollision, setIsCheckingCollision] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (!rupees.trim()) {
      setCollidingOrders([]);
      return;
    }

    const parsedRupees = parseFloat(rupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setCollidingOrders([]);
      return;
    }

    const paise = Math.round(parsedRupees * 100);
    const timer = setTimeout(async () => {
      setIsCheckingCollision(true);
      try {
        const res = await fetch(`/api/orders?forecast_amount=${paise}`);
        const data = await res.json();
        if (data.colliding_orders) {
          setCollidingOrders(data.colliding_orders);
        }
      } catch {
        setCollidingOrders([]);
      } finally {
        setIsCheckingCollision(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [rupees]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim() || !rupees.trim()) return;

    const parsedRupees = parseFloat(rupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setError("Please enter a valid amount in rupees");
      return;
    }

    const paise = Math.round(parsedRupees * 100);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName.trim(),
          amount: paise,
          customer_name: customerName.trim() || undefined,
          customer_vpa: customerVpa.trim() || undefined,
          customer_card_last4: customerCardLast4.trim() || undefined,
          customer_card_network: customerCardLast4.trim() ? customerCardNetwork : undefined,
          stale_days: parseInt(staleDays, 10) || 7,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create order");
      }

      setIsOpen(false);
      setProductName("");
      setRupees("");
      setCustomerName("");
      setCustomerVpa("");
      setCustomerCardLast4("");
      setCollidingOrders([]);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-xs font-mono px-3 py-1.5 rounded border border-line bg-paper text-ink hover:border-ink transition-colors cursor-pointer flex items-center gap-1.5"
      >
        <span>+</span>
        <span>New Order</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white border border-line rounded-lg w-full max-w-md p-6 font-body shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
              <div>
                <h3 className="font-display font-bold text-lg text-ink">Create Pending Order</h3>
                <p className="text-xs text-muted">Register an expected customer order</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-ink font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                  Product / Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Blue Kurta (Size M)"
                  className="w-full text-xs font-body px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                  Order Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={rupees}
                  onChange={(e) => setRupees(e.target.value)}
                  placeholder="499.00"
                  className="w-full text-xs font-mono px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              {/* Real-time Order Confidence Forecast Warning */}
              {collidingOrders.length > 0 && (
                <div className="p-3 bg-amber/10 border border-amber/30 rounded text-xs space-y-1 animate-fadeIn">
                  <div className="font-semibold text-amber flex items-center gap-1.5 font-mono">
                    <svg className="w-3.5 h-3.5 text-amber shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <span>Confidence Forecast: Price Collision</span>
                  </div>
                  <p className="text-muted leading-relaxed font-body">
                    This shares a price (₹{parseFloat(rupees).toFixed(2)}) with{" "}
                    <span className="text-ink font-medium">
                      {collidingOrders.length} other pending order{collidingOrders.length > 1 ? "s" : ""}
                    </span>{" "}
                    ({collidingOrders.map((o) => o.product_name).join(", ")}). A payment for either may need customer confirmation.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full text-xs font-body px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                  Customer UPI ID (Optional — hashed)
                </label>
                <input
                  type="text"
                  value={customerVpa}
                  onChange={(e) => setCustomerVpa(e.target.value)}
                  placeholder="e.g. priya@okhdfcbank"
                  className="w-full text-xs font-mono px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                />
              </div>

              {/* Multi-Payment-Method: Card Identity Proxy */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                    Card Last 4 (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={customerCardLast4}
                    onChange={(e) => setCustomerCardLast4(e.target.value)}
                    placeholder="e.g. 4242"
                    className="w-full text-xs font-mono px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">
                    Card Network
                  </label>
                  <select
                    value={customerCardNetwork}
                    onChange={(e) => setCustomerCardNetwork(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-paper border border-line rounded focus:outline-none focus:border-ink transition-colors"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="RuPay">RuPay</option>
                    <option value="Amex">Amex</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red font-mono bg-red/10 p-2 rounded border border-red/20">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={loading}
                  className="text-xs font-mono px-3 py-2 rounded text-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !productName.trim() || !rupees.trim()}
                  className="text-xs font-mono font-medium px-4 py-2 bg-ink text-paper rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? "Creating..." : "Save Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
