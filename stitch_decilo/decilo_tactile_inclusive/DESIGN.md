---
name: Decilo Tactile Inclusive
colors:
  surface: '#f8f9ff'
  surface-dim: '#d6dae4'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f4fd'
  surface-container: '#eaeef8'
  surface-container-high: '#e4e8f2'
  surface-container-highest: '#dee2ec'
  on-surface: '#171c23'
  on-surface-variant: '#42474c'
  inverse-surface: '#2c3138'
  inverse-on-surface: '#edf1fb'
  outline: '#72787d'
  outline-variant: '#c1c7cd'
  surface-tint: '#3c637a'
  primary: '#00283a'
  on-primary: '#ffffff'
  primary-container: '#133e54'
  on-primary-container: '#82a9c3'
  inverse-primary: '#a5cce7'
  secondary: '#a33d19'
  on-secondary: '#ffffff'
  secondary-container: '#ff8258'
  on-secondary-container: '#701f00'
  tertiary: '#002b1a'
  on-tertiary: '#ffffff'
  tertiary-container: '#00432c'
  on-tertiary-container: '#66b38d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c6e7ff'
  primary-fixed-dim: '#a5cce7'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#234b61'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59d'
  on-secondary-fixed: '#390b00'
  on-secondary-fixed-variant: '#832702'
  tertiary-fixed: '#a4f3ca'
  tertiary-fixed-dim: '#88d6af'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#171c23'
  surface-variant: '#dee2ec'
typography:
  display-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.005em
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  pictogram-label:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.01em
  pictogram-label-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 3rem
  touch-generous: 3.5rem
  touch-card: 5.5rem
  gap-xs: 0.25rem
  gap-sm: 0.5rem
  gap-md: 1rem
  gap-lg: 1.5rem
  gap-xl: 2rem
  margin-mobile: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
---

## Brand & Style

The design system establishes a human-centered, mature, and reassuring interface for Augmentative and Alternative Communication (AAC) and speech-language pathology. It rejects patronizing, juvenile aesthetics in favor of dignified autonomy, scientific clarity, and organic warmth. It bridges the emotional needs of diverse communicators (neurodivergent individuals, stroke rehabilitation patients, non-verbal users) with the clinical efficiency demanded by speech-language therapists and caregivers.

The visual direction blends **Tactile Softness** with **Universal Accessibility**:
- **Affirming Dignity:** Clean layouts, adult-respectful proportioning, and intentional whitespace eliminate any sense of a "toy-like" software.
- **Physical Confidence:** Surfaces exhibit a tangible weight with deliberate borders and soft tactile feedback, aiding users with fine-motor tremors or cognitive load constraints.
- **Multi-sensory Co-presence:** Information is never communicated through color alone; visual anchors, geometric icons, and precise text labels operate in unison to meet WCAG AAA standards.

## Colors

The palette balances clinical gravitas with warm organic comfort. Pure white is reserved for high-salience tactile surfaces (interactive pictograms, active tiles), while soft ivory tones reduce glare and visual fatigue during long communication sessions.

### Functional Roles
- **Primary (`#133E54` - Deep Petrol Blue):** Structural framework, main navigation, top-level headers, and authoritative boundaries. Provides stability and deep contrast against light backgrounds.
- **Secondary (`#E06A42` - Warm Coral):** Intentional call-to-action, active vocalization triggers, primary operational buttons ("Hablar", "Borrar frase"), and high-priority alerts.
- **Tertiary (`#2E7D5B` - Warm Meadow Green):** Positive affirmations, phrase completion, success milestones, recorded audio confirmations, and clinical progress markers.
- **Accent Attention (`#F9A825` - Warm Amber):** Soft warning flags, reward badges, vocabulary category tags, and temporary focus indicators. Paired with `#FFF8E1` for background pills.
- **Neutral Foreground (`#1E232A` - Carbon Charcoal):** High-density text delivering a minimum contrast ratio of 7:1 (WCAG AAA) across all ivory and white containers.
- **Surface Canvas (`#FAF8F5` - Warm Ivory):** Base application background, mitigating eye-strain and photosensitivity.
- **Surface Cards & Tiles (`#FFFFFF` - Crisp White):** Pictogram cards, communication strip items, and selectable buttons to create clear contrast against the `#FAF8F5` canvas.
- **Border / Divider (`#D9D4CC` - Muted Sand):** Structural containment borders (minimum 1.5px to 2px) to clearly demarcate touch targets.

## Typography

The design system utilizes **Atkinson Hyperlegible Next** across all text levels. Designed explicitly for low-vision legibility, its letterforms feature distinct apexes, exaggerated loops, and unambiguous distinction between ambiguous glyphs (such as uppercase 'I', lowercase 'l', and number '1').

### Typographic Rules
- **No Text Under 14px:** Ever. Body text remains at a strict minimum of 16px, while labels for pictogram cards strictly stay between 18px and 20px with bold weights (`700`).
- **Enhanced Leading:** Line heights are set at 1.4 to 1.55x the font size to prevent overlapping lines for users with motor coordination or reading difficulties.
- **Pictogram Pairing:** Pictograms are never presented without their companion text label (`pictogram-label` or `pictogram-label-sm`). Text is positioned below the symbol icon with high contrast and zero ligatures that could obfuscate readability.

## Layout & Spacing

The layout adapts between three dominant functional contexts: Speech Synthesis Grid (AAC keyboard/board), Clinical Management Dashboard, and Sentence Formulation Strip.

