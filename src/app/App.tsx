import { useState, useEffect, useRef, useContext, createContext, useCallback, useMemo, memo, type CSSProperties } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from "react-router-dom";
import ahmadMartLogo from "@/imports/ahmad-logo.png";
import {
  ShoppingCart, Heart, Search, Menu, X, Star, ChevronRight, ChevronLeft, ChevronDown,
  Package, Truck, Shield, Headphones, Clock, Zap, Filter, SlidersHorizontal,
  Plus, Minus, Trash2, Tag, MapPin, Phone, User, Eye, EyeOff,
  CheckCircle, ArrowRight, TrendingUp, Award, Gift,
  Instagram, Mail, Send, Smartphone,
  Battery, Plug, Wifi, RotateCcw, ZoomIn,
  Copy, ShieldCheck, Lock, RefreshCw, MessageCircle, ImageOff, Upload, Globe, Download
} from "lucide-react";
import {
  WHATSAPP_DISPLAY, WHATSAPP_NUMBER,
  ORDER_STATUSES, ACCOUNT_TYPES, OFFICIAL_ACCOUNT_TYPE, newOrderId,
  sendOrderEmail, whatsappOrderUrl, whatsappDeliveredUrl, toWaNumber, isCashOnDelivery,
  fileToCompressedDataURL, validateProofFile,
  type Order, type OrderStatus, type AccountType, type PaymentMethods,
} from "./orderStore";
import {
  getProductReviews, saveReview, newReviewId, type UserReview,
} from "./reviewStore";
import {
  createOrder, getMyOrders, deleteMyOrder,
  sellerGetOrders, sellerUpdateOrderStatus, sellerClearHistory,
} from "./ordersApi";
import { downloadOrderHistoryPdf } from "./sellerOrdersPdf";

// ─── Types ────────────────────────────────────────────────────────────────────
import type { Product } from "./types";
import {
  fetchProducts as apiFetchProducts, createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct, deleteProduct as apiDeleteProduct,
  setProductFeatured as apiSetProductFeatured, renameCategory as apiRenameCategory,
  deleteCategory as apiDeleteCategory,
  fetchAnalytics, seedProducts, type Analytics,
} from "./adminApi";
import {
  apiLogin, apiSignup, apiMe, apiChangeRole, apiUpdateStore,
  setToken, clearToken, type AuthUser, type Role, type SellerSignup,
} from "./auth";
import {
  sellerGetProducts, sellerCreateProduct, sellerUpdateProduct, sellerDeleteProduct, sellerSetAllDelivery,
  adminGetSellers, sellerGetAnalytics, adminGetSellerDetail, adminDeleteSeller, adminResetSellerEarnings,
  type SellerSummary, type SalesAnalytics, type SellerDetail,
} from "./sellerApi";
import {
  sendMessage, getConversations, getThread, getUnreadCount,
  type Conversation, type ChatMessage,
} from "./messagesApi";
import { POLICY_LINKS, openPolicyPdf } from "./policyDocs";

interface CartItem extends Product { qty: number; }
interface WishlistItem extends Product {}

interface StoreCtx {
  products: Product[];
  productsLoading: boolean;
  refreshProducts: (fresh?: boolean) => Promise<void>;
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
  user: AuthUser | null;
  authReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, role: Role, seller?: SellerSignup) => Promise<void>;
  changeRole: (role: Role) => Promise<void>;
  updateStore: (fields: { storeName: string; whatsapp: string; accountNumber?: string; accountTitle?: string; accountType?: AccountType; paymentMethods?: PaymentMethods }) => Promise<void>;
  logout: () => void;
  recentlyViewed: Product[];
  addRecentlyViewed: (p: Product) => void;
}

const Store = createContext<StoreCtx>({} as StoreCtx);

