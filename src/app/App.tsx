import { useState, useEffect, useContext, createContext, useCallback, useMemo, memo } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import ahmadMartLogo from "@/imports/ahmad-logo.png";
import {
  ShoppingCart, Heart, Search, Menu, X, Star, ChevronRight, ChevronLeft,
  Package, Truck, Shield, Headphones, Clock, Zap, Filter, SlidersHorizontal,
  Plus, Minus, Trash2, Tag, MapPin, Phone, User, Eye, EyeOff,
  CheckCircle, ArrowRight, TrendingUp, Award, Gift,
  Instagram, Mail, Send, Smartphone,
  Battery, Plug, Wifi, RotateCcw, ZoomIn,
  Copy, ShieldCheck, Lock, RefreshCw, MessageCircle
} from "lucide-react";
import {
  JAZZCASH_NUMBER, JAZZCASH_TITLE, ADMIN_PASSCODE, WHATSAPP_DISPLAY,
  ORDER_STATUSES, getOrders, saveOrder, updateOrderStatus, newOrderId,
  sendOrderEmail, whatsappOrderUrl, toWaNumber, isCashOnDelivery,
  type Order, type OrderStatus,
} from "./orderStore";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  subcategory: string;
  image: string;
  images: string[];
  rating: number;
  reviews: number;
  badge?: "new" | "sale" | "bestseller";
  inStock: boolean;
  description: string;
  specs: Record<string, string>;
}

interface CartItem extends Product { qty: number; }
interface WishlistItem extends Product {}

interface StoreCtx {
  cart: CartItem[];
  wishlist: WishlistItem[];
  addToCart: (p: Product, qty?: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  updateQty: (id: number, qty: number) => void;
  toggleWishlist: (p: Product) => void;
  inWishlist: (id: number) => boolean;
  cartCount: number;
  cartTotal: number;
  user: { name: string; email: string } | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  recentlyViewed: Product[];
  addRecentlyViewed: (p: Product) => void;
}

const Store = createContext<StoreCtx>({} as StoreCtx);

// ─── Mock Data ────────────────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  {
    id: 1, name: "Pro Elite Wireless Earbuds", price: 2499, originalPrice: 3999,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.8, reviews: 342, badge: "bestseller", inStock: true,
    description: "Experience crystal-clear audio with our Pro Elite Wireless Earbuds. Featuring advanced noise cancellation, 30-hour battery life, and premium sound quality that rivals earbuds costing twice as much.",
    specs: { "Battery Life": "30 Hours", "Connectivity": "Bluetooth 5.3", "Driver Size": "12mm", "Noise Cancellation": "Active (ANC)", "Water Resistance": "IPX5", "Charging": "USB-C + Wireless" }
  },
  {
    id: 2, name: "65W GaN Fast Charger", price: 1299, originalPrice: 1899,
    category: "Mobile Accessories", subcategory: "Chargers",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.9, reviews: 521, badge: "bestseller", inStock: true,
    description: "Charge your devices at blazing speed with our 65W GaN Fast Charger. Compatible with all USB-C devices including MacBooks, smartphones, and tablets.",
    specs: { "Power Output": "65W Max", "Ports": "2x USB-C + 1x USB-A", "Technology": "GaN III", "Compatibility": "Universal", "Protection": "Over-voltage, Short-circuit", "Size": "Compact" }
  },
  {
    id: 3, name: "20000mAh Power Bank Pro", price: 3499, originalPrice: 4999,
    category: "Mobile Accessories", subcategory: "Power Banks",
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.7, reviews: 289, badge: "sale", inStock: true,
    description: "Never run out of power with our 20000mAh Power Bank Pro. Charge up to 4 devices simultaneously with fast charging support.",
    specs: { "Capacity": "20000mAh", "Input": "USB-C 65W", "Output": "3x USB (22.5W)", "Charging Cycles": "500+", "Safety": "CE, FCC, RoHS", "Weight": "450g" }
  },
  {
    id: 4, name: "Braided USB-C Cable 1.8m", price: 499, originalPrice: 799,
    category: "Mobile Accessories", subcategory: "Data Cables",
    image: "https://images.unsplash.com/photo-1625480860249-be231b4e2e06?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1625480860249-be231b4e2e06?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.6, reviews: 876, badge: "new", inStock: true,
    description: "Durable nylon braided USB-C cable with 100W fast charging support and data transfer speeds up to 10Gbps.",
    specs: { "Length": "1.8 Meters", "Material": "Nylon Braided", "Max Power": "100W", "Data Speed": "10 Gbps", "Compatibility": "USB-C Universal", "Durability": "30,000+ Bends" }
  },
  {
    id: 5, name: "Universal Phone Dashboard Holder", price: 799, originalPrice: 1199,
    category: "Mobile Accessories", subcategory: "Mobile Holders",
    image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.5, reviews: 445, inStock: true,
    description: "360-degree adjustable phone holder for your car dashboard. Compatible with all phones up to 7 inches.",
    specs: { "Rotation": "360°", "Compatibility": "4\"-7\" Phones", "Mounting": "Dashboard/Windshield", "Material": "Premium ABS", "Grip": "Strong Suction + Gel", "Adjustable": "Yes" }
  },
  {
    id: 6, name: "Clear Armor Phone Case — iPhone 15", price: 699, originalPrice: 999,
    category: "Mobile Accessories", subcategory: "Mobile Cases",
    image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.7, reviews: 632, badge: "new", inStock: true,
    description: "Military-grade drop protection with crystal clear transparency. Show off your phone's design while keeping it safe.",
    specs: { "Material": "TPU + Polycarbonate", "Drop Protection": "MIL-STD-810G", "Compatibility": "iPhone 15/15 Pro", "Color": "Crystal Clear", "Raised Edges": "Yes", "Wireless Charging": "Compatible" }
  },
  {
    id: 7, name: "Luxury Silent Wall Clock — Gold", price: 2999, originalPrice: 4499,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.9, reviews: 198, badge: "bestseller", inStock: true,
    description: "Elevate your interior with this premium gold-finish silent wall clock. Features whisper-quiet movement and an elegant minimalist design.",
    specs: { "Diameter": "30cm", "Movement": "Quartz Silent", "Material": "Aluminum Frame", "Color": "Rose Gold", "Battery": "1x AA", "Mounting": "Wall Hook Included" }
  },
  {
    id: 8, name: "Nordic Minimalist Wall Clock", price: 1999, originalPrice: 2999,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.6, reviews: 143, badge: "sale", inStock: true,
    description: "Inspired by Scandinavian design, this minimalist wall clock brings calm sophistication to any room.",
    specs: { "Diameter": "35cm", "Movement": "Step Sweep", "Material": "Natural Wood + Glass", "Color": "White/Walnut", "Battery": "1x AA", "Style": "Nordic Minimalist" }
  },
  {
    id: 9, name: "TWS Sport Earbuds X1", price: 1799, originalPrice: 2499,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.5, reviews: 267, badge: "sale", inStock: true,
    description: "Designed for active lifestyles. Sweat-proof, secure fit, and powerful bass make these your perfect workout companion.",
    specs: { "Battery Life": "25 Hours Total", "Connectivity": "Bluetooth 5.2", "Water Resistance": "IPX7", "Driver": "10mm Dynamic", "Microphone": "CVC 8.0 Noise Cancel", "Fit": "Ergonomic Sport" }
  },
  {
    id: 10, name: "30W iPhone Fast Charger", price: 999, originalPrice: 1499,
    category: "Mobile Accessories", subcategory: "Chargers",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.8, reviews: 389, badge: "new", inStock: true,
    description: "Official-quality 30W USB-C charger designed for iPhones. Charge from 0-50% in just 30 minutes.",
    specs: { "Power Output": "30W", "Port": "USB-C", "Compatibility": "iPhone 12 and above", "Cable Required": "USB-C to Lightning", "Protection": "Yes", "Certification": "MFi Compatible" }
  },
  {
    id: 11, name: "Vintage Roman Numeral Clock", price: 3499, originalPrice: 4999,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.7, reviews: 89, badge: "new", inStock: true,
    description: "Timeless vintage charm with Roman numerals. The perfect centerpiece for living rooms, offices, and hallways.",
    specs: { "Diameter": "40cm", "Movement": "Silent Quartz", "Material": "Iron Frame", "Style": "Vintage Industrial", "Battery": "1x AA", "Color": "Antique Bronze" }
  },
  {
    id: 12, name: "10000mAh Slim Power Bank", price: 1999, originalPrice: 2799,
    category: "Mobile Accessories", subcategory: "Power Banks",
    image: "https://images.unsplash.com/photo-1578875843748-4e4e4e4e5f5d?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 4.6, reviews: 215, inStock: true,
    description: "Ultra-slim 10000mAh power bank that fits in your pocket. Perfect for daily commutes and travel.",
    specs: { "Capacity": "10000mAh", "Thickness": "12mm", "Ports": "USB-C + USB-A", "Fast Charge": "22.5W", "LED Indicator": "4-LED", "Weight": "195g" }
  },
];

