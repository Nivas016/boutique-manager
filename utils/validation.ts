export function isValidPhone(phone: string): boolean {
  return /^\d{10}$/.test(phone.trim());
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}

export function isValidAmount(amount: string): boolean {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0;
}
