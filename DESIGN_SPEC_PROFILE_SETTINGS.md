# ETurismo — Profile & Settings Layout Improvement Spec
**Version:** 1.0 · **Date:** August 21, 2026  
**App:** Sacred Heritage Museum Artifact Explorer (React Native + Expo)

---

## 1. Design System Foundation

Before speccing improvements, the constraints and language the app already speaks:

| Token | Value | Usage |
|---|---|---|
| Background | `#FAF9F7` (light) | Page base |
| Surface | `#FFFFFF` | Cards, inputs |
| Ink | `#1A1612` | Primary text |
| Ink Mid | `#6B6459` | Secondary text |
| Ink Dim | `#9A917F` | Muted / captions |
| Gold | `#D4B567` | Accent, icons, borders |
| Gold Bright | `#E8C46A` | Hover / highlight |
| Gold Soft | `rgba(212,181,103,0.06)` | Icon backgrounds |
| Border | `rgba(0,0,0,0.06)` | Card & row dividers |
| Crimson | `#E74C3C` | Danger / destructive |
| Border Radius | `16–20px` | Cards |
| Micro-labels | 9–10px, `800` weight, `letterSpacing: 2.5`, `UPPERCASE` | Section headers |
| Hero gradient | `['#1E1B17', '#2C2720', '#3A3228']` | Profile hero dark bg |

Themes: `light`, `warm`, `sage`, `sepia` — all defined in `constants/themes.ts` and applied via `useAppTheme()` + `buildC(theme)`.

Typography scale in use:
- `38px 800` — hero display names
- `26px 800` — stat numbers
- `18px 800` — page titles
- `14px 600` — menu item titles
- `12px 500` — row values / subtitles
- `9–10px 700–800` — section labels (micro-uppercase)

---

## 2. Profile Page — Current State Assessment

### What works
- Dark warm gradient hero creates strong visual identity
- Gold gradient avatar ring is on-brand and distinctive
- Animated press feedback on MenuRow items
- Scroll-aware navbar hide/show behaviour
- Stats strip with icon + number + label is clean

### Problems to fix

**A. Stats strip is visually weak**
- Only 2 stats: `Saved` and `Collection (∞)`. `∞` is a placeholder — uninformative.
- No scan count stat, though QR scanning is the app's core feature.
- The strip sits flush against the hero bottom with `marginTop: -1` — the overlap looks accidental rather than intentional.

**B. Hero section is information-sparse**
- First name on one line, last name on a second line in a smaller font — uneven visual weight.
- No edit/avatar tap affordance — users can't tell the avatar is tappable to change photo.
- Settings shortcut icon in top-right is too small (38×38) and barely visible against the dark gradient.
- The `SACRED HERITAGE MEMBER` badge gives no dynamic value — it's hardcoded for everyone.

**C. Menu sections are too minimal**
- Only 2 sections: `MY COLLECTION` (2 items) and `ACCOUNT` (2 items).
- No activity section — users have no way to see recent scans, history, or favorites from Profile.
- `Settings & Preferences` in the ACCOUNT card is redundant — it just navigates to the Settings tab which is already accessible from the navbar.
- No logout option — forces user to navigate to Settings just to sign out.

**D. Scroll depth is wasted**
- The version string `Version 2.0.0 · Sacred Heritage` at the bottom feels like dead space.
- No visual closure / end-of-screen treatment.

**E. Missing interactivity polish**
- Avatar has no tap-to-edit prompt (camera overlay, pencil icon).
- No pull-to-refresh.
- Stats don't animate on mount (count-up or fade-in).

---

## 3. Profile Page — Improved Layout Spec

### 3.1 Hero Section (revised)

```
┌─────────────────────────────────────────┐
│  [Dark gradient: #1E1B17 → #3A3228]     │
│                                         │
│  ┌─────────┐    ← Gold gradient ring    │
│  │ AVATAR  │    ← 108×108, initials/img │
│  │  [📷]   │    ← camera icon overlay  │
│  └─────────┘      bottom-right corner   │
│                                         │
│  ● SACRED HERITAGE MEMBER               │
│  FirstName LastName   ← single line     │
│  user@email.com       ← muted below     │
│                                         │
│  [ Edit Profile ]  ← ghost pill button  │
│                                         │
│  ─────────────── ◆ ──────────────────  │
└─────────────────────────────────────────┘
```

