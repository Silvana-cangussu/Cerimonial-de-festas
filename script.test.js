/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");

/* ---------- Preparação: carrega o HTML e o script.js em cada teste ---------- */
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf-8");
const corpo = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, "");

let form;

function carregarPagina() {
  document.body.innerHTML = corpo;
  jest.isolateModules(() => require("./script"));
  form = document.getElementById("formulario");
}

const $ = (id) => document.getElementById(id);
const erro = (campo) => $("erro-" + campo).textContent;
const linhasLista = () => $("lista").rows.length;

function digitar(id, valor) {
  const el = $(id);
  el.value = valor;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function escolherTurno(valor) {
  form.querySelector(`input[name="turno"][value="${valor}"]`).checked = true;
}

function preencherExperiencia(linha, dados) {
  const tr = document.querySelector("#tabela-exp tbody").rows[linha];
  Object.entries(dados).forEach(([campo, valor]) => {
    tr.querySelector(`[data-c="${campo}"]`).value = valor;
  });
}

function limparExperiencias() {
  document.querySelectorAll("#tabela-exp tbody input").forEach((i) => (i.value = ""));
}

function marcarDisponibilidade(valor) {
  form.querySelector(`input[name="disp"][value="${valor}"]`).checked = true;
}

function preencherFormularioValido(troca = {}) {
  const d = {
    nome: "Maria da Silva",
    endereco: "Rua das Flores, 120",
    email: "maria@silparty.com",
    telefone: "32999998888",
    salario: "350000",
    ...troca,
  };
  ["nome", "endereco", "email", "telefone", "salario"].forEach((c) => digitar(c, d[c]));
  $("cargo").value = "Cerimonialista";
  escolherTurno("Tarde");
  preencherExperiencia(0, { empresa: "Buffet Alegria", funcao: "Garçonete", periodo: "2021 a 2023" });
  marcarDisponibilidade("Sábado|Noite");
}

function enviar() {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

beforeEach(() => {
  localStorage.clear();
  carregarPagina();
});

/* ---------- 1. Cadastro com sucesso ---------- */
describe("1. Cadastro com sucesso", () => {
  test("salva o funcionário, mostra a mensagem e limpa o formulário", () => {
    preencherFormularioValido();
    enviar();

    expect($("mensagem").textContent).toBe("Funcionário cadastrado com sucesso");
    expect($("nome").value).toBe("");
    expect(linhasLista()).toBe(1);
    expect($("contador").textContent).toContain("1 cadastrado");
  });
});

/* ---------- 2. Campos obrigatórios vazios ---------- */
describe("2. Campos obrigatórios", () => {
  test.each([
    ["nome", "O campo Nome é obrigatório"],
    ["endereco", "O campo Endereço é obrigatório"],
    ["email", "O campo E-mail é obrigatório"],
    ["telefone", "O campo Telefone é obrigatório"],
    ["salario", "O campo Salário é obrigatório"],
  ])("campo %s vazio impede o envio", (campo, mensagem) => {
    preencherFormularioValido({ [campo]: "" });
    enviar();

    expect(erro(campo)).toBe(mensagem);
    expect(linhasLista()).toBe(0);
  });

  test("cargo não selecionado impede o envio", () => {
    preencherFormularioValido();
    $("cargo").value = "";
    enviar();

    expect(erro("cargo")).toBe("Selecione um cargo");
    expect(linhasLista()).toBe(0);
  });
});

/* ---------- 3. Formato inválido (e-mail e telefone) ---------- */
describe("3. Formato de e-mail e telefone", () => {
  test("e-mail sem @ é rejeitado", () => {
    preencherFormularioValido({ email: "joao.silva" });
    enviar();

    expect(erro("email")).toBe("E-mail inválido. Use o formato nome@dominio.com");
    expect(linhasLista()).toBe(0);
  });

  test("telefone sem DDD completo é rejeitado", () => {
    preencherFormularioValido({ telefone: "3299" });
    enviar();

    expect(erro("telefone")).toBe("Telefone inválido. Inclua o DDD");
    expect(linhasLista()).toBe(0);
  });
});

/* ---------- 4. Turno (radio button) ---------- */
describe("4. Seleção de turno", () => {
  test("permite escolher apenas um turno por vez", () => {
    escolherTurno("Manhã");
    escolherTurno("Noite");

    const marcados = form.querySelectorAll('input[name="turno"]:checked');
    expect(marcados).toHaveLength(1);
    expect(marcados[0].value).toBe("Noite");
  });

  test("turno não selecionado impede o envio", () => {
    preencherFormularioValido();
    form.querySelector('input[name="turno"]:checked').checked = false;
    enviar();

    expect(erro("turno")).toBe("Selecione um turno");
    expect(linhasLista()).toBe(0);
  });
});

/* ---------- 5. Valores de salário ---------- */
describe("5. Validação de salário", () => {
  test.each([
    ["negativo", "-1500"],
    ["zero", "0"],
  ])("salário %s é bloqueado", (_tipo, valor) => {
    preencherFormularioValido({ salario: valor });
    enviar();

    expect(erro("salario")).toBe("O salário deve ser maior que zero");
    expect(linhasLista()).toBe(0);
  });
});

/* ---------- 6. Máscaras de moeda e telefone ---------- */
describe("6. Máscaras de formatação", () => {
  test("salário é formatado em reais", () => {
    digitar("salario", "350000");
    expect($("salario").value.replace(/\s/g, " ")).toBe("R$ 3.500,00");
  });

  test("telefone recebe DDD e hífen", () => {
    digitar("telefone", "32999998888");
    expect($("telefone").value).toBe("(32) 99999-8888");
  });
});

/* ---------- 7. Tabela de experiências anteriores ---------- */
describe("7. Tabela de experiências", () => {
  const linhasExp = () => document.querySelectorAll("#tabela-exp tbody tr").length;

  test("adicionar e remover linhas", () => {
    expect(linhasExp()).toBe(2);

    $("add-exp").click();
    expect(linhasExp()).toBe(3);

    document.querySelector("#tabela-exp .remover").click();
    expect(linhasExp()).toBe(2);
  });

  test("linha só com a empresa é rejeitada", () => {
    preencherFormularioValido();
    limparExperiencias();
    preencherExperiencia(0, { empresa: "Buffet Alegria" });
    enviar();

    expect(erro("experiencias")).toBe(
      "Preencha empresa e função em todas as linhas, ou remova as linhas incompletas"
    );
    expect(linhasLista()).toBe(0);
  });

  test("sem experiência e sem marcar primeiro emprego é rejeitado", () => {
    preencherFormularioValido();
    limparExperiencias();
    enviar();

    expect(erro("experiencias")).toBe("Informe ao menos uma experiência ou marque Primeiro emprego");
  });

  test("primeiro emprego dispensa a tabela", () => {
    preencherFormularioValido();
    limparExperiencias();
    $("primeiro-emprego").checked = true;
    $("primeiro-emprego").dispatchEvent(new Event("change", { bubbles: true }));
    enviar();

    expect($("mensagem").textContent).toBe("Funcionário cadastrado com sucesso");
    expect($("lista").textContent).toContain("Primeiro emprego");
  });
});

/* ---------- 8. Disponibilidade, lista e armazenamento ---------- */
describe("8. Disponibilidade, lista e armazenamento", () => {
  test("disponibilidade em branco impede o envio", () => {
    preencherFormularioValido();
    form.querySelector('input[name="disp"]:checked').checked = false;
    enviar();

    expect(erro("disponibilidade")).toBe("Marque ao menos um dia e turno de disponibilidade");
    expect(linhasLista()).toBe(0);
  });

  test("cadastro fica salvo no localStorage", () => {
    preencherFormularioValido();
    enviar();

    const salvos = JSON.parse(localStorage.getItem("srh-funcionarios-v2"));
    expect(salvos).toHaveLength(1);
    expect(salvos[0].nome).toBe("Maria da Silva");
    expect(salvos[0].salario).toBe(3500);
  });

  test("excluir remove o funcionário da lista e do armazenamento", () => {
    preencherFormularioValido();
    enviar();
    $("lista").querySelector(".remover").click();

    expect(linhasLista()).toBe(0);
    expect(JSON.parse(localStorage.getItem("srh-funcionarios-v2"))).toHaveLength(0);
  });

  test("cadastra 4 funcionários e o contador acompanha", () => {
    for (let i = 1; i <= 4; i++) {
      preencherFormularioValido({ nome: `Funcionário ${i}` });
      enviar();
    }

    expect(linhasLista()).toBe(4);
    expect($("contador").textContent).toContain("4 cadastrados");
  });
});
