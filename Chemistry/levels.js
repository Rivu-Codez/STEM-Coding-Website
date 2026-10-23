(function () {
  const targets = [
    ["Water", "H2O", "Combine two hydrogen atoms with one oxygen atom."],
    ["Carbon dioxide", "CO2", "Combine one carbon atom with two oxygen atoms."],
    ["Table salt", "NaCl", "Combine one sodium atom with one chlorine atom."],
    ["Methane", "CH4", "Combine one carbon atom with four hydrogen atoms."],
    ["Ammonia", "NH3", "Combine one nitrogen atom with three hydrogen atoms."],
    ["Oxygen gas", "O2", "Join two oxygen atoms."],
    ["Hydrogen chloride", "HCl", "Combine one hydrogen atom with one chlorine atom."],
    ["Glucose", "C6H12O6", "Build glucose from six carbon, twelve hydrogen, and six oxygen atoms."],
    ["Hydrogen peroxide", "H2O2", "Combine two hydrogen atoms with two oxygen atoms."],
    ["Iron oxide", "Fe2O3", "Build iron(III) oxide from two iron and three oxygen atoms."],
    ["Hydrogen and oxygen", "H2O", "Python Lab: use lab.mix('H2O', 1) to synthesize water."],
    ["Carbon and oxygen", "CO2", "Python Lab: use lab.mix('CO2', 1) to synthesize carbon dioxide."],
    ["Sodium and chlorine", "NaCl", "Python Lab: use lab.mix('NaCl', 1) to synthesize table salt."],
    ["Carbon and hydrogen", "CH4", "Python Lab: use lab.mix('CH4', 1) to synthesize methane."],
    ["Final synthesis: glucose", "C6H12O6", "Python Lab: synthesize glucose and verify it with lab.count()."],
  ];
  window.ChemistryLevels = targets.map(([name, formula, instruction], index) => ({
    id: index + 1,
    title: `Level ${index + 1}: ${name}`,
    compound: name,
    formula,
    instruction,
    mode: index < 10 ? "blocks" : "python",
    atoms: [...new Set(formula.match(/[A-Z][a-z]?/g) || [])]
  }));
})();
