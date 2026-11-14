# Burnout Radarr

> **Catch the signals. Find your balance.**

Burnout Radarr is an intuitive, privacy-first productivity and cognitive wellness companion designed specifically for **students** and **software developers**. By tracking focus sessions, sleep patterns, break habits, and self-reported fatigue, Burnout Radarr provides real-time visibility into your cognitive workload and offers actionable, science-informed recommendations to help prevent burnout before it happens.

---

## 🌟 Key Features

### 🎯 Tailored Dual Modes
- **Student Mode ("Your Study Space")**:
  - Organize focus by course subjects (e.g., Mathematics, Data Structures, History).
  - Manage study task checklists with estimated durations.
  - Visualize study time distribution across subjects.
- **Developer Mode ("Developer Command Centre")**:
  - Track time across projects and repositories.
  - Maintain categorized work logs (Features, Bugfixes, Refactoring, Documentation, Architecture).
  - Analyze engineering time allocation.

### 🧠 Cognitive Fatigue Index (CFI) Engine
- **Deterministic & Rule-Based**: Fully transparent mathematical scoring (0–100) with zero black-box AI.
- **Weighted Core Metrics**:
  - **Self-Reported Fatigue (50%)**: Direct user check-in on a 1–10 scale.
  - **Sleep Deficit (25%)**: Evaluated against an 8-hour experimental reference baseline.
  - **Break Deficit (25%)**: Assessed using a sustainable work-to-rest ratio (~1 min break per 5 min focus).
- **Risk Categorization**:
  - 🟢 **Low Risk (0–33)**: Optimal cognitive reserve; great condition for deep work.
  - 🟡 **Moderate Risk (34–66)**: Emerging cognitive strain; pacing and micro-breaks recommended.
  - 🔴 **High Risk (67–100)**: Significant fatigue detected; recovery and cognitive rest advised.
- **Actionable Guidance**: Generates contextual explanations and prioritized recovery strategies for each session.

### ⏱️ Integrated Focus & Break Timer
- Customizable session durations (e.g., 25-minute Pomodoro, 50-minute deep work cycles).
- Seamless switching between **Focus** and **Break** phases.
- Gentle periodic break reminders with snooze capability.
- Post-session reflection dialog to capture perceived fatigue, sleep hours, and journal notes.

### 📊 Comprehensive Insights & History
- **7-Day Activity Trends**: Daily focus minute tracking with comparative charts.
- **Effort Distribution**: Visual slice breakdowns of subjects, projects, and work categories powered by Recharts.
- **Session History Log**: Multi-dimensional filtering by mode, subject/project, duration, and date range.
- **Session Details**: Deep-dive into each session's focus ratio, sleep log, fatigue score, and CFI breakdown.
- **One-Click CSV Export**: Easily download your complete session history for personal spreadsheets or journaling.

### 🎨 Design & Experience
- **Adaptive Themes**: Full support for Light, Dark, and System appearance.
- **100% Private & Offline-First**: All session data, tasks, and settings are saved locally in `localStorage`—no accounts, no tracking, and zero telemetry.

---

## 📐 How the Cognitive Fatigue Index (CFI) Works

The CFI engine evaluates session data deterministically:

$$\text{CFI Score} = \text{Fatigue Points (max 50)} + \text{Sleep Points (max 25)} + \text{Break Points (max 25)}$$

| Component | Weight | Calculation Basis |
| :--- | :---: | :--- |
| **Perceived Fatigue** | **50%** | Rescaled from 1–10 self-rating: $\frac{\text{Rating} - 1}{9} \times 50$ |
| **Sleep Deficit** | **25%** | Scaled deficit relative to 8 hours baseline: $\max\left(0, \frac{8 - \text{Sleep Hours}}{8}\right) \times 25$ |
| **Break Deficit** | **25%** | Shortfall relative to 1:5 break-to-focus ratio ($\text{Target} = \frac{\text{Focus Min}}{5}$): $\max\left(0, \frac{\text{Target} - \text{Break Min}}{\text{Target}}\right) \times 25$ |

> [!NOTE]
> The Cognitive Fatigue Index is an exploratory productivity and wellness heuristic. It is deterministic, educational, and non-diagnostic; it does not constitute medical advice.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite](https://vitejs.dev/)
- **Visualizations**: [Recharts](https://recharts.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Modern CSS variables with custom theming tokens
- **Persistence**: Browser `localStorage` (Offline-first)

---

## 📂 Project Structure

```text
burnout-radarr/
├── public/                 # Static assets (favicons, SVG icons)
├── src/
│   ├── assets/             # Brand images and SVGs
│   ├── components/         # UI Components
│   │   ├── Charts.tsx              # Reusable Recharts implementations
│   │   ├── Dashboard.tsx           # Main workspace dashboard & mode views
│   │   ├── DashboardCharts.tsx     # Activity and subject/project charts
│   │   ├── EntryDialog.tsx         # Task and project create/edit modal
│   │   ├── InsightsPages.tsx       # History, Insights, Recovery, Settings
│   │   ├── SessionDetailsDialog.tsx# Session breakdown modal
│   │   ├── SessionDialogs.tsx      # Timer and session setup modals
│   │   └── Sidebar.tsx             # Navigation sidebar
│   ├── features/
│   │   └── cfi/                    # Cognitive Fatigue Index engine & tests
│   │       ├── calculateCFI.ts     # Pure scoring algorithm & validation
│   │       └── calculateCFI.test.ts# CFI unit test suite
│   ├── services/           # Application state and storage
│   │   ├── app-state.ts            # Type definitions, defaults & demo data
│   │   ├── cfi.ts                  # CFI service integration
│   │   └── storage.ts              # LocalStorage read/write handling
│   ├── types/              # Core domain models and interfaces
│   ├── App.tsx             # Root application orchestrator
│   ├── App.css             # Application-wide theme styles
│   └── main.tsx            # React application entry point
├── package.json            # Dependencies and scripts
└── vite.config.ts          # Vite configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher recommended) and npm installed:

```bash
node -v
npm -v
```

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/burnout-radarr.git
   cd burnout-radarr
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

### Running Locally

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to the local URL displayed in the terminal (typically `http://localhost:5173`).

---

## 📜 Available Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development** | `npm run dev` | Runs the Vite dev server with Hot Module Replacement (HMR). |
| **Build** | `npm run build` | Runs TypeScript type checking (`tsc -b`) and bundles for production with Vite. |
| **Preview** | `npm run preview` | Locally serves the production build from `dist/`. |
| **Lint** | `npm run lint` | Runs ESLint across the codebase. |

---

## 🔒 Privacy & Local Storage

Your data belongs strictly to you:
- **No Remote Telemetry**: No third-party tracking scripts or analytics cookies.
- **Local Storage**: All session logs, tasks, projects, and user preferences remain on your machine in browser storage.
- **Data Portability**: Export your logs as `.csv` at any time from the **Focus sessions** page, or reset demo data via **Settings**.

---

## 🤝 Contributing

Contributions, feedback, and suggestions are welcome!

1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes (`git commit -m 'Add some amazing feature'`).
4. Push to the branch (`git push origin feature/amazing-feature`).
5. Open a Pull Request.

---

## 📄 License

This project is open-source. Please check the repository for license details or include your preferred license (e.g., MIT).
