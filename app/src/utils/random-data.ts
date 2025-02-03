export function generateTestPassword() {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  const length = 8; // Мінімальна довжина пароля

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

export const generateTestEmail = () =>
  `x${Math.floor(Math.random() * 100000)}x@freeicloud.com`;
