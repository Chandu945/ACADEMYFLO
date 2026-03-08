export const PASSWORD_GENERATOR = Symbol('PASSWORD_GENERATOR');

export interface PasswordGeneratorPort {
  generate(): string;
}
