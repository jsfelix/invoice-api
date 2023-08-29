export function exclude<Entity, Key extends keyof Entity>(
  entity: Entity,
  keys: Key[],
) {
  return Object.fromEntries(
    Object.entries(entity as ArrayLike<unknown>).filter(
      ([key]) => !keys.includes(key as Key),
    ),
  )
}
