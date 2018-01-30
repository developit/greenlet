type AsyncFunction<T> = (...args: any[]) => Promise<T>;

export default function greenlet<T extends AsyncFunction<U>, U>(fn: T): T;
