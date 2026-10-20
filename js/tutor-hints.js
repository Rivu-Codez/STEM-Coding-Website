(function () {
  const hints = {
    physics: {
      wall_collision: [
        "The projectile reached the wall too low. Try increasing the launch angle.",
        "Compare the projectile height with the wall height before it reaches the wall."
      ],
      shot_missed: [
        "The landing distance did not match the target. Decide whether the shot was short or long.",
        "Change one variable at a time: angle first, then speed if it is available."
      ]
    },
    robo_maze: {
      wall_collision: [
        "The robot moved into a blocked tile. Check the path before using FORWARD.",
        "At a decision point, use the wall condition block before moving."
      ],
      program_incomplete: [
        "The program ended before reaching the goal. Trace the robot's last position.",
        "Look for a repeated route or turn that could be represented with a loop."
      ]
    }
  };
  const positions = {};

  function getPanel() {
    let panel = document.getElementById("tutorHint");
    if (panel) return panel;
    const status = document.getElementById("statusMessage");
    if (!status) return null;
    panel = document.createElement("div");
    panel.id = "tutorHint";
    panel.className = "tutor-hint";
    status.parentNode.insertBefore(panel, status.nextSibling);
    return panel;
  }

  function show(gameId, category, insight) {
    const list = hints[gameId] && hints[gameId][category];
    const panel = getPanel();
    if (!panel) return;
    panel.replaceChildren();
    if (insight) {
      const title = document.createElement("strong");
      title.textContent = "🤖 AI tutor: ";
      const hint = document.createTextNode(String(insight.hint || ""));
      const question = document.createElement("small");
      question.textContent = String(insight.next_question || "");
      panel.append(title, hint, document.createElement("br"), question);
      return;
    }
    if (!list) return;
    const key = gameId + ":" + category;
    positions[key] = positions[key] || 0;
    const index = positions[key] % list.length;
    const title = document.createElement("strong");
    title.textContent = "💡 Tutor hint: ";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Another hint";
    panel.append(title, document.createTextNode(list[index] + " "), button);
    button.onclick = () => {
      positions[key]++;
      show(gameId, category);
    };
  }

  const style = document.createElement("style");
  style.textContent = ".tutor-hint { margin-top:8px; padding:10px 12px; border-left:4px solid #fbbf24; border-radius:6px; background:rgba(251,191,36,.1); color:#fde68a; font-size:.86rem; line-height:1.4; }" +
    ".tutor-hint button { margin-left:8px; border:0; border-radius:5px; padding:4px 7px; background:#92400e; color:#fef3c7; cursor:pointer; }";
  document.head.appendChild(style);
  window.StemTutor = { show };
})();
