
class HydraGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = null;
        this.grid = []; 
        this.activeTool = 'PIPE_STRAIGHT';
        this.cellSize = 60;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isFlowing = false;
        
        this.colorMap = {
            'blue': '#3b82f6', 'yellow': '#eab308', 'red': '#ef4444',
            'green': '#22c55e', 'purple': '#a855f7', 'orange': '#f97316'
        };

        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            name: "Gast-Techniker", avatar: "👨‍🔧", xp: 0, stars: 0, unlockedLevels: 1
        };

        this.init();
        window.addEventListener('resize', () => this.resize());
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
        
        if (this.currentLevel) {
            setEl('inv-straight', this.currentLevel.inventory.pipes_straight);
            setEl('inv-angle', this.currentLevel.inventory.pipes_angle);
            setEl('inv-cross', this.currentLevel.inventory.pipes_cross);
            setEl('inv-and', this.currentLevel.inventory.andGates);
            setEl('inv-mix', this.currentLevel.inventory.mixers);
            setEl('header-level', this.currentLevel.id);
        }

        const unlocked = this.playerStats.unlockedLevels;
        const a1 = document.getElementById('ach-1'); if(a1 && unlocked > 1) a1.classList.add('unlocked');
        const a3 = document.getElementById('ach-3'); if(a3 && unlocked > 3) a3.classList.add('unlocked');
        const a5 = document.getElementById('ach-5'); if(a5 && unlocked > 5) a5.classList.add('unlocked');
    }

    renderLevelList() {
        const grid = document.getElementById('level-grid');
        grid.innerHTML = '';
        HYDRA_LEVELS.forEach((level, index) => {
            const btn = document.createElement('button');
            const isLocked = index + 1 > this.playerStats.unlockedLevels;
            btn.className = `h-16 flex flex-col items-center justify-center rounded-xl font-bold transition-all ${
                isLocked ? 'bg-slate-800 text-slate-600 border border-slate-700 opacity-50' : 'bg-slate-800 text-cyan-100 hover:bg-cyan-900 shadow-lg border border-cyan-500/50'
            }`;
            btn.innerHTML = `<span class="text-xl">${level.id}</span>`;
            if (!isLocked) btn.onclick = () => this.startLevel(index);
            grid.appendChild(btn);
        });
    }

    startLevel(index) {
        this.currentLevel = JSON.parse(JSON.stringify(HYDRA_LEVELS[index]));
        this.isFlowing = false;
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
        this.calculateFlow(); 
    }

    setupEventListeners() {
        const modal = document.getElementById('profile-modal');
        let selectedAvatarTemp = this.playerStats.avatar;

        document.getElementById('btn-open-profile').onclick = () => {
            const inp = document.getElementById('input-player-name');
            if(inp) inp.value = this.playerStats.name;
            
            const mxp = document.getElementById('modal-xp');
            if(mxp) mxp.textContent = this.playerStats.xp + ' XP';
            
            const mst = document.getElementById('modal-stars');
            if(mst) mst.textContent = this.playerStats.stars;
            
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
            this.calculateFlow();
        };
        
        document.getElementById('btn-reset').onclick = () => {
            this.isFlowing = false;
            this.startLevel(this.currentLevel.id - 1);
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
                this.grid[y][x] = null;
            }
        } else {
            if (cell) {
                if(['PIPE_STRAIGHT', 'PIPE_ANGLE', 'PIPE_CROSS'].includes(cell.type)) {
                    cell.rotation = (cell.rotation + 1) % 4;
                }
            } else {
                let placed = false;
                if (this.activeTool === 'PIPE_STRAIGHT' && inv.pipes_straight > 0) {
                    this.grid[y][x] = { type: 'PIPE_STRAIGHT', rotation: 0 }; inv.pipes_straight--; placed = true;
                } else if (this.activeTool === 'PIPE_ANGLE' && inv.pipes_angle > 0) {
                    this.grid[y][x] = { type: 'PIPE_ANGLE', rotation: 0 }; inv.pipes_angle--; placed = true;
                } else if (this.activeTool === 'PIPE_CROSS' && inv.pipes_cross > 0) {
                    this.grid[y][x] = { type: 'PIPE_CROSS', rotation: 0 }; inv.pipes_cross--; placed = true;
                } else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) {
                    this.grid[y][x] = { type: 'AND_GATE', rotation: 0 }; inv.andGates--; placed = true;
                } else if (this.activeTool === 'MIXER' && inv.mixers > 0) {
                    this.grid[y][x] = { type: 'MIXER', rotation: 0 }; inv.mixers--; placed = true;
                }
            }
        }
        
        this.updateUI();
        this.calculateFlow(); 
    }
    
    isSourceOrTarget(x, y) {
        let isST = false;
        this.currentLevel.sources.forEach(s => { if(s.x === x && s.y === y) isST = true; });
        this.currentLevel.targets.forEach(t => { if(t.x === x && t.y === y) isST = true; });
        return isST;
    }

    getPorts(cell) {
        if (!cell) return [];
        if (cell.type === 'PIPE_STRAIGHT') return cell.rotation % 2 === 0 ? [1, 3] : [0, 2];
        if (cell.type === 'PIPE_ANGLE') {
            if(cell.rotation === 0) return [0, 1]; // Top-Right
            if(cell.rotation === 1) return [1, 2]; // Right-Bottom
            if(cell.rotation === 2) return [2, 3]; // Bottom-Left
            if(cell.rotation === 3) return [3, 0]; // Left-Top
        }
        if (cell.type === 'PIPE_CROSS') return [0, 1, 2, 3];
        if (cell.type === 'AND_GATE' || cell.type === 'MIXER') return [0, 1, 2, 3];
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

    calculateFlow() {
        if (!this.currentLevel) return;
        
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                if(this.grid[r][c] && this.grid[r][c].type !== 'WALL') {
                    this.grid[r][c].flows = {}; 
                    this.grid[r][c].inputs = [];
                    this.grid[r][c].inputOrigins = new Set();
                }
            }
        }
        this.currentLevel.targets.forEach(t => t.currentFlow = null);
        if (!this.isFlowing) return;

        let queue = [];
        this.currentLevel.sources.forEach(s => {
            queue.push({x: s.x, y: s.y, color: s.color, fromDir: -1, originX: s.x, originY: s.y});
        });

        let iters = 0;
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}];

        while (queue.length > 0 && iters < 2000) {
            iters++;
            let node = queue.shift();

            let currentCell = this.grid[node.y][node.x];

            DIRS.forEach(move => {
                if (move.d === (node.fromDir + 2) % 4) return; 

                if (currentCell && currentCell.type === 'PIPE_CROSS' && node.fromDir !== -1) {
                    if (move.d !== node.fromDir) return; 
                }

                let nx = node.x + move.dx;
                let ny = node.y + move.dy;

                if (nx >= 0 && nx < this.currentLevel.gridSize.cols && ny >= 0 && ny < this.currentLevel.gridSize.rows) {
                    if (!this.canConnect(node.x, node.y, nx, ny, move.d)) return;

                    let target = this.currentLevel.targets.find(t => t.x === nx && t.y === ny);
                    if (target) {
                        target.currentFlow = node.color;
                        return; 
                    }

                    let cell = this.grid[ny][nx];
                    if (cell && cell.type !== 'WALL') {
                        if(cell.flows[move.d] === node.color) return; 
                        
                        if (cell.type.startsWith('PIPE')) {
                            cell.flows[move.d] = node.color; 
                            queue.push({x: nx, y: ny, color: node.color, fromDir: move.d, originX: nx, originY: ny});
                        }
                        else if (cell.type === 'AND_GATE') {
                            cell.inputOrigins.add(move.d);
                            if(!cell.inputs.includes(node.color)) cell.inputs.push(node.color);
                            
                            if (cell.inputOrigins.size >= 2) {
                                cell.flows['out'] = cell.inputs[0]; 
                                queue.push({x: nx, y: ny, color: cell.inputs[0], fromDir: move.d, originX: nx, originY: ny});
                            }
                        }
                        else if (cell.type === 'MIXER') {
                            cell.inputOrigins.add(move.d);
                            if (!cell.inputs.includes(node.color)) cell.inputs.push(node.color);
                            
                            if (cell.inputOrigins.size >= 2) {
                                let mixed = this.mixColors(cell.inputs[0], cell.inputs[1]);
                                cell.flows['out'] = mixed;
                                queue.push({x: nx, y: ny, color: mixed, fromDir: move.d, originX: nx, originY: ny});
                            } else {
                                cell.flows['out'] = cell.inputs[0];
                            }
                        }
                    }
                }
            });
        }
        this.checkWinCondition();
    }

    mixColors(c1, c2) {
        if(c1 === c2) return c1;
        const mix = { 'blue+yellow': 'green', 'yellow+blue': 'green', 'red+blue': 'purple', 'blue+red': 'purple', 'red+yellow': 'orange', 'yellow+red': 'orange' };
        return mix[`${c1}+${c2}`] || c1;
    }

    checkWinCondition() {
        if (!this.isFlowing) return;
        let won = true;
        this.currentLevel.targets.forEach(t => { if (t.currentFlow !== t.requiredColor) won = false; });
        if (won) {
            setTimeout(() => {
                const xp = this.currentLevel.xpReward;
                this.playerStats.xp += xp;
                this.playerStats.stars += 1;
                if (this.currentLevel.id >= this.playerStats.unlockedLevels) {
                    this.playerStats.unlockedLevels = this.currentLevel.id + 1;
                }
                localStorage.setItem('hydra_stats', JSON.stringify(this.playerStats));
                this.updateUI();
                
                const winXp = document.getElementById('win-xp');
                if (winXp) winXp.textContent = `+${xp} XP`;
                
                const overlay = document.getElementById('win-overlay');
                const controls = document.getElementById('game-controls');
                if(overlay) overlay.classList.remove('hidden');
                if(controls) controls.classList.add('hidden');
            }, 600);
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

    drawSourcesAndTargets() {
        const s = this.cellSize;
        const hw = s / 2;
        this.currentLevel.sources.forEach(source => {
            const x = source.x * s; const y = source.y * s;

            // Connection Lines
            this.ctx.fillStyle = "#475569";
            this.ctx.fillRect(x + hw - 6, y, 12, s);
            this.ctx.fillRect(x, y + hw - 6, s, 12);

            this.ctx.fillStyle = this.colorMap[source.color];
            this.ctx.shadowBlur = 15; this.ctx.shadowColor = this.colorMap[source.color];
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.shadowBlur = 0; 
            
            this.ctx.fillStyle = "#f8fafc";
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, 4, 0, Math.PI * 2); this.ctx.fill();
        });

        this.currentLevel.targets.forEach(target => {
            const x = target.x * s; const y = target.y * s;

            // Connection Lines
            this.ctx.fillStyle = "#475569";
            this.ctx.fillRect(x + hw - 6, y, 12, s);
            this.ctx.fillRect(x, y + hw - 6, s, 12);

            this.ctx.strokeStyle = this.colorMap[target.requiredColor];
            this.ctx.lineWidth = 4; this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.4, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.setLineDash([]); 
            
            this.ctx.fillStyle = "#1e293b";
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2); this.ctx.fill();

            if (target.currentFlow) {
                this.ctx.fillStyle = this.colorMap[target.currentFlow];
                this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.3, 0, Math.PI * 2); this.ctx.fill();
            }
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
                
                if (cell.rotation !== undefined && ['PIPE_STRAIGHT', 'PIPE_ANGLE'].includes(cell.type)) {
                    this.ctx.rotate(cell.rotation * Math.PI / 2);
                }

                const pW = s * 0.3; // Pipe visual width
                const hPw = pW / 2;
                
                let wCol = null;
                if(cell.flows && Object.keys(cell.flows).length > 0) { 
                    wCol = Object.values(cell.flows)[0]; 
                }

                if (cell.type === 'PIPE_STRAIGHT') {
                    this.ctx.fillStyle = "#334155";
                    this.ctx.fillRect(-hw, -hPw, s, pW);
                    
                    this.ctx.fillStyle = "#94a3b8";
                    this.ctx.fillRect(-hw, -hPw, s, 2);
                    this.ctx.fillRect(-hw, hPw - 2, s, 2);
                    
                    if(wCol) { 
                        this.ctx.fillStyle = this.colorMap[wCol]; 
                        this.ctx.fillRect(-hw, -hPw + 4, s, pW - 8); 
                    }
                } 
                else if (cell.type === 'PIPE_ANGLE') {
                    this.ctx.fillStyle = "#334155";
                    this.ctx.fillRect(-hPw, -hw, pW, hw + hPw);
                    this.ctx.fillRect(-hPw, -hPw, hw + hPw, pW);
                    
                    this.ctx.fillStyle = "#94a3b8";
                    this.ctx.fillRect(-hPw, -hw, 2, hw + hPw); // L top
                    this.ctx.fillRect(-hPw, hPw - 2, hw + hPw, 2); // B right
                    this.ctx.fillRect(hPw - 2, -hw, 2, hw - hPw + 2); // R top inner
                    this.ctx.fillRect(hPw - 2, -hPw, hw - hPw + 2, 2); // T right inner
                    
                    if(wCol) { 
                        this.ctx.fillStyle = this.colorMap[wCol];
                        this.ctx.fillRect(-hPw + 4, -hw, pW - 8, hw + hPw - 4);
                        this.ctx.fillRect(-hPw + 4, -hPw + 4, hw + hPw - 4, pW - 8);
                    }
                }
                else if (cell.type === 'PIPE_CROSS') {
                    this.ctx.fillStyle = "#334155";
                    this.ctx.fillRect(-hPw, -hw, pW, s);
                    this.ctx.fillRect(-hw, -hPw, s, pW);
                    
                    this.ctx.fillStyle = "#94a3b8";
                    this.ctx.fillRect(-hw, -hPw, hw - hPw, 2);
                    this.ctx.fillRect(-hPw, -hw, 2, hw - hPw);
                    this.ctx.fillRect(hPw, -hPw, hw - hPw, 2);
                    this.ctx.fillRect(hPw - 2, -hw, 2, hw - hPw);
                    this.ctx.fillRect(-hw, hPw - 2, hw - hPw, 2);
                    this.ctx.fillRect(-hPw, hPw, 2, hw - hPw);
                    this.ctx.fillRect(hPw, hPw - 2, hw - hPw, 2);
                    this.ctx.fillRect(hPw - 2, hPw, 2, hw - hPw);
                    
                    let flowV = (cell.flows && (cell.flows[0] || cell.flows[2]));
                    let flowH = (cell.flows && (cell.flows[1] || cell.flows[3]));
                    
                    if(flowV) { this.ctx.fillStyle = this.colorMap[flowV]; this.ctx.fillRect(-hPw + 4, -hw, pW - 8, s); }
                    if(flowH) { this.ctx.fillStyle = this.colorMap[flowH]; this.ctx.fillRect(-hw, -hPw + 4, s, pW - 8); }
                }
                else if (cell.type === 'AND_GATE' || cell.type === 'MIXER') {
                    this.ctx.fillStyle = "#475569";
                    this.ctx.fillRect(-6, -hw, 12, s); // V ports
                    this.ctx.fillRect(-hw, -6, s, 12); // H ports
                    
                    if (cell.type === 'AND_GATE') {
                        this.ctx.fillStyle = "#1e293b";
                        this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.35, 0, Math.PI * 2);
                        this.ctx.fill();
                        this.ctx.strokeStyle = "#94a3b8"; this.ctx.lineWidth = 2; this.ctx.stroke();
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 16px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("&", 0, 6);
                        
                        if(cell.flows && cell.flows['out']) {
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']];
                            this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.2, 0, Math.PI * 2); this.ctx.fill();
                        }
                    } else {
                        this.ctx.fillStyle = "#1e293b";
                        this.ctx.fillRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                        this.ctx.strokeStyle = "#94a3b8"; this.ctx.lineWidth = 2; this.ctx.strokeRect(-s*0.35, -s*0.35, s*0.7, s*0.7);
                        this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 12px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("MIX", 0, 4);
                        
                        if(cell.flows && cell.flows['out']) {
                            this.ctx.fillStyle = this.colorMap[cell.flows['out']];
                            this.ctx.fillRect(-s*0.25, -s*0.25, s*0.5, s*0.5);
                        }
                    }
                }

                this.ctx.restore();
            }
        }
    }
}
const game = new HydraGame();
