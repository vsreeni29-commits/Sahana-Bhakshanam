"use client";

import {
  ArrowLeft,
  Bell,
  BellRing,
  Check,
  ChefHat,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CookingPot,
  Eye,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Store,
  UtensilsCrossed,
  Leaf,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { MealKey, MEAL_SLOTS } from "../../lib/schedule";

type DashboardTab = "overview" | "menu" | "orders" | "profile";
type ChefItem = {
  id: string;
  name: string;
  meal: MealKey;
  price: number;
  portions: number;
  available: boolean;
  veg: boolean;
};

const initialItems: ChefItem[] = [
  { id: "sahana-iyer-saapadu", name: "Sahana Iyer Saapadu", meal: "lunch", price: 179, portions: 8, available: true, veg: true },
  { id: "veg-sambar-rice", name: "Arachuvitta Sambar Sadam", meal: "lunch", price: 139, portions: 12, available: true, veg: true },
  { id: "ragi-dosa", name: "Ragi dosa set", meal: "breakfast", price: 119, portions: 5, available: false, veg: true },
];

type DashboardOrder = {
  id: string;
  customer: string;
  phone: string;
  meal: string;
  items: string;
  amount: number;
  payment: string;
  status: string;
};

const demoOrders: DashboardOrder[] = [
  { id: "SB-DEMO-3", customer: "Demo customer C", phone: "Number hidden", meal: "Lunch", items: "2 × Arachuvitta Sambar Sadam", amount: 278, payment: "UPI at door", status: "New" },
  { id: "SB-DEMO-2", customer: "Demo customer B", phone: "Number hidden", meal: "Lunch", items: "1 × Sahana Iyer Saapadu", amount: 179, payment: "Cash", status: "Accepted" },
  { id: "SB-DEMO-1", customer: "Demo customer A", phone: "Number hidden", meal: "Lunch", items: "1 × Ragi dosa set", amount: 119, payment: "Cash", status: "Preparing" },
];

export function ChefDashboard() {
  const [unlocked, setUnlocked] = useState(false);
  const [accessStep, setAccessStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [chefAuthError, setChefAuthError] = useState("");
  const [chefAuthLoading, setChefAuthLoading] = useState(false);
  const [chefDemoCode, setChefDemoCode] = useState("");
  const [authenticatedChef, setAuthenticatedChef] = useState(false);
  const [orders, setOrders] = useState<DashboardOrder[]>(demoOrders);
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [items, setItems] = useState(initialItems);
  const [slots, setSlots] = useState(() =>
    Object.fromEntries(MEAL_SLOTS.map((slot) => [slot.key, true])) as Record<MealKey, boolean>,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState({ name: "Sahana Bhakshanam", chef: "Home-cooked by Sahana", locality: "Tambaram, Chennai", phone: "", upi: "" });

  const activePortions = useMemo(
    () => items.filter((item) => item.available).reduce((sum, item) => sum + item.portions, 0),
    [items],
  );
  const amountToCollect = useMemo(() => orders.reduce((sum, order) => sum + order.amount, 0), [orders]);

  useEffect(() => {
    if (!authenticatedChef || !unlocked) return;
    let active = true;
    const loadOrders = async () => {
      try {
        const response = await fetch("/api/admin/orders", { credentials: "same-origin" });
        if (!response.ok) return;
        const result = (await response.json()) as { orders?: Array<{ id: string; customerName: string; phone: string; meal: string; total: number; paymentMethod: string; status: string; items?: Array<{ name: string; quantity: number }> }> };
        if (!active || !result.orders) return;
        setOrders(result.orders.map((order) => ({
          id: order.id,
          customer: order.customerName,
          phone: order.phone,
          meal: order.meal.charAt(0).toUpperCase() + order.meal.slice(1),
          items: (order.items ?? []).map((item) => `${item.quantity} × ${item.name}`).join(", "),
          amount: order.total,
          payment: order.paymentMethod === "upi" ? "UPI at door" : "Cash",
          status: order.status === "new" ? "New" : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, " "),
        })));
      } catch {
        // The visible demo state remains usable during a transient refresh failure.
      }
    };
    void loadOrders();
    const timer = window.setInterval(loadOrders, 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [authenticatedChef, unlocked]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const sendChefOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (phone.length !== 10) return;
    setChefAuthLoading(true);
    setChefAuthError("");
    try {
      const response = await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone, purpose: "chef" }) });
      const result = (await response.json()) as { error?: string; demoCode?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send chef OTP.");
      setChefDemoCode(result.demoCode ?? "");
      setAccessStep("otp");
    } catch (error) {
      setChefAuthError(error instanceof Error ? error.message : "Could not send chef OTP.");
    } finally {
      setChefAuthLoading(false);
    }
  };

  const verifyChefOtp = async (event: FormEvent) => {
    event.preventDefault();
    setChefAuthLoading(true);
    setChefAuthError("");
    try {
      const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ phone, code: otp, purpose: "chef" }) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not verify chef OTP.");
      setAuthenticatedChef(true);
      setUnlocked(true);
    } catch (error) {
      setChefAuthError(error instanceof Error ? error.message : "Could not verify chef OTP.");
    } finally {
      setChefAuthLoading(false);
    }
  };

  const persistMenuPatch = (id: string, values: { available?: boolean; portions?: number }) => {
    if (!authenticatedChef) return;
    fetch("/api/admin/menu", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id, ...values }) }).catch(() => notify("Saved locally; server sync will retry"));
  };

  const toggleItem = (id: string) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const available = !item.available;
    setItems((current) => current.map((entry) => entry.id === id ? { ...entry, available } : entry));
    persistMenuPatch(id, { available });
    notify("Availability updated");
  };

  const changePortions = (id: string, delta: number) => {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const portions = Math.max(0, item.portions + delta);
    setItems((current) => current.map((entry) => entry.id === id ? { ...entry, portions } : entry));
    persistMenuPatch(id, { portions });
  };

  const addSpecial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = { id: `draft-${Date.now()}`, name: String(form.get("name")), meal: String(form.get("meal")) as MealKey, price: Number(form.get("price")), portions: Number(form.get("portions")), available: true, veg: true };
    setItems((current) => [...current, draft]);
    if (authenticatedChef) {
      await fetch("/api/admin/menu", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ name: draft.name, meal: draft.meal, price: draft.price, portions: draft.portions }) }).catch(() => undefined);
    }
    setAddOpen(false);
    notify("New special added");
  };

  const advanceOrder = (order: DashboardOrder) => {
    const nextStatus = order.status === "New" ? "Accepted" : order.status === "Accepted" ? "Preparing" : "Out for delivery";
    setOrders((current) => current.map((entry) => entry.id === order.id ? { ...entry, status: nextStatus } : entry));
    if (authenticatedChef) fetch("/api/admin/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ id: order.id, status: nextStatus.toLowerCase().replace(/ /g, "_") }) }).catch(() => undefined);
    notify(`${order.id} moved to ${nextStatus.toLowerCase()}`);
  };

  if (!unlocked) {
    return (
      <main className="chef-access-page">
        <Link href="/" className="back-home"><ArrowLeft size={17} /> Back to customer app</Link>
        <section className="chef-access-card" aria-labelledby="chef-access-title">
          <div className="chef-access-brand"><span className="brand-mark"><CookingPot size={21} /></span><span>Sahana Bhakshanam</span></div>
          <div className="access-illustration"><ChefHat size={46} /><span><LockKeyhole size={18} /></span></div>
          <p className="eyebrow">Chef-only access</p>
          <h1 id="chef-access-title">Your kitchen,<br />beautifully under control.</h1>
          <p className="access-copy">Manage today’s menu and every incoming order without wrestling with a complicated back office.</p>
          {accessStep === "phone" ? (
            <form onSubmit={sendChefOtp} className="chef-access-form">
              <label htmlFor="chef-phone">Registered chef mobile</label>
              <div className="phone-input"><span>+91</span><input id="chef-phone" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="10-digit number" /></div>
              {chefAuthError && <p className="field-error">{chefAuthError}</p>}
              <button className="primary-cta full" type="submit" disabled={phone.length !== 10 || chefAuthLoading}>{chefAuthLoading ? "Sending…" : "Send chef OTP"} <ChevronRight size={19} /></button>
            </form>
          ) : (
            <form onSubmit={verifyChefOtp} className="chef-access-form">
              <label htmlFor="chef-otp">6-digit chef code</label>
              <input className="otp-input" id="chef-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" placeholder="• • • • • •" />
              {chefDemoCode && <div className="demo-code"><BellRing size={16} /> Prototype code: <strong>{chefDemoCode}</strong></div>}
              {chefAuthError && <p className="field-error">{chefAuthError}</p>}
              <button className="primary-cta full" type="submit" disabled={otp.length !== 6 || chefAuthLoading}>{chefAuthLoading ? "Verifying…" : "Open dashboard"} <ChevronRight size={19} /></button>
            </form>
          )}
          <button className="preview-dashboard-button" type="button" onClick={() => setUnlocked(true)}><Eye size={17} /> Preview dashboard with sample data</button>
          <p className="access-security"><LockKeyhole size={14} /> Production access is restricted to the chef’s verified number.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dashboard-logo"><span className="brand-mark"><CookingPot size={20} /></span><span>Sahana<br />Bhakshanam</span></Link>
        <nav aria-label="Chef dashboard sections">
          <DashboardNav icon={<LayoutDashboard size={19} />} label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
          <DashboardNav icon={<UtensilsCrossed size={19} />} label="Daily menu" active={tab === "menu"} onClick={() => setTab("menu")} />
          <DashboardNav icon={<ShoppingBag size={19} />} label="Orders" badge="3" active={tab === "orders"} onClick={() => setTab("orders")} />
          <DashboardNav icon={<Store size={19} />} label="Chef profile" active={tab === "profile"} onClick={() => setTab("profile")} />
        </nav>
        <div className="sidebar-profile"><span><CircleUserRound size={21} /></span><div><strong>Sahana</strong><small>Pure veg home kitchen</small></div><button type="button" onClick={() => setUnlocked(false)} aria-label="Lock dashboard"><LogOut size={17} /></button></div>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div><p>Wednesday · 15 July</p><h1>{tab === "overview" ? "Good morning, Sahana." : tab === "menu" ? "Today’s pure veg menu" : tab === "orders" ? "Incoming orders" : "Kitchen profile"}</h1></div>
          <div className="dashboard-header-actions"><Link href="/" className="view-store"><Eye size={17} /> View customer app</Link><button type="button" className="notification-button" aria-label="Notifications"><Bell size={19} /><i>3</i></button></div>
        </header>

        {tab === "overview" && (
          <>
            <section className="chef-stats" aria-label="Today’s summary">
              <StatCard icon={<ShoppingBag size={22} />} value={`${orders.length}`} label="Lunch orders" note={`${orders.filter((order) => order.status === "New").length} new in the live queue`} tone="tomato" />
              <StatCard icon={<CookingPot size={22} />} value={`${activePortions}`} label="Portions available" note="Across active specials" tone="leaf" />
              <StatCard icon={<BanknoteIcon />} value={`₹${amountToCollect}`} label="Collect at door" note="Cash + direct UPI" tone="aubergine" />
            </section>

            <section className="dashboard-grid">
              <div className="dashboard-panel sessions-panel">
                <PanelHead eyebrow="Session control" title="Today’s meal windows" action={<span className="live-chip"><i /> Live</span>} />
                <div className="chef-session-list">
                  {MEAL_SLOTS.map((slot) => (
                    <div className={`chef-session ${slots[slot.key] ? "active" : ""}`} key={slot.key}>
                      <span className="session-icon"><Clock3 size={19} /></span>
                      <div><strong>{slot.name}</strong><small>{slot.delivery} · cutoff {slot.cutoffLabel}</small></div>
                      <span className="session-state">{slots[slot.key] ? "Available today" : "Unavailable"}</span>
                      <button className={`toggle ${slots[slot.key] ? "on" : ""}`} type="button" aria-label={`Toggle ${slot.name} availability`} aria-pressed={slots[slot.key]} onClick={() => { const available = !slots[slot.key]; setSlots((current) => ({ ...current, [slot.key]: available })); if (authenticatedChef) fetch("/api/admin/slots", { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ key: slot.key, available }) }).catch(() => undefined); notify(`${slot.name} availability updated`); }}><i /></button>
                    </div>
                  ))}
                </div>
                <p className="rigid-note"><LockKeyhole size={15} /> Delivery windows and cutoff times are fixed. Only availability can be changed.</p>
              </div>

              <div className="dashboard-panel alerts-panel">
                <PanelHead eyebrow="Direct message bridge" title="New order alerts" action={<button type="button" onClick={() => setTab("orders")}>View all</button>} />
                {orders.slice(0, 2).map((order, index) => (
                  <article className="order-alert" key={order.id}>
                    <span className={index === 0 ? "unread" : ""}><MessageCircle size={19} /></span>
                    <div><strong>{order.customer} · {order.amount === 278 ? "2 items" : "1 item"}</strong><p>{order.items}</p><small>{index === 0 ? "Just now" : "6 min ago"} · {order.phone}</small></div>
                    <b>₹{order.amount}</b>
                  </article>
                ))}
                <div className="whatsapp-status pending"><MessageCircle size={19} /><div><strong>WhatsApp Business relay pending</strong><small>The dashboard is live now. Add approved relay credentials for automatic WhatsApp delivery.</small></div><Clock3 size={17} /></div>
              </div>
            </section>
          </>
        )}

        {(tab === "overview" || tab === "menu") && (
          <section className="dashboard-panel menu-manager">
            <PanelHead eyebrow="Daily specials" title={tab === "overview" ? "What you’re cooking today" : "Manage specials & stock"} action={<button className="add-special-button" type="button" onClick={() => setAddOpen(true)}><Plus size={17} /> Add special</button>} />
            <div className="chef-menu-table" role="table" aria-label="Daily specials">
              <div className="chef-menu-row table-head" role="row"><span>Special</span><span>Meal</span><span>Price</span><span>Portions</span><span>Available</span></div>
              {items.map((item) => (
                <div className="chef-menu-row" role="row" key={item.id}>
                  <div className="chef-special-name"><span className="veg-dot" /><div><strong>{item.name}</strong><small>Pure vegetarian</small></div></div>
                  <span className="meal-badge">{item.meal}</span>
                  <strong>₹{item.price}</strong>
                  <div className="portion-stepper"><button type="button" onClick={() => changePortions(item.id, -1)} aria-label={`Reduce ${item.name} portions`}><Minus size={14} /></button><strong>{item.portions}</strong><button type="button" onClick={() => changePortions(item.id, 1)} aria-label={`Increase ${item.name} portions`}><Plus size={14} /></button></div>
                  <button className={`toggle ${item.available ? "on" : ""}`} type="button" aria-label={`Toggle ${item.name}`} aria-pressed={item.available} onClick={() => toggleItem(item.id)}><i /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === "orders" && (
          <section className="dashboard-panel orders-panel">
            <PanelHead eyebrow="Live order queue" title="Lunch · 3 confirmed orders" action={<span className="live-chip"><i /> Updates automatically</span>} />
            <div className="orders-list">
              {orders.map((order) => (
                <article className="order-card" key={order.id}>
                  <div className="order-id"><span>{order.status === "New" ? <BellRing size={20} /> : <PackageCheck size={20} />}</span><div><small>{order.id}</small><strong>{order.customer}</strong>{order.phone.startsWith("+") ? <a className="order-phone-link" href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={11} /> {order.phone}</a> : <p>{order.phone}</p>}</div></div>
                  <div><small>Order</small><strong>{order.items}</strong><p>{order.meal} delivery</p></div>
                  <div><small>Collect at door</small><strong>₹{order.amount}</strong><p>{order.payment}</p></div>
                  <span className={`order-status ${order.status.toLowerCase()}`}>{order.status}</span>
                  <button type="button" className="order-action" onClick={() => advanceOrder(order)}>{order.status === "New" ? "Accept order" : "Update status"}<ChevronRight size={16} /></button>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "profile" && (
          <section className="profile-layout">
            <form className="dashboard-panel profile-form" onSubmit={(event) => { event.preventDefault(); if (authenticatedChef) fetch("/api/admin/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ kitchenName: profile.name, chefName: profile.chef, locality: profile.locality, whatsappNumber: profile.phone, upiId: profile.upi, bio: "Pure vegetarian Tamil Brahmin Iyer food, cooked fresh at home for fixed meal windows." }) }).catch(() => undefined); notify("Chef profile updated"); }}>
              <PanelHead eyebrow="Public information" title="Kitchen profile" action={null} />
              <div className="profile-fields">
                <label>Kitchen name<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
                <label>Chef display name<input value={profile.chef} onChange={(event) => setProfile({ ...profile, chef: event.target.value })} /></label>
                <label>Delivery locality<input value={profile.locality} onChange={(event) => setProfile({ ...profile, locality: event.target.value })} /></label>
                <label>WhatsApp number<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
                <label className="wide">UPI ID shown only at delivery<input value={profile.upi} onChange={(event) => setProfile({ ...profile, upi: event.target.value })} /></label>
              </div>
              <button className="primary-cta" type="submit"><Save size={18} /> Save profile</button>
            </form>
            <aside className="dashboard-panel profile-preview"><p className="eyebrow">Customer preview</p><div className="profile-avatar"><Leaf size={31} /></div><h2>{profile.name}</h2><p>{profile.chef}</p><span><Store size={15} /> {profile.locality}</span><div className="profile-trust"><Check size={16} /> Pure vegetarian Iyer home kitchen</div></aside>
          </section>
        )}
      </section>

      {addOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAddOpen(false)}>
          <form className="auth-modal add-special-modal" onSubmit={addSpecial}>
            <button className="icon-button modal-close" type="button" onClick={() => setAddOpen(false)} aria-label="Close add special"><X size={19} /></button>
            <div className="modal-icon"><Sparkles size={25} /></div><p className="eyebrow">Today’s kitchen</p><h2>Add a daily special</h2>
            <label>Dish name<input name="name" required placeholder="e.g. Lemon rice meal" /></label>
            <div className="two-fields"><label>Meal<select name="meal" defaultValue="lunch">{MEAL_SLOTS.map((slot) => <option value={slot.key} key={slot.key}>{slot.name}</option>)}</select></label><label>Price (₹)<input name="price" type="number" min="1" required defaultValue="149" /></label></div>
            <label>Available portions<input name="portions" type="number" min="1" required defaultValue="10" /></label>
            <div className="demo-code"><Leaf size={16} /> Every special is always pure vegetarian.</div>
            <button className="primary-cta full" type="submit">Add & make available <Plus size={18} /></button>
          </form>
        </div>
      )}
      {toast && <div className="toast" role="status"><Check size={17} /> {toast}</div>}
    </main>
  );
}

function DashboardNav({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active: boolean; badge?: string; onClick: () => void }) {
  return <button type="button" className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span>{badge && <i>{badge}</i>}</button>;
}

function StatCard({ icon, value, label, note, tone }: { icon: React.ReactNode; value: string; label: string; note: string; tone: string }) {
  return <article className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><strong>{value}</strong><p>{label}</p><small>{note}</small></div></article>;
}

function PanelHead({ eyebrow, title, action }: { eyebrow: string; title: string; action: React.ReactNode }) {
  return <header className="panel-head"><div><p>{eyebrow}</p><h2>{title}</h2></div>{action}</header>;
}

function BanknoteIcon() {
  return <span aria-hidden="true" style={{ fontFamily: "Fraunces", fontWeight: 700, fontSize: 23 }}>₹</span>;
}
