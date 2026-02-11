import React, { useMemo, useState } from 'react';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n/useTranslation';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Destructure commonly used icons
const {
    ChevronDown,
} = LucideIcons;

/**
 * Emoji to Lucide icon name mapping
 * Comprehensive mapping of emojis to their icon equivalents
 */
const EMOJI_TO_ICON_NAME: Record<string, string> = {
    // Symbols
    "*️⃣": "Asterisk",
    "#️⃣": "Hash",
    "↔️": "ArrowLeftRight",
    "↕️": "ArrowUpDown",
    "↖️": "ArrowUpLeft",
    "↗️": "ArrowUpRight",
    "↘️": "ArrowDownRight",
    "↙️": "ArrowDownLeft",
    "↩️": "CornerDownLeft",
    "↪️": "CornerDownRight",
    "⤴️": "CornerRightUp",
    "⤵️": "CornerRightDown",

    // Time
    "⌚": "Watch",
    "⌛": "Hourglass",
    "⏭️": "SkipForward",
    "⏮️": "SkipBack",
    "⏰": "AlarmClock",
    "⏱️": "Timer",
    "⏱": "Timer",
    "⏲️": "Timer",
    "⏳": "Hourglass",
    "⏸️": "Pause",
    "⏹️": "Square",
    "▶️": "Play",
    "🕐": "Clock",

    // Weather & Nature
    "☀️": "Sun",
    "☁️": "Cloud",
    "☕": "Coffee",
    "☘️": "Clover",
    "☘": "Clover",
    "⛅": "Cloud",
    "⛈️": "CloudLightning",
    "❄️": "Snowflake",
    "🌈": "Rainbow",
    "🌊": "Waves",
    "🌍": "Globe",
    "🌎": "Globe",
    "🌏": "Globe",
    "🌐": "Globe",
    "🌙": "Moon",
    "🌧️": "CloudRain",
    "🌱": "Sprout",
    "🌲": "TreePine",
    "🌳": "TreeDeciduous",
    "🌴": "TreePalm",
    "🌵": "TreePalm",
    "🌶️": "Flame",
    "🌶": "Flame",
    "🌷": "Flower",
    "🌸": "Flower",
    "🌹": "Flower",
    "🌺": "Flower",
    "🌻": "Flower2",
    "🌼": "Flower",
    "🌽": "Wheat",
    "🌾": "Wheat",
    "🌿": "Leaf",
    "🍀": "Clover",
    "🍁": "Leaf",
    "🍂": "Leaf",
    "🍃": "Leaf",

    // Food & Drink
    "🍇": "Grape",
    "🍊": "Citrus",
    "🍋": "Citrus",
    "🍌": "Banana",
    "🍎": "Apple",
    "🍏": "Apple",
    "🍒": "Cherry",
    "🍔": "Sandwich",
    "🍕": "Pizza",
    "🍖": "Drumstick",
    "🍗": "Drumstick",
    "🍘": "Cookie",
    "🍚": "Soup",
    "🍛": "Soup",
    "🍜": "Soup",
    "🍝": "Utensils",
    "🍞": "Sandwich",
    "🍣": "Fish",
    "🍤": "Fish",
    "🍦": "IceCreamCone",
    "🍧": "IceCream",
    "🍨": "IceCream",
    "🍩": "Donut",
    "🍪": "Cookie",
    "🍫": "Candy",
    "🍬": "Candy",
    "🍭": "Lollipop",
    "🍰": "CakeSlice",
    "🍱": "Box",
    "🍲": "Soup",
    "🍳": "EggFried",
    "🍴": "Utensils",
    "🍵": "CupSoda",
    "🍶": "Wine",
    "🍷": "Wine",
    "🍸": "Martini",
    "🍹": "CupSoda",
    "🍺": "Beer",
    "🍻": "Beer",
    "🍼": "Baby",
    "🍾": "Wine",
    "🍿": "Popcorn",
    "🥂": "Wine",
    "🥃": "GlassWater",
    "🥄": "Utensils",
    "🥐": "Croissant",
    "🥑": "Salad",
    "🥒": "Carrot",
    "🥓": "Beef",
    "🥔": "Apple",
    "🥕": "Carrot",
    "🥖": "Sandwich",
    "🥗": "Salad",
    "🥘": "Soup",
    "🥙": "Sandwich",
    "🥚": "Egg",
    "🥛": "Milk",
    "🥜": "Nut",
    "🥞": "Layers",
    "🥟": "Donut",
    "🥠": "Cookie",
    "🥡": "Box",
    "🥢": "Utensils",
    "🥣": "Soup",
    "🥤": "CupSoda",
    "🥦": "TreeDeciduous",
    "🥧": "CakeSlice",
    "🥨": "Donut",
    "🥩": "Beef",
    "🥫": "Package",
    "🥬": "Salad",
    "🥯": "Donut",
    "🧀": "Triangle",
    "🧁": "Cake",
    "🧂": "Pipette",
    "🧃": "Milk",
    "🧇": "Grid3x3",
    "🧈": "Package",
    "🧉": "CupSoda",
    "🧊": "Snowflake",
    "🫖": "Coffee",

    // Celebrations & Activities
    "🎁": "Gift",
    "🎂": "Cake",
    "🎆": "Sparkles",
    "🎇": "Sparkle",
    "🎉": "PartyPopper",
    "🎊": "Sparkles",
    "🎞️": "Film",
    "🎞": "Film",
    "🎤": "Mic",
    "🎥": "Video",
    "🎧": "Headphones",
    "🎨": "Palette",
    "🎪": "Aperture",
    "🎬": "Clapperboard",
    "🎭": "Drama",
    "🎮": "Gamepad2",
    "🎯": "Target",
    "🎲": "Dice6",
    "🎵": "Music",
    "🎶": "Music",
    "🏆": "Trophy",
    "🕹️": "Gamepad2",
    "🕹": "Gamepad2",
    "👾": "Gamepad2",

    // Buildings & Places
    "🏗️": "Construction",
    "🏗": "Construction",
    "🏠": "Home",
    "🏡": "Home",
    "🏢": "Building2",
    "🏥": "Hospital",
    "🏪": "Store",
    "🏫": "School",
    "🏬": "Store",
    "🏭": "Factory",
    "🏛": "Landmark",

    // Animals
    "🐋": "Fish",
    "🐌": "Turtle",
    "🐍": "Worm",
    "🐔": "Egg",
    "🐙": "Squirrel",
    "🐚": "Shell",
    "🐛": "Bug",
    "🐝": "Bug",
    "🐟": "Fish",
    "🐠": "Fish",
    "🐡": "Fish",
    "🐢": "Turtle",
    "🐦": "Bird",
    "🐧": "Bird",
    "🐨": "Cat",
    "🐬": "Fish",
    "🐭": "Rat",
    "🐮": "Beef",
    "🐯": "Cat",
    "🐰": "Rabbit",
    "🐱": "Cat",
    "🐳": "Fish",
    "🐵": "Squirrel",
    "🐶": "Dog",
    "🐷": "PiggyBank",
    "🐸": "Squirrel",
    "🐹": "Rat",
    "🐻": "Squirrel",
    "🐼": "Squirrel",
    "🦀": "Fish",
    "🦁": "Cat",
    "🦅": "Bird",
    "🦆": "Bird",
    "🦈": "Fish",
    "🦉": "Bird",
    "🦊": "Squirrel",
    "🦋": "Bug",
    "🦎": "Worm",
    "🦐": "Fish",
    "🦑": "Squirrel",
    "🦕": "Bone",
    "🦖": "Bone",
    "🦞": "Fish",
    "🦪": "Shell",

    // Hands & Gestures
    "☝️": "ArrowUp",
    "☝": "ArrowUp",
    "✊": "Hand",
    "✋": "Hand",
    "✌️": "Hand",
    "✌": "Hand",
    "👆": "ArrowUp",
    "👇": "ArrowDown",
    "👈": "ArrowLeft",
    "👉": "ArrowRight",
    "👊": "Hand",
    "👋": "Hand",
    "👌": "Hand",
    "👍": "ThumbsUp",
    "👎": "ThumbsDown",
    "👏": "Hand",
    "👐": "Handshake",
    "🖐️": "Hand",
    "🖐": "Hand",
    "🖕": "Hand",
    "🙌": "Hand",
    "🙏": "Hand",
    "🤘": "Hand",
    "🤙": "Phone",
    "🤚": "Hand",
    "🤛": "Hand",
    "🤜": "Hand",
    "🤝": "Handshake",
    "🤞": "Hand",
    "🤟": "Hand",
    "🤲": "Hand",
    "🦾": "Hand",
    "🦿": "Footprints",

    // Faces & Emotions
    "😀": "Smile",
    "😁": "Smile",
    "😂": "Laugh",
    "😃": "Smile",
    "😄": "Smile",
    "😇": "Smile",
    "😈": "Angry",
    "😊": "Smile",
    "😍": "Heart",
    "😎": "Glasses",
    "😘": "Heart",
    "😜": "Smile",
    "😡": "Angry",
    "😢": "Frown",
    "😭": "Frown",
    "😱": "AlertTriangle",
    "😴": "Moon",
    "😵": "CircleOff",
    "😷": "Shield",
    "🙈": "EyeOff",
    "🙉": "VolumeX",
    "🙊": "VolumeX",
    "🤒": "Thermometer",
    "🤔": "HelpCircle",
    "🤕": "Bandage",
    "🤖": "Bot",
    "🤗": "Smile",
    "🤠": "Smile",
    "🤢": "Frown",
    "🤣": "Laugh",
    "🤤": "Droplet",
    "🤥": "AlertCircle",
    "🤧": "Wind",
    "🤪": "Smile",
    "🤫": "VolumeX",
    "🤭": "Smile",
    "🤮": "Frown",
    "🤯": "Zap",
    "🥰": "Heart",
    "🥳": "PartyPopper",
    "🥵": "Flame",
    "🥶": "Snowflake",
    "🥺": "Frown",
    "👻": "Ghost",
    "👿": "Angry",
    "💀": "Skull",
    "☠️": "Skull",
    "☠": "Skull",

    // Objects & Tech
    "⌨️": "Keyboard",
    "⚙️": "Settings",
    "⚛️": "Atom",
    "⚛": "Atom",
    "⚖️": "Scale",
    "⚖": "Scale",
    "⛓️": "Link",
    "✂️": "Scissors",
    "✂": "Scissors",
    "✍️": "Pen",
    "✏️": "Pencil",
    "✏": "Pencil",
    "💉": "Syringe",
    "💊": "Pill",
    "💎": "Gem",
    "💡": "Lightbulb",
    "💧": "Droplet",
    "💪": "TrendingUp",
    "💫": "Sparkles",
    "💬": "MessageCircle",
    "💭": "MessageCircle",
    "💰": "Coins",
    "💳": "CreditCard",
    "💵": "Banknote",
    "💻": "Laptop",
    "💼": "Briefcase",
    "💾": "Save",
    "💿": "Disc",
    "📀": "Disc",
    "📁": "Folder",
    "📂": "FolderOpen",
    "📃": "FileText",
    "📄": "FileText",
    "📅": "Calendar",
    "📆": "CalendarDays",
    "📈": "TrendingUp",
    "📉": "TrendingDown",
    "📊": "BarChart",
    "📋": "ClipboardList",
    "📌": "Pin",
    "📍": "MapPin",
    "📎": "Paperclip",
    "📏": "Ruler",
    "📐": "Triangle",
    "📑": "Files",
    "📘": "Book",
    "📜": "Scroll",
    "📝": "FileEdit",
    "📞": "Phone",
    "📟": "Smartphone",
    "📠": "Printer",
    "📢": "Megaphone",
    "📣": "Megaphone",
    "📤": "Upload",
    "📥": "Download",
    "📦": "Package",
    "📧": "Mail",
    "📨": "Mail",
    "📩": "MailOpen",
    "📪": "Mailbox",
    "📫": "Mailbox",
    "📬": "Mailbox",
    "📭": "Mailbox",
    "📮": "Mailbox",
    "📱": "Smartphone",
    "📲": "Smartphone",
    "📷": "Camera",
    "📸": "Camera",
    "📹": "Video",
    "📺": "Tv",
    "📻": "Radio",
    "📡": "RadioTower",
    "📶": "SignalHigh",
    "🔀": "Shuffle",
    "🔁": "Repeat",
    "🔃": "RefreshCcw",
    "🔄": "RefreshCw",
    "🔋": "Battery",
    "🔌": "Plug",
    "🔍": "Search",
    "🔎": "Search",
    "🔐": "LockKeyhole",
    "🔑": "Key",
    "🔒": "Lock",
    "🔓": "Unlock",
    "🔔": "Bell",
    "🔕": "BellOff",
    "🔗": "Link",
    "🔟": "CircleDot",
    "🔢": "Hash",
    "🔥": "Flame",
    "🔦": "Flashlight",
    "🔧": "Wrench",
    "🔨": "Hammer",
    "🔩": "Bolt",
    "🔬": "Microscope",
    "🕯️": "Flame",
    "🕯": "Flame",
    "🕵️": "UserSearch",
    "🖤": "Heart",
    "🖥️": "Monitor",
    "🖥": "Monitor",
    "🖨️": "Printer",
    "🖱️": "Mouse",
    "🖲️": "Mouse",
    "🖲": "Mouse",
    "🖼️": "Image",
    "🗂️": "Folders",
    "🗃️": "Archive",
    "🗄️": "Archive",
    "🗑": "Trash2",
    "🗓️": "Calendar",
    "🗨️": "MessageSquare",
    "🗺️": "Map",
    "🧠": "Brain",
    "🧨": "Bomb",
    "🧩": "Puzzle",
    "🧪": "FlaskConical",
    "🧬": "Dna",
    "🧭": "Compass",
    "🧱": "BrickWall",
    "🩺": "Stethoscope",
    "🪛": "Wrench",
    "☎": "Phone",
    "🛟": "LifeBuoy",

    // Transport
    "✈️": "Plane",
    "🏃": "Activity",
    "🏍": "Bike",
    "🚀": "Rocket",
    "🚗": "Car",
    "🚌": "Bus",
    "🚎": "Bus",
    "🚕": "Car",
    "🚙": "Car",
    "🚲": "Bike",
    "🚫": "Ban",
    "🚨": "Siren",
    "🛠️": "Settings",
    "🛡️": "Shield",
    "🛸": "Disc",

    // Status & Indicators
    "✅": "CheckCircle",
    "✔️": "Check",
    "✖️": "X",
    "✨": "Sparkles",
    "❌": "X",
    "❓": "HelpCircle",
    "❗": "AlertCircle",
    "❤️": "Heart",
    "💔": "HeartCrack",
    "💙": "Heart",
    "💚": "Heart",
    "💛": "Heart",
    "💜": "Heart",
    "🤍": "Heart",
    "🧡": "Heart",
    "⚠️": "AlertTriangle",
    "⚠": "AlertTriangle",
    "⚡": "Zap",
    "👀": "Eye",
    "👁️": "Eye",
    "👥": "Users",
    "👨‍💼": "Briefcase",
    "🌟": "Sparkles",
    "⭐": "Star",
    "🟦": "Square",

    // Arrows
    "➕": "Plus",
    "➖": "Minus",
    "➗": "Divide",
    "➡️": "ArrowRight",
    "⬅️": "ArrowLeft",
    "⬆️": "ArrowUp",
    "⬇️": "ArrowDown",
    "→": "ArrowRight",
    "←": "ArrowLeft",
    "↑": "ArrowUp",
    "↓": "ArrowDown",

    // Numbers
    "0️⃣": "CircleDot",
    "1️⃣": "CircleDot",
    "2️⃣": "CircleDot",
    "3️⃣": "CircleDot",
    "4️⃣": "CircleDot",
    "5️⃣": "CircleDot",
    "6️⃣": "CircleDot",
    "7️⃣": "CircleDot",
    "8️⃣": "CircleDot",
    "9️⃣": "CircleDot",
};

