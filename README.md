<p align="center">
  <img src="https://i.imgur.com/e8XbYbd.png" width="1000" alt="Greenlet">
</p>

## Greenlet [![npm](https://img.shields.io/npm/v/greenlet.svg)](https://npm.im/greenlet) [![travis](https://travis-ci.org/developit/greenlet.svg?branch=master)](https://travis-ci.org/developit/greenlet) [![gzip size](http://img.badgesize.io/https://unpkg.com/greenlet/dist/greenlet.js?compression=gzip)](https://unpkg.com/greenlet/dist/greenlet.umd.js) [![install size](https://packagephobia.now.sh/badge?p=greenlet)](https://packagephobia.now.sh/result?p=greenlet)

> Move an async function into its own thread.
>
> A simplified single-function version of [workerize](https://github.com/developit/workerize), offering [the same performance as direct Worker usage](https://esbench.com/bench/5b16b61af2949800a0f61ce3).

The name is somewhat of a poor choice, but it was [available on npm](https://npm.im/greenlet).

_Greenlet supports IE10+, since it uses [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). For NodeJS usage, Web Workers must be polyfilled using a library like [node-webworker](https://github.com/pgriess/node-webworker)._

## Installation & Usage

```sh
npm i -S greenlet
```

Accepts an async function with, produces a copy of it that runs within a Web Worker.

> ⚠️ **Caveat:** the function you pass cannot rely on its surrounding scope, since it is executed in an isolated context.

```
greenlet(Function) -> Function
```

> ‼️ **Important:** never call greenlet() dynamically. Doing so creates a new Worker thread for every call:

```diff
-const BAD = () => greenlet(x => x)('bad') // creates a new thread on every call
+const fn = greenlet(x => x);
+const GOOD = () => fn('good'); // uses the same thread on every call
```

Since Greenlets can't rely on surrounding scope anyway, it's best to always create them at the "top" of your module.


## Example

Greenlet is most effective when the work being done has relatively small inputs/outputs.

One such example would be fetching a network resource when only a subset of the resulting information is needed:

```js
import greenlet from 'greenlet'

let getName = greenlet( async username => {
    let url = `https://api.github.com/users/${username}`
    let res = await fetch(url)
    let profile = await res.json()
    return profile.name
})

console.log(await getName('developit'))
```

[🔄 **Run this example on JSFiddle**](https://jsfiddle.net/developit/mf9fbma5/)

## Generator Example

Greenlet can now work with `Generators` and `AsyncGenerators` and will always return an `AsyncGenerator` in their
place. This means you can fetch small portions of data as you need it.

```js
import greenlet from '../greenlet.js';

let lazyGetRepos = greenlet(async function* (username, returnNumber = 10) {
	let url = `https://api.github.com/users/${username}/repos`;
	let res = await fetch(url);
	let repos = await res.json();
	while (repos.length > 0) {
		let newReturnNumber = yield repos.splice(0, returnNumber);
		if (typeof newReturnNumber !== 'undefined') {
			returnNumber = newReturnNumber;
		}
	}
});

const repoIter = lazyGetRepos('developit', 5);
// you could call these over any amount of time...
console.log(await repoIter.next()); // {value: Array(5), done: false}
console.log(await repoIter.next()); // {value: Array(5), done: false}
console.log(await repoIter.next(10)); // {value: Array(10), done: false}
// when your done clean up the asyncIterator
console.log(await repoIter.return()); // {value: undefined, done: true}

// or use for await of syntax to iterate through all values;
const repoIter2 = lazyGetRepos('developit', 5);

for await (const repos of repoIter2) {
	console.log(items);
}
// no need to clean up if you have exhausted the iterator.
```


## Transferable ready

Greenlet will even accept and optimize [transferables](https://developer.mozilla.org/en-US/docs/Web/API/Transferable) as arguments to and from a greenlet worker function.


## Browser support

Thankfully, Web Workers have been around for a while and [are broadly supported](https://caniuse.com/#feat=webworkers) by Chrome, Firefox, Safari, Edge, and Internet Explorer 10+.

If you still need to support older browsers, you can just check for the presence of `window.Worker`:

```js
if (window.Worker) {
    ...
} else {
    ...
}
```

### CSP

If your app has a [Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy), Greenlet requires `worker-src blob:` and `script-src blob:` in your config.

## License & Credits

> In addition to the contributors, credit goes to [@sgb-io](https://github.com/sgb-io) for his annotated exploration of Greenlet's source. This prompted a refactor that clarified the code and allowed for further size optimizations.

[MIT License](https://oss.ninja/mit/developit)
