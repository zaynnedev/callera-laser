/* Lê categorias e injeta no menu (sem duplicar) */
(async function loadMenuCats() {
  const findList = () => document.querySelector("#menuCats");
  while (!findList()) await new Promise((r) => setTimeout(r, 50));
  const ul = findList(); if (!ul) return;

  try {
    const { data, error } = await window.SUPA
      .from("categories")
      .select("id,name,slug")
      .order("name", { ascending: true });
    if (error) throw error;

    // remove os itens dinâmicos anteriores
    ul.querySelectorAll("li[data-dyncat]").forEach((li) => li.remove());

    // âncora de inserção (após os dois primeiros links fixos)
    const items = ul.querySelectorAll("li");
    let after = items[2] || items[items.length - 1];

    (data || [])
      .filter((c) => !!c.slug && !["feminino", "masculino"].includes(String(c.slug).toLowerCase()))
      .forEach((cat) => {
        const li = document.createElement("li");
        li.setAttribute("data-dyncat", "");
        li.innerHTML = `<a href="categoria.html?slug=${encodeURIComponent(cat.slug)}">${cat.name}</a>`;
        after.after(li);
        after = li;
      });
  } catch (e) {
    console.error("Menu categorias:", e);
  }
})();
