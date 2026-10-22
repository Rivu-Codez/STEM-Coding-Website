(function () {
  const block = (type, label, details = {}) => ({ type, label, ...details });

  const levels = [
    {
      id: 1, title: "World Capitals", mode: "blocks",
      question: "What is the capital of France?",
      signal: "S-I-R-A-P", timeLimit: 90, interferenceLimit: 3, hintCost: 8,
      operations: [block("remove", "Remove hyphens", { chars: "-" }), block("reverse", "Reverse signal"), block("lower", "Make lowercase"), block("upper", "Make uppercase")],
      hint: "Clean the separators first, then read the signal from right to left."
    },
    {
      id: 2, title: "Planet Patrol", mode: "blocks",
      question: "Which planet is the largest in our solar system?",
      signal: "XXJUPITERXX", timeLimit: 86, interferenceLimit: 3, hintCost: 8,
      operations: [block("slice", "Keep the middle word", { start: 2, end: 9 }), block("reverse", "Reverse signal"), block("remove", "Remove X", { chars: "X" }), block("lower", "Make lowercase")],
      hint: "The useful transmission begins after the first two characters and ends before the final two."
    },
    {
      id: 3, title: "Red Planet Relay", mode: "blocks",
      question: "Which planet is known as the Red Planet?",
      signal: "M#A#R#S", timeLimit: 82, interferenceLimit: 3, hintCost: 8,
      operations: [block("remove", "Remove hash marks", { chars: "#" }), block("reverse", "Reverse signal"), block("lower", "Make lowercase"), block("length", "Count characters")],
      hint: "The hash marks are noise. Remove every one without changing the letter order."
    },
    {
      id: 4, title: "Weather Station", mode: "blocks",
      question: "What is the freezing point of water in Celsius?",
      signal: "C0", timeLimit: 78, interferenceLimit: 3, hintCost: 8,
      operations: [block("swap", "Swap the two characters", { first: 0, second: 1 }), block("reverse", "Reverse signal"), block("upper", "Make uppercase"), block("length", "Count characters")],
      hint: "The temperature unit is written after the number. Exchange the two positions."
    },
    {
      id: 5, title: "Ocean Atlas", mode: "blocks",
      question: "What is the largest ocean on Earth?",
      signal: "X-PACIFIC-Y", timeLimit: 75, interferenceLimit: 3, hintCost: 8,
      operations: [block("slice", "Extract the ocean name", { start: 2, end: 9 }), block("remove", "Remove hyphens", { chars: "-" }), block("reverse", "Reverse signal"), block("lower", "Make lowercase")],
      hint: "Ignore the first two characters and the final two characters. The answer is the seven letters between them."
    },
    {
      id: 6, title: "Currency Exchange", mode: "blocks",
      question: "What is the currency of Japan?",
      signal: "N-E-Y", timeLimit: 72, interferenceLimit: 3, hintCost: 8,
      operations: [block("remove", "Remove hyphens", { chars: "-" }), block("reverse", "Reverse signal"), block("swap", "Swap first and last", { first: 0, second: 2 }), block("lower", "Make lowercase")],
      hint: "Remove the separators, then read the three-letter currency from the opposite direction."
    },
    {
      id: 7, title: "Plant Science", mode: "blocks",
      question: "Which gas do plants absorb from the air?",
      signal: "#CARBON-DIOXIDE#", timeLimit: 70, interferenceLimit: 3, hintCost: 8,
      operations: [block("strip", "Strip outer hash marks", { chars: "#" }), block("remove", "Remove the hyphen", { chars: "-" }), block("reverse", "Reverse signal"), block("lower", "Make lowercase")],
      hint: "First remove only the outside hash marks. Then join the two words."
    },
    {
      id: 8, title: "Emergency Beacon", mode: "blocks",
      question: "Which international distress signal is represented by SxOxS?",
      signal: "SxOxS", timeLimit: 68, interferenceLimit: 3, hintCost: 8,
      operations: [block("slice_step", "Read every other character", { start: 0, step: 2 }), block("remove", "Remove x", { chars: "x" }), block("reverse", "Reverse signal"), block("upper", "Make uppercase")],
      hint: "The useful letters alternate with the x characters. Start at position zero and take every second character."
    },
    {
      id: 9, title: "Literature Lock", mode: "blocks",
      question: "What is the surname of the author of Harry Potter?",
      signal: "ROWLING!", timeLimit: 65, interferenceLimit: 3, hintCost: 8,
      operations: [block("remove", "Remove the exclamation mark", { chars: "!" }), block("slice", "Keep the surname", { start: 0, end: 7 }), block("reverse", "Reverse signal"), block("lower", "Make lowercase")],
      hint: "The punctuation is not part of the surname. Remove it, then keep all seven letters."
    },
    {
      id: 10, title: "Moon Mission", mode: "blocks",
      question: "Who was the first person to walk on the Moon?",
      signal: "NEIL*ARMSTRONG", timeLimit: 62, interferenceLimit: 3, hintCost: 8,
      operations: [block("replace", "Join the two name parts", { from: "*", to: "" }), block("reverse", "Reverse signal"), block("remove", "Remove spaces", { chars: " " }), block("upper", "Make uppercase")],
      hint: "The star is a separator between the first and last name. Replace it with nothing."
    },
    {
      id: 11, title: "Outback Dispatch", mode: "python",
      question: "What is the capital city of Australia?",
      signal: "c-a-n-b-e-r-r-a", timeLimit: 60, interferenceLimit: 3, hintCost: 10,
      operations: [], pythonHint: "Remove the hyphens, then convert the result to uppercase.",
      hint: "Use a Python expression that removes '-' before calling .upper()."
    },
    {
      id: 12, title: "Precious Metal", mode: "python",
      question: "What is the chemical symbol for gold?",
      signal: "#uA#", timeLimit: 56, interferenceLimit: 3, hintCost: 10,
      operations: [], pythonHint: "Strip the outside hash marks, then reverse the remaining characters.",
      hint: "The answer is case-sensitive: use strip('#') and [::-1]."
    },
    {
      id: 13, title: "Genetic Relay", mode: "python",
      question: "What shape is commonly used to describe DNA?",
      signal: "#xileh-elbuod#", timeLimit: 52, interferenceLimit: 3, hintCost: 10,
      operations: [], pythonHint: "Remove the outside hashes, reverse the signal, then remove the hyphen.",
      hint: "Chain strip('#'), [::-1], and replace('-', '')."
    },
    {
      id: 14, title: "Light-Speed Relay", mode: "python",
      question: "What is the approximate speed of light in metres per second?",
      signal: "854,297,992", timeLimit: 48, interferenceLimit: 3, hintCost: 10,
      operations: [], pythonHint: "Remove the commas before reversing the digits.",
      hint: "Use replace(',', '') followed by [::-1]."
    },
    {
      id: 15, title: "Human Biology", mode: "python",
      question: "What is the largest organ in the human body?",
      signal: "#n-i-k-s#", timeLimit: 44, interferenceLimit: 3, hintCost: 10,
      operations: [], pythonHint: "Strip the hashes, reverse the signal, remove the hyphens, and make it lowercase.",
      hint: "This final mission needs four transformations in the correct order."
    }
  ];

  window.SignalDecrypterLevels = Object.freeze(levels.map(level => Object.freeze(level)));
})();
