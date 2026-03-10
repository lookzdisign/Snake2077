import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";

const COLS = 20, ROWS = 20, CELL = 20;
const W = COLS * CELL, H = ROWS * CELL;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const mkSnake = () => [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];

const mkFood = (snake) => {
  let p;
  do {
    p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
};

export default function App() {
  const canvasRef = useRef(null);
  const g = useRef({
    snake: mkSnake(), dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
    food: null, particles: [], trail: [],
    running: false, paused: false,
    score: 0, best: 0, level: 1, eaten: 0,
  });
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const elRef = useRef(0);
  const [screen, setScreen] = useState("start");
  const [hud, setHud] = useState({ score: 0, best: 0, level: 1, eaten: 0 });

  const refreshHud = () => {
    const s = g.current;
    setHud({ score: s.score, best: s.best, level: s.level, eaten: s.eaten });
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = g.current;

    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, W, H);

    // Grid dots
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let x = 0; x < COLS; x++)
      for (let y = 0; y < ROWS; y++)
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);

    // Trail
    s.trail.forEach(t => {
      ctx.fillStyle = `rgba(0,255,224,${t.life * 0.22})`;
      const p = 4 + (1 - t.life) * 2;
      ctx.fillRect(t.x * CELL + p, t.y * CELL + p, CELL - p * 2, CELL - p * 2);
    });

    // Food
    if (s.food) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      const fp = 3 - pulse * 1.5;
      ctx.shadowColor = "#ff2d6b";
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.fillStyle = "#ff2d6b";
      ctx.fillRect(s.food.x * CELL + fp, s.food.y * CELL + fp, CELL - fp * 2, CELL - fp * 2);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(s.food.x * CELL + fp + 2, s.food.y * CELL + fp + 2, 3, 3);
      ctx.shadowBlur = 0;
    }

    // Snake body
    s.snake.forEach((seg, i) => {
      const isHead = i === 0;
      const t = i / s.snake.length;
      if (isHead) {
        ctx.shadowColor = "#00ffe0";
        ctx.shadowBlur = 18;
        ctx.fillStyle = "#00ffe0";
      } else {
        ctx.shadowBlur = 0;
        const r = Math.round(t * 123);
        const gg = Math.round(255 - t * 160);
        const b = Math.round(224 + t * 31);
        ctx.fillStyle = `rgba(${r},${gg},${b},${0.9 - t * 0.4})`;
      }
      const pad = isHead ? 1 : 2 + t * 2;
      roundRect(ctx, seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, isHead ? 3 : 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Eyes
    const h = s.snake[0];
    const d = s.dir;
    ctx.fillStyle = "#04040a";
    if (d.x === 1) {
      ctx.beginPath(); ctx.arc(h.x * CELL + CELL - 5, h.y * CELL + 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x * CELL + CELL - 5, h.y * CELL + CELL - 5, 2, 0, Math.PI * 2); ctx.fill();
    } else if (d.x === -1) {
      ctx.beginPath(); ctx.arc(h.x * CELL + 5, h.y * CELL + 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x * CELL + 5, h.y * CELL + CELL - 5, 2, 0, Math.PI * 2); ctx.fill();
    } else if (d.y === -1) {
      ctx.beginPath(); ctx.arc(h.x * CELL + 5, h.y * CELL + 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x * CELL + CELL - 5, h.y * CELL + 5, 2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(h.x * CELL + 5, h.y * CELL + CELL - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x * CELL + CELL - 5, h.y * CELL + CELL - 5, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Particles
    s.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }, []);

  const die = useCallback(() => {
    g.current.running = false;
    setScreen("over");
    refreshHud();
  }, []);

  const tick = useCallback(() => {
    const s = g.current;
    s.dir = { ...s.nextDir };
    const head = {
      x: (s.snake[0].x + s.dir.x + COLS) % COLS,
      y: (s.snake[0].y + s.dir.y + ROWS) % ROWS,
    };

    if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      die(); return;
    }

    s.snake.unshift(head);
    s.trail.push({ x: head.x, y: head.y, life: 1 });

    if (s.food && head.x === s.food.x && head.y === s.food.y) {
      s.score += 10 * s.level;
      s.eaten++;
      if (s.eaten % 5 === 0) s.level++;
      if (s.score > s.best) s.best = s.score;
      s.food = mkFood(s.snake);
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1 + Math.random() * 3;
        s.particles.push({
          x: head.x * CELL + CELL / 2, y: head.y * CELL + CELL / 2,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
          life: 1, size: 2 + Math.random() * 3,
          color: Math.random() > 0.5 ? "#00ffe0" : "#ff2d6b",
        });
      }
      refreshHud();
    } else {
      s.snake.pop();
      if (s.trail.length) s.trail.shift();
    }

    s.particles = s.particles.filter(p => p.life > 0);
    s.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04; });
    s.trail.forEach(t => t.life -= 0.1);
    s.trail = s.trail.filter(t => t.life > 0);
  }, [die]);

  const loop = useCallback((ts) => {
    const s = g.current;
    if (!s.running) return;
    const dt = ts - lastRef.current;
    lastRef.current = ts;
    if (!s.paused) {
      elRef.current += dt;
      const speed = Math.max(80, 200 - (s.level - 1) * 15);
      if (elRef.current >= speed) {
        elRef.current = 0;
        tick();
      }
    }
    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [tick, draw]);

  const start = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const snake = mkSnake();
    const s = g.current;
    s.snake = snake; s.dir = { x: 1, y: 0 }; s.nextDir = { x: 1, y: 0 };
    s.food = mkFood(snake); s.particles = []; s.trail = [];
    s.score = 0; s.level = 1; s.eaten = 0; s.paused = false; s.running = true;
    elRef.current = 0;
    setScreen("play");
    setHud({ score: 0, best: s.best, level: 1, eaten: 0 });
    rafRef.current = requestAnimationFrame(ts => {
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(loop);
    });
  }, [loop]);

  // Keyboard controls
  useEffect(() => {
    const fn = e => {
      const s = g.current;
      const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (arrows.includes(e.key)) e.preventDefault();
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") { if (s.dir.y !== 1) s.nextDir = { x: 0, y: -1 }; }
      else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { if (s.dir.y !== -1) s.nextDir = { x: 0, y: 1 }; }
      else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { if (s.dir.x !== 1) s.nextDir = { x: -1, y: 0 }; }
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { if (s.dir.x !== -1) s.nextDir = { x: 1, y: 0 }; }
      else if (e.key === "p" || e.key === "P") { if (s.running) s.paused = !s.paused; }
      else if (e.key === "r" || e.key === "R") { if (s.running) start(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [start]);

  // Mobile dpad
  const dpad = (x, y) => {
    const s = g.current;
    if (!s.running) return;
    if (x === 1 && s.dir.x !== -1) s.nextDir = { x: 1, y: 0 };
    else if (x === -1 && s.dir.x !== 1) s.nextDir = { x: -1, y: 0 };
    else if (y === 1 && s.dir.y !== -1) s.nextDir = { x: 0, y: 1 };
    else if (y === -1 && s.dir.y !== 1) s.nextDir = { x: 0, y: -1 };
  };

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const fmt = n => String(n).padStart(3, "0");

  return (
    <div className="app">
      <div className="grid-bg" />
      <div className="scanlines" />

      <div className="game-container">
        {/* Title */}
        <div className="title-block">
          <p className="subtitle">arcade edition — v2.0</p>
          <h1 className="title">SERPENT</h1>
        </div>

        {/* HUD */}
        <div className="hud" style={{ width: W + 6 }}>
          {[["SCORE", fmt(hud.score)], ["LVL", String(hud.level).padStart(2, "0")], ["BEST", fmt(hud.best)]].map(([label, val]) => (
            <div key={label} className="hud-block">
              <span className="hud-label">{label}</span>
              <span className="hud-value">{val}</span>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="canvas-wrap">
          <div className="canvas-glow" />
          <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

          {screen === "start" && (
            <div className="overlay">
              <p className="overlay-sub">prêt à jouer</p>
              <div className="overlay-title teal">SERPENT</div>
              <button className="btn" onClick={start}>Démarrer</button>
              <p className="overlay-hint">WASD / FLÈCHES</p>
            </div>
          )}

          {screen === "over" && (
            <div className="overlay">
              <p className="overlay-sub">game terminated</p>
              <div className="overlay-title red">MORT</div>
              <p className="overlay-scores">
                Score <strong>{hud.score}</strong> · Record <span className="teal-text">{hud.best}</span>
              </p>
              <button className="btn" onClick={start}>Rejouer</button>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="statusbar" style={{ width: W + 6 }}>
          <div className="status-dot-row">
            <div className={`dot ${screen === "play" ? "dot-active" : "dot-dead"}`} />
            <span>{screen === "play" ? "en jeu" : screen === "over" ? "mort" : "en attente"}</span>
          </div>
          <span>{hud.eaten} pommes</span>
        </div>

        {/* Key hints */}
        <div className="key-hints">
          {[["↑↓←→", "bouger"], ["P", "pause"], ["R", "restart"]].map(([k, l]) => (
            <span key={k} className="key-hint">
              <kbd>{k}</kbd> {l}
            </span>
          ))}
        </div>

        {/* Mobile D-pad */}
        <div className="dpad">
          <div className="dpad-row">
            <button className="dpad-btn" onClick={() => dpad(0, -1)}>↑</button>
          </div>
          <div className="dpad-row">
            <button className="dpad-btn" onClick={() => dpad(-1, 0)}>←</button>
            <button className="dpad-btn" onClick={() => dpad(0, 1)}>↓</button>
            <button className="dpad-btn" onClick={() => dpad(1, 0)}>→</button>
          </div>
        </div>
      </div>
    </div>
  );
}
