class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    playClick() {
        this.init();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }
    
    playFlowStart() {
        this.init();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(450, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.4);
    }

    playWin() {
        this.init();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;
        const playNote = (freq, start, duration) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + start);
            gain.gain.setValueAtTime(0.3, now + start);
            gain.gain.exponentialRampToValueAtTime(0.01, now + start + duration);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + start); osc.stop(now + start + duration);
        };
        playNote(523.25, 0, 0.15); // C5
        playNote(659.25, 0.12, 0.15); // E5
        playNote(783.99, 0.24, 0.15); // G5
        playNote(1046.50, 0.36, 0.4); // C6
    }
}

class HydraGame {
    constructor() {
        this.audio = new AudioEngine();
        
        // Kapitel-Struktur registrieren
        this.chapters = {
            tutorial: { id: 'tutorial', title: '1. Tutorial', levels: typeof LEVELS_TUTORIAL !== 'undefined' ? LEVELS_TUTORIAL : [], icon: '📖', desc: 'Grundlagen & Element-Mechaniken' },
            standard: { id: 'standard', title: '2. Standard', levels: typeof LEVELS_STANDARD !== 'undefined' ? LEVELS_STANDARD : [], icon: '🔧', desc: 'Geraden & Bögen stetig schwerer' },
            cross: { id: 'cross', title: '3. Kreuzungen', levels: typeof LEVELS_CROSS !== 'undefined' ? LEVELS_CROSS : [], icon: '➕', desc: 'Überkreuzungen clever einbauen' },
            mixer: { id: 'mixer', title: '4. Mixer', levels: typeof LEVELS_MIXER !== 'undefined' ? LEVELS_MIXER : [], icon: '🧪', desc: 'Farben mischen für System-Ziele' },
            splitter: { id: 'splitter', title: '5. Splitter', levels: typeof LEVELS_SPLITTER !== 'undefined' ? LEVELS_SPLITTER : [], icon: '⚗️', desc: 'Mischströme präzise separieren' },
            expert: { id: 'expert', title: '6. Experte', levels: typeof LEVELS_EXPERT !== 'undefined' ? LEVELS_EXPERT : [], icon: '🏆', desc: 'Maximale Härte. Alle Kombinationen' }
        };

        this.currentChapter = null;
        this.currentLevelIndex = 0;
        this.levelData = null;
        
        // Progress State
        this.totalXP = parseInt(localStorage.getItem('hydra_xp')) || 0;
        this.solvedLevels = JSON.parse(localStorage.getItem('hydra_solved')) || {}; // Format: { "chapter_index": stars }
        
        // Gameplay State
        this.grid = [];
        this.inventory = {};
        this.selectedTool = null;
        this.clickCount = 0;
        this.isFlowing = false;
        this.flowAnimationProgress = 0;
        this.animationTimer = null;

        // UI Mapping
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.colorMap = {
            'blue': '#06b6d4', 'red': '#ef4444', 'yellow': '#eab308',
            'green': '#22c55e', 'purple': '#a855f7', 'orange': '#f97316',
            'white': '#ffffff'
        };

        this.initEvents();
        this.updateTopBar();
        this.renderLevelList();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    initEvents() {
        // Canvas Interaktion
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        
        // Buttons
        document.getElementById('reset-btn').addEventListener('click', () => this.resetLevel());
        document.getElementById('flow-btn').addEventListener('click', () => this.toggleFlow());
        document.getElementById('menu-btn').addEventListener('click', () => this.returnToMenu());
        document.getElementById('profile-btn').addEventListener('click', () => this.showProfile());
        document.getElementById('btn-close-profile').addEventListener('click', () => {
            document.getElementById('modal-profile').classList.add('hidden');
        });
        document.getElementById('btn-reset-progress').addEventListener('click', () => this.resetAllData());
        document.getElementById('btn-next-level').addEventListener('click', () => {
            document.getElementById('modal-win').classList.add('hidden');
            this.nextLevel();
        });
    }

    updateTopBar() {
        document.getElementById('top-xp').innerText = `${this.totalXP} XP`;
        let starCount = Object.values(this.solvedLevels).reduce((a, b) => a + b, 0);
        document.getElementById('top-stars').innerText = starCount;
    }

    renderLevelList() {
        const gridContainer = document.getElementById('level-grid');
        const menuTitle = document.getElementById('menu-title');
        gridContainer.innerHTML = '';

        if (this.currentChapter === null) {
            // KAPITELÜBERSICHT ANZEIGEN
            menuTitle.innerText = "Wähle ein Kapitel";
            gridContainer.className = "grid grid-cols-1 gap-3 p-1 max-h-[68vh] overflow-y-auto w-full";

            Object.keys(this.chapters).forEach(key => {
                const chap = this.chapters[key];
                const card = document.createElement('button');
                card.className = "glass-effect p-3.5 rounded-xl text-left hover:border-cyan-500/50 hover:bg-zinc-900/40 transition-all flex items-center gap-4 group w-full";
                
                let completedInChapter = Object.keys(this.solvedLevels).filter(k => k.startsWith(key)).length;

                card.innerHTML = `
                    <div class="text-2xl bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 group-hover:scale-105 transition-transform">${chap.icon}</div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-black text-xs text-slate-200 tracking-wide uppercase truncate">${chap.title}</h3>
                        <p class="text-[10px] text-zinc-400 truncate mt-0.5">${chap.desc}</p>
                        <span class="text-[9px] uppercase font-bold text-cyan-400 mt-1 block tracking-wider">${completedInChapter} / ${chap.levels.length} Erledigt</span>
                    </div>
                    <div class="text-zinc-600 group-hover:text-cyan-400 transition-colors pr-1">➔</div>
                `;
                
                card.addEventListener('click', () => {
                    this.audio.playClick();
                    this.currentChapter = key;
                    this.renderLevelList();
                });
                gridContainer.appendChild(card);
            });
        } else {
            // LEVEL-GRID DES AUSGEWÄHLTEN KAPITELS ANZEIGEN
            const chap = this.chapters[this.currentChapter];
            menuTitle.innerText = chap.title;
            gridContainer.className = "grid grid-cols-4 gap-2.5 p-1 max-h-[68vh] overflow-y-auto w-full";

            // Zurück-Button
            const backBtn = document.createElement('button');
            backBtn.className = "col-span-full py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-cyan-400 transition-colors";
            backBtn.innerHTML = `⬅ Zurück zur Kapitelübersicht`;
            backBtn.addEventListener('click', () => {
                this.audio.playClick();
                this.currentChapter = null;
                this.renderLevelList();
            });
            gridContainer.appendChild(backBtn);

            // Level Buttons
            chap.levels.forEach((level, index) => {
                const btn = document.createElement('button');
                let key = `${this.currentChapter}_${index}`;
                let isSolved = this.solvedLevels[key] || 0;

                let borderStyle = "border-zinc-900 text-zinc-400 hover:border-zinc-700";
                if (isSolved > 0) borderStyle = "border-emerald-500/40 bg-emerald-950/10 text-emerald-400";
                else if (index === 0 || this.solvedLevels[`${this.currentChapter}_${index-1}`]) {
                    borderStyle = "border-zinc-800 text-slate-200 hover:border-cyan-500";
                }

                btn.className = `glass-effect aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${borderStyle}`;
                btn.innerHTML = `
                    <span class="text-sm font-black">${index + 1}</span>
                    <span class="text-[8px] font-bold tracking-tight opacity-60">${'⭐'.repeat(isSolved) || level.difficulty}</span>
                `;
                
                btn.addEventListener('click', () => {
                    this.audio.playClick();
                    this.startLevel(this.currentChapter, index);
                });
                gridContainer.appendChild(btn);
            });
        }
    }

    resizeCanvas() {
        const size = this.canvas.parentElement.clientWidth;
        this.canvas.width = size;
        this.canvas.height = size;
        this.draw();
    }

    startLevel(chapterId, index) {
        this.currentChapter = chapterId;
        this.currentLevelIndex = index;
        this.levelData = this.chapters[chapterId].levels[index];
        
        if (!this.levelData) return;

        // Reset Simulation & Counts
        this.clickCount = 0;
        this.isFlowing = false;
        this.flowAnimationProgress = 0;
        if (this.animationTimer) clearInterval(this.animationTimer);

        // Inventar laden
        this.inventory = { ...this.levelData.inventory };
        this.selectedTool = Object.keys(this.inventory).find(k => this.inventory[k] > 0) || null;

        // Spielfeld initialisieren
        this.grid = [];
        const cols = this.levelData.gridSize.cols;
        const rows = this.levelData.gridSize.rows;

        for (let x = 0; x < cols; x++) {
            this.grid[x] = [];
            for (let y = 0; y < rows; y++) {
                this.grid[x][y] = { type: 'empty', pipeType: null, dir: 0, flows: {} };
            }
        }

        // Mauern platzieren
        this.levelData.walls.forEach(w => {
            if (this.grid[w.x] && this.grid[w.x][w.y]) this.grid[w.x][w.y].type = 'wall';
        });

        // Quellen platzieren
        this.levelData.sources.forEach(s => {
            if (this.grid[s.x] && this.grid[s.x][s.y]) {
                this.grid[s.x][s.y].type = 'source';
                this.grid[s.x][s.y].color = s.color;
            }
        });

        // Ziele platzieren
        this.levelData.targets.forEach(t => {
            if (this.grid[t.x] && this.grid[t.x][t.y]) {
                this.grid[t.x][t.y].type = 'target';
                this.grid[t.x][t.y].requiredColor = t.requiredColor;
            }
        });

        // UI aktualisieren
        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        document.getElementById('game-level-title').innerText = `${this.chapters[chapterId].title.split(' ')[1]} - Sektor ${index + 1}`;
        document.getElementById('game-level-hint').innerText = this.levelData.hint || 'Verbinde die Energieströme.';
        
        this.updateInventoryUI();
        this.updateClicksUI();
        this.resizeCanvas();
    }

    updateInventoryUI() {
        const container = document.getElementById('inventory-bar');
        container.innerHTML = '';

        const iconMap = {
            pipes_straight: '║', pipes_angle: '╗', pipes_cross: '╬',
            mixers: '🧪', splitters: '⚗️', valves: '🛑', portals: '🌀', andGates: ''
        };
        const nameMap = {
            pipes_straight: 'Gerade', pipes_angle: 'Bogen', pipes_cross: 'Kreuz',
            mixers: 'Mixer', splitters: 'Splitter', valves: 'Ventil', portals: 'Portal', andGates: 'AND'
        };

        Object.keys(this.inventory).forEach(key => {
            if (this.inventory[key] === undefined) return;
            const btn = document.createElement('button');
            const isActive = this.selectedTool === key;
            
            btn.className = `p-1 flex flex-col items-center justify-center rounded-lg border transition-all ${isActive ? 'bg-cyan-950/50 border-cyan-500 text-cyan-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`;
            btn.innerHTML = `
                <span class="text-base font-bold">${iconMap[key] || '?'}</span>
                <span class="text-[8px] font-black uppercase tracking-tight mt-0.5 truncate max-w-full">${nameMap[key] || key}</span>
                <span class="text-[9px] font-black opacity-80 mt-0.5">${this.inventory[key]}</span>
            `;

            btn.addEventListener('click', () => {
                this.audio.playClick();
                this.selectedTool = key;
                this.updateInventoryUI();
            });
            container.appendChild(btn);
        });
    }

    updateClicksUI() {
        document.getElementById('game-clicks-display').innerText = `Klicks: ${this.clickCount} / Ziel: ${this.levelData.parClicks}`;
    }

    handleCanvasClick(e) {
        if (this.isFlowing) return;

        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const cols = this.levelData.gridSize.cols;
        const rows = this.levelData.gridSize.rows;
        const cellSize = this.canvas.width / cols;

        const x = Math.floor(clientX / cellSize);
        const y = Math.floor(clientY / cellSize);

        if (x < 0 || x >= cols || y < 0 || y >= rows) return;
        const cell = this.grid[x][y];

        this.audio.playClick();

        if (cell.type === 'empty' && this.selectedTool && this.inventory[this.selectedTool] > 0) {
            // Platziere Rohr
            cell.type = 'pipe';
            cell.pipeType = this.selectedTool;
            cell.dir = 0;
            this.inventory[this.selectedTool]--;
            this.clickCount++;
        } else if (cell.type === 'pipe') {
            if (cell.pipeType === this.selectedTool) {
                // Rotieren
                cell.dir = (cell.dir + 1) % 4;
                this.clickCount++;
            } else {
                // Löschen / Zurück ins Inventar
                this.inventory[cell.pipeType]++;
                cell.type = 'empty';
                cell.pipeType = null;
                cell.dir = 0;
            }
        }

        this.updateInventoryUI();
        this.updateClicksUI();
        this.draw();
    }

    toggleFlow() {
        if (this.isFlowing) {
            // Zurücksetzen
            this.isFlowing = false;
            this.flowAnimationProgress = 0;
            clearInterval(this.animationTimer);
            document.getElementById('flow-btn').innerText = "Fluss Starten";
            this.clearFlows();
            this.draw();
        } else {
            // Starten
            this.isFlowing = true;
            this.audio.playFlowStart();
            document.getElementById('flow-btn').innerText = "Stoppen";
            this.simulateFlows();
            
            this.animationTimer = setInterval(() => {
                this.flowAnimationProgress += 4;
                if (this.flowAnimationProgress >= 100) {
                    this.flowAnimationProgress = 100;
                    clearInterval(this.animationTimer);
                    this.checkWinCondition();
                }
                this.draw();
            }, 20);
        }
    }

    clearFlows() {
        for (let x = 0; x < this.levelData.gridSize.cols; x++) {
            for (let y = 0; y < this.levelData.gridSize.rows; y++) {
                this.grid[x][y].flows = {};
            }
        }
    }

    simulateFlows() {
        this.clearFlows();
        
        let queue = [];
        // Richtungs-Vektoren: 0: Oben, 1: Rechts, 2: Unten, 3: Links
        const dx = [0, 1, 0, -1];
        const dy = [-1, 0, 1, 0];

        // Alle Quellen speisen das System ein
        this.levelData.sources.forEach(s => {
            for (let d = 0; d < 4; d++) {
                queue.push({ x: s.x + dx[d], y: s.y + dy[d], incomingDir: (d + 2) % 4, color: s.color });
            }
        });

        let iterations = 0;
        while (queue.length > 0 && iterations < 1000) {
            iterations++;
            let current = queue.shift();
            let x = current.x;
            let y = current.y;
            
            if (x < 0 || x >= this.levelData.gridSize.cols || y < 0 || y >= this.levelData.gridSize.rows) continue;
            let cell = this.grid[x][y];

            if (cell.type === 'pipe') {
                let outDirs = [];
                let inDir = current.incomingDir;
                let cType = cell.pipeType;
                let rot = cell.dir; // 0, 1, 2, 3

                // Überprüfe ob Rohr auf dieser Seite offen ist
                if (cType === 'pipes_straight') {
                    // 0 oder 2: Vertikal (offen Oben/Unten), 1 oder 3: Horizontal (offen Links/Rechts)
                    let isOpen = (rot % 2 === 0) ? (inDir === 0 || inDir === 2) : (inDir === 1 || inDir === 3);
                    if (isOpen && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let outDir = (inDir + 2) % 4;
                        cell.flows[outDir] = current.color;
                        outDirs.push(outDir);
                    }
                } else if (cType === 'pipes_angle') {
                    // Basis-Form (rot=0): Verbindet Oben (0) und Rechts (1)
                    let localizedIn = (inDir - rot + 4) % 4;
                    if ((localizedIn === 0 || localizedIn === 1) && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let localizedOut = (localizedIn === 0) ? 1 : 0;
                        let outDir = (localizedOut + rot) % 4;
                        cell.flows[outDir] = current.color;
                        outDirs.push(outDir);
                    }
                } else if (cType === 'pipes_cross') {
                    if (!cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let outDir = (inDir + 2) % 4;
                        cell.flows[outDir] = current.color;
                        outDirs.push(outDir);
                    }
                } else if (cType === 'mixers') {
                    // Nimmt von den Seiten auf und mischt nach vorne (rot)
                    let backSide = (rot + 2) % 4;
                    if (inDir !== rot && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        
                        // Finde alle eintreffenden Farben für den Mixer
                        let colors = Object.values(cell.flows);
                        let mixedColor = this.mixColors(colors);
                        cell.flows[rot] = mixedColor;
                        outDirs.push(rot);
                    }
                } else if (cType === 'splitters') {
                    // Nimmt von hinten (rot+2) auf und splittet nach links/rechts/vorne auf
                    let backSide = (rot + 2) % 4;
                    if (inDir === backSide && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let split = this.splitColor(current.color);
                        
                        let leftDir = (rot + 3) % 4;
                        let rightDir = (rot + 1) % 4;
                        
                        cell.flows[leftDir] = split[0];
                        cell.flows[rightDir] = split[1] || split[0];
                        cell.flows[rot] = current.color;

                        outDirs.push(leftDir, rightDir, rot);
                    }
                }

                // Schiebe Output-Ströme in die Queue weiter
                outDirs.forEach(d => {
                    queue.push({ x: x + dx[d], y: y + dy[d], incomingDir: (d + 2) % 4, color: cell.flows[d] });
                });

            } else if (cell.type === 'target') {
                if (!cell.flows[current.incomingDir]) {
                    cell.flows[current.incomingDir] = current.color;
                }
            }
        }
    }

    mixColors(colors) {
        if (colors.includes('red') && colors.includes('blue')) return 'purple';
        if (colors.includes('red') && colors.includes('yellow')) return 'orange';
        if (colors.includes('blue') && colors.includes('yellow')) return 'green';
        return colors[0] || 'white';
    }

    splitColor(color) {
        if (color === 'purple') return ['red', 'blue'];
        if (color === 'orange') return ['red', 'yellow'];
        if (color === 'green') return ['blue', 'yellow'];
        return [color, color];
    }

    checkWinCondition() {
        let allMatched = true;

        this.levelData.targets.forEach(t => {
            let cell = this.grid[t.x][t.y];
            let values = Object.values(cell.flows);
            let hasMatch = values.some(c => c === t.requiredColor);
            if (!hasMatch) allMatched = false;
        });

        if (allMatched && this.levelData.targets.length > 0) {
            this.handleWin();
        }
    }

    handleWin() {
        this.audio.playWin();

        // Berechne Sterne basierend auf der Effizienz
        let stars = 1;
        if (this.clickCount <= this.levelData.parClicks) stars = 3;
        else if (this.clickCount <= this.levelData.parClicks + 3) stars = 2;

        let key = `${this.currentChapter}_${this.currentLevelIndex}`;
        let previousStars = this.solvedLevels[key] || 0;

        if (stars > previousStars) {
            this.solvedLevels[key] = stars;
            let xpGained = this.levelData.xpReward || 100;
            this.totalXP += xpGained;
            localStorage.setItem('hydra_xp', this.totalXP);
            localStorage.setItem('hydra_solved', JSON.stringify(this.solvedLevels));
        }

        // Win Modal konfigurieren
        document.getElementById('win-xp-reward').innerText = `+${this.levelData.xpReward || 100} XP`;
        const container = document.getElementById('win-stars-container');
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            container.innerHTML += i < stars ? '<span class="text-yellow-400">⭐</span>' : '<span class="text-zinc-700">⭐</span>';
        }

        this.updateTopBar();
        document.getElementById('modal-win').classList.remove('hidden');
    }

