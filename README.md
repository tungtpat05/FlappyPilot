# FlappyPilot — Intelligent Autopilot for FlappyBird.io

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Target](https://img.shields.io/badge/Target-flappybird.io-green.svg)](https://flappybird.io/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

**FlappyPilot** is a lightweight, zero-latency browser extension for [flappybird.io](https://flappybird.io/). It hooks directly into the client-side game engine in the main page context, reading real-time flight telemetry and calculating obstacle avoidance vectors to pilot the bird through pipe gaps.

![alt text](image.png)

---

## Features

* **Zero-Latency Trajectory Calculation:** Directly reads live physics variables (`birdY`, `birdVy`, `pipes[]`) from the game runtime instead of using slow pixel processing.
* **Ceiling & Floor Guard:** Predictive peak-jump physics preventing the bird from crashing into the top pipe or bottom obstacles.
* **On-Screen Flight HUD:** Live telemetry panel displaying altitude, target gap elevation, action state, and current score.
* **Auto-Start & Auto-Restart:** Automatically initiates flights and restarts sessions after game over.
* **Dual Flight Modes:** 
  * `Perfect Mode`: Mathematical trajectory precision for maximum scores.
  * `Humanized Mode`: Applies micro-variations and subtle sine-wave oscillations mimicking human reflexes.
* **Hotkeys:** Toggle autopilot instantly with the `[ A ]` key.

---

## Installation Guide (from GitHub)

### Step 1: Download the Repository

You can install FlappyPilot either via Git or by downloading the ZIP file directly:

#### Option A: Download as ZIP (Recommended for non-developers)
1. Click the green **Code** button at the top of this GitHub repository page.
2. Select **Download ZIP**.
3. Extract the downloaded `.zip` file to a folder on your computer (e.g., `Documents/FlappyPilot` or your preferred location).

#### Option B: Clone via Git
Open your terminal and run:
```bash
git clone https://github.com/your-username/flappypilot.git
```

---

### Step 2: Load the Extension into Your Browser

FlappyPilot works on all Chromium-based browsers, including **Google Chrome**, **Brave**, **Microsoft Edge**, and **Opera**.

1. Open your browser and go to the Extensions page:
   * **Chrome / Brave:** Navigate to `chrome://extensions/`
   * **Edge:** Navigate to `edge://extensions/`
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left area.
4. Select the folder containing `manifest.json` (the folder you extracted or cloned in Step 1).
5. The **FlappyBird.io Autopilot** card will appear in your installed extensions list.

---

## How to Use

1. Navigate to [https://flappybird.io/](https://flappybird.io/).
2. The **FlappyPilot HUD** panel will automatically mount at the top-right corner of the game screen.
3. Use the following controls:

| Control | Action |
| :--- | :--- |
| **`[ A ]` Key** | Toggle Autopilot ON / OFF instantly |
| **Toggle Button** | Click on the HUD to enable or disable autopilot |
| **Mode Button** | Switch between `Perfect` and `Humanized` flight modes |
| **Auto Restart** | Check / uncheck to automatically replay 1.3s after death |

---

## Technical Mechanism (How It Works)

Unlike traditional bots that capture screen frames (`getImageData`) which suffer from frame drops and latency, FlappyPilot operates via **Main World Hooking**:

```
[ flappybird.io Runtime ]
         │
         ▼
 ┌───────────────┐
 │ window.__game │ ◄── [ FlappyPilot (MAIN World Context) ]
 └───────┬───────┘                    │
         │                            │ Reads: birdY, birdVy, pipes[x, gapY, halfGap]
         │                            │ Computes: Δh = v0² / 2g ≈ 0.196
         │                            │
         ▼                            ▼
 [ Physics Engine ] ◄──── Synthetic KeyboardEvent('Space')
```

1. **Context Integration:** Manifest V3 executes the script in `"world": "MAIN"`, granting access to the game instance `window.__game`.
2. **Predictive Peak Flight:** Flap impulses are governed by physics equations:
   $$\Delta h = \frac{v_0^2}{2g} \approx 0.196$$
   If jumping from current altitude would exceed `gapY + halfGap - safetyMargin`, the impulse is held until descent brings the bird within safe clearance.
3. **Replay Integrity:** Inputs are dispatched via standard DOM events (`KeyboardEvent`), ensuring the game engine logs each action into its deterministic replay buffer (`flaps[]`) with authentic sound synthesis.

---

## Troubleshooting & FAQ

* **The HUD does not appear:** Refresh the page (`Ctrl + F5`) after installing or updating the extension.
* **Autopilot isn't jumping:** Ensure the status dot in the HUD is **Green** (Active). Press `[ A ]` to toggle if it shows **Red** (Disabled).
* **Updating the extension:** Whenever files are updated, go to `chrome://extensions/` and click the **Reload** (circular arrow) icon on the FlappyPilot card.

---

## Disclaimer

This project is created for educational, reverse-engineering, and automation research purposes.
