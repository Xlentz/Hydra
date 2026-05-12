
class HydraGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = null;
        this.grid = []; 
        this.activeTool = 'PIPE';
        this.cellSize = 50;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isFlowing = false;
        
        this.colorMap = {
            'blue': '#3b82f6',
            'yellow': '#eab308',
            'red': '#ef4444',
            'green': '#22c55e',
            'purple': '#a855f7',
            'orange': '#f97316'
        };

        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            name: "Gast-Techniker", xp: 0, stars: 0, unlockedLevels: 1
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
        document.getElementById('player-xp').textContent = this.playerStats.xp;
        document.getElementById('player-stars').textContent = this.playerStats.stars;
        
        if (this.currentLevel) {
            document.getElementById('inv-pipes').textContent = this.currentLevel.inventory.pipes;
            document.getElementById('inv-and').textContent = this.currentLevel.inventory.andGates;
            document.getElementById('inv-mix').textContent = this.currentLevel.inventory.mixers;
            document.getElementById('header-level').textContent = this.currentLevel.id;
        }
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
            
            if (!isLocked) {
                btn.onclick = () => this.startLevel(index);
            }
            grid.appendChild(btn);
        });
    }

    startLevel(index) {
        this.currentLevel = JSON.parse(JSON.stringify(HYDRA_LEVELS[index]));
        this.isFlowing = false;
        
        const { cols, rows } = this.currentLevel.gridSize;
        // Make cells slightly bigger for better mobile touch
        this.cellSize = Math.min(this.canvas.width / (cols + 1), this.canvas.height / (rows + 3));
        if (this.cellSize > 65) this.cellSize = 65;
        
        this.centerGrid();

        this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
        
        // Place walls in grid
        if (this.currentLevel.walls) {
            this.currentLevel.walls.forEach(w => {
                if(this.grid[w.y] && this.grid[w.y][w.x] === null) {
                    this.grid[w.y][w.x] = { type: 'WALL' };
                }
            });
        }
        
        document.getElementById('level-title').textContent = this.currentLevel.title;
        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        
        this.updateUI();
        this.calculateFlow(); 
    }

    setupEventListeners() {
        // --- PROFILE LOGIC ---
        const modal = document.getElementById('profile-modal');
        const inputName = document.getElementById('input-player-name');
        
        document.getElementById('btn-open-profile').onclick = () => {
            inputName.value = this.playerStats.name;
            document.getElementById('modal-xp').textContent = this.playerStats.xp + ' XP';
            document.getElementById('modal-stars').textContent = this.playerStats.stars;
            modal.classList.remove('hidden');
        };
        
        document.getElementById('btn-close-profile').onclick = () => {
            modal.classList.add('hidden');
        };
        
        document.getElementById('btn-save-profile').onclick = () => {
            if(inputName.value.trim() !== '') {
                this.playerStats.name = inputName.value.trim();
                localStorage.setItem('hydra_stats', JSON.stringify(this.playerStats));
                this.updateUI();
            }
            modal.classList.add('hidden');
        };

        // --- TOOL LOGIC ---
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                this.activeTool = target.dataset.tool;
            });
        });

        // --- GRID CLICK ---
        this.canvas.addEventListener('pointerdown', (e) => {
            if (!this.currentLevel || this.isFlowing) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left - this.offsetX;
            const y = e.clientY - rect.top - this.offsetY;
            
            const col = Math.floor(x / this.cellSize);
            const row = Math.floor(y / this.cellSize);
            
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
            if (this.currentLevel.id < HYDRA_LEVELS.length) {
                this.startLevel(this.currentLevel.id); // Next
            } else {
                location.reload(); // Game beaten
            }
        }
    }

    handleCellClick(x, y) {
        if (this.isSourceOrTarget(x, y)) return;

        const cell = this.grid[y][x];
        const inv = this.currentLevel.inventory;

        if (this.activeTool === 'DELETE') {
            if (cell && cell.type !== 'WALL') {
                if(cell.type === 'PIPE') inv.pipes++;
                if(cell.type === 'AND_GATE') inv.andGates++;
                if(cell.type === 'MIXER') inv.mixers++;
                this.grid[y][x] = null;
            }
        } else {
            if (cell) return; // Cell occupied (by Wall or another tool)

            if (this.activeTool === 'PIPE' && inv.pipes > 0) {
                this.grid[y][x] = { type: 'PIPE' };
                inv.pipes--;
            } else if (this.activeTool === 'AND_GATE' && inv.andGates > 0) {
                this.grid[y][x] = { type: 'AND_GATE' };
                inv.andGates--;
            } else if (this.activeTool === 'MIXER' && inv.mixers > 0) {
                this.grid[y][x] = { type: 'MIXER' };
                inv.mixers--;
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

    // --- LOGIC ENGINE ---

    calculateFlow() {
        if (!this.currentLevel) return;
        
        // Reset all cell flow states & target flows
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                if(this.grid[r][c] && this.grid[r][c].type !== 'WALL') {
                    this.grid[r][c].waterColor = null;
                    this.grid[r][c].inputs = [];
                    // For AND-Gates, track input origins to ensure they come from different directions
                    this.grid[r][c].inputOrigins = new Set();
                }
            }
        }
        
        this.currentLevel.targets.forEach(t => t.currentFlow = null);

        if (!this.isFlowing) return;

        let activeNodes = [];
        this.currentLevel.sources.forEach(s => {
            activeNodes.push({x: s.x, y: s.y, color: s.color, originX: s.x, originY: s.y});
        });

        let visited = new Set();
        let iters = 0;
        
        while (activeNodes.length > 0 && iters < 2000) {
            iters++;
            let node = activeNodes.shift();
            
            // To prevent infinite loops but allow crossing flows in pipes
            let key = `${node.x},${node.y},${node.color},${node.originX},${node.originY}`;
            if (visited.has(key)) continue;
            visited.add(key);

            const neighbors = [
                {x: node.x+1, y: node.y}, {x: node.x-1, y: node.y},
                {x: node.x, y: node.y+1}, {x: node.x, y: node.y-1}
            ];

            neighbors.forEach(n => {
                // Don't flow backwards
                if(n.x === node.originX && n.y === node.originY) return;

                if (n.x >= 0 && n.x < this.currentLevel.gridSize.cols && n.y >= 0 && n.y < this.currentLevel.gridSize.rows) {
                    let cell = this.grid[n.y][n.x];
                    
                    let target = this.currentLevel.targets.find(t => t.x === n.x && t.y === n.y);
                    if (target) {
                        target.currentFlow = node.color;
                    }
                    
                    if (cell && cell.type !== 'WALL') {
                        if (cell.type === 'PIPE') {
                            cell.waterColor = node.color; // purely visual 
                            activeNodes.push({x: n.x, y: n.y, color: node.color, originX: node.x, originY: node.y});
                        }
                        else if (cell.type === 'AND_GATE') {
                            cell.inputOrigins.add(`${node.originX},${node.originY}`);
                            if(!cell.inputs.includes(node.color)) cell.inputs.push(node.color);
                            
                            // Needs inputs from at least 2 distinct adjacent cells
                            if (cell.inputOrigins.size >= 2) {
                                cell.waterColor = cell.inputs[0]; 
                                activeNodes.push({x: n.x, y: n.y, color: cell.waterColor, originX: node.x, originY: node.y});
                            }
                        }
                        else if (cell.type === 'MIXER') {
                            if (!cell.inputs.includes(node.color)) cell.inputs.push(node.color);
                            if (cell.inputs.length >= 2) {
                                let mixed = this.mixColors(cell.inputs[0], cell.inputs[1]);
                                cell.waterColor = mixed;
                                activeNodes.push({x: n.x, y: n.y, color: mixed, originX: node.x, originY: node.y});
                            } else {
                                cell.waterColor = cell.inputs[0];
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
        const mix = {
            'blue+yellow': 'green', 'yellow+blue': 'green',
            'red+blue': 'purple', 'blue+red': 'purple',
            'red+yellow': 'orange', 'yellow+red': 'orange'
        };
        return mix[`${c1}+${c2}`] || c1;
    }

    checkWinCondition() {
        if (!this.isFlowing) return;
        
        let won = true;
        this.currentLevel.targets.forEach(t => {
            if (t.currentFlow !== t.requiredColor) won = false;
        });

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
            this.ctx.beginPath();
            this.ctx.moveTo(0, r * this.cellSize);
            this.ctx.lineTo(cols * this.cellSize, r * this.cellSize);
            this.ctx.stroke();
        }
        for(let c = 0; c <= cols; c++) {
            this.ctx.beginPath();
            this.ctx.moveTo(c * this.cellSize, 0);
            this.ctx.lineTo(c * this.cellSize, rows * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawPlacedComponents() {
        const s = this.cellSize;
        const hw = s / 2; 
        
        for(let r=0; r<this.currentLevel.gridSize.rows; r++) {
            for(let c=0; c<this.currentLevel.gridSize.cols; c++) {
                const cell = this.grid[r][c];
                if (!cell) continue;

                const x = c * s;
                const y = r * s;
                
                if (cell.type === 'WALL') {
                    this.ctx.fillStyle = "#1e293b";
                    this.ctx.fillRect(x+1, y+1, s-2, s-2);
                    
                    // Simple pattern for wall
                    this.ctx.strokeStyle = "#0f172a";
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y); this.ctx.lineTo(x+s, y+s);
                    this.ctx.moveTo(x+s, y); this.ctx.lineTo(x, y+s);
                    this.ctx.stroke();
                    continue;
                }

                this.ctx.fillStyle = "rgba(50, 60, 80, 0.8)";
                this.ctx.strokeStyle = "rgba(150, 160, 180, 0.5)";
                this.ctx.lineWidth = 2;
                
                if (cell.type === 'PIPE') {
                    this.ctx.fillRect(x + s*0.25, y, s*0.5, s);
                    this.ctx.fillRect(x, y + s*0.25, s, s*0.5);
                    this.ctx.strokeRect(x + s*0.25, y, s*0.5, s);
                    this.ctx.strokeRect(x, y + s*0.25, s, s*0.5);
                } 
                else if (cell.type === 'AND_GATE') {
                    this.ctx.beginPath();
                    this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.fillStyle = "#fff";
                    this.ctx.font = "bold 14px Arial";
                    this.ctx.textAlign = "center";
                    this.ctx.fillText("&", x + hw, y + hw + 5);
                }
                else if (cell.type === 'MIXER') {
                    this.ctx.fillRect(x + s*0.1, y + s*0.1, s*0.8, s*0.8);
                    this.ctx.strokeRect(x + s*0.1, y + s*0.1, s*0.8, s*0.8);
                    this.ctx.fillStyle = "#fff";
                    this.ctx.font = "bold 10px Arial";
                    this.ctx.textAlign = "center";
                    this.ctx.fillText("MIX", x + hw, y + hw + 3);
                }

                // Water Flow Overlay
                if (cell.waterColor) {
                    this.ctx.fillStyle = this.colorMap[cell.waterColor];
                    if (cell.type === 'PIPE') {
                        this.ctx.fillRect(x + s*0.35, y, s*0.3, s);
                        this.ctx.fillRect(x, y + s*0.35, s, s*0.3);
                    } else if (cell.type === 'AND_GATE') {
                        this.ctx.beginPath();
                        this.ctx.arc(x + hw, y + hw, s*0.2, 0, Math.PI * 2);
                        this.ctx.fill();
                    } else if (cell.type === 'MIXER') {
                        this.ctx.fillRect(x + s*0.25, y + s*0.25, s*0.5, s*0.5);
                    }
                }
            }
        }
    }

    drawSourcesAndTargets() {
        const s = this.cellSize;
        const hw = s / 2;

        this.currentLevel.sources.forEach(source => {
            const x = source.x * s;
            const y = source.y * s;
            
            this.ctx.fillStyle = this.colorMap[source.color];
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.colorMap[source.color];
            this.ctx.beginPath();
            this.ctx.arc(x + hw, y + hw, s*0.35, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0; 
            
            // Draw a small nozzle
            this.ctx.fillStyle = "#94a3b8";
            this.ctx.fillRect(x + hw - 4, y + hw - 4, 8, 8);
        });

        this.currentLevel.targets.forEach(target => {
            const x = target.x * s;
            const y = target.y * s;
            
            this.ctx.strokeStyle = this.colorMap[target.requiredColor];
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(x + hw, y + hw, s*0.4, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]); // reset

            if (target.currentFlow) {
                this.ctx.fillStyle = this.colorMap[target.currentFlow];
                this.ctx.beginPath();
                this.ctx.arc(x + hw, y + hw, s*0.3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
}

const game = new HydraGame();
