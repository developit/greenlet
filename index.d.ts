interface Options {
    useTransferables: boolean
}

type AsyncGenFunction<S extends any[], T=unknown, TReturn=any, TNext=unknown> = (...args: S) => AsyncGenerator<T, TReturn, TNext>;

type AsyncFunction<S extends any[], T=unknown> = (...args: S) => Promise<T>;

type GenFunction<S extends any[], T=unknown, TReturn=any, TNext=unknown> = (...args: S) => (Generator<T, TReturn, TNext> | AsyncGenerator<T, TReturn, TNext>);

type MaybeAsyncFunctionButNotGen<S extends any[], T=unknown, TReturn=any,TNext=unknown> = (...args: S) => (Exclude<T, Generator<T, TReturn, TNext> | AsyncGenerator<T, TReturn, TNext>> | Promise<T>);

type GreenletFnType<S extends any[], T, TReturn = any, TNext = unknown> = MaybeAsyncFunctionButNotGen<S, T, TReturn, TNext> | GenFunction<S, T, TReturn, TNext>;

export default function greenlet<S extends any[], T=unknown, TReturn=any, TNext=unknown, U extends GreenletFnType<S,T,TReturn,TNext> = GreenletFnType<S, T, TReturn, TNext>>(fn: U, options?: Options): U extends GenFunction<infer S,infer T,infer TReturn,infer TNext> ?  AsyncGenFunction<S, T, TReturn, TNext> : U extends MaybeAsyncFunctionButNotGen<infer S,infer T> ? AsyncFunction<S, T>  : never;