**Changes from current:**
- Merge first + last name onto a single `Text` node: `fontSize: 30, fontWeight: '800'`. Removes the awkward size mismatch between first (34px) and last (28px).
- Add a camera overlay badge on avatar bottom-right: `width:28, height:28, borderRadius:14, backgroundColor: C.gold`, with a `camera-outline` Ionicon, positioned `absolute, bottom:0, right:0` on the avatar ring container.
- Add an `Edit Profile` ghost pill button below the email: `borderWidth:1, borderColor: rgba(255,255,255,0.2), borderRadius:20, paddingHorizontal:16, paddingVertical:6`. Tapping navigates to `PersonalInfo`.
- Keep the gold shimmer line at the bottom of the hero.
- The settings gear shortcut in top-right: increase hit target to `44×44`, increase icon size to `22`, keep the current glass-morphism style.

### 3.2 Stats Strip (revised)

Add a 3rd stat: **Scans**. Pull count from `STORAGE_KEYS.savedArtifacts` (already used) or a separate scan history key.

```
┌─────────────────────────────────────────┐
│  [ 📌 ]     [ 🔍 ]     [ 📚 ]          │
│   12          47         ∞              │
│  SAVED       SCANS    COLLECTION        │
└─────────────────────────────────────────┘
```

**Spec:**
- 3 equal-width `StatCard` columns separated by `1px` dividers.
- Stats strip: `marginTop: -20` to intentionally overlap the hero bottom by 20px, `borderRadius: 20`, `elevation: 4` — creates a "card lifts out of hero" effect.
- Add mount animation: `Animated.timing` count-up over 600ms for numeric values.
- `StatCard` height: `paddingVertical: 22`.

### 3.3 Content Sections (revised)

Remove the `Settings & Preferences` redundant row. Replace with a proper restructuring:

**Section 1 — MY ACTIVITY** (new)
```
┌─────────────────────────────────────────┐
│  MY ACTIVITY                            │
│ ─────────────────────────────────────── │
│  [🕐]  Recent Scans          ›          │
│         3 artifacts scanned today       │
│ ─────────────────────────────────────── │
│  [⭐]  Favorites             ›          │
│         Your liked artifacts            │
│ ─────────────────────────────────────── │
│  [🔖]  Saved Artifacts       [12] ›     │
│         12 artifacts bookmarked         │
└─────────────────────────────────────────┘
```

**Section 2 — MY COLLECTION**
```
┌─────────────────────────────────────────┐
│  MY COLLECTION                          │
│ ─────────────────────────────────────── │
│  [📚]  Artifact Collection    ›         │
│         Browse all scanned artifacts    │
└─────────────────────────────────────────┘
```

**Section 3 — ACCOUNT**
```
┌─────────────────────────────────────────┐
│  ACCOUNT                                │
│ ─────────────────────────────────────── │
│  [👤]  Personal Information   ›         │
│ ─────────────────────────────────────── │
│  [🔒]  Password & Security    ›         │
│ ─────────────────────────────────────── │
│  [🎨]  Preferences & Theme    ›         │
└─────────────────────────────────────────┘
```

**Section 4 — DANGER ZONE** (new)
```
┌─────────────────────────────────────────┐
│  ↩  Sign Out                            │
│     (crimson border, #E74C3C)           │
└─────────────────────────────────────────┘
```
A standalone logout button directly on Profile removes the need to navigate to Settings to sign out.

### 3.4 Footer

Replace the plain version string with a branded footer:

```
─── ◆ ───
Sacred Heritage
Heritage Collection · v2.0.0
```

Small centered ornament line, app name in `inkMid`, version in `inkDim 10px`.

### 3.5 Interaction & Motion

| Interaction | Behaviour |
|---|---|
| Avatar tap | Navigate to `PersonalInfo` with edit focus on photo field |
| Camera badge tap | Same as above or trigger `ImagePicker` |
| Pull-to-refresh | Re-fetch user + counts, `RefreshControl` with gold tint |
| Stat number mount | Count-up animation (0 → value) over 600ms, `Animated.Value` |
| MenuRow press | Existing scale press animation (keep) |
| Scroll threshold | Navbar hide/show at 10px diff (keep existing) |

