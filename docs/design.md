# Budget Application - UI & Style Guide

## Overview
This document defines the design system and UI guidelines for the Budget application, a personal finance management tool built with React, TanStack Router, and Tailwind CSS.

## Brand Identity

### App Name & Icon
- **Name**: Budget
- **Icon**: Wallet icon (Lucide React)
- **Purpose**: Personal budget tracking and financial transaction management

## Color Palette

### Primary Colors
Based on the analyzed application interface and CSS variables:

**Light Mode:**
- **Primary**: `oklch(0.723 0.219 149.579)` - Sage Green
- **Primary Foreground**: `oklch(0.982 0.018 155.826)` - Near White
- **Background**: `oklch(1 0 0)` - Pure White
- **Foreground**: `oklch(0.141 0.005 285.823)` - Dark Gray

**Navigation Bar:**
- **Background**: `bg-yellow-900` - Deep Brown/Yellow
- **Text**: White

**Dark Mode:**
- **Primary**: `oklch(0.696 0.17 162.48)` - Muted Green
- **Background**: `oklch(0.141 0.005 285.823)` - Dark Gray
- **Foreground**: `oklch(0.985 0 0)` - Near White

### Semantic Colors
- **Destructive**: `oklch(0.577 0.245 27.325)` - Red for deletions/negative values
- **Success**: Green tones for positive transactions
- **Warning**: Yellow tones for pending states
- **Muted**: `oklch(0.967 0.001 286.375)` - Light gray for secondary content

### Category Colors
Based on the transaction interface analysis:
- **Red**: Expenses, negative transactions (Bäcker, Unterhaltung, Lebensmittel)
- **Green**: Income, positive transactions (Haushalt, sonstiges, Invest)
- **Gray**: Neutral categories

## Typography

### Font System
- **Base Font**: System font stack via Tailwind CSS
- **Primary Text**: `text-base` (16px) on desktop, `text-sm` (14px) on mobile
- **Headings**: Font weights from `font-medium` to `font-bold`

### Text Hierarchy
- **App Title**: `text-2xl font-bold capitalize` (Budget)
- **Section Headers**: `font-semibold`
- **Transaction Amounts**: Right-aligned, color-coded by type
- **Dates**: `font-medium` grouping headers
- **Categories**: Color-coded with medium font weight
- **Descriptions**: `text-muted-foreground text-sm`

## Layout & Spacing

### Grid System
- **Container**: Full width with responsive padding (`px-4 sm:px-6`)
- **Card System**: `rounded-xl border py-6 shadow-sm` with `gap-6` internal spacing
- **Form Layouts**: Consistent `gap-3` between form elements

### Spacing Scale
- **Component Gaps**: `gap-2`, `gap-3`, `gap-6`
- **Padding**: `p-2`, `p-3`, `px-3 py-1`, `px-4`, `px-6`
- **Margins**: Following Tailwind's spacing scale

### Responsive Breakpoints
- **Mobile First**: Base styles for mobile
- **Tablet**: `sm:` prefix (640px+)
- **Desktop**: `md:` prefix (768px+) with `max-md:hidden` for mobile-only content

## Components

### Navigation Bar
```css
.navbar {
  position: fixed;
  top: 0;
  z-index: 10;
  width: 100%;
  background: bg-yellow-900;
  color: white;
  shadow: shadow-2xl;
  padding: p-2;
}
```

**Features:**
- Fixed positioning at top
- Brand logo with Wallet icon
- Navigation links with icons (Lucide React)
- Responsive: Icons only on mobile, text + icons on desktop
- Hover states: `hover:bg-yellow-700`

### Buttons

**Variants:**
- **Default**: `bg-primary text-primary-foreground shadow-xs hover:bg-primary/90`
- **Ghost**: `hover:bg-accent hover:text-accent-foreground`
- **Destructive**: `bg-destructive text-white hover:bg-destructive/90`
- **Outline**: `border bg-background shadow-xs hover:bg-accent`

**Sizes:**
- **Default**: `h-9 px-4 py-2`
- **Small**: `h-8 px-3`
- **Large**: `h-10 px-6`
- **Icon**: `size-9`

### Form Elements

**Input Fields:**
```css
.input {
  height: h-9;
  width: w-full;
  padding: px-3 py-1;
  border: border-input;
  border-radius: rounded-md;
  background: bg-transparent;
  box-shadow: shadow-xs;
}
```

**Focus States:**
- Ring: `focus-visible:ring-ring/50 focus-visible:ring-[3px]`
- Border: `focus-visible:border-ring`

**Search Input:**
- Left icon positioning: `absolute left-3 top-1/2 transform -translate-y-1/2`
- Placeholder styling: `placeholder:text-muted-foreground`
- Right-side action buttons: `absolute right-2 top-1/2`

### Cards
```css
.card {
  background: bg-card;
  border-radius: rounded-xl;
  border: border;
  box-shadow: shadow-sm;
  padding: py-6;
  gap: gap-6;
}
```

**Card Structure:**
- **Header**: `px-6` with title and optional actions
- **Content**: `px-6` main content area
- **Footer**: `px-6` with border-top when present

