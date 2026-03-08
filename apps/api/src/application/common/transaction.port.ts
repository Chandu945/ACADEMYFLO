export const TRANSACTION_PORT = Symbol('TRANSACTION_PORT');

export interface TransactionPort {
  run<T>(fn: () => Promise<T>): Promise<T>;
}
