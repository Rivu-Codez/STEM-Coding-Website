// Generated from data/levels/submarine_math.json. Run npm run generate:levels.
window.SubmarineMathLevels = [
  {
    "id": 1,
    "section": 1,
    "title": "Target Practice",
    "startDepth": -20,
    "checkpoints": [
      -10
    ],
    "targetDepth": -10,
    "question": "Move the submarine from -20m to the target at -10m. Enter the signed move.",
    "hint": "The target is 10m higher than the submarine. Write one positive move.",
    "lessonRule": "A positive move sends the submarine closer to the surface."
  },
  {
    "id": 2,
    "section": 1,
    "title": "Two-Buoy Target Run",
    "startDepth": -40,
    "checkpoints": [
      -20
    ],
    "targetDepth": -20,
    "question": "Move the submarine from -40m to the target at -20m. How far must it move?",
    "hint": "Find the difference between -20m and -40m. This is one positive move.",
    "lessonRule": "Subtract the starting depth from the target depth to find the move."
  },
  {
    "id": 3,
    "section": 1,
    "title": "Surface Target Run",
    "startDepth": -60,
    "checkpoints": [
      -30,
      0
    ],
    "surfaceObjective": true,
    "targetDepth": 0,
    "question": "Move the submarine from -60m to the surface at 0m. It must pass the buoy at -30m.",
    "hint": "Find the move from -60m to -30m, then the move from -30m to 0m.",
    "lessonRule": "Break a long route into smaller target-to-target moves."
  },
  {
    "id": 4,
    "section": 2,
    "title": "Current Correction",
    "startDepth": -45,
    "checkpoints": [
      -15,
      -35,
      -20
    ],
    "targetDepth": -20,
    "maxMoves": 3,
    "question": "Move the submarine from -45m to the target at -20m. It must pass -15m, then -35m.",
    "hint": "Calculate each change: -45 to -15, -15 to -35, then -35 to -20.",
    "lessonRule": "A route can change direction several times before reaching its target."
  },
  {
    "id": 5,
    "section": 2,
    "title": "Deep Trench Turn",
    "startDepth": -20,
    "checkpoints": [
      -55,
      -35,
      -20
    ],
    "targetDepth": -20,
    "maxMoves": 3,
    "question": "Move the submarine from -20m back to -20m. Visit -55m and -35m first.",
    "hint": "Find the change from -20 to -55, then -55 to -35, then back to -20.",
    "lessonRule": "A negative signed move sends the submarine deeper."
  },
  {
    "id": 6,
    "section": 2,
    "title": "Four-Move Current Maze",
    "startDepth": -70,
    "checkpoints": [
      -45,
      -25,
      -40,
      -30
    ],
    "targetDepth": -30,
    "maxMoves": 4,
    "question": "Move the submarine from -70m to -30m through these targets: -45m, -25m, and -40m.",
    "hint": "Calculate the difference between each pair of depths, in order.",
    "lessonRule": "Longer routes are solved by recording every waypoint."
  },
  {
    "id": 7,
    "section": 3,
    "title": "Surface-and-Return Drill",
    "startDepth": -50,
    "checkpoints": [
      -20,
      0,
      -10
    ],
    "surfaceObjective": true,
    "targetDepth": -10,
    "question": "Move the submarine from -50m to -10m. It must touch the surface after reaching -20m.",
    "hint": "Find the changes from -50 to -20, -20 to 0, and 0 to -10.",
    "lessonRule": "Reaching 0m is allowed; any positive waypoint is an overshoot."
  },
  {
    "id": 8,
    "section": 3,
    "title": "Floodgate Recovery",
    "startDepth": -15,
    "checkpoints": [
      0,
      -25,
      -15
    ],
    "surfaceObjective": true,
    "targetDepth": -15,
    "question": "Move the submarine from -15m back to -15m. Touch 0m, then visit -25m.",
    "hint": "Calculate the change between each target depth. Never go above 0m.",
    "lessonRule": "The route may touch the surface more than once, but never cross it."
  },
  {
    "id": 9,
    "section": 3,
    "title": "Blackwater Checkpoints",
    "startDepth": -80,
    "checkpoints": [
      -45,
      -15,
      -35,
      -20
    ],
    "targetDepth": -20,
    "maxMoves": 4,
    "question": "Move the submarine from -80m to -20m. Visit -45m, -15m, and -35m in order.",
    "hint": "Work out the difference between each pair of depths.",
    "lessonRule": "Checkpoint missions reward accurate intermediate calculations."
  },
  {
    "id": 10,
    "section": 4,
    "title": "Rescue Dock Run",
    "startDepth": -55,
    "checkpoints": [
      -35,
      -20,
      -30,
      0
    ],
    "surfaceObjective": true,
    "targetDepth": 0,
    "hazards": [
      {
        "min": -18,
        "max": -12
      }
    ],
    "question": "Move the submarine from -55m to the surface dock. Visit -35m, -20m, and -30m. Avoid the hazard band.",
    "hint": "Find each signed change between the listed depths. Do not enter the marked band.",
    "lessonRule": "A rescue route must reach its checkpoint in order and end at the dock."
  },
  {
    "id": 11,
    "section": 4,
    "title": "Minefield Rescue",
    "startDepth": -90,
    "checkpoints": [
      -60,
      -35,
      -15,
      -30
    ],
    "targetDepth": -30,
    "hazards": [
      {
        "min": -55,
        "max": -45
      }
    ],
    "question": "Move the submarine from -90m to -30m. Visit -60m, -35m, and -15m. Avoid the mine band.",
    "hint": "Calculate each change. The mine band is shown in red; stay clear of it.",
    "lessonRule": "Hazards make the path matter, not just the final depth."
  },
  {
    "id": 12,
    "section": 5,
    "title": "Fuel-Efficient Patrol",
    "startDepth": -40,
    "checkpoints": [
      -20,
      -30,
      -15
    ],
    "targetDepth": -15,
    "maxDistance": 45,
    "question": "Move the submarine from -40m to -15m through -20m and -30m. Use 45m of fuel or less.",
    "hint": "Calculate each signed change, then add the absolute distances. Keep the total at or below 45m.",
    "lessonRule": "Efficiency uses absolute distance: direction does not make a move free."
  },
  {
    "id": 13,
    "section": 5,
    "title": "Long-Range Survey",
    "startDepth": -75,
    "checkpoints": [
      -50,
      -35,
      -55,
      -45
    ],
    "targetDepth": -45,
    "maxDistance": 70,
    "question": "Move the submarine from -75m to -45m through -50m, -35m, and -55m. Use 70m or less.",
    "hint": "Find every signed change, then check that the total distance is no more than 70m.",
    "lessonRule": "A route is correct only when it satisfies both destination and fuel limit."
  },
  {
    "id": 14,
    "section": 6,
    "title": "Engine Boost Calculations",
    "startDepth": -90,
    "checkpoints": [
      -66,
      -48,
      -18,
      -30
    ],
    "targetDepth": -30,
    "maxMoves": 4,
    "question": "Move the submarine from -90m to -30m through -66m, -48m, and -18m. Calculate each engine boost before entering the route.",
    "hint": "The changes are found with target minus current depth. Use multiplication or division to calculate each boost.",
    "lessonRule": "Multiplication and division produce movement distance; the sign controls direction."
  },
  {
    "id": 15,
    "section": 6,
    "title": "Final Surface Mission",
    "startDepth": -30,
    "checkpoints": [
      -54,
      -36,
      -24,
      0
    ],
    "surfaceObjective": true,
    "targetDepth": 0,
    "maxMoves": 4,
    "question": "Move the submarine from -30m to the surface. Visit -54m, -36m, and -24m, then dock at 0m.",
    "hint": "Calculate each signed change. Use the engine operations to work out the four moves.",
    "lessonRule": "The final mission combines signed movement, multiplication, division, and precise docking."
  }
];
