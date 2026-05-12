class HydraGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentLevel = null;
        this.grid = []; // Speichert den Zustand jeder Zelle
        
        this.playerStats = JSON.parse(localStorage.getItem('hydra_stats')) || {
            xp: 0, unlockedLevels: 1
        };

        this.init();
        window.addEventListener('resize', () => this.resize());
    }

    init() {
        this.resize();
        this.renderLevelList();
        this.setupEventListeners();
        // Animation Loop starten
        requestAnimationFrame(() => this.gameLoop());
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    startLevel(index) {
        this.currentLevel = JSON.parse(JSON.stringify(HYDRA_LEVELS[index]));
        // Grid initialisieren (leer)
        this.grid = Array(this.currentLevel.gridSize.rows).fill().map(() => 
            Array(this.currentLevel.gridSize.cols).fill(null)
        );
        
        document.getElementById('level-selection').classList.add('hidden');
        document.getElementById('game-controls').classList.remove('hidden');
        this.calculateFlow(); // Initialer Check
    }

    // --- DIE LOGIK-ENGINE ---

    calculateFlow() {
        // 1. Alle Flüsse zurücksetzen
        this.resetGridFlow();

        // 2. Quellen als Startpunkte nehmen
        let queue = [];
        this.currentLevel.sources.forEach(source => {
            queue.push({ x: source.x, y: source.y, color: source.color, pressure: 1 });
        });

        // 3. Flow-Propagation (Breadth-First Search)
        while (queue.length > 0) {
            let { x, y, color, pressure } = queue.shift();
            
            // Logik für Gatter prüfen
            const cell = this.grid[y] ? this.grid[y][x] : null;
            if (!cell) {
                // Hier Logik für leere Zellen oder Ziel-Check einbauen
                this.checkTarget(x, y, color, pressure);
                continue;
            }

            let nextFlow = this.processComponent(cell, color, pressure);
            if (nextFlow) {
                queue.push(...this.getNeighbors(x, y, nextFlow));
            }
        }
    }

    processComponent(cell, color, pressure) {
        switch(cell.type) {
            case 'PIPE': return { color, pressure };
            
            case 'AND_GATE':
                // Ein AND-Gatter braucht zwei Inputs
                cell.inputs = cell.inputs || [];
                cell.inputs.push({ color, pressure });
                if (cell.inputs.length >= 2) {
                    return { color: cell.inputs[0].color, pressure: 1 };
                }
                return null;

            case 'MIXER':
                // Farbmisch-Logik
                cell.bufferedColor = this.mixColors(cell.bufferedColor, color);
                return { color: cell.bufferedColor, pressure };

            default: return null;
        }
    }

    mixColors(c1, c2) {
        if (!c1) return c2;
        const mixtures = {
            'blue+yellow': 'green',
            'red+blue': 'purple',
            'red+yellow': 'orange'
        };
        return mixtures[`${c1}+${c2}`] || mixtures[`${c2}+${c1}`] || c1;
    }

    // --- RENDERING ---

    gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        if (this.currentLevel) {
            this.drawComponents();
            this.drawFlows();
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    drawGrid() {
        if (!this.currentLevel) return;
        const { cols, rows } = this.currentLevel.gridSize;
        const cellSize = this.getCellSize();

        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        for(let i = 0; i <= cols; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * cellSize, 0);
            this.ctx.lineTo(i * cellSize, rows * cellSize);
            this.ctx.stroke();
        }
        // ... (Horizontal ebenso)
    }

    getCellSize() {
        return Math.min(this.canvas.width / 10, this.canvas.height / 10);
    }

    // --- HELPER ---
    
    setupEventListeners() {
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.getCellSize());
            const y = Math.floor((e.clientY - rect.top) / this.getCellSize());
            
            this.placeComponent(x, y, 'PIPE');
        });

        document.getElementById('btn-play').onclick = () => this.calculateFlow();
    }

    placeComponent(x, y, type) {
        if (this.grid[y] && this.grid[y][x] === null) {
            this.grid[y][x] = { type, rotation: 0 };
            this.calculateFlow();
        }
    }
}

const game = new HydraGame();