---

## 4. Settings Page — Current State Assessment

### What works
- `ImageBackground` hero with light gradient overlay gives it a different feel from Profile.
- Section/card layout is clean and consistent.
- Row component is reusable with icon + label + optional value.
- Good use of `value` prop to show current Language/Notification/Theme states inline.

### Problems to fix

**A. Hero is visually disconnected from the rest of the app**
- The `ImageBackground` uses `Signin.jpg` (the auth screen image) at `opacity: 0.12`. It's nearly invisible and adds no meaning — looks like a leftover.
- The hero title "Customize\nYour Experience" is generic; the ultra-large `fontSize: 38, fontWeight: '900'` clashes with the rest of the app's measured typographic scale.
- `heroSubtitle` ("Preferences & Configuration") is redundant — it says the same thing as the section.

**B. No user context in Settings**
- Settings opens with no user identity shown — you don't know whose settings these are.
- The Header has a back button on the left and a centered title "Settings" — but Settings is a root tab, not a pushed screen. The back button navigates nowhere meaningful.

**C. Redundant/inconsistent "ABOUT" section**
- Row `App Version` (value: "2.0.0") and Row `Sacred Heritage` (value: "© 2026") serve no purpose as tappable rows — they go nowhere.
- These should be static info, not rows.

**D. Logout is isolated at the bottom**
- Logout button uses a `dangerBg` background that's actually `goldSoft` (a gold tint). This is semantically wrong — gold tint for a destructive action looks like a featured button.
- `borderColor: C.danger` is correct but the fill should be white/surface, not gold.

**E. Missing "active" state indicators**
- The `value` prop on rows (Language, Notifications, Theme) shows static text ("English", "On", "Light") but doesn't visually indicate these are the currently selected values — they look like the row's type label.

**F. SettingsStack navigation flow**
- Settings is accessed as a root tab, but also has a back button for when navigated to from Profile. The same screen handles both entry points with `onClose` prop logic — this is fragile.

---

## 5. Settings Page — Improved Layout Spec

### 5.1 Hero Section (revised)

Replace the `ImageBackground` hero with a compact, on-brand header that matches the Profile hero's dark gradient — creating visual continuity between the two.

```
┌─────────────────────────────────────────┐
│  [Dark gradient: #1E1B17 → #3A3228]     │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  🔧 SETTINGS                     │   │  ← micro-label
│  │  Preferences &                   │   │
│  │  Configuration                   │   │  ← 28px 800 (not 38px)
│  └──────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ 👤 FirstName LastName             │ │  ← mini user chip
│  │    user@email.com                  │ │
│  └────────────────────────────────────┘ │
│                                         │
│  ─────────────── ◆ ──────────────────  │
└─────────────────────────────────────────┘
```

**Changes from current:**
- Remove `ImageBackground` + low-opacity photo. Replace with the same dark gradient used in Profile hero for visual consistency.
- Reduce title to `fontSize: 28, fontWeight: '800'` to match the app's typographic scale.
- Add a mini user identity chip in the hero (avatar initials circle + name + email). This chip is non-interactive but gives context. Uses `backgroundColor: rgba(255,255,255,0.07)`, `borderRadius: 12`, `padding: 10`.
- Keep the gold shimmer line at bottom of hero.
- Remove the back button from Settings when accessed as a root tab. When accessed as a pushed screen from Profile, render a `<` back arrow only.

### 5.2 Sections (revised)

**Section: ACCOUNT** (renamed from "MENU")
```
┌─────────────────────────────────────────┐
│  ACCOUNT                                │
│ ─────────────────────────────────────── │
│  [👤]  Personal Information    ›        │
│ ─────────────────────────────────────── │
│  [🔒]  Password & Security     ›        │
│ ─────────────────────────────────────── │
│  [📧]  Email Preferences       ›        │
└─────────────────────────────────────────┘
```

