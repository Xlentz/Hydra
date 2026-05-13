/**
 * HYDRA-LOGIC CORE ENGINE
 * Fokus: Geschlossene Flüssigkeitsleitungen, High-End Geometrie & sichtbares Spielfeldgitter
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }
    
    initContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    
    playClick() {
        this.initContext();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine'; 
        osc.frequency.setValueAtTime(550, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(280, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    }
    
    playFlowStart() {
        this.initContext();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(220, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.5);
    }
    
    playWin() {
        this.initContext();
        if (!this.enabled || !this.ctx || this.ctx.state === 'suspended') return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator(); 
            const gain = this.ctx.createGain();
            osc.type = 'sine'; 
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.12);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.12 + 0.4);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + i * 0.12); 
            osc.stop(this.ctx.currentTime + i * 0.12 + 0.4);
        });
    }
}

class HydraGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioEngine();
        
        this.currentLevel = null;
        this.grid = []; 
        this.initialInventory = null; 
        this.activeTool = 'PIPE_STRAIGHT';
        this.cellSize = 60;
        this.offsetX = 0; 
        this.offsetY = 0;
        
        this.isFlowing = false;
        this.clicks = 0;
        this.flowAnimationProgress = 0; 
        this.animationTime = 0; 
        
        this.avatars = ["🐭","👻","👽","👨🏻‍💼","🥷🏼","🧙🏻","👩🏻‍💼","🦊","🐵","🐶","🦁","🐯","🐰","🐙","⚽️"];
        this.selectedAvatarTemp = "🐭"; 
        
        this.colorMap = { 
            'blue': '#06b6d4',   
            'yellow': '#eab308', 
            'red': '#ef4444',    
            'green': '#10b981',  
            'purple': '#a855f7', 
            'orange': '#f97316'  
        };

        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            name: "Techniker", avatar: "🐭", xp: 0, stars: 0, levelStars: {}, audio: true, colorblind: false 
        };
        
        if (!this.avatars.includes(this.playerStats.avatar)) {
            this.playerStats.avatar = "🐭";
        }
        this.selectedAvatarTemp = this.playerStats.avatar;
        this.audio.enabled = this.playerStats.audio;

        this.init();
        window.addEventListener('resize', () => this.resize());
        
        const unlockAudio = () => {
            this.audio.initContext();
            document.body.removeEventListener('click', unlockAudio);
            document.body.removeEventListener('touchstart', unlockAudio);
        };
        document.body.addEventListener('click', unlockAudio);
        document.body.addEventListener('touchstart', unlockAudio);
    }

    init() {
        this.resize();
        this.renderLevelList();
        this.buildAvatarGrid();
        this.setupEventListeners();
        requestAnimationFrame(() => this.gameLoop());
        this.updateUI(); 
    }

    buildAvatarGrid() {
        const container = document.getElementById('avatar-container');
        if (!container) return;
        container.innerHTML = '';
        
        this.avatars.forEach(av => {
            const btn = document.createElement('button');
            btn.dataset.avatar = av;
            btn.className = "avatar-btn h-12 rounded-xl border border-slate-700 text-2xl flex items-center justify-center hover:bg-slate-800 transition-all";
            btn.textContent = av;
            
            if (av === this.selectedAvatarTemp) {
                btn.classList.add('selected');
            }
            
            btn.onclick = (e) => {
                document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
                e.currentTarget.classList.add('selected');
                this.selectedAvatarTemp = av;
                this.audio.playClick();
            };
            
            container.appendChild(btn);
        });
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        
        if (this.currentLevel) {
            const { cols, rows } = this.currentLevel.gridSize;
            this.cellSize = Math.min(rect.width / (cols + 1), rect.height / (rows + 3));
            if (this.cellSize > 75) this.cellSize = 75;
            this.centerGrid(rect.width, rect.height);
        }
    }

    centerGrid(w = parseFloat(this.canvas.style.width), h = parseFloat(this.canvas.style.height)) {
        if (!this.currentLevel) return;
        const gridW = this.currentLevel.gridSize.cols * this.cellSize;
        const gridH = this.currentLevel.gridSize.rows * this.cellSize;
        this.offsetX = (w - gridW) / 2;
        this.offsetY = (h - gridH) / 2 - 20; 
    }

    updateUI() {
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        setEl('player-name', this.playerStats.name);
        setEl('header-avatar', this.playerStats.avatar);
        setEl('btn-open-profile', this.playerStats.avatar);
        setEl('player-xp', this.playerStats.xp);
        setEl('player-stars', this.playerStats.stars);
        
        if (this.currentLevel && this.initialInventory) {
            setEl('inv-straight', this.currentLevel.inventory.pipes_straight || 0);
            setEl('inv-angle', this.currentLevel.inventory.pipes_angle || 0);
            setEl('inv-cross', this.currentLevel.inventory.pipes_cross || 0);
            setEl('inv-and', this.currentLevel.inventory.andGates || 0);
            setEl('inv-mix', this.currentLevel.inventory.mixers || 0);
            setEl('inv-split', this.currentLevel.inventory.splitters || 0);
            setEl('inv-portal', this.currentLevel.inventory.portals || 0);
            setEl('inv-valve', this.currentLevel.inventory.valves || 0);
            
            const toolKeys = {
                'straight': 'pipes_straight', 'angle': 'pipes_angle', 'cross': 'pipes_cross',
                'and': 'andGates', 'mix': 'mixers', 'split': 'splitters', 'portal': 'portals', 'valve': 'valves'
            };
            
            for (let t in toolKeys) {
                const btn = document.getElementById(`btn-t-${t}`);
                if (btn) btn.style.display = (this.initialInventory[toolKeys[t]] > 0) ? 'flex' : 'none';
            }
            
            setEl('header-level-info', `Sektor ${this.currentLevel.id}`);
            setEl('click-counter', this.clicks);
            setEl('par-clicks', this.currentLevel.parClicks || 10);
        }
        
        const audioBtn = document.getElementById('toggle-audio');
        const audioKnob = document.getElementById('audio-knob');
        if(audioBtn && audioKnob) {
            audioBtn.classList.toggle('bg-cyan-500', this.playerStats.audio);
            audioBtn.classList.toggle('bg-slate-700', !this.playerStats.audio);
            audioKnob.style.transform = this.playerStats.audio ? 'translateX(24px)' : 'translateX(0)';
        }
        
        const cbBtn = document.getElementById('toggle-colorblind');
        const cbKnob = document.getElementById('colorblind-knob');
        if(cbBtn && cbKnob) {
            cbBtn.classList.toggle('bg-cyan-500', this.playerStats.colorblind);
            cbBtn.classList.toggle('bg-slate-700', !this.playerStats.colorblind);
            cbKnob.style.transform = this.playerStats.colorblind ? 'translateX(24px)' : 'translateX(0)';
        }
    }

    renderLevelList() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        HYDRA_LEVELS.forEach((level, index) => {
            const btn = document.createElement('button');
            let stars = this.playerStats.levelStars ? (this.playerStats.levelStars[level.id] || 0) : 0;
            let starHtml = '';
            if (stars > 0) {
                starHtml = `<div class="flex mt-1">`;
                for(let i=0; i<3; i++) {
                    starHtml += `<svg class="w-3 h-3 ${i<stars ? 'text-yellow-400' : 'text-slate-600'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
                }
                starHtml += `</div>`;
            }
            
            let isCompleted = stars > 0;
            btn.className = `h-16 flex flex-col items-center justify-center rounded-xl font-bold transition-all ${isCompleted ? 'bg-cyan-950/80 border-cyan-500/50' : 'bg-slate-900 border-slate-800'} hover:bg-cyan-900/50 shadow-lg border hover:scale-105`;
            btn.innerHTML = `<span class="text-xl text-cyan-100">${level.id}</span>${starHtml}`;
            btn.onclick = () => this.startLevel(index);
            grid.appendChild(btn);
        });
    }

    startLevel(index) {
        this.currentLevel = JSON.parse(JSON.stringify(HYDRA_LEVELS[index]));
        this.initialInventory = JSON.parse(JSON.stringify(this.currentLevel.inventory));
        
        this.isFlowing = false;
        this.clicks = 0;
        this.flowAnimationProgress = 0;
        
        this.resize();
        const { cols, rows } = this.currentLevel.gridSize;
        this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
        
        if (this.currentLevel.walls) {
            this.currentLevel.walls.forEach(w => {
                if(this.grid[w.y] && this.grid[w.y][w.x] === null) this.grid[w.y][w.x] = { type: 'WALL' };
            });
        }
        
        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        this.updateUI();
        this.calculateFlow(true); 
    }

    setupEventListeners() {
        const modal = document.getElementById('profile-modal');

        document.getElementById('btn-open-profile').onclick = () => {
            document.getElementById('input-player-name').value = this.playerStats.name;
            document.getElementById('modal-xp').textContent = this.playerStats.xp + ' XP';
            document.getElementById('modal-stars').textContent = this.playerStats.stars;
            
            this.selectedAvatarTemp = this.playerStats.avatar;
            this.buildAvatarGrid();
            
            modal.classList.remove('hidden');
        };
        
        document.getElementById('btn-close-profile').onclick = () => modal.classList.add('hidden');
        
        document.getElementById('btn-save-profile').onclick = () => {
            const nameInput = document.getElementById('input-player-name').value.trim();
            if(nameInput) this.playerStats.name = nameInput;
            
            this.playerStats.avatar = this.selectedAvatarTemp;
            localStorage.setItem('hydra_stats', JSON.stringify(this.playerStats));
            this.updateUI();
            modal.classList.add('hidden');
        };
        
        document.getElementById('toggle-audio').onclick = () => {
            this.playerStats.audio = !this.playerStats.audio;
            this.audio.enabled = this.playerStats.audio;
            this.updateUI();
        };
        
        document.getElementById('toggle-colorblind').onclick = () => {
            this.playerStats.colorblind = !this.playerStats.colorblind;
            this.updateUI();
        };

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.activeTool = target.dataset.tool;
            });
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.currentLevel || this.isFlowing) return;
            const rect = this.canvas.getBoundingClientRect();
            const col = Math.floor((e.clientX - rect.left - this.offsetX) / this.cellSize);
            const row = Math.floor((e.clientY - rect.top - this.offsetY) / this.cellSize);
            if (col >= 0 && col < this.currentLevel.gridSize.cols && row >= 0 && row < this.currentLevel.gridSize.rows) {
                this.handleCellClick(col, row);
            }
        });

        document.getElementById('btn-play').onclick = () => {
            if(this.isFlowing) return;
            this.isFlowing = true;
            this.audio.playFlowStart();
            this.calculateFlow(false);
            
            this.flowAnimationProgress = 0;
            const animInterval = setInterval(() => {
                this.flowAnimationProgress += 3;
                if(this.flowAnimationProgress >= 100) {
                    clearInterval(animInterval);
                    this.checkWinCondition();
                }
            }, 40);
        };
        
        document.getElementById('btn-reset').onclick = () => {
            if(this.currentLevel) this.startLevel(this.currentLevel.id - 1);
        };
        
        document.getElementById('btn-solution').onclick = () => {
            if (this.currentLevel && this.currentLevel.hint) alert("Tipp: " + this.currentLevel.hint);
            else alert("Für diesen Sektor sind leider keine Tipps verfügbar.");
        };
        
        document.getElementById('btn-next').onclick = () => {
            document.getElementById('win-overlay').classList.add('hidden');
            if (this.currentLevel.id < HYDRA_LEVELS.length) this.startLevel(this.currentLevel.id);
            else location.reload();
        };
    }

    handleCellClick(x, y) {
        if (this.isSourceOrTarget(x, y)) return;
        const cell = this.grid[y][x];
        const inv = this.currentLevel.inventory;

        if (this.activeTool === 'DELETE') {
            if (cell && cell.type !== 'WALL') {
                if(cell.type === 'PIPE_STRAIGHT') inv.pipes_straight++;
                if(cell.type === 'PIPE_ANGLE') inv.pipes_angle++;
                if(cell.type === 'PIPE_CROSS') inv.pipes_cross++;
                if(cell.type === 'AND_GATE') inv.andGates++;
                if(cell.type === 'MIXER') inv.mixers++;
                if(cell.type === 'SPLITTER') inv.splitters++;
                if(cell.type === 'PORTAL') inv.portals++;
                if(cell.type === 'VALVE') inv.valves++;
                this.grid[y][x] = null;
                this.audio.playClick();
                this.clicks--;
            }
        } else {
            if (cell) {
                if(['PIPE_STRAIGHT', 'PIPE_ANGLE', 'PIPE_CROSS', 'AND_GATE', 'MIXER', 'SPLITTER', 'VALVE'].includes(cell.type)) {
                    cell.rotation = (cell.rotation + 1) % 4;
                    this.audio.playClick();
                }
            } else {
                let placed = false;
                if (this.activeTool === 'PIPE_STRAIGHT' && inv.pipes_straight > 0) { this.grid[y][x] = { type: 'PIPE_STRAIGHT', rotation: 0 }; inv.pipes_straight--; placed = true; }
                else if (this.activeTool === 'PIPE_ANGLE' && inv.pipes_angle > 0) { this.grid[y][x] = { type: 'PIPE_ANGLE', rotation: 0 }; inv.pipes_angle--; placed = true; }
                else if (this.activeTool === 'PIPE_CROSS' && inv.pipes_cross > 0) { this.grid[y][x] = { type: 'PIPE_CROSS', rotation: 0 }; inv.pipes_cross--; placed = true; }
                else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) { this.grid[y][x] = { type: 'AND_GATE', rotation: 0 }; inv.andGates--; placed = true; }
                else if (this.activeTool === 'MIXER' && inv.mixers > 0) { this.grid[y][x] = { type: 'MIXER', rotation: 0 }; inv.mixers--; placed = true; }
                else if (this.activeTool === 'SPLITTER' && inv.splitters > 0) { this.grid[y][x] = { type: 'SPLITTER', rotation: 0 }; inv.splitters--; placed = true; }
                else if (this.activeTool === 'PORTAL' && inv.portals > 0) { this.grid[y][x] = { type: 'PORTAL', rotation: 0 }; inv.portals--; placed = true; }
                else if (this.activeTool === 'VALVE' && inv.valves > 0) { this.grid[y][x] = { type: 'VALVE', rotation: 0 }; inv.valves--; placed = true; }
                
                if(placed) { this.audio.playClick(); this.clicks++; }
            }
        }
        
        if (this.clicks < 0) this.clicks = 0;
        this.updateUI();
        this.calculateFlow(true); 
    }
    
    isSourceOrTarget(x, y) {
        let isST = false;
        this.currentLevel.sources.forEach(s => { if(s.x === x && s.y === y) isST = true; });
        this.currentLevel.targets.forEach(t => { if(t.x === x && t.y === y) isST = true; });
        return isST;
    }

    getPorts(cell) {
        if (!cell) return [];
        const t = cell.type; const r = cell.rotation || 0;
        if (t === 'PIPE_STRAIGHT') return r % 2 === 0 ? [1, 3] : [0, 2];
        if (t === 'PIPE_ANGLE') {
            if(r === 0) return [0, 1]; if(r === 1) return [1, 2];
            if(r === 2) return [2, 3]; if(r === 3) return [3, 0];
        }
        if (t === 'PIPE_CROSS' || t === 'AND_GATE' || t === 'MIXER' || t === 'SPLITTER' || t === 'VALVE' || t === 'PORTAL') return [0, 1, 2, 3];
        return [];
    }

    canConnect(fromX, fromY, toX, toY, dir) {
        const fromCell = this.grid[fromY] && this.grid[fromY][fromX];
        const toCell = this.grid[toY] && this.grid[toY][toX];
        let fromPorts = fromCell ? this.getPorts(fromCell) : [0,1,2,3]; 
        let toPorts = toCell ? this.getPorts(toCell) : [0,1,2,3];
        const oppDir = (dir + 2) % 4;
        return fromPorts.includes(dir) && toPorts.includes(oppDir);
    }

    mixColors(c1, c2) {
        const p = [c1, c2].sort().join('+');
        if (p === 'blue+yellow') return 'green';
        if (p === 'blue+red') return 'purple';
        if (p === 'red+yellow') return 'orange';
        return c1;
    }

    unmixColor(color) {
        if (color === 'green') return ['blue', 'yellow'];
        if (color === 'purple') return ['blue', 'red'];
        if (color === 'orange') return ['red', 'yellow'];
        return [color];
    }

    calculateFlow(silent = true) {
        if (!this.currentLevel) return;
        let portals = [];
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                if(this.grid[r][c] && this.grid[r][c].type !== 'WALL') {
                    this.grid[r][c].flows = {}; 
                    this.grid[r][c].inputs = [];
                    this.grid[r][c].inputOrigins = new Set();
                    if(this.grid[r][c].type === 'PORTAL') portals.push({x:c, y:r});
                }
            }
        }
        this.currentLevel.targets.forEach(t => t.currentFlow = null);
        if (!this.isFlowing && !silent) return; 

        let queue = [];
        this.currentLevel.sources.forEach(s => queue.push({x: s.x, y: s.y, color: s.color, fromDir: null}));

        let iters = 0;
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}];

        while (queue.length > 0 && iters < 2000) {
            iters++;
            let node = queue.shift();
            let currentCell = this.grid[node.y][node.x];
            
            if (currentCell && currentCell.type === 'PORTAL' && portals.length === 2) {
                if (node.fromDir !== 'portal') {
                    let other = portals.find(p => p.x !== node.x || p.y !== node.y);
                    if (other) {
                        let otherCell = this.grid[other.y][other.x];
                        if(!otherCell.flows['out']) {
                            otherCell.flows['out'] = node.color; 
                            queue.push({x: other.x, y: other.y, color: node.color, fromDir: 'portal'});
                        }
                    }
                    continue; 
                }
            }

            let availableColors = null;
            if (node.color === 'split_trigger') availableColors = [...node.colors];

            DIRS.forEach(move => {
                if (node.fromDir !== null && move.d === (node.fromDir + 2) % 4) return; 
                if (currentCell && currentCell.type === 'PIPE_CROSS' && node.fromDir !== null && move.d !== node.fromDir) return;
                
                let emitColor = node.color;
                if (node.color === 'split_trigger') {
                    if (availableColors.length === 0) return;
                    emitColor = availableColors[0];
                }

                if (currentCell && currentCell.type === 'VALVE') {
                    let r = currentCell.rotation || 0;
                    let inline = (r % 2 === 0) ? [1, 3] : [0, 2];
                    let control = (r % 2 === 0) ? [0, 2] : [1, 3];
                    if(inline.includes(move.d)) {
                        let hasPressure = false;
                        control.forEach(cdir => { if(currentCell.flows[cdir]) hasPressure = true; });
                        if(!hasPressure) return;
                    }
                }

                let nx = node.x + move.dx; let ny = node.y + move.dy;
                if (nx >= 0 && nx < this.currentLevel.gridSize.cols && ny >= 0 && ny < this.currentLevel.gridSize.rows) {
                    if (!this.canConnect(node.x, node.y, nx, ny, move.d)) return;

                    const consumeSplit = () => {
                        if (node.color === 'split_trigger') {
                            let consumed = availableColors.shift();
                            if(availableColors.length === 1) currentCell.flows['out1_rendered'] = consumed;
                            if(availableColors.length === 0) currentCell.flows['out2_rendered'] = consumed;
                        }
                    };

                    let target = this.currentLevel.targets.find(t => t.x === nx && t.y === ny);
                    if (target) { target.currentFlow = emitColor; consumeSplit(); return; }

                    let cell = this.grid[ny][nx];
                    if (cell && cell.type !== 'WALL') {
                        if(cell.flows[move.d] === emitColor) return;
                        if (cell.type.startsWith('PIPE') || cell.type === 'PORTAL') {
                            cell.flows[move.d] = emitColor;
                            queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            consumeSplit();
                        } else if (cell.type === 'VALVE') {
                            cell.flows[move.d] = emitColor;
                            let r = cell.rotation || 0;
                            if(((r%2===0) ? [1,3] : [0,2]).includes(move.d)) {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            }
                            consumeSplit();
                        } else if (cell.type === 'AND_GATE') {
                            cell.inputOrigins.add(move.d);
                            if(!cell.inputs.includes(emitColor)) cell.inputs.push(emitColor);
                            if (cell.inputOrigins.size >= 2) {
                                cell.flows['out'] = cell.inputs[0];
                                queue.push({x: nx, y: ny, color: cell.inputs[0], fromDir: null});
                            }
                            consumeSplit();
                        } else if (cell.type === 'MIXER') {
                            cell.inputOrigins.add(move.d);
                            if (!cell.inputs.includes(emitColor)) cell.inputs.push(emitColor);
                            if (cell.inputOrigins.size >= 2) {
                                let mixed = this.mixColors(cell.inputs[0], cell.inputs[1]);
                                cell.flows['out'] = mixed;
                                queue.push({x: nx, y: ny, color: mixed, fromDir: null});
                            } else {
                                cell.flows['out'] = cell.inputs[0];
                            }
                            consumeSplit();
                        } else if (cell.type === 'SPLITTER') {
                            cell.inputOrigins.add(move.d);
                            let unmix = this.unmixColor(emitColor);
                            if(unmix.length === 2) {
                                queue.push({x: nx, y: ny, color: 'split_trigger', colors: unmix, fromDir: move.d});
                            } else {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            }
                        }
                    }
                }
            });
        }
    }

    checkWinCondition() {
        if (!this.currentLevel) return;
        let win = true;
        this.currentLevel.targets.forEach(t => { if(t.currentFlow !== t.requiredColor) win = false; });
        
        if (win) {
            this.audio.playWin();
            let starsEarned = 1;
            if (this.clicks <= this.currentLevel.parClicks) starsEarned = 3;
            else if (this.clicks <= this.currentLevel.parClicks + 3) starsEarned = 2;

            let prevStars = this.playerStats.levelStars[this.currentLevel.id] || 0;
            if(starsEarned > prevStars) {
                this.playerStats.stars += (starsEarned - prevStars);
                this.playerStats.levelStars[this.currentLevel.id] = starsEarned;
            }
            
            const xpGain = this.currentLevel.xpReward || 100;
            this.playerStats.xp += xpGain;
            localStorage.setItem('hydra_stats', JSON.stringify(this.playerStats));
            
            document.getElementById('win-xp').textContent = `+${xpGain} XP`;
            let clickInfo = document.getElementById('win-clicks-info');
            if(starsEarned === 3) clickInfo.textContent = "Perfekt (Optimal)";
            else if(starsEarned === 2) clickInfo.textContent = "Effizient";
            else clickInfo.textContent = "Abgeschlossen";
            
            let starsContainer = document.getElementById('win-stars');
            starsContainer.innerHTML = '';
            for(let i=0; i<3; i++) {
                starsContainer.innerHTML += `<svg class="w-10 h-10 ${i<starsEarned ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-slate-700'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
            }
            
            document.getElementById('win-overlay').classList.remove('hidden');
            this.renderLevelList();
        } else {
            this.isFlowing = false;
            this.calculateFlow(true);
        }
    }

    gameLoop() {
        const w = parseFloat(this.canvas.style.width);
        const h = parseFloat(this.canvas.style.height);
        this.ctx.clearRect(0, 0, w, h);
        
        this.animationTime += 0.05; 
        
        if (this.currentLevel) {
            this.ctx.save();
            this.ctx.translate(this.offsetX, this.offsetY);
            this.drawGrid();
            this.ctx.restore();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    drawCB(x, y, color) {
        if(!this.playerStats.colorblind || !color) return;
        this.ctx.save();
        this.ctx.strokeStyle = "rgba(15,23,42,0.8)"; this.ctx.lineWidth = 2;
        this.ctx.font = "bold 10px monospace"; this.ctx.textAlign = "center"; this.ctx.textBaseline = "middle";
        let letter = color.charAt(0).toUpperCase();
        this.ctx.strokeText(letter, x, y);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(letter, x, y);
        this.ctx.restore();
    }

    drawFlowParticles(startX, startY, endX, endY, color) {
        if (!this.isFlowing) return;
        this.ctx.save();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = color;
        
        for (let i = 0; i < 2; i++) {
            let offset = (this.animationTime * 0.4 + i * 0.5) % 1.0;
            let px = startX + (endX - startX) * offset;
            let py = startY + (endY - startY) * offset;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }

    // Hilfsfunktion: Zeichnet kleine metallische Verbindungsstutzen an offene Ports
    drawPortFlange(cx, cy, direction, color = "#334155", glowHex = null) {
        const s = this.cellSize;
        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(direction * Math.PI / 2);
        
        this.ctx.fillStyle = color;
        if(glowHex && this.isFlowing) {
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = glowHex;
            this.ctx.fillStyle = glowHex;
        }
        // Zeichnet einen kleinen Flansch-Kopf am Zellenrand
        this.ctx.fillRect(s * 0.4, -6, 4, 12);
        this.ctx.restore();
    }

    drawGrid() {
        const { cols, rows } = this.currentLevel.gridSize;
        const s = this.cellSize;
        
        // 1. LABORTISCH-FLIESEN RENDERN (Sichtbare Platzierungsfelder)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                this.ctx.fillStyle = "#111827"; // Dunkles Fliesen-Grau
                this.ctx.strokeStyle = "#1e293b"; // Klare Grid-Begrenzung
                this.ctx.lineWidth = 1.5;
                this.ctx.fillRect(c * s + 2, r * s + 2, s - 4, s - 4);
                this.ctx.strokeRect(c * s + 1, r * s + 1, s - 2, s - 2);
                
                // Tech-Ecken auf jeder Fliese für edlere Optik
                this.ctx.fillStyle = "rgba(51, 65, 85, 0.3)";
                this.ctx.fillRect(c * s + 4, r * s + 4, 3, 3);
                this.ctx.fillRect(c * s + s - 7, r * s + 4, 3, 3);
                this.ctx.fillRect(c * s + 4, r * s + s - 7, 3, 3);
                this.ctx.fillRect(c * s + s - 7, r * s + s - 7, 3, 3);
            }
        }

        // 2. REAKTOR-QUELLEN RENDERN (Inklusive Richtungsflansche)
        this.currentLevel.sources.forEach(src => {
            let baseColor = this.colorMap[src.color] || "#ffffff";
            let pulse = Math.sin(this.animationTime * 2.5) * 2;
            let cx = src.x * s + s * 0.5;
            let cy = src.y * s + s * 0.5;

            // Zeichne metallische Docking-Flansche ringsherum
            for(let d=0; d<4; d++) this.drawPortFlange(cx, cy, d, "#475569", baseColor);

            this.ctx.save();
            this.ctx.strokeStyle = baseColor;
            this.ctx.lineWidth = 3;
            this.ctx.shadowBlur = 12 + pulse;
            this.ctx.shadowColor = baseColor;
            
            // Abgerundetes Reaktorgehäuse
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.fillStyle = baseColor;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, s * 0.18, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();

            this.drawCB(cx, cy, src.color);
        });

        // 3. ENERGIETANKS-ZIELE RENDERN (Eindeutige Einlaufstutzen)
        this.currentLevel.targets.forEach(tgt => {
            let baseColor = this.colorMap[tgt.requiredColor] || "#ffffff";
            let cx = tgt.x * s + s * 0.5;
            let cy = tgt.y * s + s * 0.5;

            // Flansche für das Ziel (Glühen nur bei befülltem Zustand)
            for(let d=0; d<4; d++) this.drawPortFlange(cx, cy, d, "#334155", tgt.currentFlow ? this.colorMap[tgt.currentFlow] : null);

            this.ctx.save();
            this.ctx.strokeStyle = baseColor;
            this.ctx.lineWidth = 2.5;
            
            // Oktogonaler oder quadratischer Rahmen mit Fadenkreuz-Strichen
            this.ctx.strokeRect(tgt.x*s + s*0.18, tgt.y*s + s*0.18, s*0.64, s*0.64);
            
            this.ctx.beginPath();
            this.ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2);
            this.ctx.stroke();

            if(tgt.currentFlow) {
                let currentHex = this.colorMap[tgt.currentFlow];
                this.ctx.fillStyle = currentHex;
                this.ctx.shadowBlur = 16;
                this.ctx.shadowColor = currentHex;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, s * 0.22, 0, Math.PI * 2);
                this.ctx.fill();
                this.drawCB(cx, cy, tgt.currentFlow);
            }
            this.ctx.restore();
        });

        // 4. VERBINDUNGSROHRE UND GATTER RENDERN (Wasserlücken komplett geschlossen)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;

                let cx = c * s + s * 0.5;
                let cy = r * s + s * 0.5;

                this.ctx.save();
                this.ctx.translate(cx, cy);

                if (cell.type === 'WALL') {
                    this.ctx.fillStyle = "#1e293b";
                    this.ctx.strokeStyle = "#475569";
                    this.ctx.lineWidth = 2;
                    this.ctx.fillRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                    this.ctx.strokeRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                    this.ctx.fillStyle = "#334155";
                    this.ctx.fillRect(-s*0.1, -s*0.1, s*0.2, s*0.2);
                } 
                else if (cell.type.startsWith('PIPE_')) {
                    this.ctx.rotate((cell.rotation || 0) * Math.PI / 2);
                    
                    // Extraktion aller transportierten Farben zur Schließung von Darstellungs-Lücken
                    let activeColors = [];
                    if(cell.flows) {
                        Object.values(cell.flows).forEach(color => {
                            if(color && !activeColors.includes(color)) activeColors.push(color);
                        });
                    }

                    // Metallummantelung (Das physische Rohr)
                    this.ctx.strokeStyle = "#334155"; this.ctx.lineWidth = 14; this.ctx.lineCap = "round";
                    if (cell.type === 'PIPE_STRAIGHT') {
                        this.ctx.beginPath(); this.ctx.moveTo(-s*0.5, 0); this.ctx.lineTo(s*0.5, 0); this.ctx.stroke();
                    } else if (cell.type === 'PIPE_ANGLE') {
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s*0.5); this.ctx.quadraticCurveTo(0,0, s*0.5, 0); this.ctx.stroke();
                    } else if (cell.type === 'PIPE_CROSS') {
                        this.ctx.beginPath(); this.ctx.moveTo(-s*0.5, 0); this.ctx.lineTo(s*0.5, 0); this.ctx.stroke();
                        this.ctx.beginPath(); this.ctx.moveTo(0, -s*0.5); this.ctx.lineTo(0, s*0.5); this.ctx.stroke();
                    }

                    // Rohr-Innenbett (Dunkles Glasvolumen)
                    this.ctx.strokeStyle = "#0b0f19"; this.ctx.lineWidth = 6;
                    if (cell.type === 'PIPE_STRAIGHT') this.ctx.stroke();
                    else if (cell.type === 'PIPE_ANGLE') this.ctx.stroke();
                    else if (cell.type === 'PIPE_CROSS') this.ctx.stroke();

                    // Fluss-Darstellung (Schließt Lücken durch bidirektionale Farberkennung)
                    if (activeColors.length > 0 && (!this.isFlowing || this.flowAnimationProgress > 0)) {
                        let primaryColor = activeColors[0]; // Nutze primär gefundene Transportfarbe
                        let hex = this.colorMap[primaryColor];
                        
                        this.ctx.save();
                        this.ctx.strokeStyle = hex; this.ctx.lineWidth = 5;
                        this.ctx.shadowBlur = 12; this.ctx.shadowColor = hex;

                        if (cell.type === 'PIPE_STRAIGHT') {
                            this.ctx.beginPath(); this.ctx.moveTo(-s*0.5, 0); this.ctx.lineTo(s*0.5, 0); this.ctx.stroke();
                            this.ctx.restore();
                            this.drawFlowParticles(-s*0.5, 0, s*0.5, 0, hex);
                            this.drawCB(-s*0.2, -3, primaryColor);
                        } 
                        else if (cell.type === 'PIPE_ANGLE') {
                            this.ctx.beginPath(); this.ctx.moveTo(0, -s*0.5); this.ctx.quadraticCurveTo(0,0, s*0.5, 0); this.ctx.stroke();
                            this.ctx.restore();
                            this.drawCB(s*0.15, -s*0.15, primaryColor);
                        } 
                        else if (cell.type === 'PIPE_CROSS') {
                            this.ctx.beginPath(); this.ctx.moveTo(-s*0.5, 0); this.ctx.lineTo(s*0.5, 0); this.ctx.stroke();
                            this.ctx.beginPath(); this.ctx.moveTo(0, -s*0.5); this.ctx.lineTo(0, s*0.5); this.ctx.stroke();
                            this.ctx.restore();
                            this.drawFlowParticles(-s*0.5, 0, s*0.5, 0, hex);
                            this.drawFlowParticles(0, -s*0.5, 0, s*0.5, hex);
                            this.drawCB(0, 0, primaryColor);
                        }
                    }
                } 
                else if (cell.type === 'AND_GATE' || cell.type === 'MIXER' || cell.type === 'SPLITTER') {
                    this.ctx.fillStyle = "#0f172a"; this.ctx.strokeStyle = "#475569"; this.ctx.lineWidth = 2;
                    this.ctx.fillRect(-s*0.38, -s*0.38, s*0.76, s*0.76); this.ctx.strokeRect(-s*0.38, -s*0.38, s*0.76, s*0.76);
                    
                    let gateColor = cell.type==='AND_GATE'?'#ef4444':cell.type==='MIXER'?'#a855f7':'#f97316';
                    this.ctx.fillStyle = gateColor;
                    this.ctx.font = "bold 10px monospace"; this.ctx.textAlign = "center";
                    this.ctx.fillText(cell.type==='AND_GATE'?'AND':cell.type==='MIXER'?'MIX':'SPLIT', 0, 3);
                    
                    if(cell.flows && cell.flows['out'] && (!this.isFlowing || this.flowAnimationProgress > 40)) {
                        let hex = this.colorMap[cell.flows['out']];
                        this.ctx.save();
                        this.ctx.fillStyle = hex; this.ctx.shadowBlur = 12; this.ctx.shadowColor = hex;
                        this.ctx.beginPath(); this.ctx.arc(0, 0, 7, 0, Math.PI*2); this.ctx.fill();
                        this.ctx.restore();
                        this.drawCB(0, 0, cell.flows['out']);
                    }
                }
                else if (cell.type === 'PORTAL') {
                    let spin = this.animationTime * 0.5;
                    this.ctx.strokeStyle = "#d946ef"; this.ctx.lineWidth = 3;
                    this.ctx.save();
                    this.ctx.rotate(spin);
                    this.ctx.strokeRect(-s*0.25, -s*0.25, s*0.5, s*0.5);
                    this.ctx.restore();
                    
                    if(cell.flows && Object.keys(cell.flows).length > 0 && (!this.isFlowing || this.flowAnimationProgress > 30)) {
                        let c = Object.values(cell.flows)[0];
                        let hex = this.colorMap[c];
                        this.ctx.save();
                        this.ctx.fillStyle = hex; this.ctx.shadowBlur = 15; this.ctx.shadowColor = hex;
                        this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.18, 0, Math.PI*2); this.ctx.fill();
                        this.ctx.restore();
                        this.drawCB(0, 0, c);
                    }
                }
                else if (cell.type === 'VALVE') {
                    this.ctx.rotate((cell.rotation || 0) * Math.PI / 2);
                    this.ctx.strokeStyle = "#64748b"; this.ctx.lineWidth = 6;
                    this.ctx.beginPath(); this.ctx.moveTo(-s*0.35, 0); this.ctx.lineTo(s*0.35, 0); this.ctx.stroke();
                    
                    this.ctx.fillStyle = "#fbbf24";
                    this.ctx.fillRect(-4, -s*0.2, 8, s*0.4);
                }

                this.ctx.restore();
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new HydraGame();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.update();
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                    }
                });
            });
        }).catch(err => console.error('[PWA] SW-Registrierung fehlgeschlagen:', err));
        
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }
});
