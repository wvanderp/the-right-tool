# The Right Tool - Design Language

## Brand Colors & Theme

Our primary color is a warm yellow (#CA8A04) that brings energy and optimism to the interface. We use it for important actions and highlights.

The app uses a clean, modern color scheme:

- Main content areas: White background for clarity
- Navigation and cards: A subtle light gray (#F9FAFB) or dark gray (#1F2937) background
- Text comes in three shades:
  - Main text: Deep gray, almost black (#111827)
  - Secondary information: Medium gray (#4B5563)
  - Subtle text: Light gray (#6B7280)

## Typography & Text

We keep things simple with a clean, modern system font. Text should be easy to read:

- Base size is 16px
- Comfortable line height of 1.5
- We use three weights: normal (400), medium (500), and bold (700) for hierarchy

## Layout & Spacing

We use a 4px grid system for consistency. Common spacing values are:

- Tiny details: 8px
- Standard spacing: 16px
- Comfortable breathing room: 24px
- Section separation: 32px
- Major divisions: 48px

Content is centered and has a max-width of 1152px (6xl) to ensure readability.

## Responsive Design

Tools should work beautifully across all screen sizes:

### Desktop
- Use the full width available within the max-width constraint (6xl - 1152px)
- Utilize grid layouts for complex tools (e.g., `md:grid-cols-2`, `xl:grid-cols-2`)
- Navigation is always visible as a fixed sidebar

### Mobile & Tablet
- Tools must be fully responsive and usable on smaller screens
- Navigation collapses to a hamburger menu on mobile (`md:hidden` breakpoint)
- Grid layouts stack vertically on mobile (`grid-cols-1 md:grid-cols-2`)
- Content should have appropriate padding (`px-4 md:px-6 lg:px-8`)
- Touch-friendly interactive elements with adequate spacing

### Breakpoints
We use Tailwind's default responsive breakpoints:
- `sm`: 640px and up (small tablets/large phones)
- `md`: 768px and up (tablets and small desktops)
- `lg`: 1024px and up (desktops)
- `xl`: 1280px and up (large desktops)

## Interactive Elements

### Buttons & Links

Buttons should feel satisfying to click:

- Default state: Our yellow primary color with white text
- Hover: Slightly darker for feedback
- Click: Even darker to feel responsive

Links use our yellow color and get an underline on hover.

### Navigation & Structure

The navigation menu and footer use a sophisticated dark gray background (#1F2937) with:

- Active items highlighted in yellow
- Subtle hover effects
- Clean white text for contrast

### Forms & Input

Form elements should feel precise and responsive:

- Text inputs have light borders that highlight on focus
- Code areas use a monospace font
- Upload areas have dashed borders
- Sliders use our yellow accent color
- Focus states use a yellow ring (`focus:ring-1 focus:ring-primary focus:border-primary` for basic inputs)
- Input styling is standardized in CSS with `.bg-white border border-gray-300 rounded-md`

### Mobile Navigation

The navigation menu adapts intelligently to mobile:

- Desktop: Fixed sidebar always visible
- Mobile: Hamburger menu with slide-out navigation
- Menu button positioned at top-left with backdrop
- Smooth transitions with transform animations
- Menu closes automatically when route changes

### Tool Layout Patterns

Tools should follow consistent layout patterns:

- **Two-Column Input**: Use `grid-cols-1 md:grid-cols-2` for side-by-side inputs
- **Multi-Section Results**: Use `xl:grid-cols-2` for results that can span wider on large screens
- **Card Components**: Wrap content in cards with consistent padding and borders
- **Form Controls**: Group related inputs with consistent spacing and labels

### Tool Components

Tools are presented in clean, white cards with:

- Subtle borders
- Light hover effects
- Clear headings
- Comfortable padding

### Feedback & States

We communicate clearly with users:

- Errors: Soft red backgrounds with clear messages
- Success: Gentle green confirmation
- Loading: Subtle opacity changes with spinners
- Disabled states: Reduced opacity

### Color-Coded Results

For tools that display multiple types of results, use semantic color coding:

- **Green (Success/Intersection)**: `bg-green-50 border-green-200 text-green-800`
- **Blue (Information/Alternative)**: `bg-blue-50 border-blue-200 text-blue-800`
- **Orange (Warning/Difference)**: `bg-orange-50 border-orange-200 text-orange-800`
- **Red (Error/Problem)**: `bg-red-50 border-red-200 text-red-600`
- **Purple (Alternative Difference)**: `bg-purple-50 border-purple-200 text-purple-800` (when multiple difference types are needed)

Each colored section should include:
- Consistent padding and rounded corners
- Item count badges
- Copy-to-clipboard functionality
- Descriptive help text

### Code Display

Code is shown in:

- Light gray or dark backgrounds
- Monospace font
- Comfortable padding
- Scrollable when needed

All interactions should have smooth transitions (200ms) to feel polished but snappy.

## Standard Utility Classes

The project includes several custom utility classes defined in `main.css`:

### Transitions
- `.transition-custom`: Standard 200ms transition for all properties (`transition-all duration-200 ease-in-out`)

### Buttons
- `.btn-primary`: Primary button style with yellow background, hover and focus states
- `.btn-secondary`: Gray secondary button style with hover and focus states

### Layout
- `.card`: Standard card styling with white background, border, padding, and hover effects
- `.text-readable`: Optimized text styling for readability with proper tracking and line height

### Form Elements
Standardized input styling is automatically applied to:
- `input[type="text"]`
- `input[type="number"]`
- `textarea`

These include consistent padding, borders, and yellow focus states.

## Transition Guidelines

Use consistent transition timing across the application:
- **Standard transitions**: `transition-all duration-200` for most interactive elements
- **Color transitions**: `transition-colors duration-200` for simple color changes
- **Hover states**: All interactive elements should have hover feedback
- **Focus states**: Form elements use yellow ring focus indicators
- **Active states**: Buttons should have subtle active/pressed states