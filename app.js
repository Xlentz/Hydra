
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
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioEngine();
        
        this.currentLevel = null;
        this.grid = []; 
        this.initialInventory = null; 
        this.activeTool = 'PIPE_STRAIGHT';
        this.cellSize = 60;
        this.offsetX = 0; this.offsetY = 0;
        
        this.isFlowing = false;
        this.clicks = 0;
        this.flowAnimationProgress = 0; 
        
        this.colorMap = { 'blue': '#3b82f6', 'yellow': '#eab308', 'red': '#ef4444', 'green': '#22c55e', 'purple': '#a855f7', 'orange': '#f97316' };
        this.shapeMap = { 'blue': 'circle', 'yellow': 'triangle', 'red': 'square', 'green': 'diamond', 'purple': 'cross', 'orange': 'star' };

        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            name: "Gast-Techniker", avatar: "👨‍🔧", xp: 0, stars: 0, levelStars: {}, audio: true, colorblind: false 
        };
        this.audio.enabled = this.playerStats.audio;

        this.init();
        window.addEventListener('resize', () => this.resize());
        
        document.body.addEventListener('click', () => {
            if(this.audio.ctx.state === 'suspended') this.audio.ctx.resume();
        }, {once: true});
    }

    init() {
        this.resize();
        this.renderLevelList();
        this.setupEventListeners();
        requestAnimationFrame(() => this.gameLoop());
        this.updateUI(); 
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        if(this.currentLevel) this.centerGrid();
    }

    centerGrid() {
        const gridW = this.currentLevel.gridSize.cols * this.cellSize;
        const gridH = this.currentLevel.gridSize.rows * this.cellSize;
        this.offsetX = (this.canvas.width - gridW) / 2;
        this.offsetY = (this.canvas.height - gridH) / 2 - 40; 
    }

    updateUI() {
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        setEl('player-name', this.playerStats.name);
        setEl('header-avatar', this.playerStats.avatar);
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
                'straight': 'pipes_straight',
                'angle': 'pipes_angle',
                'cross': 'pipes_cross',
                'and': 'andGates',
                'mix': 'mixers',
                'split': 'splitters',
                'portal': 'portals',
                'valve': 'valves'
            };
            
            for (let t in toolKeys) {
                const btn = document.getElementById(`btn-t-${t}`);
                if (btn) {
                    btn.style.display = (this.initialInventory[toolKeys[t]] > 0) ? 'flex' : 'none';
                }
            }
            
            setEl('header-level-info', `Level ${this.currentLevel.id}`);
            setEl('click-counter', this.clicks);
            setEl('par-clicks', this.currentLevel.parClicks || 10);
        }
        
        const audioBtn = document.getElementById('toggle-audio');
        const audioKnob = document.getElementById('audio-knob');
        if(audioBtn) {
            audioBtn.classList.toggle('bg-cyan-500', this.playerStats.audio);
            audioBtn.classList.toggle('bg-slate-700', !this.playerStats.audio);
            audioKnob.style.transform = this.playerStats.audio ? 'translateX(24px)' : 'translateX(0)';
        }
        
        const cbBtn = document.getElementById('toggle-colorblind');
        const cbKnob = document.getElementById('colorblind-knob');
        if(cbBtn) {
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
            
            btn.className = `h-16 flex flex-col items-center justify-center rounded-xl font-bold transition-all ${isCompleted ? 'bg-cyan-900 border-cyan-400' : 'bg-slate-800 border-slate-700 opacity-80'} hover:bg-cyan-800 shadow-lg border hover:scale-105`;
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
        
        const { cols, rows } = this.currentLevel.gridSize;
        this.cellSize = Math.min(this.canvas.width / (cols + 1), this.canvas.height / (rows + 3));
        if (this.cellSize > 70) this.cellSize = 70;
        
        this.centerGrid();
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
        let selectedAvatarTemp = this.playerStats.avatar;

        document.getElementById('btn-open-profile').onclick = () => {
            document.getElementById('input-player-name').value = this.playerStats.name;
            document.getElementById('modal-xp').textContent = this.playerStats.xp + ' XP';
            document.getElementById('modal-stars').textContent = this.playerStats.stars;
            
            document.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.classList.toggle('selected', btn.dataset.avatar === this.playerStats.avatar);
                btn.onclick = (e) => {
                    document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
                    e.currentTarget.classList.add('selected');
                    selectedAvatarTemp = e.currentTarget.dataset.avatar;
                };
            });
            this.updateUI();
            modal.classList.remove('hidden');
        };
        
        document.getElementById('btn-close-profile').onclick = () => modal.classList.add('hidden');
        
        document.getElementById('btn-save-profile').onclick = () => {
            const nameInput = document.getElementById('input-player-name').value.trim();
            if(nameInput) this.playerStats.name = nameInput;
            this.playerStats.avatar = selectedAvatarTemp;
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
            this.isFlowing = true;
            this.audio.playFlowStart();
            this.calculateFlow(false);
            
            this.flowAnimationProgress = 0;
            const animInterval = setInterval(() => {
                this.flowAnimationProgress += 5;
                if(this.flowAnimationProgress >= 100) {
                    clearInterval(animInterval);
                    this.checkWinCondition();
                }
            }, 50);
        };
        
        document.getElementById('btn-reset').onclick = () => {
            this.startLevel(this.currentLevel.id - 1);
        };
        
        document.getElementById('btn-solution').onclick = () => {
            if (this.currentLevel && this.currentLevel.hint) {
                alert("Tipp: " + this.currentLevel.hint);
            } else {
                alert("Für diesen Sektor sind leider keine Tipps verfügbar.");
            }
        };
        
        document.getElementById('btn-next').onclick = () => {
            document.getElementById('win-overlay').classList.add('hidden');
            if (this.currentLevel.id < HYDRA_LEVELS.length) this.startLevel(this.currentLevel.id);
            else location.reload();
        }
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
                this.clicks--; // Refund click on delete
            }
        } else {
            if (cell) {
                if(['PIPE_STRAIGHT', 'PIPE_ANGLE', 'PIPE_CROSS', 'AND_GATE', 'MIXER', 'SPLITTER', 'VALVE'].includes(cell.type)) {
                    cell.rotation = (cell.rotation + 1) % 4;
                    this.audio.playClick();
                    // Rotating no longer penalizes clicks!
                }
            } else {
                let p = false;
                if (this.activeTool === 'PIPE_STRAIGHT' && inv.pipes_straight > 0) { this.grid[y][x] = { type: 'PIPE_STRAIGHT', rotation: 0 }; inv.pipes_straight--; p = true; }
                else if (this.activeTool === 'PIPE_ANGLE' && inv.pipes_angle > 0) { this.grid[y][x] = { type: 'PIPE_ANGLE', rotation: 0 }; inv.pipes_angle--; p = true; }
                else if (this.activeTool === 'PIPE_CROSS' && inv.pipes_cross > 0) { this.grid[y][x] = { type: 'PIPE_CROSS', rotation: 0 }; inv.pipes_cross--; p = true; }
                else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) { this.grid[y][x] = { type: 'AND_GATE', rotation: 0 }; inv.andGates--; p = true; }
                else if (this.activeTool === 'MIXER' && inv.mixers > 0) { this.grid[y][x] = { type: 'MIXER', rotation: 0 }; inv.mixers--; p = true; }
                else if (this.activeTool === 'SPLITTER' && inv.splitters > 0) { this.grid[y][x] = { type: 'SPLITTER', rotation: 0 }; inv.splitters--; p = true; }
                else if (this.activeTool === 'PORTAL' && inv.portals > 0) { this.grid[y][x] = { type: 'PORTAL', rotation: 0 }; inv.portals--; p = true; }
                else if (this.activeTool === 'VALVE' && inv.valves > 0) { this.grid[y][x] = { type: 'VALVE', rotation: 0 }; inv.valves--; p = true; }
                
                if(p) { this.audio.playClick(); this.clicks++; }
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
        if (t === 'PIPE_CROSS') return [0, 1, 2, 3];
        if (t === 'AND_GATE' || t === 'MIXER') return [0, 1, 2, 3];
        if (t === 'SPLITTER') return [0, 1, 2, 3];
        if (t === 'VALVE') return [0, 1, 2, 3]; 
        if (t === 'PORTAL') return [0, 1, 2, 3]; 
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
        this.currentLevel.sources.forEach(s => {
            queue.push({x: s.x, y: s.y, color: s.color, fromDir: null});
        });

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
            if (node.color === 'split_trigger') {
                availableColors = [...node.colors];
            }

            DIRS.forEach(move => {
                if (node.fromDir !== null && move.d === (node.fromDir + 2) % 4) return; 

                if (currentCell && currentCell.type === 'PIPE_CROSS' && node.fromDir !== null) {
                    if (move.d !== node.fromDir) return; 
                }
                
                let emitColor = node.color;
                if (node.color === 'split_trigger') {
                    if (availableColors.length === 0) return; 
                    emitColor = availableColors[0];
                }

                if (currentCell && currentCell.type === 'VALVE') {
                    let r = currentCell.rotation || 0;
                    let inline = (r%2===0) ? [1,3] : [0,2];
                    let control = (r%2===0) ? [0,2] : [1,3];
                    
                    if(inline.includes(move.d)) {
                        let hasPressure = false;
                        control.forEach(cdir => { if(currentCell.flows[cdir]) hasPressure = true; });
                        if(!hasPressure) return; 
                    }
                }

                let nx = node.x + move.dx;
                let ny = node.y + move.dy;

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
                    if (target) {
                        target.currentFlow = emitColor;
                        consumeSplit();
                        return; 
                    }

                    let cell = this.grid[ny][nx];
                    if (cell && cell.type !== 'WALL') {
                        if(cell.flows[move.d] === emitColor) return; 
                        
                        if (cell.type.startsWith('PIPE') || cell.type === 'PORTAL') {
                            cell.flows[move.d] = emitColor; 
                            queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            consumeSplit();
                        }
                        else if (cell.type === 'VALVE') {
                            cell.flows[move.d] = emitColor;
                            let r = cell.rotation || 0;
                            let inline = (r%2===0) ? [1,3] : [0,2];
                            if(inline.includes(move.d)) {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            }
                            consumeSplit();
                        }
                        else if (cell.type === 'AND_GATE') {
                            cell.inputOrigins.add(move.d);
                            if(!cell.inputs.includes(emitColor)) cell.inputs.push(emitColor);
                            
                            if (cell.inputOrigins.size >= 2) {
                                cell.flows['out'] = cell.inputs[0]; 
                                queue.push({x: nx, y: ny, color: cell.inputs[0], fromDir: null});
                            }
                            consumeSplit();
                        }
                        else if (cell.type === 'MIXER') {
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
                        }
                        else if (cell.type === 'SPLITTER') {
                            cell.inputOrigins.add(move.d);
                            let unmix = this.unmixColor(emitColor);
                            if(unmix.length === 2) {
                                queue.push({x: nx, y: ny, color: 'split_trigger', colors: unmix, fromDir: move.d});
                            } else {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d});
                            }
                            consumeSplit();
                        }
                    }
                }
            });
        }
    }

    mixColors(c1, c2) {
        if(c1 === c2) return c1;
        const mix = { 'blue+yellow': 'green', 'yellow+blue': 'green', 'red+blue': 'purple', 'blue+red': 'purple', 'red+yellow': 'orange', 'yellow+red': 'orange' };
        return mix[`${c1}+${c2}`] || c1;
    }
    
    unmixColor(c) {
        if(c === 'green') return ['blue', 'yellow'];
        if(c === 'purple') return ['blue', 'red'];
        if(c === 'orange') return ['red', 'yellow'];
        return [c];
    }

    checkWinCondition() {
        if (!this.isFlowing) return;
        let won = true;
        this.currentLevel.targets.forEach(t => { if (t.currentFlow !== t.requiredColor) won = false; });
        if (won) {
            this.audio.playWin();
            
            let par = this.currentLevel.parClicks || 10;
            let earnedStars = 1;
            
            if(this.clicks <= par) earnedStars = 3;
            else if(this.clicks <= par + 2) earnedStars = 2;

            const xp = this.currentLevel.xpReward;
            
            if (!this.playerStats.levelStars) this.playerStats.levelStars = {};
            let prevStars = this.playerStats.levelStars[this.currentLevel.id] || 0;
            
            if (earnedStars > prevStars) {
                this.playerStats.stars += (earnedStars - prevStars); 
                this.playerStats.levelStars[this.currentLevel.id] = earnedStars;
            }
            
            if (prevStars === 0) {
                this.playerStats.xp += xp; 
            } else if (earnedStars > prevStars) {
                this.playerStats.xp += Math.floor(xp * 0.5); 
            } else {
                this.playerStats.xp += 10; 
            }
            
            localStorage.setItem('hydra_stats', JSON.stringify(this.playerStats));
            this.updateUI();
            
            const winTitle = document.getElementById('win-title');
            const winSub = document.getElementById('win-subtitle');
            const winXp = document.getElementById('win-xp');
            
            [1,2,3].forEach(num => {
                document.getElementById(`star-${num}`).classList.toggle('filled', num <= earnedStars);
            });
            
            winTitle.textContent = "Level Abgeschlossen!";
            winTitle.className = "text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 mb-2 drop-shadow-lg text-center";
            winSub.textContent = `Du hast ${this.clicks} Bauteile verbaut (Optimal: ${par})`;
            winXp.textContent = prevStars === 0 ? `+${xp} XP` : (earnedStars > prevStars ? `+${Math.floor(xp * 0.5)} XP` : '+10 XP');
            winXp.className = "text-2xl text-cyan-300 mb-8 font-bold";
            
            document.getElementById('win-overlay').classList.remove('hidden');
            document.getElementById('game-controls').classList.add('hidden');
        }
    }

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.currentLevel) {
            this.ctx.save();
            this.ctx.translate(this.offsetX, this.offsetY);
            
            this.drawGridLines();
            this.drawSourcesAndTargets();
            this.drawPlacedComponents();
            
            this.ctx.restore();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    drawGridLines() {
        const { cols, rows } = this.currentLevel.gridSize;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        this.ctx.lineWidth = 1;
        for(let r = 0; r <= rows; r++) {
            this.ctx.beginPath(); this.ctx.moveTo(0, r * this.cellSize); this.ctx.lineTo(cols * this.cellSize, r * this.cellSize); this.ctx.stroke();
        }
        for(let c = 0; c <= cols; c++) {
            this.ctx.beginPath(); this.ctx.moveTo(c * this.cellSize, 0); this.ctx.lineTo(c * this.cellSize, rows * this.cellSize); this.ctx.stroke();
        }
    }
    
    drawCB(x, y, color) {
        if(!this.playerStats.colorblind) return;
        const shape = this.shapeMap[color];
        this.ctx.fillStyle = "rgba(0,0,0,0.5)";
        this.ctx.beginPath();
        if(shape==='circle') this.ctx.arc(x,y,4,0,Math.PI*2);
        else if(shape==='square') this.ctx.rect(x-4,y-4,8,8);
        else if(shape==='triangle') { this.ctx.moveTo(x,y-5); this.ctx.lineTo(x-4,y+4); this.ctx.lineTo(x+4,y+4); }
        else if(shape==='diamond') { this.ctx.moveTo(x,y-5); this.ctx.lineTo(x+4,y); this.ctx.lineTo(x,y+5); this.ctx.lineTo(x-4,y); }
        else this.ctx.arc(x,y,4,0,Math.PI*2); 
        this.ctx.fill();
    }

    drawSourcesAndTargets() {
        const s = this.cellSize;
        const hw = s / 2;
        this.currentLevel.sources.forEach(source => {
            const x = source.x * s; const y = source.y * s;

            this.ctx.fillStyle = this.colorMap[source.color];
            this.ctx.fillRect(x + hw - 4, y, 8, s);
            this.ctx.fillRect(x, y + hw - 4, s, 8);

            this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[source.color];
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.shadowBlur = 0; 
            
            this.ctx.fillStyle = "#f8fafc";
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, 4, 0, Math.PI * 2); this.ctx.fill();
            this.drawCB(x+hw, y+hw, source.color);
        });

        this.currentLevel.targets.forEach(target => {
            const x = target.x * s; const y = target.y * s;

            this.ctx.fillStyle = "#475569";
            this.ctx.fillRect(x + hw - 6, y, 12, s);
            this.ctx.fillRect(x, y + hw - 6, s, 12);

            this.ctx.strokeStyle = this.colorMap[target.requiredColor];
            this.ctx.lineWidth = 4; this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.4, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.setLineDash([]); 
            
            this.ctx.fillStyle = "#1e293b";
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2); this.ctx.fill();

            let isFilled = target.currentFlow;
            if(this.isFlowing && this.flowAnimationProgress < 90) isFilled = false;

            if (isFilled) {
                this.ctx.fillStyle = this.colorMap[target.currentFlow];
                this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.3, 0, Math.PI * 2); this.ctx.fill();
            }
            this.drawCB(x+hw, y+hw, target.requiredColor);
        });
    }

    drawPlacedComponents() {
        const s = this.cellSize;
        const hw = s / 2; 
        
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;
                const x = c * s; const y = r * s;

                if (cell.type === 'WALL') {
                    this.ctx.fillStyle = "#1e293b";
                    this.ctx.fillRect(x+1, y+1, s-2, s-2);
                    this.ctx.strokeStyle = "#0f172a"; this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.moveTo(x, y); this.ctx.lineTo(x+s, y+s); this.ctx.moveTo(x+s, y); this.ctx.lineTo(x, y+s); this.ctx.stroke();
                    continue;
                }

                this.ctx.save();
                this.ctx.translate(x + hw, y + hw);
                
                if (cell.rotation !== undefined && ['PIPE_STRAIGHT', 'PIPE_ANGLE', 'VALVE'].includes(cell.type)) {
                    this.ctx.rotate(cell.rotation * Math.PI / 2);
                }

                const pW = s * 0.3; 
                const hPw = pW / 2;
                
                let wCol = null;
                if(cell.flows && Object.keys(cell.flows).length > 0) { 
                    wCol = Object.values(cell.flows)[0]; 
                }
                
                let showWater = wCol && (!this.isFlowing || this.flowAnimationProgress > 10); 

                if (cell.type === 'PIPE_STRAIGHT') {
                    this.ctx.fillStyle = "#334155"; this.ctx.fillRect(-hw, -hPw, s, pW);
                    this.ctx.fillStyle = "#94a3b8"; this.ctx.fillRect(-hw, -hPw, s, 2); this.ctx.fillRect(-hw, hPw - 2, s, 2);
                    if(showWater) { 
                        this.ctx.fillStyle = this.colorMap[wCol]; 
                        let l = this.isFlowing ? (this.flowAnimationProgress/100)*s : s;
                        this.ctx.fillRect(-hw, -hPw + 4, l, pW - 8); 
                        this.drawCB(0, 0, wCol);
                    }
                } 
                else if (cell.type === 'PIPE_ANGLE') {
                    this.ctx.fillStyle = "#334155"; this.ctx.fillRect(-hPw, -hw, pW, hw + hPw); this.ctx.fillRect(-hPw, -hPw, hw + hPw, pW);
                    this.ctx.fillStyle = "#94a3b8"; this.ctx.fillRect(-hPw, -hw, 2, hw + hPw); this.ctx.fillRect(-hPw, hPw - 2, hw + hPw, 2); this.ctx.fillRect(hPw - 2, -hw, 2, hw - hPw + 2); this.ctx.fillRect(hPw - 2, -hPw, hw - hPw + 2, 2); 
                    if(showWater) { 
                        this.ctx.fillStyle = this.colorMap[wCol];
                        let scale = this.isFlowing ? (this.flowAnimationProgress/100) : 1;
                        this.ctx.fillRect(-hPw + 4, -hw, pW - 8, (hw + hPw - 4)*scale);
                        this.ctx.fillRect(-hPw + 4, -hPw + 4, (hw + hPw - 4)*scale, pW - 8);
                        this.drawCB(-2, -2, wCol);
                    }
                }
                else if (cell.type === 'PIPE_CROSS') {
                    this.ctx.fillStyle = "#334155"; this.ctx.fillRect(-hPw, -hw, pW, s); this.ctx.fillRect(-hw, -hPw, s, pW);
                    this.ctx.fillStyle = "#94a3b8";
                    this.ctx.fillRect(-hw, -hPw, hw - hPw, 2); this.ctx.fillRect(-hPw, -hw, 2, hw - hPw); this.ctx.fillRect(hPw, -hPw, hw - hPw, 2); this.ctx.fillRect(hPw - 2, -hw, 2, hw - hPw);
                    this.ctx.fillRect(-hw, hPw - 2, hw - hPw, 2); this.ctx.fillRect(-hPw, hPw, 2, hw - hPw); this.ctx.fillRect(hPw, hPw - 2, hw - hPw, 2); this.ctx.fillRect(hPw - 2, hPw, 2, hw - hPw);
                    
                    let flowV = (cell.flows && (cell.flows[0] || cell.flows[2]));
                    let flowH = (cell.flows && (cell.flows[1] || cell.flows[3]));
                    let animP = this.isFlowing ? (this.flowAnimationProgress/100)*s : s;
                    
                    if(flowV && (!this.isFlowing || this.flowAnimationProgress > 10)) { this.ctx.fillStyle = this.colorMap[flowV]; this.ctx.fillRect(-hPw + 4, -hw, pW - 8, animP); this.drawCB(0, -hw/2, flowV); }
                    if(flowH && (!this.isFlowing || this.flowAnimationProgress > 10)) { this.ctx.fillStyle = this.colorMap[flowH]; this.ctx.fillRect(-hw, -hPw + 4, animP, pW - 8); this.drawCB(-hw/2, 0, flowH); }
                }
                else if (cell.type === 'VALVE') {
                    this.ctx.fillStyle = "#334155"; this.ctx.fillRect(-hw, -hPw, s, pW); 
                    this.ctx.fillStyle = "#94a3b8"; this.ctx.fillRect(-hw, -hPw, s, 2); this.ctx.fillRect(-hw, hPw - 2, s, 2);
                    this.ctx.fillStyle = "#475569"; this.ctx.fillRect(-hPw, -hw, pW, s); 
                    
                    this.ctx.fillStyle = "#ef4444"; this.ctx.beginPath(); this.ctx.arc(0,0,hPw+2, 0, Math.PI*2); this.ctx.fill();
                    
                    let inlineFlow = (cell.flows && (cell.flows[1] || cell.flows[3]));
                    if(inlineFlow && (!this.isFlowing || this.flowAnimationProgress > 40)) {
                        this.ctx.fillStyle = this.colorMap[inlineFlow];
                        this.ctx.fillRect(-hw, -hPw + 4, s, pW - 8);
                    }
                }
                else if (cell.type === 'AND_GATE' || cell.type === 'MIXER' || cell.type === 'SPLITTER') {
                    this.ctx.fillStyle = "#475569"; this.ctx.fillRect(-6, -hw, 12, s); this.ctx.fillRect(-hw, -6, s, 12); 
                    
                    if (cell.type === 'AND_GATE') {
                        this.ctx.fillStyle = "#1e293b"; this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.35, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.strokeStyle = "#94a3b8"; this.ctx.lineWidth = 2; this.ctx.stroke();
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 16px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("&", 0, 6);
                        
                        if(cell.flows && cell.flows['out'] && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']];
                            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.2, 0, Math.PI * 2); this.ctx.fill();
                            this.drawCB(0,0,cell.flows['out']);
                        }
                    } else if (cell.type === 'MIXER') {
                        this.ctx.fillStyle = "#1e293b"; this.ctx.fillRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                        this.ctx.strokeStyle = "#94a3b8"; this.ctx.lineWidth = 2; this.ctx.strokeRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 12px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("MIX", 0, 4);
                        if(cell.flows && cell.flows['out'] && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']]; this.ctx.fillRect(-s*0.25, -s*0.25, s*0.5, s*0.5);
                            this.drawCB(0,0,cell.flows['out']);
                        }
                    } else if (cell.type === 'SPLITTER') {
                        this.ctx.fillStyle = "#1e293b"; this.ctx.beginPath(); this.ctx.moveTo(0,-s*0.35); this.ctx.lineTo(s*0.35,s*0.35); this.ctx.lineTo(-s*0.35,s*0.35); this.ctx.fill();
                        this.ctx.strokeStyle = "#94a3b8"; this.ctx.lineWidth = 2; this.ctx.stroke();
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 10px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("SPLIT", 0, s*0.2);
                        
                        if(cell.flows && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            if(cell.flows['out1_rendered']) {
                                this.ctx.fillStyle = this.colorMap[cell.flows['out1_rendered']];
                                this.ctx.beginPath(); this.ctx.arc(-s*0.15, s*0.15, 4, 0, Math.PI*2); this.ctx.fill();
                                this.drawCB(-s*0.15, s*0.15, cell.flows['out1_rendered']);
                            }
                            if(cell.flows['out2_rendered']) {
                                this.ctx.fillStyle = this.colorMap[cell.flows['out2_rendered']];
                                this.ctx.beginPath(); this.ctx.arc(s*0.15, s*0.15, 4, 0, Math.PI*2); this.ctx.fill();
                                this.drawCB(s*0.15, s*0.15, cell.flows['out2_rendered']);
                            }
                        }
                    }
                }
                else if (cell.type === 'PORTAL') {
                    this.ctx.fillStyle = "#a855f7";
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.4, 0, Math.PI*2); this.ctx.fill();
                    this.ctx.fillStyle = "#1e293b";
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.3, 0, Math.PI*2); this.ctx.fill();
                    
                    if(cell.flows && Object.keys(cell.flows).length > 0 && (!this.isFlowing || this.flowAnimationProgress > 30)) {
                        let c = Object.values(cell.flows)[0];
                        this.ctx.fillStyle = this.colorMap[c];
                        this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.2, 0, Math.PI*2); this.ctx.fill();
                        this.drawCB(0,0,c);
                    }
                }

                this.ctx.restore();
            }
        }
    }
}
const game = new HydraGame();
