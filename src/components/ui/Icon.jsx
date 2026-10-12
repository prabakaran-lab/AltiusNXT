import {
  ArrowRight, ArrowUpRight, ArrowLeft, ChevronRight, ChevronDown, Check, CheckCircle2, Download, Calendar, CalendarDays,
  Clock, MapPin, Mail, Search, Menu, X, FileText, LayoutGrid, BarChart3, CircleHelp, ExternalLink, Phone, Send,
  FileSpreadsheet, Image, Database, ScanBarcode, BookOpen, Upload, Sparkles, Network, ShieldCheck, Cog, Zap, ScanSearch, Layers,
  Workflow, Share2, SlidersHorizontal, Plug, Link2, User, Package, Plus, Folder, Flag, Users, Star, ShoppingCart, Globe, Code2,
  IdCard, Ruler, Tag, ListTree, Minus, Pause, Play, RotateCcw, TriangleAlert, Award, Factory, List, AlignLeft, Copy,
} from 'lucide-react'
import './ui.css'

/* One icon library (Lucide) for the whole site. Add new icons to this map; do not inline raw SVG for UI icons. */
const ICONS = {
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'arrow-up-right': ArrowUpRight,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  check: Check,
  'check-circle': CheckCircle2,
  download: Download,
  calendar: Calendar,
  events: CalendarDays,
  clock: Clock,
  pin: MapPin,
  mail: Mail,
  search: Search,
  menu: Menu,
  close: X,
  doc: FileText,
  grid: LayoutGrid,
  chart: BarChart3,
  help: CircleHelp,
  external: ExternalLink,
  phone: Phone,
  send: Send,
  sheet: FileSpreadsheet,
  file: FileText,
  image: Image,
  database: Database,
  barcode: ScanBarcode,
  book: BookOpen,
  upload: Upload,
  sparkles: Sparkles,
  network: Network,
  shield: ShieldCheck,
  settings: Cog,
  zap: Zap,
  scan: ScanSearch,
  layers: Layers,
  workflow: Workflow,
  share: Share2,
  sliders: SlidersHorizontal,
  plug: Plug,
  link: Link2,
  user: User,
  box: Package,
  plus: Plus,
  minus: Minus,
  folder: Folder,
  flag: Flag,
  users: Users,
  star: Star,
  cart: ShoppingCart,
  globe: Globe,
  api: Code2,
  id: IdCard,
  ruler: Ruler,
  tag: Tag,
  tree: ListTree,
  pause: Pause,
  play: Play,
  replay: RotateCcw,
  alert: TriangleAlert,
  award: Award,
  factory: Factory,
  list: List,
  text: AlignLeft,
  copy: Copy,
}

/* size: 16 | 18 | 20 | 24 (default 18). Decorative by default; pass `label` to expose it to assistive tech. */
export default function Icon({ name, size = 18, strokeWidth = 2, label, className = '', ...rest }) {
  const Cmp = ICONS[name]
  if (!Cmp) return null
  return (
    <Cmp
      className={`ui-icon ui-icon-${name}${className ? ` ${className}` : ''}`}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable="false"
      {...rest}
    />
  )
}
