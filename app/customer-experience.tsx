"use client";

import {
  ArrowRight,
  Banknote,
  BellRing,
  CalendarClock,
  Check,
  ChefHat,
  Clock3,
  CookingPot,
  Leaf,
  LockKeyhole,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  formatCountdown,
  getPrimarySession,
  getSlotStates,
  MealKey,
} from "../lib/schedule";

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  meal: MealKey;
  tag: string;
  remaining: number;
  veg: boolean;
  available: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  {
    id: "sahana-iyer-saapadu",
    name: "Sahana Iyer Saapadu",
    description: "Rice, paruppu & ghee, arachuvitta sambar, rasam, paruppu usili, curd & appalam",
    price: 179,
    image: "/food/hero-iyer-saapadu.webp",
    meal: "lunch",
    tag: "Iyer special",
    remaining: 8,
    veg: true,
    available: true,
  },
  {
    id: "veg-sambar-rice",
    name: "Arachuvitta Sambar Sadam",
    description: "Iyer-style sambar sadam, appalam & homemade pickle",
    price: 139,
    image: "/food/meal-veg-sambar.webp",
    meal: "lunch",
    tag: "Iyer classic",
    remaining: 12,
    veg: true,
    available: true,
  },
  {
    id: "ragi-dosa",
    name: "Ragi dosa set",
    description: "Two ragi dosas with coconut & tomato chutney",
    price: 119,
    image: "/food/meal-ragi-dosa.webp",
    meal: "breakfast",
    tag: "Wholesome",
    remaining: 5,
    veg: true,
    available: true,
  },
];

type Cart = Record<string, number>;
type CheckoutStage = "bag" | "details" | "confirmed";
type OrderConfirmation = {
  id: string;
  total: number;
  paymentMethod: "cash" | "upi";
  whatsappUrl: string | null;
  chefNotification: "sent" | "needs_setup" | "failed";
};

