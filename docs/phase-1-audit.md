# Phase 1 Audit Report

## 1. UI Inventory
```
# UI Inventory

## Page Structure

### Login Page (`#loginPage`)
- Container: `.login-page`
  - Card: `.login-card` (max-width: 400px)
    - Logo: `.login-logo` - "TaskFlow"
    - Subtitle: `.login-subtitle` - "Sign in to continue"
    - Form Group: Email input
      - Label: `.form-label` - "Email"
      - Input: `.form-input` (type="email", id="loginEmail", placeholder="you@company.com")
    - Form Group: Password input
      - Label: `.form-label` - "Password"
      - Input: `.form-input` (type="password", id="loginPassword", placeholder="••••••••")
    - Form Group: Role selector
      - Label: `.form-label` - "Role"
      - Role Selector: `.role-selector`
        - Role Option: `.role-option.selected` (data-role="employee")
          - Radio: `.role-radio`
          - Info: `.role-info` - "Employee" / "View and manage your own tasks"
        - Role Option: `.role-option` (data-role="manager")
          - Radio: `.role-radio`
          - Info: `.role-info` - "Manager" / "View team overview and all employee tasks"
    - Button: `.btn.btn-primary.btn-full` (id="loginBtn") - "Sign in"

### App Page (`#appPage`, hidden by default)
- Header: `.header` (sticky)
  - Left Section: `.header-left`
    - Logo: `.logo` - "TaskFlow"
    - Project Badge: `.project-badge` (clickable)
      - Dot: `.project-dot`
      - Name: `.project-name` - "Project Alpha"
      - Dropdown icon (SVG)
  - Right Section: `.header-right`
    - User Menu: `.user-menu`
      - Avatar: `.user-avatar` (id="userAvatar")
      - Name: `#userName`
    - Logout Button: `.btn.btn-ghost` (id="logoutBtn", SVG icon)

## Views

### Employee View (`#employeeView`)
- Filters: `.filters` nav
  - Filter Tab: `.filter-tab.active` (data-filter="all") - "My Tasks" + count `#myTaskCount`
  - Filter Tab: `.filter-tab` (data-filter="in-progress") - "In Progress" + count
  - Filter Tab: `.filter-tab` (data-filter="done") - "Done" + count
  - Filter Tab: `.filter-tab` (data-filter="todo") - "Todo" + count
- Content: `.content`
  - Header: `.content-header`
    - Title: `.content-title` - "My Tasks"
    - Subtitle: `.content-subtitle` - "You have X active tasks"
  - Table Wrapper: `.table-wrapper`
    - Task Table: `.task-table`
      - Columns: ID (70px), Task, Status (100px), Priority (90px), Due (100px)
      - Body: `#myTasksTable` (dynamically rendered rows)

### Manager View (`#managerView`, hidden by default)
- Filters: `.filters` nav
  - Filter Tab: `.filter-tab.active` (data-filter="all") - "Team" + count `#teamTaskCount`
  - Filter Tab: `.filter-tab` (data-filter="in-progress") - "In Progress" + count
  - Filter Tab: `.filter-tab` (data-filter="done") - "Done" + count
  - Filter Tab: `.filter-tab` (data-filter="overdue") - "Overdue" + count
- Content: `.content`
  - Header: `.content-header`
    - Title: `.content-title` - "Team Overview"
    - Subtitle: `.content-subtitle` - "4 team members • 32 total tasks"
  - Stats Grid: `.stats-grid`
    - Stat Card 1: "Total Tasks" - 32, "+3 this week"
    - Stat Card 2: "In Progress" - 8, "Active now"
    - Stat Card 3: "Completed" - 12, "+5 this week"
    - Stat Card 4: "Overdue" - 2, "Needs attention"
  - Team Section Header: "Team Members"
  - Team Grid: `.team-grid` (id="teamGrid")
    - Employee Cards: `.employee-card` (4 cards)
      - Header: `.employee-header`
        - Avatar: `.employee-avatar`
        - Info: `.employee-info` (name + task stats)
      - Mini Table: `.task-mini-table`
        - Columns: Task, Status, Due
        - Shows up to 3 tasks per member
  - All Tasks Section Header: "All Tasks"
  - Table Wrapper: `.table-wrapper`
    - Task Table: `.task-table`
      - Columns: ID (70px), Task, Status (100px), Priority (90px), Owner (90px), Due (100px)
      - Body: `#allTasksTable` (dynamically rendered rows)

