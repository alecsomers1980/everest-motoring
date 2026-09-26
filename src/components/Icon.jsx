import {
    Landmark, ArrowRight, FileText, RefreshCw, Calendar, Phone, Check, CheckCircle2,
    Car, AlertCircle, ChevronDown, SlidersHorizontal, PackageOpen, Fuel, MapPin, Lock,
    Mail, Palette, User, PlayCircle, Clock, Search, Settings, Cog, Gauge, Star,
    CircleCheckBig, BadgeCheck, Award, Menu, X, BookOpen, Users, Wallet,
} from "lucide-react";

// Maps the Material Symbols names this site used to their Lucide equivalents.
// Rendering at size="1em" means the existing `text-*` classes keep controlling
// both size and colour, so call sites did not need to change.
const ICONS = {
    account_balance: Landmark,
    account_balance_wallet: Wallet,
    arrow_forward: ArrowRight,
    article: FileText,
    autorenew: RefreshCw,
    calendar_today: Calendar,
    call: Phone,
    check: Check,
    check_circle: CheckCircle2,
    close: X,
    directions_car: Car,
    error: AlertCircle,
    expand_more: ChevronDown,
    filter_alt: SlidersHorizontal,
    group: Users,
    inventory_2: PackageOpen,
    local_gas_station: Fuel,
    location_on: MapPin,
    lock: Lock,
    mail: Mail,
    menu: Menu,
    menu_book: BookOpen,
    palette: Palette,
    person: User,
    phone: Phone,
    play_circle: PlayCircle,
    refresh: RefreshCw,
    schedule: Clock,
    search: Search,
    settings: Settings,
    settings_input_component: Cog,
    speed: Gauge,
    star: Star,
    task_alt: CircleCheckBig,
    verified: BadgeCheck,
    workspace_premium: Award,
};

export default function Icon({ name, className = "", ...props }) {
    const Glyph = ICONS[name];
    if (!Glyph) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`Icon: unknown name "${name}"`);
        }
        return null;
    }
    return (
        <Glyph
            size="1em"
            aria-hidden="true"
            className={`inline-block shrink-0 align-middle ${className}`}
            {...props}
        />
    );
}
