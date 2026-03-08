/**
 * Value object representing a unique identifier.
 * Domain-safe: no framework dependencies.
 */
export class UniqueId {
  private readonly value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UniqueId cannot be empty');
    }
    this.value = value.trim();
  }

  toString(): string {
    return this.value;
  }

  equals(other: UniqueId): boolean {
    return this.value === other.value;
  }
}
