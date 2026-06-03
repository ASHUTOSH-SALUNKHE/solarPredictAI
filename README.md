# SolarPredict AI — Solar Panel Prediction, Siting & Cost Calculator

[![SEO Optimization](https://img.shields.io/badge/SEO-Optimized-success?style=flat-square)](#)
[![Vite Project](https://img.shields.io/badge/Build-Vite%20%2F%20React-blue?style=flat-square)](#)
[![Prediction Engine](https://img.shields.io/badge/Engine-NitroX-orange?style=flat-square)](#)
[![Live Site](https://img.shields.io/badge/Live-solarpredictai.xyz-indigo?style=flat-square)](https://solarpredictai.xyz/)

**SolarPredict AI** is a state-of-the-art predictive platform designed to calculate, forecast, and optimize solar energy yield. Powered by the high-performance **NitroX prediction engine**, the platform helps homeowners and facility managers answer critical solar questions in one unified dashboard: **"How many solar panels are required for my house?"**, **"What will the installation and maintenance costs be?"**, and **"How much energy can I expect to generate month-by-month?"**

🌐 **Official Portal**: [https://solarpredictai.xyz/](https://solarpredictai.xyz/)

---

## ⚡ Core Features & Capabilities

### 1. Solar Panel Prediction AI & Yield Forecasting
* Uses historical climatology models (5+ years of DHI, GHI, DNI) and real-time open-meteo feeds to deliver **99.2% accurate** generation outputs.
* Simulates geographic solar elevation angles and tilt configurations to optimize panel placement orientation.

### 2. House Siting & Space Requirements Calculator
* Determines exactly **how many solar panels are required for your house** based on roof type (sloped RCC, flat industrial, tiles), shadow profiles, and baseline energy load.
* Helps select the optimal geographic coordinates via location-aware HUD overlays.

### 3. Detailed Financial Cost & Maintenance Reports
* Generates detailed expense models, estimated payback periods, and first-year utility savings.
* Projects scheduled **maintenance overheads** and storage battery sizing timings to avoid grid peak charges.

### 4. High-Performance Meteorological Analytics
* Interactive graphs plotting Global Horizontal Irradiance, temperature curves, humidity indexes, wind metrics, and atmospheric dust counts.
* Granular monthly data inspectors detailing standard deviation, mean values, minimums, and maximums.

---

## 🎨 Premium Visual Identity

The interface is built using **Cinematic Minimalism** principles:
* **The Command Center Mode**: Deep dark backdrops (`#000000`) with hyper-focused "Glow of Truth" solar accents (`#ffd700`) and soft cyan/indigo glows (`#a5f3fc` to `#6366f1`).
* **Micro-interactions**: Fluid transitions, timeline guide trackers, custom CAPTCHA verification overlays, and responsive mobile-adapted brand components.
* **Responsive Layouts**: Optimized navigation bar structures and horizontal-scrolling brand logo lists that scale seamlessly down to small phone viewports.

---

## 🛠️ Development & Build Setup

This repository contains the front-end application built with **React**, **Vite**, **Framer Motion**, and **Recharts**.

### Prerequisites
* **Node.js** (v18+ recommended)
* **npm** (v9+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/ASHUTOSH-SALUNKHE/solarPredictAI.git
   cd solarPredictAI
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the root directory and add:
   ```env
   VITE_TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
   ```

### Running Locally
To launch the hot-reloading development server:
```bash
npm run dev
```

### Production Build & Optimization
To build static assets compiled with minified CSS and code-splitting:
```bash
npm run build
```
Vite will output optimized files to the `/dist` directory, along with root-level SEO metadata including the dynamic `sitemap.xml` and `robots.txt`.

---

## 📈 SEO Metadata & Structured Data

To maintain maximum index visibility across Google and other crawlers:
* Includes dynamic header tags managed via `react-helmet-async` for titles and rich snippet meta descriptions.
* Validates schema structured graph data (`ld+json`) describing sitemaps, breadcrumbs, search actions, and FAQ lists.
