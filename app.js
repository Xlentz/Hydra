
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
        document.getElementById('player-name').textContent = this.playerStats.name;
        document.getElementById('header-avatar').textContent = this.playerStats.avatar;
        document.getElementById('player-xp').textContent = this.playerStats.xp;
        document.getElementById('player-stars').textContent = this.playerStats.stars;
        
        if (this.currentLevel) {
            document.getElementById('inv-straight').textContent = this.currentLevel.inventory.pipes_straight;
            document.getElementById('inv-angle').textContent = this.currentLevel.inventory.pipes_angle;
            document.getElementById('inv-cross').textContent = this.currentLevel.inventory.pipes_cross;
            document.getElementById('inv-and').textContent = this.currentLevel.inventory.andGates;
            document.getElementById('inv-mix').textContent = this.currentLevel.inventory.mixers;
            document.getElementById('header-level').textContent = this.currentLevel.id;
        }

        // Update Achievements UI
        const unlocked = this.playerStats.unlockedLevels;
        if(unlocked > 1) document.getElementById('ach-1').classList.add('unlocked');
        if(unlocked > 3) document.getElementById('ach-3').classList.add('unlocked');
        if(unlocked > 5) document.getElementById('ach-5').classList.add('unlocked');
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
            this.updateUI(); // ensure achievements show correctly
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
                // Rotate if it's a pipe and NOT delete tool
                if(['PIPE_STRAIGHT', 'PIPE_ANGLE'].includes(cell.type)) {
                    cell.rotation = (cell.rotation + 1) % 4;
                }
            } else {
                // Place new
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

    // --- NEW STRICT LOGIC ENGINE ---
    // Directions: 0=Top, 1=Right, 2=Bottom, 3=Left

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
        // dir is direction FROM 'from' TO 'to'
        const fromCell = this.grid[fromY] && this.grid[fromY][fromX];
        const toCell = this.grid[toY] && this.grid[toY][toX];
        
        // Sources connect out to anything
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
                    this.grid[r][c].flows = {}; // e.g. { '0': 'blue', '2': 'red' } meaning flow towards Top is blue, Bottom is red
                    this.grid[r][c].inputs = [];
                    this.grid[r][c].inputOrigins = new Set();
                }
            }
        }
        this.currentLevel.targets.forEach(t => t.currentFlow = null);
        if (!this.isFlowing) return;

        let queue = [];
        this.currentLevel.sources.forEach(s => {
            // Source pushes to all 4 neighbors
            queue.push({x: s.x, y: s.y, color: s.color, fromDir: -1, originX: s.x, originY: s.y});
        });

        let iters = 0;
        const DIRS = [{dx:0, dy:-1, d:0}, {dx:1, dy:0, d:1}, {dx:0, dy:1, d:2}, {dx:-1, dy:0, d:3}];

        while (queue.length > 0 && iters < 2000) {
            iters++;
            let node = queue.shift();

            DIRS.forEach(move => {
                // Don't flow backward
                if (move.d === (node.fromDir + 2) % 4) return;
                
                let nx = node.x + move.dx;
                let ny = node.y + move.dy;

                if (nx >= 0 && nx < this.currentLevel.gridSize.cols && ny >= 0 && ny < this.currentLevel.gridSize.rows) {
                    // Check if they visually connect
                    if (!this.canConnect(node.x, node.y, nx, ny, move.d)) return;

                    let target = this.currentLevel.targets.find(t => t.x === nx && t.y === ny);
                    if (target) {
                        target.currentFlow = node.color;
                        return; // Reached target
                    }

                    let cell = this.grid[ny][nx];
                    if (cell && cell.type !== 'WALL') {
                        // Prevent infinite loop in the exact same pipe/dir
                        if(cell.flows[move.d] === node.color) return; 
                        
                        if (cell.type.startsWith('PIPE')) {
                            cell.flows[move.d] = node.color; // store color flowing OUT to this dir
                            // Special for CROSS: don't mix, go straight through
                            if(cell.type === 'PIPE_CROSS') {
                                queue.push({x: nx, y: ny, color: node.color, fromDir: move.d, originX: nx, originY: ny});
                            } else {
                                // Angle/Straight just propagate to all connected (which is usually just 1 other port)
                                queue.push({x: nx, y: ny, color: node.color, fromDir: move.d, originX: nx, originY: ny});
                            }
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
                                // Don't propagate until mixed
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
                
                document.getElementById('win-xp').textContent = `+${xp} XP`;
                document.getElementById('win-overlay').classList.remove('hidden');
                document.getElementById('game-controls').classList.add('hidden');
            }, 600);
        }
    }

    // --- RENDERING ---

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.currentLevel) {
            this.ctx.save();
            this.ctx.translate(this.offsetX, this.offsetY);
            this.drawGridLines();
            this.drawPlacedComponents();
            this.drawSourcesAndTargets();
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
                
                // Rotation applying ONLY to pipes
                if (cell.rotation !== undefined) {
                    this.ctx.rotate(cell.rotation * Math.PI / 2);
                }

                this.ctx.fillStyle = "rgba(50, 60, 80, 0.9)";
                this.ctx.strokeStyle = "rgba(150, 160, 180, 0.5)";
                this.ctx.lineWidth = 2;
                
                let wCol = null;
                // Get ANY flow color for visual fill if needed
                if(cell.flows) {
                    wCol = Object.values(cell.flows)[0];
                }

                const drawWater = (color) => {
                    if(!color) return;
                    this.ctx.fillStyle = this.colorMap[color];
                };

                if (cell.type === 'PIPE_STRAIGHT') {
                    this.ctx.fillRect(-s, -s*0.25, s*2, s*0.5);
                    this.ctx.strokeRect(-s, -s*0.25, s*2, s*0.5);
                    if(wCol) { drawWater(wCol); this.ctx.fillRect(-s, -s*0.15, s*2, s*0.3); }
                } 
                else if (cell.type === 'PIPE_ANGLE') {
                    // Top to Right (rot 0)
                    this.ctx.fillRect(-s*0.25, -s, s*0.5, s*1.25);
                    this.ctx.fillRect(-s*0.25, -s*0.25, s*1.25, s*0.5);
                    this.ctx.strokeRect(-s*0.25, -s, s*0.5, s*1.25);
                    this.ctx.strokeRect(-s*0.25, -s*0.25, s*1.25, s*0.5);
                    // Hide intersection lines
                    this.ctx.fillRect(-s*0.22, -s*0.22, s*0.44, s*0.44);
                    
                    if(wCol) { 
                        drawWater(wCol); 
                        this.ctx.fillRect(-s*0.15, -s, s*0.3, s);
                        this.ctx.fillRect(-s*0.15, -s*0.15, s, s*0.3);
                    }
                }
                else if (cell.type === 'PIPE_CROSS') {
                    this.ctx.fillRect(-s*0.25, -s, s*0.5, s*2);
                    this.ctx.fillRect(-s, -s*0.25, s*2, s*0.5);
                    this.ctx.strokeRect(-s*0.25, -s, s*0.5, s*2);
                    this.ctx.strokeRect(-s, -s*0.25, s*2, s*0.5);
                    this.ctx.fillRect(-s*0.22, -s*0.22, s*0.44, s*0.44);
                    
                    // Cross can have different colors crossing
                    if(cell.flows && cell.flows[0]) { drawWater(cell.flows[0]); this.ctx.fillRect(-s*0.15, -s, s*0.3, s*2); }
                    if(cell.flows && cell.flows[1]) { drawWater(cell.flows[1]); this.ctx.fillRect(-s, -s*0.15, s*2, s*0.3); }
                }
                else if (cell.type === 'AND_GATE') {
                    this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.35, 0, Math.PI * 2);
                    this.ctx.fill(); this.ctx.stroke();
                    this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 16px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("&", 0, 6);
                    if(cell.flows && cell.flows['out']) {
                        drawWater(cell.flows['out']);
                        this.ctx.beginPath(); this.ctx.arc(0, 0, s*0.2, 0, Math.PI * 2); this.ctx.fill();
                    }
                }
                else if (cell.type === 'MIXER') {
                    this.ctx.fillRect(-s*0.4, -s*0.4, s*0.8, s*0.8);
                    this.ctx.strokeRect(-s*0.4, -s*0.4, s*0.8, s*0.8);
                    this.ctx.fillStyle = "#fff"; this.ctx.font = "bold 12px Arial"; this.ctx.textAlign = "center"; this.ctx.fillText("MIX", 0, 4);
                    if(cell.flows && cell.flows['out']) {
                        drawWater(cell.flows['out']);
                        this.ctx.fillRect(-s*0.3, -s*0.3, s*0.6, s*0.6);
                    }
                }

                this.ctx.restore();
            }
        }
    }

    drawSourcesAndTargets() {
        const s = this.cellSize;
        const hw = s / 2;
        this.currentLevel.sources.forEach(source => {
            const x = source.x * s; const y = source.y * s;
            this.ctx.fillStyle = this.colorMap[source.color];
            this.ctx.shadowBlur = 10; this.ctx.shadowColor = this.colorMap[source.color];
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2); this.ctx.fill();
            this.ctx.shadowBlur = 0; 
            this.ctx.fillStyle = "#94a3b8"; this.ctx.fillRect(x + hw - 5, y + hw - 5, 10, 10);
        });

        this.currentLevel.targets.forEach(target => {
            const x = target.x * s; const y = target.y * s;
            this.ctx.strokeStyle = this.colorMap[target.requiredColor];
            this.ctx.lineWidth = 4; this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.4, 0, Math.PI * 2); this.ctx.stroke();
            this.ctx.setLineDash([]); 
            if (target.currentFlow) {
                this.ctx.fillStyle = this.colorMap[target.currentFlow];
                this.ctx.beginPath(); this.ctx.arc(x + hw, y + hw, s*0.3, 0, Math.PI * 2); this.ctx.fill();
            }
        });
    }
}
const game = new HydraGame();
