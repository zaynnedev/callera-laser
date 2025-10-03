// assets/js/cart.js
(function () {
  let bound = false;

  function fmt(n){ return (Number(n||0)).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  const get = ()=>{ try{ return JSON.parse(localStorage.getItem("cart")||"[]")||[] }catch{ return [] } };
  const set = (arr)=>{ localStorage.setItem("cart", JSON.stringify(arr)); render(); window.dispatchEvent(new Event("storage")); };

  function els(){
    return {
      drawer: document.getElementById("cartDrawer"),
      backdrop: document.getElementById("cartBackdrop"),
      btnOpen: document.getElementById("btnOpenCart"),
      btnClose: document.getElementById("btnCloseCart"),
      list: document.getElementById("cartItems"),
      totalEl: document.getElementById("cartTotal"),
      nameEl: document.getElementById("orderName"),
      phoneEl: document.getElementById("orderPhone"),
      btnCheckout: document.getElementById("btnCheckout"),
      badge: document.querySelector(".cart-badge"),
    };
  }

  function count(){ return get().reduce((s,i)=>s+(+i.qty||1),0); }

  function render(){
    const { list, totalEl, badge } = els(); if(!list || !totalEl) return;
    const cart = get();
    if (badge) badge.textContent = count();

    list.innerHTML = "";
    if (!cart.length) {
      list.innerHTML = '<p class="muted">Sua sacola está vazia.</p>';
      totalEl.textContent = "R$ 0,00";
      return;
    }

    let total = 0;
    cart.forEach((it, idx) => {
      const qty = Number(it.qty||1);

      let unit;
      if (it.price != null) {
        unit = Number(it.price);
      } else if (it.installments?.count && it.installments?.value != null) {
        unit = Number(it.installments.count) * Number(it.installments.value);
      } else {
        unit = 0;
      }
      total += unit * qty;

      const label = (it.price!=null)
        ? `R$ ${fmt(it.price)}`
        : (it.installments?.count && it.installments?.value!=null)
          ? `${it.installments.count}x R$ ${fmt(it.installments.value)} (total R$ ${fmt(it.installments.count*it.installments.value)})`
          : "—";

      const row = document.createElement("div");
      row.className = "cd-item";
      row.innerHTML = `
        <img src="${it.image||'assets/images/placeholder.png'}" alt="">
        <div>
          <p class="cd-name">${it.name}</p>
          <p class="cd-price">${label}</p>
          <div class="cd-qty" role="group" aria-label="Quantidade">
            <button data-minus="${idx}" type="button">−</button>
            <span>${qty}</span>
            <button data-plus="${idx}" type="button">+</button>
          </div>
        </div>
        <button class="cd-remove" data-del="${idx}" type="button">Remover</button>`;
      list.appendChild(row);
    });

    totalEl.textContent = "R$ " + fmt(total);
  }

  function bind(){
    if (bound) return;
    const { drawer, backdrop, btnOpen, btnClose, list, btnCheckout, nameEl, phoneEl } = els();
    if (!drawer || !btnOpen || !list || !btnCheckout) return; // ainda não carregou

    function open(){ drawer.classList.add("show"); drawer.setAttribute("aria-hidden","false"); render(); }
    function close(){ drawer.classList.remove("show"); drawer.setAttribute("aria-hidden","true"); }

    btnOpen.addEventListener("click",(e)=>{ e.preventDefault(); open(); });
    btnClose?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
    window.addEventListener("keydown",(e)=>{ if(e.key==="Escape") close(); });

    drawer.addEventListener("click",(e)=>{
      const minus=e.target.closest("[data-minus]"); if(minus){ const i=+minus.dataset.minus; const c=get(); c[i].qty=Math.max(1,(c[i].qty||1)-1); set(c); return; }
      const plus =e.target.closest("[data-plus]");  if(plus){  const i=+plus.dataset.plus;  const c=get(); c[i].qty=(c[i].qty||1)+1; set(c); return; }
      const del  =e.target.closest("[data-del]");   if(del){   const i=+del.dataset.del;   const c=get(); c.splice(i,1); set(c); return; }
    });

    btnCheckout.addEventListener("click", async ()=>{
      const cart=get(); if(!cart.length) return alert("Sua sacola está vazia.");
      const name=(nameEl.value||"").trim();
      const phone=(phoneEl.value||"").replace(/[^\d]/g,"");
      if(!name || phone.length<10) return alert("Informe seu nome e WhatsApp (DDD+Número).");

      const fmtItem = (i)=>
        (i.price!=null) ? `R$ ${fmt(i.price)}`
        : (i.installments?.count && i.installments?.value!=null) ? `${i.installments.count}x R$ ${fmt(i.installments.value)}`
        : "—";

      const linhas = cart.map(i=>`• ${i.qty||1}× ${i.name} — ${fmtItem(i)}`);
      const total = cart.reduce((s,i)=>{
        const q=+i.qty||1;
        const unit=(i.price!=null)? +i.price : (i.installments?.count && i.installments?.value!=null)? (+i.installments.count)*(+i.installments.value) : 0;
        return s + q*unit;
      },0);

      const msg=`Olá! Quero confirmar meu pedido:%0A%0A${linhas.join("%0A")}%0A%0ATotal: R$ ${fmt(total)}%0A%0ANome: ${encodeURIComponent(name)}%0AWhatsApp: ${encodeURIComponent(phone)}`;
      const wa=`https://wa.me/5592993242367?text=${msg}`;

      try{
        await window.SUPA.from("orders").insert({
          customer:name, phone,
          items:cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price,installments:i.installments||null})),
          to_whatsapp:true
        });
      }catch(err){ console.error(err); }

      localStorage.removeItem("cart");
      render(); close(); window.open(wa,"_blank");
    });

    // API global
    window.Cart = {
      add(item){
        const cart=get();
        const i=cart.findIndex(c=>c.id===item.id);
        if(i>=0) cart[i].qty=(cart[i].qty||1)+1; else cart.push({...item, qty:1});
        set(cart); open();
      },
      open
    };

    bound = true;
    render();
  }

  // espera o header/menu antes de ligar o carrinho
  document.addEventListener("partials:ready", bind);
  // se já estiver pronto (navegações internas), tenta ligar
  if (document.getElementById("cartDrawer")) bind();
})();
