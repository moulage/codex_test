# Design System Specification: The Tactile Playground

## 1. Overview & Creative North Star

### Creative North Star: "The Living Toybox"
This design system rejects the clinical flatness of modern SaaS in favor of "The Living Toybox." Our goal is to create a digital environment that feels physically snackable—as if every button is a squishy silicone bead and every container is a molded plastic tray. We are not building a "website"; we are building a tactile companion for a 6-year-old.

### Breaking the Template
To move beyond "standard" UI, we employ **Intentional Bulbousness**. While traditional systems use subtle 4px or 8px radii, we lean into `ROUND_FULL` and `xl` scales to create "bubbly" containers that feel safe and inviting. We ignore the rigid 12-column grid in favor of **Organic Stacking**, where elements overlap and "float" using a combination of high-saturation color blocks and soft, ambient depth.

---

## 2. Colors

### The Palette of Joy
Our color strategy is built on "Exaggerated Pop." We use high-chroma primaries to drive action and soft, milky pastels for background surfaces to ensure the UI remains legible and doesn't overwhelm the young user.

*   **Primary (`#ab1479`):** Our "Bubblegum Power." Used for the most critical actions.
*   **Secondary (`#6c5a00`):** The "Sunshine Anchor." Provides high-contrast warmth.
*   **Tertiary (`#00647c`):** The "Sky Depth." Used for secondary interactive zones.
*   **Surface (`#ebfaef`):** A "Grass Cream" base that provides a soft, non-white canvas for high-saturation elements to sit upon.

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning. Separation must be achieved through **Tonal Blocking**. Use `surface-container-low` (`#e4f5e9`) against the main `surface` to define a play area. 

### Signature Textures & Gradients
Flat is boring. To give the app "soul," apply a subtle **Inner Glow Gradient** to primary buttons, transitioning from `primary` (`#ab1479`) to `primary_container` (`#ff6ac0`). This mimics the way light hits a curved plastic surface, reinforcing the "Toy-Like" feel.

---

## 3. Typography

### The "Friendly Bold" Hierarchy
We utilize **Plus Jakarta Sans** for its geometric clarity and friendly apertures. It strikes the perfect balance between "educational" and "playful."

*   **Display & Headline (The Shout):** Use `display-lg` (3.5rem) and `headline-lg` (2rem) for pet names and achievement celebrations. These should always be set in a heavier weight to feel "chunky" and stable.
*   **Title (The Guide):** `title-lg` (1.375rem) serves as the primary instructional text. It is large enough for a child to read comfortably at arm's length.
*   **Body (The Story):** `body-lg` (1rem) is our minimum for standard text. Never drop below `body-md` (0.875rem); we must respect the developing motor skills and visual processing of a 6-year-old.

---

## 4. Elevation & Depth

### Tonal Layering
Depth is achieved through the stacking of tiers. 
*   **Level 0:** `surface` (#ebfaef) - The "Floor" of the app.
*   **Level 1:** `surface-container` (#daede0) - The "Tabletop" where activity cards sit.
*   **Level 2:** `surface-container-lowest` (#ffffff) - High-priority interaction cards that need to "pop" off the green base.

### Ambient Shadows & Glassmorphism
When an element must float (like a modal or a floating action button), use **Ambient Shadows**:
*   **Blur:** `32px` to `64px`
*   **Opacity:** 6%
*   **Color:** Use a tinted version of `on-surface` (#25312a) rather than pure black.

For floating navigation or "HUD" elements, employ **Glassmorphism**:
*   Use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. This keeps the vibrant "Grass Green" background visible, making the app feel like a single, unified world.

---

## 5. Components

### Buttons: The "Squish" Factor
*   **Primary Button:** Uses `ROUND_FULL` (9999px), `primary` background, and `on_primary` text. Apply a 2px "bottom-heavy" shadow to make the button look like it can be physically pressed down.
*   **Secondary Button:** Uses `secondary_container` (#ffd709). These are "Sunshine" buttons for secondary navigation.

### Cards: Bubbly Containers
*   **Standard Card:** Use `surface_container_lowest` (#ffffff) with `xl` (3rem) corner radius. 
*   **No Dividers:** Forbid the use of lines. Use `1.4rem` (Spacing 4) of vertical padding to separate content blocks within a card.

### Interactive Inputs
*   **Checkboxes & Radios:** These should be oversized. A "Selected" state should use `tertiary_container` (#00cefe) to provide a clear, bright visual "Ding!" of success.
*   **Input Fields:** Use `surface_variant` (#cde2d4) for the field body. The rounded corners must be at least `md` (1.5rem) to maintain the "soft" language.

### Specialized Component: The "Pet Portal"
A circular, `ROUND_FULL` container with a `surface_bright` background and a `primary` ghost border (10% opacity) used specifically to frame the digital pet character, creating a consistent "home" for the avatar.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use the `24` (8.5rem) spacing scale for major section breathing room. Kids need space to tap without error.
*   **Do** overlap elements slightly. A "Pet" character should overlap the edge of its container to create a 3D pop-out effect.
*   **Do** use high-contrast combinations like `on_secondary_container` on `secondary_container` for maximum legibility.

### Don't:
*   **Don't** use 1px borders. If you feel you need a border, your background color shift isn't strong enough.
*   **Don't** use "Light Gray." Use our tinted neutrals like `surface_dim` (#c3dacb) to keep the "Grass Green" energy alive.
*   **Don't** use sharp corners (`none` or `sm`). Every sharp corner is a "virtual poke" to a child's finger; keep it soft.