### Layout Principles
- **Touch Targets First:** All primary interaction zones respect a physical target size of no less than 48px × 48px (`3rem`), scaling up to 56px (`3.5rem`) for key action triggers and 88px+ (`5.5rem`) for core pictogram buttons.
- **Fixed-Ratio Adaptive Grid for AAC:** AAC grids adhere to fixed aspect ratios (1:1 or 4:5) to maintain muscle memory across viewport changes. Column density shifts safely:
  - **Mobile:** 2 to 3 columns max per board screen.
  - **Tablet (Landscape):** 4 to 6 columns.
  - **Desktop:** 6 to 8 columns maximum to eliminate visual hunting.
- **Sentence Strip Pinning:** The active accumulator (Sentence Strip) remains pinned to a predictable visual anchor (top of viewport for AAC boards; sticky header for session review), preventing spatial reorientation during communication routines.
- **Generous Gutters:** Grid gutters are kept at `gap-md` (16px) or `gap-lg` (24px) to physically separate touch bounding boxes and eliminate accidental mis-taps.

## Elevation & Depth

Visual hierarchy does not rely on intense dropshadows or complex 3D skeuomorphism. Instead, the design system employs **tactile boundaries and high-definition surface tiers**:

- **Structural Outlines:** Every interactive card, panel, and modal utilizes a deliberate `1.5px` to `2px` solid stroke (`#D9D4CC` at rest; `#133E54` in focus; `#E06A42` active). This defines clear optical enclosures.
- **Grounded Soft Shadows:** Elevated elements (such as the Sentence Construction Bar or Modal Dialogues) cast a subtle, warm-tinted shadow: `0 4px 12px -2px rgba(19, 62, 84, 0.08), 0 2px 4px -1px rgba(30, 35, 42, 0.04)`.
- **Pressed Physicality:** On tap/click, interactive elements shift `2px` downward along the Y-axis accompanied by a border color shift, offering unmistakable mechanical feedback to non-verbal or motor-delayed users.

## Shapes

The design system maintains a consistent **Rounded (Level 2)** geometry:
- **Pictogram & Selection Tiles:** `1rem` (16px) corner radius. This softens the optical weight without reducing interior icon space.
- **Buttons and Input Fields:** `0.75rem` (12px) to `1rem` (16px) border radius for ergonomic comfort.
- **Status Pills and Badges:** Full pill shape (`9999px`) for unambiguous semantic differentiation from square-format pictogram cards.
- **Focus Rings:** Distinct offset of `3px` with a `3px` solid stroke in Deep Petrol (`#133E54`) or Bright Orange (`#E06A42`), featuring matching corner curvature.

## Components

### 1. Pictogram Tile (Core Communication Card)
- **Structure:** Vertical stack containing an illustrative icon (simplified, culturally neutral vector) on top and an uppercase/title-cased label below.
- **Dimensions:** Minimum 88px × 88px; standard AAC grid runs 112px × 124px.
- **Styling:** White (`#FFFFFF`) background, `2px` border (`#D9D4CC`), `16px` rounded corners.
- **Interaction:** State transitions use scale depressions (0.97 scale, 2px downward translation) with an immediate `#133E54` border highlight. Auditory and haptic feedback accompany activation.

### 2. Sentence Construction Strip
- **Role:** Displays sequential tokens/pictograms assembled by the communicator.
- **Styling:** Solid ivory-tinted container (`#F4F0EA`) bordered by Deep Petrol (`#133E54`).
- **Controls:** Embedded right-aligned action cluster featuring the "Vocalize / Speak" button (Coral `#E06A42`) and "Clear" button (`#FAF8F5` surface with charcoal icon), each at 56px height.

### 3. Primary & Secondary Action Buttons
- **Primary ("Hablar / Enviar"):** Background `#E06A42`, text and icons in `#FFFFFF`. Height: 52px to 56px. Font: `label-lg`, weight `700`. Subtle shadow with a 2px darker baseline border (`#B84E29`) for tactile grounding.
- **Secondary / Functional Navigation:** Background `#133E54`, text `#FFFFFF`. Used for folder navigation, settings, and clinician dashboard controls.
- **Quiet / Auxiliary:** `#FFFFFF` background with a `2px` border (`#D9D4CC`) and Neutral Charcoal text (`#1E232A`).

### 4. Multi-Signal Status Chips & Badges
- **Triple-Redundancy Requirement:** Must combine Color + Icon + Explicit Text.
  - *Success / Verified:* Background `#E8F5E9`, border `#2E7D5B`, text `#2E7D5B`, checkmark icon.
  - *Attention / Pending:* Background `#FFF8E1`, border `#F9A825`, text `#8D5B00`, warning shield/circle icon.
  - *Alert / Intervention:* Background `#FBE9E7`, border `#E06A42`, text `#BF360C`, alert triangle icon.

### 5. Input Fields & Search (Vocabulary Search)
- **Dimensions:** Minimum 52px height.
- **Styling:** `#FFFFFF` fill, `2px` `#D9D4CC` border, Atkinson Hyperlegible at 16px. Clear "X" touch target of 44px for one-tap resets.

### 6. Clinical Session Card
- **Role:** For speech-language pathologists monitoring patient metrics, vocabulary acquisition, and phonetic progress.
- **Styling:** Non-interactive presentation surface in `#FFFFFF`, with `1px` subtle divider lines, deep petrol header accents, and clear tag chips for communicative milestones.