// Asciero Argento — white-furred silver axe warden.
// Art that shipped with this pass (10 frames each, shared 384 ground line):
//   idle, run, hurt, death, overhead (axe raised and brought down), leap, cast (blue bolt).
// A separate spin strip was not in the upload. There is no invented spin.
// Attacks lock their aim when they start. Damage only lands on the strike frames,
// inside a radius that matches the ground telegraph, so a sidestep during the wind-up is safe.
(function (root) {
  'use strict';
  const FRAME_DT = 0.08;     // source GIFs are 8cs per frame
  const FRAMES = 10;
  const HIT_R = 90;          // bullet body radius
  const SLAM_R = 72;         // overhead / leap landing vs squad.x
  const LANE_R = 42;         // cast lane half-width
  const RUN_STEP = 16;       // world units per run frame, so the feet match his shuffle
  const ANIMS = ['idle', 'run', 'hurt', 'death', 'overhead', 'leap', 'cast'];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function fresh(opts) {
    opts = opts || {};
    const hp = opts.hp || 2400;
    return {
      kind: 'argento', x: 0, y: 0, hp, maxHp: hp,
      state: 'IDLE', timer: opts.timer != null ? opts.timer : 1.0,
      anim: 'idle', frame: 0, animT: 0,
      targetX: 0, lanes: [], attacks: 0, dir: 1,
      swept: false, shielded: false, dying: false, active: true,
      hitTime: 0, near: 0, flinch: 0, flinchCd: 0, runDist: 0,
    };
  }

  function begin(b, anim) {
    if (b.anim !== anim) { b.anim = anim; b.animT = 0; b.frame = 0; }
  }
  // One-shot strip. Frame clamps at the last cell; does not loop.
  function play(b, anim, dt) {
    begin(b, anim);
    b.animT += dt;
    b.frame = Math.min(FRAMES - 1, Math.floor(b.animT / FRAME_DT));
    return b.frame;
  }

  function step(b, ctx) {
    ctx = ctx || {};
    const dt = ctx.dt > 0 ? ctx.dt : 0;
    const out = { drain: 0, melee: 0, shield: false, shake: 0, sound: null, victory: false, aura: 0, label: null };
    if (b.hitTime > 0) b.hitTime -= dt;
    if (b.flinchCd > 0) b.flinchCd -= dt;
    if (b.dying) {
      if (!b.active) return out;
      play(b, 'death', dt);
      b.near = 0; b.lanes = [];
      // Hold the last (prone) frame briefly so the death reads, then pay out.
      if (b.animT >= FRAME_DT * (FRAMES - 1) + 0.22) {
        b.active = false;
        out.victory = true;
        out.aura = 5000 + ((ctx.level || 1) - 1) * 1000;
        out.shake = 20;
        out.sound = 'powerup';
      }
      return out;
    }
    if (!(dt > 0)) return out;
    b.timer -= dt;
    const squadX = ctx.squadX || 0;
    const level = ctx.level || 1;

    if (b.state === 'IDLE' || b.state === 'RECOVER') {
      const home = clamp(squadX * 0.35 + b.dir * 48, -130, 130);
      const prev = b.x;
      b.x += clamp(home - b.x, -80 * dt, 80 * dt);
      b.near = 0;
      if (b.flinch > 0) {
        b.flinch -= dt;
        play(b, 'hurt', dt);
      } else if (Math.abs(b.x - prev) > 0.35) {
        if (b.anim !== 'run') { b.anim = 'run'; b.runDist = 0; }
        b.runDist += Math.abs(b.x - prev);
        b.frame = Math.floor(b.runDist / RUN_STEP) % FRAMES;
      } else {
        play(b, 'idle', dt);
        b.frame = Math.floor(b.animT / FRAME_DT) % FRAMES;
      }
      if (b.state === 'RECOVER') {
        if (b.timer <= 0) {
          b.state = 'IDLE';
          b.timer = Math.max(0.55, 1.32 - 0.1 * (level - 1));
          b.swept = false; b.shielded = false; b.lanes = [];
        }
      } else if (b.timer <= 0) {
        b.attacks++;
        b.swept = false; b.shielded = false; b.flinch = 0;
        const pick = b.attacks % 3; // 1 cast, 2 overhead, 0 leap
        if (pick === 1) {
          b.state = 'CAST';
          const lanes = [clamp(squadX, -150, 150)];
          if (level >= 3) {
            const s = squadX >= 0 ? -1 : 1;
            const x2 = clamp(squadX + s * 128, -160, 160);
            if (Math.abs(x2 - lanes[0]) > LANE_R * 2 + 24) lanes.push(x2);
          }
          b.lanes = lanes;
          b.targetX = lanes[0];
        } else if (pick === 2) {
          b.state = 'OVERHEAD';
          b.targetX = clamp(squadX, -150, 150);
          b.lanes = [];
        } else {
          b.state = 'LEAP';
          b.targetX = clamp(squadX, -140, 140);
          b.lanes = [];
          b.dir *= -1;
        }
        b.timer = FRAME_DT * FRAMES;
        b.anim = ''; b.animT = 0; b.frame = 0;
        out.sound = 'powerup';
      }
      return out;
    }

    if (b.state === 'CAST') {
      const prev = b.frame;
      play(b, 'cast', dt);
      if (b.frame >= 7) {
        const hit = (b.lanes || []).some(lx => Math.abs(squadX - lx) < LANE_R);
        if (hit) {
          if (!b.shielded && ctx.shieldCharges > 0) { b.shielded = true; out.shield = true; out.label = 'SHIELDED!'; }
          else if (!b.shielded) out.drain = Math.max(8, (ctx.squadCount || 0) * 0.7) * dt;
        }
        if (prev < 7) { out.sound = 'laser'; out.shake = 12; }
      }
      if (b.animT >= FRAME_DT * FRAMES) {
        b.state = 'RECOVER'; b.timer = 0.5; b.lanes = [];
      }
      return out;
    }

    if (b.state === 'OVERHEAD') {
      const prev = b.frame;
      play(b, 'overhead', dt);
      const rate = b.frame < 7 ? 7 : 14;
      b.x += (b.targetX - b.x) * Math.min(1, rate * dt);
      b.near = 0;
      if (!b.swept && prev < 7 && b.frame >= 7) {
        b.swept = true; out.shake = 16; out.sound = 'laser'; out.label = 'AXE!';
        if (Math.abs(squadX - b.targetX) < SLAM_R) {
          if (!b.shielded && ctx.shieldCharges > 0) { b.shielded = true; out.shield = true; out.label = 'SHIELDED!'; }
          else out.melee = Math.max(7, Math.round((ctx.squadCount || 0) * (0.26 + 0.015 * level)));
        }
      }
      if (b.animT >= FRAME_DT * FRAMES) {
        b.state = 'RECOVER'; b.timer = 0.52;
      }
      return out;
    }

    if (b.state === 'LEAP') {
      const prev = b.frame;
      play(b, 'leap', dt);
      if (b.frame >= 4) b.x += (b.targetX - b.x) * Math.min(1, 12 * dt);
      b.near = (b.frame >= 4 && b.frame <= 6) ? 1 : 0;
      if (!b.swept && prev < 7 && b.frame >= 7) {
        b.swept = true; out.shake = 18; out.sound = 'laser'; out.label = 'SLAM!';
        if (Math.abs(squadX - b.targetX) < SLAM_R) {
          if (!b.shielded && ctx.shieldCharges > 0) { b.shielded = true; out.shield = true; out.label = 'SHIELDED!'; }
          else out.melee = Math.max(6, Math.round((ctx.squadCount || 0) * (0.22 + 0.015 * level)));
        }
      }
      if (b.animT >= FRAME_DT * FRAMES) {
        b.state = 'RECOVER'; b.timer = 0.48; b.near = 0;
      }
      return out;
    }

    return out;
  }

  // Brightness flash every hit. Hurt strip only between attacks, and not on every bullet.
  function onHit(b) {
    b.hitTime = 0.08;
    if (b.dying) return;
    if ((b.state === 'IDLE' || b.state === 'RECOVER') && b.flinch <= 0 && b.flinchCd <= 0) {
      b.flinch = 0.28; b.flinchCd = 0.7; b.anim = '';
    }
  }

  function kill(b) {
    b.hp = 0; b.dying = true; b.state = 'DYING'; b.active = true;
    b.anim = 'death'; b.animT = 0; b.frame = 0; b.lanes = []; b.near = 0; b.flinch = 0;
  }

  const api = {
    FRAME_DT, FRAMES, HIT_R, SLAM_R, LANE_R, RUN_STEP, ANIMS,
    fresh, step, onHit, kill,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AxeBoss = api;
})(typeof window !== 'undefined' ? window : globalThis);