export function CustomerExperience() {
  const [now, setNow] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<MealKey | "all">("all");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [unavailableMeals, setUnavailableMeals] = useState<MealKey[]>([]);
  const [storeProfile, setStoreProfile] = useState({ kitchenName: "Sahana Bhakshanam", chefName: "Home-cooked by Sahana", locality: "Tambaram, Chennai" });
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginStep, setLoginStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [otpDemoCode, setOtpDemoCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [checkoutStage, setCheckoutStage] = useState<CheckoutStage>("bag");
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmation | null>(null);
  const [orderError, setOrderError] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const initialTimer = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/store")
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json()) as {
          menu?: Array<{ id: string; name: string; description: string; price: number; image: string; meal: MealKey; tag: string; portions: number; available: number | boolean; vegetarian: number | boolean }>;
          slots?: Array<{ key: MealKey; available: number | boolean }>;
          profile?: { kitchenName?: string; chefName?: string; locality?: string } | null;
        };
        if (!active) return;
        if (result.menu?.length) {
          setMenuItems(result.menu.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            image: item.image,
            meal: item.meal,
            tag: item.tag,
            remaining: item.portions,
            veg: Boolean(item.vegetarian),
            available: Boolean(item.available),
          })));
        }
        if (result.slots) setUnavailableMeals(result.slots.filter((slot) => !Boolean(slot.available)).map((slot) => slot.key));
        if (result.profile) setStoreProfile((current) => ({ kitchenName: result.profile?.kitchenName || current.kitchenName, chefName: result.profile?.chefName || current.chefName, locality: result.profile?.locality || current.locality }));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((response) => {
        if (active && response.ok) setLoggedIn(true);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const slots = useMemo(() => getSlotStates(now).map((slot) => unavailableMeals.includes(slot.key) ? { ...slot, state: "locked" as const } : slot), [now, unavailableMeals]);
  const primary = useMemo(() => {
    const scheduled = getPrimarySession(now);
    if (!unavailableMeals.includes(scheduled.key)) return scheduled;
    return slots
      .filter((slot) => slot.state === "open" || slot.state === "upcoming")
      .sort((a, b) => a.targetAt - b.targetAt)[0] ?? scheduled;
  }, [now, slots, unavailableMeals]);
  const countdown = formatCountdown(primary.targetAt, now);
  const visibleItems =
    selectedMeal === "all"
      ? menuItems
      : menuItems.filter((item) => item.meal === selectedMeal);
  const cartCount = Object.values(cart).reduce((sum, value) => sum + value, 0);
  const cartTotal = menuItems.reduce(
    (sum, item) => sum + (cart[item.id] ?? 0) * item.price,
    0,
  );

  const addItem = (item: MenuItem) => {
    const mealState = slots.find((slot) => slot.key === item.meal)?.state;
    if (mealState !== "open" || !item.available) {
      setToast(`${item.meal === "breakfast" ? "Breakfast" : "Lunch"} ordering is locked right now.`);
      return;
    }
    setCart((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }));
    setToast(`${item.name} added`);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((current) => {
      const next = Math.max(0, (current[id] ?? 0) + delta);
      const updated = { ...current, [id]: next };
      if (next === 0) delete updated[id];
      return updated;
    });
  };

  const scrollToMenu = () => {
    setSelectedMeal(primary.key);
    document.getElementById("today-menu")?.scrollIntoView({ behavior: "smooth" });
  };

  const sendOtp = async (event: FormEvent) => {
    event.preventDefault();
    if (phone.replace(/\D/g, "").length !== 10) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "consumer" }),
      });
      const result = (await response.json()) as { error?: string; demoCode?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send OTP.");
      setOtpDemoCode(result.demoCode ?? "");
      setLoginStep("otp");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setAuthLoading(false);
    }
  };

  const verifyOtp = async (event: FormEvent) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone, code: otp, purpose: "consumer" }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not verify OTP.");
      setLoggedIn(true);
      setLoginOpen(false);
      setLoginStep("phone");
      setOtp("");
      setToast("Mobile number verified");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not verify OTP.");
    } finally {
      setAuthLoading(false);
    }
  };

  const openLogin = () => {
    setLoginStep("phone");
    setOtp("");
    setAuthError("");
    setLoginOpen(true);
  };

  const submitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOrderLoading(true);
    setOrderError("");
    const data = new FormData(event.currentTarget);
    const selectedItems = menuItems.filter((item) => cart[item.id]);
    const meal = selectedItems[0]?.meal;
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          customerName: data.get("customerName"),
          address: data.get("address"),
          landmark: data.get("landmark"),
          paymentMethod: data.get("paymentMethod"),
          meal,
          items: selectedItems.map((item) => ({ id: item.id, quantity: cart[item.id] })),
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        order?: { id: string; total: number; paymentMethod: "cash" | "upi" };
        whatsappUrl?: string | null;
        chefNotification?: "sent" | "needs_setup" | "failed";
      };
      if (!response.ok || !result.order) throw new Error(result.error ?? "Could not confirm this order.");
      setOrderConfirmation({ ...result.order, whatsappUrl: result.whatsappUrl ?? null, chefNotification: result.chefNotification ?? "needs_setup" });
      setCart({});
      setCheckoutStage("confirmed");
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "Could not confirm this order.");
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label={`${storeProfile.kitchenName} home`}>
          <span className="brand-mark"><CookingPot size={20} aria-hidden="true" /></span>
          <span>{storeProfile.kitchenName}</span>
        </Link>
        <button className="location-button" type="button" aria-label={`Delivery location: ${storeProfile.locality}`}>
          <MapPin size={18} aria-hidden="true" />
          <span><small>Delivering around</small>{storeProfile.locality}</span>
        </button>
        <nav className="header-actions" aria-label="Account links">
          <Link href="/chef" className="chef-link"><ChefHat size={17} /> Chef view</Link>
          <button className="login-button" type="button" onClick={openLogin}>
            {loggedIn ? <Check size={18} /> : <UserRound size={18} />}
            {loggedIn ? "Verified" : "Login"}
          </button>
        </nav>
      </header>

      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className={`session-pill ${primary.state}`}>
            <span className="pulse-dot" aria-hidden="true" />
            {primary.state === "open"
              ? `${primary.name} orders open`
              : `Next up · ${primary.name}`}
          </div>
          <p className="eyebrow">{storeProfile.chefName} · Pure vegetarian</p>
          <h1 id="hero-title">Pure vegetarian.<br />Iyer tradition.<br />Made today.</h1>
          <p className="hero-intro">
            Traditional Tamil Brahmin Iyer meals, cooked at home in small batches and delivered fresh to your door.
            Once a slot closes, it stays closed—so every plate gets the care it deserves.
          </p>
          <div className="hero-cta-row">
            <button className="primary-cta" type="button" onClick={scrollToMenu}>
              {primary.state === "open" ? `Order ${primary.name.toLowerCase()}` : "See today’s menu"}
              <ArrowRight size={20} aria-hidden="true" />
            </button>
            <div className="pay-note">
              <Banknote size={20} aria-hidden="true" />
              <span><strong>No online payment</strong>Cash or UPI at your door</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-wrap">
            <Image
              src="/food/hero-iyer-saapadu.webp"
              alt="Pure vegetarian Tamil Iyer saapadu with rice, sambar, rasam, vegetables, curd and appalam"
              fill
              priority
              unoptimized
              sizes="(max-width: 900px) 100vw, 58vw"
            />
            <div className="image-caption"><Sparkles size={15} /> Today’s Iyer saapadu</div>
          </div>
          <div className="countdown-card" aria-live="polite">
            <div className="countdown-heading">
              <Clock3 size={21} aria-hidden="true" />
              <span>{primary.state === "open" ? `${primary.name} closes in` : "Ordering opens in"}</span>
            </div>
            <strong className="countdown-value">{countdown}</strong>
            <p>
              {primary.state === "open" ? `Order before ${primary.cutoffLabel}` : `${primary.name} · ${primary.delivery}`}
            </p>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Service promises">
        <div><Leaf size={24} /><span><strong>Pure vegetarian</strong>Traditional Iyer food</span></div>
        <div><CalendarClock size={24} /><span><strong>Fixed slots</strong>Cutoffs are final</span></div>
        <div><CookingPot size={24} /><span><strong>Cooked at home</strong>Fresh each day</span></div>
      </section>

      <section className="slots-section" aria-labelledby="slots-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Today’s rhythm</p>
            <h2 id="slots-title">Four meals. Clear cutoffs.</h2>
          </div>
          <p>Delivery windows never shift after orders begin.</p>
        </div>
        <div className="slot-grid">
          {slots.map((slot, index) => (
            <article className={`slot-card ${slot.state}`} key={slot.key}>
              <span className="slot-number">0{index + 1}</span>
              <div className="slot-card-top">
                <h3>{slot.name}</h3>
                <span className={`state-label ${slot.state}`}>
                  {slot.state === "open" ? "Open now" : slot.state === "upcoming" ? "Later today" : "Locked"}
                </span>
              </div>
              <p><Clock3 size={16} /> Delivery {slot.delivery}</p>
              <p><LockKeyhole size={16} /> Cutoff {slot.cutoffLabel}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="menu-section" id="today-menu" aria-labelledby="menu-title">
        <div className="section-heading menu-heading">
          <div>
            <p className="eyebrow">Made in small batches</p>
            <h2 id="menu-title">Today’s menu</h2>
          </div>
          <div className="meal-filter" aria-label="Filter menu by meal">
            <button className={selectedMeal === "all" ? "active" : ""} onClick={() => setSelectedMeal("all")} type="button">All</button>
            {slots.map((slot) => (
              <button
                className={selectedMeal === slot.key ? "active" : ""}
                onClick={() => setSelectedMeal(slot.key)}
                type="button"
                key={slot.key}
              >
                {slot.shortName}
              </button>
            ))}
          </div>
        </div>

        {visibleItems.length ? (
          <div className="menu-grid">
            {visibleItems.map((item) => {
              const slot = slots.find((entry) => entry.key === item.meal);
              const isOpen = slot?.state === "open" && item.available;
              return (
                <article className={`meal-card ${!isOpen ? "unavailable" : ""}`} key={item.id}>
                  <div className="meal-image">
                    <Image src={item.image} alt={item.name} fill unoptimized sizes="(max-width: 720px) 82vw, 33vw" />
                    <span className="meal-tag">{item.tag}</span>
                    <span className="food-type veg" aria-label="Pure vegetarian"><i /></span>
                  </div>
                  <div className="meal-content">
                    <div className="meal-title-row"><h3>{item.name}</h3><strong>₹{item.price}</strong></div>
                    <p>{item.description}</p>
                    <div className="meal-meta">
                      <span><Clock3 size={15} /> {slot?.shortName}</span>
                      <span><Leaf size={15} /> {item.remaining} portions left</span>
                    </div>
                    {cart[item.id] ? (
                      <div className="quantity-control" aria-label={`${item.name} quantity`}>
                        <button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label="Remove one"><Minus size={18} /></button>
                        <strong>{cart[item.id]}</strong>
                        <button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label="Add one"><Plus size={18} /></button>
                      </div>
                    ) : (
                      <button className="add-button" type="button" onClick={() => addItem(item)} disabled={!isOpen}>
                        {isOpen ? <><Plus size={18} /> Add to bag</> : <><LockKeyhole size={16} /> Ordering locked</>}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-menu"><Clock3 size={28} /><h3>Menu being plated</h3><p>The chef will publish this slot’s specials shortly.</p></div>
        )}
      </section>

      <section className="payment-banner">
        <div className="payment-icon"><ShieldCheck size={31} /></div>
        <div>
          <p className="eyebrow">Simple, human payment</p>
          <h2>Pay only when your food reaches you.</h2>
          <p>No cards, wallets, deposits, or payment links inside this app.</p>
        </div>
        <div className="payment-methods">
          <span><Banknote size={22} /> Cash at delivery</span>
          <span><QrCode size={22} /> Direct UPI to chef</span>
        </div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><CookingPot size={20} /></span><span>{storeProfile.kitchenName}</span></div>
        <p>Pure vegetarian Iyer food, cooked at home in honest small batches.</p>
        <Link href="/chef">Chef dashboard <ArrowRight size={16} /></Link>
      </footer>

      {cartCount > 0 && (
        <button className="floating-cart" type="button" onClick={() => setCartOpen(true)} aria-label={`Open bag with ${cartCount} items`}>
          <span><ShoppingBag size={21} /><i>{cartCount}</i></span>
          <strong>View bag · ₹{cartTotal}</strong>
          <ArrowRight size={19} />
        </button>
      )}

      {loginOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setLoginOpen(false)}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="icon-button modal-close" type="button" onClick={() => setLoginOpen(false)} aria-label="Close login"><X size={20} /></button>
            <div className="modal-icon"><Smartphone size={27} /></div>
            <p className="eyebrow">Secure mobile login</p>
            <h2 id="login-title">{loginStep === "phone" ? "Your number is your account." : "Enter the 6-digit code."}</h2>
            {loginStep === "phone" ? (
              <form onSubmit={sendOtp}>
                <label htmlFor="phone">Mobile number</label>
                <div className="phone-input"><span>+91</span><input id="phone" inputMode="numeric" autoComplete="tel" maxLength={10} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))} placeholder="10-digit number" required /></div>
                {authError && <p className="field-error">{authError}</p>}
                <button className="primary-cta full" type="submit" disabled={phone.length !== 10 || authLoading}>{authLoading ? "Sending…" : "Send OTP"} <ArrowRight size={19} /></button>
                <p className="privacy-note"><ShieldCheck size={16} /> Used only for identity and order updates.</p>
              </form>
            ) : (
              <form onSubmit={verifyOtp}>
                <p className="sent-note">Code sent to +91 {phone.slice(0, 5)} {phone.slice(5)}</p>
                <label htmlFor="otp">One-time password</label>
                <input className="otp-input" id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="• • • • • •" required />
                {otpDemoCode && <div className="demo-code"><BellRing size={16} /> Prototype code: <strong>{otpDemoCode}</strong></div>}
                {authError && <p className="field-error">{authError}</p>}
                <button className="primary-cta full" type="submit" disabled={otp.length !== 6 || authLoading}>{authLoading ? "Verifying…" : "Verify & continue"} <ArrowRight size={19} /></button>
                <button className="text-button" type="button" onClick={() => setLoginStep("phone")}>Use a different number</button>
              </form>
            )}
          </section>
        </div>
      )}

      {cartOpen && (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.currentTarget === event.target && setCartOpen(false)}>
          <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title">
            <div className="drawer-head"><div><p className="eyebrow">{checkoutStage === "bag" ? "Your order" : checkoutStage === "details" ? "Doorstep details" : "Order confirmed"}</p><h2 id="bag-title">{checkoutStage === "bag" ? "Fresh food in your bag" : checkoutStage === "details" ? "Where should we bring it?" : "The chef has your order."}</h2></div><button className="icon-button" type="button" onClick={() => { setCartOpen(false); setCheckoutStage("bag"); }} aria-label="Close bag"><X size={20} /></button></div>
            {checkoutStage === "bag" && <>
              <div className="cart-lines">
                {menuItems.filter((item) => cart[item.id]).map((item) => (
                  <div className="cart-line" key={item.id}>
                    <Image src={item.image} alt="" width={72} height={72} unoptimized />
                    <div><strong>{item.name}</strong><span>₹{item.price} each</span></div>
                    <div className="mini-quantity"><button type="button" onClick={() => updateQuantity(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus size={15} /></button><strong>{cart[item.id]}</strong><button type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Add one ${item.name}`}><Plus size={15} /></button></div>
                  </div>
                ))}
              </div>
              <div className="cart-totals"><span>Food total</span><strong>₹{cartTotal}</strong><span>Delivery</span><strong>Confirmed by chef</strong><span className="grand">Pay at delivery</span><strong className="grand">₹{cartTotal}</strong></div>
              <div className="no-payment-card"><ShieldCheck size={21} /><div><strong>No payment will be collected now.</strong><p>Choose cash or scan the chef’s UPI QR at your doorstep.</p></div></div>
              <button className="primary-cta full" type="button" onClick={() => { if (!loggedIn) { setCartOpen(false); openLogin(); } else { setCheckoutStage("details"); } }}>
                {loggedIn ? "Continue to delivery details" : "Login to continue"}<ArrowRight size={19} />
              </button>
            </>}
            {checkoutStage === "details" && (
              <form className="checkout-form" onSubmit={submitOrder}>
                <button className="checkout-back" type="button" onClick={() => setCheckoutStage("bag")}><ArrowRight size={15} /> Back to bag</button>
                <label htmlFor="customer-name">Your name<input id="customer-name" name="customerName" autoComplete="name" required placeholder="Name for the delivery" /></label>
                <label htmlFor="delivery-address">Full delivery address<textarea id="delivery-address" name="address" autoComplete="street-address" required minLength={10} rows={4} placeholder="Door number, street, area and pincode" /></label>
                <label htmlFor="landmark">Nearby landmark <span>Optional</span><input id="landmark" name="landmark" placeholder="e.g. opposite the temple" /></label>
                <fieldset><legend>How will you pay at the door?</legend><label className="payment-choice"><input type="radio" name="paymentMethod" value="cash" defaultChecked /><Banknote size={21} /><span><strong>Cash</strong>Hand it to the chef at delivery</span></label><label className="payment-choice"><input type="radio" name="paymentMethod" value="upi" /><QrCode size={21} /><span><strong>Direct UPI</strong>Scan the chef’s QR at delivery</span></label></fieldset>
                <div className="no-payment-card"><ShieldCheck size={21} /><div><strong>₹{cartTotal} due only at delivery.</strong><p>This app will not ask for a card, UPI PIN, deposit, or payment link.</p></div></div>
                {orderError && <p className="field-error order-error">{orderError}</p>}
                <button className="primary-cta full" type="submit" disabled={orderLoading}>{orderLoading ? "Confirming with chef…" : "Confirm order"}<ArrowRight size={19} /></button>
              </form>
            )}
            {checkoutStage === "confirmed" && orderConfirmation && (
              <div className="order-success">
                <div className="success-mark"><Check size={34} /></div>
                <span className="confirmation-id">{orderConfirmation.id}</span>
                <h3>Fresh food is now in the chef’s queue.</h3>
                <p>The direct order feed was updated immediately. You’ll pay <strong>₹{orderConfirmation.total}</strong> by {orderConfirmation.paymentMethod === "cash" ? "cash" : "direct UPI"} only when it reaches your door.</p>
                <div className="notification-result"><MessageCircle size={20} /><div><strong>{orderConfirmation.chefNotification === "sent" ? "WhatsApp relay delivered" : "Chef dashboard notified instantly"}</strong><span>{orderConfirmation.chefNotification === "sent" ? "The secure relay accepted this order." : "WhatsApp Business relay can be activated in production settings."}</span></div></div>
                {orderConfirmation.whatsappUrl && <a className="whatsapp-button" href={orderConfirmation.whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={19} /> Open order in WhatsApp</a>}
                <button className="primary-cta full" type="button" onClick={() => { setCartOpen(false); setCheckoutStage("bag"); setOrderConfirmation(null); }}>Done <Check size={19} /></button>
              </div>
            )}
          </aside>
        </div>
      )}

      {toast && <div className="toast" role="status"><Check size={17} />{toast}</div>}
    </main>
  );
}
