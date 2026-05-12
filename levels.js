const HYDRA_LEVELS = [
    {
        id: 1,
        title: "Erster Fluss",
        difficulty: "Einfach",
        xpReward: 100,
        gridSize: { cols: 5, rows: 5 },
        // Startpunkte des Wassers
        sources: [
            { x: 0, y: 2, color: "blue", flowRate: 1 }
        ],
        // Zielbedingungen
        targets: [
            { x: 4, y: 2, requiredColor: "blue", requiredAmount: 1 }
        ],
        // Verfügbare Bauteile für den Spieler
        inventory: {
            pipes: 10,
            andGates: 0,
            orGates: 0
        },
        hint: "Verbinde die Quelle mit dem Zielbecken."
    },
    {
        id: 2,
        title: "Logische Mischung",
        difficulty: "Mittel",
        xpReward: 250,
        gridSize: { cols: 6, rows: 6 },
        sources: [
            { x: 0, y: 1, color: "blue", flowRate: 1 },
            { x: 0, y: 4, color: "yellow", flowRate: 1 }
        ],
        targets: [
            { x: 5, y: 3, requiredColor: "green", requiredAmount: 2 }
        ],
        inventory: {
            pipes: 15,
            andGates: 1,
            mixers: 1
        },
        hint: "Blau und Gelb ergeben Grün. Nutze das AND-Gatter für exakten Druck."
    }
];

// Export für app.js
if (typeof module !== 'undefined') module.exports = HYDRA_LEVELS;
