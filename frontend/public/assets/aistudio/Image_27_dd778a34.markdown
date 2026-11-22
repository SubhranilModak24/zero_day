---
name: VouchPay
colors:
  surface: '#0d1322'
  surface-dim: '#0d1322'
  surface-bright: '#33394a'
  surface-container-lowest: '#080e1d'
  surface-container-low: '#151b2b'
  surface-container: '#191f2f'
  surface-container-high: '#242a3a'
  surface-container-highest: '#2f3445'
  on-surface: '#dde2f8'
  on-surface-variant: '#c2c6d7'
  inverse-surface: '#dde2f8'
  inverse-on-surface: '#2a3040'
  outline: '#8c90a0'
  outline-variant: '#424654'
  surface-tint: '#b1c5ff'
  primary: '#b1c5ff'
  on-primary: '#002c71'
  primary-container: '#598cff'
  on-primary-container: '#002664'
  inverse-primary: '#0056d0'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b1c5ff'
  on-primary-fixed: '#001947'
  on-primary-fixed-variant: '#00419f'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0d1322'
  on-background: '#dde2f8'
  surface-variant: '#2f3445'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes an ultra-reliable, high-integrity aesthetic engineered for real-time UPI payment verification, fraud deterrence, and reconciliation. The core audience comprises fintech operations teams, compliance officers, merchants, and end-users confirming mission-critical financial events. 

The emotional tone balances institutional authority with modern velocity: silent certainty, microscopic precision, and technical poise. It draws from a contemporary dark-mode fintech discipline—rejecting decorative excess in favor of atmospheric depth, strict data density, luminous signal indicators, and architectural hairline boundaries.

## Colors

The palette is rooted in an abyss of deep midnight navies (`#0B1120`), elevated through tiered slate layers (`#151F32`, `#1C2A44`) bounded by controlled cold-slate wireframes (`#233554`).

Primary interactions leverage electric cyan-blue (`#397BFF`), emitting micro-luminescence (`rgba(57, 123, 255, 0.15)`) to guide actionable flow. Verification states operate under non-negotiable optical semantic roles:
- **Verified / Settled**: Emerald (`#10B981`, soft layer: `rgba(16, 185, 129, 0.12)`)
- **Awaiting Signal / Pending**: Amber (`#F59E0B`, soft layer: `rgba(245, 158, 11, 0.12)`)
- **Flagged / Disputed / Anomalous**: Coral Red (`#EF4444`, soft layer: `rgba(239, 68, 68, 0.12)`)

Typography values maintain strict contrast levels against dark surfaces: `#FFFFFF` and `#F8FAFC` for high-priority transaction IDs and values, `#94A3B8` for labels and secondary details, and `#64748B` for metadata timestamps and architectural rules.

## Typography

Typography pairs `Plus Jakarta Sans` for display headers with `Inter` for computational scanning and operational clarity.

- **Numerics & Verification Data**: For monetary figures, UPI reference numbers (RRN), cryptographic proof hashes, and timestamps, tabular numerals (`tnum`) must be enforced alongside `JetBrains Mono` where space permits.
- **Hierarchy Guidelines**: Headlines rely on tighter negative letter tracking to preserve structural weight on dark pixels. Body text requires relaxed line heights to avoid eyestrain during sustained auditing.
- **Micro-Labels**: Status capsules, metadata tags, and table header fields render in uppercase or semi-bold optical sizing with expanded tracking (`0.02em` to `0.04em`) to ensure legibility across lower-contrast slate backgrounds.

## Layout & Spacing

The layout model is driven by a 12-column adaptive fluid grid engineered for responsive dashboards, audit feeds, and modal proof viewers.

- **Breakpoints & Grids**:
  - **Desktop (≥ 1280px)**: 12-column system, max container width `1440px`, `gutter: 1.5rem`, `margin: 2rem`. Sidebars for navigation and batch filters lock to fixed 280px or 320px rails while the central ledger flows flexibly.
  - **Tablet (768px - 1279px)**: 8-column layout, `gutter: 1.25rem`, `margin: 1.5rem`. Secondary analytic panes collapse into drawer trays.
  - **Mobile (< 768px)**: 4-column single-column stack, `gutter-sm: 1rem`, `margin-sm: 1rem`. Tables reflow into autonomous verification proof cards.

