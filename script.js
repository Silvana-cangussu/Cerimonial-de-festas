const CARGOS = ["Cerimonialista", "Garçom / Garçonete", "Decorador(a)", "Cozinheiro(a) de Buffet", "Recepcionista"];
const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const TURNOS = ["Manhã", "Tarde", "Noite"];
const CHAVE = "srh-funcionarios-v2";
const CAMPOS = ["nome", "endereco", "email", "telefone", "cargo", "salario", "turno", "experiencias", "disponibilidade"];

const form = document.getElementById("formulario");
const mensagem = document.getElementById("mensagem");
const lista = document.getElementById("lista");
const vazio = document.getElementById("vazio");
const contador = document.getElementById("contador");
const corpoExp = document.querySelector("#tabela-exp tbody");
const corpoDisp = document.querySelector("#tabela-disp tbody");
const primeiroEmprego = document.getElementById("primeiro-emprego");

let funcionarios = [];
try { funcionarios = JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { funcionarios = []; }

/* ---------- Cargos ---------- */
document.getElementById("cargo").innerHTML =
  '<option value="">Selecione um cargo</option>' + CARGOS.map((c) => `<option value="${c}">${c}</option>`).join("");

/* ---------- Moeda ---------- */
const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function lerMoeda(input) {
  const negativo = input.value.includes("-");
  const centavos = Number(input.value.replace(/\D/g, "")) || 0;
  return (negativo ? -1 : 1) * (centavos / 100);
}

form.addEventListener("input", (e) => {
  const input = e.target;
  if (!input.classList.contains("moeda")) return;
  const negativo = input.value.includes("-");
  const digitos = input.value.replace(/\D/g, "");
  if (!digitos) { input.value = negativo ? "-" : ""; return; }
  const texto = formatoMoeda.format(Number(digitos) / 100);
  input.value = negativo ? "-" + texto : texto;
});

/* ---------- Telefone ---------- */
document.getElementById("telefone").addEventListener("input", (e) => {
  let d = e.target.value.replace(/\D/g, "").slice(0, 11);
  if (d.length > 6) {
    const meio = d.length > 10 ? 7 : 6;
    d = `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
  } else if (d.length > 2) {
    d = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  }
  e.target.value = d;
});

/* ---------- Tabela de experiências ---------- */
function adicionarLinha() {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" data-c="empresa" aria-label="Empresa"></td>
    <td><input type="text" data-c="funcao" aria-label="Função"></td>
    <td><input type="text" data-c="periodo" placeholder="Ex.: 2021 a 2023" aria-label="Período"></td>
    <td><input type="text" data-c="salario" class="moeda" placeholder="R$ 0,00" inputmode="numeric" aria-label="Último salário"></td>
    <td><button type="button" class="remover">Remover</button></td>`;
  corpoExp.appendChild(tr);
}

function reiniciarExperiencias() {
  corpoExp.innerHTML = "";
  adicionarLinha();
  adicionarLinha();
  document.getElementById("experiencias").classList.remove("tabela-desativada");
}

document.getElementById("add-exp").addEventListener("click", adicionarLinha);
corpoExp.addEventListener("click", (e) => {
  if (!e.target.classList.contains("remover")) return;
  if (corpoExp.rows.length > 1) e.target.closest("tr").remove();
  else e.target.closest("tr").querySelectorAll("input").forEach((i) => (i.value = ""));
});
primeiroEmprego.addEventListener("change", () => {
  document.getElementById("experiencias").classList.toggle("tabela-desativada", primeiroEmprego.checked);
  document.getElementById("add-exp").disabled = primeiroEmprego.checked;
});

function lerExperiencias() {
  return [...corpoExp.rows]
    .map((tr) => {
      const v = (c) => tr.querySelector(`[data-c="${c}"]`).value.trim();
      return { empresa: v("empresa"), funcao: v("funcao"), periodo: v("periodo"), salario: v("salario") };
    })
    .filter((l) => l.empresa || l.funcao || l.periodo || l.salario);
}

/* ---------- Tabela de disponibilidade ---------- */
corpoDisp.innerHTML = DIAS.map(
  (dia) =>
    `<tr><td>${dia}</td>` +
    TURNOS.map((t) => `<td><input type="checkbox" name="disp" value="${dia}|${t}" aria-label="${dia}, ${t}"></td>`).join("") +
    "</tr>"
).join("");

function resumoDisponibilidade(itens) {
  const porDia = {};
  itens.forEach((i) => {
    const [dia, turno] = i.split("|");
    (porDia[dia] = porDia[dia] || []).push(turno);
  });
  return DIAS.filter((d) => porDia[d]).map((d) => `${d.slice(0, 3)}: ${porDia[d].join(", ")}`);
}

/* ---------- Validação ---------- */
function mostrarErro(campo, texto) {
  document.getElementById("erro-" + campo).textContent = texto;
  const el = document.getElementById(campo);
  if (el) el.classList.toggle("invalido", Boolean(texto));
}

function validar() {
  const v = (id) => document.getElementById(id).value.trim();
  const erros = {};

  if (!v("nome")) erros.nome = "O campo Nome é obrigatório";
  else if (v("nome").length < 3) erros.nome = "Digite o nome completo";

  if (!v("endereco")) erros.endereco = "O campo Endereço é obrigatório";

  if (!v("email")) erros.email = "O campo E-mail é obrigatório";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("email")))
    erros.email = "E-mail inválido. Use o formato nome@dominio.com";

  const digitosTel = v("telefone").replace(/\D/g, "");
  if (!digitosTel) erros.telefone = "O campo Telefone é obrigatório";
  else if (digitosTel.length < 10) erros.telefone = "Telefone inválido. Inclua o DDD";

  if (!v("cargo")) erros.cargo = "Selecione um cargo";

  if (!v("salario")) erros.salario = "O campo Salário é obrigatório";
  else if (lerMoeda(document.getElementById("salario")) <= 0) erros.salario = "O salário deve ser maior que zero";

  if (!form.turno.value) erros.turno = "Selecione um turno";

  if (!primeiroEmprego.checked) {
    const exp = lerExperiencias();
    if (exp.length === 0) erros.experiencias = "Informe ao menos uma experiência ou marque Primeiro emprego";
    else if (exp.some((l) => !l.empresa || !l.funcao))
      erros.experiencias = "Preencha empresa e função em todas as linhas, ou remova as linhas incompletas";
  }

  if (!form.querySelector('input[name="disp"]:checked'))
    erros.disponibilidade = "Marque ao menos um dia e turno de disponibilidade";

  CAMPOS.forEach((c) => mostrarErro(c, erros[c] || ""));
  return Object.keys(erros).length === 0;
}

/* ---------- Lista da equipe ---------- */
function escapar(t) {
  const d = document.createElement("div");
  d.textContent = t;
  return d.innerHTML;
}

function renderizar() {
  lista.innerHTML = funcionarios
    .map((f, i) => {
      const exp = f.primeiroEmprego
        ? "Primeiro emprego"
        : f.experiencias.map((e) => `${escapar(e.empresa)} (${escapar(e.funcao)}${e.periodo ? ", " + escapar(e.periodo) : ""})`).join("<br>");
      return `<tr>
        <td>${escapar(f.nome)}<br><small>${escapar(f.email)}</small></td>
        <td>${escapar(f.cargo)}</td>
        <td>${escapar(f.turno)}</td>
        <td>${formatoMoeda.format(f.salario)}</td>
        <td>${exp}</td>
        <td>${resumoDisponibilidade(f.disponibilidade).map(escapar).join("<br>")}</td>
        <td><button type="button" class="remover" data-i="${i}">Excluir</button></td>
      </tr>`;
    })
    .join("");
  vazio.style.display = funcionarios.length ? "none" : "block";
  contador.textContent = `(${funcionarios.length} cadastrado${funcionarios.length === 1 ? "" : "s"}, mínimo de 4)`;
}

function salvarLocal() {
  try { localStorage.setItem(CHAVE, JSON.stringify(funcionarios)); } catch (e) { /* segue sem salvar */ }
}

lista.addEventListener("click", (e) => {
  if (!e.target.dataset.i) return;
  funcionarios.splice(Number(e.target.dataset.i), 1);
  salvarLocal();
  renderizar();
});

/* ---------- Envio ---------- */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  mensagem.className = "";

  if (!validar()) {
    mensagem.textContent = "Corrija os campos destacados em vermelho.";
    mensagem.classList.add("falha");
    return;
  }

  funcionarios.push({
    nome: form.nome.value.trim(),
    endereco: form.endereco.value.trim(),
    email: form.email.value.trim(),
    telefone: form.telefone.value,
    cargo: form.cargo.value,
    salario: lerMoeda(form.salario),
    turno: form.turno.value,
    primeiroEmprego: primeiroEmprego.checked,
    experiencias: primeiroEmprego.checked ? [] : lerExperiencias(),
    disponibilidade: [...form.querySelectorAll('input[name="disp"]:checked')].map((c) => c.value),
  });
  salvarLocal();

  form.reset();
  reiniciarExperiencias();
  document.getElementById("add-exp").disabled = false;
  CAMPOS.forEach((c) => mostrarErro(c, ""));
  mensagem.textContent = "Funcionário cadastrado com sucesso";
  mensagem.classList.add("sucesso");
  renderizar();
});

reiniciarExperiencias();
renderizar();