    nextLevel() {
        let nextIndex = this.currentLevelIndex + 1;
        if (nextIndex < this.chapters[this.currentChapter].levels.length) {
            this.startLevel(this.currentChapter, nextIndex);
        } else {
            this.returnToMenu();
        }
    }

    resetLevel() {
        if (this.levelData) this.startLevel(this.currentChapter, this.currentLevelIndex);
    }

    returnToMenu() {
        this.isFlowing = false;
        clearInterval(this.animationTimer);
        document.getElementById('flow-btn').innerText = "Fluss Starten";
        document.getElementById('game-controls').classList.add('hidden');
        document.getElementById('level-selection').classList.remove('hidden');
        this.currentChapter = null;
        this.renderLevelList();
    }

    showProfile() {
        document.getElementById('modal-xp').innerText = `${this.totalXP} XP`;
        let starCount = Object.values(this.solvedLevels).reduce((a, b) => a + b, 0);
        document.getElementById('modal-stars').innerText = starCount;
        document.getElementById('modal-profile').classList.remove('hidden');
    }

    resetAllData() {
        if (confirm("Möchtest du wirklich alle Spieldaten unwiderruflich löschen?")) {
            localStorage.clear();
            this.totalXP = 0;
            this.solvedLevels = {};
            this.currentChapter = null;
            this.updateTopBar();
            document.getElementById('modal-profile').classList.add('hidden');
            this.renderLevelList();
        }
    }