### Transaction List

**Date Grouping:**
- Date headers with `font-medium`
- Transactions grouped by date
- Month/year navigation (2025-08)

**Transaction Items:**
- **Category**: Color-coded, left-aligned
- **Description**: Muted text, optional subcategory
- **Amount**: Right-aligned, color-coded (red/green)
- **Currency**: Euro (€) symbol

**Transaction States:**
- **Default**: Normal transaction display
- **Hover**: Subtle background change
- **Selected**: Highlighted state for editing

## Iconography

### Icon Library
**Lucide React** - Consistent icon system

**Navigation Icons:**
- **Wallet**: App logo/home
- **Tag**: Categories
- **NotepadTextDashed**: Templates  
- **Calculator**: Review/Analytics
- **LogOut**: Sign out

**Action Icons:**
- **Search**: Search functionality
- **X**: Clear/close actions
- **ArrowRight**: Submit/continue
- **LoaderCircle**: Loading states

### Icon Usage
- **Size**: Consistent `h-4` for navigation, `h-7` for logo
- **Positioning**: Paired with text, proper spacing with `gap-1` or `gap-2`
- **States**: Icons support hover and active states

## Interactive States

### Hover Effects
- **Navigation Links**: `hover:bg-yellow-700`
- **Buttons**: Opacity reduction `hover:bg-primary/90`
- **Ghost Buttons**: `hover:bg-accent hover:text-accent-foreground`

### Focus States
- **Ring**: 3px ring with 50% opacity of ring color
- **Border**: Changes to ring color
- **Outline**: None (using ring instead)

### Active States
- **Current Page**: Visual indication in navigation
- **Form Validation**: `aria-invalid` styling with destructive colors
- **Loading**: LoaderCircle icon with appropriate animation

### Disabled States
- **Opacity**: `disabled:opacity-50`
- **Pointer Events**: `disabled:pointer-events-none`
- **Cursor**: `disabled:cursor-not-allowed`

## Accessibility

### Color Contrast
- High contrast ratios between text and backgrounds
- Semantic color usage (red for negative, green for positive)
- Support for both light and dark modes

### Interactive Elements
- Focus rings on all interactive elements
- Proper ARIA attributes (`aria-invalid` for form validation)
- Keyboard navigation support

### Typography
- Readable font sizes (minimum 14px on mobile)
- Proper heading hierarchy
- Sufficient line spacing

## Animation & Motion

### Transitions
- **Duration**: Standard transition timing
- **Properties**: `transition-all` for comprehensive state changes
- **Easing**: Default browser easing curves

### Loading States
- **Spinner**: LoaderCircle icon for form submissions
- **Skeleton**: Consistent with overall spacing system

## Mobile Responsiveness

### Navigation
- **Mobile**: Icon-only navigation with `max-md:hidden` for text
- **Desktop**: Icon + text combinations

### Layout Adaptations
- **Container**: Responsive padding (`px-4 sm:px-6`)
- **Form Elements**: Full-width on mobile
- **Buttons**: Appropriate sizing for touch targets

### Content Priority
- Critical information visible on mobile
- Progressive enhancement for larger screens

## Dark Mode Support

### Implementation
- CSS custom properties with light/dark variants
- Automatic switching based on system preference
- Consistent contrast ratios across modes

### Component Adaptations
- Background colors: `dark:bg-input/30`
- Borders: `dark:border-input`
- Text: Proper contrast in both modes

## Data Visualization

### Transaction Amounts
- **Formatting**: Currency symbol (€), decimal places
- **Alignment**: Right-aligned for easy scanning
- **Color Coding**: Red for expenses, green for income

### Categories
- **Visual Hierarchy**: Color-coded categories
- **Grouping**: Logical organization by type
- **Recognition**: Consistent color assignments

## Form Design Patterns

### Search Interface
- **Icon Integration**: Left-aligned search icon
- **Clear Action**: X button for clearing search
- **Submit Action**: Arrow button or enter key
- **Placeholder**: Descriptive text with example format

### Input Validation
- **Error States**: Red border and ring
- **Success States**: Subtle positive indicators  
- **Helper Text**: Muted text for guidance

## Performance Considerations

### CSS Optimization
- **Tailwind CSS**: Utility-first with purged unused styles
- **Custom Properties**: Efficient theme switching
- **Shadow System**: Consistent shadow scale

### Component Loading
- **Code Splitting**: Route-based component loading
- **Lazy Loading**: Non-critical components loaded on demand

---

## Implementation Guidelines

When implementing new features or modifying existing ones:

1. **Follow the established color palette** - Use CSS custom properties
2. **Maintain consistent spacing** - Use Tailwind's spacing scale
3. **Ensure accessibility** - Include proper focus states and ARIA attributes  
4. **Support responsive design** - Test on mobile and desktop
5. **Implement proper loading states** - Use LoaderCircle for consistency
6. **Follow the component patterns** - Maintain architectural consistency
7. **Test in both light and dark modes** - Ensure proper contrast ratios

This design system ensures visual consistency, accessibility, and maintainability across the Budget application.