const REVIEWS = [
  { id: 1, name: "Zainab Fatima", city: "Karachi", rating: 5, text: "Amazing quality! The earbuds sound incredible and the packaging was so professional. Will definitely order again from Ahmad Mart.", product: "Pro Elite Wireless Earbuds", avatar: "ZF" },
  { id: 2, name: "Muhammad Ali", city: "Lahore", rating: 5, text: "Fast delivery and the power bank is exactly as described. 20000mAh lasts me 3 full phone charges. Great value for money!", product: "20000mAh Power Bank Pro", avatar: "MA" },
  { id: 3, name: "Ayesha Khan", city: "Islamabad", rating: 5, text: "The wall clock is absolutely gorgeous! It looks so expensive but was very affordable. My living room looks amazing now.", product: "Luxury Silent Wall Clock", avatar: "AK" },
  { id: 4, name: "Hassan Raza", city: "Faisalabad", rating: 4, text: "Good quality cable, very durable. Been using it for 3 months with no issues. The braiding feels premium and strong.", product: "Braided USB-C Cable", avatar: "HR" },
  { id: 5, name: "Sana Mirza", city: "Multan", rating: 5, text: "Excellent customer service and the phone case fits perfectly. The clear design shows off my phone beautifully!", product: "Clear Armor Phone Case", avatar: "SM" },
  { id: 6, name: "Bilal Ahmed", city: "Rawalpindi", rating: 5, text: "The 65W charger is incredible — charges my laptop AND phone at the same time! Worth every rupee.", product: "65W GaN Fast Charger", avatar: "BA" },
];

const CATEGORIES = [
  { name: "Earbuds", icon: Headphones, subcategory: "Earbuds", color: "#1E40AF", bg: "#EFF6FF" },
  { name: "Chargers", icon: Zap, subcategory: "Chargers", color: "#F97316", bg: "#FFF7ED" },
  { name: "Power Banks", icon: Battery, subcategory: "Power Banks", color: "#059669", bg: "#ECFDF5" },
  { name: "Data Cables", icon: Plug, subcategory: "Data Cables", color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Mobile Holders", icon: Smartphone, subcategory: "Mobile Holders", color: "#DC2626", bg: "#FEF2F2" },
  { name: "Mobile Cases", icon: Shield, subcategory: "Mobile Cases", color: "#0891B2", bg: "#ECFEFF" },
  { name: "Wall Clocks", icon: Clock, subcategory: "Wall Clocks", color: "#B45309", bg: "#FFFBEB" },
];

// ─── Store Provider ───────────────────────────────────────────────────────────
function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  const addToCart = useCallback((p: Product, qty = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...p, qty }];
    });
  }, []);
  const removeFromCart = useCallback((id: number) => setCart(prev => prev.filter(i => i.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);
  const updateQty = useCallback((id: number, qty: number) => {
    if (qty < 1) return removeFromCart(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  }, [removeFromCart]);
  const toggleWishlist = useCallback((p: Product) => {
    setWishlist(prev => prev.find(i => i.id === p.id) ? prev.filter(i => i.id !== p.id) : [...prev, p]);
  }, []);
  const inWishlist = useCallback((id: number) => wishlist.some(i => i.id === id), [wishlist]);
  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const login = useCallback((name: string, email: string) => setUser({ name, email }), []);
  const logout = useCallback(() => setUser(null), []);
  const addRecentlyViewed = useCallback((p: Product) => {
    setRecentlyViewed(prev => [p, ...prev.filter(i => i.id !== p.id)].slice(0, 6));
  }, []);

  const value = useMemo(() => ({
    cart, wishlist, addToCart, removeFromCart, clearCart, updateQty, toggleWishlist, inWishlist,
    cartCount, cartTotal, user, login, logout, recentlyViewed, addRecentlyViewed,
  }), [cart, wishlist, addToCart, removeFromCart, clearCart, updateQty, toggleWishlist, inWishlist,
    cartCount, cartTotal, user, login, logout, recentlyViewed, addRecentlyViewed]);

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;
const discount = (orig: number, curr: number) => Math.round((1 - curr / orig) * 100);

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={size} className={s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"} />
      ))}
    </div>
  );
}

