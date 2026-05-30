---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types with reasoning rules, 99 UX guidelines, and 25 chart types across 10 technology stacks. Searchable database with priority-based recommendations.

## When to Apply

This Skill should be used when the task involves **UI structure, visual design decisions, interaction patterns, or user experience quality control**.

### Must Use

- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components (buttons, modals, forms, tables, charts, etc.)
- Choosing color schemes, typography systems, spacing standards, or layout systems
- Reviewing UI code for user experience, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Style Selection | HIGH |
| 5 | Layout & Responsive | HIGH |
| 6 | Typography & Color | MEDIUM |
| 7 | Animation | MEDIUM |
| 8 | Forms & Feedback | MEDIUM |
| 9 | Navigation Patterns | HIGH |
| 10 | Charts & Data | LOW |

## Quick Reference

### 1. Accessibility (CRITICAL)
- Contrast 4.5:1 minimum for normal text
- Visible focus rings on all interactive elements (2–4px)
- Descriptive alt text for meaningful images
- aria-label for icon-only buttons
- Tab order matches visual order
- Use label with for attribute on form fields
- Don't convey info by color alone
- Respect prefers-reduced-motion

### 2. Touch & Interaction (CRITICAL)
- Min 44×44pt touch targets
- Minimum 8px gap between touch targets
- Use click/tap for primary interactions (not hover-only)
- Disable button during async; show spinner
- cursor-pointer on clickable elements
- Visual feedback on press within 100ms

### 3. Performance (HIGH)
- WebP/AVIF images, lazy load non-critical
- Declare width/height to prevent layout shift (CLS)
- font-display: swap to avoid FOIT
- Virtualize lists with 50+ items
- Debounce/throttle high-frequency events
- Skeleton screens for >1s operations

### 4. Style Selection (HIGH)
- Match style to product type
- Use one icon set consistently (stroke width, corner radius)
- Each screen has only one primary CTA
- Use blur for background dismissal, not decoration
- Design light/dark variants together

### 5. Layout & Responsive (HIGH)
- Mobile-first, then scale up
- Systematic breakpoints: 375 / 768 / 1024 / 1440
- No horizontal scroll on mobile
- 4pt/8dp spacing system
- max-w-6xl / 7xl on desktop
- min-h-dvh not 100vh on mobile

### 6. Typography & Color (MEDIUM)
- Base 16px body, 1.5–1.75 line-height
- 65–75 chars per line max
- Semantic color tokens (primary, secondary, error, surface)
- Dark mode: desaturated/lighter tonal variants, not inverted
- font-weight hierarchy: Bold headings 600–700, Regular body 400

### 7. Animation (MEDIUM)
- Duration 150–300ms for micro-interactions
- Use transform/opacity only (not width/height/top/left)
- ease-out entering, ease-in exiting
- Stagger list entrance 30–50ms per item
- Exit animations 60–70% of enter duration
- Respect prefers-reduced-motion

### 8. Forms & Feedback (MEDIUM)
- Visible label per input (not placeholder-only)
- Error below the related field
- Loading → success/error on submit
- Mark required fields with asterisk
- Auto-dismiss toasts in 3–5s
- Confirm before destructive actions
- Validate on blur, not keystroke

### 9. Navigation Patterns (HIGH)
- Bottom nav max 5 items with labels
- Back navigation predictable and consistent
- Current location visually highlighted
- Modals need clear close affordance
- Support system gestures (iOS swipe-back, Android predictive back)
- Large screens (≥1024px) prefer sidebar

### 10. Charts & Data (LOW)
- Match chart type to data (trend→line, comparison→bar, proportion→pie)
- Always show legend near the chart
- Provide tooltips on hover/tap with exact values
- Label axes with units
- Accessible color palettes (not red/green only)
- Empty state when no data

## Common Rules for Professional UI

### Icons & Visual Elements
- NO emoji as structural icons — use SVG (Lucide, Heroicons)
- Consistent icon sizing via design tokens
- Consistent stroke width within same visual layer
- Touch target minimum 44×44pt with hitSlop if needed
- Icon contrast ≥3:1 minimum

### Light/Dark Mode Contrast
- Primary text ≥4.5:1 in both themes
- Secondary text ≥3:1 in both themes
- Use semantic color tokens, not hardcoded hex
- Modal scrim 40–60% black opacity
- Test both themes independently

### Layout & Spacing
- Respect safe areas (notch, status bar, gesture bar)
- 4/8dp spacing rhythm throughout
- Define z-index scale (0/10/20/40/100/1000)
- Add content insets for fixed bars

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis used as icons
- [ ] All icons from consistent family and style
- [ ] Semantic theme tokens used (no hardcoded hex in components)
- [ ] Pressed states don't shift layout

### Interaction
- [ ] All tappable elements have pressed feedback
- [ ] Touch targets ≥44×44pt
- [ ] Micro-interactions 150–300ms
- [ ] Disabled states visually clear

### Light/Dark Mode
- [ ] Primary text contrast ≥4.5:1 in both modes
- [ ] Secondary text contrast ≥3:1 in both modes
- [ ] Both themes tested before delivery

### Layout
- [ ] Safe areas respected
- [ ] No content hidden behind fixed bars
- [ ] Verified on small phone, large phone, tablet
- [ ] 4/8dp spacing rhythm maintained

### Accessibility
- [ ] All icons have accessibility labels
- [ ] Color not the only indicator
- [ ] Reduced motion supported
- [ ] Form fields have labels and error messages