**Section: PREFERENCES** (keep, improve value display)
```
┌─────────────────────────────────────────┐
│  PREFERENCES                            │
│ ─────────────────────────────────────── │
│  [🌐]  Language          [English] ›    │
│ ─────────────────────────────────────── │
│  [🔔]  Notifications       [On]    ›    │
│ ─────────────────────────────────────── │
│  [🎨]  Theme               [Light] ›    │
└─────────────────────────────────────────┘
```

Value pill: wrap `rowValue` text in a pill: `backgroundColor: C.goldSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2`. Makes it clear it's a current value, not a sub-label.

**Section: SUPPORT** (keep as is, no changes needed)

**Remove: ABOUT section**
Move version + copyright to a static footer (not tappable rows):

```
─── ◆ ───
Sacred Heritage · Heritage Collection
Version 2.0.0  ·  © 2026
```

**Logout:**
Move logout up — place it as the last item inside the ACCOUNT section card as a danger row, rather than an isolated full-width button at the bottom.

```
┌─────────────────────────────────────────┐
│  ACCOUNT                                │
│ ─────────────────────────────────────── │
│  [👤]  Personal Information    ›        │
│ ─────────────────────────────────────── │
│  [🔒]  Password & Security     ›        │
│ ─────────────────────────────────────── │
│  [📧]  Email Preferences       ›        │
│ ─────────────────────────────────────── │
│  [↩]  Sign Out             (crimson)    │  ← last row, no chevron
└─────────────────────────────────────────┘
```

Why: Groups the destructive action with the account it applies to. Reduces scroll depth. Avoids the visual problem of a gold-tinted "danger" button.

If user preference is to keep logout as a full-width button, fix the colour: `backgroundColor: 'transparent'` (white/surface, not `goldSoft`), `borderColor: C.crimson`, `borderWidth: 1.5`.

### 5.3 Row Component — Value Pill

Current `rowValue` style: `fontSize: 12, color: C.textMuted`. 

Improved: wrap value in a pill chip.

```typescript
// In Row component, replace:
{value ? <Text style={styles.rowValue}>{value}</Text> : null}

// With:
{value ? (
  <View style={styles.rowValuePill}>
    <Text style={styles.rowValueText}>{value}</Text>
  </View>
) : null}

// New styles:
rowValuePill: {
  backgroundColor: C.goldSoft,
  borderRadius: 10,
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderWidth: 1,
  borderColor: C.borderGold,
},
rowValueText: {
  fontSize: 11,
  fontWeight: '600',
  color: C.gold,
  letterSpacing: 0.3,
},
```

### 5.4 Sub-Settings Pages (PersonalInfo & others)

The sub-settings pages use a plain `‹` text character as a back button. This is inconsistent — use `Ionicons name="arrow-back"` to match the style of other headers.

The `titleDivider` (3px gold line below header) is a good pattern — ensure it's used consistently on every sub-settings page.

Input style improvement: add a focus state to `TextInput`. On focus, change `borderColor` from `C.border` to `C.gold`, `borderWidth` to `1.5`. Currently all inputs look the same focused or not.

```typescript
// In PersonalInfo (and all sub-settings forms):
const [focusedField, setFocusedField] = useState<string | null>(null);

// On TextInput:
onFocus={() => setFocusedField('firstName')}
onBlur={() => setFocusedField(null)}
style={[
  styles.input,
  focusedField === 'firstName' && { borderColor: C.gold, borderWidth: 1.5 },
]}
```

---

## 6. Shared Component Patterns

### 6.1 PageHero (new shared component)

Both Profile and Settings benefit from the same dark gradient hero. Extract it:

```typescript
// src/components/PageHero.tsx
type PageHeroProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;  // slot for avatar, user chip, etc.
};
```

Colors: always `['#1E1B17', '#2C2720', '#3A3228']` gradient — independent of theme (this is intentional; it's the app's signature dark).

Gold shimmer line at bottom: always present.

Decorative orbs (top-right, bottom-left): always present.

### 6.2 SectionHeader (already shared)

Already used in Profile. Settings should adopt the same pattern:

