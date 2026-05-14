
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
        this.cellSize = 75;
        this.offsetX = 0; this.offsetY = 0;
        
        this.isFlowing = false;
        this.clicks = 0;
        this.flowAnimationProgress = 0; 
        this.time = 0;
        
        // High-end glowing colors
        this.colorMap = { 
            'blue': '#0ea5e9', 
            'yellow': '#eab308', 
            'red': '#ef4444', 
            'green': '#10b981', 
            'purple': '#a855f7', 
            'orange': '#f97316' 
        };
        this.shapeMap = { 'blue': 'circle', 'yellow': 'triangle', 'red': 'square', 'green': 'diamond', 'purple': 'cross', 'orange': 'star' };

        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            name: "Gast-Operator", avatar: "👽", xp: 0, stars: 0, levelStars: {}, audio: true, colorblind: false 
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
        requestAnimationFrame((t) => this.gameLoop(t));
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
        let usableHeight = this.canvas.height - 180; 
        this.offsetY = (usableHeight - gridH) / 2 + 30; 
    }

    updateUI() {
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        
        setEl('player-name', this.playerStats.name);
        setEl('header-avatar', this.playerStats.avatar);
        setEl('player-xp-header', this.playerStats.xp + ' XP');
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
            
            setEl('header-level-info', `Sektor ${this.currentLevel.id}`);
            setEl('click-counter', this.clicks);
            setEl('par-clicks', this.currentLevel.parClicks || 10);
        }
        
        const audioBtn = document.getElementById('toggle-audio');
        const audioKnob = document.getElementById('audio-knob');
        if(audioBtn) {
            audioBtn.classList.toggle('bg-cyan-500', this.playerStats.audio);
            audioBtn.classList.toggle('bg-zinc-800', !this.playerStats.audio);
            audioKnob.style.transform = this.playerStats.audio ? 'translateX(28px)' : 'translateX(0)';
        }
        
        const cbBtn = document.getElementById('toggle-colorblind');
        const cbKnob = document.getElementById('colorblind-knob');
        if(cbBtn) {
            cbBtn.classList.toggle('bg-cyan-500', this.playerStats.colorblind);
            cbBtn.classList.toggle('bg-zinc-800', !this.playerStats.colorblind);
            cbKnob.style.transform = this.playerStats.colorblind ? 'translateX(28px)' : 'translateX(0)';
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
                    starHtml += `<svg class="w-3.5 h-3.5 ${i<stars ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'text-zinc-700'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
                }
                starHtml += `</div>`;
            }
            
            let isCompleted = stars > 0;
            
            btn.className = `h-20 flex flex-col items-center justify-center rounded-2xl font-black transition-all ${isCompleted ? 'bg-gradient-to-b from-zinc-800 to-zinc-900 border border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-zinc-900 border border-zinc-800 opacity-70'} hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan-400`;
            btn.innerHTML = `<span class="text-2xl ${isCompleted ? 'text-cyan-300' : 'text-zinc-500'}">${level.id}</span>${starHtml}`;
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
        this.centerGrid();
        this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
        
        if (this.currentLevel.walls) {
            this.currentLevel.walls.forEach(w => {
                if(this.grid[w.y] && this.grid[w.y][w.x] === null) this.grid[w.y][w.x] = { type: 'WALL' };
            });
        }
        
        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        
        // Remove active class from delete tool, set to straight pipe by default
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('btn-t-straight').classList.add('active');
        this.activeTool = 'PIPE_STRAIGHT';
        
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

        document.querySelectorAll('.tool-btn, #btn-t-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn, #btn-t-delete').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                
                // If it's a regular tool button, handle it normally
                if(target.classList.contains('tool-btn')) {
                    target.classList.add('active');
                } else {
                    // For the delete button (which doesn't have the tool-btn class for styling reasons)
                    target.classList.add('active');
                    target.style.transform = 'scale(1.05)';
                    target.style.borderColor = '#fda4af';
                    target.style.backgroundColor = 'rgba(159, 18, 57, 0.8)';
                    
                    setTimeout(() => {
                        target.style.transform = '';
                        target.style.borderColor = '';
                        target.style.backgroundColor = '';
                    }, 200);
                }
                
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
                this.flowAnimationProgress += 2.5; // Smooth out animation
                if(this.flowAnimationProgress >= 100) {
                    clearInterval(animInterval);
                    this.checkWinCondition();
                }
            }, 30);
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
                this.clicks--;
            }
        } else {
            if (cell) {
                if(['PIPE_STRAIGHT', 'PIPE_ANGLE', 'PIPE_CROSS', 'AND_GATE', 'MIXER', 'SPLITTER', 'VALVE'].includes(cell.type)) {
                    cell.rotation = (cell.rotation + 1) % 4;
                    this.audio.playClick();
                }
            } else {
                let p = false;
                let rot = this.getBestRotation(x, y, this.activeTool);
                
                if (this.activeTool === 'PIPE_STRAIGHT' && inv.pipes_straight > 0) { this.grid[y][x] = { type: 'PIPE_STRAIGHT', rotation: rot }; inv.pipes_straight--; p = true; }
                else if (this.activeTool === 'PIPE_ANGLE' && inv.pipes_angle > 0) { this.grid[y][x] = { type: 'PIPE_ANGLE', rotation: rot }; inv.pipes_angle--; p = true; }
                else if (this.activeTool === 'PIPE_CROSS' && inv.pipes_cross > 0) { this.grid[y][x] = { type: 'PIPE_CROSS', rotation: 0 }; inv.pipes_cross--; p = true; }
                else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) { this.grid[y][x] = { type: 'AND_GATE', rotation: 0 }; inv.andGates--; p = true; }
                else if (this.activeTool === 'MIXER' && inv.mixers > 0) { this.grid[y][x] = { type: 'MIXER', rotation: 0 }; inv.mixers--; p = true; }
                else if (this.activeTool === 'SPLITTER' && inv.splitters > 0) { this.grid[y][x] = { type: 'SPLITTER', rotation: 0 }; inv.splitters--; p = true; }
                else if (this.activeTool === 'PORTAL' && inv.portals > 0) { this.grid[y][x] = { type: 'PORTAL', rotation: 0 }; inv.portals--; p = true; }
                else if (this.activeTool === 'VALVE' && inv.valves > 0) { this.grid[y][x] = { type: 'VALVE', rotation: rot }; inv.valves--; p = true; }
                
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

    
        getBestRotation(x, y, type) {
        let n = [false, false, false, false]; // [Top, Right, Bottom, Left]
        let w = [false, false, false, false]; 
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}]; 
        
        DIRS.forEach(move => {
            let nx = x + move.dx; let ny = y + move.dy;
            if (nx >= 0 && nx < this.currentLevel.gridSize.cols && ny >= 0 && ny < this.currentLevel.gridSize.rows) {
                let isSource = this.currentLevel.sources.find(s => s.x === nx && s.y === ny);
                let isTarget = this.currentLevel.targets.find(t => t.x === nx && t.y === ny);
                if (isSource) { n[move.d] = true; w[move.d] = true; } 
                else if (isTarget) { n[move.d] = true; } 
                else {
                    let nCell = this.grid[ny][nx];
                    if (nCell && nCell.type !== 'WALL') {
                        let ports = this.getPorts(nCell);
                        let oppDir = (move.d + 2) % 4;
                        if (ports.includes(oppDir)) {
                            n[move.d] = true;
                            if (nCell.flows && nCell.flows[oppDir]) w[move.d] = true;
                        }
                    }
                }
            }
        });

        if (type === 'PIPE_STRAIGHT' || type === 'VALVE') {
            if (w[1] || w[3]) return 1;
            if (w[0] || w[2]) return 0;
            if (n[1] || n[3]) return 1;
            return 0; 
        }
        
        if (type === 'PIPE_ANGLE') {
            let scores = [0,0,0,0];
            let val = (dir) => (w[dir] ? 10 : (n[dir] ? 1 : 0));
            scores[0] = val(0) + val(1);
            scores[1] = val(1) + val(2);
            scores[2] = val(2) + val(3);
            scores[3] = val(3) + val(0);
            
            let maxScore = Math.max(...scores);
            if(maxScore > 0) {
                let bestRots = [];
                for(let i=0; i<4; i++) if(scores[i] === maxScore) bestRots.push(i);
                if (bestRots.length === 1) return bestRots[0];
                
                let tx = 0, ty = 0;
                this.currentLevel.targets.forEach(t => { tx += t.x; ty += t.y; });
                tx /= this.currentLevel.targets.length; ty /= this.currentLevel.targets.length;
                let dx = tx - x; let dy = ty - y;
                
                let preferredDirs = [];
                if (dx > 0) preferredDirs.push(1); if (dx < 0) preferredDirs.push(3);
                if (dy > 0) preferredDirs.push(2); if (dy < 0) preferredDirs.push(0);
                
                const rotDirs = [[0,1], [1,2], [2,3], [3,0]];
                for (let r of bestRots) {
                    let dirsForR = rotDirs[r];
                    if (preferredDirs.includes(dirsForR[0]) || preferredDirs.includes(dirsForR[1])) return r;
                }
                return bestRots[0];
            }
            return 0; 
        }
        return 0;
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
                let p = false;
                let rot = this.getBestRotation(x, y, this.activeTool);
                
                if (this.activeTool === 'PIPE_STRAIGHT' && inv.pipes_straight > 0) { this.grid[y][x] = { type: 'PIPE_STRAIGHT', rotation: rot }; inv.pipes_straight--; p = true; }
                else if (this.activeTool === 'PIPE_ANGLE' && inv.pipes_angle > 0) { this.grid[y][x] = { type: 'PIPE_ANGLE', rotation: rot }; inv.pipes_angle--; p = true; }
                else if (this.activeTool === 'PIPE_CROSS' && inv.pipes_cross > 0) { this.grid[y][x] = { type: 'PIPE_CROSS', rotation: 0 }; inv.pipes_cross--; p = true; }
                else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) { this.grid[y][x] = { type: 'AND_GATE', rotation: 0 }; inv.andGates--; p = true; }
                else if (this.activeTool === 'MIXER' && inv.mixers > 0) { this.grid[y][x] = { type: 'MIXER', rotation: 0 }; inv.mixers--; p = true; }
                else if (this.activeTool === 'SPLITTER' && inv.splitters > 0) { this.grid[y][x] = { type: 'SPLITTER', rotation: 0 }; inv.splitters--; p = true; }
                else if (this.activeTool === 'PORTAL' && inv.portals > 0) { this.grid[y][x] = { type: 'PORTAL', rotation: 0 }; inv.portals--; p = true; }
                else if (this.activeTool === 'VALVE' && inv.valves > 0) { this.grid[y][x] = { type: 'VALVE', rotation: rot }; inv.valves--; p = true; }
                
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

    
    getBestRotation(x, y, type) {
        let connections = [false, false, false, false]; // top, right, bottom, left
        let waterFlows = [false, false, false, false];
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}]; 
        
        DIRS.forEach(move => {
            let nx = x + move.dx;
            let ny = y + move.dy;
            if (nx >= 0 && nx < this.currentLevel.gridSize.cols && ny >= 0 && ny < this.currentLevel.gridSize.rows) {
                let isSource = this.currentLevel.sources.find(s => s.x === nx && s.y === ny);
                let isTarget = this.currentLevel.targets.find(t => t.x === nx && t.y === ny);
                
                if (isSource) {
                    connections[move.d] = true;
                    waterFlows[move.d] = true; // Sources always have water
                } else if (isTarget) {
                    connections[move.d] = true;
                } else {
                    let nCell = this.grid[ny][nx];
                    if (nCell && nCell.type !== 'WALL') {
                        let ports = this.getPorts(nCell);
                        let oppDir = (move.d + 2) % 4;
                        if (ports.includes(oppDir)) {
                            connections[move.d] = true;
                            // Check if water is explicitly flowing OUT from that neighbor to us
                            if (nCell.flows && nCell.flows[oppDir]) {
                                waterFlows[move.d] = true;
                            }
                        }
                    }
                }
            }
        });

        if (type === 'PIPE_STRAIGHT' || type === 'VALVE') {
            // Horizontal vs Vertical
            let scoreH = (connections[1]?1:0) + (connections[3]?1:0) + (waterFlows[1]?2:0) + (waterFlows[3]?2:0);
            let scoreV = (connections[0]?1:0) + (connections[2]?1:0) + (waterFlows[0]?2:0) + (waterFlows[2]?2:0);
            if (scoreH > scoreV) return 1; // Horizontal
            return 0; // Vertical default
        }
        
        if (type === 'PIPE_ANGLE') {
            let scores = [0,0,0,0]; // 0:TopRight, 1:RightBottom, 2:BottomLeft, 3:LeftTop
            
            // Score based on matching BOTH ports
            scores[0] = (connections[0]?1:0) + (connections[1]?1:0) + (waterFlows[0]?3:0) + (waterFlows[1]?3:0);
            scores[1] = (connections[1]?1:0) + (connections[2]?1:0) + (waterFlows[1]?3:0) + (waterFlows[2]?3:0);
            scores[2] = (connections[2]?1:0) + (connections[3]?1:0) + (waterFlows[2]?3:0) + (waterFlows[3]?3:0);
            scores[3] = (connections[3]?1:0) + (connections[0]?1:0) + (waterFlows[3]?3:0) + (waterFlows[0]?3:0);
            
            let maxScore = Math.max(...scores);
            if(maxScore > 0) return scores.indexOf(maxScore);
            return 0; 
        }
        return 0;
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
                    this.grid[r][c].flowDist = 0;
                    if(this.grid[r][c].type === 'PORTAL') portals.push({x:c, y:r});
                }
            }
        }
        this.currentLevel.targets.forEach(t => t.currentFlow = null);
        
        if (!this.isFlowing && !silent) return; 

        let queue = [];
        this.currentLevel.sources.forEach(s => {
            queue.push({x: s.x, y: s.y, color: s.color, fromDir: null, dist: 0});
        });

        let iters = 0;
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}];

        while (queue.length > 0 && iters < 5000) {
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
                            otherCell.flowDist = node.dist + 1;
                            queue.push({x: other.x, y: other.y, color: node.color, fromDir: 'portal', dist: node.dist + 1});
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
                            cell.flowDist = node.dist + 1;
                            queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d, dist: node.dist + 1});
                            consumeSplit();
                        }
                        else if (cell.type === 'VALVE') {
                            cell.flows[move.d] = emitColor;
                            cell.flowDist = node.dist + 1;
                            let r = cell.rotation || 0;
                            let inline = (r%2===0) ? [1,3] : [0,2];
                            let control = (r%2===0) ? [0,2] : [1,3];
                            
                            if(inline.includes(move.d)) {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d, dist: node.dist + 1});
                            } else if (control.includes(move.d)) {
                                // Control pressure arrived! Wake up inline flow if it's here
                                inline.forEach(idir => {
                                    if(cell.flows[idir]) {
                                        queue.push({x: nx, y: ny, color: cell.flows[idir], fromDir: idir, dist: node.dist + 1});
                                    }
                                });
                            }
                            consumeSplit();
                        }
                        else if (cell.type === 'AND_GATE') {
                            cell.inputOrigins.add(move.d);
                            cell.flowDist = node.dist + 1;
                            if(!cell.inputs.includes(emitColor)) cell.inputs.push(emitColor);
                            
                            if (cell.inputOrigins.size >= 2) {
                                cell.flows['out'] = cell.inputs[0]; 
                                queue.push({x: nx, y: ny, color: cell.inputs[0], fromDir: null, dist: node.dist + 1});
                            }
                            consumeSplit();
                        }
                        else if (cell.type === 'MIXER') {
                            cell.inputOrigins.add(move.d);
                            cell.flowDist = node.dist + 1;
                            if (!cell.inputs.includes(emitColor)) cell.inputs.push(emitColor);
                            
                            if (cell.inputOrigins.size >= 2) {
                                let mixed = this.mixColors(cell.inputs[0], cell.inputs[1]);
                                cell.flows['out'] = mixed;
                                queue.push({x: nx, y: ny, color: mixed, fromDir: null, dist: node.dist + 1});
                            } else {
                                cell.flows['out'] = cell.inputs[0];
                            }
                            consumeSplit();
                        }
                        else if (cell.type === 'SPLITTER') {
                            cell.inputOrigins.add(move.d);
                            cell.flowDist = node.dist + 1;
                            let unmix = this.unmixColor(emitColor);
                            if(unmix.length === 2) {
                                queue.push({x: nx, y: ny, color: 'split_trigger', colors: unmix, fromDir: move.d, dist: node.dist + 1});
                            } else {
                                queue.push({x: nx, y: ny, color: emitColor, fromDir: move.d, dist: node.dist + 1});
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
            
            winSub.textContent = `Du hast ${this.clicks} Bauteile verbaut (Optimal: ${par})`;
            winXp.textContent = prevStars === 0 ? `+${xp} XP` : (earnedStars > prevStars ? `+${Math.floor(xp * 0.5)} XP` : '+10 XP');
            
            document.getElementById('win-overlay').classList.remove('hidden');
            document.getElementById('game-controls').classList.add('hidden');
        }
    }

    gameLoop(timestamp) {
        this.time = timestamp || 0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.currentLevel) {
            this.ctx.save();
            this.ctx.translate(this.offsetX, this.offsetY);
            
            this.drawPlacedComponents();
            this.drawSourcesAndTargets();
            
            this.ctx.restore();
        }
        requestAnimationFrame((t) => this.gameLoop(t));
    }
    
    drawCB(x, y, color) {
        if(!this.playerStats.colorblind) return;
        const shape = this.shapeMap[color];
        this.ctx.fillStyle = "rgba(0,0,0,0.6)";
        this.ctx.beginPath();
        if(shape==='circle') this.ctx.arc(x,y,5,0,Math.PI*2);
        else if(shape==='square') this.ctx.rect(x-5,y-5,10,10);
        else if(shape==='triangle') { this.ctx.moveTo(x,y-6); this.ctx.lineTo(x-5,y+5); this.ctx.lineTo(x+5,y+5); }
        else if(shape==='diamond') { this.ctx.moveTo(x,y-6); this.ctx.lineTo(x+5,y); this.ctx.lineTo(x,y+6); this.ctx.lineTo(x-5,y); }
        else this.ctx.arc(x,y,5,0,Math.PI*2); 
        this.ctx.fill();
    }

        drawSourcesAndTargets() {
        const s = this.cellSize;
        const hw = s / 2;
        const pW = s * 0.35; // pipe width
        const hPw = pW / 2;
        
        // Animated pulse effect
        const pulse = Math.sin(this.time / 300) * 0.1 + 0.9;
        
        // Base Pipe Material (Metallic) for the stubs
        const pipeGradientV = this.ctx.createLinearGradient(-hPw, 0, hPw, 0);
        pipeGradientV.addColorStop(0, '#27272a');
        pipeGradientV.addColorStop(0.5, '#3f3f46');
        pipeGradientV.addColorStop(1, '#27272a');

        const pipeGradientH = this.ctx.createLinearGradient(0, -hPw, 0, hPw);
        pipeGradientH.addColorStop(0, '#27272a');
        pipeGradientH.addColorStop(0.5, '#3f3f46');
        pipeGradientH.addColorStop(1, '#27272a');

        this.currentLevel.sources.forEach(source => {
            const x = source.x * s; const y = source.y * s;
            const col = this.colorMap[source.color];

            this.ctx.save();
            this.ctx.translate(x + hw, y + hw);
            
            // Draw connection stubs pointing outwards
            // We check which direction has an open pipe to connect to, or just draw a cross base
            this.ctx.fillStyle = pipeGradientH;
            this.ctx.fillRect(-hw, -hPw, s, pW); // Horizontal base
            this.ctx.fillStyle = pipeGradientV;
            this.ctx.fillRect(-hPw, -hw, pW, s); // Vertical base
            
            // Central Connector Hub
            this.ctx.fillStyle = "#18181b";
            this.ctx.beginPath(); this.ctx.roundRect(-hPw-4, -hPw-4, pW+8, pW+8, 8); this.ctx.fill();
            this.ctx.strokeStyle = "#3f3f46"; this.ctx.lineWidth = 2; this.ctx.stroke();

            // Outer glow ring
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = col;
            this.ctx.strokeStyle = col;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath(); 
            this.ctx.arc(0, 0, s*0.35 * pulse, 0, Math.PI * 2); 
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            // Inner core
            this.ctx.fillStyle = col;
            this.ctx.beginPath(); 
            this.ctx.arc(0, 0, s*0.22, 0, Math.PI * 2); 
            this.ctx.fill();
            
            // Highlight
            this.ctx.fillStyle = "rgba(255,255,255,0.8)";
            this.ctx.beginPath(); 
            this.ctx.arc(-s*0.08, -s*0.08, s*0.05, 0, Math.PI * 2); 
            this.ctx.fill();

            this.drawCB(0, 0, source.color);
            this.ctx.restore();
        });

        this.currentLevel.targets.forEach(target => {
            const x = target.x * s; const y = target.y * s;
            const reqCol = this.colorMap[target.requiredColor];

            this.ctx.save();
            this.ctx.translate(x + hw, y + hw);
            
            // Draw connection stubs pointing outwards
            this.ctx.fillStyle = pipeGradientH;
            this.ctx.fillRect(-hw, -hPw, s, pW); // Horizontal base
            this.ctx.fillStyle = pipeGradientV;
            this.ctx.fillRect(-hPw, -hw, pW, s); // Vertical base

            // Central Connector Hub
            this.ctx.fillStyle = "#18181b";
            this.ctx.beginPath(); this.ctx.roundRect(-hPw-4, -hPw-4, pW+8, pW+8, 8); this.ctx.fill();
            this.ctx.strokeStyle = "#3f3f46"; this.ctx.lineWidth = 2; this.ctx.stroke();

            // Hexagon Target Receptacle
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = reqCol;
            this.ctx.strokeStyle = reqCol;
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = 2 * Math.PI / 6 * i;
                const hx = s * 0.4 * Math.cos(angle);
                const hy = s * 0.4 * Math.sin(angle);
                if (i === 0) this.ctx.moveTo(hx, hy);
                else this.ctx.lineTo(hx, hy);
            }
            this.ctx.closePath();
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
            
            // Inner dark circle
            this.ctx.fillStyle = "#09090b";
            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.3, 0, Math.PI * 2); this.ctx.fill();

            let isFilled = target.currentFlow;
            if(this.isFlowing && this.flowAnimationProgress < 90) isFilled = false;

            if (isFilled) {
                const fillCol = this.colorMap[target.currentFlow];
                this.ctx.shadowBlur = 25;
                this.ctx.shadowColor = fillCol;
                this.ctx.fillStyle = fillCol;
                this.ctx.beginPath(); 
                this.ctx.arc(0, 0, s*0.25 * pulse, 0, Math.PI * 2); 
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            } else {
                // Dashed outline for required color
                this.ctx.strokeStyle = reqCol;
                this.ctx.lineWidth = 2; 
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.2, 0, Math.PI * 2); this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
            
            this.drawCB(0, 0, target.requiredColor);
            this.ctx.restore();
        });
    }

    drawPlacedComponents() {
        const s = this.cellSize;
        const hw = s / 2; 
        
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) {
                    // Draw subtle grid point
                    this.ctx.strokeStyle = "rgba(6, 182, 212, 0.2)";
                    this.ctx.lineWidth = 1.5;
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.beginPath();
                    this.ctx.roundRect(c*s + 4, r*s + 4, s - 8, s - 8, 8);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    continue;
                }
                const x = c * s; const y = r * s;

                if (cell.type === 'WALL') {
                    this.ctx.fillStyle = "#18181b"; // darker zinc
                    this.ctx.fillRect(x+2, y+2, s-4, s-4);
                    // Tech pattern for wall
                    this.ctx.strokeStyle = "#27272a"; 
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath(); this.ctx.moveTo(x+4, y+4); this.ctx.lineTo(x+s-4, y+s-4); this.ctx.stroke();
                    this.ctx.beginPath(); this.ctx.moveTo(x+s-4, y+4); this.ctx.lineTo(x+4, y+s-4); this.ctx.stroke();
                    continue;
                }

                this.ctx.save();
                this.ctx.translate(x + hw, y + hw);
                
                if (cell.rotation !== undefined && ['PIPE_STRAIGHT', 'PIPE_ANGLE', 'VALVE'].includes(cell.type)) {
                    this.ctx.rotate(cell.rotation * Math.PI / 2);
                }

                const pW = s * 0.35; 
                const hPw = pW / 2;
                
                let wCol = null;
                if(cell.flows && Object.keys(cell.flows).length > 0) { 
                    wCol = Object.values(cell.flows)[0]; 
                }
                
                let showWater = wCol && (!this.isFlowing || this.flowAnimationProgress > 10); 
                
                // Base Pipe Material (Metallic)
                const pipeGradient = this.ctx.createLinearGradient(-hPw, 0, hPw, 0);
                pipeGradient.addColorStop(0, '#27272a');
                pipeGradient.addColorStop(0.5, '#3f3f46');
                pipeGradient.addColorStop(1, '#27272a');

                if (cell.type === 'PIPE_STRAIGHT') {
                    // Pipe Body
                    this.ctx.fillStyle = pipeGradient;
                    this.ctx.fillRect(-hw, -hPw, s, pW);
                    // Rims
                    this.ctx.fillStyle = "#52525b"; 
                    this.ctx.fillRect(-hw, -hPw, 4, pW); this.ctx.fillRect(hw-4, -hPw, 4, pW);
                    
                    if(showWater) { 
                        const fillCol = this.colorMap[wCol];
                        this.ctx.shadowBlur = 15; this.ctx.shadowColor = fillCol;
                        this.ctx.fillStyle = fillCol; 
                        let localProgress = 1;
                        if(this.isFlowing) {
                            let startAnim = (cell.flowDist || 0) * 3; 
                            localProgress = Math.max(0, Math.min(1, (this.flowAnimationProgress - startAnim) / 10));
                        }
                        let l = localProgress * s;
                        this.ctx.fillRect(-hw, -hPw + 6, l, pW - 12); 
                        this.ctx.shadowBlur = 0;
                        
                        // Add animated flowing particles
                        if(this.isFlowing && this.flowAnimationProgress > 20) {
                            this.ctx.fillStyle = "rgba(255,255,255,0.8)";
                            const px = -hw + ((this.time/10) % s);
                            if(px < -hw + l) {
                                this.ctx.beginPath(); this.ctx.arc(px, 0, 2, 0, Math.PI*2); this.ctx.fill();
                            }
                        }
                        this.drawCB(0, 0, wCol);
                    }
                } 
                else if (cell.type === 'PIPE_ANGLE') {
                    this.ctx.fillStyle = pipeGradient; 
                    this.ctx.fillRect(-hPw, -hw, pW, hw + hPw); 
                    this.ctx.fillRect(-hPw, -hPw, hw + hPw, pW);
                    
                    // Outer Corner smoothing visual
                    this.ctx.fillStyle = "#3f3f46";
                    this.ctx.beginPath(); this.ctx.arc(-hPw, -hPw, pW, 0, Math.PI/2); this.ctx.fill();

                    if(showWater) { 
                        const fillCol = this.colorMap[wCol];
                        this.ctx.shadowBlur = 15; this.ctx.shadowColor = fillCol;
                        this.ctx.fillStyle = fillCol;
                        let localProgress = 1;
                        if(this.isFlowing) {
                            let startAnim = (cell.flowDist || 0) * 3; 
                            localProgress = Math.max(0, Math.min(1, (this.flowAnimationProgress - startAnim) / 10));
                        }
                        let scale = localProgress;
                        this.ctx.fillRect(-hPw + 6, -hw, pW - 12, (hw + hPw - 6)*scale);
                        this.ctx.fillRect(-hPw + 6, -hPw + 6, (hw + hPw - 6)*scale, pW - 12);
                        this.ctx.shadowBlur = 0;
                        this.drawCB(-4, -4, wCol);
                    }
                }
                else if (cell.type === 'PIPE_CROSS') {
                    this.ctx.fillStyle = pipeGradient; 
                    this.ctx.fillRect(-hPw, -hw, pW, s); 
                    this.ctx.fillRect(-hw, -hPw, s, pW);
                    
                    // Central Joint
                    this.ctx.fillStyle = "#52525b";
                    this.ctx.fillRect(-hPw-2, -hPw-2, pW+4, pW+4);
                    
                    let flowV = (cell.flows && (cell.flows[0] || cell.flows[2]));
                    let flowH = (cell.flows && (cell.flows[1] || cell.flows[3]));
                    let localProgress = 1;
                    if(this.isFlowing) {
                        let startAnim = (cell.flowDist || 0) * 3; 
                        localProgress = Math.max(0, Math.min(1, (this.flowAnimationProgress - startAnim) / 10));
                    }
                    let animP = localProgress * s;
                    
                    if(flowV && (!this.isFlowing || this.flowAnimationProgress > 10)) { 
                        this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[flowV];
                        this.ctx.fillStyle = this.colorMap[flowV]; 
                        this.ctx.fillRect(-hPw + 6, -hw, pW - 12, animP); 
                        this.ctx.shadowBlur = 0;
                        this.drawCB(0, -hw/2, flowV); 
                    }
                    if(flowH && (!this.isFlowing || this.flowAnimationProgress > 10)) { 
                        this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[flowH];
                        this.ctx.fillStyle = this.colorMap[flowH]; 
                        this.ctx.fillRect(-hw, -hPw + 6, animP, pW - 12); 
                        this.ctx.shadowBlur = 0;
                        this.drawCB(-hw/2, 0, flowH); 
                    }
                }
                else if (cell.type === 'VALVE') {
                    this.ctx.fillStyle = pipeGradient; this.ctx.fillRect(-hw, -hPw, s, pW); 
                    // Central mechanism
                    this.ctx.fillStyle = "#18181b"; this.ctx.fillRect(-hPw, -hw, pW, s); 
                    this.ctx.strokeStyle = "#52525b"; this.ctx.lineWidth = 4; this.ctx.strokeRect(-hPw, -hw, pW, s);
                    
                    // Red dial
                    this.ctx.fillStyle = "#ef4444"; 
                    this.ctx.beginPath(); this.ctx.arc(0,0,hPw-2, 0, Math.PI*2); this.ctx.fill();
                    
                    let inlineFlow = (cell.flows && (cell.flows[1] || cell.flows[3]));
                    if(inlineFlow && (!this.isFlowing || this.flowAnimationProgress > 40)) {
                        this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[inlineFlow];
                        this.ctx.fillStyle = this.colorMap[inlineFlow];
                        this.ctx.fillRect(-hw, -hPw + 6, s, pW - 12);
                        this.ctx.shadowBlur = 0;
                        // Turn the dial to show it's open
                        this.ctx.fillStyle = "#b91c1c";
                        this.ctx.fillRect(-hPw+4, -2, pW-8, 4);
                    } else {
                        // Closed dial
                        this.ctx.fillStyle = "#b91c1c";
                        this.ctx.fillRect(-2, -hPw+4, 4, pW-8);
                    }
                }
                else if (cell.type === 'AND_GATE' || cell.type === 'MIXER' || cell.type === 'SPLITTER') {
                    // Futuristic Device Base
                    this.ctx.fillStyle = "#27272a"; 
                    this.ctx.beginPath(); this.ctx.roundRect(-hw+5, -hw+5, s-10, s-10, 10); this.ctx.fill();
                    this.ctx.strokeStyle = "#06b6d4"; this.ctx.lineWidth = 2; this.ctx.stroke();
                    
                    if (cell.type === 'AND_GATE') {
                        this.ctx.fillStyle = "#0891b2"; this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.25, 0, Math.PI * 2); this.ctx.fill();
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 18px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("&", 0, 6);
                        
                        if(cell.flows && cell.flows['out'] && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            this.ctx.shadowBlur = 20; this.ctx.shadowColor = this.colorMap[cell.flows['out']];
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']];
                            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.35, 0, Math.PI * 2); this.ctx.fill();
                            this.ctx.shadowBlur = 0;
                            this.drawCB(0,0,cell.flows['out']);
                        }
                    } else if (cell.type === 'MIXER') {
                        this.ctx.fillStyle = "#0891b2"; this.ctx.fillRect(-s*0.25, -s*0.25, s*0.5, s*0.5);
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 12px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("MIX", 0, 4);
                        if(cell.flows && cell.flows['out'] && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            this.ctx.shadowBlur = 20; this.ctx.shadowColor = this.colorMap[cell.flows['out']];
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']]; 
                            this.ctx.fillRect(-s*0.3, -s*0.3, s*0.6, s*0.6);
                            this.ctx.shadowBlur = 0;
                            this.drawCB(0,0,cell.flows['out']);
                        }
                    } else if (cell.type === 'SPLITTER') {
                        this.ctx.fillStyle = "#0891b2"; this.ctx.beginPath(); this.ctx.moveTo(0,-s*0.25); this.ctx.lineTo(s*0.25,s*0.25); this.ctx.lineTo(-s*0.25,s*0.25); this.ctx.fill();
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 10px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("SPLIT", 0, s*0.15);
                        
                        if(cell.flows && (!this.isFlowing || this.flowAnimationProgress > 60)) {
                            if(cell.flows['out1_rendered']) {
                                this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[cell.flows['out1_rendered']];
                                this.ctx.fillStyle = this.colorMap[cell.flows['out1_rendered']];
                                this.ctx.beginPath(); this.ctx.arc(-s*0.2, s*0.2, 8, 0, Math.PI*2); this.ctx.fill();
                                this.ctx.shadowBlur = 0;
                                this.drawCB(-s*0.2, s*0.2, cell.flows['out1_rendered']);
                            }
                            if(cell.flows['out2_rendered']) {
                                this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[cell.flows['out2_rendered']];
                                this.ctx.fillStyle = this.colorMap[cell.flows['out2_rendered']];
                                this.ctx.beginPath(); this.ctx.arc(s*0.2, s*0.2, 8, 0, Math.PI*2); this.ctx.fill();
                                this.ctx.shadowBlur = 0;
                                this.drawCB(s*0.2, s*0.2, cell.flows['out2_rendered']);
                            }
                        }
                    }
                }
                else if (cell.type === 'PORTAL') {
                    // Teleportation Ring
                    this.ctx.shadowBlur = 20; this.ctx.shadowColor = "#a855f7";
                    this.ctx.strokeStyle = "#a855f7"; this.ctx.lineWidth = 4;
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.35, 0, Math.PI*2); this.ctx.stroke();
                    this.ctx.shadowBlur = 0;
                    
                    // Rotating Inner portal
                    this.ctx.rotate(this.time / 500);
                    this.ctx.fillStyle = "#d8b4fe";
                    this.ctx.beginPath(); this.ctx.moveTo(0, -s*0.2); this.ctx.lineTo(s*0.15, s*0.1); this.ctx.lineTo(-s*0.15, s*0.1); this.ctx.fill();
                    
                    if(cell.flows && Object.keys(cell.flows).length > 0 && (!this.isFlowing || this.flowAnimationProgress > 30)) {
                        let c = Object.values(cell.flows)[0];
                        this.ctx.shadowBlur = 20; this.ctx.shadowColor = this.colorMap[c];
                        this.ctx.fillStyle = this.colorMap[c];
                        this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.25, 0, Math.PI*2); this.ctx.fill();
                        this.ctx.shadowBlur = 0;
                        this.drawCB(0,0,c);
                    }
                }

                this.ctx.restore();
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.gameInstance = new HydraGame();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[PWA] Service Worker aktiv (Network-First)'))
            .catch(err => console.error('[PWA] SW Fehler:', err));
    }
});
