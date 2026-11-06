const menu_toggle = document.querySelector('.mobile_menu_button');
const menu = document.querySelector('.menu_items_wrapper');

menu_toggle.addEventListener('click', () => {
    const is_open = menu.classList.toggle('show');
    menu_toggle.setAttribute('aria-expanded', is_open);
});
