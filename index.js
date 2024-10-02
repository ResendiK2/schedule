const fs = require("fs");
const path = require("path");
const glpkModule = require("glpk.js");
const { generateSchedulePDF } = require("./pdf"); // Importa a função para gerar o PDF

// Função para ler e parsear o JSON de entrada
function readInputData(filePath) {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Função para gerar o modelo GLPK
function generateGLPKModel(inputData, GLPK) {
  const { developers } = inputData;

  const model = {
    name: "Developer Scheduling",
    objective: {
      direction: GLPK.GLP_MIN,
      name: "total_cost",
      vars: [],
    },
    subjectTo: [],
    bounds: [],
    generals: [],
  };

  developers.forEach((dev, i) => {
    const activeVar = `active_${dev.name}`;
    const onCallVar = `on_call_${dev.name}`;
    const onCallActiveVar = `on_call_active_${dev.name}`;

    model.objective.vars.push(
      { name: activeVar, coef: dev.hourly_rate },
      { name: onCallVar, coef: dev.hourly_rate * 0.5 },
      { name: onCallActiveVar, coef: dev.hourly_rate * 1.5 }
    );

    model.bounds.push(
      { name: activeVar, type: GLPK.GLP_DB, ub: 52, lb: 40 },
      { name: onCallVar, type: GLPK.GLP_LO, lb: 0 },
      { name: onCallActiveVar, type: GLPK.GLP_LO, lb: 0 }
    );

    model.subjectTo.push({
      name: `min_active_hours_${dev.name}`,
      vars: [{ name: activeVar, coef: 1 }],
      bnds: { type: GLPK.GLP_LO, ub: 0, lb: 40 },
    });

    if (dev.level === "junior") {
      model.bounds.push({ name: onCallVar, type: GLPK.GLP_FX, lb: 0, ub: 0 });
      model.bounds.push({
        name: onCallActiveVar,
        type: GLPK.GLP_FX,
        lb: 0,
        ub: 0,
      });
    }
  });

  model.subjectTo.push({
    name: "coverage_requirement",
    vars: developers.map((dev) => ({ name: `active_${dev.name}`, coef: 1 })),
    bnds: { type: GLPK.GLP_LO, lb: 168 },
  });

  model.subjectTo.push({
    name: "daily_support_requirement",
    vars: [
      ...developers
        .filter((dev) => dev.level === "pleno")
        .map((dev) => ({ name: `active_${dev.name}`, coef: 1 })),
      ...developers
        .filter((dev) => dev.level === "senior")
        .map((dev) => ({ name: `active_${dev.name}`, coef: 2 })),
    ],
    bnds: { type: GLPK.GLP_LO, lb: 2 },
  });

  developers
    .filter((dev) => dev.level !== "junior")
    .forEach((dev) => {
      model.subjectTo.push({
        name: `weekend_on_call_${dev.name}`,
        vars: [{ name: `on_call_${dev.name}`, coef: 1 }],
        bnds: { type: GLPK.GLP_LO, lb: 24 },
      });
    });

  return model;
}

// Função para resolver o modelo GLPK
async function solveGLPKModel(model, GLPK) {
  try {
    return GLPK.solve(model, GLPK.GLP_MSG_OFF);
  } catch (error) {
    console.error("Erro ao resolver o modelo GLPK:", error);
    throw error;
  }
}

// Função principal
async function main() {
  try {
    const inputFilePath = path.join(__dirname, "data.json");
    const inputData = readInputData(inputFilePath);

    const GLPK = await glpkModule();

    const model = generateGLPKModel(inputData, GLPK);

    console.log("Modelo GLPK gerado.");

    const solution = await solveGLPKModel(model, GLPK);

    if (solution.result.status === GLPK.GLP_OPT) {
      console.log("Solução ótima encontrada.");
      console.log("Custo total:", solution);
    } else {
      console.log("Não foi possível encontrar uma solução ótima.");
      console.log(`Status da solução: ${solution.result.status}`);
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

main();
