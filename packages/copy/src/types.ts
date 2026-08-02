export type DeepKeyOf<T> = T extends object ? {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? `${K}.${DeepKeyOf<T[K]> & string}`
      : K
    : never
}[keyof T] : never;