/**
 * Get Lucide icon component by name
 */
function getIconByName(name: string): LucideIcon | null {
    return (LucideIcons as Record<string, LucideIcon>)[name] || null;
}

/**
 * Icon component that renders a Lucide icon inline
 */
const InlineIcon: React.FC<{ iconName: string }> = ({ iconName }) => {
    const Icon = getIconByName(iconName);
    if (!Icon) return null;
    return <Icon size={14} className="inline-block align-text-bottom mx-0.5 text-primary/80" />;
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

/**
 * Thinking block component - shows AI reasoning as a collapsible toggle
 * Designed to appear above the message bubble with a subtle, elegant appearance
 */
export const ThinkingBlock: React.FC<{ content: string; isComplete: boolean }> = ({ content, isComplete }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-2">
            {/* Toggle button - elegant pill style */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all duration-300 ease-out",
                    "bg-gradient-to-r from-violet-500/5 to-purple-500/5 hover:from-violet-500/10 hover:to-purple-500/10",
                    "border border-violet-500/10 hover:border-violet-500/20",
                    "text-muted-foreground/50 hover:text-muted-foreground/70",
                    isExpanded && "from-violet-500/10 to-purple-500/10 border-violet-500/20"
                )}
            >
                <LucideIcons.Sparkles
                    size={10}
                    className={cn(
                        "transition-all duration-300",
                        isExpanded ? "text-violet-400/60" : "text-violet-400/30 group-hover:text-violet-400/50"
                    )}
                />
                <span className="font-medium tracking-wide">{t('views.chat.reasoning')}</span>
                {!isComplete && (
                    <span className="flex gap-0.5 ml-0.5">
                        <span className="w-1 h-1 bg-violet-400/40 rounded-full animate-pulse" />
                        <span className="w-1 h-1 bg-violet-400/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-violet-400/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                )}
                <ChevronDown
                    size={10}
                    className={cn(
                        "transition-transform duration-300 ease-out ml-0.5",
                        isExpanded ? "rotate-180" : "rotate-0"
                    )}
                />
            </button>

            {/* Expandable content with smooth animation */}
            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isExpanded ? "max-h-64 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                )}
            >
                <div className={cn(
                    "px-3 py-2.5 text-[11px] leading-relaxed",
                    "text-muted-foreground/40 italic",
                    "bg-gradient-to-br from-violet-500/[0.02] to-purple-500/[0.02]",
                    "rounded-lg border border-violet-500/5",
                    "max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-violet-500/10",
                    "whitespace-pre-wrap"
                )}>
                    {content}
                </div>
            </div>
        </div>
    );
};

/**
 * Detect lines that are tool/agent action indicators (not real content).
 */
const TOOL_ACTION_PATTERNS = [
    /^📖\s*Reading:/,
    /^📝\s*Editing:/,
    /^💻\s*Running:/,
    /^🔍\s*Searching:/,
    /^📋\s*(Updating task|Creating task|Listing task)/,
    /^Spawning agent/,
    /^⏱\s/,
    /^✓\s/,
    /^✗\s/,
    /^→\s/,
];

function isToolActionLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;
    return TOOL_ACTION_PATTERNS.some(p => p.test(trimmed));
}