// ─── Seed catalog ─────────────────────────────────────────────────────────────
// Built-in products. These are the fallback when the database API is unavailable,
// and the data the "Seed database" button in the admin panel imports into Neon.
const SEED_PRODUCTS: Product[] = [
  {
    id: 18, name: "White Losse Pro 2 (Without Box)", price: 849, originalPrice: 1000,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "/earbuds/losse-pro2-white-nobox-1.jpg",
    images: [
      "/earbuds/losse-pro2-white-nobox-1.jpg",
      "/earbuds/losse-pro2-white-nobox-2.jpg",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "The White Losse Pro 2 earbuds deliver premium quality sound with deep, punchy bass and a clean, balanced output. They sit comfortably for hours, charge fast, and last all day on a single charge. A sleek white finish that feels light yet durable.",
    specs: { "Sound": "Premium, Deep Bass", "Bluetooth": "5.3", "Battery": "Long lasting", "Charging": "Fast charge", "Fit": "Lightweight and comfortable", "Build": "Durable", "Packaging": "Without box" }
  },
  {
    id: 19, name: "Black Losse Pro 2 (Without Box)", price: 949, originalPrice: 1100,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "/earbuds/losse-pro2-black-nobox-1.jpg",
    images: [
      "/earbuds/losse-pro2-black-nobox-1.jpg",
      "/earbuds/losse-pro2-black-nobox-2.jpg",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "The Black Losse Pro 2 earbuds bring rich, powerful bass and crisp highs in a bold matte black design. Comfortable for all day wear, with fast charging and long battery life that keeps the music going. Tough, reliable, and splash resistant for everyday use.",
    specs: { "Sound": "Powerful Bass", "Bluetooth": "5.3", "Battery": "Long lasting", "Charging": "Fast charge", "Water Resistance": "Splash resistant", "Fit": "Comfortable", "Packaging": "Without box" }
  },
  {
    id: 20, name: "Air 31 (Box Packed)", price: 949, originalPrice: 1300,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "The Air 31 earbuds come fully box packed with a premium feel and a satisfying, bass heavy sound. They pair instantly, charge quickly, and offer a comfortable, secure fit for music and calls. A smart digital battery display shows the charge at a glance.",
    specs: { "Sound": "Bass heavy", "Bluetooth": "5.3", "Display": "Digital battery display", "Charging": "Fast charge", "Fit": "Secure and comfortable", "Build": "Durable", "Packaging": "Box packed" }
  },
  {
    id: 21, name: "Losse Pro 2 White (With Box)", price: 1599, originalPrice: 2200,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "/earbuds/losse-pro2-white-box-1.jpg",
    images: [
      "/earbuds/losse-pro2-white-box-1.jpg",
      "/earbuds/losse-pro2-white-box-2.jpg",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "The Losse Pro 2 White comes complete with its full retail box. Enjoy premium quality sound with deep bass, crystal clear calls, and easy touch controls. Fast and long lasting charging, a comfortable fit, and a durable, water resistant build make these a complete package.",
    specs: { "Sound": "Premium, Deep Bass", "Bluetooth": "5.3", "Calls": "Crystal clear mic", "Charging": "Fast and long lasting", "Water Resistance": "Water resistant", "Controls": "Touch controls", "Packaging": "With box" }
  },
  {
    id: 22, name: "Losse Pro 2 Black (With Box)", price: 1699, originalPrice: 2300,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "/earbuds/losse-pro2-black-box-1.jpg",
    images: [
      "/earbuds/losse-pro2-black-box-1.jpg",
      "/earbuds/losse-pro2-black-box-2.jpg",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "The Losse Pro 2 Black is the complete boxed edition with a premium black finish. It delivers the best bass in its class, comfortable all day wear, and fast, long lasting charging. Durable and water resistant, built to keep up with your daily routine.",
    specs: { "Sound": "Best in class Bass", "Bluetooth": "5.3", "Charging": "Fast and long lasting", "Water Resistance": "Water resistant", "Fit": "Comfortable", "Build": "Durable", "Packaging": "With box" }
  },
  {
    id: 23, name: "Audionic 550", price: 4899, originalPrice: 5400,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Audionic 550 is a fully branded earbud set built for premium sound. Expect rich, best in class bass, comfortable long wear, and fast charging that lasts. Durable and water resistant, and backed by a full 12 months brand warranty for complete peace of mind.",
    specs: { "Brand": "Audionic (Original)", "Warranty": "12 Months", "Sound": "Premium, Best Bass", "Charging": "Fast and long lasting", "Water Resistance": "Water resistant", "Fit": "Comfortable", "Build": "Durable" }
  },
  {
    id: 24, name: "Audionic 425", price: 4999, originalPrice: 5600,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Audionic 425 brings genuine branded quality with deep, powerful bass and crystal clear calls. Comfortable for hours, with fast and long lasting charging and a tough, water resistant build. Includes a full 12 months official Audionic warranty.",
    specs: { "Brand": "Audionic (Original)", "Warranty": "12 Months", "Sound": "Deep, Powerful Bass", "Calls": "Crystal clear mic", "Charging": "Fast and long lasting", "Water Resistance": "Water resistant", "Build": "Durable" }
  },
  {
    id: 25, name: "Audionic 595", price: 4849, originalPrice: 5200,
    category: "Mobile Accessories", subcategory: "Earbuds",
    image: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Audionic 595 is a premium branded earbud set tuned for balanced sound and strong bass. It is comfortable, durable, and water resistant, with fast charging and long playtime. Covered by a full 12 months Audionic brand warranty.",
    specs: { "Brand": "Audionic (Original)", "Warranty": "12 Months", "Sound": "Balanced, Strong Bass", "Charging": "Fast and long lasting", "Water Resistance": "Water resistant", "Fit": "Comfortable", "Build": "Durable" }
  },
  {
    id: 2, name: "65W GaN Fast Charger", price: 1299, originalPrice: 1899,
    category: "Mobile Accessories", subcategory: "Chargers",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "bestseller", inStock: true,
    description: "Charge your devices at blazing speed with our 65W GaN Fast Charger. It works with all USB C devices including MacBooks, smartphones, and tablets.",
    specs: { "Power Output": "65W Max", "Ports": "2x USB-C + 1x USB-A", "Technology": "GaN III", "Compatibility": "Universal", "Protection": "Over-voltage, Short-circuit", "Size": "Compact" }
  },
  {
    id: 3, name: "20000mAh Power Bank Pro", price: 3499, originalPrice: 4999,
    category: "Mobile Accessories", subcategory: "Power Banks",
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "sale", inStock: true,
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
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Durable nylon braided USB C cable with 100W fast charging support and data transfer speeds up to 10Gbps.",
    specs: { "Length": "1.8 Meters", "Material": "Nylon Braided", "Max Power": "100W", "Data Speed": "10 Gbps", "Compatibility": "USB-C Universal", "Durability": "30,000+ Bends" }
  },
  {
    id: 5, name: "Universal Phone Dashboard Holder", price: 799, originalPrice: 1199,
    category: "Mobile Accessories", subcategory: "Mobile Holders",
    image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, inStock: true,
    description: "A 360 degree adjustable phone holder for your car dashboard. It fits all phones up to 7 inches.",
    specs: { "Rotation": "360°", "Compatibility": "4\"-7\" Phones", "Mounting": "Dashboard/Windshield", "Material": "Premium ABS", "Grip": "Strong Suction + Gel", "Adjustable": "Yes" }
  },
  {
    id: 6, name: "Clear Armor Phone Case for iPhone 15", price: 699, originalPrice: 999,
    category: "Mobile Accessories", subcategory: "Mobile Cases",
    image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Military grade drop protection with crystal clear transparency. Show off your phone's design while keeping it safe.",
    specs: { "Material": "TPU + Polycarbonate", "Drop Protection": "MIL-STD-810G", "Compatibility": "iPhone 15/15 Pro", "Color": "Crystal Clear", "Raised Edges": "Yes", "Wireless Charging": "Compatible" }
  },
  {
    id: 7, name: "Luxury Silent Wall Clock in Gold", price: 2999, originalPrice: 4499,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "bestseller", inStock: true,
    description: "Elevate your interior with this premium gold finish silent wall clock. It features whisper quiet movement and an elegant minimalist design.",
    specs: { "Diameter": "30cm", "Movement": "Quartz Silent", "Material": "Aluminum Frame", "Color": "Rose Gold", "Battery": "1x AA", "Mounting": "Wall Hook Included" }
  },
  {
    id: 8, name: "Nordic Minimalist Wall Clock", price: 1999, originalPrice: 2999,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "sale", inStock: true,
    description: "Inspired by Scandinavian design, this minimalist wall clock brings calm sophistication to any room.",
    specs: { "Diameter": "35cm", "Movement": "Step Sweep", "Material": "Natural Wood + Glass", "Color": "White/Walnut", "Battery": "1x AA", "Style": "Nordic Minimalist" }
  },
  {
    id: 10, name: "30W iPhone Fast Charger", price: 999, originalPrice: 1499,
    category: "Mobile Accessories", subcategory: "Chargers",
    image: "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1620714223084-8fcacc2dcea3?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
    description: "Official quality 30W USB C charger designed for iPhones. Charge from 0 to 50 percent in just 30 minutes.",
    specs: { "Power Output": "30W", "Port": "USB-C", "Compatibility": "iPhone 12 and above", "Cable Required": "USB-C to Lightning", "Protection": "Yes", "Certification": "MFi Compatible" }
  },
  {
    id: 11, name: "Vintage Roman Numeral Clock", price: 3499, originalPrice: 4999,
    category: "Home Decoration", subcategory: "Wall Clocks",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 0, reviews: 0, badge: "new", inStock: true,
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
    rating: 0, reviews: 0, inStock: true,
    description: "Ultra slim 10000mAh power bank that fits in your pocket. Perfect for daily commutes and travel.",
    specs: { "Capacity": "10000mAh", "Thickness": "12mm", "Ports": "USB-C + USB-A", "Fast Charge": "22.5W", "LED Indicator": "4-LED", "Weight": "195g" }
  },
  {
    id: 13, name: "Website Development", price: 15000, priceNote: "to Rs. 30,000",
    category: "Digital Services", subcategory: "Digital Services", isService: true,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1547658719-da2b51169166?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 5, reviews: 0, inStock: true,
    description: "A complete, professional website built for your business with responsive design, fast loading, search engine ready pages, and a contact and order flow. The final scope and price are confirmed with you directly on WhatsApp.",
    specs: { "Price Range": "Rs. 15,000 to 30,000", "Type": "Business / Portfolio / Store", "Responsive": "Mobile + Desktop", "Delivery Time": "2 to 3 weeks", "Revisions": "Included", "Support": "Support after launch" }
  },
  {
    id: 14, name: "Social Media Management", price: 5000, priceNote: "per month",
    category: "Digital Services", subcategory: "Digital Services", isService: true,
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 5, reviews: 0, inStock: true,
    description: "We manage your social media presence with content planning, captions, scheduling, posting, and audience engagement to grow your brand every month. Graphic design is offered as a separate service. The final package and payment details are arranged on WhatsApp.",
    specs: { "Price": "Rs. 5,000 / month", "Platforms": "Facebook, Instagram, TikTok", "Content": "Captions + Scheduling", "Posting": "Included", "Reporting": "Monthly", "Engagement": "Comments & DMs" }
  },
  {
    id: 15, name: "Ads Management", price: 15000, priceNote: "per month",
    category: "Digital Services", subcategory: "Digital Services", isService: true,
    image: "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 5, reviews: 0, inStock: true,
    description: "Paid advertising managed from start to finish, covering Meta and Google ad campaigns, audience targeting, creatives, and ongoing optimisation to bring you real leads and sales. The ad budget is separate and the final terms are set on WhatsApp.",
    specs: { "Management Fee": "Rs. 15,000 / month", "Platforms": "Meta & Google Ads", "Includes": "Targeting + Creatives", "Optimisation": "Ongoing", "Reporting": "Weekly", "Ad Budget": "Billed separately" }
  },
  {
    id: 16, name: "App Development", price: 100000, priceNote: "onwards",
    category: "Digital Services", subcategory: "Digital Services", isService: true,
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 5, reviews: 0, inStock: true,
    description: "Custom Android and iOS app development tailored to your idea. The price depends on the features and category, starting from Rs. 1,00,000. Share your requirements on WhatsApp for an exact quote and timeline.",
    specs: { "Starting Price": "Rs. 1,00,000", "Platforms": "Android & iOS", "Pricing": "Based on features", "UI / UX Design": "Included", "Timeline": "Quoted per project", "Support": "Post-launch support" }
  },
  {
    id: 17, name: "Graphic Designing", price: 10000, priceNote: "to Rs. 15,000",
    category: "Digital Services", subcategory: "Digital Services", isService: true,
    image: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=400&h=400&fit=crop&auto=format",
    images: [
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=600&h=600&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1626785774625-ddcddc3445e9?w=600&h=600&fit=crop&auto=format",
    ],
    rating: 5, reviews: 0, inStock: true,
    description: "Striking graphic design for your brand, including logos, social media posts, banners, flyers, and a complete visual identity. Pricing depends on the scope, from Rs. 10,000 to Rs. 15,000. Share your requirements on WhatsApp for a final quote.",
    specs: { "Price Range": "Rs. 10,000 to 15,000", "Includes": "Logos, Posts, Banners", "Formats": "PNG, JPG, PDF + Source", "Revisions": "Included", "Delivery Time": "3 to 7 days", "Pricing": "Based on scope" }
  },
];

// Demo testimonials are emptied until the store is live — real reviews come from
// customers via the review form on each product page. Refill this array to show
// curated testimonials later.
const REVIEWS: { id: number; name: string; city: string; rating: number; text: string; product: string; avatar: string }[] = [];

const CATEGORIES = [
  { name: "Earbuds", icon: Headphones, subcategory: "Earbuds", color: "#1E40AF", bg: "#EFF6FF" },
  { name: "Chargers", icon: Zap, subcategory: "Chargers", color: "#F97316", bg: "#FFF7ED" },
  { name: "Power Banks", icon: Battery, subcategory: "Power Banks", color: "#059669", bg: "#ECFDF5" },
  { name: "Data Cables", icon: Plug, subcategory: "Data Cables", color: "#7C3AED", bg: "#F5F3FF" },
  { name: "Digital Services", icon: Wifi, subcategory: "Digital Services", color: "#0891B2", bg: "#ECFEFF" },
  { name: "Wall Clocks", icon: Clock, subcategory: "Wall Clocks", color: "#B45309", bg: "#FFFBEB" },
];

// ─── Store Provider ───────────────────────────────────────────────────────────
// Cache the last live catalog so the store opens instantly with REAL products on
// the next visit — instead of flashing the stale built-in seed and then swapping.
const PRODUCTS_CACHE_KEY = "ahmadmart_products_v1";
function loadCachedProducts(): Product[] | null {
  try {
    const raw = localStorage.getItem(PRODUCTS_CACHE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length ? (arr as Product[]) : null;
  } catch { return null; }
}
function cacheProducts(list: Product[]): void {
  try { localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(list)); } catch { /* quota exceeded — skip */ }
}

function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);

  // Restore the session from a stored token on load.
  useEffect(() => {
    apiMe().then(u => setUser(u)).catch(() => {}).finally(() => setAuthReady(true));
  }, []);
  // Products always come fresh from the Neon-backed API on every visit — start
  // empty and show skeletons until the fetch resolves, so categories/products
  // never flash a stale cached catalog (from a previous visit, before a seller
  // added/changed something) before swapping to the real, current one. The
  // cache is only ever used as a fallback if the live fetch itself fails.
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // fresh=true bypasses the CDN edge cache — used right after a product write so
  // the writer always sees their change immediately; plain loads take the fast
  // cached path.
  const refreshProducts = useCallback(async (fresh = false) => {
    try {
      const live = await apiFetchProducts(fresh);
      if (Array.isArray(live) && live.length) { setProducts(live); cacheProducts(live); }
    } catch {
      setProducts(prev => (prev.length ? prev : (loadCachedProducts() ?? SEED_PRODUCTS)));
    } finally {
      setProductsLoading(false);
    }
  }, []);
  useEffect(() => { refreshProducts(); }, [refreshProducts]);

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
  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await apiLogin(email, password);
    setToken(token); setUser(user);
  }, []);
  const signup = useCallback(async (name: string, email: string, password: string, role: Role, seller?: SellerSignup) => {
    const { token, user } = await apiSignup(name, email, password, role, seller);
    setToken(token); setUser(user);
  }, []);
  const changeRole = useCallback(async (role: Role) => {
    const { token, user } = await apiChangeRole(role);
    setToken(token); setUser(user);
  }, []);
  const updateStore = useCallback(async (fields: { storeName: string; whatsapp: string; accountNumber?: string; accountTitle?: string; accountType?: AccountType; paymentMethods?: PaymentMethods }) => {
    const { user } = await apiUpdateStore(fields);
    setUser(user);
  }, []);
  const logout = useCallback(() => { clearToken(); setUser(null); }, []);
  const addRecentlyViewed = useCallback((p: Product) => {
    setRecentlyViewed(prev => [p, ...prev.filter(i => i.id !== p.id)].slice(0, 6));
  }, []);

  const value = useMemo(() => ({
    products, productsLoading, refreshProducts,
    cart, wishlist, addToCart, removeFromCart, clearCart, updateQty, toggleWishlist, inWishlist,
    cartCount, cartTotal, user, authReady, login, signup, changeRole, updateStore, logout, recentlyViewed, addRecentlyViewed,
  }), [products, productsLoading, refreshProducts, cart, wishlist, addToCart, removeFromCart, clearCart, updateQty, toggleWishlist, inWishlist,
    cartCount, cartTotal, user, authReady, login, signup, changeRole, updateStore, logout, recentlyViewed, addRecentlyViewed]);

  return <Store.Provider value={value}>{children}</Store.Provider>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;
// Compact count for "sold" badges — 1,234 → "1.2k".
const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n));
const discount = (orig: number, curr: number) => Math.round((1 - curr / orig) * 100);
// Fisher-Yates shuffle — used to show the shop's catalog in random order.
function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Pakistan date & time (Asia/Karachi) ──────────────────────────────────────
// Every date shown in the dashboards is rendered in Pakistan time so sellers and
// admin always see the same exact local date and time.
const PK_TZ = "Asia/Karachi";
const fmtPKDate = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { timeZone: PK_TZ, day: "2-digit", month: "short", year: "numeric" });
const fmtPKDateTime = (ms: number) =>
  new Date(ms).toLocaleString("en-GB", { timeZone: PK_TZ, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
// A 'YYYY-MM-DD' Pakistan day string → "Mon, 02 Jun" for the daily breakdown.
const fmtPKDay = (day: string) => {
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
};

// Live clock that ticks every second, always in Pakistan time.
function PakistanClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const text = new Date(now).toLocaleString("en-GB", {
    timeZone: PK_TZ, weekday: "short", day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EFF6FF] text-[#1E40AF] text-xs font-bold">
      <Clock size={14} /> Pakistan time: <span className="font-mono">{text}</span>
    </div>
  );
}

/** wa.me link to enquire about a digital service — pricing/payment is finalised on chat. */
const serviceWhatsAppUrl = (p: Product) => {
  const price = `${fmt(p.price)}${p.priceNote ? ` ${p.priceNote}` : ""}`;
  const text = `Hi Ahmad Mart 👋, I'm interested in your *${p.name}* service (${price}). Please share the final price, payment details, and next steps.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
};

// ─── Delivery ─────────────────────────────────────────────────────────────────
// Default delivery charge used when a seller has not set one for a product.
const DELIVERY_FEE = 230;
// A product's effective delivery charge (a seller may set it per product).
const productDelivery = (p: { deliveryCharge?: number | null }) =>
  p.deliveryCharge != null ? p.deliveryCharge : DELIVERY_FEE;
// Delivery is charged once per seller (one shipment): the highest delivery charge
// among that seller's items in the cart. The total is the sum across sellers.
function computeDelivery(items: { sellerId?: number; deliveryCharge?: number | null }[]): number {
  const perSeller = new Map<string, number>();
  for (const it of items) {
    const key = it.sellerId ? `s${it.sellerId}` : "official";
    perSeller.set(key, Math.max(perSeller.get(key) ?? 0, productDelivery(it)));
  }
  let total = 0;
  perSeller.forEach(v => { total += v; });
  return total;
}

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

// A single shared IntersectionObserver reveals every element registered with it,
// instead of creating one observer per card — much lighter when a page has many
// products. When an element enters view it gets `is-visible` (CSS animates it in)
// and is unobserved (one-shot).
let _revealObserver: IntersectionObserver | null = null;
function getRevealObserver(): IntersectionObserver | null {
  if (typeof IntersectionObserver === "undefined") return null;
  if (!_revealObserver) {
    _revealObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); _revealObserver?.unobserve(e.target); }
      }
    }, { threshold: 0.05, rootMargin: "0px 0px -40px 0px" });
  }
  return _revealObserver;
}

// Adds `is-visible` to an element when it scrolls into view, triggering the CSS
// reveal animation. Falls back to visible if IntersectionObserver is unavailable
// so content is never stuck hidden.
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = getRevealObserver();
    if (!io) { el.classList.add("is-visible"); return; }
    io.observe(el);
    return () => io.unobserve(el);
  }, []);
  return ref;
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCardBase({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, inWishlist } = useContext(Store);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const cardRef = useReveal<HTMLDivElement>();

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAdding(true);
    addToCart(product);
    setTimeout(() => setAdding(false), 700);
  };

  return (
    <div
      ref={cardRef}
      onClick={() => navigate(`/product/${product.id}`)}
      className="reveal group bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08), 0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: "4/5" }}>
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black text-white px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, #F97316, #ea580c)", boxShadow: "0 2px 8px rgba(249,115,22,0.4)" }}>
              <Star size={9} className="fill-white" /> Featured
            </span>
          )}
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
        {product.sellerStore && <p className="text-[11px] text-[#6b7280] mb-1 truncate">Sold by <span className="font-semibold text-[#374151]">{product.sellerStore}</span>{product.sellerCity ? ` · ${product.sellerCity}` : ""}</p>}
        <h3 className="font-semibold text-[#111827] text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[#1E40AF] transition-colors">{product.name}</h3>
        {!product.isService && (product.reviews > 0 || !!product.sold) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {product.reviews > 0 && (
              <>
                <Stars rating={product.rating} />
                <span className="text-xs text-gray-400">({product.reviews})</span>
              </>
            )}
            {!!product.sold && <span className="text-xs text-gray-400">{fmtCount(product.sold)} sold</span>}
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-[#1E40AF]">{fmt(product.price)}</p>
            {product.originalPrice && <p className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</p>}
            {product.priceNote && <p className="text-[11px] text-[#6b7280] font-medium">{product.priceNote}</p>}
          </div>
          {product.isService ? (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-200 active:scale-95 bg-[#1E40AF] hover:bg-[#1e3a8a]"
              style={{ boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}
            >
              <ShoppingCart size={13} /> Buy
            </button>
          ) : (
            <button
              onClick={handleAdd}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${adding ? "bg-emerald-500 text-white" : "bg-[#1E40AF] text-white hover:bg-[#1e3a8a]"}`}
              style={{ boxShadow: adding ? "0 4px 12px rgba(16,185,129,0.4)" : "0 4px 12px rgba(30,64,175,0.3)" }}
            >
              {adding ? <CheckCircle size={13} /> : <ShoppingCart size={13} />}
              {adding ? "Added!" : "Add"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const ProductCard = memo(ProductCardBase);

// Placeholder shown while the live catalog is still loading (first visit, no
// cache) so the grid never flashes empty or shows stale dummy products.
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
      <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: "1/1" }} />
      <div className="p-3 sm:p-4 space-y-2">
        <div className="h-3 rounded bg-gray-100 animate-pulse w-3/4" />
        <div className="h-3 rounded bg-gray-100 animate-pulse w-1/2" />
        <div className="h-5 rounded bg-gray-100 animate-pulse w-1/3 mt-2" />
      </div>
    </div>
  );
}
function SkeletonGrid({ count }: { count: number }) {
  return <>{Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}</>;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
// Language toggle (English ↔ Urdu). Switching sets the Google Translate cookie
// and reloads; index.html then loads Google Translate and renders the page in
// Urdu. Marked notranslate so the button's own label is never translated.
function LangToggle({ full = false }: { full?: boolean }) {
  const isUrdu = typeof localStorage !== "undefined" && localStorage.getItem("am_lang") === "ur";
  const switchTo = (lang: "en" | "ur") => {
    try {
      localStorage.setItem("am_lang", lang);
      if (lang === "ur") document.cookie = "googtrans=/en/ur; path=/";
      else document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch { /* storage blocked */ }
    window.location.reload();
  };
  return (
    <button
      translate="no"
      onClick={() => switchTo(isUrdu ? "en" : "ur")}
      title={isUrdu ? "Switch to English" : "اردو میں دیکھیں"}
      className={`notranslate inline-flex items-center gap-1.5 rounded-xl border border-gray-200 font-bold text-[#1E40AF] hover:bg-[#EFF6FF] transition-colors ${full ? "w-full justify-center px-4 py-2.5 text-sm" : "px-2.5 h-9 text-xs"}`}
    >
      <Globe size={16} /> {isUrdu ? "English" : "اردو"}
    </button>
  );
}

function Navbar() {
  const { cartCount, user, products } = useContext(Store);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [unread, setUnread] = useState(0);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the unread-message badge fresh while signed in.
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let alive = true;
    const tick = () => getUnreadCount().then(n => { if (alive) setUnread(n); });
    tick();
    const t = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [user, location]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => { setMenuOpen(false); setSearchOpen(false); setOpenCat(null); }, [location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQ.trim()) { navigate(`/shop?q=${encodeURIComponent(searchQ)}`); setSearchOpen(false); setSearchQ(""); }
  };

  // Category links are built from the live catalog, so any new category a seller
  // adds shows up in the main bar automatically (built-ins always listed first).
  const baseCats = ["Mobile Accessories", "Home Decoration", "Digital Services"];
  const allCats = Array.from(new Set([...baseCats, ...products.map(p => p.category)])).filter(Boolean);
  // Keep the bar tidy: only a few categories sit on the navbar, the rest go under
  // a "More" dropdown so the bar never overflows as new categories are added.
  const NAV_CAT_LIMIT = 3;
  const visibleCats = allCats.slice(0, NAV_CAT_LIMIT);
  const moreCats = allCats.slice(NAV_CAT_LIMIT);
  // category -> its sub-categories (for the hover mega-menus)
  const catTree: Record<string, string[]> = {};
  for (const p of products) {
    (catTree[p.category] ||= []);
    if (!catTree[p.category].includes(p.subcategory)) catTree[p.category].push(p.subcategory);
  }
  // Live search results shown in the search dropdown.
  const q = searchQ.trim().toLowerCase();
  const results = q
    ? products.filter(p => p.name.toLowerCase().includes(q) || p.subcategory.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)).slice(0, 6)
    : [];

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 glass-nav transition-all duration-300 ${scrolled ? "shadow-lg" : ""}`}>
        {/* Seller promo bar — continuously scrolling */}
        <Link to="/register" className="block bg-[#1E40AF] text-white py-2 overflow-hidden hover:bg-[#1e3a8a] transition-colors">
          <div className="flex w-max animate-marquee">
            {[0, 1].map(g => (
              <div key={g} className="flex shrink-0" aria-hidden={g === 1}>
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="px-10 text-xs sm:text-sm font-semibold whitespace-nowrap">
                    🛍️ Sell your products on Ahmad Mart with <span className="text-[#F97316] font-bold">0% commission</span> — start selling today
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Link>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-4 xl:mr-8">
              <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-10 w-10 object-contain" />
              <div className="hidden sm:block notranslate" translate="no">
                <span className="text-xl font-black text-[#1E40AF] tracking-tight">Ahmad</span>
                <span className="text-xl font-black text-[#F97316] tracking-tight">Mart</span>
              </div>
            </Link>

            {/* Desktop Nav — only from xl up, so it never crowds at laptop widths
                (it collapses to the hamburger menu below that, same as mobile). */}
            <div className="hidden xl:flex items-center gap-7 flex-1 min-w-0">
              <Link to="/" className="text-sm font-semibold text-[#111827] hover:text-[#1E40AF] transition-colors">Home</Link>
              <Link to="/shop" className="text-sm font-semibold text-[#111827] hover:text-[#1E40AF] transition-colors">Shop</Link>
              {visibleCats.map(c => {
                const subs = catTree[c] || [];
                return (
                  <div key={c} className="relative group">
                    <Link to={`/shop?cat=${encodeURIComponent(c)}`}
                      className="flex items-center gap-1 text-sm font-semibold text-[#111827] hover:text-[#1E40AF] transition-colors py-2">
                      {c}{subs.length > 0 && <ChevronDown size={13} className="text-gray-400 group-hover:text-[#1E40AF] group-hover:rotate-180 transition-transform" />}
                    </Link>
                    {subs.length > 0 && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 hidden group-hover:block z-50">
                        <div className="bg-white rounded-xl border border-gray-100 py-2 min-w-[200px]" style={{ boxShadow: "0 14px 36px rgba(30,64,175,0.16)" }}>
                          {subs.map(s => (
                            <Link key={s} to={`/shop?sub=${encodeURIComponent(s)}`}
                              className="block px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">
                              {s}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {moreCats.length > 0 && (
                <div className="relative group">
                  <button className="flex items-center gap-1 text-sm font-semibold text-[#111827] hover:text-[#1E40AF] transition-colors py-2">
                    More <ChevronDown size={13} className="text-gray-400 group-hover:text-[#1E40AF] group-hover:rotate-180 transition-transform" />
                  </button>
                  <div className="absolute right-0 top-full pt-2 hidden group-hover:block z-50">
                    {/* Subcategories expand inline (not a side flyout) so they are
                        never clipped by this menu's own scrollbar. */}
                    <div className="bg-white rounded-xl border border-gray-100 py-2 min-w-[220px] max-h-[70vh] overflow-y-auto" style={{ boxShadow: "0 14px 36px rgba(30,64,175,0.16)" }}>
                      {moreCats.map(c => {
                        const subs = catTree[c] || [];
                        return (
                          <div key={c} className="group/item">
                            <Link to={`/shop?cat=${encodeURIComponent(c)}`}
                              className="flex items-center justify-between gap-2 px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">
                              {c}
                              {subs.length > 0 && <ChevronDown size={13} className="text-gray-400 group-hover/item:text-[#1E40AF] group-hover/item:rotate-180 transition-transform flex-shrink-0" />}
                            </Link>
                            {subs.length > 0 && (
                              <div className="hidden group-hover/item:block bg-[#F8F9FB] py-1">
                                <Link to={`/shop?cat=${encodeURIComponent(c)}`} className="block pl-7 pr-4 py-1.5 text-sm font-bold text-[#1E40AF] hover:bg-[#EFF6FF] transition-colors">All {c}</Link>
                                {subs.map(s => (
                                  <Link key={s} to={`/shop?sub=${encodeURIComponent(s)}`}
                                    className="block pl-7 pr-4 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">
                                    {s}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-2">
              <div className="hidden md:block"><LangToggle /></div>
              <button onClick={() => setSearchOpen(o => !o)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#1E40AF] transition-colors">
                <Search size={18} />
              </button>
              <Link to="/wishlist"
                className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl hover:bg-[#FFF7ED] text-[#111827] hover:text-[#F97316] transition-colors">
                <Heart size={18} />
              </Link>
              {user && (
                <Link to="/messages"
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#1E40AF] transition-colors">
                  <MessageCircle size={18} />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </Link>
              )}
              <Link to={user ? "/account" : "/login"}
                className="w-9 h-9 hidden sm:flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] text-[#111827] hover:text-[#1E40AF] transition-colors">
                <User size={18} />
              </Link>
              <span className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
              <Link to="/cart" className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-sm transition-all active:scale-95"
                style={{ background: "#1E40AF", color: "#fff", boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                <ShoppingCart size={16} />
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>
              <button onClick={() => setMenuOpen(o => !o)} className="xl:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors ml-0.5">
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Search bar + live results */}
          {searchOpen && (
            <div className="pb-3">
              <form onSubmit={handleSearch}>
                <div className="flex gap-2">
                  <input
                    autoFocus value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#1E40AF]/20 text-sm outline-none focus:border-[#1E40AF] bg-[#F8F9FB]"
                  />
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#1E40AF] text-white text-sm font-semibold">Search</button>
                </div>
              </form>
              {searchQ.trim() && (
                <div className="mt-2 bg-white rounded-xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 14px 36px rgba(30,64,175,0.16)" }}>
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[#6b7280]">No products match “{searchQ}”.</p>
                  ) : results.map(p => (
                    <button key={p.id} onClick={() => { navigate(`/product/${p.id}`); setSearchOpen(false); setSearchQ(""); }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#F8F9FB] transition-colors border-b border-gray-50 last:border-0">
                      <ProductImage src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111827] truncate">{p.name}</p>
                        <p className="text-xs text-[#6b7280] truncate">{p.subcategory}{p.sellerStore ? ` · ${p.sellerStore}` : ""}</p>
                      </div>
                      <span className="text-sm font-bold text-[#1E40AF] flex-shrink-0">{fmt(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu — scrolls within itself (the nav is fixed, so without this
            a long category list would extend past the bottom of the screen with
            no way to reach the items below). */}
        {menuOpen && (
          <div className="xl:hidden border-t border-gray-100 bg-white mobile-menu-scroll">
            <div className="px-4 py-3 flex flex-col gap-1">
              <Link to="/" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">Home</Link>
              <Link to="/shop" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">Shop</Link>
              {allCats.map(c => {
                const subs = catTree[c] || [];
                const open = openCat === c;
                return (
                  <div key={c}>
                    <button
                      onClick={() => (subs.length ? setOpenCat(open ? null : c) : navigate(`/shop?cat=${encodeURIComponent(c)}`))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors flex items-center justify-between">
                      <span>{c}</span>
                      {subs.length > 0 && <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />}
                    </button>
                    {open && subs.length > 0 && (
                      <div className="pl-3 ml-2 border-l-2 border-[#EFF6FF] flex flex-col mt-0.5 mb-1">
                        <Link to={`/shop?cat=${encodeURIComponent(c)}`} className="px-3 py-2 rounded-xl text-sm font-semibold text-[#1E40AF] hover:bg-[#EFF6FF] transition-colors">All {c}</Link>
                        {subs.map(s => (
                          <Link key={s} to={`/shop?sub=${encodeURIComponent(s)}`} className="px-3 py-2 rounded-xl text-sm font-medium text-[#374151] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors">{s}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
                <div className="md:hidden px-1 pb-1"><LangToggle full /></div>
                <Link to="/wishlist" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#FFF7ED] hover:text-[#F97316] transition-colors flex items-center gap-2">
                  <Heart size={16} /> Wishlist
                </Link>
                {user && (
                  <Link to="/messages" className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><MessageCircle size={16} /> Messages</span>
                    {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
                  </Link>
                )}
                {user && (user.role === "seller" || user.role === "admin") && (
                  <Link to={user.role === "admin" ? "/admin" : "/seller"} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors flex items-center gap-2">
                    {user.role === "admin" ? <ShieldCheck size={16} /> : <Package size={16} />} {user.role === "admin" ? "Admin" : "Seller Dashboard"}
                  </Link>
                )}
                <Link to={user ? "/account" : "/login"} className="px-3 py-2.5 rounded-xl text-sm font-semibold text-[#111827] hover:bg-[#EFF6FF] hover:text-[#1E40AF] transition-colors flex items-center gap-2">
                  <User size={16} /> {user ? user.name : "Login / Register"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      <div className="h-[100px] sm:h-[104px]" />
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
            <div className="flex items-center gap-2 mb-2">
              <img src={ahmadMartLogo} alt="Ahmad Mart" className="h-10 w-10 object-contain" />
              <div>
                <span className="text-xl font-black text-white">Ahmad</span>
                <span className="text-xl font-black text-[#F97316]">Mart</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#F97316] mb-2">Quality you can trust</p>
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
              {POLICY_LINKS.map(l => (
                <li key={l.id}>
                  <button onClick={() => openPolicyPdf(l.id)} className="text-gray-400 text-sm hover:text-[#F97316] transition-colors text-left">{l.label}</button>
                </li>
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
          <div className="text-center sm:text-left">
            <p className="text-gray-500 text-sm">© 2026 Ahmad Mart. All rights reserved.</p>
            <p className="text-gray-500 text-xs mt-1">Made by <a href="https://linkin.bio/ahmadraza/" target="_blank" rel="noopener noreferrer" className="text-[#F97316] font-semibold hover:underline">Ahmad Raza</a></p>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-xs">We accept:</span>
            <div className="flex gap-2">
              {["JazzCash", "SadaPay", "NayaPay", "Easypaisa", "COD"].map(m => (
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
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className="reveal-up flex items-end justify-between mb-8">
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
  const { products } = useContext(Store);
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      badge: "Trusted Across Pakistan",
      title: "Quality Products at", highlight: "Affordable Prices",
      sub: "Shop premium mobile accessories and beautiful wall clocks with confidence. This store has everything you need!",
      cta: "Shop Now", link: "/shop",
      bg: "from-[#1E40AF] to-[#1e3a8a]",
      img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&h=400&fit=crop&auto=format",
      promise: "Quality Assured",
      features: [
        { icon: ShieldCheck, title: "Verified Quality", sub: "Checked products" },
        { icon: Truck, title: "Fast Delivery", sub: "Across Pakistan" },
        { icon: Headphones, title: "24/7 Support", sub: "Always here to help" },
      ],
    },
    {
      badge: "Best Sound. Ultimate Comfort.",
      title: "Premium Earbuds Starting at", highlight: "Rs. 800",
      sub: "Crystal clear sound with 30 hours of battery life. ANC technology included.",
      cta: "Explore Earbuds", link: "/shop?sub=Earbuds",
      bg: "from-[#1E40AF] to-[#3730a3]",
      img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&h=400&fit=crop&auto=format",
      promise: "1 Year Warranty",
      features: [
        { icon: Zap, title: "Crystal Clear Sound", sub: "High definition audio" },
        { icon: Battery, title: "30 Hours Battery", sub: "Long lasting power" },
        { icon: Wifi, title: "ANC Technology", sub: "Noise cancellation" },
      ],
    },
    {
      badge: "Timeless Designs",
      title: "Beautiful Wall Clocks for Your", highlight: "Home",
      sub: "Silent quartz movement, premium materials, and timeless designs.",
      cta: "Shop Wall Clocks", link: "/shop?sub=Wall Clocks",
      bg: "from-[#92400e] to-[#B45309]",
      img: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=500&h=400&fit=crop&auto=format",
      promise: "Quality Assured",
      features: [
        { icon: Clock, title: "Silent Movement", sub: "Whisper quiet" },
        { icon: Award, title: "Premium Materials", sub: "Built to last" },
        { icon: Package, title: "Easy Mount", sub: "Hook included" },
      ],
    },
  ];

  useEffect(() => {
    const t = setInterval(() => setActiveSlide(s => (s + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  const featured = [
    ...products.filter(p => p.featured),
    ...products.filter(p => !p.featured && (p.badge === "bestseller" || p.badge === "new")),
  ].slice(0, 4);
  const bestsellers = [...products].sort((a, b) => b.reviews - a.reviews).slice(0, 8);
  // One showcase block per category that actually has products — so a brand new
  // category (from any seller) automatically gets its own block here, with no
  // hardcoding needed. Colour themes cycle so the blocks stay visually varied.
  const showcaseCats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  const showcaseThemes = [
    { from: "#EFF6FF", to: "#DBEAFE", shadow: "rgba(30,64,175,0.1)", accent: "#1E40AF" },
    { from: "#FFFBEB", to: "#FEF3C7", shadow: "rgba(180,83,9,0.1)", accent: "#B45309" },
    { from: "#ECFDF5", to: "#D1FAE5", shadow: "rgba(5,150,105,0.1)", accent: "#059669" },
    { from: "#FDF4FF", to: "#FAE8FF", shadow: "rgba(124,58,237,0.1)", accent: "#7C3AED" },
    { from: "#FFF1F2", to: "#FFE4E6", shadow: "rgba(225,29,72,0.1)", accent: "#E11D48" },
  ];

  return (
    <div>
      {/* Hero Slider */}
      <section className="relative overflow-hidden rounded-2xl mx-4 sm:mx-6 lg:mx-8 mb-12"
        style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.18)" }}>
        {slides.map((slide, i) => (
          <div key={i} className={`absolute inset-0 transition-opacity duration-700 ${i === activeSlide ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <div className={`w-full h-full bg-gradient-to-br ${slide.bg} flex flex-col lg:flex-row items-center min-h-[380px] sm:min-h-[470px] relative overflow-hidden`}>
              {/* soft dot texture */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-20" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)", backgroundSize: "16px 16px" }} />
              <div className="flex-1 px-8 sm:px-12 py-9 text-white z-10">
                <span className="inline-block px-4 py-1.5 rounded-full bg-[#F97316] text-white text-xs font-bold mb-4 shadow-lg">{slide.badge}</span>
                <h1 className="text-3xl sm:text-5xl font-black leading-[1.1] mb-4 max-w-xl">{slide.title} <span className="text-[#F97316]">{slide.highlight}</span></h1>
                <p className="text-blue-100 text-sm sm:text-base mb-6 max-w-md">{slide.sub}</p>
                <div className="flex flex-wrap gap-3 mb-7">
                  <button onClick={() => navigate(slide.link)}
                    className="px-6 py-3 rounded-xl bg-[#F97316] text-white font-bold text-sm hover:bg-orange-500 transition-all active:scale-95 inline-flex items-center gap-2"
                    style={{ boxShadow: "0 8px 20px rgba(249,115,22,0.45)" }}>
                    {slide.cta} <ArrowRight size={16} />
                  </button>
                  <button onClick={() => navigate("/shop")}
                    className="px-6 py-3 rounded-xl bg-white/15 text-white font-bold text-sm hover:bg-white/25 transition-all border border-white/30 inline-flex items-center gap-2 backdrop-blur-sm">
                    <SlidersHorizontal size={15} /> Explore Categories
                  </button>
                </div>
                <div className="hidden sm:flex items-center gap-6 flex-wrap">
                  {slide.features.map((f, fi) => (
                    <div key={fi} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0"><f.icon size={16} className="text-white" /></div>
                      <div><p className="text-xs font-bold leading-tight">{f.title}</p><p className="text-[11px] text-blue-200 leading-tight">{f.sub}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <div className={`relative bg-gradient-to-br ${slides[0].bg} min-h-[380px] sm:min-h-[470px] opacity-0 pointer-events-none`} />

        {/* Slide controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setActiveSlide(i)}
              className={`transition-all duration-300 rounded-full ${i === activeSlide ? "w-6 h-2 bg-[#F97316]" : "w-2 h-2 bg-white/50"}`} />
          ))}
        </div>
        <button onClick={() => setActiveSlide(s => (s - 1 + slides.length) % slides.length)}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hidden sm:flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20">
          <ChevronLeft size={18} />
        </button>
        <button onClick={() => setActiveSlide(s => (s + 1) % slides.length)}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hidden sm:flex items-center justify-center text-white hover:bg-white/30 transition-colors z-20">
          <ChevronRight size={18} />
        </button>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Feature bar */}
        <div className="bg-white rounded-2xl mb-6 grid grid-cols-2 lg:grid-cols-4 lg:divide-x divide-gray-100" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          {[
            { icon: Truck, title: "Fast Delivery", sub: "Across Pakistan" },
            { icon: RotateCcw, title: "7 Days Return", sub: "Hassle free returns" },
            { icon: Shield, title: "Secure Payment", sub: "100% secure checkout" },
            { icon: Headphones, title: "24/7 Support", sub: "We're here to help" },
          ].map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3 px-5 py-5">
              <div className="w-11 h-11 rounded-full bg-[#EFF6FF] flex items-center justify-center flex-shrink-0"><Icon size={20} className="text-[#1E40AF]" /></div>
              <div className="min-w-0"><p className="font-bold text-[#111827] text-sm">{title}</p><p className="text-xs text-[#6b7280] truncate">{sub}</p></div>
            </div>
          ))}
        </div>

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
            {products.length === 0 ? <SkeletonGrid count={4} /> : featured.map(p => <ProductCard key={p.id} product={p} />)}
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
            {products.length === 0 ? <SkeletonGrid count={8} /> : bestsellers.slice(0, 8).map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>

        {/* Category Showcases — one block per category, generated automatically */}
        {showcaseCats.length > 0 && (
        <section className="mb-14">
          <div className="grid lg:grid-cols-2 gap-6">
            {showcaseCats.map((cat, i) => {
              const items = products.filter(p => p.category === cat).slice(0, 4);
              if (items.length === 0) return null;
              const theme = showcaseThemes[i % showcaseThemes.length];
              return (
                <div key={cat} className="rounded-2xl p-6"
                  style={{ background: `linear-gradient(to bottom right, ${theme.from}, ${theme.to})`, boxShadow: `0 4px 20px ${theme.shadow}` }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-lg font-black text-[#111827]">{cat}</h3>
                      <p className="text-sm text-[#6b7280]">Top picks in {cat}</p>
                    </div>
                    <Link to={`/shop?cat=${encodeURIComponent(cat)}`} className="text-xs font-bold hover:text-[#F97316] flex items-center gap-1" style={{ color: theme.accent }}>
                      View All <ChevronRight size={13} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {items.map(p => (
                      <Link key={p.id} to={`/product/${p.id}`}
                        className="bg-white rounded-xl p-3 hover:-translate-y-0.5 transition-transform"
                        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                        <ProductImage src={p.image} alt={p.name} className="w-full h-28 object-contain rounded-lg mb-2 bg-white" />
                        <p className="text-xs font-semibold text-[#111827] line-clamp-2 mb-1">{p.name}</p>
                        <p className="text-xs font-bold" style={{ color: theme.accent }}>{fmt(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* Why Choose Us */}
        <section className="mb-14">
          <SectionHeader title="Why Choose Ahmad Mart?" subtitle="We put our customers first, always." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Award, title: "Premium Quality", desc: "Every product is checked for quality and sourced from verified suppliers.", color: "#1E40AF" },
              { icon: TrendingUp, title: "Best Prices", desc: "We offer the most competitive prices in Pakistan with no hidden charges.", color: "#F97316" },
              { icon: Truck, title: "Nationwide Delivery", desc: "Fast, reliable delivery to all cities across Pakistan. Pay by mobile wallet or Cash on Delivery — available nationwide.", color: "#059669" },
              { icon: Shield, title: "Secure Shopping", desc: "Your data and payments are completely safe with strong encryption.", color: "#7C3AED" },
              { icon: RotateCcw, title: "Easy Returns", desc: "Not satisfied? Return within 7 days for an easy, no fuss refund.", color: "#DC2626" },
              { icon: Headphones, title: "24/7 Support", desc: "Our team is always here to help. Reach us anytime on WhatsApp.", color: "#B45309" },
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
        {REVIEWS.length > 0 && (
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
                {r.product && <p className="text-xs text-[#1E40AF] font-semibold">{r.product}</p>}
              </div>
            ))}
          </div>
        </section>
        )}

      </div>
    </div>
  );
}

// ─── Shop Page ────────────────────────────────────────────────────────────────
function ShopPage() {
  const { products, productsLoading } = useContext(Store);
  const [searchParams] = useState(() => new URLSearchParams(window.location.search));
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("cat") || "All");
  const [subcategory, setSubcategory] = useState(searchParams.get("sub") || "All");
  const [sort, setSort] = useState("random");
  // A stable random order for the catalog — reshuffled only when the product
  // list itself changes (new fetch), not on every filter/search keystroke.
  const randomOrder = useMemo(() => shuffled(products), [products]);
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

  // Categories include the built-in ones plus any new ones sellers introduce.
  const cats = ["All", ...Array.from(new Set(["Mobile Accessories", "Home Decoration", "Digital Services", ...products.map(p => p.category)])).filter(Boolean)];
  // Derived purely from live products — a sub-category only shows once a product
  // actually exists in it, so unstocked placeholders never appear as filters.
  const subs = ["All", ...Array.from(new Set(products.map(p => p.subcategory))).filter(Boolean)];

  // Random by default — the same stable shuffle is filtered, so browsing the
  // shop shows every product in a random spread rather than a fixed order.
  let filtered = randomOrder.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.subcategory.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || p.category === category;
    const matchSub = subcategory === "All" || p.subcategory === subcategory;
    // Services use "starting from" / "per month" pricing, so the price slider never hides them.
    const matchPrice = p.isService || (p.price >= minPrice && p.price <= maxPrice);
    return matchSearch && matchCat && matchSub && matchPrice;
  });

  if (sort === "popular") filtered.sort((a, b) => b.reviews - a.reviews);
  else if (sort === "price-asc") filtered.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") filtered.sort((a, b) => b.price - a.price);
  else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);
  else if (sort === "newest") filtered.sort((a, b) => (a.badge === "new" ? -1 : 1));
  // sort === "random" — leave the pre-shuffled order as-is.
  // Admin-featured products are always prioritised (shown first), keeping the
  // chosen sort order within each group. Array.sort is stable.
  filtered.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));

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

            <button onClick={() => { setSearch(""); setCategory("All"); setSubcategory("All"); setSort("random"); setMinPrice(0); setMaxPrice(10000); }}
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
                <option value="random">Random</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
              </select>
            </div>
          </div>
          {productsLoading && products.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <SkeletonGrid count={8} />
            </div>
          ) : filtered.length === 0 ? (
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

// ─── Customer Reviews (write + display, with optional product photo) ──────────
function ReviewSection({ productId }: { productId: number }) {
  const [reviews, setReviews] = useState<UserReview[]>(() => getProductReviews(productId));
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState("");
  const [imageName, setImageName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { setReviews(getProductReviews(productId)); }, [productId]);

  const pickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    const v = validateProofFile(file);
    if (v) { setErr(v); return; }
    try {
      const data = await fileToCompressedDataURL(file);
      setImageData(data); setImageName(file.name); setErr("");
    } catch {
      setErr("Could not read that image. Please try another photo.");
    }
  };

  const submit = async () => {
    if (!name.trim()) { setErr("Please enter your name."); return; }
    if (!rating) { setErr("Please tap the stars to rate this product."); return; }
    if (text.trim().length < 4) { setErr("Please write a few words about the product."); return; }
    setBusy(true);
    const review: UserReview = {
      id: newReviewId(),
      productId,
      name: name.trim(),
      rating,
      text: text.trim(),
      image: imageData || undefined,
      createdAt: Date.now(),
    };
    const ok = saveReview(review);
    setBusy(false);
    if (!ok) { setErr("Could not save your review. The photo may be too large — try a smaller one."); return; }
    setReviews(getProductReviews(productId));
    setName(""); setRating(0); setText(""); setImageData(""); setImageName(""); setErr("");
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Write a review */}
      <div className="rounded-2xl border border-gray-100 bg-[#F8F9FB] p-5">
        <h4 className="font-bold text-[#111827] mb-4">Write a Review</h4>
        {done && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-sm text-emerald-700 font-semibold">
            <CheckCircle size={16} /> Thanks for your review! It's now live below.
          </div>
        )}
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white">
              <span className="text-sm text-[#6b7280] mr-1">Your rating:</span>
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} type="button"
                  onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)} className="transition-transform active:scale-90" aria-label={`${s} star`}>
                  <Star size={20} className={(hover || rating) >= s ? "fill-[#F59E0B] text-[#F59E0B]" : "text-gray-300"} />
                </button>
              ))}
            </div>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            placeholder="Share your experience with this product..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF] resize-none" />

          {/* Photo of received product */}
          {imageData ? (
            <div className="flex items-center gap-3">
              <img src={imageData} alt="Your product" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#111827] truncate max-w-[180px]">{imageName}</p>
                <button onClick={() => { setImageData(""); setImageName(""); }}
                  className="text-xs font-semibold text-red-500 hover:text-red-600">Remove photo</button>
              </div>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 bg-white text-sm font-semibold text-[#374151] cursor-pointer hover:border-[#1E40AF] transition-colors">
              <ZoomIn size={15} className="text-[#1E40AF]" /> Add a photo of your product (optional)
              <input type="file" accept="image/jpeg,image/png" onChange={pickImage} className="hidden" />
            </label>
          )}

          {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
          <button onClick={submit} disabled={busy}
            className="px-6 py-3 rounded-xl bg-[#1E40AF] text-white font-bold text-sm hover:bg-[#1e3a8a] transition-all active:scale-95 disabled:opacity-60"
            style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
            {busy ? "Posting..." : "Submit Review"}
          </button>
        </div>
      </div>

      {/* Customer reviews */}
      {reviews.length > 0 && (
        <div className="space-y-4">
          <p className="font-bold text-[#111827] text-sm">Customer Reviews ({reviews.length})</p>
          {reviews.map(r => (
            <div key={r.id} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E40AF, #F97316)" }}>
                {r.name.trim().slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-[#111827] text-sm">{r.name}</span>
                  <Stars rating={r.rating} size={11} />
                  <span className="text-xs text-[#6b7280]">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-[#374151] text-sm">"{r.text}"</p>
                {r.image && (
                  <img src={r.image} alt="Customer product" className="mt-2 w-24 h-24 rounded-xl object-cover border border-gray-200" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ask the seller (in-app chat starter on a product) ───────────────────────
function AskSeller({ product }: { product: Product }) {
  const { user } = useContext(Store);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  if (!product.sellerId) return null;                       // only seller products
  if (user && user.id === product.sellerId) return null;    // not your own store

  const submit = async () => {
    if (!user) { navigate("/login"); return; }
    if (!body.trim()) return;
    setBusy(true); setErr("");
    try {
      await sendMessage({ productId: product.id, buyerId: user.id, sellerId: product.sellerId!, body: body.trim() });
      setSent(true); setBody("");
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not send your message"); }
    setBusy(false);
  };

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-4">
      {!open ? (
        <button onClick={() => { setOpen(true); setSent(false); }} className="flex items-center gap-2 text-sm font-bold text-[#1E40AF]">
          <MessageCircle size={16} /> Ask {product.sellerStore || "the seller"} a question
        </button>
      ) : sent ? (
        <div className="text-sm">
          <p className="text-emerald-700 font-semibold flex items-center gap-1.5 mb-2"><CheckCircle size={16} /> Message sent!</p>
          <Link to="/messages" className="text-[#1E40AF] font-bold">View conversation in Messages →</Link>
        </div>
      ) : (
        <div>
          <p className="text-sm font-bold text-[#111827] mb-2 flex items-center gap-1.5"><MessageCircle size={15} className="text-[#1E40AF]" /> Ask {product.sellerStore || "the seller"}</p>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="e.g. Is this available in black? Any discount on 2?"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF] resize-none mb-2" />
          {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
          <div className="flex gap-2">
            <button onClick={submit} disabled={busy || !body.trim()} className="px-4 py-2 rounded-xl bg-[#1E40AF] text-white text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"><Send size={14} /> {busy ? "Sending…" : "Send"}</button>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-[#374151] text-sm font-bold">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Product Detail Page ──────────────────────────────────────────────────────
function ProductDetailPage() {
  const { id } = useParams();
  const { products, productsLoading, addToCart, toggleWishlist, inWishlist, addRecentlyViewed } = useContext(Store);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState<"desc" | "specs" | "reviews">("desc");
  const [added, setAdded] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const navigate = useNavigate();

  const product = products.find(p => p.id === Number(id));

  useEffect(() => {
    if (product) {
      addRecentlyViewed(product);
      setActiveImg(0);
      setQty(1);
      setTab("desc");
    }
  }, [id]);

  // While the catalog is still loading (e.g. a deep link opened before the fetch
  // resolves) show a quiet loading state instead of flashing "not found".
  if (!product && productsLoading && products.length === 0) return (
    <div className="max-w-7xl mx-auto px-4 py-32 text-center text-sm text-[#6b7280]">Loading product…</div>
  );
  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <Package size={64} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-2xl text-[#111827] mb-2">Product not found</h2>
      <button onClick={() => navigate("/shop")} className="mt-4 px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Back to Shop</button>
    </div>
  );

  const related = products.filter(p => p.subcategory === product.subcategory && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb — wraps onto a new line for a long product name instead of
          forcing this row wider than the viewport. */}
      <div className="flex items-center flex-wrap gap-2 text-xs text-[#6b7280] mb-6">
        <Link to="/" className="hover:text-[#1E40AF]">Home</Link>
        <ChevronRight size={12} />
        <Link to="/shop" className="hover:text-[#1E40AF]">Shop</Link>
        <ChevronRight size={12} />
        <Link to={`/shop?sub=${product.subcategory}`} className="hover:text-[#1E40AF]">{product.subcategory}</Link>
        <ChevronRight size={12} />
        <span className="text-[#111827] font-semibold break-words">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        {/* Gallery */}
        <div>
          <div className="bg-white rounded-2xl overflow-hidden mb-3 relative group cursor-zoom-in"
            onClick={() => setZoomOpen(true)}
            style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.1)", aspectRatio: "4/5" }}>
            <ProductImage src={product.images[activeImg]} alt={product.name}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
            {product.badge && (
              <div className="absolute top-4 left-4"><Badge type={product.badge} /></div>
            )}
            <div className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/80 flex items-center justify-center"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <ZoomIn size={16} className="text-[#1E40AF]" />
            </div>
          </div>
          {zoomOpen && (
            <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomOpen(false)}>
              <button onClick={() => setZoomOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors">
                <X size={20} />
              </button>
              <ProductImage src={product.images[activeImg]} alt={product.name}
                className="max-w-full max-h-full object-contain" />
            </div>
          )}
          <div className="flex gap-2">
            {product.images.map((img, i) => (
              <button key={i} onClick={() => setActiveImg(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeImg ? "border-[#1E40AF] scale-95" : "border-transparent"}`}
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
                <ProductImage src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-semibold text-[#F97316] mb-2">{product.subcategory}</p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-3 leading-tight break-words">{product.name}</h1>
          {product.sellerStore && (
            <div className="mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#1E40AF] text-xs font-bold">
                <User size={13} /> Sold by {product.sellerStore}
              </div>
              {product.sellerCity && (
                <p className="text-xs text-[#6b7280] mt-1 flex items-center gap-1"><MapPin size={11} className="text-[#F97316]" /> {product.sellerCity}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {!product.isService && product.reviews > 0 && <Stars rating={product.rating} size={16} />}
            {!product.isService && product.reviews > 0 && <span className="text-sm text-[#6b7280]">({product.reviews} reviews)</span>}
            {!product.isService && !!product.sold && <span className="text-sm text-[#6b7280]">{fmtCount(product.sold)} sold</span>}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${product.inStock ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
              {product.inStock ? (product.isService ? "Available" : "In Stock") : "Out of Stock"}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-3xl font-black text-[#1E40AF]">{fmt(product.price)}</span>
            {product.priceNote && <span className="text-base font-semibold text-[#6b7280]">{product.priceNote}</span>}
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

          {/* Qty + Actions / Service contact */}
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
              { icon: Truck, text: "Fast Delivery" },
              { icon: RotateCcw, text: "7 Day Return" },
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
          {(["desc", "specs", "reviews"] as const).filter(t => !(t === "specs" && Object.keys(product.specs).length === 0)).map(t => {
            const labels = { desc: "Description", specs: "Specifications", reviews: `Reviews (${product.reviews + getProductReviews(product.id).length})` };
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
                v ? (
                  <div key={k} className="flex items-center justify-between p-3 bg-[#F8F9FB] rounded-xl">
                    <span className="text-xs font-semibold text-[#6b7280]">{k}</span>
                    <span className="text-xs font-bold text-[#111827]">{v}</span>
                  </div>
                ) : (
                  <div key={k} className="flex items-center gap-2 p-3 bg-[#F8F9FB] rounded-xl sm:col-span-2">
                    <CheckCircle size={14} className="text-[#1E40AF] flex-shrink-0" />
                    <span className="text-xs font-semibold text-[#374151]">{k}</span>
                  </div>
                )
              ))}
            </div>
          )}
          {tab === "reviews" && (
            <div className="space-y-6">
              <ReviewSection productId={product.id} />
              {REVIEWS.length > 0 && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-[#6b7280] uppercase tracking-wide">More customer feedback</p>
                {REVIEWS.slice(0, 3).map(r => (
                  <div key={r.id} className="flex gap-4 p-4 bg-[#F8F9FB] rounded-xl">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #1E40AF, #F97316)" }}>
                      {r.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[#111827] text-sm">{r.name}</span>
                        <span className="text-xs text-[#6b7280]">from {r.city}</span>
                        <Stars rating={r.rating} size={11} />
                      </div>
                      <p className="text-[#374151] text-sm">"{r.text}"</p>
                    </div>
                  </div>
                ))}
              </div>
              )}
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
  const navigate = useNavigate();

  // Delivery is set by each seller (per product), charged once per seller.
  const shipping = computeDelivery(cart);
  const final = cartTotal + shipping;

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
              <ProductImage src={item.image} alt={item.name}
                className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
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
              <div className="flex justify-between text-sm">
                <span className="text-[#6b7280]">Delivery</span>
                <span className="font-semibold">{fmt(shipping)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-[#111827]">
                <span>Total</span><span className="text-[#1E40AF] text-lg">{fmt(final)}</span>
              </div>
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

// ─── Checkout Page (Manual Wallet-Transfer Payment) ───────────────────────────
function CheckoutPage() {
  const { cart, cartTotal, clearCart, user } = useContext(Store);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || "", phone: "", email: user?.email || "", address: "", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [placedOrders, setPlacedOrders] = useState<Order[] | null>(null);
  const [orderBaseId] = useState(newOrderId());
  // Two payment options: mobile wallet transfer (paid via WhatsApp) or Cash on
  // Delivery — both available nationwide. Each seller chooses which of the two
  // (or both) they offer, so what's shown is the intersection across the cart.
  const [payment, setPayment] = useState<"wallet" | "cod">("wallet");
  const isCOD = payment === "cod";
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  // Split-per-seller: group the cart by seller so each store gets its own order
  // routed to that seller's WhatsApp / payment account. Official products group together.
  const groups = useMemo(() => {
    const map = new Map<string, { sellerId?: number; sellerStore?: string; sellerWhatsapp?: string; sellerAccountNumber?: string; sellerAccountTitle?: string; sellerAccountType?: AccountType; sellerPaymentMethods?: PaymentMethods; items: CartItem[] }>();
    for (const it of cart) {
      const key = it.sellerId ? `s${it.sellerId}` : "official";
      let g = map.get(key);
      if (!g) { g = { sellerId: it.sellerId, sellerStore: it.sellerStore, sellerWhatsapp: it.sellerWhatsapp, sellerAccountNumber: it.sellerAccountNumber, sellerAccountTitle: it.sellerAccountTitle, sellerAccountType: it.sellerAccountType, sellerPaymentMethods: it.sellerPaymentMethods, items: [] }; map.set(key, g); }
      g.items.push(it);
    }
    return Array.from(map.values());
  }, [cart]);

  // Which options every store in the cart offers — a method is available only
  // if no store in the cart has excluded it.
  const walletAllowed = groups.every(g => (g.sellerPaymentMethods ?? "both") !== "cod");
  const codAllowed = groups.every(g => (g.sellerPaymentMethods ?? "both") !== "online");
  // If the currently selected method isn't offered, switch to the one that is.
  useEffect(() => {
    if (payment === "wallet" && !walletAllowed && codAllowed) setPayment("cod");
    if (payment === "cod" && !codAllowed && walletAllowed) setPayment("wallet");
  }, [payment, walletAllowed, codAllowed]);

  // The wallet name to show the buyer before submission. If every seller in the
  // cart uses the same wallet, name it directly; otherwise show a generic label
  // since each order's own WhatsApp message will name that seller's exact wallet.
  const walletTypes = Array.from(new Set(groups.map(g => g.sellerAccountType || OFFICIAL_ACCOUNT_TYPE)));
  const walletLabel = walletTypes.length === 1 ? walletTypes[0] : "Mobile Wallet";

  // Delivery is set by each seller (per product). One shipment per seller is
  // charged at the highest delivery charge among that seller's items.
  const groupTotals = (g: { items: CartItem[] }) => {
    const subtotal = g.items.reduce((s, it) => s + it.price * it.qty, 0);
    const groupShipping = g.items.reduce((mx, it) => Math.max(mx, productDelivery(it)), 0);
    return { subtotal, groupShipping, groupTotal: subtotal + groupShipping };
  };
  const grandTotal = groups.reduce((sum, g) => sum + groupTotals(g).groupTotal, 0);
  const totalDelivery = groups.reduce((sum, g) => sum + groupTotals(g).groupShipping, 0);

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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Creates one DB order per seller (tied to the signed-in buyer). Each order is
  // routed to its seller and the customer sends payment proof per store on WhatsApp.
  const handleSubmit = async () => {
    if (submitting) return; // guards against a double-click firing this twice
    if (!validate()) { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (!user) { navigate("/login"); return; }
    setSubmitting(true); setSubmitErr("");
    const created: Order[] = [];
    try {
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const { subtotal, groupShipping, groupTotal } = groupTotals(g);
        const order: Order = {
          id: i === 0 ? orderBaseId : `${orderBaseId}-${i}`,
          createdAt: Date.now(),
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          notes: form.notes.trim() || undefined,
          items: g.items.map(it => ({ id: it.id, name: it.name, qty: it.qty, price: it.price })),
          subtotal,
          shipping: groupShipping,
          total: groupTotal,
          paymentMethod: isCOD ? "Cash on Delivery" : `${g.sellerAccountType || OFFICIAL_ACCOUNT_TYPE} (via WhatsApp)`,
          status: "Pending Approval",
          sellerId: g.sellerId,
          sellerStore: g.sellerStore,
          sellerWhatsapp: g.sellerWhatsapp,
          sellerAccountNumber: g.sellerAccountNumber,
          sellerAccountTitle: g.sellerAccountTitle,
          sellerAccountType: g.sellerAccountType,
        };
        await createOrder(order);
        created.push(order);
      }
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "Could not place your order. Please try again.");
      setSubmitting(false);
      return;
    }
    clearCart();
    setPlacedOrders(created);
    setSubmitting(false);
  };

  if (placedOrders) return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl p-6 sm:p-8" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
        <div className="text-center mb-5">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={38} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-black text-[#111827] mb-2">Order Placed!</h2>
          <p className="text-[#374151] text-sm font-semibold">
            {placedOrders.length > 1
              ? `Your cart had items from ${placedOrders.length} stores, so we created ${placedOrders.length} separate orders. Send each store's WhatsApp message below.`
              : "Your order is saved to your account and awaits approval. Send it on WhatsApp below."}
          </p>
        </div>

        <div className="space-y-3 mb-4">
          {placedOrders.map(o => (
            <div key={o.id} className="rounded-xl border border-gray-100 bg-[#F8F9FB] p-4 text-left">
              <div className="flex items-center justify-between mb-1 gap-2">
                <p className="font-bold text-[#111827] text-sm truncate">{o.sellerStore || "Ahmad Mart"}</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">{o.status}</span>
              </div>
              <p className="text-xs text-[#6b7280] mb-2">Order #{o.id} · {o.items.reduce((s, it) => s + it.qty, 0)} item(s) · <strong className="text-[#1E40AF]">{fmt(o.total)}</strong></p>
              <a href={whatsappOrderUrl(o)} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-bold text-sm transition-transform active:scale-95"
                style={{ background: "#25D366", boxShadow: "0 4px 12px rgba(37,211,102,0.3)" }}>
                <MessageCircle size={16} /> Send to {o.sellerStore || "Ahmad Mart"} on WhatsApp
              </a>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-3 mb-4 text-xs text-green-700 text-left">
          Send the WhatsApp message to each store to complete your payment with the seller. Your order becomes confirmed once the seller or admin approves it.
        </div>

        <button onClick={() => navigate("/account")} className="w-full py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm mb-2" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
          View My Orders
        </button>
        <button onClick={() => navigate("/shop")} className="w-full py-3 border border-gray-200 text-[#374151] rounded-xl font-bold text-sm">
          Continue Shopping
        </button>
      </div>
    </div>
  );

  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <User size={56} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-xl text-[#111827] mb-2">Please sign in to checkout</h2>
      <p className="text-sm text-[#6b7280] mb-6">Your order is saved to your account so you can track its status and the admin can confirm it.</p>
      <button onClick={() => navigate("/login")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm mr-3"
        style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>Sign In</button>
      <button onClick={() => navigate("/register")} className="px-6 py-3 border border-[#1E40AF] text-[#1E40AF] rounded-xl font-bold text-sm">Register</button>
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
            <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2"><Tag size={18} className="text-[#F97316]" /> Delivery & Payment</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {walletAllowed && (
                <button type="button" onClick={() => setPayment("wallet")}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${!isCOD ? "border-[#1E40AF] bg-blue-50/60" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 font-bold text-[#111827] text-sm"><Smartphone size={16} className="text-[#1E40AF]" /> {walletLabel}</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!isCOD ? "border-[#1E40AF] bg-[#1E40AF]" : "border-gray-300"}`} />
                  </div>
                  <p className="text-xs text-[#6b7280]">Pay via {walletLabel} through WhatsApp. Available nationwide.</p>
                </button>
              )}
              {codAllowed && (
                <button type="button" onClick={() => { setPayment("cod"); setPromoMsg(""); }}
                  className={`text-left rounded-xl border-2 p-4 transition-all ${isCOD ? "border-[#059669] bg-emerald-50/60" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 font-bold text-[#111827] text-sm"><Truck size={16} className="text-[#059669]" /> Cash on Delivery</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isCOD ? "border-[#059669] bg-[#059669]" : "border-gray-300"}`} />
                  </div>
                  <p className="text-xs text-[#6b7280]">Pay cash when your order arrives. Available nationwide.</p>
                </button>
              )}
            </div>
            {!(walletAllowed && codAllowed) && (walletAllowed || codAllowed) && (
              <p className="text-xs text-[#6b7280] mt-3">This store accepts <strong className="text-[#374151]">{walletAllowed ? "online payment" : "Cash on Delivery"} only</strong>.</p>
            )}
            {!walletAllowed && !codAllowed && (
              <p className="text-xs text-red-500 font-semibold mt-3">The stores in your cart don't share a common payment option — please order from them separately.</p>
            )}
          </div>

          {/* Method details */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <div className="px-6 py-4 flex items-center gap-3" style={{ background: isCOD ? "linear-gradient(135deg, #059669, #047857)" : "linear-gradient(135deg, #1E40AF, #1e3a8a)" }}>
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                {isCOD ? <Truck size={20} className="text-white" /> : <Smartphone size={20} className="text-white" />}
              </div>
              <div>
                <p className="font-black text-white text-base leading-tight">{isCOD ? "Cash on Delivery" : `Pay via ${walletLabel} on WhatsApp`}</p>
                <p className="text-white/80 text-xs">{isCOD ? "Pay in cash when your order arrives" : `Send your ${walletLabel} payment screenshot on WhatsApp`}</p>
              </div>
            </div>
            <div className="p-6">
              <div className={`rounded-xl border p-4 mb-4 ${isCOD ? "border-emerald-100 bg-emerald-50/60" : "border-blue-100 bg-blue-50/60"}`}>
                <p className={`font-bold text-sm mb-3 ${isCOD ? "text-[#065F46]" : "text-[#1E40AF]"}`}>How it works</p>
                <ol className="space-y-2.5">
                  {(isCOD
                    ? [
                        "Fill in your details, then tap “Place COD Order on WhatsApp”.",
                        "Your order opens in WhatsApp — send it to confirm. We'll dispatch it.",
                        "Pay the exact amount in cash to the rider on delivery.",
                      ]
                    : [
                        "Fill in your details, then tap “Pay via WhatsApp”.",
                        `Your order opens in WhatsApp with the ${walletLabel} number and amount.`,
                        `Send the payment, then attach the ${walletLabel} screenshot in that chat.`,
                        "We verify it and confirm your order on WhatsApp.",
                      ]
                  ).map((text, i) => (
                    <li key={i} className="flex gap-3 text-sm text-[#374151]">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-black flex items-center justify-center ${isCOD ? "bg-[#059669]" : "bg-[#1E40AF]"}`}>{i + 1}</span>
                      <span className="pt-0.5">{text}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="text-[11px] text-[#6b7280] flex items-start gap-1.5">
                <ShieldCheck size={14} className={`flex-shrink-0 mt-0.5 ${isCOD ? "text-[#059669]" : "text-[#1E40AF]"}`} />
                Your order stays <strong>Pending Approval</strong> until confirmed on WhatsApp — {isCOD ? "then becomes Confirmed (COD)." : "then Payment Received after approval."} Nothing is charged automatically.
              </p>
            </div>
          </div>

        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white rounded-2xl p-6 sticky top-24" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.08)" }}>
            <h3 className="font-bold text-[#111827] mb-4">Order Summary</h3>
            {groups.length > 1 && <p className="text-xs text-[#6b7280] -mt-2 mb-3">Your cart has items from {groups.length} stores — a separate order is created for each.</p>}
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {groups.map((g, gi) => {
                const { subtotal, groupShipping, groupTotal } = groupTotals(g);
                return (
                  <div key={gi} className="rounded-xl bg-[#F8F9FB] p-3">
                    <p className="text-xs font-bold text-[#111827] mb-2 flex items-center gap-1.5"><User size={12} className="text-[#1E40AF]" /> {g.sellerStore || "Ahmad Mart"}</p>
                    <div className="space-y-2">
                      {g.items.map(item => (
                        <div key={item.id} className="flex gap-2 items-center">
                          <ProductImage src={item.image} alt={item.name} className="w-9 h-9 object-cover rounded-lg flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#111827] line-clamp-1">{item.name}</p>
                            <p className="text-[11px] text-[#6b7280]">Qty: {item.qty}</p>
                          </div>
                          <span className="text-xs font-bold text-[#1E40AF] flex-shrink-0">{fmt(item.price * item.qty)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-[11px] text-[#6b7280] flex justify-between">
                      <span>Items {fmt(subtotal)} + Delivery {fmt(groupShipping)}</span>
                      <span className="font-bold text-[#111827]">{fmt(groupTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 mb-5 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Subtotal</span><span className="font-semibold">{fmt(cartTotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Delivery {groups.length > 1 ? `(${groups.length} stores)` : ""}</span><span className="font-semibold">{fmt(totalDelivery)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#6b7280]">Payment</span><span className="font-semibold">{isCOD ? "Cash on Delivery" : walletLabel}</span></div>
              <div className="flex justify-between font-black text-[#111827] text-base border-t border-gray-100 pt-2"><span>Total</span><span className="text-[#1E40AF]">{fmt(grandTotal)}</span></div>
            </div>
            <button onClick={handleSubmit} disabled={submitting || (!walletAllowed && !codAllowed)}
              className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "#25D366", boxShadow: "0 4px 16px rgba(37,211,102,0.35)" }}>
              <MessageCircle size={18} /> {submitting ? "Placing order…" : `${isCOD ? "Place COD Order on WhatsApp" : "Pay via WhatsApp"} — ${fmt(grandTotal)}`}
            </button>
            {submitErr && <p className="text-xs text-red-500 font-semibold text-center mt-2">{submitErr}</p>}
            <p className="text-[11px] text-[#6b7280] text-center mt-3">
              {isCOD
                ? "We'll save your order and confirm it on WhatsApp. Cash is collected on delivery."
                : `We'll save your order, then you send your ${walletLabel} payment on WhatsApp for approval.`}
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
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) { setErr("Please fill in all fields"); return; }
    setBusy(true); setErr("");
    try {
      await login(form.email.trim(), form.password);
      navigate("/account");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not sign in. Please try again.");
    }
    setBusy(false);
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
            <button type="submit" disabled={busy}
              className="w-full py-3.5 rounded-xl bg-[#1E40AF] text-white font-black text-sm hover:bg-[#1e3a8a] transition-all active:scale-95 disabled:opacity-60"
              style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
              {busy ? "Signing in…" : "Sign In"}
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
  const { signup } = useContext(Store);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "", role: "buyer" as Role, storeName: "", whatsapp: "", city: "", accountNumber: "", accountTitle: "", accountType: "JazzCash" as AccountType, paymentMethods: "both" as PaymentMethods });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setErr("Please fill in all required fields"); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match"); return; }
    if (form.password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    if (form.role === "seller") {
      if (!form.storeName.trim()) { setErr("Please enter your store name"); return; }
      if (!/^0\d{9,10}$/.test(form.whatsapp.trim())) { setErr("Enter a valid store WhatsApp number (e.g. 03001234567)"); return; }
      if (!form.city.trim()) { setErr("Please enter your city"); return; }
    }
    const seller: SellerSignup | undefined = form.role === "seller"
      ? { storeName: form.storeName.trim(), whatsapp: form.whatsapp.trim(), city: form.city.trim(), accountNumber: form.accountNumber.trim() || undefined, accountTitle: form.accountTitle.trim() || undefined, accountType: form.accountType, paymentMethods: form.paymentMethods }
      : undefined;
    setBusy(true); setErr("");
    try {
      await signup(form.name.trim(), form.email.trim(), form.password, form.role, seller);
      navigate("/account");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create account. Please try again.");
    }
    setBusy(false);
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
                  placeholder="Min. 6 characters"
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
            <div>
              <label className="text-sm font-semibold text-[#374151] mb-1.5 block">I want to join as</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { v: "buyer", t: "Buyer", d: "Shop and order products" },
                  { v: "seller", t: "Seller", d: "List and sell products" },
                ] as const).map(o => (
                  <button key={o.v} type="button" onClick={() => setForm(f => ({ ...f, role: o.v }))}
                    className={`text-left rounded-xl border-2 p-3 transition-all ${form.role === o.v ? "border-[#1E40AF] bg-blue-50/60" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`}>
                    <span className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-[#111827] text-sm">{o.t}</span>
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${form.role === o.v ? "border-[#1E40AF] bg-[#1E40AF]" : "border-gray-300"}`} />
                    </span>
                    <span className="text-xs text-[#6b7280]">{o.d}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6b7280] mt-1.5">You can change this anytime in your profile.</p>
            </div>

            {form.role === "seller" && (
              <div className="space-y-3 rounded-xl bg-[#F8F9FB] border border-gray-100 p-4">
                <p className="text-sm font-bold text-[#111827]">Store details</p>
                <div>
                  <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Store Name *</label>
                  <input type="text" value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                    placeholder="e.g. Bilal Electronics"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Store WhatsApp Number *</label>
                  <input type="tel" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                    placeholder="03001234567"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
                  <p className="text-[11px] text-[#6b7280] mt-1">Buyers check out and contact you on this number.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#374151] mb-1.5 block">City *</label>
                  <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="e.g. Multan"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
                  <p className="text-[11px] text-[#6b7280] mt-1">The city your store ships from.</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Payment Method</label>
                  <select value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value as AccountType }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]">
                    {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <p className="text-[11px] text-[#6b7280] mt-1">Buyers send your payment to this account on WhatsApp.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-semibold text-[#374151] mb-1.5 block">{form.accountType} Number</label>
                    <input type="tel" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                      placeholder="03001234567"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#374151] mb-1.5 block">{form.accountType} Title</label>
                    <input type="text" value={form.accountTitle} onChange={e => setForm(f => ({ ...f, accountTitle: e.target.value }))}
                      placeholder="Account holder name"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#374151] mb-1.5 block">Checkout options for buyers</label>
                  <select value={form.paymentMethods} onChange={e => setForm(f => ({ ...f, paymentMethods: e.target.value as PaymentMethods }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]">
                    <option value="both">Online payment + Cash on Delivery (both)</option>
                    <option value="online">Online payment only</option>
                    <option value="cod">Cash on Delivery only</option>
                  </select>
                  <p className="text-[11px] text-[#6b7280] mt-1">You can change this anytime from your seller dashboard.</p>
                </div>
              </div>
            )}
            {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full py-3.5 rounded-xl bg-[#1E40AF] text-white font-black text-sm hover:bg-[#1e3a8a] transition-all active:scale-95 disabled:opacity-60"
              style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.3)" }}>
              {busy ? "Creating account…" : "Create Account"}
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
  const { user, logout, changeRole, cart, wishlist } = useContext(Store);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"profile" | "orders" | "wishlist">("profile");
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleMsg, setRoleMsg] = useState("");
  const [roleErr, setRoleErr] = useState("");
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  useEffect(() => { if (user) getMyOrders().then(setMyOrders).catch(() => {}); }, [user]);
  const removeOrder = async (o: Order) => {
    if (!window.confirm(`Remove order #${o.id} from your history? This only removes it from your account — the seller keeps their own record.`)) return;
    try { await deleteMyOrder(o.id); setMyOrders(prev => prev.filter(x => x.id !== o.id)); } catch { /* ignore */ }
  };
  const switchRole = async (r: Role) => {
    if (!user || user.role === r) return;
    setRoleBusy(true); setRoleMsg(""); setRoleErr("");
    try { await changeRole(r); setRoleMsg(`You are now registered as a ${r}.`); }
    catch (e) { setRoleErr(e instanceof Error ? e.message : "Could not change role."); }
    setRoleBusy(false);
  };

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
          { label: "Total Orders", value: myOrders.length, icon: Package, color: "#1E40AF" },
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
              <Link to="/messages" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#374151] hover:bg-gray-100 transition-colors">
                <MessageCircle size={15} /> Messages
              </Link>
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
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-1 block">{label}</label>
                    <div className="px-4 py-3 rounded-xl bg-[#F8F9FB] text-sm font-semibold text-[#111827]">{value}</div>
                  </div>
                ))}
                <div>
                  <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-1 block">Account Type</label>
                  <div className="px-4 py-3 rounded-xl bg-[#F8F9FB] text-sm font-semibold text-[#111827] capitalize flex items-center gap-2">
                    {user.role}
                    {user.role === "admin" && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1E40AF] text-white uppercase tracking-wide">Admin</span>}
                  </div>
                </div>

                {user.role === "admin" && (
                  <Link to="/admin" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm"
                    style={{ boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                    <ShieldCheck size={16} /> Go to Admin Dashboard
                  </Link>
                )}
                {user.role === "seller" && (
                  <Link to="/seller" className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm"
                    style={{ boxShadow: "0 4px 12px rgba(30,64,175,0.3)" }}>
                    <Package size={16} /> Go to Seller Dashboard
                  </Link>
                )}
                {user.role !== "admin" && (
                  <div>
                    <label className="text-xs font-bold text-[#6b7280] uppercase tracking-wide mb-1.5 block">Switch Role</label>
                    <div className="grid grid-cols-2 gap-3">
                      {(["buyer", "seller"] as const).map(r => (
                        <button key={r} type="button" onClick={() => switchRole(r)} disabled={roleBusy || user.role === r}
                          className={`rounded-xl border-2 p-3 text-sm font-bold capitalize transition-all disabled:cursor-default ${user.role === r ? "border-[#1E40AF] bg-blue-50/60 text-[#1E40AF]" : "border-gray-200 text-[#374151] hover:border-gray-300"}`}>
                          {r}{user.role === r && " · current"}
                        </button>
                      ))}
                    </div>
                    {roleMsg && <p className="text-xs mt-1.5 font-semibold text-emerald-600">{roleMsg}</p>}
                    {roleErr && <p className="text-xs mt-1.5 font-semibold text-red-500">{roleErr}</p>}
                    <p className="text-[11px] text-[#6b7280] mt-1.5">Buyers shop and order; switch to seller to list your own products. {user.role === "seller" && "Note: switching to buyer hides your seller tools."}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "orders" && (
            <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 14px rgba(30,64,175,0.07)" }}>
              <h3 className="font-bold text-[#111827] mb-5">Order History</h3>
              {myOrders.length === 0 ? (
                <div className="text-center py-10">
                  <Package size={44} className="mx-auto text-gray-300 mb-3" />
                  <p className="font-bold text-[#111827] text-sm mb-1">No orders yet</p>
                  <p className="text-xs text-[#6b7280] mb-4">Your orders will appear here once you place them.</p>
                  <Link to="/shop" className="inline-block px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Start Shopping</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {myOrders.map(o => (
                    <div key={o.id} className="p-4 rounded-xl bg-[#F8F9FB]">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-[#1E40AF] text-sm">#{o.id}</p>
                          <p className="text-xs text-[#6b7280] mt-0.5">{new Date(o.createdAt).toLocaleDateString()} • {o.items.reduce((s, it) => s + it.qty, 0)} item(s) • {o.paymentMethod}</p>
                        </div>
                        <div className="text-right flex-shrink-0 flex items-start gap-2">
                          <div>
                            <p className="font-black text-[#111827] text-sm">{fmt(o.total)}</p>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1" style={{ background: STATUS_STYLE[o.status].bg, color: STATUS_STYLE[o.status].text }}>
                              {o.status}
                            </span>
                          </div>
                          <button onClick={() => removeOrder(o)} title="Remove from my history"
                            className="w-7 h-7 grid place-items-center rounded-lg text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-[#6b7280] truncate">
                        {o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

// ─── Messages (buyer ↔ seller chat) ───────────────────────────────────────────
function MessagesPage() {
  const { user, authReady } = useContext(Store);
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const loadConvos = () => { getConversations().then(setConversations).catch(e => setErr(e instanceof Error ? e.message : "Failed to load messages")); };
  useEffect(() => { if (user) loadConvos(); }, [user]);

  const openThread = async (c: Conversation) => {
    setActive(c); setErr(""); setMessages([]);
    try { setMessages(await getThread(c.productId, c.buyerId, c.sellerId)); loadConvos(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed to open conversation"); }
  };
  const send = async () => {
    if (!active || !body.trim()) return;
    setBusy(true); setErr("");
    try {
      const msg = await sendMessage({ productId: active.productId, buyerId: active.buyerId, sellerId: active.sellerId, body: body.trim() });
      setMessages(prev => [...prev, msg]);
      setBody(""); loadConvos();
    } catch (e) { setErr(e instanceof Error ? e.message : "Could not send message"); }
    setBusy(false);
  };

  if (!authReady) return <div className="max-w-sm mx-auto px-4 py-20 text-center text-sm text-[#6b7280]">Loading…</div>;
  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <MessageCircle size={56} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-xl text-[#111827] mb-2">Sign in to view your messages</h2>
      <button onClick={() => navigate("/login")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm mr-3">Sign In</button>
      <button onClick={() => navigate("/register")} className="px-6 py-3 border border-[#1E40AF] text-[#1E40AF] rounded-xl font-bold text-sm">Register</button>
    </div>
  );

  const other = (c: Conversation) => (user.id === c.buyerId ? (c.sellerStore || "Seller") : c.buyerName);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-black text-[#111827] mb-5 flex items-center gap-2"><MessageCircle size={24} className="text-[#1E40AF]" /> Messages</h1>
      {err && <div className="mb-4 rounded-xl bg-red-50 text-red-600 p-3 text-sm font-semibold">{err}</div>}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Conversation list */}
        <div className={`lg:col-span-1 ${active ? "hidden lg:block" : "block"}`}>
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6b7280]">No conversations yet. Ask a seller a question from any product page.</div>
            ) : conversations.map(c => (
              <button key={`${c.productId}-${c.buyerId}-${c.sellerId}`} onClick={() => openThread(c)}
                className={`w-full text-left flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 transition-colors ${active && active.productId === c.productId && active.buyerId === c.buyerId && active.sellerId === c.sellerId ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                <ProductImage src={c.productImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#111827] truncate">{other(c)}</p>
                  <p className="text-xs text-[#6b7280] truncate">{c.productName}: {c.lastBody}</p>
                </div>
                {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-[#F97316] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">{c.unread}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Active thread */}
        <div className={`lg:col-span-2 ${active ? "block" : "hidden lg:block"}`}>
          {!active ? (
            <div className="bg-white rounded-2xl p-12 text-center text-sm text-[#6b7280] h-full flex items-center justify-center" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
              Select a conversation to read and reply.
            </div>
          ) : (
            <div className="bg-white rounded-2xl flex flex-col" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)", height: "70vh" }}>
              <div className="flex items-center gap-2 p-4 border-b border-gray-100">
                <button onClick={() => setActive(null)} className="lg:hidden text-[#1E40AF]"><ChevronLeft size={20} /></button>
                <ProductImage src={active.productImage} alt="" className="w-9 h-9 rounded-lg object-cover bg-gray-50" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] truncate">{other(active)}</p>
                  <Link to={`/product/${active.productId}`} className="text-xs text-[#6b7280] truncate hover:text-[#1E40AF]">About: {active.productName}</Link>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderId === user.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm ${m.senderId === user.id ? "bg-[#1E40AF] text-white rounded-br-sm" : "bg-[#F1F5F9] text-[#111827] rounded-bl-sm"}`}>
                      {m.body}
                      <span className={`block text-[10px] mt-0.5 ${m.senderId === user.id ? "text-blue-200" : "text-[#9ca3af]"}`}>{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-xs text-[#6b7280] py-6">No messages yet — say hello.</p>}
              </div>
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <input value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Type a message…"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
                <button onClick={send} disabled={busy || !body.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[#1E40AF] text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60">
                  <Send size={15} /> Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Order Verification ────────────────────────────────────────────────
const STATUS_STYLE: Record<OrderStatus, { bg: string; text: string }> = {
  "Pending Approval": { bg: "#FFF7ED", text: "#9A3412" },
  "Payment Received": { bg: "#EFF6FF", text: "#1E40AF" },
  "Confirmed (COD)": { bg: "#ECFEFF", text: "#0E7490" },
  "Shipped": { bg: "#F5F3FF", text: "#6D28D9" },
  "Delivered": { bg: "#ECFDF5", text: "#047857" },
  "Cancelled": { bg: "#FEF2F2", text: "#B91C1C" },
};

// Order card used by the seller's order-management views (active orders and
// delivered history) — buyer details, product list, and the status controls
// used to approve/ship/deliver/cancel.
function OrderCard({ order: o, onSetStatus }: {
  order: Order;
  onSetStatus: (id: string, status: OrderStatus) => void;
}) {
  const approve = () => onSetStatus(o.id, isCashOnDelivery(o) ? "Confirmed (COD)" : "Payment Received");
  return (
    <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
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

          {o.status === "Pending Approval" && (
            <button onClick={approve}
              className="mb-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-black hover:bg-[#047857] transition-colors">
              <CheckCircle size={14} /> Approve order → {isCashOnDelivery(o) ? "Confirmed (COD)" : "Payment Received"}
            </button>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#6b7280]">Update status:</span>
            {ORDER_STATUSES.map(s => (
              <button key={s} onClick={() => onSetStatus(o.id, s)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${o.status === s ? "" : "bg-gray-100 text-[#374151] hover:bg-gray-200"}`}
                style={o.status === s ? { background: STATUS_STYLE[s].bg, color: STATUS_STYLE[s].text, outline: `1.5px solid ${STATUS_STYLE[s].text}` } : undefined}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Analytics dashboard ───────────────────────────────────────────────
function AdminAnalytics({ dbMode }: { dbMode: boolean }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!dbMode) return;
    fetchAnalytics().then(setData).catch(e => setErr(e.message || "Failed to load analytics"));
  }, [dbMode]);
  if (!dbMode) return <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#6b7280]" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>Connect the database (and log in with the admin password) to see analytics.</div>;
  if (err) return <div className="bg-white rounded-2xl p-8 text-center text-sm text-red-500" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>{err}</div>;
  if (!data) return <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#6b7280]">Loading analytics…</div>;
  const t = data.totals;
  const cards = [
    { label: "Total Products", value: t.total },
    { label: "In Stock", value: t.in_stock },
    { label: "Out of Stock", value: t.out_of_stock },
    { label: "Services", value: t.services },
    { label: "On Discount", value: t.discounted },
    { label: "Avg Price", value: fmt(t.avg_price) },
    { label: "Catalog Value", value: fmt(t.inventory_value) },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
            <p className="text-2xl font-black text-[#1E40AF]">{c.value}</p>
            <p className="text-xs font-semibold text-[#6b7280] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        <p className="font-bold text-[#111827] mb-3">Products by Category</p>
        <div className="space-y-2">
          {data.byCategory.map(c => (
            <div key={c.category} className="flex items-center justify-between text-sm">
              <span className="text-[#374151]">{c.category}</span>
              <span className="font-semibold text-[#111827]">{c.count} products · {fmt(c.value)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        <p className="font-bold text-[#111827] mb-3">Products by Sub-Category</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {data.bySubcategory.map(c => (
            <div key={c.subcategory} className="flex items-center justify-between text-sm">
              <span className="text-[#374151]">{c.subcategory}</span>
              <span className="font-semibold text-[#111827]">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Product create / edit form ────────────────────────────────────────
const ADMIN_CATEGORIES = ["Mobile Accessories", "Home Decoration", "Digital Services"];

// Builds an image-proxy URL. The proxy fetches the picture server-side and
// re-serves it with permissive CORS, so it loads even from sites that block
// hotlinking entirely (not just referer-based blocks).
function proxiedImage(url: string): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
}

// Renders any product image so a pasted link "just works", whatever the source
// site's hotlink rules are:
//   1. load the URL directly (fast — local files, Unsplash, referer-friendly hosts);
//   2. if that fails, retry through an image proxy (handles strict hotlink blocks);
//   3. if it still fails, show a neutral placeholder instead of a broken icon.
function ProductImage({ src, alt = "", className = "", style }: { src?: string; alt?: string; className?: string; style?: CSSProperties }) {
  const url = (src ?? "").trim();
  const remote = /^https?:\/\//i.test(url);
  const [stage, setStage] = useState(0); // 0 = direct · 1 = proxy · 2 = failed
  useEffect(() => { setStage(0); }, [url]);

  // No src, all attempts exhausted, or a local path that can't be proxied → placeholder.
  if (!url || stage >= 2 || (stage === 1 && !remote)) {
    return <div className={`${className} grid place-items-center bg-gray-50`} style={style}><ImageOff size={20} className="text-gray-300" /></div>;
  }
  const realSrc = stage === 1 ? proxiedImage(url) : url;
  return (
    <img src={realSrc} alt={alt} className={className} style={style}
      loading="lazy" decoding="async" referrerPolicy="no-referrer"
      onError={() => setStage(s => s + 1)} />
  );
}

// Live image preview for the admin product form. As soon as a URL is pasted the
// real image loads here; a broken/empty URL shows a neutral placeholder. Uses
// the same direct→proxy fallback as ProductImage so previews match the store.
function ImageThumb({ url, main }: { url: string; main?: boolean }) {
  const size = main ? "w-20 h-20" : "w-16 h-16";
  return (
    <div className={`shrink-0 ${size} rounded-xl border ${main ? "border-[#1E40AF]/40" : "border-gray-200"} bg-gray-50 overflow-hidden relative`}>
      <ProductImage src={url} className="w-full h-full object-cover" />
      {main && <span className="absolute bottom-0 inset-x-0 bg-[#1E40AF] text-white text-[9px] font-bold text-center py-0.5 leading-tight z-10">MAIN</span>}
    </div>
  );
}

const MAX_PRODUCT_IMAGES = 6;

function ProductForm({ initial, onSave, onCancel, busy, allowBadge = true }: { initial: Product | null; onSave: (p: Partial<Product>) => void; onCancel: () => void; busy: boolean; allowBadge?: boolean }) {
  const { products } = useContext(Store);
  // Categories offered = the built-in defaults plus every category already in use
  // in the mart, so sellers/admins always pick from what actually exists instead
  // of retyping (and accidentally duplicating with different spelling/casing).
  const allCategories = useMemo(
    () => Array.from(new Set([...ADMIN_CATEGORIES, ...products.map(p => p.category)])).filter(Boolean).sort(),
    [products]
  );
  // Sub-categories are scoped to the selected category — picking a category first
  // narrows the list to sub-categories that already exist under it.
  const subcategoriesForCategory = useCallback(
    (cat: string) => Array.from(new Set(products.filter(p => p.category === cat).map(p => p.subcategory))).filter(Boolean).sort(),
    [products]
  );
  const [addingCategory, setAddingCategory] = useState(() => !!initial?.category && !allCategories.includes(initial.category));
  const [addingSubcategory, setAddingSubcategory] = useState(() => {
    const subs = subcategoriesForCategory(initial?.category ?? "Mobile Accessories");
    if (subs.length === 0) return true; // nothing to pick from yet — just type it in
    if (!initial?.subcategory) return false; // fresh product — show the picker
    return !subs.includes(initial.subcategory); // editing with a value outside the known list
  });
  const [f, setF] = useState(() => ({
    name: initial?.name ?? "",
    price: initial?.price != null ? String(initial.price) : "",
    originalPrice: initial?.originalPrice != null ? String(initial.originalPrice) : "",
    priceNote: initial?.priceNote ?? "",
    deliveryCharge: initial?.deliveryCharge != null ? String(initial.deliveryCharge) : "",
    category: initial?.category ?? "Mobile Accessories",
    subcategory: initial?.subcategory ?? "",
    badge: initial?.badge ?? "",
    inStock: initial?.inStock ?? true,
    // Ticked by default for NEW products (per store owner's preference — orders
    // are handled over WhatsApp); editing an existing product keeps its own value
    // (which the API stores as undefined when false — hence !! rather than ??).
    isService: initial ? !!initial.isService : true,
    description: initial?.description ?? "",
    specs: Object.entries(initial?.specs ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"),
  }));
  // Product images managed as a list: the first item is the main image, the rest
  // are gallery images. Each is added/edited by URL with a live preview.
  const [imgs, setImgs] = useState<string[]>(() => {
    const arr = (initial?.images && initial.images.length)
      ? [...initial.images]
      : (initial?.image ? [initial.image] : []);
    return arr.length ? arr : [""];
  });
  const setImg = (i: number, v: string) => setImgs(prev => prev.map((u, idx) => (idx === i ? v : u)));
  const addImg = () => setImgs(prev => (prev.length < MAX_PRODUCT_IMAGES ? [...prev, ""] : prev));
  const removeImg = (i: number) => setImgs(prev => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  // Upload an image file from the device: compress it to a data URL and store it
  // in that row. The data URL is saved to the database, so it is visible to all.
  const [uploadIdx, setUploadIdx] = useState<number | null>(null);
  const [uploadErr, setUploadErr] = useState("");
  const handleUpload = async (i: number, file: File | undefined) => {
    if (!file) return;
    const verr = validateProofFile(file);
    if (verr) { setUploadErr(verr); return; }
    setUploadErr(""); setUploadIdx(i);
    try {
      const dataUrl = await fileToCompressedDataURL(file, 1000, 0.72);
      setImg(i, dataUrl);
    } catch {
      setUploadErr("Could not process that image. Please try another file.");
    }
    setUploadIdx(null);
  };
  const set = (k: string, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }));
  const [formErr, setFormErr] = useState("");
  const NEW_OPTION = "__new__";
  const onCategorySelect = (v: string) => {
    if (v === NEW_OPTION) {
      setAddingCategory(true);
      set("category", "");
      setAddingSubcategory(true);
      set("subcategory", "");
      return;
    }
    set("category", v);
    // The previous sub-category likely belongs to the old category, so clear it
    // and let the picker offer whatever exists under the newly-chosen one.
    set("subcategory", "");
    setAddingSubcategory(subcategoriesForCategory(v).length === 0);
  };
  const onSubcategorySelect = (v: string) => {
    if (v === NEW_OPTION) { setAddingSubcategory(true); set("subcategory", ""); return; }
    set("subcategory", v);
  };
  const submit = () => {
    if (!f.name.trim()) { setFormErr("Product name is required."); return; }
    if (!f.category.trim()) { setFormErr("Category is required — pick one or add a new one."); return; }
    if (!f.subcategory.trim()) { setFormErr("Sub-category is required — pick one or add a new one."); return; }
    if (!(Number(f.price) > 0)) { setFormErr("Enter a price greater than 0."); return; }
    setFormErr("");
    const images = imgs.map(s => s.trim()).filter(Boolean);
    const image = images[0] || "";
    // Keep every non-empty line. "Key: Value" becomes a labelled spec; a line
    // with no colon is kept as a plain feature so nothing the seller types is lost.
    const specs: Record<string, string> = {};
    f.specs.split("\n").map(l => l.trim()).filter(Boolean).forEach(line => {
      const i = line.indexOf(":");
      if (i > 0) specs[line.slice(0, i).trim()] = line.slice(i + 1).trim();
      else specs[line] = "";
    });
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      name: f.name.trim(),
      price: Number(f.price) || 0,
      originalPrice: f.originalPrice ? Number(f.originalPrice) : undefined,
      priceNote: f.priceNote.trim() || undefined,
      deliveryCharge: f.deliveryCharge.trim() === "" ? null : Math.max(0, Math.round(Number(f.deliveryCharge)) || 0),
      category: f.category.trim(),
      subcategory: f.subcategory.trim(),
      image,
      images: images.length ? images : (image ? [image] : []),
      badge: allowBadge ? ((f.badge || undefined) as Product["badge"]) : undefined,
      inStock: f.inStock,
      isService: f.isService || undefined,
      description: f.description.trim(),
      specs,
      rating: initial?.rating ?? 0,
      reviews: initial?.reviews ?? 0,
    });
  };
  const inp = "w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]";
  return (
    <div className="bg-white rounded-2xl p-5 mb-5" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
      <p className="font-bold text-[#111827] mb-1">{initial ? `Edit: ${initial.name}` : "Add New Product"}</p>
      {/* When the admin opens a seller's product, say whose it is — most often the
          admin is here to correct the category/sub-category the seller picked. */}
      {initial?.sellerStore
        ? <p className="text-xs text-[#6b7280] mb-4">Listed by <span className="font-semibold text-[#374151]">{initial.sellerStore}</span> — your changes (e.g. correcting the category) apply directly to their product.</p>
        : <div className="mb-4" />}
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm sm:col-span-2"><span className="font-semibold text-[#374151] block mb-1">Name</span><input className={inp} value={f.name} onChange={e => set("name", e.target.value)} /></label>
        <label className="text-sm">
          <span className="font-semibold text-[#374151] block mb-1">Category</span>
          {addingCategory ? (
            <div className="flex items-center gap-2">
              <input className={inp} autoFocus value={f.category} onChange={e => set("category", e.target.value)} placeholder="Type new category name" />
              {allCategories.length > 0 && (
                <button type="button" title="Pick from existing categories instead" onClick={() => { setAddingCategory(false); set("category", allCategories[0]); setAddingSubcategory(subcategoriesForCategory(allCategories[0]).length === 0); set("subcategory", ""); }}
                  className="shrink-0 w-9 h-9 grid place-items-center rounded-xl border border-gray-200 text-[#6b7280] hover:bg-gray-50 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <select className={inp} value={f.category} onChange={e => onCategorySelect(e.target.value)}>
              {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value={NEW_OPTION}>+ Add New Category</option>
            </select>
          )}
        </label>
        <label className="text-sm">
          <span className="font-semibold text-[#374151] block mb-1">Sub-Category</span>
          {addingSubcategory ? (
            <div className="flex items-center gap-2">
              <input className={inp} autoFocus value={f.subcategory} onChange={e => set("subcategory", e.target.value)} placeholder="Type new sub-category name" />
              {subcategoriesForCategory(f.category).length > 0 && (
                <button type="button" title="Pick from existing sub-categories instead" onClick={() => { const subs = subcategoriesForCategory(f.category); setAddingSubcategory(false); set("subcategory", subs[0]); }}
                  className="shrink-0 w-9 h-9 grid place-items-center rounded-xl border border-gray-200 text-[#6b7280] hover:bg-gray-50 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <select className={inp} value={f.subcategory} onChange={e => onSubcategorySelect(e.target.value)}>
              {subcategoriesForCategory(f.category).map(s => <option key={s} value={s}>{s}</option>)}
              <option value={NEW_OPTION}>+ Add New Sub-Category</option>
            </select>
          )}
        </label>
        <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Price (Rs.)</span><input className={inp} type="number" value={f.price} onChange={e => set("price", e.target.value)} /></label>
        <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Original Price (optional)</span><input className={inp} type="number" value={f.originalPrice} onChange={e => set("originalPrice", e.target.value)} /></label>
        <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Price Note (e.g. per month)</span><input className={inp} value={f.priceNote} onChange={e => set("priceNote", e.target.value)} /></label>
        <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Delivery Charge (Rs.)</span><input className={inp} type="number" value={f.deliveryCharge} onChange={e => set("deliveryCharge", e.target.value)} placeholder={`Default ${DELIVERY_FEE}`} /></label>
        {allowBadge && <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Badge</span><select className={inp} value={f.badge} onChange={e => set("badge", e.target.value)}><option value="">None</option><option value="new">new</option><option value="sale">sale</option><option value="bestseller">bestseller</option></select></label>}
        <div className="text-sm sm:col-span-2">
          <span className="font-semibold text-[#374151] block mb-1">Product Images</span>
          <p className="text-xs text-[#6b7280] mb-2">Paste an image link <span className="font-semibold">or</span> upload a photo from your device — it loads instantly in the preview and is visible to everyone. The first image is the main one shown on the product. You can add up to {MAX_PRODUCT_IMAGES} images.</p>
          <div className="space-y-2">
            {imgs.map((url, i) => {
              // data: = freshly uploaded this session; /api/product-image = an
              // already-saved upload round-tripping through the edit form.
              const uploaded = url.startsWith("data:") || url.startsWith("/api/product-image");
              return (
                <div key={i} className="flex items-center gap-2">
                  <ImageThumb url={url} main={i === 0} />
                  <input
                    className={inp}
                    value={uploaded ? "Uploaded photo ✓" : url}
                    readOnly={uploaded}
                    onChange={e => setImg(i, e.target.value)}
                    placeholder={i === 0 ? "Main image URL — paste link here" : "Image URL — paste link here"}
                  />
                  <label title="Upload from device"
                    className="shrink-0 w-9 h-9 grid place-items-center rounded-xl border border-gray-200 text-[#1E40AF] hover:bg-[#1E40AF]/5 cursor-pointer transition-colors">
                    {uploadIdx === i ? <span className="text-[10px] font-bold">…</span> : <Upload size={16} />}
                    <input type="file" accept="image/png,image/jpeg" className="hidden"
                      onChange={e => { handleUpload(i, e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  {imgs.length > 1 && (
                    <button type="button" onClick={() => removeImg(i)} title="Remove image"
                      className="shrink-0 w-9 h-9 grid place-items-center rounded-xl border border-gray-200 text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {uploadErr && <p className="text-xs text-red-500 font-semibold mt-1.5">{uploadErr}</p>}
          {imgs.length < MAX_PRODUCT_IMAGES && (
            <button type="button" onClick={addImg}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#1E40AF]/40 text-[#1E40AF] text-sm font-bold hover:bg-[#1E40AF]/5 transition-colors">
              <Plus size={16} /> Add another image
            </button>
          )}
        </div>
        <label className="text-sm sm:col-span-2"><span className="font-semibold text-[#374151] block mb-1">Description</span><textarea className={inp + " resize-none"} rows={3} value={f.description} onChange={e => set("description", e.target.value)} /></label>
        <label className="text-sm sm:col-span-2"><span className="font-semibold text-[#374151] block mb-1">Specifications (one per line — shown on the product page)</span><textarea className={inp + " resize-none"} rows={4} value={f.specs} onChange={e => set("specs", e.target.value)} placeholder={"Battery: 30 hours\nBluetooth: 5.3\nWater resistant\nWarranty: 1 year"} /></label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#374151]"><input type="checkbox" checked={f.inStock} onChange={e => set("inStock", e.target.checked)} /> In stock</label>
        <label className="flex items-center gap-2 text-sm font-semibold text-[#374151]"><input type="checkbox" checked={f.isService} onChange={e => set("isService", e.target.checked)} /> Digital service (WhatsApp contact)</label>
      </div>
      {formErr && <p className="text-xs text-red-500 font-semibold mt-3">{formErr}</p>}
      <div className="flex gap-2 mt-4">
        <button onClick={submit} disabled={busy} className="px-5 py-2.5 rounded-xl bg-[#1E40AF] text-white font-bold text-sm disabled:opacity-60">{busy ? "Saving…" : "Save Product"}</button>
        <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-gray-200 text-[#374151] font-bold text-sm">Cancel</button>
      </div>
    </div>
  );
}

// ─── Admin: Products manager ──────────────────────────────────────────────────
function AdminProducts({ dbMode }: { dbMode: boolean }) {
  const { products, refreshProducts } = useContext(Store);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);

  // Admin-only: rename a category/sub-category across every product using it —
  // fixes a badly named one a seller introduced, for all listings at once.
  const rename = async (type: "category" | "subcategory", from: string) => {
    const to = window.prompt(`Rename ${type === "category" ? "category" : "sub-category"} "${from}" to:`, from);
    if (to == null) return;
    if (!to.trim() || to.trim() === from) return;
    setErr(""); setMsg("");
    try {
      const n = await apiRenameCategory(type, from, to.trim());
      await refreshProducts(true);
      if (filter === from) setFilter(to.trim());
      setMsg(`Renamed "${from}" to "${to.trim()}" on ${n} product${n === 1 ? "" : "s"}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Rename failed"); }
  };
  // Admin-only: delete a category/sub-category — PERMANENTLY deletes every
  // product in it (sellers' included), so the confirm states the exact count.
  const removeCategory = async (type: "category" | "subcategory", name: string) => {
    const count = products.filter(p => (type === "category" ? p.category : p.subcategory) === name).length;
    if (!window.confirm(
      `Delete ${type === "category" ? "category" : "sub-category"} "${name}"?\n\n` +
      `This PERMANENTLY deletes all ${count} product${count === 1 ? "" : "s"} in it — including sellers' products. This cannot be undone.`
    )) return;
    setErr(""); setMsg("");
    try {
      const n = await apiDeleteCategory(type, name);
      await refreshProducts(true);
      if (filter === name) setFilter("All");
      setMsg(`Deleted "${name}" and its ${n} product${n === 1 ? "" : "s"}.`);
    } catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  };
  const formRef = useRef<HTMLDivElement>(null);
  // Jump to the edit form whenever a product is opened, so the admin never has to
  // scroll back up to find it.
  useEffect(() => {
    if (editing !== null) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [editing]);

  const cats = ["All", ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  const q = search.trim().toLowerCase();
  const list = products.filter(p =>
    (filter === "All" || p.category === filter) &&
    (!q
      || p.name.toLowerCase().includes(q)
      || (p.sellerStore || "").toLowerCase().includes(q)
      || (p.sellerCity || "").toLowerCase().includes(q))
  );

  const save = async (p: Partial<Product>) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      if (p.id) await apiUpdateProduct(p); else await apiCreateProduct(p);
      await refreshProducts(true);
      setEditing(null);
      setMsg("Saved.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  };
  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setErr(""); setMsg("");
    try { await apiDeleteProduct(p.id); await refreshProducts(true); setMsg("Deleted."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  };
  const toggleFeatured = async (p: Product) => {
    setErr(""); setMsg("");
    try { await apiSetProductFeatured(p.id, !p.featured); await refreshProducts(true); setMsg(!p.featured ? `Featured "${p.name}".` : `Removed "${p.name}" from featured.`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Could not update featured"); }
  };
  const seed = async () => {
    setBusy(true); setErr(""); setMsg("");
    try { const r = await seedProducts(SEED_PRODUCTS); await refreshProducts(true); setMsg(r.skipped ? (r.message || "Already seeded.") : `Seeded ${r.seeded} products.`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Seed failed"); }
    setBusy(false);
  };

  return (
    <div>
      {!dbMode && <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Read-only mode — the database API isn't connected, so changes can't be saved. Set <strong>DATABASE_URL</strong> and <strong>ADMIN_PASSWORD</strong> in Vercel and log in with the admin password to edit.</div>}
      {(msg || err) && <div className={`mb-4 rounded-xl p-3 text-sm font-semibold ${err ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{err || msg}</div>}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search product, store or city…"
              className="w-64 max-w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1E40AF]" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold outline-none focus:border-[#1E40AF]">
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {dbMode && <button onClick={() => setRenameOpen(o => !o)} className={`px-4 py-2 rounded-xl border text-sm font-bold transition-colors ${renameOpen ? "border-[#1E40AF] text-[#1E40AF] bg-blue-50" : "border-gray-200 text-[#374151] hover:border-[#1E40AF]"}`}>Edit categories</button>}
          {dbMode && <button onClick={seed} disabled={busy} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-[#374151] hover:border-[#1E40AF] disabled:opacity-60">Seed database</button>}
          {dbMode && <button onClick={() => setEditing("new")} className="px-4 py-2 rounded-xl bg-[#1E40AF] text-white text-sm font-bold flex items-center gap-1.5"><Plus size={15} /> Add Product</button>}
        </div>
      </div>

      {/* Category / sub-category rename panel — admin fixes a badly named
          category a seller introduced, across every product at once. */}
      {renameOpen && dbMode && (
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <p className="font-bold text-[#111827] text-sm mb-1">Rename or delete categories &amp; sub-categories</p>
          <p className="text-xs text-[#6b7280] mb-4">Renaming changes it on <strong>every product</strong> that uses it — including sellers' products. Deleting removes the category <strong>and permanently deletes all of its products</strong>, so it always asks for confirmation first.</p>
          <div className="space-y-3">
            {Array.from(new Set(products.map(p => p.category))).filter(Boolean).map(cat => {
              const subs = Array.from(new Set(products.filter(p => p.category === cat).map(p => p.subcategory))).filter(Boolean);
              return (
                <div key={cat} className="rounded-xl bg-[#F8F9FB] p-3">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-sm font-bold text-[#111827]">{cat}</span>
                    <button onClick={() => rename("category", cat)} title={`Rename "${cat}"`}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 transition-colors">Rename</button>
                    <button onClick={() => removeCategory("category", cat)} title={`Delete "${cat}" and all its products`}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">Delete</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subs.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-[#374151]">
                        {s}
                        <button onClick={() => rename("subcategory", s)} title={`Rename "${s}"`}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#1E40AF] hover:bg-blue-50 transition-colors">Rename</button>
                        <button onClick={() => removeCategory("subcategory", s)} title={`Delete "${s}" and all its products`}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-red-600 hover:bg-red-50 transition-colors">Delete</button>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing !== null && dbMode && (
        <div ref={formRef}>
          <ProductForm initial={editing === "new" ? null : editing} busy={busy} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        {list.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7280]">No products in this category.</div>
        ) : list.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0">
            <ProductImage src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#111827] truncate flex items-center gap-1.5">{p.name}{p.featured && <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#F97316] bg-orange-50 px-1.5 py-0.5 rounded-full flex-shrink-0"><Star size={9} className="fill-[#F97316]" /> Featured</span>}</p>
              <p className="text-xs text-[#6b7280]">{p.category} · {p.subcategory} · {fmt(p.price)}{p.priceNote ? ` ${p.priceNote}` : ""}{!p.inStock && <span className="text-red-500 font-semibold"> · Out of stock</span>}{p.sellerStore ? ` · ${p.sellerStore}` : ""}{p.sellerCity ? ` (${p.sellerCity})` : ""}</p>
            </div>
            {dbMode && (
              <button onClick={() => toggleFeatured(p)} title={p.featured ? "Remove from featured" : "Feature this product"}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${p.featured ? "text-[#F97316] bg-orange-50 hover:bg-orange-100" : "text-[#6b7280] hover:bg-gray-100"}`}>
                <Star size={13} className={p.featured ? "fill-[#F97316]" : ""} /> {p.featured ? "Featured" : "Feature"}
              </button>
            )}
            {dbMode && <button onClick={() => setEditing(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E40AF] hover:bg-blue-50">Edit</button>}
            {dbMode && <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50">Delete</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Admin: Sellers ───────────────────────────────────────────────────────────
// Shared sales-analytics display: week/month/total cards + a daily breakdown
// table (last 30 Pakistan-days). Used by the seller dashboard and the admin's
// per-seller view so both show identical numbers.
function SalesAnalyticsView({ data }: { data: SalesAnalytics }) {
  const cards = [
    { label: "This Week", value: fmt(data.week.sales), sub: `${data.week.orders} orders`, color: "#1E40AF" },
    { label: "This Month", value: fmt(data.month.sales), sub: `${data.month.orders} orders`, color: "#1E40AF" },
    { label: "Total Earnings", value: fmt(data.totals.sales), sub: `${data.totals.orders} approved`, color: "#059669" },
    { label: "Orders Placed", value: String(data.totals.ordersPlaced), sub: "all time", color: "#374151" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-xl font-black" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs font-semibold text-[#111827] mt-0.5">{c.label}</p>
            <p className="text-[11px] text-[#6b7280]">{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={15} className="text-[#1E40AF]" />
          <p className="text-sm font-bold text-[#111827]">Daily sales — last 30 days (Pakistan time)</p>
        </div>
        {data.daily.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#6b7280]">No sales recorded yet.</div>
        ) : (
          <div>
            <div className="grid grid-cols-3 px-4 py-2 text-[11px] font-bold text-[#6b7280] uppercase tracking-wide bg-gray-50/70">
              <span>Date</span><span className="text-center">Orders</span><span className="text-right">Sales</span>
            </div>
            {data.daily.map(d => (
              <div key={d.day} className="grid grid-cols-3 px-4 py-2.5 text-sm items-center border-t border-gray-50">
                <span className="font-semibold text-[#374151]">{fmtPKDay(d.day)}</span>
                <span className="text-center text-[#6b7280]">{d.orders}</span>
                <span className="text-right font-bold text-[#059669]">{fmt(d.sales)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Confirmation modal shown before an admin permanently deletes a seller.
function DeleteSellerModal({ seller, busy, onCancel, onConfirm }: { seller: SellerSummary; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3 text-red-600">
          <Trash2 size={20} />
          <h3 className="font-black text-lg">Delete this seller?</h3>
        </div>
        <p className="text-sm text-[#374151] mb-3">
          You are about to permanently delete <span className="font-bold">{seller.storeName || seller.name}</span> ({seller.email}).
        </p>
        <p className="text-sm text-[#6b7280] mb-5">
          This erases the seller and <span className="font-bold">all of their data</span> from the database — their{" "}
          <span className="font-bold">{seller.productCount} products</span>,{" "}
          <span className="font-bold">{seller.orderCount} orders</span>, sales/earnings records, and chat messages.
          This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button onClick={onConfirm} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 disabled:opacity-60 transition-colors">
            {busy ? "Deleting…" : "Yes, delete everything"}
          </button>
          <button onClick={onCancel} disabled={busy} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[#374151] font-bold text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// One seller in the admin list: summary + join date, with an expandable sales
// analytics panel (with a "since date" filter) and a delete action.
function AdminSellerRow({ seller, onChanged }: { seller: SellerSummary; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<SellerDetail | null>(null);
  const [from, setFrom] = useState("");
  const [loadingD, setLoadingD] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [rowErr, setRowErr] = useState("");

  const loadDetail = (fromDate?: string) => {
    setLoadingD(true); setRowErr("");
    adminGetSellerDetail(seller.id, fromDate || undefined)
      .then(setDetail)
      .catch(e => setRowErr(e instanceof Error ? e.message : "Failed to load analytics"))
      .finally(() => setLoadingD(false));
  };
  const toggle = () => { const next = !open; setOpen(next); if (next && !detail) loadDetail(); };
  const doDelete = async () => {
    setDeleting(true); setRowErr("");
    try { await adminDeleteSeller(seller.id); onChanged(); }
    catch (e) { setRowErr(e instanceof Error ? e.message : "Delete failed"); setDeleting(false); setConfirmDel(false); }
  };
  const doResetEarnings = async () => {
    if (!window.confirm(`Permanently reset ${seller.storeName || seller.name}'s all-time earnings to zero? This cannot be undone.`)) return;
    setResetting(true); setRowErr("");
    try { await adminResetSellerEarnings(seller.id); onChanged(); }
    catch (e) { setRowErr(e instanceof Error ? e.message : "Reset failed"); }
    setResetting(false);
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="p-4 flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <p className="font-bold text-[#111827]">{seller.storeName || "(no store name)"}</p>
          <p className="text-xs text-[#6b7280]">{seller.name} · {seller.email}</p>
          <p className="text-xs text-[#6b7280] mt-1">WhatsApp: <span className="font-semibold text-[#374151]">{seller.whatsapp || "—"}</span> · {seller.accountType || "JazzCash"}: <span className="font-semibold text-[#374151]">{seller.accountNumber || "—"}{seller.accountTitle ? ` (${seller.accountTitle})` : ""}</span></p>
          <p className="text-xs text-[#6b7280] mt-1">Joined Ahmad Mart: <span className="font-semibold text-[#374151]">{fmtPKDate(seller.joinedAt)}</span></p>
        </div>
        <div className="flex gap-4 text-center flex-shrink-0">
          <div><p className="text-lg font-black text-[#111827]">{seller.productCount}</p><p className="text-[11px] text-[#6b7280]">Products</p></div>
          <div><p className="text-lg font-black text-[#111827]">{seller.orderCount}</p><p className="text-[11px] text-[#6b7280]">Orders</p></div>
          <div><p className="text-lg font-black text-[#059669]">{fmt(seller.earnings)}</p><p className="text-[11px] text-[#6b7280]">Earnings</p></div>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        <button onClick={toggle} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E40AF] bg-blue-50 hover:bg-blue-100 inline-flex items-center gap-1">
          <TrendingUp size={13} /> {open ? "Hide analytics" : "View analytics"}
        </button>
        <button onClick={doResetEarnings} disabled={resetting} className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 inline-flex items-center gap-1 disabled:opacity-60">
          <RefreshCw size={13} /> {resetting ? "Resetting…" : "Reset earnings"}
        </button>
        <button onClick={() => setConfirmDel(true)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 inline-flex items-center gap-1">
          <Trash2 size={13} /> Delete seller
        </button>
      </div>
      {open && (
        <div className="px-4 pb-5">
          <div className="bg-gray-50 rounded-xl p-3 mb-3 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-[#374151]">
              Earnings since a date
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="block mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#1E40AF]" />
            </label>
            <button onClick={() => loadDetail(from)} className="px-3 py-2 rounded-lg bg-[#1E40AF] text-white text-xs font-bold">Apply</button>
            {detail?.analytics.since && (
              <div className="text-sm">
                <span className="text-[#6b7280]">Since {fmtPKDate(new Date(`${detail.analytics.since.from}T00:00:00`).getTime())}: </span>
                <span className="font-black text-[#059669]">{fmt(detail.analytics.since.sales)}</span>
                <span className="text-[#6b7280]"> · {detail.analytics.since.ordersPlaced} orders placed ({detail.analytics.since.orders} approved)</span>
              </div>
            )}
          </div>
          {loadingD ? <p className="text-sm text-[#6b7280]">Loading analytics…</p>
            : detail ? <SalesAnalyticsView data={detail.analytics} />
            : <p className="text-sm text-[#6b7280]">No data.</p>}
        </div>
      )}
      {rowErr && <p className="px-4 pb-3 text-xs text-red-500 font-semibold">{rowErr}</p>}
      {confirmDel && <DeleteSellerModal seller={seller} busy={deleting} onCancel={() => setConfirmDel(false)} onConfirm={doDelete} />}
    </div>
  );
}

function AdminSellers() {
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const reload = () => adminGetSellers().then(setSellers).catch(e => setErr(e instanceof Error ? e.message : "Failed to load sellers")).finally(() => setLoaded(true));
  useEffect(() => { reload(); }, []);
  if (err) return <div className="bg-white rounded-2xl p-8 text-center text-sm text-red-500" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>{err}</div>;
  if (!loaded) return <div className="bg-white rounded-2xl p-8 text-center text-sm text-[#6b7280]">Loading sellers…</div>;
  const totalEarnings = sellers.reduce((s, x) => s + x.earnings, 0);
  const totalProducts = sellers.reduce((s, x) => s + x.productCount, 0);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-bold text-[#111827]">Sellers &amp; sales tracking</p>
        <PakistanClock />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sellers", value: String(sellers.length) },
          { label: "Seller Products", value: String(totalProducts) },
          { label: "Seller Earnings", value: fmt(totalEarnings) },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
            <p className="text-2xl font-black text-[#1E40AF]">{c.value}</p>
            <p className="text-xs font-semibold text-[#6b7280] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        {sellers.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7280]">No sellers have signed up yet.</div>
        ) : sellers.map(s => <AdminSellerRow key={s.id} seller={s} onChanged={reload} />)}
      </div>
    </div>
  );
}

function AdminPage() {
  const { user, authReady, login, logout, refreshProducts } = useContext(Store);
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState({ email: "", password: "" });
  const [passErr, setPassErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"products" | "sellers" | "analytics">("products");

  useEffect(() => { if (isAdmin) refreshProducts(); }, [isAdmin]);

  const doLogin = async () => {
    if (!form.email || !form.password) { setPassErr("Enter the admin email and password."); return; }
    setBusy(true); setPassErr("");
    try { await login(form.email.trim(), form.password); }
    catch (e) { setPassErr(e instanceof Error ? e.message : "Login failed."); }
    setBusy(false);
  };

  if (!authReady) return <div className="max-w-sm mx-auto px-4 py-20 text-center text-sm text-[#6b7280]">Loading…</div>;

  if (!isAdmin) return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
        <div className="w-14 h-14 rounded-2xl bg-[#1E40AF] flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-white" />
        </div>
        <h2 className="font-black text-xl text-[#111827] mb-1">Admin Access</h2>
        <p className="text-xs text-[#6b7280] mb-5">{user ? "This account is not an admin. Sign in with the admin email." : "Sign in with the admin email and password."}</p>
        <input type="email" value={form.email} autoFocus placeholder="Admin email"
          onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setPassErr(""); }}
          className="w-full px-4 py-3 rounded-xl border text-sm outline-none mb-2 border-gray-200 bg-gray-50 focus:border-[#1E40AF]" />
        <input type="password" value={form.password} placeholder="Password"
          onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setPassErr(""); }}
          onKeyDown={e => e.key === "Enter" && doLogin()}
          className={`w-full px-4 py-3 rounded-xl border text-sm outline-none mb-2 ${passErr ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50 focus:border-[#1E40AF]"}`} />
        {passErr && <p className="text-xs text-red-500 mb-2">{passErr}</p>}
        <button onClick={doLogin} disabled={busy} className="w-full py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm disabled:opacity-60">{busy ? "Checking…" : "Sign In"}</button>
      </div>
    </div>
  );

  const dbMode = true;
  const tabs = [{ k: "products", label: "Products" }, { k: "sellers", label: "Sellers" }, { k: "analytics", label: "Analytics" }] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] flex items-center gap-2">
            <ShieldCheck size={26} className="text-[#1E40AF]" /> Admin Dashboard
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{dbMode ? "Connected to the database." : "Read-only — database not connected."}</p>
        </div>
        <button onClick={() => logout()} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm font-bold text-[#374151] hover:border-[#1E40AF] transition-colors">
          <Lock size={15} /> Log out
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2.5 text-sm font-bold relative ${tab === t.k ? "text-[#1E40AF]" : "text-[#6b7280] hover:text-[#374151]"}`}>
            {t.label}{tab === t.k && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E40AF]" />}
          </button>
        ))}
      </div>

      {tab === "products" && <AdminProducts dbMode={dbMode} />}
      {tab === "sellers" && <AdminSellers />}
      {tab === "analytics" && <AdminAnalytics dbMode={dbMode} />}
    </div>
  );
}

// ─── Seller Dashboard ─────────────────────────────────────────────────────────
function SellerPage() {
  const { user, authReady, refreshProducts, updateStore } = useContext(Store);
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null | "new">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ storeName: "", whatsapp: "", city: "", accountNumber: "", accountTitle: "", accountType: "JazzCash" as AccountType, paymentMethods: "both" as PaymentMethods });
  const [storeBusy, setStoreBusy] = useState(false);
  const [storeMsg, setStoreMsg] = useState("");
  const [bulkDelivery, setBulkDelivery] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = () => { sellerGetOrders().then(setOrders).catch(() => {}); };
  const setOrderStatus = async (id: string, status: OrderStatus) => {
    // Marking an order Delivered opens a pre-filled WhatsApp message to the buyer —
    // opened synchronously (before the await below) so browsers don't treat it as
    // an unrequested popup.
    if (status === "Delivered") {
      const o = orders.find(o => o.id === id);
      if (o) window.open(whatsappDeliveredUrl(o), "_blank", "noopener,noreferrer");
    }
    try {
      const updated = await sellerUpdateOrderStatus(id, status);
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    } catch { /* ignore — keep current state */ }
  };
  const activeOrders = orders.filter(o => o.status !== "Delivered");
  const deliveredCount = orders.filter(o => o.status === "Delivered").length;

  const openStoreEdit = () => {
    setStoreForm({ storeName: user?.storeName || "", whatsapp: user?.whatsapp || "", city: user?.city || "", accountNumber: user?.accountNumber || "", accountTitle: user?.accountTitle || "", accountType: user?.accountType || "JazzCash", paymentMethods: user?.paymentMethods || "both" });
    setStoreMsg(""); setStoreOpen(true);
  };
  const saveStore = async () => {
    if (!storeForm.storeName.trim()) { setStoreMsg("Store name is required."); return; }
    if (!/^0\d{9,10}$/.test(storeForm.whatsapp.trim())) { setStoreMsg("Enter a valid WhatsApp number (e.g. 03001234567)."); return; }
    if (!storeForm.city.trim()) { setStoreMsg("City is required."); return; }
    setStoreBusy(true); setStoreMsg("");
    try {
      await updateStore({ storeName: storeForm.storeName.trim(), whatsapp: storeForm.whatsapp.trim(), city: storeForm.city.trim(), accountNumber: storeForm.accountNumber.trim() || undefined, accountTitle: storeForm.accountTitle.trim() || undefined, accountType: storeForm.accountType, paymentMethods: storeForm.paymentMethods });
      setStoreOpen(false);
    } catch (e) { setStoreMsg(e instanceof Error ? e.message : "Could not save store details."); }
    setStoreBusy(false);
  };
  const applyBulkDelivery = async () => {
    setBulkBusy(true); setBulkMsg("");
    try {
      const dc = bulkDelivery.trim() === "" ? null : Math.max(0, Math.round(Number(bulkDelivery)) || 0);
      const n = await sellerSetAllDelivery(dc);
      load(); refreshProducts(true);
      setBulkMsg(`Applied${dc == null ? " (default)" : ` Rs. ${dc}`} to ${n} product${n === 1 ? "" : "s"}.`);
    } catch (e) { setBulkMsg(e instanceof Error ? e.message : "Could not update delivery charges."); }
    setBulkBusy(false);
  };

  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const isSeller = !!user && (user.role === "seller" || user.role === "admin");
  const load = () => sellerGetProducts().then(setProducts).catch(e => setErr(e instanceof Error ? e.message : "Failed to load products"));
  useEffect(() => { if (isSeller) { load(); sellerGetAnalytics().then(setAnalytics).catch(() => {}); loadOrders(); } }, [isSeller]);
  const [resetBusy, setResetBusy] = useState(false);
  // Independent of the Delivered Orders page's clear flow — a seller can zero out
  // their earnings at any time, even with no delivered orders currently pending.
  const resetEarnings = async () => {
    if (!window.confirm("Permanently reset your all-time earnings to zero and start fresh? Any delivered orders still in your Past Orders list will also be cleared (download their PDF first if you want a record). This cannot be undone.")) return;
    setResetBusy(true);
    try { await sellerClearHistory(); sellerGetAnalytics().then(setAnalytics).catch(() => {}); loadOrders(); } catch { /* ignore */ }
    setResetBusy(false);
  };
  // When the seller opens the add/edit form, bring it into view — the form sits
  // below the dashboard, so without this the click felt like nothing happened.
  const formRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing !== null) requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [editing]);

  if (!authReady) return <div className="max-w-sm mx-auto px-4 py-20 text-center text-sm text-[#6b7280]">Loading…</div>;
  if (!user) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <User size={56} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-xl text-[#111827] mb-2">Sign in to your seller account</h2>
      <button onClick={() => navigate("/login")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm mr-3">Sign In</button>
      <button onClick={() => navigate("/register")} className="px-6 py-3 border border-[#1E40AF] text-[#1E40AF] rounded-xl font-bold text-sm">Register</button>
    </div>
  );
  if (user.role !== "seller" && user.role !== "admin") return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <Package size={56} className="mx-auto text-gray-300 mb-4" />
      <h2 className="font-black text-xl text-[#111827] mb-2">Become a seller</h2>
      <p className="text-sm text-[#6b7280] mb-6">Switch your account to a seller in your profile to list products.</p>
      <button onClick={() => navigate("/account")} className="px-6 py-3 bg-[#1E40AF] text-white rounded-xl font-bold text-sm">Go to Profile</button>
    </div>
  );

  const save = async (p: Partial<Product>) => {
    setBusy(true); setErr(""); setMsg("");
    try {
      if (p.id) await sellerUpdateProduct(p); else await sellerCreateProduct(p);
      await Promise.all([load(), refreshProducts(true)]);
      setEditing(null); setMsg("Saved.");
    } catch (e) { setErr(e instanceof Error ? e.message : "Save failed"); }
    setBusy(false);
  };
  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    setErr(""); setMsg("");
    try { await sellerDeleteProduct(p.id); load(); refreshProducts(true); setMsg("Deleted."); }
    catch (e) { setErr(e instanceof Error ? e.message : "Delete failed"); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] flex items-center gap-2">
            <Package size={26} className="text-[#1E40AF]" /> {user.storeName || "Seller Dashboard"}
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Manage the products in your store.</p>
        </div>
        <button onClick={() => setEditing("new")} className="px-4 py-2.5 rounded-xl bg-[#1E40AF] text-white text-sm font-bold flex items-center gap-1.5">
          <Plus size={15} /> Add Product
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl p-4" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <p className="text-2xl font-black text-[#1E40AF]">{products.length}</p>
          <p className="text-xs font-semibold text-[#6b7280]">Your Products</p>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:col-span-2 text-sm" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold text-[#6b7280] uppercase tracking-wide">Store contact (used at checkout)</p>
            <button onClick={openStoreEdit} className="text-xs font-bold text-[#1E40AF] hover:underline">Edit</button>
          </div>
          <p className="text-[#374151]">Store: <span className="font-semibold">{user.storeName || "—"}</span></p>
          <p className="text-[#374151]">WhatsApp: <span className="font-semibold">{user.whatsapp || "—"}</span></p>
          <p className="text-[#374151]">City: <span className="font-semibold">{user.city || "—"}</span></p>
          <p className="text-[#374151]">{user.accountType || "JazzCash"}: <span className="font-semibold">{user.accountNumber || "—"}{user.accountTitle ? ` (${user.accountTitle})` : ""}</span></p>
          <p className="text-[#374151]">Checkout: <span className="font-semibold">{user.paymentMethods === "online" ? "Online payment only" : user.paymentMethods === "cod" ? "Cash on Delivery only" : "Online + Cash on Delivery"}</span></p>
        </div>
      </div>

      {/* Sales analytics — week & month by date, in Pakistan time */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div>
            <h2 className="font-black text-[#111827] flex items-center gap-2"><TrendingUp size={18} className="text-[#1E40AF]" /> Your sales analytics</h2>
            {analytics?.joinedAt && <p className="text-xs text-[#6b7280] mt-0.5">You joined Ahmad Mart on <span className="font-semibold text-[#374151]">{fmtPKDate(analytics.joinedAt)}</span></p>}
          </div>
          <div className="flex items-center gap-2">
            <PakistanClock />
            <button onClick={resetEarnings} disabled={resetBusy} title="Permanently reset your all-time earnings to zero"
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-60">
              {resetBusy ? "Working…" : "Reset Earnings"}
            </button>
          </div>
        </div>
        {analytics
          ? <SalesAnalyticsView data={analytics} />
          : <div className="bg-white rounded-2xl p-6 text-center text-sm text-[#6b7280] border border-gray-100">Loading your sales…</div>}
      </div>

      {/* Your orders — approve, mark payment received, ship, deliver or cancel */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-black text-[#111827] flex items-center gap-2"><Truck size={18} className="text-[#1E40AF]" /> Your orders</h2>
          <button onClick={loadOrders} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-[#374151] hover:border-[#1E40AF] transition-colors">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        {activeOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
            <Package size={44} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold text-[#111827] mb-1">No active orders</p>
            <p className="text-sm text-[#6b7280]">Orders placed for your products will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeOrders.map(o => <OrderCard key={o.id} order={o} onSetStatus={setOrderStatus} />)}
          </div>
        )}
      </div>

      {/* Delivered orders move out of the active list automatically and live on
          their own page, so this dashboard doesn't fill up with completed cards. */}
      {deliveredCount > 0 && (
        <Link to="/seller/delivered"
          className="mb-6 flex items-center justify-between gap-3 bg-white rounded-2xl p-4 hover:-translate-y-0.5 transition-transform"
          style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] grid place-items-center flex-shrink-0"><CheckCircle size={18} className="text-[#059669]" /></div>
            <div>
              <p className="font-bold text-[#111827] text-sm">Delivered Orders</p>
              <p className="text-xs text-[#6b7280]">{deliveredCount} order{deliveredCount === 1 ? "" : "s"} · view, download as PDF, or clear</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#6b7280] flex-shrink-0" />
        </Link>
      )}

      {storeOpen && (
        <div className="bg-white rounded-2xl p-5 mb-6" style={{ boxShadow: "0 8px 32px rgba(30,64,175,0.12)" }}>
          <p className="font-bold text-[#111827] mb-1">Edit store details</p>
          <p className="text-xs text-[#6b7280] mb-4">Buyers check out and contact you on this WhatsApp; payments go to this account.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Store Name *</span><input className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.storeName} onChange={e => setStoreForm(f => ({ ...f, storeName: e.target.value }))} /></label>
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Store WhatsApp *</span><input className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.whatsapp} onChange={e => setStoreForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="03001234567" /></label>
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">City *</span><input className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.city} onChange={e => setStoreForm(f => ({ ...f, city: e.target.value }))} placeholder="e.g. Multan" /></label>
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">Payment Method</span>
              <select className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.accountType} onChange={e => setStoreForm(f => ({ ...f, accountType: e.target.value as AccountType }))}>
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">{storeForm.accountType} Number</span><input className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.accountNumber} onChange={e => setStoreForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="03001234567" /></label>
            <label className="text-sm"><span className="font-semibold text-[#374151] block mb-1">{storeForm.accountType} Title</span><input className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.accountTitle} onChange={e => setStoreForm(f => ({ ...f, accountTitle: e.target.value }))} placeholder="Account holder name" /></label>
            <label className="text-sm sm:col-span-2"><span className="font-semibold text-[#374151] block mb-1">Checkout options for buyers</span>
              <select className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" value={storeForm.paymentMethods} onChange={e => setStoreForm(f => ({ ...f, paymentMethods: e.target.value as PaymentMethods }))}>
                <option value="both">Online payment + Cash on Delivery (both)</option>
                <option value="online">Online payment only</option>
                <option value="cod">Cash on Delivery only</option>
              </select>
              <span className="text-[11px] text-[#6b7280] block mt-1">Only the option(s) you choose here are shown to buyers at checkout for your products.</span>
            </label>
          </div>
          {storeMsg && <p className="text-xs text-red-500 font-semibold mt-2">{storeMsg}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={saveStore} disabled={storeBusy} className="px-5 py-2.5 rounded-xl bg-[#1E40AF] text-white font-bold text-sm disabled:opacity-60">{storeBusy ? "Saving…" : "Save store details"}</button>
            <button onClick={() => setStoreOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-[#374151] font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}

      {(msg || err) && <div className={`mb-4 rounded-xl p-3 text-sm font-semibold ${err ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{err || msg}</div>}

      {editing !== null && (
        <div ref={formRef}>
          <ProductForm initial={editing === "new" ? null : editing} busy={busy} onSave={save} onCancel={() => setEditing(null)} allowBadge={false} />
        </div>
      )}

      {/* Bulk delivery charge — your choice */}
      <div className="bg-white rounded-2xl p-4 mb-4" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Truck size={16} className="text-[#1E40AF]" />
          <p className="font-bold text-[#111827] text-sm">Delivery charges (your choice)</p>
        </div>
        <p className="text-xs text-[#6b7280] mb-3">Set one charge for <strong>all</strong> your products at once below, or set a specific charge per product when you add or edit it. Leave blank to use the Ahmad Mart default (Rs. {DELIVERY_FEE}).</p>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" value={bulkDelivery} onChange={e => setBulkDelivery(e.target.value)} placeholder={`Rs. (e.g. ${DELIVERY_FEE})`}
            className="w-44 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-[#1E40AF]" />
          <button onClick={applyBulkDelivery} disabled={bulkBusy}
            className="px-4 py-2 rounded-xl bg-[#1E40AF] text-white text-sm font-bold disabled:opacity-60">{bulkBusy ? "Applying…" : "Apply to all my products"}</button>
          {bulkMsg && <span className="text-xs font-semibold text-emerald-600">{bulkMsg}</span>}
        </div>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
        {products.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6b7280]">You haven't added any products yet. Click <strong>Add Product</strong> to start.</div>
        ) : products.map(p => (
          <div key={p.id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0">
            <ProductImage src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-50 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#111827] truncate">{p.name}</p>
              <p className="text-xs text-[#6b7280]">{p.category} · {p.subcategory} · {fmt(p.price)} · Delivery {fmt(p.deliveryCharge ?? DELIVERY_FEE)}{!p.inStock && <span className="text-red-500 font-semibold"> · Out of stock</span>}</p>
            </div>
            <button onClick={() => setEditing(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#1E40AF] hover:bg-blue-50">Edit</button>
            <button onClick={() => remove(p)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-50">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Seller: Delivered Orders (its own page, so the main dashboard doesn't fill
// up with stacked cards as delivered history grows) ────────────────────────────
function SellerDeliveredOrders() {
  const { user, authReady } = useContext(Store);
  const navigate = useNavigate();
  const isSeller = !!user && (user.role === "seller" || user.role === "admin");
  const [orders, setOrders] = useState<Order[]>([]);
  const [clearBusy, setClearBusy] = useState(false);
  const load = () => { sellerGetOrders().then(setOrders).catch(() => {}); };
  useEffect(() => { if (isSeller) load(); }, [isSeller]);

  const delivered = orders.filter(o => o.status === "Delivered");
  const setOrderStatus = async (id: string, status: OrderStatus) => {
    try {
      const updated = await sellerUpdateOrderStatus(id, status);
      setOrders(prev => prev.map(o => (o.id === id ? updated : o)));
    } catch { /* ignore — keep current state */ }
  };
  const clearHistory = async () => {
    if (delivered.length === 0) return;
    if (!window.confirm(
      `Download ${delivered.length} delivered order${delivered.length === 1 ? "" : "s"} as a PDF (with full order and customer details)?\n\n` +
      `Your all-time earnings and this order history will be permanently removed after downloading — the PDF becomes your only record. This cannot be undone.`
    )) return;
    downloadOrderHistoryPdf(delivered, user?.storeName || "");
    setClearBusy(true);
    try { await sellerClearHistory(); load(); } catch { /* ignore */ }
    setClearBusy(false);
  };

  if (!authReady) return <div className="max-w-sm mx-auto px-4 py-20 text-center text-sm text-[#6b7280]">Loading…</div>;
  if (!isSeller) { navigate("/seller"); return null; }

  const total = delivered.reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/seller" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1E40AF] hover:underline mb-4">
        <ChevronLeft size={16} /> Back to Seller Dashboard
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111827] flex items-center gap-2">
            <CheckCircle size={26} className="text-[#059669]" /> Delivered Orders
          </h1>
          <p className="text-sm text-[#6b7280] mt-0.5">{delivered.length} order{delivered.length === 1 ? "" : "s"} · {fmt(total)} total</p>
        </div>
        <button onClick={clearHistory} disabled={clearBusy || delivered.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E40AF] text-white text-sm font-bold disabled:opacity-60">
          <Download size={15} /> {clearBusy ? "Working…" : "Download PDF & Clear"}
        </button>
      </div>

      {delivered.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-5 text-xs text-amber-800">
          <ShieldCheck size={15} className="flex-shrink-0 mt-0.5" />
          <span>Downloading will permanently remove your all-time earnings and this order history — the PDF (with full order and customer details) becomes your only record. This cannot be undone.</span>
        </div>
      )}

      {delivered.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          <Package size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="font-bold text-[#111827] mb-1">No delivered orders yet</p>
          <p className="text-sm text-[#6b7280]">Orders you mark Delivered will show up here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 4px 16px rgba(30,64,175,0.07)" }}>
          {delivered.map(o => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-3 border-b border-gray-100 last:border-0 text-sm">
              <div className="w-24 flex-shrink-0">
                <p className="font-bold text-[#1E40AF] truncate">#{o.id}</p>
                <p className="text-[11px] text-[#6b7280]">{new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="w-40 flex-shrink-0 min-w-0">
                <p className="font-semibold text-[#111827] truncate">{o.name}</p>
                <a href={`https://wa.me/${toWaNumber(o.phone)}`} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-green-600 inline-flex items-center gap-0.5"><MessageCircle size={10} /> {o.phone}</a>
              </div>
              <div className="flex-1 min-w-[140px] text-[#6b7280] truncate">{o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}</div>
              <div className="w-20 flex-shrink-0 text-right font-bold text-[#111827]">{fmt(o.total)}</div>
              <select value={o.status} onChange={e => setOrderStatus(o.id, e.target.value as OrderStatus)}
                className="flex-shrink-0 text-xs font-bold px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 outline-none focus:border-[#1E40AF]">
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
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
    <div className="min-h-screen bg-[#F8F9FB] overflow-x-hidden" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <ScrollToTop />
      {!isAuth && <Navbar />}
      <main key={location.pathname} className="page-in">
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
          <Route path="/seller" element={<SellerPage />} />
          <Route path="/seller/delivered" element={<SellerDeliveredOrders />} />
          <Route path="/messages" element={<MessagesPage />} />
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
