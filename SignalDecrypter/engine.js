(function () {
  function applyOperation(value, operation) {
    switch (operation.type) {
      case "reverse": return value.split("").reverse().join("");
      case "length": return String(value.length);
      case "strip": return value.replace(new RegExp(`^[${escapeClass(operation.chars)}]+|[${escapeClass(operation.chars)}]+$`, "g"), "");
      case "lstrip": return value.replace(new RegExp(`^[${escapeClass(operation.chars)}]+`, "g"), "");
      case "remove": return value.split(operation.chars).join("");
      case "swap": {
        const characters = value.split("");
        if (operation.first < 0 || operation.second < 0 || operation.first >= characters.length || operation.second >= characters.length) return value;
        [characters[operation.first], characters[operation.second]] = [characters[operation.second], characters[operation.first]];
        return characters.join("");
      }
      case "lower": return value.toLowerCase();
      case "upper": return value.toUpperCase();
      case "index": return value[operation.index < 0 ? value.length + operation.index : operation.index] ?? "";
      case "slice": return value.slice(operation.start, operation.end);
      case "slice_step": return value.split("").filter((_, index) => index % operation.step === operation.start).join("");
      case "find": return String(value.indexOf(operation.value));
      case "count": return String([...value].filter(character => character === operation.value).length);
      case "replace": return value.split(operation.from).join(operation.to);
      default: throw new Error(`Unsupported operation: ${operation.type}`);
    }
  }

  function escapeClass(value) { return String(value).replace(/[\\\-\]\[]/g, "\\$&"); }

  function execute(signal, operations) {
    return operations.reduce((value, operation) => applyOperation(value, operation), signal);
  }

  function parseCode(code) {
    const source = String(code || "").replace(/\s+/g, "");
    if (!source.startsWith("signal")) return { error: "Start with signal." };
    const operations = [];
    let rest = source.slice("signal".length);
    while (rest) {
      if (rest.startsWith("[::-1]")) { operations.push({ type: "reverse" }); rest = rest.slice("[::-1]".length); continue; }
      let match = rest.match(/^\.lower\(\)/); if (match) { operations.push({ type: "lower" }); rest = rest.slice(match[0].length); continue; }
      match = rest.match(/^\.upper\(\)/); if (match) { operations.push({ type: "upper" }); rest = rest.slice(match[0].length); continue; }
      match = rest.match(/^\.strip\(['"](#|0)['"]\)/); if (match) { operations.push({ type: "strip", chars: match[1] }); rest = rest.slice(match[0].length); continue; }
      match = rest.match(/^\.replace\("([,-])",""\)/) || rest.match(/^\.replace\('([,-])',''\)/); if (match) { operations.push({ type: "remove", chars: match[1] }); rest = rest.slice(match[0].length); continue; }
      match = rest.match(/^\.replace\(['"](\*)['"]\,['"](-)['"]\)/) || rest.match(/^\.replace\(",""\)/) || rest.match(/^\.replace\(','',''\)/); if (match) {
        if (match[1] === undefined) operations.push({ type: "remove", chars: "," });
        else operations.push({ type: "replace", from: match[1], to: match[2] });
        rest = rest.slice(match[0].length); continue;
      }
      match = rest.match(/^\.find\(['"]([A-Z])['"]\)/); if (match) { operations.push({ type: "find", value: match[1] }); rest = rest.slice(match[0].length); continue; }
      match = rest.match(/^\.count\(['"]([01])['"]\)/); if (match) { operations.push({ type: "count", value: match[1] }); rest = rest.slice(match[0].length); continue; }
      return { error: "That expression uses an operation outside this level." };
    }
    return { operations };
  }

  window.SignalDecrypterEngine = Object.freeze({ execute, parseCode });
})();
