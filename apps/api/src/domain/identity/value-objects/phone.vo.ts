/**
 * Phone value object — validates E.164 format.
 * Domain-safe: no framework dependencies.
 */
export class Phone {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Phone {
    const trimmed = raw.trim();
    if (!Phone.isE164(trimmed)) {
      throw new Error(`Invalid E.164 phone number: ${raw}`);
    }
    return new Phone(trimmed);
  }

  private static isE164(phone: string): boolean {
    return /^\+[1-9]\d{6,14}$/.test(phone);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}
