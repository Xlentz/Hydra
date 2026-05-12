const HYDRA_LEVELS = [
    {
        "id": 1,
        "title": "Erste Schritte",
        "difficulty": "Einfach",
        "xpReward": 100,
        "gridSize": {
            "cols": 5,
            "rows": 3
        },
        "sources": [
            {
                "x": 0,
                "y": 1,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 4,
                "y": 1,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 0
            },
            {
                "x": 2,
                "y": 2
            }
        ],
        "inventory": {
            "pipes": 5,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Verbinde die Quelle mit dem Ziel."
    },
    {
        "id": 2,
        "title": "Um die Ecke",
        "difficulty": "Einfach",
        "xpReward": 150,
        "gridSize": {
            "cols": 5,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 0,
                "color": "yellow"
            }
        ],
        "targets": [
            {
                "x": 4,
                "y": 4,
                "requiredColor": "yellow"
            }
        ],
        "walls": [
            {
                "x": 1,
                "y": 0
            },
            {
                "x": 2,
                "y": 0
            },
            {
                "x": 3,
                "y": 0
            },
            {
                "x": 4,
                "y": 0
            },
            {
                "x": 0,
                "y": 4
            },
            {
                "x": 1,
                "y": 4
            },
            {
                "x": 2,
                "y": 4
            }
        ],
        "inventory": {
            "pipes": 12,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Baue einen Weg um die W\u00e4nde herum."
    },
    {
        "id": 3,
        "title": "Farbenspiel (Mischer)",
        "difficulty": "Mittel",
        "xpReward": 250,
        "gridSize": {
            "cols": 6,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 0,
                "color": "blue"
            },
            {
                "x": 0,
                "y": 4,
                "color": "yellow"
            }
        ],
        "targets": [
            {
                "x": 5,
                "y": 2,
                "requiredColor": "green"
            }
        ],
        "walls": [
            {
                "x": 3,
                "y": 0
            },
            {
                "x": 3,
                "y": 1
            },
            {
                "x": 3,
                "y": 3
            },
            {
                "x": 3,
                "y": 4
            }
        ],
        "inventory": {
            "pipes": 12,
            "andGates": 0,
            "mixers": 1
        },
        "hint": "Platziere den Mischer in der Mitte, um Gr\u00fcn zu erhalten."
    },
    {
        "id": 4,
        "title": "Getrennte Wege",
        "difficulty": "Mittel",
        "xpReward": 300,
        "gridSize": {
            "cols": 6,
            "rows": 6
        },
        "sources": [
            {
                "x": 1,
                "y": 0,
                "color": "red"
            },
            {
                "x": 4,
                "y": 0,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 1,
                "y": 5,
                "requiredColor": "red"
            },
            {
                "x": 4,
                "y": 5,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 0,
                "y": 3
            },
            {
                "x": 1,
                "y": 3
            },
            {
                "x": 4,
                "y": 2
            },
            {
                "x": 5,
                "y": 2
            },
            {
                "x": 2,
                "y": 2
            },
            {
                "x": 3,
                "y": 3
            }
        ],
        "inventory": {
            "pipes": 15,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Die Fl\u00fcsse d\u00fcrfen sich nicht vermischen."
    },
    {
        "id": 5,
        "title": "Doppeldruck (AND-Gatter)",
        "difficulty": "Schwer",
        "xpReward": 400,
        "gridSize": {
            "cols": 7,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 1,
                "color": "blue"
            },
            {
                "x": 0,
                "y": 3,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 6,
                "y": 2,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 2
            },
            {
                "x": 4,
                "y": 0
            },
            {
                "x": 4,
                "y": 1
            },
            {
                "x": 4,
                "y": 3
            },
            {
                "x": 4,
                "y": 4
            }
        ],
        "inventory": {
            "pipes": 10,
            "andGates": 1,
            "mixers": 0
        },
        "hint": "Das AND-Gatter \u00f6ffnet nur, wenn es Wasser von zwei Seiten bekommt."
    },
    {
        "id": 6,
        "title": "Lila Labyrinth",
        "difficulty": "Schwer",
        "xpReward": 450,
        "gridSize": {
            "cols": 7,
            "rows": 7
        },
        "sources": [
            {
                "x": 0,
                "y": 0,
                "color": "red"
            },
            {
                "x": 6,
                "y": 6,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 3,
                "y": 3,
                "requiredColor": "purple"
            }
        ],
        "walls": [
            {
                "x": 3,
                "y": 1
            },
            {
                "x": 3,
                "y": 2
            },
            {
                "x": 1,
                "y": 3
            },
            {
                "x": 2,
                "y": 3
            },
            {
                "x": 4,
                "y": 3
            },
            {
                "x": 5,
                "y": 3
            }
        ],
        "inventory": {
            "pipes": 16,
            "andGates": 0,
            "mixers": 1
        },
        "hint": "F\u00fchre beide Farben zum Zentrum."
    },
    {
        "id": 7,
        "title": "Engpass",
        "difficulty": "Schwer",
        "xpReward": 500,
        "gridSize": {
            "cols": 8,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 2,
                "color": "yellow"
            },
            {
                "x": 0,
                "y": 4,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 7,
                "y": 2,
                "requiredColor": "green"
            },
            {
                "x": 7,
                "y": 4,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 3,
                "y": 0
            },
            {
                "x": 3,
                "y": 1
            },
            {
                "x": 3,
                "y": 3
            },
            {
                "x": 3,
                "y": 4
            }
        ],
        "inventory": {
            "pipes": 18,
            "andGates": 1,
            "mixers": 1
        },
        "hint": "Beide Fl\u00fcsse m\u00fcssen durch die enge L\u00fccke!"
    },
    {
        "id": 8,
        "title": "Logik-Schleife",
        "difficulty": "Experte",
        "xpReward": 600,
        "gridSize": {
            "cols": 6,
            "rows": 6
        },
        "sources": [
            {
                "x": 0,
                "y": 2,
                "color": "red"
            },
            {
                "x": 0,
                "y": 5,
                "color": "yellow"
            }
        ],
        "targets": [
            {
                "x": 5,
                "y": 2,
                "requiredColor": "orange"
            },
            {
                "x": 5,
                "y": 5,
                "requiredColor": "red"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 1
            },
            {
                "x": 2,
                "y": 2
            },
            {
                "x": 2,
                "y": 4
            },
            {
                "x": 2,
                "y": 5
            }
        ],
        "inventory": {
            "pipes": 20,
            "andGates": 1,
            "mixers": 1
        },
        "hint": "Teile und herrsche."
    },
    {
        "id": 9,
        "title": "Die Kreuzung",
        "difficulty": "Experte",
        "xpReward": 700,
        "gridSize": {
            "cols": 7,
            "rows": 7
        },
        "sources": [
            {
                "x": 3,
                "y": 0,
                "color": "blue"
            },
            {
                "x": 0,
                "y": 3,
                "color": "yellow"
            }
        ],
        "targets": [
            {
                "x": 3,
                "y": 6,
                "requiredColor": "green"
            },
            {
                "x": 6,
                "y": 3,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 2
            },
            {
                "x": 4,
                "y": 2
            },
            {
                "x": 2,
                "y": 4
            },
            {
                "x": 4,
                "y": 4
            }
        ],
        "inventory": {
            "pipes": 25,
            "andGates": 2,
            "mixers": 1
        },
        "hint": "Rohre k\u00f6nnen sich \u00fcberkreuzen (4-Wege)."
    },
    {
        "id": 10,
        "title": "Meisterpr\u00fcfung",
        "difficulty": "Meister",
        "xpReward": 1000,
        "gridSize": {
            "cols": 8,
            "rows": 8
        },
        "sources": [
            {
                "x": 0,
                "y": 0,
                "color": "red"
            },
            {
                "x": 0,
                "y": 7,
                "color": "yellow"
            },
            {
                "x": 7,
                "y": 0,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 7,
                "y": 7,
                "requiredColor": "purple"
            },
            {
                "x": 4,
                "y": 4,
                "requiredColor": "orange"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 2
            },
            {
                "x": 2,
                "y": 3
            },
            {
                "x": 2,
                "y": 4
            },
            {
                "x": 5,
                "y": 5
            },
            {
                "x": 5,
                "y": 6
            },
            {
                "x": 4,
                "y": 2
            }
        ],
        "inventory": {
            "pipes": 35,
            "andGates": 3,
            "mixers": 2
        },
        "hint": "Alles was du gelernt hast."
    }
];
if (typeof module !== 'undefined') module.exports = HYDRA_LEVELS;