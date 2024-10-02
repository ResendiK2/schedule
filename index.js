const fs = require("fs");
const glpk = require("glpk.js");

// Função para carregar o arquivo JSON
function carregarDados(arquivoJson) {
  const dados = fs.readFileSync(arquivoJson);
  return JSON.parse(dados);
}

// Função para construir o modelo de otimização
function construirModelo(dados) {
  const lp = new glpk.LinearProgram();
  const devs = dados.desenvolvedores;
  const regras = dados.regras;

  const diasUteis = dados.dias_uteis;

  const variaveis = {};

  // Definindo as variáveis de decisão
  devs.forEach((dev) => {
    for (let dia = 0; dia < diasUteis; dia++) {
      // Definindo variáveis para as horas comerciais
      if (
        dev.nivel === "junior" ||
        dev.nivel === "pleno" ||
        dev.nivel === "senior"
      ) {
        variaveis[`horario_comercial_${dia}_${dev.nome}`] = lp.addVariable({
          name: `horario_comercial_${dia}_${dev.nome}`,
          cost: dev.custo_hora,
          type: glpk.VariableType.Binary,
        });
      }

      // Definindo variáveis para as horas de sobreaviso
      if (dev.nivel === "pleno" || dev.nivel === "senior") {
        variaveis[`sobreaviso_${dia}_${dev.nome}`] = lp.addVariable({
          name: `sobreaviso_${dia}_${dev.nome}`,
          cost: dev.custo_hora * regras.pagamento_sobreaviso,
          type: glpk.VariableType.Binary,
        });
      }
    }
  });

  // Adicionando restrições de carga horária mínima
  devs.forEach((dev) => {
    const restricaoMinHoras = [];
    for (let dia = 0; dia < diasUteis; dia++) {
      if (variaveis[`horario_comercial_${dia}_${dev.nome}`]) {
        restricaoMinHoras.push({
          variable: variaveis[`horario_comercial_${dia}_${dev.nome}`],
          coefficient: 1,
        });
      }
    }
    lp.addConstraint({
      name: `min_horas_${dev.nome}`,
      terms: restricaoMinHoras,
      rhs: regras.horas_minimas_semanais,
      operator: glpk.ConstraintType.GreaterThan,
    });
  });

  // Adicionando restrições de sobreaviso
  for (let dia = 0; dia < diasUteis; dia++) {
    const restricaoSobreaviso = [];
    devs.forEach((dev) => {
      if (variaveis[`sobreaviso_${dia}_${dev.nome}`]) {
        restricaoSobreaviso.push({
          variable: variaveis[`sobreaviso_${dia}_${dev.nome}`],
          coefficient: 1,
        });
      }
    });
    lp.addConstraint({
      name: `restricao_sobreaviso_dia_${dia}`,
      terms: restricaoSobreaviso,
      rhs: 1,
      operator: glpk.ConstraintType.Equal,
    });
  }

  // Resolver o modelo
  const resultado = lp.solve();
  return resultado;
}

// Função principal para executar o processo
function main() {
  const dados = carregarDados("data.json");
  const resultado = construirModelo(dados);

  // Processar o resultado para gerar o PDF
  const escalas = {}; // Preencher com a lógica de escalas
  const resumoSemanal = {}; // Preencher com resumo de horas

  gerarPDF(escalas, resumoSemanal);
}

main();
