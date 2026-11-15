/**
 * FlappyBird.io Autopilot Extension
 * Injected in MAIN world - Direct JS heap state access & trajectory prediction
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__FLAPPY_AUTOPILOT_INITIALIZED__) return;
  window.__FLAPPY_AUTOPILOT_INITIALIZED__ = true;

  console.log('%c[FlappyPilot] FlappyBird.io Autopilot Loaded (MAIN World)', 'background: #111; color: #00ff66; font-weight: bold; padding: 4px 8px; border-radius: 4px;');

  // Configuration state
  const config = {
    enabled: true,
    autoRestart: true,
    mode: 'perfect', // 'perfect' | 'humanized'
    lastFlapTime: 0,
    minFlapIntervalMs: 80, // Physical minimum cooldown
    safetyTopMargin: 0.08,
    safetyBottomMargin: 0.08,
    jumpPeakHeight: 0.196, // Theoretical v0^2 / 2g (1.4^2 / 10)
    gravity: 5.0
  };

  // Telemetry state for HUD
  const telemetry = {
    state: 'waiting',
    score: 0,
    birdY: 0,
    birdVy: 0,
    targetY: 0,
    action: 'idle',
    lastRestartAttempt: 0
  };

  // Helper: Get Game Instance
  function getGame() {
    return window.__game || null;
  }

  // Trigger Flap
  function triggerFlap(game) {
    const now = performance.now();
    if (now - config.lastFlapTime < config.minFlapIntervalMs) return false;
    config.lastFlapTime = now;

    // Method 1: Synthesize standard KeyboardEvent (triggers audio + replay logging)
    const keyEvent = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      keyCode: 32,
      which: 32,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(keyEvent);

    // Method 2: Fallback direct call if event dispatch didn't trigger
    if (game && typeof game.flap === 'function') {
      try {
        game.flap();
      } catch (e) {
        // Ignored
      }
    }
    return true;
  }

  // Trigger Restart on Game Over
  function triggerRestart() {
    const keyEvent = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      keyCode: 32,
      which: 32,
      bubbles: true,
      cancelable: true
    });
    window.dispatchEvent(keyEvent);
  }

  // Main Autopilot AI Loop
  function evaluateAutopilot() {
    const game = getGame();
    if (!game) {
      telemetry.state = 'Waiting for game engine...';
      return;
    }

    const state = game.currentState;
    telemetry.state = state;
    telemetry.score = game.score || 0;

    // Handle GET READY state -> Auto start
    if (state === 'getready') {
      if (config.enabled) {
        telemetry.action = 'Auto-starting...';
        triggerFlap(game);
      }
      return;
    }

    // Handle GAME OVER state -> Auto restart
    if (state === 'gameover') {
      telemetry.action = 'Game over';
      if (config.enabled && config.autoRestart) {
        const now = performance.now();
        // Wait 1.3s after death to let screen shake & medal animation settle
        if (now - telemetry.lastRestartAttempt > 1300) {
          telemetry.lastRestartAttempt = now;
          telemetry.action = 'Restarting...';
          triggerRestart();
        }
      }
      return;
    }

    // Active PLAY state
    if (state !== 'play') return;
    if (!config.enabled) {
      telemetry.action = 'Manual control';
      return;
    }

    // Extract snapshot coordinates
    const snap = game.snapshot || {};
    const birdY = typeof snap.birdY === 'number' ? snap.birdY : (game.birdY / 1048576);
    const pipes = snap.pipes || [];

    // Calculate velocity (units/sec)
    let birdVy = 0;
    if (typeof game.birdVy === 'number') {
      birdVy = game.birdVy / 1048576;
    }
    telemetry.birdY = birdY;
    telemetry.birdVy = birdVy;

    // 1. Locate relevant pipe
    // The bird's x is 0. Pipes scroll from positive x towards negative.
    // Pipe width is ~0.16. Collision boundary is [-0.15, 0.15].
    let targetPipe = null;
    for (const p of pipes) {
      // Find the first pipe whose trailing edge hasn't fully passed the bird
      if (p.x > -0.18) {
        targetPipe = p;
        break;
      }
    }

    let targetY = 0.0; // Default hovering target when no pipes are near
    let halfGap = 0.25;

    if (targetPipe) {
      targetY = targetPipe.gapY;
      halfGap = targetPipe.halfGap || 0.235;

      // Humanized jitter mode
      if (config.mode === 'humanized') {
        targetY += Math.sin(performance.now() / 400) * 0.025;
      }
    } else {
      // Starting phase: hover gently around y = 0.0
      targetY = 0.0;
    }

    telemetry.targetY = targetY;

    // 2. Flight Safety Boundaries
    const safeCeiling = targetPipe ? (targetPipe.gapY + halfGap - config.safetyTopMargin) : 0.75;
    const safeFloor = targetPipe ? (targetPipe.gapY - halfGap + config.safetyBottomMargin) : -0.7;

    // Projected peak if we flap right now
    const projectedPeak = birdY + config.jumpPeakHeight;

    // 3. Flap Decision Logic
    let shouldFlap = false;

    // Critical Emergency: Approaching floor pipe or ground
    if (birdY <= safeFloor) {
      shouldFlap = true;
      telemetry.action = 'Emergency floor dodge!';
    }
    // Approaching pipe horizontally
    else if (targetPipe && targetPipe.x < 0.65) {
      // If we are below the target center and falling or level
      if (birdY < targetY && birdVy <= 0.15) {
        // Verify ceiling guard: will a flap smash the top pipe?
        if (projectedPeak <= safeCeiling) {
          shouldFlap = true;
          telemetry.action = 'Climbing to gap center';
        } else {
          telemetry.action = 'Ceiling guard holding flap';
        }
      } else {
        telemetry.action = 'Coasting through gap';
      }
    }
    // Distant pipe or hover phase
    else {
      // Maintain hovering altitude around targetY
      if (birdY < targetY - 0.08 && birdVy <= 0.0) {
        if (projectedPeak <= safeCeiling) {
          shouldFlap = true;
          telemetry.action = 'Hovering adjustment';
        }
      } else {
        telemetry.action = 'Gliding';
      }
    }

    if (shouldFlap) {
      triggerFlap(game);
    }
  }

  // Run AI loop aligned with display refresh
  function gameLoop() {
    try {
      evaluateAutopilot();
    } catch (e) {
      console.error('[FlappyPilot Loop Error]', e);
    }
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  // Keyboard shortcut listener ('A' to toggle autopilot)
  window.addEventListener('keydown', (e) => {
    // Only toggle if not typing in an input/textarea
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.code === 'KeyA') {
      config.enabled = !config.enabled;
      updateHud();
      console.log(`[FlappyPilot] Autopilot ${config.enabled ? 'ENABLED' : 'DISABLED'}`);
    }
  });

  // ==========================================
  // HUD (On-Screen Heads-Up Display)
  // ==========================================
  let hudContainer = null;

  function createHud() {
    if (document.getElementById('flappy-autopilot-hud')) return;

    hudContainer = document.createElement('div');
    hudContainer.id = 'flappy-autopilot-hud';
    hudContainer.innerHTML = `
      <style>
        #flappy-autopilot-hud {
          position: fixed;
          top: 14px;
          right: 14px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          background: rgba(18, 22, 28, 0.92);
          backdrop-filter: blur(8px);
          color: #e2e8f0;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
          width: 250px;
          user-select: none;
          font-size: 13px;
          line-height: 1.4;
          transition: all 0.2s ease;
        }
        #flappy-autopilot-hud.minimized {
          width: auto;
          padding: 6px 12px;
        }
        .fp-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .fp-title {
          font-weight: 700;
          font-size: 13px;
          color: #38bdf8;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .fp-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px #22c55e;
        }
        .fp-status-dot.off {
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
        }
        .fp-row {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          color: #94a3b8;
          font-size: 12px;
        }
        .fp-val {
          color: #f1f5f9;
          font-weight: 600;
          font-family: monospace;
        }
        .fp-ctrl {
          margin-top: 10px;
          display: flex;
          gap: 6px;
        }
        .fp-btn {
          flex: 1;
          background: #2563eb;
          color: white;
          border: none;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .fp-btn:hover {
          background: #1d4ed8;
        }
        .fp-btn.off {
          background: #475569;
        }
        .fp-checkbox-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 12px;
          color: #cbd5e1;
        }
        .fp-hint {
          margin-top: 8px;
          font-size: 11px;
          color: #64748b;
          text-align: center;
        }
      </style>
      <div class="fp-hdr">
        <div class="fp-title">
          <div id="fp-dot" class="fp-status-dot"></div>
          FlappyPilot
        </div>
        <span id="fp-score-tag" style="font-weight: bold; color: #facc15;">0 pts</span>
      </div>
      <div id="fp-body">
        <div class="fp-row">
          <span>State:</span>
          <span id="fp-state" class="fp-val">waiting</span>
        </div>
        <div class="fp-row">
          <span>Action:</span>
          <span id="fp-action" class="fp-val" style="color: #38bdf8;">idle</span>
        </div>
        <div class="fp-row">
          <span>Bird Altitude:</span>
          <span id="fp-bird-y" class="fp-val">0.00</span>
        </div>
        <div class="fp-row">
          <span>Target Gap:</span>
          <span id="fp-target-y" class="fp-val">0.00</span>
        </div>
        <div class="fp-checkbox-row">
          <input type="checkbox" id="fp-auto-restart" ${config.autoRestart ? 'checked' : ''}>
          <label for="fp-auto-restart">Auto Restart on Death</label>
        </div>
        <div class="fp-ctrl">
          <button id="fp-toggle-btn" class="fp-btn">Toggle (A)</button>
          <button id="fp-mode-btn" class="fp-btn" style="background: #334155;">Mode: Perfect</button>
        </div>
        <div class="fp-hint">Press [A] to toggle Autopilot</div>
      </div>
    `;

    document.body.appendChild(hudContainer);

    // Event bindings for HUD
    document.getElementById('fp-toggle-btn').addEventListener('click', () => {
      config.enabled = !config.enabled;
      updateHud();
    });

    document.getElementById('fp-mode-btn').addEventListener('click', () => {
      config.mode = config.mode === 'perfect' ? 'humanized' : 'perfect';
      document.getElementById('fp-mode-btn').innerText = `Mode: ${config.mode === 'perfect' ? 'Perfect' : 'Humanized'}`;
    });

    document.getElementById('fp-auto-restart').addEventListener('change', (e) => {
      config.autoRestart = e.target.checked;
    });
  }

  function updateHud() {
    if (!hudContainer) return;
    const dot = document.getElementById('fp-dot');
    const toggleBtn = document.getElementById('fp-toggle-btn');
    const stateEl = document.getElementById('fp-state');
    const actionEl = document.getElementById('fp-action');
    const birdYEl = document.getElementById('fp-bird-y');
    const targetYEl = document.getElementById('fp-target-y');
    const scoreTag = document.getElementById('fp-score-tag');

    if (dot) {
      dot.className = `fp-status-dot ${config.enabled ? '' : 'off'}`;
    }
    if (toggleBtn) {
      toggleBtn.className = `fp-btn ${config.enabled ? '' : 'off'}`;
      toggleBtn.innerText = config.enabled ? 'Disable (A)' : 'Enable (A)';
    }
    if (stateEl) stateEl.innerText = telemetry.state;
    if (actionEl) actionEl.innerText = telemetry.action;
    if (birdYEl) birdYEl.innerText = telemetry.birdY.toFixed(2);
    if (targetYEl) targetYEl.innerText = telemetry.targetY.toFixed(2);
    if (scoreTag) scoreTag.innerText = `${telemetry.score} pts`;
  }

  // Periodic HUD update loop
  setInterval(() => {
    if (!hudContainer && document.body) {
      createHud();
    }
    updateHud();
  }, 100);

})();
