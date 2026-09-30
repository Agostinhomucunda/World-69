// Lista de contas autorizadas a abrir o painel administrativo.
// Altera este email para o email admin criado em Firebase Authentication.
export const ADMIN_EMAILS = ['world69.ao@gmail.com'];

export function isAdminUser(user) {
  return Boolean(user?.email && ADMIN_EMAILS.includes(user.email.trim().toLowerCase()));
}
