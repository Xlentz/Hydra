const HYDRA_LEVELS = [
    {
        "id": 1,
        "title": "Geradeaus & Abbiegen",
        "difficulty": "Einfach",
        "xpReward": 100,
        "gridSize": {
            "cols": 4,
            "rows": 4
        },
        "sources": [
            {
                "x": 0,
                "y": 0,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 3,
                "y": 3,
                "requiredColor": "blue"
            }
        ],
        "walls": [],
        "inventory": {
            "pipes_straight": 4,
            "pipes_angle": 2,
            "pipes_cross": 0,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Klicke auf platzierte Rohre, um sie zu drehen."
    },
    {
        "id": 2,
        "title": "Die Mauer",
        "difficulty": "Einfach",
        "xpReward": 150,
        "gridSize": {
            "cols": 5,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 2,
                "color": "yellow"
            }
        ],
        "targets": [
            {
                "x": 4,
                "y": 2,
                "requiredColor": "yellow"
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
                "y": 3
            }
        ],
        "inventory": {
            "pipes_straight": 4,
            "pipes_angle": 4,
            "pipes_cross": 0,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Umschiffe das Hindernis mit Winkel-Rohren."
    },
    {
        "id": 3,
        "title": "Farbenspiel",
        "difficulty": "Mittel",
        "xpReward": 250,
        "gridSize": {
            "cols": 5,
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
                "x": 4,
                "y": 2,
                "requiredColor": "green"
            }
        ],
        "walls": [
            {
                "x": 2,
                "y": 0
            },
            {
                "x": 2,
                "y": 4
            }
        ],
        "inventory": {
            "pipes_straight": 4,
            "pipes_angle": 4,
            "pipes_cross": 0,
            "andGates": 0,
            "mixers": 1
        },
        "hint": "F\u00fchre beide Farben in den Mixer."
    },
    {
        "id": 4,
        "title": "Getrennte Wege",
        "difficulty": "Mittel",
        "xpReward": 350,
        "gridSize": {
            "cols": 5,
            "rows": 5
        },
        "sources": [
            {
                "x": 0,
                "y": 1,
                "color": "red"
            },
            {
                "x": 0,
                "y": 3,
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 4,
                "y": 3,
                "requiredColor": "red"
            },
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
                "y": 4
            },
            {
                "x": 1,
                "y": 2
            },
            {
                "x": 3,
                "y": 2
            }
        ],
        "inventory": {
            "pipes_straight": 6,
            "pipes_angle": 4,
            "pipes_cross": 1,
            "andGates": 0,
            "mixers": 0
        },
        "hint": "Nutze das Kreuz-Rohr, um die Fl\u00fcsse \u00fcbereinander zu leiten, ohne sie zu mischen."
    },
    {
        "id": 5,
        "title": "Doppelte Bedingung",
        "difficulty": "Schwer",
        "xpReward": 400,
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
                "color": "blue"
            }
        ],
        "targets": [
            {
                "x": 5,
                "y": 2,
                "requiredColor": "blue"
            }
        ],
        "walls": [
            {
                "x": 3,
                "y": 1
            },
            {
                "x": 3,
                "y": 3
            }
        ],
        "inventory": {
            "pipes_straight": 4,
            "pipes_angle": 4,
            "pipes_cross": 0,
            "andGates": 1,
            "mixers": 0
        },
        "hint": "Das AND-Gatter \u00f6ffnet nur, wenn es aus zwei verschiedenen Richtungen Wasser bekommt."
    }
];
if (typeof module !== 'undefined') module.exports = HYDRA_LEVELS;