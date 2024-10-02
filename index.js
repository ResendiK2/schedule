const fs = require("fs");
const path = require("path");
const moment = require("moment");
const glpkModule = require("glpk.js");

// Função para ler e parsear o JSON de entrada
function readInputData(filePath) {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Função para gerar o modelo GLPK
function generateGLPKModel(inputData, GLPK) {
  const { developers, rules } = inputData;
  const {
    business_hours,
    lunch_break,
    on_call_shifts,
    minimum_weekly_active_hours,
    allocation_restrictions,
  } = rules;
  const { start: business_start, end: business_end } = business_hours;

  // Definindo o modelo básico
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

  // Definindo variáveis para o custo de cada desenvolvedor
  developers.forEach((dev, i) => {
    // Variável para cada desenvolvedor e seus turnos
    const activeVar = `active_${dev.name}`;
    const onCallVar = `on_call_${dev.name}`;

    // Adiciona essas variáveis ao modelo
    model.objective.vars.push({
      name: activeVar,
      coef: dev.hourly_rate, // Custo das horas ativas
    });

    model.objective.vars.push({
      name: onCallVar,
      coef: dev.hourly_rate * rules.on_call_payment_rate, // Custo das horas de sobreaviso
    });

    // Restrições básicas de tempo ativo e sobreaviso por desenvolvedor
    model.subjectTo.push({
      name: `min_active_hours_${dev.name}`,
      vars: [{ name: activeVar, coef: 1 }],
      bnds: { type: GLPK.GLP_LO, ub: 0, lb: minimum_weekly_active_hours }, // Pelo menos 40 horas ativas
    });
  });

  // Adicionar mais restrições, como a distribuição de horários e restrições de sobreaviso
  // Ainda precisamos definir como alocar corretamente os desenvolvedores nos turnos ativos e de sobreaviso

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
      console.log("Solução:", solution);
    } else {
      console.log("Não foi possível encontrar uma solução ótima.");
      console.log(`Status da solução: ${solution.result.status}`);
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

main();
