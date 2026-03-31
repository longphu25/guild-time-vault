# Design System: LoreLock Guild Vault
**Project ID:** lorelock-sui-eve

## 1. Visual Theme & Atmosphere
**Deep Space Cyberpunk** 
The overall atmosphere is dark, expansive, and highly technological, drawing inspiration from EVE Frontier's "Smart Assembly" lore. The UI feels like an immersive, high-tech interface floating in deep space. 
- **Density:** Airy but structured. Generous whitespace separates complex data modules.
- **Motion:** Fluid and mechanical. Employs GSAP timelines for sequential loading states and Framer Motion for scroll-reveals (fade-in, subtle translates up). The motion feels deliberate, fast, and optimized, avoiding heavy browser repaints.
- **Lighting:** Ambient "neon" glows in the background (using hardware-accelerated transforms instead of heavy CSS blurs) provide a sense of depth without compromising performance.

## 2. Color Palette & Roles

* **Deep Space Void** (`#0A0A0F`): The primary background color. Creates the infinite space feeling.
* **Holographic Cyan** (`#00F0FF`): Used for primary actions, critical metrics, and success states. Serves as the main active/interactive indicator.
* **Void Purple** (`#A855F7`): A supporting neon color used for secondary highlights, gradients, and contrasting interactive elements.
* **Warning Amber** (`#F59E0B`): Used for dead man switches, warnings, and un-archived emphasis.
* **Terminal Slate** (`#E2E8F0`): Primary text color for high-contrast readability.
* **Muted Star** (`#94A3B8`): Secondary text color for descriptions, sub-labels, and non-essential data.
* **Glass Plate** (`#1A1A2E`): Base color for cards and elevated surfaces. Rendered with slight opacity (often 40% - 60%) rather than heavy backdrop-blurs to ensure high performance.

## 3. Typography Rules
* **Primary Typeface:** `Inter` (or `Geist`, as defined in the ecosystem).
* **Headings (`h1`, `h2`, `h3`):** Clean, geometric, and bold. Deeply contrasting with the background, occasionally utilizing subtle text-shadows (`drop-shadow-[0_0_20px_rgba(...)]`) for a holographic emissive look.
* **Body Text:** highly legible, regular weight to counteract the glowing headings. Moderate line-height (`leading-relaxed`) to keep paragraphs easily readable.
* **Tracking:** Titles use tight tracking (`tracking-tight`) for a technical, dense feel.

## 4. Component Stylings
* **Buttons & CTAs:**
  * Pill-shaped or softly rounded corners (`rounded-lg`, `rounded-full`).
  * Primary actions have solid glow effects on hover (`hover:shadow-[0_0_25px_rgba(0,240,255,0.7)]`) and subtle vertical lift (`-translate-y-1`) via motion.
  * Secondary actions use thin borders (`border-[#2D2D3F]`) with a transparent body and light background coloration on hover.
* **Cards/Containers:**
  * Subtly rounded corners (`rounded-xl` or `rounded-2xl`).
  * **Background:** Semi-transparent dark blue/slate (`bg-[#1A1A2E]/60`) to suggest frosted glass, but heavily optimized by removing `backdrop-blur` CSS to prevent rendering lag.
  * **Borders:** Barely visible, thin 1px lines (`border-[#2D2D3F]`) giving structure to the void.
* **Icons:**
  * Outlined, technical icons (Lucide React) predominantly. They act as anchor points in layouts, often rendered in accent colors (Cyan, Purple).
* **Motion & Entrance (GSAP & Framer Motion):**
  * **Hero Sections:** Sequenced orchestrations via GSAP (`opacity -> 1`, `y -> 0`) for a cinematic start.
  * **Scroll Elements:** Use `motion.div` from Framer Motion with `whileInView` properties to fade up as the user scrolls down.

## 5. Layout Principles
* **Alignment:** Centered for massive hero statements, but predominantly structured into 2-column or 3-column CSS Grids for feature displays.
* **Rhythm:** Generous vertical padding (`py-20`, `py-24`) to differentiate distinct conceptual blocks (e.g., "Problem" vs "Value Proposition").
* **Depth (Z-Index):** The background gradients and sweeping GSAP-animated blobs sit behind everything (`z-0`), whereas the sharp, bordered foreground cards sit distinctly above (`z-10`).