## Task Detail Panel

### Overlay: `.panel-overlay` (id="panelOverlay")
### Panel: `.panel` (id="panel", fixed right side, 480px)
- Header: `.panel-header`
  - Label: "Task details"
  - Close Button: `.panel-close` (id="panelClose", SVG X icon)
- Content: `.panel-content` (id="panelContent")
  - Task ID: `.panel-task-id` (monospace)
  - Task Title: `.panel-task-title`
  - Section: Status
    - Status Badge: `.status-badge`
  - Section: Properties
    - Priority row (with priority bar)
    - Owner row (avatar + name)
    - Due date row
  - Section: Labels (rendered as inline badges)
  - Divider: `.panel-divider`
  - Section: Description (`.panel-description`)
  - Section: Activity
    - Created date
    - Updated date
    - Comments count

## Interactive Elements

### Buttons
- `#loginBtn` - Sign in button
- `#logoutBtn` - Logout button (ghost style with icon)
- `.panel-close` - Panel close button

### Inputs
- `#loginEmail` - Email input (text)
- `#loginPassword` - Password input (password type)

### Clickable Elements
- `.role-option` (x2) - Role selection options
- `.filter-tab` (x4 per view) - Filter tabs
- `.project-badge` - Project selector
- `.user-menu` - User menu dropdown area
- `#panelOverlay` - Click to close panel
- Task table rows (`tr[data-task-id]`) - Click to open panel
- `.task-mini-table tbody tr` - Click to open panel (manager view)

### Status Badges (with dots)
- `.status-backlog` - Backlog status
- `.status-todo` - Todo status
- `.status-in-progress` - In Progress status
- `.status-done` - Done status

### Priority Indicators
- `.priority-high` - Red bar
- `.priority-medium` - Orange bar
- `.priority-low` - Blue bar
```

## 2. CSS Tokens
```
# CSS Tokens

## Custom Properties from `:root`

### Color Values
- `--bg: oklch(99% 0.002 240)` - Page background (near white with blue tint)
- `--surface: oklch(100% 0 0)` - Surface/card background (pure white)
- `--fg: oklch(18% 0.012 250)` - Foreground text (near black with blue tint)
- `--muted: oklch(54% 0.012 250)` - Muted text (gray with blue tint)
- `--border: oklch(92% 0.005 250)` - Border color (light gray with blue tint)
- `--accent: oklch(58% 0.18 255)` - Accent color (blue)

### Font Families
- `--font-display: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif`
- `--font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- `--font-mono: 'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace`

### Border Radius Values
- `--radius-sm: 6px`
- `--radius-md: 8px`
- `--radius-lg: 12px`

## All oklch Color Values Used Throughout the File

### From `:root` (already listed above)
- `oklch(99% 0.002 240)` - --bg
- `oklch(100% 0 0)` - --surface
- `oklch(18% 0.012 250)` - --fg
- `oklch(54% 0.012 250)` - --muted
- `oklch(92% 0.005 250)` - --border
- `oklch(58% 0.18 255)` - --accent

### Status Colors
- `oklch(45% 0.15 150)` - Stat change positive green
- `oklch(58% 0.18 25)` - Stat change negative red / Priority high / Overdue date

### Status Badge Colors
- `oklch(94% 0.008 240)` - .status-backlog background
- `oklch(45% 0.015 240)` - .status-backlog text and dot
- `oklch(94% 0.008 260)` - .status-todo background
- `oklch(50% 0.02 260)` - .status-todo text and dot
- `oklch(90% 0.12 260)` - .status-in-progress background
- `oklch(55% 0.18 260)` - .status-in-progress text and dot
- `oklch(90% 0.1 150)` - .status-done background
- `oklch(45% 0.15 150)` - .status-done text and dot

### Priority Colors
- `oklch(58% 0.18 25)` - .priority-high (red)
- `oklch(65% 0.15 45)` - .priority-medium (orange)
- `oklch(60% 0.1 200)` - .priority-low (blue)