function Badge({ type }: { type: "new" | "sale" | "bestseller" }) {
  const map = {
    new: "bg-emerald-500 text-white",
    sale: "bg-red-500 text-white",
    bestseller: "bg-amber-500 text-white",
  };
  const labels = { new: "New", sale: "Sale", bestseller: "Best Seller" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${map[type]}`}>{labels[type]}</span>;
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCardBase({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, inWishlist } = useContext(Store);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    addToCart(product);
    setTimeout(() => setAdding(false), 700);
  };

  return (
    <div
      onClick={() => navigate(`/product/${product.id}`)}
      className="group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08), 0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "1/1" }}>
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop"; }}
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.badge && <Badge type={product.badge} />}
          {product.originalPrice && (
            <span className="text-[10px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
              -{discount(product.originalPrice, product.price)}%
            </span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); toggleWishlist(product); }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
          style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }}
        >
          <Heart size={15} className={inWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
        </button>
      </div>
      <div className="p-4">
        <p className="text-xs text-[#F97316] font-semibold mb-1">{product.subcategory}</p>
        <h3 className="font-semibold text-[#111827] text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#1E40AF] transition-colors">{product.name}</h3>
        <div className="flex items-center gap-2 mb-3">
          <Stars rating={product.rating} />
          <span className="text-xs text-gray-400">({product.reviews})</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-[#1E40AF]">{fmt(product.price)}</p>
            {product.originalPrice && <p className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</p>}
          </div>
          <button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${adding ? "bg-emerald-500 text-white" : "bg-[#1E40AF] text-white hover:bg-[#1e3a8a]"}`}
            style={{ boxShadow: adding ? "0 4px 12px rgba(16,185,129,0.4)" : "0 4px 12px rgba(30,64,175,0.3)" }}
          >
            {adding ? <CheckCircle size={13} /> : <ShoppingCart size={13} />}
            {adding ? "Added!" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardBase);

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const { cartCount, user } = useContext(Store);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/shop?q=${encodeURIComponent(searchQ)}`); setSearchOpen(false); setSearchQ(""); }
  };

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    { label: "Mobile Accessories", to: "/shop?cat=Mobile Accessories" },
    { label: "Wall Clocks", to: "/shop?cat=Home Decoration" },
  ];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "shadow-lg" : ""}`}
        style={{ background: scrolled ? "rgba(255,255,255,0.97)" : "#fff", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(30,64,175,0.08)" }}>
        {/* Top bar */}
        <div className="bg-[#1E40AF] text-white text-xs py-1.5 text-center font-medium">
          🚚 Free delivery on orders above Rs. 2,000 | Easy JazzCash Payment Across Pakistan
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-10 w-10 object-contain" />
              <div className="hidden sm:block">
                <span className="text-xl font-black text-[#1E40AF] tracking-tight">Ahmad</span>
                <span className="text-xl font-black text-[#F97316] tracking-tight">Mart</span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map(l => (
                <Link key={l.to} to={l.to}
                  className="text-sm font-semibold text-[#111827] hover:text-[#1E40AF] transition-colors relative group">
                  {l.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#F97316] group-hover:w-full transition-all duration-200" />
                </Link>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button onClick={() => setSearchOpen(o => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#1E40AF] transition-colors">
                <Search size={18} />
              </button>
              <Link to="/wishlist"
                className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl hover:bg-[#FFF7ED] text-[#111827] hover:text-[#F97316] transition-colors">
                <Heart size={18} />
              </Link>
              <Link to={user ? "/account" : "/login"}
                className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#1E40AF] transition-colors">
                <User size={18} />
              </Link>
              <Link to="/cart" className="relative flex items-center gap-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "#1E40AF", color: "#fff", boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
              <button onClick={() => setMenuOpen(o => !o)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <form onSubmit={handleSearch} className="pb-3">
              <div className="flex gap-2">
                <input
                  autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search products..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#1E40AF]/20 text-sm outline-none focus:border-[#1E40AF] bg-[#F8F9FB]"
                />
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#1E40AF] text-white text-sm font-semibold">Search</button>
              </div>
            </form>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map(l => (
                <Link key={l.to} to={l.to}
                  className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">
                  {l.label}
                </Link>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
                <Link to="/wishlist" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#FFF7ED] hover:text-[#F97316] transition-colors flex items-center gap-2">
                  <Heart size={16} /> Wishlist
                </Link>
                <Link to={user ? "/account" : "/login"} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors flex items-center gap-2">
                  <User size={16} /> {user ? user.name : "Login / Register"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="h-[calc(64px+28px)]" />
    </>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  return (
    <footer className="bg-[#111827] text-white mt-16">
      {/* Newsletter */}
      <div className="bg-[#1E40AF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-white">Get exclusive deals in your inbox</h3>
            <p className="text-blue-200 text-sm mt-1">Subscribe for the latest products, offers, and updates</p>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 text-emerald-300 font-semibold"><CheckCircle size={20} /> Subscribed! Thank you.</div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); if (email) setSubscribed(true); }} className="flex gap-2 w-full md:w-auto">
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 md:w-64 px-4 py-2.5 rounded-xl text-sm text-gray-900 bg-white border border-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#F97316]"
              />
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#F97316] text-white text-sm font-semibold hover:bg-orange-500 transition-colors flex items-center gap-2">
                <Send size={14} /> Subscribe
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-10 w-10 object-contain" />
              <div>
                <span className="text-xl font-black text-white">Ahmad</span>
                <span className="text-xl font-black text-[#F97316]">Mart</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">Pakistan's trusted online store for premium mobile accessories and beautiful home décor at affordable prices.</p>
            <div className="mt-4">
              <a
                href="https://www.instagram.com/ahmadmart.store"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-[#F97316] transition-colors text-sm font-semibold text-white"
              >
                <Instagram size={18} /> Follow us on Instagram
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {["Home", "Shop", "About Us", "Contact Us", "Blog"].map(l => (
                <li key={l}><a href="#" className="text-gray-400 text-sm hover:text-[#F97316] transition-colors">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Categories</h4>
            <ul className="space-y-2">
              {CATEGORIES.map(c => (
                <li key={c.name}><Link to={`/shop?sub=${c.subcategory}`} className="text-gray-400 text-sm hover:text-[#F97316] transition-colors">{c.name}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-4">Customer Care</h4>
            <ul className="space-y-2 mb-4">
              {["Track Your Order", "Return Policy", "Privacy Policy", "Terms & Conditions", "FAQ"].map(l => (
                <li key={l}><a href="#" className="text-gray-400 text-sm hover:text-[#F97316] transition-colors">{l}</a></li>
              ))}
            </ul>
            <a href="tel:+923405463601" className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#F97316] transition-colors">
              <Phone size={14} className="text-[#F97316]" />
              <span>+92 340 5463601</span>
            </a>
            <a href="mailto:tryahmadmart.store@gmail.com" className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#F97316] transition-colors mt-1 break-all">
              <Mail size={14} className="text-[#F97316] flex-shrink-0" />
              <span>tryahmadmart.store@gmail.com</span>
            </a>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <MapPin size={14} className="text-[#F97316]" />
              <span>Multan, Pakistan</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">© 2025 Ahmad Mart. All rights reserved.</p>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-xs">We accept:</span>
            <div className="flex gap-2">
              {["COD", "JazzCash", "EasyPaisa"].map(m => (
                <span key={m} className="px-2 py-1 bg-white/10 rounded text-xs text-gray-300 font-medium">{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#111827]">{title}</h2>
        {subtitle && <p className="text-[#6b7280] mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage() {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: "Quality Products at Affordable Prices",
      sub: "Shop premium mobile accessories and beautiful wall clocks with confidence.",
      cta: "Shop Now", link: "/shop",
      bg: "from-[#1E40AF] to-[#1e3a8a]",
      img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=400&fit=crop&auto=format",
    },
    {
      title: "Premium Earbuds Starting at Rs. 1,799",
      sub: "Crystal clear sound with 30-hour battery life. ANC technology included.",
      cta: "Explore Earbuds", link: "/shop?sub=Earbuds",
      bg: "from-[#1E40AF] to-[#3730a3]",
      img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&h=400&fit=crop&auto=format",
    },
    {
      title: "Beautiful Wall Clocks for Your Home",
      sub: "Silent quartz movement, premium materials, and timeless designs.",
      cta: "Shop Wall Clocks", link: "/shop?sub=Wall Clocks",
      bg: "from-[#92400e] to-[#B45309]",
      img: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=500&h=400&fit=crop&auto=format",
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const featured = PRODUCTS.filter(p => p.badge === "bestseller" || p.badge === "new").slice(0, 4);
  const bestsellers = PRODUCTS.sort((a, b) => b.reviews - a.reviews).slice(0, 8);
  const mobileAcc = PRODUCTS.filter(p => p.category === "Mobile Accessories").slice(0, 4);
  const clocks = PRODUCTS.filter(p => p.subcategory === "Wall Clocks");

  return (
    <div>
      {/* Hero Slider */}
      <section className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 mb-12"
        style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.18)" }}>
        {slides.map((slide, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className={`w-full h-full bg-gradient-to-r ${slide.bg} flex flex-col lg:flex-row items-center min-h-[340px] sm:min-h-[420px]`}>
              <div className="flex-1 px-8 sm:px-12 py-10 text-white z-10">
                <h1 className="text-2xl sm:text-4xl font-black leading-tight mb-4 max-w-md">{slide.title}</h1>
                <p className="text-blue-100 text-sm sm:text-base mb-6 max-w-sm">{slide.sub}</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => navigate(slide.link)}
                    className="px-6 py-3 rounded-xl bg-[#F97316] text-white font-bold text-sm hover:bg-orange-500 transition-all active:scale-95"
                    style={{ boxShadow: "0 4px 16px rgba(249,115,22,0.4)" }}>
                    {slide.cta} <ArrowRight size={14} className="inline ml-1" />
                  </button>
                  <button onClick={() => navigate("/shop")}
                    className="px-6 py-3 rounded-xl bg-white/20 text-white font-bold text-sm hover:bg-white/30 transition-all border border-white/30">
                    Explore Categories
                  </button>
                </div>
              </div>
              <div className="lg:w-80 xl:w-96 p-6 flex-shrink-0">
                <img src={slide.img} alt={slide.title}
                  className="w-full h-52 sm:h-64 object-cover rounded-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        ))}
        <div className={`relative bg-gradient-to-r ${slides[0].bg} min-h-[340px] sm:min-h-[420px] opacity-0 pointer-events-none`} />

        {/* Slide controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActiveSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === activeSlide ? "w-6 h-2 bg-[#F97316]" : "w-2 h-2 bg-white/50"}`} />
          ))}
        </div>
        <button onClick={() => setActiveSlide(s => (s - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setActiveSlide(s => (s + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20">
          <ChevronRight size={18} />
        </button>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Categories */}
        <section className="mb-14">
          <SectionHeader title="Shop by Category" subtitle="Find exactly what you need" />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {CATEGORIES.map(cat => (
              <Link key={cat.name} to={`/shop?sub=${cat.subcategory}`}
                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl text-center transition-all duration-200 hover:-translate-y-1 group"
                style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ background: cat.color, color: "#fff" }}>
                  <cat.icon size={22} />
                </div>
                <span className="text-xs font-semibold text-[#111827] leading-tight">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="mb-14">
          <SectionHeader
            title="Featured Products"
            subtitle="Hand-picked for quality and value"
            action={
              <Link to="/shop" className="text-sm font-bold text-[#1E40AF] hover:text-[#F97316] flex items-center gap-1 transition-colors">
                View All <ChevronRight size={16} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Best Sellers */}
        <section className="mb-14">
          <SectionHeader
            title="Best Sellers"
            subtitle="Most loved products by our customers"
            action={
              <Link to="/shop" className="text-sm font-bold text-[#1E40AF] hover:text-[#F97316] flex items-center gap-1 transition-colors">
                View All <ChevronRight size={16} />
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {bestsellers.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Category Showcases */}
        <section className="mb-14">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Mobile Accessories */}
            <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-2xl p-6"
              style={{ boxShadow: "0 4px 20px rgba(30,64,175,0.1)" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-[#111827]">Mobile Accessories</h3>
                  <p className="text-sm text-[#6b7280]">Top picks for your device</p>
                </div>
                <Link to="/shop?cat=Mobile Accessories" className="text-xs font-bold text-[#1E40AF] hover:text-[#F97316] flex items-center gap-1">
                  View All <ChevronRight size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {mobileAcc.map(p => (
                  <Link key={p.id} to={`/product/${p.id}`}
                    className="bg-white rounded-xl p-3 hover:-translate-y-0.5 transition-transform"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <img src={p.image} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2"
                      onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop"; }} />
                    <p className="text-xs font-semibold text-[#111827] line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-xs font-bold text-[#1E40AF]">{fmt(p.price)}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Wall Clocks */}
            <div className="bg-gradient-to-br from-[#FFFBEB] to-[#FEF3C7] rounded-2xl p-6"
              style={{ boxShadow: "0 4px 20px rgba(180,83,9,0.1)" }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-black text-[#111827]">Wall Clocks</h3>
                  <p className="text-sm text-[#6b7280]">Elevate your home décor</p>
                </div>
                <Link to="/shop?sub=Wall Clocks" className="text-xs font-bold text-[#B45309] hover:text-[#F97316] flex items-center gap-1">
                  View All <ChevronRight size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {clocks.slice(0, 4).map(p => (
                  <Link key={p.id} to={`/product/${p.id}`}
                    className="bg-white rounded-xl p-3 hover:-translate-y-0.5 transition-transform"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <img src={p.image} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2"
                      onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=200&h=200&fit=crop"; }} />
                    <p className="text-xs font-semibold text-[#111827] line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-xs font-bold text-[#B45309]">{fmt(p.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="mb-14">
          <SectionHeader title="Why Choose Ahmad Mart?" subtitle="We put our customers first, always." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Award, title: "Premium Quality", desc: "Every product is quality-checked and sourced from verified suppliers.", color: "#1E40AF" },
              { icon: TrendingUp, title: "Best Prices", desc: "We offer the most competitive prices in Pakistan with no hidden charges.", color: "#F97316" },
              { icon: Truck, title: "Nationwide Delivery", desc: "Fast, reliable delivery to all cities across Pakistan. Cash on Delivery is available in Multan only — Multan orders can pay by COD or JazzCash, both ways.", color: "#059669" },
              { icon: Shield, title: "Secure Shopping", desc: "Your data and payments are completely safe with end-to-end encryption.", color: "#7C3AED" },
              { icon: RotateCcw, title: "Easy Returns", desc: "Not satisfied? Return within 7 days for a hassle-free refund.", color: "#DC2626" },
              { icon: Headphones, title: "24/7 Support", desc: "Our team is always here to help — reach us anytime on WhatsApp.", color: "#B45309" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-6 hover:-translate-y-1 transition-transform duration-200"
                style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: color, color: "#fff" }}>
                  <Icon size={24} />
                </div>
                <h4 className="font-bold text-[#111827] mb-2">{title}</h4>
                <p className="text-[#6b7280] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reviews */}
        <section className="mb-14">
          <SectionHeader title="What Our Customers Say" subtitle="Real reviews from real customers across Pakistan" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-6 hover:-translate-y-0.5 transition-transform"
                style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #F97316)" }}>
                    {r.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-[#111827] text-sm">{r.name}</p>
                    <p className="text-xs text-[#6b7280]">{r.city}</p>
                  </div>
                  <div className="ml-auto"><Stars rating={r.rating} size={12} /></div>
                </div>
                <p className="text-[#374151] text-sm leading-relaxed mb-3">"{r.text}"</p>
                <p className="text-xs text-[#1E40AF] font-semibold">{r.product}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}

// ─── Shop Page ────────────────────────────────────────────────────────────────
function ShopPage() {
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("cat") || "All");
  const [subcategory, setSubcategory] = useState(searchParams.get("sub") || "All");
  const [sort, setSort] = useState("popular");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [showFilters, setShowFilters] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("q")) setSearch(p.get("q") || "");
    if (p.get("cat")) setCategory(p.get("cat") || "All");
    if (p.get("sub")) setSubcategory(p.get("sub") || "All");
  }, [location.search]);

  const cats = ["All", "Mobile Accessories", "Home Decoration"];
  const subs = ["All", ...CATEGORIES.map(c => c.subcategory)];

  let filtered = PRODUCTS.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.subcategory.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || p.category === category;
    const matchSub = subcategory === "All" || p.subcategory === subcategory;
    const matchPrice = p.price >= minPrice && p.price <= maxPrice;
    return matchSearch && matchCat && matchSub && matchPrice;
  });

  if (sort === "popular") filtered.sort((a, b) => b.reviews - a.reviews);
  else if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === "newest") filtered.sort((a, b) => (a.badge === "new" ? -1 : 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-[#111827]">Our Products</h1>
        <p className="text-[#6b7280] text-sm mt-1">{filtered.length} products found</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <div className={`lg:w-64 flex-shrink-0 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-white rounded-2xl p-5 sticky top-24" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2"><SlidersHorizontal size={16} /> Filters</h3>

            <div className="mb-5">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-2 block">Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1E40AF] bg-gray-50" />
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-2 block">Category</label>
              <div className="flex flex-col gap-1">
                {cats.map(c => (
                  <button key={c} onClick={() => { setCategory(c); setSubcategory("All"); }}
                    className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${category === c ? "bg-[#1E40AF] text-white" : "text-[#374151] hover:bg-gray-100"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-2 block">Sub-Category</label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {subs.map(s => (
                  <button key={s} onClick={() => setSubcategory(s)}
                    className={`text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${subcategory === s ? "bg-[#F97316] text-white" : "text-[#374151] hover:bg-gray-100"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-2 block">Price Range</label>
              <div className="flex gap-2 items-center text-xs text-[#6b7280] mb-2">
                <span>Rs. {minPrice.toLocaleString()}</span>
                <span className="flex-1 text-center">—</span>
                <span>Rs. {maxPrice.toLocaleString()}</span>
              </div>
              <input type="range" min={0} max={5000} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
                className="w-full accent-[#1E40AF]" />
            </div>

            <button onClick={() => { setSearch(""); setCategory("All"); setSubcategory("All"); setSort("popular"); setMinPrice(0); setMaxPrice(10000); }}
              className="w-full py-2 rounded-xl border border-[#1E40AF]/30 text-[#1E40AF] text-sm font-semibold hover:bg-[#EFF6FF] transition-colors">
              Clear Filters
            </button>
          </div>
        </div>

        {/* Products */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <button onClick={() => setShowFilters(o => !o)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E40AF] text-white text-sm font-semibold">
              <Filter size={15} /> {showFilters ? "Hide" : "Show"} Filters
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-xs text-[#6b7280] font-semibold">Sort by:</label>
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1E40AF] bg-white">
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="font-bold text-[#111827] mb-2">No products found</p>
              <p className="text-[#6b7280] text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Product Detail Page ──────────────────────────────────────────────────────
function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart, toggleWishlist, inWishlist, addRecentlyViewed } = useContext(Store);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();

  const product = PRODUCTS.find(p => p.id === Number(id));

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
      setActiveImg(0);
      setQty(1);
    }
  }, [id]);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <Package size={64} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-2xl text-[#111827] mb-2">Product not found</h2>
      <button onClick={() => navigate("/shop")} className="mt-4 px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Back to Shop</button>
    </div>
  );

  const related = PRODUCTS.filter(p => p.subcategory === product.subcategory && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#6b7280] mb-6">
        <Link to="/" className="hover:text-[#1E40AF]">Home</Link>
        <ChevronRight size={12} />
        <Link to="/shop" className="hover:text-[#1E40AF]">Shop</Link>
        <ChevronRight size={12} />
        <Link to={`/shop?sub=${product.subcategory}`} className="hover:text-[#1E40AF]">{product.subcategory}</Link>
        <ChevronRight size={12} />
        <span className="text-[#111827] font-semibold">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Gallery */}
        <div>
          <div className="bg-white rounded-2xl overflow-hidden mb-3 relative group"
            style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.1)", aspectRatio: "1/1" }}>
            <img src={product.images[activeImg]} alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={e => { (e.target as HTMLImageElement).src = product.image; }} />
            {product.badge && (
              <div className="absolute top-4 left-4"><Badge type={product.badge} /></div>
            )}
            <div className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center cursor-zoom-in"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <ZoomIn size={16} className="text-[#1E40AF]" />
            </div>
          </div>
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-[#1E40AF] scale-95" : "border-transparent"}`}
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <img src={img} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).src = product.image; }} />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-semibold text-[#F97316] mb-2">{product.subcategory}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-3 leading-tight">{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <Stars rating={product.rating} size={16} />
            <span className="text-sm text-[#6b7280]">({product.reviews} reviews)</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {product.inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-black text-[#1E40AF]">{fmt(product.price)}</span>
            {product.originalPrice && (
              <>
                <span className="text-lg text-gray-400 line-through">{fmt(product.originalPrice)}</span>
                <span className="text-sm font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                  Save {discount(product.originalPrice, product.price)}%
                </span>
              </>
            )}
          </div>

          <p className="text-[#374151] text-sm leading-relaxed mb-6">{product.description}</p>

          {/* Qty + Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex items-center rounded-xl overflow-hidden border border-gray-200"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors text-[#374151]">
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-[#111827] text-sm">{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-10 h-11 flex items-center justify-center hover:bg-gray-100 transition-colors text-[#374151]">
                <Plus size={16} />
              </button>
            </div>
            <button onClick={handleAddToCart}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${added ? "bg-emerald-500 text-white" : "bg-[#1E40AF] text-white hover:bg-[#1e3a8a]"}`}
              style={{ boxShadow: added ? "0 4px 16px rgba(16,185,129,0.4)" : "0 4px 16px rgba(30,64,175,0.3)" }}>
              {added ? <CheckCircle size={16} /> : <ShoppingCart size={16} />}
              {added ? "Added to Cart!" : "Add to Cart"}
            </button>
            <button onClick={() => { addToCart(product, qty); navigate("/checkout"); }}
              className="flex-1 min-w-[120px] py-3 rounded-xl bg-[#F97316] text-white font-bold text-sm hover:bg-orange-500 transition-all active:scale-95"
              style={{ boxShadow: "0 4px 16px rgba(249,115,22,0.35)" }}>
              Buy Now
            </button>
            <button onClick={() => toggleWishlist(product)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all active:scale-95 ${inWishlist(product.id) ? "border-red-300 bg-red-50" : "border-gray-200 hover:border-red-300"}`}>
              <Heart size={18} className={inWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"} />
            </button>
          </div>

          {/* Assurances */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Truck, text: "Free Delivery" },
              { icon: RotateCcw, text: "7-Day Return" },
              { icon: Shield, text: "Secure Pay" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 p-3 bg-[#F8F9FB] rounded-xl">
                <Icon size={14} className="text-[#1E40AF] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#374151]">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl mb-10" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        <div className="flex border-b border-gray-100">
          {(["desc", "specs", "reviews"] as const).map(t => {
            const labels = { desc: "Description", specs: "Specifications", reviews: `Reviews (${product.reviews})` };
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-4 text-sm font-bold transition-colors relative ${tab === t ? "text-[#1E40AF]" : "text-[#6b7280] hover:text-[#374151]"}`}>
                {labels[t]}
                {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E40AF]" />}
              </button>
            );
          })}
        </div>
        <div className="p-6">
          {tab === "desc" && <p className="text-[#374151] leading-relaxed text-sm">{product.description}</p>}
          {tab === "specs" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between p-3 bg-[#F8F9FB] rounded-xl">
                  <span className="text-xs font-semibold text-[#6b7280]">{k}</span>
                  <span className="text-xs font-bold text-[#111827]">{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "reviews" && (
            <div className="space-y-4">
              {REVIEWS.slice(0, 3).map(r => (
                <div key={r.id} className="flex gap-4 p-4 bg-[#F8F9FB] rounded-xl">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #1E40AF, #F97316)" }}>
                    {r.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-[#111827] text-sm">{r.name}</span>
                      <span className="text-xs text-[#6b7280]">— {r.city}</span>
                      <Stars rating={r.rating} size={11} />
                    </div>
                    <p className="text-[#374151] text-sm">"{r.text}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section>
          <SectionHeader title="Related Products" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
function CartPage() {
  const { cart, removeFromCart, updateQty, cartTotal } = useContext(Store);
  const [coupon, setCoupon] = useState("");
  const [discount_applied, setDiscountApplied] = useState(0);
  const [couponMsg, setCouponMsg] = useState("");
  const navigate = useNavigate();

  const applyCoupon = () => {
    if (coupon.toUpperCase() === "AHMADMART20") {
      setDiscountApplied(Math.round(cartTotal * 0.2));
      setCouponMsg("20% discount applied!");
    } else if (coupon.toUpperCase() === "SAVE10") {
      setDiscountApplied(Math.round(cartTotal * 0.1));
      setCouponMsg("10% discount applied!");
    } else {
      setDiscountApplied(0);
      setCouponMsg("Invalid coupon code");
    }
  };

  const shipping = cartTotal >= 2000 ? 0 : 200;
  const final = cartTotal - discount_applied + shipping;

  if (cart.length === 0) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-2xl text-[#111827] mb-2">Your cart is empty</h2>
      <p className="text-[#6b7280] text-sm mb-6">Start shopping to add products to your cart</p>
      <button onClick={() => navigate("/shop")} className="px-8 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm"
        style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
        Continue Shopping
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-6">Shopping Cart</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-4"
              style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
              <img src={item.image} alt={item.name}
                className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=100&h=100&fit=crop"; }} />
              <div className="flex-1 min-w-0">
                <Link to={`/product/${item.id}`} className="font-bold text-[#111827] text-sm hover:text-[#1E40AF] line-clamp-2">{item.name}</Link>
                <p className="text-xs text-[#6b7280] mt-0.5">{item.subcategory}</p>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                    <button onClick={() => updateQty(item.id, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                  <span className="font-black text-[#1E40AF]">{fmt(item.price * item.qty)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div>
          <div className="bg-white rounded-2xl p-6 sticky top-24" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-5 text-lg">Order Summary</h3>

            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Subtotal</span><span className="font-semibold">{fmt(cartTotal)}</span></div>
              {discount_applied > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>-{fmt(discount_applied)}</span></div>}
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Shipping</span>
                <span className={shipping === 0 ? "text-emerald-600 font-semibold" : "font-semibold"}>{shipping === 0 ? "Free" : fmt(shipping)}</span>
              </div>
              {shipping > 0 && <p className="text-xs text-[#6b7280]">Add Rs. {fmt(2000 - cartTotal)} more for free shipping</p>}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-[#111827]">
                <span>Total</span><span className="text-[#1E40AF] text-lg">{fmt(final)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mb-5">
              <div className="flex gap-2">
                <input value={coupon} onChange={e => setCoupon(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1E40AF] bg-gray-50" />
                <button onClick={applyCoupon}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-[#374151] text-sm font-bold hover:bg-gray-200 transition-colors">
                  <Tag size={14} />
                </button>
              </div>
              {couponMsg && <p className={`text-xs mt-1.5 font-semibold ${couponMsg.includes("applied") ? "text-emerald-600" : "text-red-500"}`}>{couponMsg}</p>}
              <p className="text-xs text-[#6b7280] mt-1">Try: AHMADMART20 or SAVE10</p>
            </div>

            <button onClick={() => navigate("/checkout")}
              className="w-full py-3.5 rounded-xl bg-[#1E40AF] text-white font-black text-sm hover:bg-[#1e3a8a] transition-all active:scale-95 mb-3"
              style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
              Proceed to Checkout
            </button>
            <button onClick={() => navigate("/shop")} className="w-full py-3 rounded-xl border border-gray-200 text-[#374151] font-semibold text-sm hover:bg-gray-50 transition-colors">
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Checkout Page (Manual JazzCash Payment) ──────────────────────────────────
function CheckoutPage() {
  const { cart, cartTotal, clearCart, user } = useContext(Store);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || "", phone: "", email: user?.email || "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [waUrl, setWaUrl] = useState("");
  const [orderId] = useState(newOrderId());
  const [payment, setPayment] = useState<"jazzcash" | "cod">("jazzcash");
  const isCOD = payment === "cod";

  const shipping = cartTotal >= 2000 ? 0 : 200;
  const total = cartTotal + shipping;

  const copy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1500);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.phone.trim() || !/^0\d{9,10}$/.test(form.phone.trim())) e.phone = "Enter a valid WhatsApp number (e.g. 03001234567)";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (!form.address.trim()) e.address = "Complete shipping address is required";
    else if (isCOD && !/multan/i.test(form.address)) e.address = "Cash on Delivery is available in Multan only. Enter a Multan delivery address, or pay with JazzCash.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Runs synchronously so opening WhatsApp stays inside the click gesture and is
  // not blocked by the browser pop-up blocker.
  const handleSubmit = () => {
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    const order: Order = {
      id: orderId,
      createdAt: Date.now(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim() || undefined,
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
      subtotal: cartTotal,
      shipping,
      total,
      paymentMethod: isCOD ? "Cash on Delivery" : "JazzCash (Manual)",
      status: "Pending Verification", // never auto-paid — payment/order is verified on WhatsApp
    };
    const url = whatsappOrderUrl(order);
    setWaUrl(url);
    window.open(url, "_blank"); // opens the customer's WhatsApp, pre-filled, to the store
    saveOrder(order);
    sendOrderEmail(order, null); // optional email backup (only sends if a key is set)
    clearCart();
    setPlacedOrder(order);
  };

  if (placedOrder) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl p-8 sm:p-10" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <Clock size={38} className="text-amber-500" />
        </div>
        <h2 className="text-2xl font-black text-[#111827] mb-2">Order Received!</h2>
        <p className="text-[#374151] text-sm mb-4 font-semibold">Your order has been received and is awaiting payment verification.</p>
        <div className="bg-[#F8F9FB] rounded-xl p-4 mb-5 text-left">
          <p className="text-xs text-[#6b7280] mb-1">Order ID</p>
          <p className="font-black text-[#1E40AF] text-lg">#{placedOrder.id}</p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-[#6b7280]">{isCashOnDelivery(placedOrder) ? "Amount Due (COD):" : "Amount Paid:"}</span><span className="font-black text-[#1E40AF]">{fmt(placedOrder.total)}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Payment:</span><span className="font-semibold">{placedOrder.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-[#6b7280]">Status:</span><span className="font-semibold text-amber-600">Pending Verification</span></div>
          </div>
        </div>

        {/* Final WhatsApp step */}
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-4 text-left">
          <p className="font-bold text-green-800 text-sm flex items-center gap-1.5 mb-1"><MessageCircle size={16} /> One last step on WhatsApp</p>
          <p className="text-xs text-green-700">
            {isCashOnDelivery(placedOrder)
              ? <>WhatsApp has opened with your order details. <strong>Press send to confirm your Cash on Delivery order.</strong> We'll confirm it on WhatsApp and deliver to your Multan address — pay the rider in cash.</>
              : <>WhatsApp has opened with your order details. <strong>Attach your JazzCash payment screenshot in that chat and press send.</strong> We'll verify it and confirm your order on WhatsApp.</>}
          </p>
        </div>

        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-black text-sm mb-2.5 transition-transform active:scale-95"
          style={{ background: "#25D366", boxShadow: "0 4px 16px rgba(37,211,102,0.35)" }}>
          <MessageCircle size={18} /> Open WhatsApp & Send Order
        </a>
        <button onClick={() => navigate("/")} className="w-full py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm"
          style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
          Continue Shopping
        </button>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
      <p className="font-bold text-[#111827] mb-4">Your cart is empty</p>
      <button onClick={() => navigate("/shop")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Shop Now</button>
    </div>
  );

  const field = (name: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="text-sm font-semibold text-[#374151] mb-1.5 block">{label}</label>
      <input type={type} value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${errors[name] ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-[#1E40AF]"}`} />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-6">Checkout</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer details */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-5 flex items-center gap-2"><MapPin size={18} className="text-[#F97316]" /> Customer Details</h3>
            <div className="space-y-4">
              {field("name", "Full Name", "text", "Enter your full name")}
              {field("phone", "WhatsApp Number", "tel", "03001234567")}
              {field("email", "Email Address (optional)", "email", "you@example.com")}
              <div>
                <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Complete Shipping Address</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="House no., street, area, city, province, postal code"
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors resize-none ${errors.address ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-[#1E40AF]"}`} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>
              <div>
                <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Order Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special instructions..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF] resize-none" />
              </div>
            </div>
          </div>

          {/* Payment method selector */}
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2"><Tag size={18} className="text-[#F97316]" /> Payment Method</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setPayment("jazzcash")}
                className={`text-left rounded-xl border-2 p-4 transition-all ${!isCOD ? "border-[#1E40AF] bg-blue-50/60" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 font-bold text-[#111827] text-sm"><Smartphone size={16} className="text-[#1E40AF]" /> JazzCash</span>
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!isCOD ? "border-[#1E40AF] bg-[#1E40AF]" : "border-gray-300"}`} />
                </div>
                <p className="text-xs text-[#6b7280]">Pay now, then send the screenshot on WhatsApp. Available nationwide.</p>
              </button>
              <button type="button" onClick={() => setPayment("cod")}
                className={`text-left rounded-xl border-2 p-4 transition-all ${isCOD ? "border-[#059669] bg-emerald-50/60" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-2 font-bold text-[#111827] text-sm"><Truck size={16} className="text-[#059669]" /> Cash on Delivery</span>
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isCOD ? "border-[#059669] bg-[#059669]" : "border-gray-300"}`} />
                </div>
                <p className="text-xs text-[#6b7280]">Pay cash when it arrives. <strong className="text-[#059669]">Multan region only.</strong></p>
              </button>
            </div>
          </div>

          {/* JazzCash manual payment module */}
          {!isCOD && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #1E40AF, #1e3a8a)" }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <p className="font-black text-white text-base leading-tight">Pay with JazzCash</p>
                <p className="text-blue-200 text-xs">Manual payment · verified by our team</p>
              </div>
            </div>

            <div className="p-6">
              {/* Amount to pay */}
              <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: "linear-gradient(135deg, #FFF7ED, #FFEDD5)", border: "1px solid #FED7AA" }}>
                <p className="text-xs font-bold uppercase tracking-wide text-[#9A3412]">Amount to Pay</p>
                <p className="text-3xl sm:text-4xl font-black text-[#F97316] mt-1">{fmt(total)}</p>
                <p className="text-xs text-[#9A3412] mt-1">Send this <strong>exact</strong> amount to the number below.</p>
              </div>

              {/* Account details */}
              <div className="space-y-2.5 mb-5">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#6b7280]">JazzCash Number</p>
                    <p className="font-black text-[#111827] text-lg tracking-wide">{JAZZCASH_NUMBER}</p>
                  </div>
                  <button onClick={() => copy(JAZZCASH_NUMBER, "num")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E40AF] text-white text-xs font-bold hover:bg-[#1e3a8a] transition-colors flex-shrink-0">
                    {copied === "num" ? <CheckCircle size={14} /> : <Copy size={14} />}
                    {copied === "num" ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#6b7280]">Account Title</p>
                    <p className="font-bold text-[#111827]">{JAZZCASH_TITLE}</p>
                  </div>
                  <button onClick={() => copy(JAZZCASH_TITLE, "title")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-200 text-[#374151] text-xs font-bold hover:border-[#1E40AF] transition-colors flex-shrink-0">
                    {copied === "title" ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copied === "title" ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 mb-5">
                <p className="font-bold text-[#1E40AF] text-sm mb-3">How to pay</p>
                <ol className="space-y-2.5">
                  {[
                    "Send the exact order amount to the JazzCash number above.",
                    "Take a screenshot of the successful transaction.",
                    "Fill in your details, then tap “Submit on WhatsApp”.",
                    "Your order opens in WhatsApp — attach the screenshot there and send it to us. We'll verify it and confirm your order on WhatsApp.",
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#374151]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#1E40AF] text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                      <span className="pt-0.5">{text}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-green-700 mt-3 flex items-start gap-1.5">
                  <MessageCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Your order is sent to our WhatsApp <strong className="whitespace-nowrap">{WHATSAPP_DISPLAY}</strong> for verification.</span>
                </p>
              </div>

              <p className="text-[11px] text-[#6b7280] flex items-start gap-1.5">
                <ShieldCheck size={14} className="text-[#1E40AF] flex-shrink-0 mt-0.5" />
                This is a manual payment system. Your order will be marked <strong>Pending Verification</strong> until we confirm your payment on WhatsApp — it is never auto-approved.
              </p>
            </div>
          </div>
          )}

          {/* Cash on Delivery module */}
          {isCOD && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #059669, #047857)" }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Truck size={20} className="text-white" />
              </div>
              <div>
                <p className="font-black text-white text-base leading-tight">Cash on Delivery</p>
                <p className="text-emerald-100 text-xs">Pay in cash when your order arrives</p>
              </div>
            </div>

            <div className="p-6">
              {/* Amount due on delivery */}
              <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: "linear-gradient(135deg, #ECFDF5, #D1FAE5)", border: "1px solid #A7F3D0" }}>
                <p className="text-xs font-bold uppercase tracking-wide text-[#065F46]">Amount Due on Delivery</p>
                <p className="text-3xl sm:text-4xl font-black text-[#059669] mt-1">{fmt(total)}</p>
                <p className="text-xs text-[#065F46] mt-1">Keep the <strong>exact</strong> amount ready for the rider.</p>
              </div>

              {/* Multan-only notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 mb-5 flex items-start gap-2.5">
                <MapPin size={18} className="text-[#059669] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[#065F46]">Cash on Delivery is available in the <strong>Multan region only</strong>. Make sure your delivery address is inside Multan — orders outside Multan need JazzCash.</p>
              </div>

              {/* Instructions */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 mb-5">
                <p className="font-bold text-[#065F46] text-sm mb-3">How it works</p>
                <ol className="space-y-2.5">
                  {[
                    "Make sure your delivery address is inside Multan.",
                    "Fill in your details, then tap “Submit on WhatsApp”.",
                    "We'll confirm your order on WhatsApp and dispatch it.",
                    "Pay the exact amount in cash to the rider on delivery.",
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#374151]">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#059669] text-white text-xs font-black flex items-center justify-center">{i + 1}</span>
                      <span className="pt-0.5">{text}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-green-700 mt-3 flex items-start gap-1.5">
                  <MessageCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Your order is sent to our WhatsApp <strong className="whitespace-nowrap">{WHATSAPP_DISPLAY}</strong> for confirmation.</span>
                </p>
              </div>

              <p className="text-[11px] text-[#6b7280] flex items-start gap-1.5">
                <ShieldCheck size={14} className="text-[#059669] flex-shrink-0 mt-0.5" />
                Your order will be marked <strong>Pending Verification</strong> until we confirm it on WhatsApp — it is never auto-approved.
              </p>
            </div>
          </div>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-2xl p-6 sticky top-24" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-4">Order Summary</h3>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3">
                  <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-xl"
                    onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=50&h=50&fit=crop"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111827] line-clamp-1">{item.name}</p>
                    <p className="text-xs text-[#6b7280]">Qty: {item.qty}</p>
                  </div>
                  <span className="text-xs font-bold text-[#1E40AF] flex-shrink-0">{fmt(item.price * item.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Subtotal</span><span className="font-semibold">{fmt(cartTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Shipping</span><span className={shipping === 0 ? "text-emerald-600 font-semibold" : "font-semibold"}>{shipping === 0 ? "Free" : fmt(shipping)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Payment</span><span className="font-semibold">{isCOD ? "Cash on Delivery" : "JazzCash"}</span></div>
              <div className="flex justify-between font-black text-[#111827] text-base"><span>{isCOD ? "Due on Delivery" : "Total"}</span><span className="text-[#1E40AF]">{fmt(total)}</span></div>
            </div>
            <button onClick={handleSubmit}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
              style={{ background: "#25D366", boxShadow: "0 4px 16px rgba(37,211,102,0.35)" }}>
              <MessageCircle size={18} /> Submit on WhatsApp — {fmt(total)}
            </button>
            <p className="text-[11px] text-[#6b7280] text-center mt-3">
              {isCOD
                ? "After tapping submit, send the order in the WhatsApp chat that opens to confirm your Cash on Delivery order."
                : "After tapping submit, attach your JazzCash screenshot in the WhatsApp chat that opens."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wishlist Page ────────────────────────────────────────────────────────────
function WishlistPage() {
  const { wishlist, toggleWishlist } = useContext(Store);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-6">My Wishlist</h1>
      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <Heart size={64} className="mx-auto text-gray-300 mb-4" />
          <p className="font-bold text-[#111827] mb-2">Your wishlist is empty</p>
          <p className="text-[#6b7280] text-sm">Save products you love by clicking the heart icon</p>
          <Link to="/shop" className="inline-block mt-5 px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Browse Products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {wishlist.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
function LoginPage() {
  const { login } = useContext(Store);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setErr("Please fill in all fields"); return; }
    login("Customer", form.email);
    navigate("/account");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#F8F9FB]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-16 w-16 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-[#111827]">Welcome Back</h1>
          <p className="text-[#6b7280] text-sm mt-1">Sign in to your Ahmad Mart account</p>
        </div>
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.1)" }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password" required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#374151]">
                <input type="checkbox" className="accent-[#1E40AF]" /> Remember me
              </label>
              <a href="#" className="text-xs text-[#1E40AF] font-semibold hover:text-[#F97316]">Forgot password?</a>
            </div>
            <button type="submit"
              className="w-full py-3.5 rounded-xl bg-[#1E40AF] text-white font-black text-sm hover:bg-[#1e3a8a] transition-all active:scale-95"
              style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-[#6b7280] mt-6">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="text-[#1E40AF] font-bold hover:text-[#F97316]">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Register Page ────────────────────────────────────────────────────────────
function RegisterPage() {
  const { login } = useContext(Store);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setErr("Please fill in all required fields"); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match"); return; }
    if (form.password.length < 8) { setErr("Password must be at least 8 characters"); return; }
    login(form.name, form.email);
    navigate("/account");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#F8F9FB]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-16 w-16 mx-auto mb-3 object-contain" />
          <h1 className="text-2xl font-black text-[#111827]">Create Account</h1>
          <p className="text-[#6b7280] text-sm mt-1">Join Ahmad Mart for exclusive deals</p>
        </div>
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.1)" }}>
          <form onSubmit={handleRegister} className="space-y-4">
            {[
              { key: "name", label: "Full Name", type: "text", placeholder: "Your full name" },
              { key: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
              { key: "phone", label: "Phone Number", type: "tel", placeholder: "03001234567" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-semibold text-[#374151] mb-1.5 block">{label}</label>
                <input type={type} value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat your password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
            </div>
            {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
            <button type="submit"
              className="w-full py-3.5 rounded-xl bg-[#1E40AF] text-white font-black text-sm hover:bg-[#1e3a8a] transition-all active:scale-95"
              style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
              Create Account
            </button>
          </form>
          <p className="text-center text-sm text-[#6b7280] mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-[#1E40AF] font-bold hover:text-[#F97316]">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Account Page ─────────────────────────────────────────────────────────────
function AccountPage() {
  const { user, logout, cart, wishlist } = useContext(Store);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist">("profile");

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <User size={64} className="mx-auto text-gray-300 mb-4" />
        <p className="font-bold text-[#111827] mb-4">Please sign in to view your account</p>
        <button onClick={() => navigate("/login")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm mr-3"
          style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
          Sign In
        </button>
        <button onClick={() => navigate("/register")} className="px-6 py-3 border border-[#1E40AF] text-[#1E40AF] rounded-xl font-bold text-sm">
          Register
        </button>
      </div>
    );
  }

  const mockOrders = [
    { id: "RM847291", date: "June 20, 2025", items: 3, total: 5997, status: "Delivered" },
    { id: "RM741038", date: "June 15, 2025", items: 1, total: 2499, status: "Processing" },
    { id: "RM693045", date: "June 8, 2025", items: 2, total: 4298, status: "Delivered" },
  ];

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "orders", label: "Orders", icon: Package },
    { key: "wishlist", label: "Wishlist", icon: Heart },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-6">My Account</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Orders", value: mockOrders.length, icon: Package, color: "#1E40AF" },
          { label: "Wishlist Items", value: wishlist.length, icon: Heart, color: "#F97316" },
          { label: "Cart Items", value: cart.length, icon: ShoppingCart, color: "#059669" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 text-center"
            style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
            <Icon size={22} className="mx-auto mb-2" style={{ color }} />
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
            <div className="text-center mb-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-black text-xl text-white"
                style={{ background: "linear-gradient(135deg, #1E40AF, #F97316)" }}>
                {user.name.charAt(0)}
              </div>
              <p className="font-bold text-[#111827] text-sm">{user.name}</p>
              <p className="text-xs text-[#6b7280]">{user.email}</p>
            </div>
            <div className="space-y-1">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setTab(key as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === key ? "bg-[#1E40AF] text-white" : "text-[#374151] hover:bg-gray-100"}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
              <button onClick={() => { logout(); navigate("/"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
                <X size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {tab === "profile" && (
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
              <h3 className="font-bold text-[#111827] mb-5">Profile Information</h3>
              <div className="space-y-4 max-w-md">
                {[
                  { label: "Full Name", value: user.name },
                  { label: "Email Address", value: user.email },
                  { label: "Phone Number", value: "+92 300 1234567" },
                  { label: "City", value: "Multan, Pakistan" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-1 block">{label}</label>
                    <div className="px-4 py-3 rounded-xl bg-[#F8F9FB] text-sm font-semibold text-[#111827]">{value}</div>
                  </div>
                ))}
                <button className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm"
                  style={{ boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                  Edit Profile
                </button>
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
              <h3 className="font-bold text-[#111827] mb-5">Order History</h3>
              <div className="space-y-3">
                {mockOrders.map(o => (
                  <div key={o.id} className="p-4 rounded-xl bg-[#F8F9FB] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#1E40AF] text-sm">#{o.id}</p>
                      <p className="text-xs text-[#6b7280] mt-0.5">{o.date} • {o.items} items</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#111827] text-sm">{fmt(o.total)}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${o.status === "Delivered" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "wishlist" && (
            <div>
              {wishlist.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center" style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
                  <Heart size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-bold text-[#111827]">No wishlist items yet</p>
                  <Link to="/shop" className="inline-block mt-4 px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Browse Products</Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlist.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Order Verification ────────────────────────────────────────────────
const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string }> = {
  "Pending Verification": { bg: "#FFF7ED", text: "#9A3412" },
  "Verified": { bg: "#EFF6FF", text: "#1E40AF" },
  "Shipped": { bg: "#F5F3FF", text: "#6D28D9" },
  "Delivered": { bg: "#ECFDF5", text: "#047857" },
  "Cancelled": { bg: "#FEF2F2", text: "#B91C1C" },
};

function AdminPage() {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem("ahmadmart_admin") === "1");
  const [pass, setPass] = useState("");
  const [passErr, setPassErr] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => { if (unlocked) setOrders(getOrders()); }, [unlocked]);

  const tryUnlock = () => {
    if (pass === ADMIN_PASSCODE) {
      sessionStorage.setItem("ahmadmart_admin", "1");
      setUnlocked(true);
    } else {
      setPassErr("Incorrect passcode.");
    }
  };

  const setStatus = (id: string, status: OrderStatus) => setOrders(updateOrderStatus(id, status));

  if (!unlocked) return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
        <div className="w-14 h-14 rounded-2xl bg-[#1E40AF] flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-white" />
        </div>
        <h2 className="font-black text-xl text-[#111827] mb-1">Admin Access</h2>
        <p className="text-xs text-[#6b7280] mb-5">Enter the admin passcode to manage orders.</p>
        <input type="password" value={pass} autoFocus
          onChange={e => { setPass(e.target.value); setPassErr(""); }}
          onKeyDown={e => e.key === "Enter" && tryUnlock()}
          placeholder="Passcode"
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none mb-2 ${passErr ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-[#1E40AF]"}`} />
        {passErr && <p className="text-xs text-red-500 mb-2">{passErr}</p>}
        <button onClick={tryUnlock} className="w-full py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Unlock</button>
      </div>
    </div>
  );

  const counts = ORDER_STATUSES.map(s => ({ s, n: orders.filter(o => o.status === s).length }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] flex items-center gap-2">
            <ShieldCheck size={26} className="text-[#1E40AF]" /> Order Admin
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Verify JazzCash payments and manage order status.</p>
        </div>
        <button onClick={() => setOrders(getOrders())}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-[#374151] hover:border-[#1E40AF] transition-colors">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {counts.map(({ s, n }) => (
          <div key={s} className="rounded-xl px-4 py-3" style={{ background: STATUS_STYLE[s].bg }}>
            <p className="text-2xl font-black" style={{ color: STATUS_STYLE[s].text }}>{n}</p>
            <p className="text-xs font-semibold" style={{ color: STATUS_STYLE[s].text }}>{s}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <Package size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="font-bold text-[#111827] mb-1">No orders yet</p>
          <p className="text-sm text-[#6b7280]">Orders placed through checkout will appear here for verification.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
              <div className="flex flex-col lg:flex-row gap-5">
                {/* Verify payment proof on WhatsApp */}
                <a href={`https://wa.me/${toWaNumber(o.phone)}`} target="_blank" rel="noopener noreferrer"
                  className="w-full lg:w-44 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center hover:bg-green-100 transition-colors flex-shrink-0 min-h-[130px]">
                  <MessageCircle size={28} className="text-green-600" />
                  <p className="text-xs font-bold text-green-800">{isCashOnDelivery(o) ? "Confirm Cash on Delivery order on WhatsApp" : "Verify payment proof on WhatsApp"}</p>
                  <span className="text-[11px] font-semibold text-green-600 underline">Open chat with {o.name.split(" ")[0]}</span>
                </a>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1E40AF]">#{o.id}</span>
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: STATUS_STYLE[o.status].bg, color: STATUS_STYLE[o.status].text }}>{o.status}</span>
                    </div>
                    <span className="text-xs text-[#6b7280]">{new Date(o.createdAt).toLocaleString()}</span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-3">
                    <p><span className="text-[#6b7280]">Name:</span> <span className="font-semibold text-[#111827]">{o.name}</span></p>
                    <p><span className="text-[#6b7280]">WhatsApp:</span> <a href={`https://wa.me/${toWaNumber(o.phone)}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 inline-flex items-center gap-1"><MessageCircle size={12} /> {o.phone}</a></p>
                    {o.email && <p className="truncate"><span className="text-[#6b7280]">Email:</span> <a href={`mailto:${o.email}`} className="font-semibold text-[#1E40AF]">{o.email}</a></p>}
                    <p><span className="text-[#6b7280]">Total:</span> <span className="font-black text-[#1E40AF]">{fmt(o.total)}</span></p>
                    <p><span className="text-[#6b7280]">Payment:</span> <span className={`font-bold ${isCashOnDelivery(o) ? "text-[#059669]" : "text-[#1E40AF]"}`}>{o.paymentMethod}</span></p>
                    <p className="sm:col-span-2"><span className="text-[#6b7280]">Address:</span> <span className="font-semibold text-[#111827]">{o.address}</span></p>
                    {o.notes && <p className="sm:col-span-2"><span className="text-[#6b7280]">Notes:</span> <span className="text-[#374151]">{o.notes}</span></p>}
                  </div>

                  <div className="rounded-xl bg-[#F8F9FB] p-3 mb-3">
                    <p className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-1.5">Products</p>
                    <div className="space-y-1">
                      {o.items.map(it => (
                        <div key={it.id} className="flex justify-between text-sm">
                          <span className="text-[#374151] truncate pr-2">{it.name} <span className="text-[#6b7280]">× {it.qty}</span></span>
                          <span className="font-semibold text-[#111827] flex-shrink-0">{fmt(it.price * it.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#6b7280]">Update status:</span>
                    {ORDER_STATUSES.map(s => (
                      <button key={s} onClick={() => setStatus(o.id, s)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${o.status === s ? "" : "bg-gray-100 text-[#374151] hover:bg-gray-200"}`}
                        style={o.status === s ? { background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].text, outline: `1.5px solid ${STATUS_STYLE[s].text}` } : undefined}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scroll To Top ────────────────────────────────────────────────────────────
// Reset scroll position the moment the route changes so navigation feels instant
// instead of landing the new page at the previous scroll offset.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

// ─── App Shell ────────────────────────────────────────────────────────────────
function AppShell() {
  const location = useLocation();
  const isAuth = location.pathname === "/login" || location.pathname === "/register";

  return (
    <div className="min-h-screen bg-[#F8F9FB]" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <ScrollToTop />
      {!isAuth && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      {!isAuth && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </StoreProvider>
  );
}
