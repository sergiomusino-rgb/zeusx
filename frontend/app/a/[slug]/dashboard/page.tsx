// Rotta protetta delle nuove app (auth_mode='supabase'). Riusa lo stesso
// componente gestionale delle app legacy (ViewerProFinal in ../app/page.tsx):
// il componente stesso riconosce da quale route è montato (vedi il guard su
// usePathname()) e costruisce la sessione da Supabase Auth invece che da
// localStorage. Il gate di autenticazione vero e proprio (utente loggato +
// membership app_users attiva) è già garantito da ../layout.tsx prima che
// questa pagina venga montata.
export { default } from '../app/page';
