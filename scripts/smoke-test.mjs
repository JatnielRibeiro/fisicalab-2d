import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const requiredPages = [
  "index.html", "fisica.html", "matematica.html", "ciencias.html",
  "laboratorio.html", "movimento-retilineo.html", "leis-newton.html",
  "estatica.html", "energia-mecanica.html", "movimento-circular.html",
  "queda-livre.html", "gravitacao.html", "eletromagnetismo.html",
  "vetores.html", "conteudos.html", "exercicios.html"
];
const errors = [];
const exists = (p) => fs.existsSync(path.join(root, p));
for (const p of requiredPages) if (!exists(p)) errors.push("Página ausente: " + p);
for (const p of ["assets/lab-pages.css", "assets/lab-pages.js", "assets/universolab-favicon.svg", "assets/construction-cone.svg"]) {
  if (!exists(p)) errors.push("Recurso ausente: " + p);
}

const engine = fs.readFileSync(path.join(root, "assets/lab-pages.js"), "utf8");
try { new vm.Script(engine, { filename: "assets/lab-pages.js" }); }
catch (e) { errors.push("Erro de sintaxe no motor de laboratórios: " + e.message); }

for (const file of fs.readdirSync(root).filter((f) => f.endsWith(".html"))) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  if (!/<title>.*UniversoLab.*<\/title>/i.test(html)) errors.push(file + ": título/identidade UniversoLab ausente");
  if (!html.includes('href="assets/universolab-favicon.svg"')) errors.push(file + ": favicon ausente");
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#|data:|javascript:)/i.test(ref)) continue;
    const local = ref.split("#")[0].split("?")[0];
    if (local && !exists(local)) errors.push(file + ": recurso/link local ausente: " + local);
  }
  const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  inlineScripts.forEach((m, i) => {
    const code = m[1].trim();
    if (!code) return;
    try { new vm.Script(code, { filename: file + " inline script " + (i + 1) }); }
    catch (e) { errors.push(file + ": script inline " + (i + 1) + " inválido: " + e.message); }
  });
}

const requiredHubs = ["matematica.html", "fisica.html", "ciencias.html"];
const homepage = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const p of requiredHubs) if (!homepage.includes('href="' + p + '"')) errors.push("Página inicial sem link para " + p);

const expectedEnginePages = ["movimento-retilineo", "queda-livre", "gravitacao", "energia-mecanica", "leis-newton", "movimento-circular", "eletromagnetismo", "vetores"];
for (const key of expectedEnginePages) {
  if (!engine.includes("'" + key + "':{title:")) errors.push("Configuração de laboratório ausente no motor: " + key);
}
for (const key of ["estatica", "conteudos", "exercicios"]) {
  if (!engine.includes("p==='" + key + "'")) errors.push("Renderizador especial ausente: " + key);
}
if (errors.length) {
  console.error("UNIVERSOLAB CHECKS FAILED");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log("UniversoLab: " + requiredPages.length + " páginas, recursos, links locais e scripts verificados.");
console.log("Motor JavaScript válido; configurações de 8 laboratórios e 3 renderizadores especiais encontradas.");
