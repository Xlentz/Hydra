class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }
    
    playClick() {
        if (!this.enabled || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }
    
    playFlowStart() {
        if (!this.enabled || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.2);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 1.0);
    }

    playWin() {
        if (!this.enabled || this.ctx.state === 'suspended') return;
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.3, this.ctx.currentTime + i*0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i*0.15 + 0.5);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i*0.15); osc.stop(this.ctx.currentTime + i*0.15 + 0.5);
        });
    }
}

class HydraGame {
    constructor() {
        this.audio = new AudioEngine();
        
        // Neue Kapitel-Konfiguration verknüpfen
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
        
        // Fortschritt laden
        this.totalXP = parseInt(localStorage.getItem('hydra_xp')) || 0;
        this.solvedLevels = JSON.parse(localStorage.getItem('hydra_solved')) || {};
        
        // Gameplay Variablen
        this.grid = [];
        this.inventory = {};
        this.selectedTool = null;
        this.clickCount = 0;
        this.isFlowing = false;
        this.flowAnimationProgress = 0;
        this.animationTimer = null;

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
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        document.getElementById('reset-btn').addEventListener('click', () => this.resetLevel());
        document.getElementById('flow-btn').addEventListener('click', () => this.toggleFlow());
        document.getElementById('profile-btn').addEventListener('click', () => this.showProfile());
        document.getElementById('btn-close-profile').addEventListener('click', () => {
            document.getElementById('modal-profile').classList.add('hidden');
        });
        document.getElementById('btn-save-profile').addEventListener('click', () => this.saveProfile());
        document.getElementById('btn-reset-progress').addEventListener('click', () => this.resetAllData());
        document.getElementById('btn-next-level').addEventListener('click', () => {
            document.getElementById('modal-win').classList.add('hidden');
            this.nextLevel();
        });
    }

    updateTopBar() {
        const agentName = localStorage.getItem('hydra_agent_name') || 'Agent-X';
        document.getElementById('top-agent-name').innerText = agentName;
        document.getElementById('top-xp').innerText = `${this.totalXP} XP`;
        let starCount = Object.values(this.solvedLevels).reduce((a, b) => a + b, 0);
        document.getElementById('top-stars').innerText = starCount;
    }

