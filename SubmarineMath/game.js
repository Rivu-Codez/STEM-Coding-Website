class SoundFX {
            constructor() {
                this.ctx = null;
                this.muted = false;
            }
            init() {
                if (!this.ctx) {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (AudioContext) this.ctx = new AudioContext();
                }
                if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
            }
            toggleMute() {
                this.muted = !this.muted;
                const soundIcon = document.getElementById('sound-icon');
                if (this.muted) {
                    soundIcon.className = 'fa-solid fa-volume-xmark text-sm text-slate-500';
                } else {
                    soundIcon.className = 'fa-solid fa-volume-high text-sm text-cyan-400';
                }
            }
            playPing() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.25);
                    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.25);
                } catch(e){}
            }
            playKeyTap() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(420, this.ctx.currentTime);
                    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.04);
                } catch(e){}
            }
            playMove() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.12);
                    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.12);
                } catch(e){}
            }
            playSuccess() {
                if (this.muted || !this.ctx) return;
                try {
                    const now = this.ctx.currentTime;
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, idx) => {
                        const osc = this.ctx.createOscillator();
                        const gain = this.ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
                        gain.gain.setValueAtTime(0.15, now + idx * 0.07);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
                        osc.connect(gain);
                        gain.connect(this.ctx.destination);
                        osc.start(now + idx * 0.07);
                        osc.stop(now + idx * 0.07 + 0.22);
                    });
                } catch(e){}
            }
            playSplash() {
                if (this.muted || !this.ctx) return;
                try {
                    const bufferSize = this.ctx.sampleRate * 0.4;
                    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
                    const output = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                    const whiteNoise = this.ctx.createBufferSource();
                    whiteNoise.buffer = buffer;

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
                    filter.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.4);

                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

                    whiteNoise.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);
                    whiteNoise.start();
                } catch(e){}
            }
            playError() {
                if (this.muted || !this.ctx) return;
                try {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
                    osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.25);
                    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
                    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    osc.start();
                    osc.stop(this.ctx.currentTime + 0.25);
                } catch(e){}
            }
        }
        const sfx = new SoundFX();

const CURRICULUM = window.SubmarineMathLevels;

        // --- TEACHING CONTENT: rule, worked steps, and common-mistake messages per level ---
        const LESSONS = {
            1: { rule: "On the depth line, HIGHER means GREATER. For negatives, the number closer to 0 is the greater one.",
                 steps: ["Picture the depth line: 0 is the surface and numbers get smaller as you go down.", "-30 is 30 m below the surface. -70 is 70 m below the surface.", "-30 is closer to the surface, so it sits higher up.", "Higher means greater, so -30 > -70."],
                 traps: { "<": "70 looks bigger than 30, but -70 is DEEPER, and deeper means smaller." } },
            2: { rule: "A deeper negative number is LESS than a shallower one.",
                 steps: ["-80 is 80 m below the surface. -45 is only 45 m below.", "-80 is deeper, so it sits lower on the depth line.", "Lower means smaller, so -80 < -45."],
                 traps: { ">": "80 looks bigger than 45, but -80 is deeper, so it is the smaller number." } },
            3: { rule: "Zero is sea level. Every negative number is below it, so zero is greater than any negative.",
                 steps: ["0 is sea level. -60 is 60 m under the water.", "Sea level is above -60 on the depth line.", "Higher means greater, so 0 > -60."],
                 traps: { "<": "Zero is not 'nothing' here, it is sea level. Everything below it is negative, so 0 is greater." } },
            4: { rule: "Adding a positive number moves you UP (toward 0).",
                 steps: ["Start at -60, which is 60 m below the surface.", "Adding +25 moves you UP 25 m.", "60 - 25 = 35, and you have not reached the surface yet, so you are still below it.", "-60 + 25 = -35."],
                 traps: { "-85": "That is what you get by going DOWN 25. Adding +25 moves you UP.", "35": "You moved up 25, but you are still under the surface, so the answer stays negative." } },
            5: { rule: "Subtracting a positive number moves you DOWN.",
                 steps: ["Start at -20, which is already below the surface.", "Subtracting 35 means diving 35 m deeper.", "20 + 35 = 55 m below the surface.", "-20 - 35 = -55."],
                 traps: { "15": "That is -20 + 35. Subtracting 35 moves you DOWN, not up.", "-15": "Dive 35 m deeper from -20: 20 + 35 = 55 m below the surface in total." } },
            6: { rule: "Subtracting a negative is the same as adding a positive: the two minus signs cancel.",
                 steps: ["Rewrite -40 - (-25) as -40 + 25.", "Adding +25 moves you UP 25 m from -40.", "-40 + 25 = -15."],
                 traps: { "-65": "That is -40 - 25. But you are subtracting a NEGATIVE, so it turns into adding.", "15": "40 is bigger than 25, so you are still below the surface: the answer is negative." } },
            7: { rule: "Crossing zero: use part of the climb to reach 0, then the rest takes you above the surface.",
                 steps: ["From -25 you need 25 m to reach the surface (0).", "You climb 40 m, so 40 - 25 = 15 m is left.", "Those 15 m take you ABOVE the surface: +15.", "-25 + 40 = 15."],
                 traps: { "65": "-25 is BELOW zero, so part of your climb is spent getting back to 0. Do not add 25 and 40.", "-15": "You climbed more than 25, so you end up ABOVE the surface: the answer is positive." } },
            8: { rule: "Dropping from a positive height can take you below zero.",
                 steps: ["From +30, dropping 30 m gets you to 0.", "You drop 55 m, so 55 - 30 = 25 m is left.", "Those 25 m take you BELOW the surface: -25.", "30 - 55 = -25."],
                 traps: { "-85": "+30 is ABOVE the surface, so the first 30 m of the drop just takes you down to 0.", "85": "You are subtracting 55, so you go down, not up.", "25": "You dropped more than 30, so you end up BELOW the surface: the answer is negative." } },
            9: { rule: "Every negative number is less than every positive number.",
                 steps: ["-35 is below sea level. +20 is above sea level.", "Anything above sea level is higher than anything below it.", "So -35 is lower, which means -35 < +20."],
                 traps: { ">": "A negative number is always less than a positive one. -35 is below the surface, +20 is above." } },
            10: { rule: "Absolute value is a distance from 0, so it is never negative.",
                 steps: ["-45 is 45 m away from 0.", "Absolute value only asks 'how far from 0?', not 'which direction?'.", "|-45| = 45."],
                 traps: { "-45": "Absolute value is a distance, and distances are never negative." } },
            11: { rule: "To compare absolute values, take the absolute value of each number FIRST, then compare.",
                 steps: ["|-80| = 80 (80 m from 0).", "|+35| = 35 (35 m from 0).", "80 is greater than 35, so |-80| > |+35|."],
                 traps: { "<": "Take the absolute values first: 80 and 35. Do not compare -80 with 35." } },
            12: { rule: "Net change: go through the moves one at a time. Down is minus, up is plus.",
                 steps: ["Start at -20. Down 30: -20 - 30 = -50.", "Up 15: -50 + 15 = -35.", "Down 25: -35 - 25 = -60."],
                 traps: { "-90": "The 'up 15' move should be ADDED (+15), not subtracted.", "-10": "Go one move at a time and watch which moves are up and which are down.", "60": "You finish below the surface, so the answer is negative." } },
            13: { rule: "Net distance is how far you finish from the start. Total distance adds up every move as a positive length.",
                 steps: ["Net: 0 - 40 + 15 - 20 = -45, so the net distance is 45.", "Total: 40 + 15 + 20 = 75.", "45 is less than 75, so Net < Total."],
                 traps: { ">": "Total distance counts every move, so it is at least as big as net distance. Here 75 is bigger than 45.", "=": "The sub went up and down, so the total distance is bigger than the net distance." } },
            14: { rule: "Negative × negative = positive.",
                 steps: ["Multiply the sizes: 12 × 4 = 48.", "The signs are the same (both negative), so the answer is positive.", "(-12) × (-4) = 48."],
                 traps: { "-48": "Two negatives multiply to a POSITIVE. The signs cancel out.", "-16": "You added. The question asks you to MULTIPLY: 12 × 4." } },
            15: { rule: "Negative ÷ positive = negative.",
                 steps: ["Divide the sizes: 84 ÷ 7 = 12.", "The signs are different, so the answer is negative.", "(-84) ÷ 7 = -12."],
                 traps: { "12": "The signs are different (one negative, one positive), so the answer is negative.", "-77": "You added 7. The question asks you to DIVIDE: 84 ÷ 7." } }
        };


