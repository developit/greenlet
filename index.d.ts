type AsyncFunction<S extends any[], T> = (...args: S) => Promise<T>;

type MaybeAsyncFunction<S extends any[], T> = (...args: S) => (T | Promise<T>);

export default function greenlet<S extends any[], T>(fn: MaybeAsyncFunction<S, T>): AsyncFunction<S, T>;
