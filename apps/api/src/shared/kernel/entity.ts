import type { UniqueId } from './unique-id';

/**
 * Base entity class for domain models.
 * Domain-safe: no framework dependencies.
 *
 * @template TProps - The entity's property bag type
 */
export abstract class Entity<TProps> {
  private readonly _id: UniqueId;
  protected readonly props: TProps;

  protected constructor(id: UniqueId, props: TProps) {
    this._id = id;
    this.props = props;
  }

  get id(): UniqueId {
    return this._id;
  }

  equals(other: Entity<TProps>): boolean {
    if (other === this) return true;
    return this._id.equals(other._id);
  }
}