// --- GAME STATE ---
        const MISSILE_SECONDS = { 1: 25, 2: 25, 3: 25, 4: 25, 5: 20, 6: 18 }; // slow early, faster in sections 5 and 6
        let hull = 3, gameOver = false;
        let missile = { state: 'none', start: 0, duration: 0, pausedAt: null, aimDepth: 0, x: 0, y: 0 };
        let explosion = { active: false, frame: 0 };
        let currentLevelIdx = 0;
        let score = 0;
        let starsEarned = new Array(CURRICULUM.length).fill(0);
        let subDepth = 0;
        let ghostSubDepth = null;
        let levelSolved = false, attempts = 0, usedHint = false, animTimer = null;

        const fishes = [
            { x: 100, yr: 0.25, speed: 1.2, size: 10, color: '#f59e0b' },
            { x: 280, yr: 0.6, speed: 0.8, size: 14, color: '#ec4899' },
            { x: 420, yr: 0.4, speed: 1.5, size: 8, color: '#06b6d4' }
        ];

        let breachAnimation = {
            active: false,
            frame: 0,
            subY: 0,
            subVelY: 0,
            seagulls: []
        };

        // --- MISSILE / HULL SYSTEM ---
        function missileProgress() {
            const t = (missile.pausedAt !== null ? missile.pausedAt : performance.now()) - missile.start;
            return Math.min(1, Math.max(0, t / missile.duration));
        }
        function launchMissile() {
            if (gameOver || levelSolved) { missile.state = 'none'; return; }
            const level = CURRICULUM[currentLevelIdx];
            missile.state = 'flying';
            missile.start = performance.now();
            missile.pausedAt = null;
            missile.duration = (MISSILE_SECONDS[level.section] || 30) * 1000;
            missile.aimDepth = subDepth;
            sfx.playPing();
        }
        function pauseMissile() { if (missile.state === 'flying' && missile.pausedAt === null) missile.pausedAt = performance.now(); }
        function resumeMissile() {
            if (missile.state === 'flying' && missile.pausedAt !== null) {
                missile.start += performance.now() - missile.pausedAt;
                missile.pausedAt = null;
            }
        }
        function updateHull() {
            const el = document.getElementById('hud-hull');
            let html = '';
            for (let i = 0; i < 3; i++) {
                html += `<span class="inline-block w-3 h-3 rounded-sm ${i < hull ? 'bg-emerald-400' : 'bg-slate-700'}"></span>`;
            }
            el.innerHTML = html;
        }
        function hitByMissile() {
            missile.state = 'none';
            explosion = { active: true, frame: 0 };
            sfx.playSplash(); sfx.playError();
            const ov = document.getElementById('hit-overlay');
            ov.style.opacity = '1';
            setTimeout(() => { ov.style.opacity = '0'; }, 400);
            hull = Math.max(0, hull - 1);
            updateHull();
            if (hull === 0) {
                gameOver = true;
                setTimeout(showGameOver, 900);
            }
        }
        function showGameOver() {
            const level = CURRICULUM[currentLevelIdx];
            document.getElementById('gameover-answer').innerText = `Level ${level.id} answer: ${level.correctAnswer}`;
            const m = document.getElementById('gameover-modal');
            m.classList.remove('hidden'); m.classList.add('flex');
        }
        function hideGameOver() {
            const m = document.getElementById('gameover-modal');
            m.classList.add('hidden'); m.classList.remove('flex');
        }
        function retryAfterGameOver() {
            hull = 3; gameOver = false; hideGameOver();
            loadLevel(currentLevelIdx);
        }
        document.addEventListener('visibilitychange', () => { document.hidden ? pauseMissile() : resumeMissile(); });

        function drawMissileAndFx(width, height, metersToY) {
            const subX = width * 0.5;
            // update + draw missile
            if (missile.state === 'flying') {
                const p = missileProgress();
                const sx = width + 40, ex = subX + 36;
                missile.x = sx + (ex - sx) * p;
                missile.y = metersToY(missile.aimDepth);
                if (p >= 1 && missile.pausedAt === null) {
                    const level = CURRICULUM[currentLevelIdx];
                    attempts++;
                    hitByMissile();
                    if (!gameOver) {
                        missile.state = 'armed';
                        showFeedback(false, `Time ran out! The missile hit the hull (${hull} left). Missile re-arms when you start typing.`);
                        showMistakeLesson(level);
                    }
                }
            } else if (missile.state === 'evaded') {
                missile.x -= 9;
                if (missile.x < -60) missile.state = 'none';
            }
            if (missile.state === 'flying' || missile.state === 'evaded') {
                const p = missileProgress();
                if (missile.state === 'flying') {
                    ctx.fillStyle = '#ef4444';
                    ctx.fillRect(0, 0, width * (1 - p), 4);
                    ctx.strokeStyle = 'rgba(248,113,113,0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 4]);
                    ctx.beginPath(); ctx.moveTo(missile.x, missile.y); ctx.lineTo(subX + 36, missile.y); ctx.stroke();
                    ctx.setLineDash([]);
                }
                const now = performance.now();
                ctx.save();
                ctx.translate(missile.x, missile.y);
                ctx.scale(0.7, 0.7);
                // bubble trail (no flames underwater)
                for (let i = 0; i < 7; i++) {
                    const t = ((now / 450) + i / 7) % 1;
                    const bx = 30 + t * 56;
                    const by = Math.sin(t * 7 + i * 2) * 4 - t * 8;
                    ctx.globalAlpha = (1 - t) * 0.8;
                    ctx.fillStyle = '#e0f2fe';
                    ctx.beginPath(); ctx.arc(bx, by, 1.5 + (1 - t) * 2.5, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 0.8; ctx.stroke();
                }
                ctx.globalAlpha = 1;
                // tail fins
                ctx.fillStyle = '#b91c1c';
                ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(22, -15); ctx.lineTo(24, -6); ctx.closePath(); ctx.fill();
                ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(22, 15); ctx.lineTo(24, 6); ctx.closePath(); ctx.fill();
                // steel body
                const bodyGrad = ctx.createLinearGradient(0, -7, 0, 7);
                bodyGrad.addColorStop(0, '#f1f5f9');
                bodyGrad.addColorStop(0.45, '#94a3b8');
                bodyGrad.addColorStop(1, '#334155');
                ctx.fillStyle = bodyGrad;
                ctx.beginPath();
                ctx.moveTo(-18, -7); ctx.lineTo(20, -7); ctx.lineTo(27, -3.5); ctx.lineTo(27, 3.5); ctx.lineTo(20, 7); ctx.lineTo(-18, 7);
                ctx.closePath(); ctx.fill();
                // red nose cone
                const noseGrad = ctx.createLinearGradient(0, -7, 0, 7);
                noseGrad.addColorStop(0, '#fca5a5');
                noseGrad.addColorStop(0.5, '#ef4444');
                noseGrad.addColorStop(1, '#7f1d1d');
                ctx.fillStyle = noseGrad;
                ctx.beginPath();
                ctx.moveTo(-18, -7); ctx.quadraticCurveTo(-34, -7, -38, 0); ctx.quadraticCurveTo(-34, 7, -18, 7);
                ctx.closePath(); ctx.fill();
                // warning stripes + panel line
                ctx.fillStyle = '#ef4444'; ctx.fillRect(-6, -7, 4, 14);
                ctx.fillStyle = '#f8fafc'; ctx.fillRect(2, -7, 2, 14);
                ctx.fillStyle = '#ef4444'; ctx.fillRect(6, -7, 4, 14);
                // top shine
                ctx.fillStyle = 'rgba(255,255,255,0.45)';
                ctx.fillRect(-18, -5.5, 38, 1.8);
                // spinning propeller
                const spin = Math.sin(now / 35) * 8;
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath(); ctx.ellipse(29, 0, 2.5, Math.max(1.5, Math.abs(spin)), 0, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#475569'; ctx.fillRect(26, -1.5, 3, 3);
                ctx.restore();
                if (missile.state === 'flying') {
                    ctx.fillStyle = '#fca5a5';
                    ctx.font = 'bold 10px Orbitron, monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(Math.ceil((1 - p) * missile.duration / 1000) + 's', missile.x, missile.y - 12);
                    ctx.textAlign = 'left';
                }
            }
            // explosion at the sub
            if (explosion.active) {
                explosion.frame++;
                const f = explosion.frame;
                const ey = metersToY(subDepth);
                const sc = 1;
                ctx.save();
                const fade = Math.max(0, 1 - f / 45);
                // pressure shockwave rings
                ctx.lineWidth = 3;
                ctx.globalAlpha = fade;
                ctx.strokeStyle = '#e0f2fe';
                ctx.beginPath(); ctx.arc(subX, ey, f * 2.2 * sc, 0, Math.PI * 2); ctx.stroke();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#7dd3fc';
                ctx.beginPath(); ctx.arc(subX, ey, f * 1.4 * sc, 0, Math.PI * 2); ctx.stroke();
                // soft water burst
                ctx.globalAlpha = fade * 0.55;
                ctx.fillStyle = '#bae6fd';
                ctx.beginPath(); ctx.arc(subX, ey, f * 1.1 * sc, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = fade * 0.8;
                ctx.fillStyle = '#f0f9ff';
                ctx.beginPath(); ctx.arc(subX, ey, f * 0.5 * sc, 0, Math.PI * 2); ctx.fill();
                // rising bubbles
                ctx.globalAlpha = fade;
                ctx.strokeStyle = '#e0f2fe'; ctx.lineWidth = 1.2;
                for (let i = 0; i < 12; i++) {
                    const ang = i * 0.55;
                    const dist = f * (1.0 + (i % 4) * 0.35) * sc;
                    const bx = subX + Math.cos(ang) * dist;
                    const by = ey + Math.sin(ang) * dist - f * 0.9;
                    ctx.fillStyle = 'rgba(224,242,254,0.35)';
                    ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3) * 1.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                }
                ctx.restore();
                if (f >= 45) explosion.active = false;
            }
        }

        // --- CANVAS RENDER ENGINE ---
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        let backgroundGradients = null;
        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            const pixelRatio = window.devicePixelRatio || 1;
            canvas.width = Math.round(rect.width * pixelRatio);
            canvas.height = Math.round(rect.height * pixelRatio);
            ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            backgroundGradients = {
                ocean: ctx.createLinearGradient(0, 0, 0, rect.height),
                sky: ctx.createLinearGradient(0, 0, 0, (rect.height - 40) * (60 / 170) + 20)
            };
            backgroundGradients.ocean.addColorStop(0, '#38bdf8');
            backgroundGradients.ocean.addColorStop(0.22, '#0284c7');
            backgroundGradients.ocean.addColorStop(0.65, '#0f172a');
            backgroundGradients.ocean.addColorStop(1, '#020617');
            backgroundGradients.sky.addColorStop(0, '#1e3a5f');
            backgroundGradients.sky.addColorStop(1, '#7dd3fc');
        }
        window.addEventListener('resize', resizeCanvas);

        const renderInterval = 1000 / 30;
        let lastRenderTime = 0;
        function renderCanvas(timestamp = performance.now()) {
            if (timestamp - lastRenderTime < renderInterval) {
                requestAnimationFrame(renderCanvas);
                return;
            }
            const frameScale = lastRenderTime ? Math.min((timestamp - lastRenderTime) / (1000 / 60), 2) : 1;
            lastRenderTime = timestamp;
            const pixelRatio = window.devicePixelRatio || 1;
            const width = canvas.width / pixelRatio;
            const height = canvas.height / pixelRatio;

            ctx.clearRect(0, 0, width, height);
            ctx.textAlign = 'left';

            const level = CURRICULUM[currentLevelIdx];

            const minMeters = -110;
            const maxMeters = 60;
            function metersToY(m) {
                const ratio = (maxMeters - m) / (maxMeters - minMeters);
                return ratio * (height - 40) + 20;
            }

            const surfaceY = metersToY(0);

            // Ocean Gradient
            ctx.fillStyle = backgroundGradients.ocean;
            ctx.fillRect(0, 0, width, height);

            // Sky above sea level
            ctx.fillStyle = backgroundGradients.sky;
            ctx.fillRect(0, 0, width, surfaceY);

            // Fish
            fishes.forEach(f => {
                f.x += f.speed * frameScale;
                const fy = surfaceY + f.yr * (height - surfaceY - 40);
                if (f.x > width + 20) f.x = -20;
                ctx.fillStyle = f.color;
                ctx.beginPath();
                ctx.ellipse(f.x, fy, f.size, f.size / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(f.x - f.size, fy);
                ctx.lineTo(f.x - f.size - 6, fy - 4);
                ctx.lineTo(f.x - f.size - 6, fy + 4);
                ctx.closePath();
                ctx.fill();
            });

            // Sea Level Line (0m)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(0, surfaceY);
            ctx.lineTo(width, surfaceY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#bae6fd';
            ctx.font = 'bold 10px Orbitron, sans-serif';
            ctx.fillText('SEA LEVEL (0m)', 65, surfaceY - 6);

            // Vertical Depth Ruler
            const axisX = 45;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(axisX, 20);
            ctx.lineTo(axisX, height - 20);
            ctx.stroke();

            for (let m = 50; m >= -100; m -= 25) {
                const y = metersToY(m);
                ctx.beginPath();
                ctx.moveTo(axisX - 4, y);
                ctx.lineTo(axisX + 4, y);
                ctx.strokeStyle = (m === 0) ? '#f59e0b' : 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = (m === 0) ? 2.5 : 1;
                ctx.stroke();

                ctx.fillStyle = (m === 0) ? '#f59e0b' : '#94a3b8';
                ctx.font = '9px Orbitron, monospace';
                ctx.fillText(`${m > 0 ? '+' : ''}${m}m`, axisX - 38, y + 3);
            }

            // COMPARISON VISUAL INDICATOR
            if (level.isComparison && level.compareVal1 !== undefined && level.compareVal2 !== undefined) {
                const pts = level.plot || [level.compareVal1, level.compareVal2];
                const lbl = level.labels || [level.compareVal1 + 'm', level.compareVal2 + 'm'];
                const y1 = metersToY(pts[0]);
                const y2 = metersToY(pts[1]);
                if (level.plot) {
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.setLineDash([3, 3]);
                    [y1, y2].forEach(yy => { ctx.beginPath(); ctx.moveTo(width * 0.32, surfaceY); ctx.lineTo(width * 0.32, yy); ctx.stroke(); });
                    ctx.setLineDash([]);
                }

                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(width * 0.32, y1, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = 'bold 11px Orbitron';
                ctx.fillText(lbl[0], width * 0.32 + 12, y1 + 4);

                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(width * 0.32, y2, 7, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillText(lbl[1], width * 0.32 + 12, y2 + 4);

                ctx.strokeStyle = '#10b981';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(width * 0.23, height - 80);
                ctx.lineTo(width * 0.23, 50);
                ctx.stroke();

                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.moveTo(width * 0.23, 42);
                ctx.lineTo(width * 0.23 - 5, 52);
                ctx.lineTo(width * 0.23 + 5, 52);
                ctx.closePath();
                ctx.fill();

                ctx.font = 'bold 9px Orbitron';
                ctx.fillText('HIGHER = GREATER', width * 0.23 - 32, 32);
            }

            // Helicarrier Pad
            if (level.hasHelicarrier) {
                const padM = Math.max(level.startDepth, level.targetDepth);
                const padY = metersToY(padM);
                ctx.fillStyle = '#334155';
                ctx.fillRect(width * 0.38, padY - 6, 130, 10);
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(width * 0.38 + 10, padY - 8, 110, 2);
                ctx.fillStyle = '#38bdf8';
                ctx.font = 'bold 9px Orbitron';
                ctx.fillText(`RESCUE HELIPAD (+${padM}m)`, width * 0.38, padY - 12);
            }

            // Ocean Floor
            ctx.fillStyle = '#020617';
            ctx.beginPath();
            ctx.moveTo(0, height);
            ctx.lineTo(0, metersToY(-103));
            ctx.quadraticCurveTo(width * 0.3, metersToY(-98), width * 0.6, metersToY(-106));
            ctx.quadraticCurveTo(width * 0.8, metersToY(-110), width, metersToY(-102));
            ctx.lineTo(width, height);
            ctx.fill();

            // Target Depth Marker
            const targetY = metersToY(level.targetDepth);
            if (levelSolved) {
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(axisX, targetY);
            ctx.lineTo(width - 40, targetY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(width * 0.65, targetY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Orbitron';
            ctx.fillText(`TARGET ${level.targetDepth}m`, width * 0.65 + 10, targetY + 3);
            }

            // Ghost Sub Preview
            if (level.ghostPreview && ghostSubDepth !== null) {
                const ghostY = metersToY(ghostSubDepth);
                ctx.save();
                ctx.globalAlpha = 0.4;
                drawSubmarine(width * 0.5, ghostY, '#06b6d4', true);
                ctx.restore();

                const subY = metersToY(subDepth);
                ctx.strokeStyle = '#06b6d4';
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(width * 0.5, subY);
                ctx.lineTo(width * 0.5, ghostY);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Main Submarine
            if (!breachAnimation.active) {
                const currentY = metersToY(subDepth);
                drawSubmarine(width * 0.5, currentY, '#0284c7', false);
            }

            if (breachAnimation.active) {
                updateAndDrawBreachAnimation(width, height);
            }

            drawMissileAndFx(width, height, metersToY);

            requestAnimationFrame(renderCanvas);
        }

        function drawSubmarine(x, y, colorHex, isGhost) {
            ctx.save();
            ctx.translate(x, y);

            ctx.fillStyle = colorHex;
            ctx.beginPath();
            ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillRect(-6, -18, 12, 8);

            ctx.strokeStyle = isGhost ? '#06b6d4' : '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(2, -18);
            ctx.lineTo(2, -24);
            ctx.lineTo(8, -24);
            ctx.stroke();

            ctx.fillStyle = '#bae6fd';
            ctx.beginPath();
            ctx.arc(-10, -2, 3.5, 0, Math.PI * 2);
            ctx.arc(4, -2, 3.5, 0, Math.PI * 2);
            ctx.arc(18, -2, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(-36, -6, 4, 12);

            ctx.restore();
        }

        function triggerBreachAnimation() {
            breachAnimation.active = true;
            breachAnimation.frame = 0;
            breachAnimation.subY = 100;
            breachAnimation.subVelY = -12;
            breachAnimation.seagulls = [
                { x: 40, y: 35, vx: 2 },
                { x: 110, y: 55, vx: 1.5 },
                { x: 210, y: 25, vx: 2.2 }
            ];

            sfx.playSplash();
            const splashEl = document.getElementById('splash-overlay');
            splashEl.style.opacity = '1';
            setTimeout(() => { splashEl.style.opacity = '0'; }, 600);
        }

        function updateAndDrawBreachAnimation(width, height) {
            breachAnimation.frame++;
            breachAnimation.subY += breachAnimation.subVelY;
            breachAnimation.subVelY += 0.4;

            const surfaceY = 20 + (60 / 170) * (height - 40);
            const subX = width * 0.5;

            if (breachAnimation.subY < surfaceY + 20 && breachAnimation.subY > surfaceY - 60) {
                ctx.fillStyle = 'rgba(224, 242, 254, 0.8)';
                for (let i = 0; i < 12; i++) {
                    const px = subX + (Math.random() - 0.5) * 80;
                    const py = surfaceY + (Math.random() - 0.5) * 25;
                    ctx.beginPath();
                    ctx.arc(px, py, Math.random() * 4 + 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.save();
            ctx.translate(subX, breachAnimation.subY);
            ctx.rotate(-0.3);
            drawSubmarine(0, 0, '#0284c7', false);
            ctx.restore();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            breachAnimation.seagulls.forEach(g => {
                g.x += g.vx;
                if (g.x > width) g.x = -20;
                ctx.beginPath();
                ctx.moveTo(g.x, g.y);
                ctx.quadraticCurveTo(g.x + 6, g.y - 6, g.x + 12, g.y);
                ctx.quadraticCurveTo(g.x + 18, g.y - 6, g.x + 24, g.y);
                ctx.stroke();
            });

            ctx.fillStyle = '#f59e0b';
            ctx.font = '900 15px Orbitron, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🌊 WHALE BREACH! OVER-ASCENDED SEA LEVEL!', width / 2, 45);

            if (breachAnimation.subY > height + 50 || breachAnimation.frame > 130) {
                breachAnimation.active = false;
            }
        }

        // --- NATIVE INPUT HANDLERS ---
        const nativeInput = document.getElementById('native-user-input');

        nativeInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); submitDirectAnswer(); }
        });

        nativeInput.addEventListener('input', () => {
            sfx.playKeyTap();
            if (missile.state === 'armed') launchMissile();
            const level = CURRICULUM[currentLevelIdx];

            if (level.ghostPreview) {
                const val = parseFloat(nativeInput.value.trim());
                if (!isNaN(val)) {
                    ghostSubDepth = val;
                } else {
                    ghostSubDepth = level.startDepth;
                }
            }
        });

        function setComparisonSymbol(sym) {
            nativeInput.value = sym;
            nativeInput.focus();
            if (missile.state === 'armed') launchMissile();
            sfx.playKeyTap();
        }

        function clearInput() {
            nativeInput.value = "";
            nativeInput.focus();
            const level = CURRICULUM[currentLevelIdx];
            if (level.ghostPreview) ghostSubDepth = level.startDepth;
            sfx.playKeyTap();
        }

        // --- TEACHING HELPERS ---
        let lessonStepsShown = 0;

        function diagnoseMistake(level, userStr) {
            const lesson = LESSONS[level.id] || {};
            const v = /^[+-]?\d*\.?\d+$/.test(userStr) ? parseFloat(userStr) : NaN;
            const key = isNaN(v) ? userStr : String(v);
            if (lesson.traps && lesson.traps[key]) return lesson.traps[key];

            if (level.isComparison) {
                if (!['<', '>', '='].includes(userStr)) return "Answer with one of the symbols >, < or =. Tap a button above the answer box.";
                if (userStr === '=') return "These two values are not equal. Look at where each one sits on the depth line.";
                return "That symbol points the wrong way. The greater number is the one that is higher up on the depth line.";
            }
            if (isNaN(v)) return "Type a number, for example -250 or 300.";
            const c = parseFloat(level.correctAnswer);
            if (c !== 0 && v === -c) return "You have the right size but the wrong sign. Ask yourself: is the answer above or below zero?";
            return "Not quite. Let's work through it together.";
        }

        function hideLesson() {
            lessonStepsShown = 0;
            document.getElementById('lesson-box').classList.add('hidden');
            document.getElementById('lesson-steps').innerHTML = '';
            document.getElementById('lesson-more').classList.add('hidden');
        }

        function addLessonStep(text, n) {
            const li = document.createElement('li');
            li.className = 'flex items-start space-x-2';
            const num = document.createElement('span');
            num.className = 'w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5';
            num.textContent = n;
            const body = document.createElement('span');
            body.textContent = text;
            li.appendChild(num);
            li.appendChild(body);
            document.getElementById('lesson-steps').appendChild(li);
        }

        function updateMoreButton(lesson) {
            const btn = document.getElementById('lesson-more');
            const total = lesson.steps.length;
            if (lessonStepsShown >= total) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
                btn.textContent = lessonStepsShown === 0 ? 'Show step-by-step' : `Next step (${lessonStepsShown + 1}/${total})`;
            }
        }

        function revealNextStep() {
            const lesson = LESSONS[CURRICULUM[currentLevelIdx].id];
            if (!lesson || lessonStepsShown >= lesson.steps.length) return;
            usedHint = true; // asking for the worked solution costs a star
            addLessonStep(lesson.steps[lessonStepsShown], lessonStepsShown + 1);
            lessonStepsShown++;
            updateMoreButton(lesson);
            sfx.playPing();
        }

        function showMistakeLesson(level) {
            const lesson = LESSONS[level.id];
            if (!lesson) return;
            hideLesson();
            document.getElementById('lesson-box').classList.remove('hidden');
            document.getElementById('lesson-title').innerText = "Let's work it out";
            document.getElementById('lesson-rule').innerText = "Rule to remember: " + lesson.rule;
            if (attempts >= 2) {
                // second mistake onward: show the full worked solution
                usedHint = true;
                lesson.steps.forEach((t, i) => addLessonStep(t, i + 1));
                lessonStepsShown = lesson.steps.length;
            }
            updateMoreButton(lesson);
        }

        function showRecapLesson(level) {
            const lesson = LESSONS[level.id];
            if (!lesson) return;
            hideLesson();
            document.getElementById('lesson-box').classList.remove('hidden');
            document.getElementById('lesson-title').innerText = "Remember this";
            document.getElementById('lesson-rule').innerText = lesson.rule;
            lesson.steps.forEach((t, i) => addLessonStep(t, i + 1));
            lessonStepsShown = lesson.steps.length;
            document.getElementById('lesson-more').classList.add('hidden');
        }

        async function submitDirectAnswer() {
            if (gameOver) return;
            if (levelSolved) { nextLevel(); return; }
            const level = CURRICULUM[currentLevelIdx];
            const userStr = nativeInput.value.trim().replace(/[\u2212\u2013]/g, '-').replace(/\s+/g, '');

            if (!userStr) {
                showFeedback(false, "Enter an answer to execute command.");
                nativeInput.focus();
                return;
            }

            const attempt = await SubmarineProgress.submitAttempt(currentLevelIdx, userStr);
            if (!attempt.ok) {
                showFeedback(false, "Your answer could not be saved. Check your connection and try again.");
                return;
            }
            attempts = attempt.data.attempt_count || attempts + 1;
            const isCorrect = attempt.data.server_result === 'success';

            if (isCorrect) {
                sfx.playSuccess();

                const targetDepthToAnimate = level.numericVal !== undefined
                    ? level.numericVal
                    : level.targetDepth;

                const hadMissile = missile.state === 'flying';
                if (hadMissile) missile.state = 'evaded'; else if (missile.state === 'armed') missile.state = 'none';
                animateSubmarineTo(targetDepthToAnimate);

                levelSolved = true;
                const reward = await SubmarineProgress.recordAchievement(currentLevelIdx);
                if (reward.ok) {
                    starsEarned[currentLevelIdx] = reward.data.stars;
                    if (reward.data.awarded) score += reward.data.xp;
                }
                updateHeaderStats();
                const st = starsEarned[currentLevelIdx] || 0;
                document.getElementById('hud-target').innerText = `${level.targetDepth}m`;
                document.querySelector('#btn-submit span').innerText = currentLevelIdx < CURRICULUM.length - 1 ? 'Next level' : 'All levels done';
                const rewardMessage = reward.ok ? `${'\u2605'.repeat(st)}${'\u2606'.repeat(3 - st)} ` : '';
                showFeedback(true, `Correct! ${rewardMessage}${hadMissile ? 'Missile dodged, sub moving to safety.' : 'Submarine moving to target.'}`);

                document.getElementById('btn-next').classList.remove('hidden');
                if (attempts > 0 || usedHint) showRecapLesson(level); else hideLesson();
            } else {
                sfx.playError();
                const userVal = parseFloat(userStr);
                const pos = level.kind === 'chg' ? level.startDepth + userVal : userVal;
                let msg = diagnoseMistake(level, userStr);
                if (level.kind && !isNaN(userVal) && pos > (level.hasHelicarrier ? 50 : 10)) {
                    msg = `Overshot sea level! You would end up at +${pos}m. ` + msg;
                }
                {
                    hitByMissile();
                    if (gameOver) { showFeedback(false, 'Direct hit! The hull is breached.'); return; }
                    missile.state = 'armed';
                    msg = `Direct hit! Hull: ${hull} left. ` + msg + ' Missile re-arms when you start typing.';
                }
                showFeedback(false, msg);
                showMistakeLesson(level);
                nativeInput.focus();
            }
        }

        function animateSubmarineTo(target) {
            const start = subDepth;
            const diff = target - start;
            let progress = 0;
            let lastMoveSoundAt = 0;

            clearInterval(animTimer);
            const interval = animTimer = setInterval(() => {
                progress += 0.05;
                if (progress >= 1) {
                    subDepth = target;
                    clearInterval(interval);
                } else {
                    subDepth = start + diff * progress;
                    const now = performance.now();
                    if (now - lastMoveSoundAt >= 120) {
                        sfx.playMove();
                        lastMoveSoundAt = now;
                    }
                }
                document.getElementById('hud-depth').innerText = `${Math.round(subDepth)}m`;
            }, 30);
        }

        function showFeedback(isSuccess, msg) {
            const box = document.getElementById('feedback-box');
            const icon = document.getElementById('feedback-icon');
            const text = document.getElementById('feedback-text');

            text.innerText = msg;

            if (isSuccess === null) {
                box.className = "p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 min-h-[50px] flex items-center space-x-3 transition-all";
                icon.className = "fa-solid fa-lightbulb text-amber-400 text-lg flex-shrink-0";
            } else if (isSuccess) {
                box.className = "p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 min-h-[50px] flex items-center space-x-3 transition-all";
                icon.className = "fa-solid fa-circle-check text-emerald-400 text-lg flex-shrink-0";
            } else {
                box.className = "p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 min-h-[50px] flex items-center space-x-3 transition-all";
                icon.className = "fa-solid fa-triangle-exclamation text-rose-400 text-lg flex-shrink-0";
            }
        }

        function showMathHint() {
            const level = CURRICULUM[currentLevelIdx];
            usedHint = true;
            showFeedback(null, `Hint: ${level.hint}`);
            sfx.playPing();
        }

        function updateHeaderStats() {
            const totalStars = starsEarned.reduce((a, b) => a + b, 0);
            document.getElementById('total-stars').innerText = `${totalStars}/${CURRICULUM.length * 3}`;
            document.getElementById('total-score').innerText = score;
            document.getElementById('progress-bar').style.width = (starsEarned.filter(x => x > 0).length / CURRICULUM.length * 100) + '%';
        }

        function loadLevel(idx, armedStart) {
            if (!SubmarineProgress.isLevelUnlocked(idx)) {
                window.StemGamePlatform.showStatus("Complete the previous level to unlock this one.");
                return;
            }
            currentLevelIdx = idx;
            const level = CURRICULUM[idx];

            subDepth = level.startDepth;
            clearInterval(animTimer);
            breachAnimation.active = false;
            levelSolved = false; attempts = 0; usedHint = false;
            document.querySelector('#btn-submit span').innerText = 'Check answer';
            ghostSubDepth = level.startDepth;
            nativeInput.value = "";
            nativeInput.focus();

            const compGroup = document.getElementById('comparison-btn-group');
            if (level.isComparison) {
                compGroup.classList.remove('hidden');
                compGroup.classList.add('grid');
            } else {
                compGroup.classList.add('hidden');
                compGroup.classList.remove('grid');
            }

            document.getElementById('hud-section-tag').innerText = `SEC ${level.section}`;
            document.getElementById('hud-level-title').innerText = `L${level.id}: ${level.title}`;
            document.getElementById('hud-depth').innerText = `${subDepth}m`;
            document.getElementById('hud-target').innerText = '?';
            document.getElementById('level-indicator').innerText = `Level ${level.id} of ${CURRICULUM.length}`;
            document.getElementById('question-text').innerText = level.question;

            document.getElementById('btn-next').classList.add('hidden');
            hideLesson();
            explosion.active = false;
            missile.state = 'none';
            updateHull();
            if (!gameOver) {
                if (armedStart) { missile.state = 'armed'; }
                else launchMissile();
            }
            const feedbackBox = document.getElementById('feedback-box');
            feedbackBox.className = "p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 min-h-[50px] flex items-center space-x-3 transition-all";
            document.getElementById('feedback-text').innerText = (missile.state === 'armed') ? "Missile launches when you start typing." : "";
        }

        function nextLevel() {
            if (currentLevelIdx < CURRICULUM.length - 1) {
                loadLevel(currentLevelIdx + 1);
            } else {
                showFeedback(true, `🎉 CONGRATULATIONS! You completed all ${CURRICULUM.length} math levels!`);
            }
        }

        function toggleModal(show) {
            const modal = document.getElementById('level-modal');
            if (show) pauseMissile(); else resumeMissile();
            if (show) {
                renderModalGrid();
                modal.classList.remove('hidden');
            } else {
                modal.classList.add('hidden');
            }
        }

        function renderModalGrid() {
            const container = document.getElementById('levels-grid-container');
            container.innerHTML = "";

            for (let sec = 1; sec <= 6; sec++) {
                const secLevels = CURRICULUM.filter(l => l.section === sec);
                const secBox = document.createElement('div');
                secBox.className = "bg-slate-950/60 p-3.5 rounded-xl border border-slate-800";

                const secHeader = document.createElement('h3');
                secHeader.className = "text-xs font-orbitron font-bold text-cyan-400 mb-3 flex items-center justify-between";
                secHeader.innerText = ['Comparing numbers','Adding & subtracting','Crossing zero','Absolute value','Multi-step moves','Multiply & divide'][sec-1] + ` (${secLevels.filter(l=>starsEarned[l.id-1]>0).length}/${secLevels.length})`;
                secBox.appendChild(secHeader);

                const grid = document.createElement('div');
                grid.className = "grid grid-cols-2 sm:grid-cols-3 gap-2.5";

                secLevels.forEach(lvl => {
                    const idx = lvl.id - 1;
                    const unlocked = SubmarineProgress.isLevelUnlocked(idx);
                    const btn = document.createElement('button');
                    btn.disabled = !unlocked;
                    btn.className = `p-3 rounded-xl border font-orbitron text-left transition flex flex-col justify-between h-20 ${
                        idx === currentLevelIdx
                            ? 'bg-cyan-900/60 border-cyan-400 text-cyan-200 ring-2 ring-cyan-500/30'
                            : unlocked ? 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
                                : 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed'
                    }`;
                    btn.onclick = () => {
                        loadLevel(idx);
                        toggleModal(false);
                    };

                    btn.innerHTML = `
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-cyan-400">L${lvl.id}</span>
                            <i class="fa-solid fa-star text-[10px] ${starsEarned[idx] > 0 ? 'text-amber-400' : 'text-slate-600'}"></i>
                        </div>
                        <span class="text-[10px] font-sans text-slate-300 truncate w-full">${lvl.title}</span>
                    `;
                    grid.appendChild(btn);
                });

                secBox.appendChild(grid);
                container.appendChild(secBox);
            }
        }

        async function restoreProgress() {
            const saved = await SubmarineProgress.loadProgress();
            if (!saved.ok) return;
            starsEarned.fill(0);
            score = 0;
            saved.achievements.forEach(record => {
                const index = record.level_number - 1;
                starsEarned[index] = record.stars;
                score += record.xp;
            });
            updateHeaderStats();
        }

        window.onload = async function() {
            await window.SubmarineGameReady;
            if (!window.StemGamePlatform.getSession()) return;
            await restoreProgress();
            document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleModal(false); });
            resizeCanvas();
            loadLevel(0, true);
            renderCanvas();

            document.addEventListener('pointerdown', () => sfx.init(), { once: true });
            document.addEventListener('keydown', () => sfx.init(), { once: true });
        };

document.addEventListener('click', event => {
    const button = event.target.closest('[data-action], [data-symbol]');
    if (!button) return;

    if (button.dataset.symbol) {
        setComparisonSymbol(button.dataset.symbol);
        return;
    }

    const actions = {
        'toggle-sound': () => sfx.toggleMute(),
        'open-map': () => toggleModal(true),
        'close-map': () => toggleModal(false),
        'clear-input': clearInput,
        'submit-answer': submitDirectAnswer,
        'reveal-step': revealNextStep,
        'show-hint': showMathHint,
        'next-level': nextLevel,
        'retry-level': retryAfterGameOver
    };
    actions[button.dataset.action]?.();
});