    draw() {
        if (!this.levelData) return;
        
        const cols = this.levelData.gridSize.cols;
        const rows = this.levelData.gridSize.rows;
        const s = this.canvas.width / cols; // Cell Size

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid Linien im Hintergrund zeichnen
        this.ctx.strokeStyle = '#18181b';
        this.ctx.lineWidth = 1;
        for (let i = 0; i <= cols; i++) {
            this.ctx.beginPath(); this.ctx.moveTo(i * s, 0); this.ctx.lineTo(i * s, this.canvas.height); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, i * s); this.ctx.lineTo(this.canvas.width, i * s); this.ctx.stroke();
        }

        // Zellen rendern
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const cell = this.grid[x][y];
                const cx = x * s + s / 2;
                const cy = y * s + s / 2;

                this.ctx.save();
                this.ctx.translate(cx, cy);

                if (cell.type === 'wall') {
                    this.ctx.fillStyle = '#27272a';
                    this.ctx.fillRect(-s/2 + 2, -s/2 + 2, s - 4, s - 4);
                } else if (cell.type === 'source') {
                    let col = this.colorMap[cell.color];
                    this.ctx.shadowBlur = 15; this.ctx.shadowColor = col;
                    this.ctx.fillStyle = col;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s * 0.28, 0, Math.PI * 2); this.ctx.fill();
                    