- **Rhythm Rules**: Vertical spacing obeys an 8px grid cadence (`space-xs` = 4px, `space-sm` = 8px, `space-md` = 16px, `space-lg` = 24px, `space-xl` = 32px). Element groupings within transaction rows enforce compact 8px–12px gaps to keep associated metrics cognitively united.

## Elevation & Depth

Visual hierarchy uses physical tonal stacking and restrained ambient luminescence rather than traditional multi-directional dropped shadows.

- **Layer 0 (Canvas Base)**: Deepest tone `#0B1120`. No borders or drop shadows.
- **Layer 1 (Card & Section Containers)**: Surface `#151F32` anchored by a crisp `1px solid #233554` outline. Soft ambient shadow: `0px 4px 20px rgba(0, 0, 0, 0.35)`.
- **Layer 2 (Interactive Floating Elements & Overlays)**: Surface `#1C2A44`, border `1px solid rgba(57, 123, 255, 0.25)`, elevation shadow: `0px 12px 32px rgba(3, 7, 18, 0.6)`.
- **Glow Accents**: Primary focus states and critical success milestones emit controlled radial glows (`box-shadow: 0px 0px 16px rgba(57, 123, 255, 0.25)` or `0px 0px 16px rgba(16, 185, 129, 0.2)`).
- **Glass Effects**: Sticky navigation headers and audit filter bars utilize `backdrop-filter: blur(12px)` over `rgba(11, 17, 32, 0.85)` with a single bottom boundary of `1px solid #1E293B`.

## Shapes

The design system employs a refined modern curvature standard (`roundedness: 2`), ensuring a balance between software precision and tactile appeal.

- **Cards & Data Modules**: Base containers leverage `rounded-xl` (`1.5rem` / `24px`) or `rounded-lg` (`1rem` / `16px`) to soften visual bulk and focus attention inward.
- **Form Controls & Inputs**: Form fields, segmented tabs, and buttons use base roundedness (`0.5rem` / `8px`).
- **Pill Badges & Status Chips**: Exclusively pill-shaped (`9999px`) to immediately separate status metadata from structural containers.
- **Hairline Precision**: All borders remain strictly `1px` across all screen densities.

## Components

### Buttons
- **Primary**: Background `#397BFF`, text `#FFFFFF`, font `label-lg`, border `none`, radius `0.5rem`. Hover states shift to `#2B69EE` with an ambient glow (`box-shadow: 0px 0px 12px rgba(57, 123, 255, 0.35)`). Active state applies a scale transform of `0.98`.
- **Secondary / Ghost**: Background `rgba(35, 53, 84, 0.4)`, text `#F8FAFC`, border `1px solid #233554`. Hover transition brings background to `#1C2A44` and border to `#397BFF`.
- **Destructive**: Background `rgba(239, 68, 68, 0.1)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.25)`. Hover fills to `#EF4444` with white text.

### Status Chips & Badges
- Constructed as 24px high pills with inline micro-indicators (6px circular pulse dot).
- **Verified**: Text `#10B981`, background `rgba(16, 185, 129, 0.12)`, border `1px solid rgba(16, 185, 129, 0.3)`.
- **Pending**: Text `#F59E0B`, background `rgba(245, 158, 11, 0.12)`, border `1px solid rgba(245, 158, 11, 0.3)`.
- **Disputed**: Text `#EF4444`, background `rgba(239, 68, 68, 0.12)`, border `1px solid rgba(239, 68, 68, 0.3)`.

### Cards & Ledger Blocks
- Background `#151F32`, border `1px solid #233554`, border-radius `1.5rem`.
- Padding transitions dynamically from `space-md` (mobile) to `space-xl` (desktop).
- Interactive cards transition to `#1C2A44` with a hairline shift to `rgba(57, 123, 255, 0.4)`.

### Input Fields & Search Bars
- Background `#0B1120`, border `1px solid #233554`, border-radius `0.5rem`, text `#FFFFFF`, placeholder `#64748B`.
- Focus ring: `1px solid #397BFF` with an outer halo `0px 0px 0px 3px rgba(57, 123, 255, 0.15)`.

### Evidence Verification Drawer & Modal
- A specialized component displaying the cryptographic UPI transaction chain: screenshot OCR data, RRN hash, timestamp matching, and bank routing response.
- Background `#151F32`, backdrop overlay `rgba(11, 17, 32, 0.8)` with blur `8px`.
- Verification data is arranged in structured key-value pairs using `data-mono` styling on custom low-contrast `#0B1120` inset panels.