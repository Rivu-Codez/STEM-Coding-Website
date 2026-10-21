window.SubmarineMathLevels = [
            // SECTION 1: COMPARING (Levels 1-3)
            {
                id: 1, section: 1, title: "Greater Than with Negatives",
                isComparison: true,
                startDepth: -70, compareVal1: -30, compareVal2: -70,
                targetDepth: -30,
                question: "Compare depths: -30 [ ? ] -70",
                correctAnswer: ">",
                numericVal: -30,
                hint: "-30 is higher up (closer to 0) than -70, so -30 > -70."
            },
            {
                id: 2, section: 1, title: "Less Than with Negatives",
                isComparison: true,
                startDepth: -45, compareVal1: -80, compareVal2: -45,
                targetDepth: -80,
                question: "Compare depths: -80 [ ? ] -45",
                correctAnswer: "<",
                numericVal: -80,
                hint: "-80 is deeper down (further below zero), so -80 < -45."
            },
            {
                id: 3, section: 1, title: "Zero vs a Negative",
                isComparison: true,
                startDepth: -60, compareVal1: 0, compareVal2: -60,
                targetDepth: 0,
                question: "Compare sea level to depth -60: 0 [ ? ] -60",
                correctAnswer: ">",
                numericVal: 0,
                hint: "Zero is above any negative depth, so 0 > -60."
            },

            // SECTION 2: ADDING & SUBTRACTING (Levels 4-6)
            {
                id: 4, section: 2, kind: "pos", title: "Adding a Positive (-60 + 25)",
                startDepth: -60, targetDepth: -35,
                question: "Start at -60 and move UP by +25. Calculate: -60 + 25 =",
                correctAnswer: "-35",
                numericVal: -35,
                hint: "Adding a positive moves up toward 0. -60 + 25 = -35."
            },
            {
                id: 5, section: 2, kind: "pos", title: "Subtracting a Positive (-20 - 35)",
                startDepth: -20, targetDepth: -55,
                ghostPreview: true,
                question: "Start at -20 and dive DOWN 35. Calculate: -20 - 35 =",
                correctAnswer: "-55",
                numericVal: -55,
                hint: "Subtracting a positive moves deeper into the negatives. -20 - 35 = -55."
            },
            {
                id: 6, section: 2, kind: "pos", title: "Subtracting a Negative (-40 - (-25))",
                startDepth: -40, targetDepth: -15,
                question: "Subtracting a negative turns into addition! Calculate: -40 - (-25) =",
                correctAnswer: "-15",
                numericVal: -15,
                hint: "Two minus signs together become addition: -40 - (-25) = -40 + 25 = -15."
            },

            // SECTION 3: CROSSING ZERO (Levels 7-9)
            {
                id: 7, section: 3, kind: "pos", title: "Crossing Zero Upward (-25 + 40)",
                startDepth: -25, targetDepth: 15,
                hasHelicarrier: true,
                question: "Start at depth -25. Ascend +40 toward the helipad. Calculate: -25 + 40 =",
                correctAnswer: "15",
                numericVal: 15,
                hint: "25 units get you to zero, plus 15 more into the positives = +15."
            },
            {
                id: 8, section: 3, kind: "pos", title: "Crossing Zero Downward (30 - 55)",
                startDepth: 30, targetDepth: -25,
                hasHelicarrier: true,
                question: "Start at +30 altitude and drop down 55. Calculate: 30 - 55 =",
                correctAnswer: "-25",
                numericVal: -25,
                hint: "30 down to zero, plus 25 more into negative depths = -25."
            },
            {
                id: 9, section: 3, title: "Comparing Across Zero",
                isComparison: true,
                startDepth: -35, compareVal1: -35, compareVal2: 20,
                targetDepth: 20,
                question: "Compare sub depth (-35m) to the surface platform (+20m): -35 [ ? ] +20",
                correctAnswer: "<",
                numericVal: 20,
                hint: "Any negative value is less than any positive value!"
            },

            // SECTION 4: ABSOLUTE VALUE (Levels 10-11)
            {
                id: 10, section: 4, title: "Absolute Value |-45|",
                startDepth: 0, targetDepth: -45,
                question: "What is the distance from sea level (0) to depth -45? Calculate: |-45| =",
                correctAnswer: "45",
                numericVal: -45,
                hint: "Absolute value measures pure distance from 0 and is always positive!"
            },
            {
                id: 11, section: 4, plot: [-80, 35], labels: ['|-80| = 80', '|+35| = 35'], title: "Comparing Absolute Values",
                isComparison: true,
                startDepth: 35, compareVal1: 80, compareVal2: 35,
                targetDepth: -80,
                question: "Which location is further from zero? Compare |-80| [ ? ] |+35|",
                correctAnswer: ">",
                numericVal: -80,
                hint: "|-80| = 80 and |+35| = 35. 80 is greater than 35."
            },

            // SECTION 5: NET CHANGE VS TOTAL DISTANCE (Levels 12-13)
            {
                id: 12, section: 5, title: "Multi-Step Net Change",
                startDepth: -20, targetDepth: -60,
                question: "The sub starts at -20, then goes down 30, up 15, and down 25. What is its final depth?",
                correctAnswer: "-60",
                numericVal: -60,
                hint: "-20 - 30 + 15 - 25 = -60."
            },
            {
                id: 13, section: 5, plot: [-45, -75], labels: ['Net: 45', 'Total: 75'], title: "Net vs Total Distance",
                isComparison: true,
                startDepth: 0, compareVal1: 45, compareVal2: 75,
                targetDepth: -45,
                question: "The sub starts at 0, then goes down 40, up 15, and down 20. Compare NET distance from the start with TOTAL distance traveled: Net [ ? ] Total",
                correctAnswer: "<",
                numericVal: -45,
                hint: "Net: 0 - 40 + 15 - 20 = -45, so 45 from the start. Total: 40 + 15 + 20 = 75. 45 < 75."
            },

            // SECTION 6: MULTIPLY & DIVIDE (Levels 14-15)
            {
                id: 14, section: 6, title: "Negative × Negative = Positive!",
                startDepth: -90, targetDepth: 48,
                question: "Multiply two negative numbers: (-12) × (-4) =",
                correctAnswer: "48",
                numericVal: 48,
                hint: "Rule: NEGATIVE × NEGATIVE = POSITIVE! 12 × 4 = 48."
            },
            {
                id: 15, section: 6, title: "Negative ÷ Positive = Negative",
                startDepth: 0, targetDepth: -12,
                question: "Divide a negative by a positive: (-84) ÷ 7 =",
                correctAnswer: "-12",
                numericVal: -12,
                hint: "Rule: NEGATIVE ÷ POSITIVE = NEGATIVE! 84 ÷ 7 = 12, so the answer is -12."
            }
        ];
