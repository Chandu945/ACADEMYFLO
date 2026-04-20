export const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export function isValidObjectId(id: unknown): id is string {
  return typeof id === 'string' && OBJECT_ID_REGEX.test(id);
}