                    this.ctx.strokeStyle = '#ffffff'; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2); this.ctx.stroke();
                } else if (cell.type === 'target') {
                    let col = this.colorMap[cell.requiredColor];
                    this.ctx.strokeStyle = col; this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(-s/3, -s/3, s*2/3, s*2/3);

                    // Signalisiert einen aktiven, korrekten Durchfluss am Ziel
                    if (Object.keys(cell.flows).length > 0) {
                        this.ctx.fillStyle = col;
                        this.ctx.globalAlpha = 0.4;
                        this.ctx.fillRect(-s/3, -s/3, s*2/3, s*2/3);
                    }
                } else if (cell.type === 'pipe') {
                    this.ctx.rotate(cell.dir * Math.PI / 2);
                    this.ctx.strokeStyle = '#52525b';
                    this.ctx.lineWidth = s * 0.22;
                    this.ctx.lineCap = 'round';

                    let isFlowing = this.isFlowing && Object.keys(cell.flows).length > 0;
                    let flowColors = Object.values(cell.flows);

                    if (cell.pipeType === 'pipes_straight') {
                        // Statische Linie
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        // Flüssigkeits-Fluss
                        if (isFlowing) {
                            this.ctx.strokeStyle = this.colorMap[flowColors[0]] || '#fff';
                            this.ctx.lineWidth = s * 0.12;
                            this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        }
                    } else if (cell.pipeType === 'pipes_angle') {
                        this.ctx.beginPath(); this.ctx.arc(-s/2, -s/2, s/2, 0, Math.PI / 2); this.ctx.stroke();
                        if (isFlowing) {
                            this.ctx.strokeStyle = this.colorMap[flowColors[0]] || '#fff';
                            this.ctx.lineWidth = s * 0.12;
                            this.ctx.beginPath(); this.ctx.arc(-s/2, -s/2, s/2, 0, Math.PI / 2); this.ctx.stroke();
                        }
                    } else if (cell.pipeType === 'pipes_cross') {
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(-s/2, 0); this.ctx.lineTo(s/2, 0); this.ctx.stroke();
                        if (isFlowing) {
                            this.ctx.lineWidth = s * 0.12;
                            flowColors.forEach(c => {
                                this.ctx.strokeStyle = this.colorMap[c];
                                this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                                this.ctx.beginPath(); this.ctx.moveTo(-s/2, 0); this.ctx.lineTo(s/2, 0); this.ctx.stroke();
                            });
                        }
                    } else if (cell.pipeType === 'mixers') {
                        // T-Stück Gehäuse zeichnen
                        this.ctx.beginPath(); this.ctx.moveTo(-s/3, s/4); this.ctx.lineTo(s/3, s/4);
                        this.ctx.lineTo(s/4, -s/4); this.ctx.lineTo(-s/4, -s/4); this.ctx.closePath();
                        this.ctx.fillStyle = '#3f3f46'; this.ctx.fill(); this.ctx.stroke();

                        if (isFlowing) {
                            let resCol = cell.flows[cell.dir] || flowColors[0];
                            this.ctx.fillStyle = this.colorMap[resCol] || '#fff';
                            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.14, 0, Math.PI*2); this.ctx.fill();
                        }
                    } else if (cell.pipeType === 'splitters') {
                        // Dreieck für Splitter
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s/3); this.ctx.lineTo(s/3, s/3); this.ctx.lineTo(-s/3, s/3); this.ctx.closePath();
                        this.ctx.fillStyle = '#71717a'; this.ctx.fill(); this.ctx.stroke();
                    }
                }
                this.ctx.restore();
            }
        }
    }
}

// Initialisierung bei App-Start
window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new HydraGame();
});