```typescript
// Current in Settings:
<Text style={styles.sectionTitle}>{title}</Text>
<View style={styles.sectionLine} />

// Should match Profile's:
<View style={styles.sectionDot} />    ← add the gold dot
<Text style={styles.sectionLabel}>{title}</Text>
<View style={styles.sectionLine} />
```

### 6.3 MenuRow vs Row

Profile uses `MenuRow` (with icon wrap, title + subtitle, badge, chevron, press animation).  
Settings uses `Row` (with icon wrap, label, optional value, chevron).

These are essentially the same component with slight variations. Consider unifying:

```typescript
// Unified: src/components/MenuItem.tsx
type MenuItemProps = {
  icon: string;            // Ionicon name
  title: string;
  subtitle?: string;       // optional second line
  value?: string;          // optional right-side value pill
  badge?: number;          // optional count badge
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
};
```

This eliminates the duplication between Profile and Settings and ensures visual consistency as new items are added.

### 6.4 ValuePill (new micro-component)

Used in Settings rows to show current preference values:

```typescript
// src/components/ValuePill.tsx
type ValuePillProps = { value: string };

function ValuePill({ value }: ValuePillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{value}</Text>
    </View>
  );
}
```

---

## 7. Spacing & Layout Grid

| Zone | Current | Improved |
|---|---|---|
| Section horizontal padding | `20px` | `20px` (keep) |
| Section top spacing | `28px` (Profile) / `24px` (Settings) | Standardise to `24px` |
| Card border radius | `18px` (Profile) / `16px` (Settings) | Standardise to `18px` |
| Row vertical padding | `15px` (Profile) / `14px` (Settings) | Standardise to `14px` |
| Hero bottom padding | `36px` (Profile) / `32px` (Settings) | Standardise to `36px` |
| Stats strip overlap | `marginTop: -1` (accidental) | `marginTop: -20` (intentional lift) |
| Bottom scroll padding | `insets.bottom + 48` | Keep |

---

## 8. Theme Adaptation

All improvements must honour the `buildC(theme)` pattern. No hardcoded hex values outside the hero gradient and the floating navbar background.

The one exception is the hero dark gradient `['#1E1B17', '#2C2720', '#3A3228']` — this is intentionally fixed across themes as a signature dark canvas. It should not respond to light/warm/sage/sepia because the contrast of gold initials + white name text against it is the core identity.

All other colours: surface, ink, gold, border, goldSoft — must come from `C.*` tokens derived from the active theme.

---

## 9. Implementation Priority

| Priority | Item | Effort |
|---|---|---|
| P0 | Profile: merge name onto one line | XS |
| P0 | Profile: add camera overlay on avatar | S |
| P0 | Profile: add Sign Out button | XS |
| P0 | Profile: add Favorites + Recent Scans menu items | S |
| P0 | Settings: replace `ImageBackground` hero with dark gradient | S |
| P0 | Settings: add user identity chip in hero | S |
| P0 | Settings: fix logout button colour (goldSoft → surface/transparent) | XS |
| P1 | Profile: 3-stat strip with Scans count | S |
| P1 | Settings: Row value pill component | S |
| P1 | Settings: move logout into ACCOUNT card | S |
| P1 | Settings: remove ABOUT section, move to footer | XS |
| P1 | Shared: SectionHeader gold dot alignment in Settings | XS |
| P2 | Profile: count-up stat animation on mount | M |
| P2 | Profile: pull-to-refresh | S |
| P2 | Sub-settings: TextInput focus border state | S |
| P2 | Sub-settings: fix `‹` back button to use Ionicons | XS |
| P3 | Unified `MenuItem` component (refactor) | M |
| P3 | `PageHero` shared component (extract) | M |

**Legend:** XS < 30min · S 30–90min · M 2–4hrs

---

## 10. What Not to Change

- The dark gradient hero on Profile — it's the strongest design decision in the app.
- The gold gradient avatar ring — distinctive and on-brand.
- The animated press feedback on menu rows — keep the `Animated.sequence` scale press.
- The floating blur pill navbar — it's well-executed.
- The `useAppTheme()` + `buildC(theme)` pattern — don't replace with NativeWind for these screens (StyleSheet is the right choice here given the dynamic theme system).
- The `PagerView`-based tab navigation — works well with the 3-tab layout.
