// js/cart-badge.js
(function(){
  function el(){ return document.querySelector('.cart-badge'); }
  function count(){
    try{
      return (JSON.parse(localStorage.getItem('cart')||'[]')||[])
              .reduce((s,i)=>s+(+i.qty||1),0);
    }catch(_){return 0}
  }
  function render(){
    const b = el(); if(!b) return;
    b.textContent = count();
  }

  window.addEventListener('storage', render);
  document.addEventListener('cart:updated', render);
  document.addEventListener('partials:ready', render);

  // primeira pintura
  render();
})();
