/** Display labels only: role IDs and API names remain unchanged. */
export const ROLE_NAMES_ES: Readonly<Record<string, string>> = {
  'platform admin': 'Administrador de plataforma',
  owner: 'Propietario',
  manager: 'Gerente',
  seller: 'Vendedor',
  technician: 'Técnico',
  consultor: 'Consultor',
};

export function translateRoleName(name: string): string {
  const key = name.trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ROLE_NAMES_ES, key)
    ? ROLE_NAMES_ES[key]
    : name;
}