### Avatar Colors
- `oklch(55% 0.18 260)` - .avatar-1 (blue)
- `oklch(50% 0.18 150)` - .avatar-2 (green)
- `oklch(60% 0.15 45)` - .avatar-3 (orange)
- `oklch(55% 0.18 25)` - .avatar-4 (red)

### Other
- `oklch(0% 0 0 / 0.4)` - .panel-overlay background (black with 40% alpha)
- `oklch(99% 0.002 240 / 0.5)` - .role-option.selected background (same as --bg with 50% alpha)

### Due Date Colors
- `oklch(58% 0.18 25)` - .due-date.overdue (red)
- `oklch(65% 0.15 45)` - .due-date.soon (orange)

## Responsive Breakpoints (@media queries)

### Tablet and below (max-width: 768px)
```css
@media (max-width: 768px) {
  .header { padding: 12px 16px; }
  .filters { padding: 12px 16px; }
  .content { padding: 16px; }
  .task-table th:nth-child(3),
  .task-table td:nth-child(3),
  .task-table th:nth-child(5),
  .task-table td:nth-child(5) { display: none; }
  .task-table th:first-child,
  .task-table td:first-child { padding-left: 16px; }
  .task-table th, .task-table td { padding: 10px 12px; }
  .panel { width: 100%; }
  .content-title { font-size: 22px; }
  .stat-value { font-size: 26px; }
}
```

### Mobile (max-width: 480px)
```css
@media (max-width: 480px) {
  .header-left { gap: 8px; }
  .project-name { display: none; }
  .task-table th:nth-child(4),
  .task-table td:nth-child(4) { display: none; }
}
```
```

## 3. Interaction Flow
```
# Interaction Flow

## Login Flow

### Email Input
- User enters email in `#loginEmail` input field (type="email")
- Placeholder text: "you@company.com"
- No validation on format, only checks if empty

### Role Selection
- Two role options displayed: "Employee" and "Manager"
- Default selection: "Employee" (`.role-option.selected` with data-role="employee")
- Clicking a `.role-option` updates `selectedRole` variable
- Visual feedback: selected option gets `.selected` class with accent border color
- Note: Per approved plan, role selection removed in final implementation

### Password Input
- User enters password in `#loginPassword` input field (type="password")
- Placeholder text: "••••••••"
- Password is NOT validated (only email and role matter in prototype)

### Login Button Click (`#loginBtn`)
1. Reads email from `#loginEmail` input
2. Validates email is not empty (shows alert if empty)
3. Determines user based on role:
   - If `selectedRole === 'manager'`: assigns `users['manager@company.com']`
   - If `selectedRole === 'employee'`: assigns `users[email]` if exists, otherwise defaults to `users['alex@company.com']`
4. Calls `showApp()` function
5. Hides `#loginPage` (adds `.hidden` class)
6. Shows `#appPage` (removes `.hidden` class)
7. Updates header with user info (avatar initials, avatar class, name)
8. Renders appropriate view based on `currentUser.role`:
   - "manager" → shows `#managerView`, hides `#employeeView`, calls `renderManagerView()`
   - "employee" → shows `#employeeView`, hides `#managerView`, calls `renderEmployeeView()`

## View Switching
- Determined at login based on user role from database (no runtime switching)
- Manager view shows: Team filter tabs, stats grid, team member cards, all tasks table with owner column
- Employee view shows: My tasks filter tabs, own tasks table without owner column

## Task Filtering
- Filter tabs update active state on click
- Employee filters: all, in-progress, done, todo
- Manager filters: all, in-progress, done, overdue

## Task Row Click → Panel Open
- Task rows with `data-task-id` trigger `openPanel()` on click
- Panel renders task details, status, properties, labels, description, activity
- Panel slides in from right via `.open` class

## Panel Close
- Click overlay, close button, or press Escape to close panel
- Removes `.open` class from panel and overlay

## Logout Flow
1. Sets `currentUser = null`
2. Hides app page, shows login page
3. Clears input fields
4. (Final implementation) Invalidates server-side session, clears localStorage

## Session Persistence (Final Implementation)
- Frontend stores session ID in localStorage
- On page load, check `X-Session-Id` header against PostgreSQL sessions table
- 24h session expiry enforced server-side
```

## 4. Seed Data
See [docs/seed-data.json](./seed-data.json) for extracted prototype data formatted for PostgreSQL seeding.
