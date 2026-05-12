const HYDRA_LEVELS = [
    {
        "id": 1, "title": "Geradeaus & Abbiegen", "difficulty": "Einfach", "xpReward": 100,
        "gridSize": {"cols": 4, "rows": 4},
        "sources": [{"x": 0, "y": 0, "color": "blue"}],
        "targets": [{"x": 3, "y": 3, "requiredColor": "blue"}],
        "walls": [],
        "inventory": {"pipes_straight": 4, "pipes_angle": 3, "pipes_cross": 0, "andGates": 0, "mixers": 0},
        "hint": "Klicke auf platzierte Rohre, um sie zu drehen.",
        "solution": [
            {"x":1,"y":0, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":2,"y":0, "type":"PIPE_ANGLE", "rotation":2},
            {"x":2,"y":1, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":2,"y":2, "type":"PIPE_ANGLE", "rotation":0},
            {"x":3,"y":2, "type":"PIPE_ANGLE", "rotation":1}
        ]
    },
    {
        "id": 2, "title": "Die Mauer", "difficulty": "Einfach", "xpReward": 150,
        "gridSize": {"cols": 5, "rows": 5},
        "sources": [{"x": 0, "y": 2, "color": "yellow"}],
        "targets": [{"x": 4, "y": 2, "requiredColor": "yellow"}],
        "walls": [{"x": 2, "y": 1}, {"x": 2, "y": 2}, {"x": 2, "y": 3}],
        "inventory": {"pipes_straight": 4, "pipes_angle": 4, "pipes_cross": 0, "andGates": 0, "mixers": 0},
        "hint": "Umschiffe das Hindernis mit Winkel-Rohren.",
        "solution": [
            {"x":1,"y":2, "type":"PIPE_ANGLE", "rotation":0},
            {"x":1,"y":1, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":1,"y":0, "type":"PIPE_ANGLE", "rotation":1},
            {"x":2,"y":0, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":3,"y":0, "type":"PIPE_ANGLE", "rotation":2},
            {"x":3,"y":1, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":3,"y":2, "type":"PIPE_ANGLE", "rotation":3}
        ]
    },
    {
        "id": 3, "title": "Farbenspiel", "difficulty": "Mittel", "xpReward": 250,
        "gridSize": {"cols": 5, "rows": 5},
        "sources": [{"x": 0, "y": 0, "color": "blue"}, {"x": 0, "y": 4, "color": "yellow"}],
        "targets": [{"x": 4, "y": 2, "requiredColor": "green"}],
        "walls": [{"x": 2, "y": 0}, {"x": 2, "y": 4}],
        "inventory": {"pipes_straight": 4, "pipes_angle": 6, "pipes_cross": 0, "andGates": 0, "mixers": 1},
        "hint": "Führe beide Farben in den Mixer.",
        "solution": [
            {"x":1,"y":0, "type":"PIPE_ANGLE", "rotation":2},
            {"x":1,"y":1, "type":"PIPE_ANGLE", "rotation":0},
            {"x":2,"y":1, "type":"PIPE_ANGLE", "rotation":2},
            {"x":1,"y":4, "type":"PIPE_ANGLE", "rotation":3},
            {"x":1,"y":3, "type":"PIPE_ANGLE", "rotation":1},
            {"x":2,"y":3, "type":"PIPE_ANGLE", "rotation":3},
            {"x":2,"y":2, "type":"MIXER", "rotation":0},
            {"x":3,"y":2, "type":"PIPE_STRAIGHT", "rotation":1}
        ]
    },
    {
        "id": 4, "title": "Die Kreuzung", "difficulty": "Mittel", "xpReward": 350,
        "gridSize": {"cols": 5, "rows": 5},
        "sources": [{"x": 2, "y": 0, "color": "red"}, {"x": 0, "y": 2, "color": "blue"}],
        "targets": [{"x": 2, "y": 4, "requiredColor": "red"}, {"x": 4, "y": 2, "requiredColor": "blue"}],
        "walls": [{"x": 1, "y": 1}, {"x": 3, "y": 1}, {"x": 1, "y": 3}, {"x": 3, "y": 3}],
        "inventory": {"pipes_straight": 4, "pipes_angle": 0, "pipes_cross": 1, "andGates": 0, "mixers": 0},
        "hint": "Nutze das Kreuz-Rohr im Zentrum, um die Flüsse übereinander zu leiten, ohne sie zu mischen.",
        "solution": [
            {"x":2,"y":1, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":2,"y":3, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":1,"y":2, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":3,"y":2, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":2,"y":2, "type":"PIPE_CROSS", "rotation":0}
        ]
    },
    {
        "id": 5, "title": "Doppelte Bedingung", "difficulty": "Schwer", "xpReward": 400,
        "gridSize": {"cols": 6, "rows": 5},
        "sources": [{"x": 0, "y": 0, "color": "blue"}, {"x": 0, "y": 4, "color": "blue"}],
        "targets": [{"x": 5, "y": 2, "requiredColor": "blue"}],
        "walls": [{"x": 3, "y": 1}, {"x": 3, "y": 3}],
        "inventory": {"pipes_straight": 10, "pipes_angle": 4, "pipes_cross": 0, "andGates": 1, "mixers": 0},
        "hint": "Das AND-Gatter öffnet nur, wenn es aus zwei verschiedenen Richtungen Wasser bekommt.",
        "solution": [
            {"x":1,"y":0, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":2,"y":0, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":3,"y":0, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":4,"y":0, "type":"PIPE_ANGLE", "rotation":2},
            {"x":4,"y":1, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":1,"y":4, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":2,"y":4, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":3,"y":4, "type":"PIPE_STRAIGHT", "rotation":1},
            {"x":4,"y":4, "type":"PIPE_ANGLE", "rotation":3},
            {"x":4,"y":3, "type":"PIPE_STRAIGHT", "rotation":0},
            {"x":4,"y":2, "type":"AND_GATE", "rotation":0}
        ]
    }
];
if (typeof module !== 'undefined') module.exports = HYDRA_LEVELS;