/**
 * Shorten file paths to just the filename for display.
 * e.g. `/Users/foo/project/src/components/App.tsx` -> `App.tsx`
 */
function shortenFilePath(text: string): string {
    // Match paths like `path/to/file.ext` inside backticks or after colons
    return text.replace(/(?:[A-Za-z]:)?(?:[\/\\][\w.\-@]+){2,}[\/\\]([\w.\-@]+)/g, (_match, filename) => filename);
}

/**
 * Tool actions accordion - collapsible block like ThinkingBlock
 */
const ToolActionsBlock: React.FC<{ lines: string[] }> = ({ lines }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = lines.length;

    return (
        <div className="my-1.5">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "group flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all duration-300 ease-out",
                    "bg-gradient-to-r from-cyan-500/5 to-blue-500/5 hover:from-cyan-500/10 hover:to-blue-500/10",
                    "border border-cyan-500/10 hover:border-cyan-500/20",
                    "text-muted-foreground/50 hover:text-muted-foreground/70",
                    isExpanded && "from-cyan-500/10 to-blue-500/10 border-cyan-500/20"
                )}
            >
                <LucideIcons.Wrench
                    size={10}
                    className={cn(
                        "transition-all duration-300",
                        isExpanded ? "text-cyan-400/60" : "text-cyan-400/30 group-hover:text-cyan-400/50"
                    )}
                />
                <span className="font-medium tracking-wide">{count} action{count !== 1 ? 's' : ''}</span>
                <ChevronDown
                    size={10}
                    className={cn(
                        "transition-transform duration-300 ease-out ml-0.5",
                        isExpanded ? "rotate-180" : "rotate-0"
                    )}
                />
            </button>

            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    isExpanded ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                )}
            >
                <div className={cn(
                    "px-3 py-2 text-[11px] leading-relaxed",
                    "text-muted-foreground/40",
                    "bg-gradient-to-br from-cyan-500/[0.02] to-blue-500/[0.02]",
                    "rounded-lg border border-cyan-500/5",
                    "max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/10",
                    "space-y-0.5 font-mono"
                )}>
                    {lines.map((al, idx) => (
                        <div key={idx} className="truncate">{shortenFilePath(al.trim())}</div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/**
 * Simple Markdown renderer for chat messages.
 * Supports: code blocks, inline code, bold, italic, lists, links, tables, thinking blocks
 * Handles incomplete/streaming content gracefully
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
    const rendered = useMemo(() => {
        if (!content) return null;

        // First, extract thinking blocks
        const thinkingRegex = /<(?:antml:)?thinking>([\s\S]*?)(?:<\/(?:antml:)?thinking>|$)/gi;
        const parts: { type: 'text' | 'thinking'; content: string; isComplete: boolean }[] = [];
        let lastIndex = 0;
        let match;

        while ((match = thinkingRegex.exec(content)) !== null) {
            // Add text before thinking block
            if (match.index > lastIndex) {
                parts.push({ type: 'text', content: content.slice(lastIndex, match.index), isComplete: true });
            }
            // Check if thinking block is complete
            const isComplete = match[0].includes('</thinking>') || match[0].includes('</thinking>');
            parts.push({ type: 'thinking', content: match[1].trim(), isComplete });
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push({ type: 'text', content: content.slice(lastIndex), isComplete: true });
        }

        // If no thinking blocks found, process as normal
        if (parts.length === 0) {
            parts.push({ type: 'text', content, isComplete: true });
        }

        return parts.map((part, partIndex) => {
            if (part.type === 'thinking') {
                return <ThinkingBlock key={`thinking-${partIndex}`} content={part.content} isComplete={part.isComplete} />;
            }

            // Process markdown for text parts
            const lines = part.content.split('\n');
        const elements: React.ReactNode[] = [];
        let i = 0;
        let key = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Code block ```
            if (line.startsWith('```')) {
                const lang = line.slice(3).trim();
                const codeLines: string[] = [];
                i++;
                // Collect code lines until closing ``` or end of content
                while (i < lines.length && !lines[i].startsWith('```')) {
                    codeLines.push(lines[i]);
                    i++;
                }
                // Check if code block is complete
                const isComplete = i < lines.length && lines[i].startsWith('```');
                elements.push(
                    <div key={key++} className="my-2 rounded-lg overflow-hidden border border-zinc-700/50 max-w-full">
                        {lang && (
                            <div className="bg-zinc-800/80 text-zinc-400 text-[10px] font-mono px-3 py-1.5 border-b border-zinc-700/50 flex items-center gap-1.5">
                                <LucideIcons.FileCode size={10} className="text-zinc-500" />
                                {lang}
                            </div>
                        )}
                        <pre className="bg-gradient-to-br from-zinc-900 to-zinc-900/95 text-zinc-200 p-3 overflow-x-auto text-xs leading-relaxed max-w-full [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-zinc-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
                            <code className="break-all whitespace-pre-wrap">{codeLines.join('\n')}</code>
                            {!isComplete && <span className="text-zinc-600 animate-pulse">...</span>}
                        </pre>
                    </div>
                );
                if (isComplete) i++;
                continue;
            }

            // Empty line
            if (line.trim() === '') {
                elements.push(<div key={key++} className="h-2" />);
                i++;
                continue;
            }

            // Horizontal rule ---
            if (line.trim().match(/^[-*_]{3,}$/)) {
                elements.push(
                    <hr key={key++} className="my-3 border-border" />
                );
                i++;
                continue;
            }

            // Blockquote >
            if (line.startsWith('> ')) {
                const quoteLines: string[] = [];
                while (i < lines.length && lines[i].startsWith('> ')) {
                    quoteLines.push(lines[i].slice(2));
                    i++;
                }
                elements.push(
                    <blockquote key={key++} className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
                        {quoteLines.map((ql, idx) => (
                            <p key={idx} className="text-sm">{parseInline(ql)}</p>
                        ))}
                    </blockquote>
                );
                continue;
            }

            // Headers (check longer patterns first)
            if (line.startsWith('###### ')) {
                elements.push(
                    <h6 key={key++} className="font-medium text-xs mt-2 mb-1 text-muted-foreground">
                        {parseInline(line.slice(7))}
                    </h6>
                );
                i++;
                continue;
            }
            if (line.startsWith('##### ')) {
                elements.push(
                    <h5 key={key++} className="font-medium text-xs mt-2 mb-1">
                        {parseInline(line.slice(6))}
                    </h5>
                );
                i++;
                continue;
            }
            if (line.startsWith('#### ')) {
                elements.push(
                    <h4 key={key++} className="font-semibold text-sm mt-2 mb-1">
                        {parseInline(line.slice(5))}
                    </h4>
                );
                i++;
                continue;
            }
            if (line.startsWith('### ')) {
                elements.push(
                    <h3 key={key++} className="font-semibold text-sm mt-3 mb-1">
                        {parseInline(line.slice(4))}
                    </h3>
                );
                i++;
                continue;
            }
            if (line.startsWith('## ')) {
                elements.push(
                    <h2 key={key++} className="font-semibold text-base mt-3 mb-1">
                        {parseInline(line.slice(3))}
                    </h2>
                );
                i++;
                continue;
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <h1 key={key++} className="font-bold text-lg mt-3 mb-1">
                        {parseInline(line.slice(2))}
                    </h1>
                );
                i++;
                continue;
            }

            // Unordered list
            if (line.match(/^[\-\*]\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].match(/^[\-\*]\s/)) {
                    listItems.push(lines[i].slice(2));
                    i++;
                }
                elements.push(
                    <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-sm">{parseInline(item)}</li>
                        ))}
                    </ul>
                );
                continue;
            }

            // Numbered list
            if (line.match(/^\d+\.\s/)) {
                const listItems: string[] = [];
                while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
                    listItems.push(lines[i].replace(/^\d+\.\s/, ''));
                    i++;
                }
                elements.push(
                    <ol key={key++} className="list-decimal list-inside my-1 space-y-0.5">
                        {listItems.map((item, idx) => (
                            <li key={idx} className="text-sm">{parseInline(item)}</li>
                        ))}
                    </ol>
                );
                continue;
            }

            // Markdown table (| cell | cell |)
            if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                const tableRows: string[][] = [];
                let hasHeader = false;

                // Collect all table rows
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    const rowContent = lines[i].trim();
                    // Check if this is a separator row (|---|---|)
                    if (rowContent.match(/^\|[\s-:|]+\|$/)) {
                        hasHeader = true;
                        i++;
                        continue;
                    }
                    // Parse cells: split by | and filter empty strings from edges
                    const cells = rowContent.split('|').slice(1, -1).map(cell => cell.trim());
                    tableRows.push(cells);
                    i++;
                }

                if (tableRows.length > 0) {
                    const headerRow = hasHeader ? tableRows[0] : null;
                    const bodyRows = hasHeader ? tableRows.slice(1) : tableRows;

                    elements.push(
                        <div key={key++} className="my-2 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">
                                {headerRow && (
                                    <thead className="bg-muted/50">
                                        <tr>
                                            {headerRow.map((cell, cellIdx) => (
                                                <th key={cellIdx} className="px-3 py-2 text-left font-semibold border-b border-border">
                                                    {parseInline(cell)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                )}
                                <tbody>
                                    {bodyRows.map((row, rowIdx) => (
                                        <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                            {row.map((cell, cellIdx) => (
                                                <td key={cellIdx} className="px-3 py-2 border-b border-border/50">
                                                    {parseInline(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                }
                continue;
            }

            // Tool action lines - render as collapsible accordion
            if (isToolActionLine(line)) {
                const actionLines: string[] = [line];
                i++;
                while (i < lines.length && (isToolActionLine(lines[i]) || lines[i].trim() === '')) {
                    if (lines[i].trim() !== '') actionLines.push(lines[i]);
                    i++;
                }
                elements.push(<ToolActionsBlock key={key++} lines={actionLines} />);
                continue;
            }

            // Regular paragraph
            elements.push(
                <p key={key++} className="text-sm leading-relaxed">
                    {parseInline(line)}
                </p>
            );
            i++;
        }

            return <React.Fragment key={`text-${partIndex}`}>{elements}</React.Fragment>;
        });
    }, [content]);

    return (
        <div className={cn("markdown-content min-w-0 overflow-hidden", className)}>
            {rendered}
        </div>
    );
};

/**
 * Build regex pattern for emoji matching
 */
const EMOJI_PATTERN = new RegExp(
    `(${Object.keys(EMOJI_TO_ICON_NAME).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'g'
);

/**
 * Replace emojis with Lucide icons in text
 */
function replaceEmojisWithIcons(text: string, keyOffset: number): { nodes: React.ReactNode[]; nextKey: number } {
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = keyOffset;
    let match;

    // Reset regex lastIndex
    EMOJI_PATTERN.lastIndex = 0;

    while ((match = EMOJI_PATTERN.exec(text)) !== null) {
        // Add text before the emoji
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        // Add the icon
        const emoji = match[1];
        const iconName = EMOJI_TO_ICON_NAME[emoji];
        if (iconName) {
            nodes.push(<InlineIcon key={`emoji-${key++}`} iconName={iconName} />);
        } else {
            nodes.push(emoji);
        }

        lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return { nodes: nodes.length > 0 ? nodes : [text], nextKey: key };
}

/**
 * Parse inline markdown: bold, italic, code, links, emojis
 * Handles incomplete/streaming content gracefully
 */
function parseInline(text: string): React.ReactNode {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;
    let iterations = 0;
    const maxIterations = text.length * 2; // Safety limit

    while (remaining.length > 0 && iterations < maxIterations) {
        iterations++;

        // Inline code `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            parts.push(
                <code key={key++} className="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono break-all">
                    {shortenFilePath(codeMatch[1])}
                </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // Unclosed inline code - show as-is but styled
        const unclosedCodeMatch = remaining.match(/^`([^`]*)$/);
        if (unclosedCodeMatch) {
            parts.push(
                <code key={key++} className="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">
                    {unclosedCodeMatch[1]}
                </code>
            );
            break;
        }

        // Bold **text**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            const { nodes, nextKey } = replaceEmojisWithIcons(boldMatch[1], key);
            parts.push(<strong key={key++} className="font-semibold">{nodes}</strong>);
            key = nextKey;
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Unclosed bold - show as-is
        const unclosedBoldMatch = remaining.match(/^\*\*([^*]*)$/);
        if (unclosedBoldMatch) {
            const { nodes, nextKey } = replaceEmojisWithIcons(unclosedBoldMatch[1], key);
            parts.push(<strong key={key++} className="font-semibold">{nodes}</strong>);
            key = nextKey;
            break;
        }

        // Italic *text* or _text_
        const italicMatch = remaining.match(/^(\*|_)([^*_]+)\1/);
        if (italicMatch) {
            const { nodes, nextKey } = replaceEmojisWithIcons(italicMatch[2], key);
            parts.push(<em key={key++} className="italic">{nodes}</em>);
            key = nextKey;
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Link [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            const { nodes, nextKey } = replaceEmojisWithIcons(linkMatch[1], key);
            parts.push(
                <a
                    key={key++}
                    href={linkMatch[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                >
                    {nodes}
                </a>
            );
            key = nextKey;
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // Incomplete link [text] or [text](url incomplete
        const incompleteLinkMatch = remaining.match(/^\[([^\]]*)\]?\(?([^)]*)?$/);
        if (incompleteLinkMatch && remaining.startsWith('[')) {
            parts.push(<span key={key++}>{remaining}</span>);
            break;
        }

        // Check for emoji at current position
        EMOJI_PATTERN.lastIndex = 0;
        const emojiMatch = remaining.match(EMOJI_PATTERN);
        if (emojiMatch && remaining.startsWith(emojiMatch[0])) {
            const emoji = emojiMatch[0];
            const iconName = EMOJI_TO_ICON_NAME[emoji];
            if (iconName) {
                parts.push(<InlineIcon key={`emoji-${key++}`} iconName={iconName} />);
                remaining = remaining.slice(emoji.length);
                continue;
            }
        }

        // Regular text - find next special character or emoji
        const nextSpecial = remaining.search(/[`*_\[]/);
        EMOJI_PATTERN.lastIndex = 0;
        const nextEmojiMatch = EMOJI_PATTERN.exec(remaining);
        const nextEmojiIndex = nextEmojiMatch ? nextEmojiMatch.index : -1;

        // Find the earliest special position
        let nextPos = -1;
        if (nextSpecial !== -1 && nextEmojiIndex !== -1) {
            nextPos = Math.min(nextSpecial, nextEmojiIndex);
        } else if (nextSpecial !== -1) {
            nextPos = nextSpecial;
        } else if (nextEmojiIndex !== -1) {
            nextPos = nextEmojiIndex;
        }

        if (nextPos === -1) {
            parts.push(remaining);
            break;
        } else if (nextPos === 0) {
            // Special char but didn't match pattern, treat as regular
            parts.push(remaining[0]);
            remaining = remaining.slice(1);
        } else {
            parts.push(remaining.slice(0, nextPos));
            remaining = remaining.slice(nextPos);
        }
    }

    return parts.length === 1 ? parts[0] : parts;
}

/**
 * Thinking/Loading indicator with animated dots
 */
export const ThinkingIndicator: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex items-center gap-1 text-muted-foreground">
            <span className="text-sm">{t('views.chat.thinkingSimple')}</span>
            <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
        </div>
    );
};

/**
 * Extract thinking blocks from content
 * Returns { thinking: string | null, content: string, isThinkingComplete: boolean }
 */
export function extractThinking(content: string): {
    thinking: string | null;
    content: string;
    isThinkingComplete: boolean;
} {
    if (!content) return { thinking: null, content: '', isThinkingComplete: true };

    const thinkingRegex = /<(?:antml:)?thinking>([\s\S]*?)(?:<\/(?:antml:)?thinking>|$)/gi;
    const match = thinkingRegex.exec(content);

    if (!match) {
        return { thinking: null, content, isThinkingComplete: true };
    }

    const thinkingContent = match[1].trim();
    const isComplete = match[0].includes('</thinking>') || match[0].includes('</thinking>');

    // Remove thinking block from content
    const cleanedContent = content.replace(thinkingRegex, '').trim();

    return {
        thinking: thinkingContent,
        content: cleanedContent,
        isThinkingComplete: isComplete
    };
}