    renderLevelList() {
        const gridContainer = document.getElementById('level-grid');
        const menuTitle = document.getElementById('menu-title');
        gridContainer.innerHTML = '';

        if (this.currentChapter === null) {
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
            const chap = this.chapters[this.currentChapter];
            menuTitle.innerText = chap.title;
            gridContainer.className = "grid grid-cols-4 gap-2.5 p-1 max-h-[68vh] overflow-y-auto w-full";

            const backBtn = document.createElement('button');
            backBtn.className = "col-span-full py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-cyan-400 transition-colors";
            backBtn.innerHTML = `⬅ Zurück zur Kapitelübersicht`;
            backBtn.addEventListener('click', () => {
                this.audio.playClick();
                this.currentChapter = null;
                this.renderLevelList();
            });
            gridContainer.appendChild(backBtn);

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

        this.clickCount = 0;
        this.isFlowing = false;
        this.flowAnimationProgress = 0;
        if (this.animationTimer) clearInterval(this.animationTimer);

        this.inventory = { ...this.levelData.inventory };
        this.selectedTool = Object.keys(this.inventory).find(k => this.inventory[k] > 0) || null;

        this.grid = [];
        const cols = this.levelData.gridSize.cols;
        const rows = this.levelData.gridSize.rows;

        for (let x = 0; x < cols; x++) {
            this.grid[x] = [];
            for (let y = 0; y < rows; y++) {
                this.grid[x][y] = { type: 'empty', pipeType: null, dir: 0, flows: {} };
            }
        }

        this.levelData.walls.forEach(w => {
            if (this.grid[w.x] && this.grid[w.x][w.y]) this.grid[w.x][w.y].type = 'wall';
        });

        this.levelData.sources.forEach(s => {
            if (this.grid[s.x] && this.grid[s.x][s.y]) {
                this.grid[s.x][s.y].type = 'source';
                this.grid[s.x][s.y].color = s.color;
            }
        });

        this.levelData.targets.forEach(t => {
            if (this.grid[t.x] && this.grid[t.x][t.y]) {
                this.grid[t.x][t.y].type = 'target';
                this.grid[t.x][t.y].requiredColor = t.requiredColor;
            }
        });

        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        document.getElementById('game-level-title').innerText = `Sektor ${index + 1}`;
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
            if (this.inventory[key] === undefined || this.inventory[key] === 0) return;
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
        document.getElementById('game-clicks-display').innerText = `${this.clickCount} / ${this.levelData.parClicks}`;
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

        if (cell.type === 'empty' && this.selectedTool && this.inventory[this.selectedTool] > 0) {
            this.audio.playClick();
            cell.type = 'pipe';
            cell.pipeType = this.selectedTool;
            cell.dir = 0;
            this.inventory[this.selectedTool]--;
            this.clickCount++;
        } else if (cell.type === 'pipe') {
            this.audio.playClick();
            if (e.shiftKey || cell.pipeType !== this.selectedTool) {
                this.inventory[cell.pipeType]++;
                cell.type = 'empty';
                cell.pipeType = null;
                cell.dir = 0;
            } else {
                cell.dir = (cell.dir + 1) % 4;
                this.clickCount++;
            }
        }

        this.updateInventoryUI();
        this.updateClicksUI();
        this.draw();
    }

    toggleFlow() {
        if (this.isFlowing) {
            this.isFlowing = false;
            this.flowAnimationProgress = 0;
            clearInterval(this.animationTimer);
            document.getElementById('flow-btn').innerText = "Fluss Starten";
            this.clearFlows();
            this.draw();
        } else {
            this.isFlowing = true;
            this.audio.playFlowStart();
            document.getElementById('flow-btn').innerText = "Stoppen";
            this.simulateFlows();
            
            this.animationTimer = setInterval(() => {
                this.flowAnimationProgress += 5;
                if (this.flowAnimationProgress >= 100) {
                    this.flowAnimationProgress = 100;
                    clearInterval(this.animationTimer);
                    this.checkWinCondition();
                }
                this.draw();
            }, 25);
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
        const dx = [0, 1, 0, -1]; // 0: Oben, 1: Rechts, 2: Unten, 3: Links
        const dy = [-1, 0, 1, 0];

        // 1. Alle Portale auf dem Feld lokalisieren
        let portalsOnBoard = [];
        for(let x=0; x<this.levelData.gridSize.cols; x++) {
            for(let y=0; y<this.levelData.gridSize.rows; y++) {
                if(this.grid[x] && this.grid[x][y] && this.grid[x][y].type === 'pipe' && this.grid[x][y].pipeType === 'portals') {
                    portalsOnBoard.push({x, y});
                }
            }
        }

        // 2. Quellen einspeisen
        this.levelData.sources.forEach(s => {
            for (let d = 0; d < 4; d++) {
                queue.push({ x: s.x + dx[d], y: s.y + dy[d], incomingDir: (d + 2) % 4, color: s.color });
            }
        });

        let iterations = 0;
        while (queue.length > 0 && iterations < 2500) {
            iterations++;
            let current = queue.shift();
            let x = current.x;
            let y = current.y;
            
            if (x < 0 || x >= this.levelData.gridSize.cols || y < 0 || y >= this.levelData.gridSize.rows) continue;
            let cell = this.grid[x][y];
            if (!cell) continue;

            if (cell.type === 'pipe') {
                let outDirs = [];
                let inDir = current.incomingDir;
                let cType = cell.pipeType;
                let rot = cell.dir;

                if (cType === 'pipes_straight') {
                    let isOpen = (rot % 2 === 0) ? (inDir === 0 || inDir === 2) : (inDir === 1 || inDir === 3);
                    if (isOpen && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let outDir = (inDir + 2) % 4;
                        cell.flows[outDir] = current.color;
                        outDirs.push(outDir);
                    }
                } else if (cType === 'pipes_angle') {
                    let localizedIn = (inDir - rot + 4) % 4;
                    if ((localizedIn === 0 || localizedIn === 1) && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let outDir = ((localizedIn === 0 ? 1 : 0) + rot) % 4;
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
                    if (inDir !== rot && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let existingColors = Object.keys(cell.flows).filter(d => parseInt(d) !== rot).map(d => cell.flows[d]);
                        let mixed = this.mixColors(existingColors);
                        cell.flows[rot] = mixed;
                        outDirs.push(rot);
                    }
                } else if (cType === 'splitters') {
                    let backSide = (rot + 2) % 4;
                    if (inDir === backSide && !cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let splits = this.splitColor(current.color);
                        let leftDir = (rot + 3) % 4;
                        let rightDir = (rot + 1) % 4;
                        cell.flows[leftDir] = splits[0];
                        cell.flows[rightDir] = splits[1] || splits[0];
                        outDirs.push(leftDir, rightDir);
                    }
                } else if (cType === 'valves') {
                    let mainInput = (rot + 2) % 4;
                    let sideLeft = (rot + 3) % 4;
                    let sideRight = (rot + 1) % 4;

                    if (!cell.flows[inDir]) cell.flows[inDir] = current.color;

                    let hasPressure = cell.flows[sideLeft] || cell.flows[sideRight];
                    if (hasPressure && cell.flows[mainInput]) {
                        cell.flows[rot] = cell.flows[mainInput];
                        outDirs.push(rot);
                    }
                } else if (cType === 'andGates') {
                    if (!cell.flows[inDir]) cell.flows[inDir] = current.color;
                    let activeInputs = Object.keys(cell.flows).filter(d => parseInt(d) !== rot);
                    if (activeInputs.length >= 2) {
                        cell.flows[rot] = current.color; 
                        outDirs.push(rot);
                    }
                } else if (cType === 'portals') {
                    if (!cell.flows[inDir]) {
                        cell.flows[inDir] = current.color;
                        let other = portalsOnBoard.find(p => p.x !== x || p.y !== y);
                        if (other) {
                            let otherCell = this.grid[other.x][other.y];
                            if(otherCell && !otherCell.flows[inDir]) {
                                otherCell.flows[inDir] = current.color;
                                for(let d=0; d<4; d++) {
                                    queue.push({ x: other.x + dx[d], y: other.y + dy[d], incomingDir: (d + 2) % 4, color: current.color });
                                }
                            }
                        }
                    }
                }

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
            if (!values.includes(t.requiredColor)) allMatched = false;
        });

        if (allMatched && this.levelData.targets.length > 0) {
            this.handleWin();
        }
    }

    handleWin() {
        this.audio.playWin();
        let stars = 1;
        if (this.clickCount <= this.levelData.parClicks) stars = 3;
        else if (this.clickCount <= this.levelData.parClicks + 2) stars = 2;

        let key = `${this.currentChapter}_${this.currentLevelIndex}`;
        let previousStars = this.solvedLevels[key] || 0;

        if (stars > previousStars) {
            this.solvedLevels[key] = stars;
            this.totalXP += this.levelData.xpReward || 100;
            localStorage.setItem('hydra_xp', this.totalXP);
            localStorage.setItem('hydra_solved', JSON.stringify(this.solvedLevels));
        }

        document.getElementById('win-xp-reward').innerText = `+${this.levelData.xpReward || 100} XP`;
        const container = document.getElementById('win-stars-container');
        container.innerHTML = '⭐'.repeat(stars);

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
        this.startLevel(this.currentChapter, this.currentLevelIndex);
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
        const nameInput = document.getElementById('profile-name-input');
        if (nameInput) {
            nameInput.value = localStorage.getItem('hydra_agent_name') || 'Agent-X';
        }

        let rankTitle = "Novize";
        if (this.totalXP > 4000) rankTitle = "Großmeister-Kybernetiker";
        else if (this.totalXP > 1500) rankTitle = "System-Architekt";
        else if (this.totalXP > 500) rankTitle = "Feld-Techniker";
        
        document.getElementById('modal-xp-rank').innerText = rankTitle;
        document.getElementById('modal-xp').innerText = `${this.totalXP} XP`;
        
        let starCount = Object.values(this.solvedLevels).reduce((a, b) => a + b, 0);
        document.getElementById('modal-stars').innerText = starCount;
        document.getElementById('modal-profile').classList.remove('hidden');
    }

    saveProfile() {
        const nameInput = document.getElementById('profile-name-input');
        if (nameInput) {
            localStorage.setItem('hydra_agent_name', nameInput.value.trim() || 'Agent-X');
        }
        document.getElementById('modal-profile').classList.add('hidden');
        this.updateTopBar();
    }

    resetAllData() {
        if (confirm("Fortschritt wirklich restlos löschen?")) {
            localStorage.clear();
            this.totalXP = 0;
            this.solvedLevels = {};
            this.currentChapter = null;
            this.updateTopBar();
            document.getElementById('modal-profile').classList.add('hidden');
            this.renderLevelList();
        }
    }

    drawCB(x, y, color) {
        this.ctx.save();
        this.ctx.shadowBlur = 8;
        this.ctx.shadowColor = this.colorMap[color];
        this.ctx.fillStyle = this.colorMap[color];
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    draw() {
        if (!this.levelData) return;
        const cols = this.levelData.gridSize.cols;
        const rows = this.levelData.gridSize.rows;
        const s = this.canvas.width / cols;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const cell = this.grid[x][y];
                if (!cell) continue;
                const cx = x * s + s / 2;
                const cy = y * s + s / 2;

                this.ctx.save();
                this.ctx.translate(cx, cy);

                if (cell.type === 'wall') {
                    this.ctx.fillStyle = '#1c1c1e';
                    this.ctx.fillRect(-s/2 + 2, -s/2 + 2, s - 4, s - 4);
                } else if (cell.type === 'source') {
                    let col = this.colorMap[cell.color];
                    this.ctx.fillStyle = col;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2); this.ctx.fill();
                } else if (cell.type === 'target') {
                    let col = this.colorMap[cell.requiredColor];
                    this.ctx.strokeStyle = col; this.ctx.lineWidth = 3;
                    this.ctx.strokeRect(-s/3, -s/3, s*2/3, s*2/3);
                } else if (cell.type === 'pipe') {
                    this.ctx.rotate(cell.dir * Math.PI / 2);
                    this.ctx.strokeStyle = '#3f3f46';
                    this.ctx.lineWidth = s * 0.25;
                    this.ctx.lineCap = 'round';

                    let isFlowing = this.isFlowing && Object.keys(cell.flows).length > 0;
                    let flowColors = Object.values(cell.flows);

                    if (cell.pipeType === 'pipes_straight') {
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        if (isFlowing) {
                            this.ctx.strokeStyle = this.colorMap[flowColors[0]];
                            this.ctx.lineWidth = s * 0.14;
                            this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        }
                    } else if (cell.pipeType === 'pipes_angle') {
                        this.ctx.beginPath(); this.ctx.arc(-s/2, -s/2, s/2, 0, Math.PI / 2); this.ctx.stroke();
                        if (isFlowing) {
                            this.ctx.strokeStyle = this.colorMap[flowColors[0]];
                            this.ctx.lineWidth = s * 0.14;
                            this.ctx.beginPath(); this.ctx.arc(-s/2, -s/2, s/2, 0, Math.PI / 2); this.ctx.stroke();
                        }
                    } else if (cell.pipeType === 'pipes_cross') {
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(-s/2, 0); this.ctx.lineTo(s/2, 0); this.ctx.stroke();
                        if (isFlowing) {
                            this.ctx.lineWidth = s * 0.14;
                            if (cell.flows[0] || cell.flows[2]) {
                                this.ctx.strokeStyle = this.colorMap[cell.flows[0] || cell.flows[2]];
                                this.ctx.beginPath(); this.ctx.moveTo(0, -s/2); this.ctx.lineTo(0, s/2); this.ctx.stroke();
                            }
                            if (cell.flows[1] || cell.flows[3]) {
                                this.ctx.strokeStyle = this.colorMap[cell.flows[1] || cell.flows[3]];
                                this.ctx.beginPath(); this.ctx.moveTo(-s/2, 0); this.ctx.lineTo(s/2, 0); this.ctx.stroke();
                            }
                        }
                    } else {
                        // Original-Kombinator Gehäuse aus v13.4
                        this.ctx.fillStyle = '#27272a';
                        this.ctx.fillRect(-s/3, -s/3, s*2/3, s*2/3);
                        this.ctx.strokeRect(-s/3, -s/3, s*2/3, s*2/3);
                        
                        this.ctx.fillStyle = '#71717a';
                        this.ctx.font = `bold ${s*0.22}px sans-serif`;
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        let sym = '?';
                        if (cType === 'mixers') sym = '🧪';
                        if (cType === 'splitters') sym = '⚗️';
                        if (cType === 'valves') sym = '🛑';
                        if (cType === 'andGates') sym = '＆';
                        if (cType === 'portals') sym = '🌀';
                        this.ctx.fillText(sym, 0, 0);

                        if(isFlowing && flowColors.length > 0) {
                            let activeCol = cell.flows[cell.dir] || flowColors[0];
                            this.ctx.fillStyle = this.colorMap[activeCol];
                            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.16, 0, Math.PI*2); this.ctx.fill();
                            this.drawCB(0, 0, activeCol);
                        }
                    }
                }
                this.ctx.restore();
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new HydraGame();
    
    const menuBtn = document.getElementById('menu-btn');
    if(menuBtn) {
        menuBtn.addEventListener('click', () => {
            window.gameInstance.returnToMenu();
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.error(err));
    }
});
