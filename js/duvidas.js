/* duvidas.js – acordeão simples:
   - apenas UMA pergunta aberta por vez (fecha as outras)
   - sem medir alturas; CSS cuida da transição
*/
(function(){
  const container = document.querySelector(".dv-faq");
  if (!container) return;

  container.addEventListener("toggle", (e) => {
    const el = e.target;
    if (!(el instanceof HTMLDetailsElement) || !el.open) return;

    // fecha as outras perguntas do MESMO grupo
    const group = el.closest(".faq-group");
    group?.querySelectorAll("details.faq").forEach(d => { if (d !== el) d.open = false; });
  }, true);
})();
