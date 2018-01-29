<p align="center">
  <img src="https://i.imgur.com/e8XbYbd.png" width="1000" alt="Greenlet">
</p>

## Greenlet [![npm](https://img.shields.io/npm/v/greenlet.svg)](https://npm.im/greenlet) [![travis](https://travis-ci.org/developit/greenlet.svg?branch=master)](https://travis-ci.org/developit/greenlet)

> Move an async function into its own thread.
>
> A simplified single-function version of [workerize](https://github.com/developit/workerize).

The name is somewhat of a poor choice, but it was [available on npm](https://npm.im/greenlet).

_Greenlet only supports browser environments, since it uses [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). For use in a NodeJS environment, Web Workers must be polyfilled using a library like [node-webworker](https://github.com/pgriess/node-webworker)._

## Installation & Usage

```sh
npm i -S greenlet
```

Accepts an async function with, produces a copy of it that runs within a Web Worker.

> ⚠️ **Caveat:** the function you pass cannot rely on its surrounding scope, since it is executed in an isolated context.

```
greenlet(Function) -> Function
```


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


## License

[MIT](https://oss.ninja/mit/developit)
