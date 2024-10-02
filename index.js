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
  /* 
  inputData = {
    "month": "10/2024",
    "developers": [
      { "name": "Guilherme Kun", "level": "senior", "hourly_rate": 200 },
      { "name": "Carlos", "level": "senior", "hourly_rate": 200 },
      { "name": "João Brasil", "level": "pleno", "hourly_rate": 100 },
      { "name": "Guilherme Carmo", "level": "pleno", "hourly_rate": 100 },
      { "name": "Juliana", "level": "pleno", "hourly_rate": 100 },
      { "name": "Larissa", "level": "junior", "hourly_rate": 50 },
      { "name": "Miguel", "level": "junior", "hourly_rate": 50 },
      { "name": "Gabriel Resende", "level": "junior", "hourly_rate": 50 },
      { "name": "Mário", "level": "junior", "hourly_rate": 50 }
    ],
    "rules": {
      "business_hours": {
        "start": "08:00",
        "end": "17:00",
        "min_support_requirement": {
          "senior": 1,
          "pleno": 2,
          "junior": "all"
        }
      },
      "on_call_shifts": [
        {
          "day_start": "domingo",
          "start": "17:00",
          "end": "08:00",
          "day_end": "segunda",
          "senior_only": true,
          "activity_hours_default": 1
        },
        {
          "day_start": "segunda",
          "start": "17:00",
          "end": "08:00",
          "day_end": "terça",
          "senior_only": false,
          "activity_hours_default": 0
        },
        {
          "day_start": "terça",
          "start": "17:00",
          "end": "08:00",
          "day_end": "quarta",
          "senior_only": false,
          "activity_hours_default": 0
        },
        {
          "day_start": "quarta",
          "start": "17:00",
          "end": "08:00",
          "day_end": "quinta",
          "senior_only": true,
          "activity_hours_default": 1
        },
        {
          "day_start": "quinta",
          "start": "17:00",
          "end": "08:00",
          "day_end": "sexta",
          "senior_only": false,
          "activity_hours_default": 0
        },
        {
          "day_start": "sexta",
          "start": "17:00",
          "end": "17:00",
          "day_end": "sábado",
          "senior_only": false,
          "activity_hours_default": 0
        },
        {
          "day_start": "sábado",
          "start": "17:00",
          "end": "17:00",
          "day_end": "domingo",
          "senior_only": false,
          "activity_hours_default": 0
        }
      ],
      "minimum_weekly_active_hours": 40,
      "overtime_payment_rate": 1.5,
      "on_call_payment_rate": 0.5,
      "allocation_restrictions": {
        "commercial_hours_only": ["junior"],
        "max_weekly_on_call_shifts": 2,
        "min_weekly_rest_days": 1
      },
      "maximum_weekly_hours": 52,
      "min_rest_period_after_active_hours": 12
    }
  }
  */

  const { developers, rules } = inputData;
  const {
    business_hours,
    on_call_shifts,
    minimum_weekly_active_hours,
    maximum_weekly_hours,
    allocation_restrictions,
    on_call_payment_rate,
    overtime_payment_rate,
  } = rules;

  const weeksInMonth = 4; // Considerando um mês com 4 semanas (pode ser ajustado para 5 se necessário)
  const minimum_monthly_active_hours =
    minimum_weekly_active_hours * weeksInMonth;
  const maximum_monthly_hours = maximum_weekly_hours * weeksInMonth;

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
  developers.forEach((dev) => {
    // Variáveis para horas ativas e sobreaviso de cada desenvolvedor
    const activeVar = `active_${dev.name}`;
    const onCallVar = `on_call_${dev.name}`;

    // Adiciona essas variáveis ao modelo
    model.objective.vars.push({
      name: activeVar,
      coef: dev.hourly_rate, // Custo das horas ativas
    });

    model.objective.vars.push({
      name: onCallVar,
      coef: dev.hourly_rate * on_call_payment_rate, // Custo das horas de sobreaviso
    });

    // Restrições de horas ativas mínimas (mensais)
    model.subjectTo.push({
      name: `min_active_hours_${dev.name}`,
      vars: [{ name: activeVar, coef: 1 }],
      bnds: { type: GLPK.GLP_LO, ub: 0, lb: minimum_monthly_active_hours }, // Pelo menos 160 horas ativas (4 semanas * 40 horas)
    });

    // Restrições de horas ativas máximas (mensais)
    model.subjectTo.push({
      name: `max_active_hours_${dev.name}`,
      vars: [{ name: activeVar, coef: 1 }],
      bnds: { type: GLPK.GLP_UP, lb: 0, ub: maximum_monthly_hours }, // No máximo 208 horas (52 * 4 semanas)
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
