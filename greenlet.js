/** Move an async function into its own thread.
 *  @param {Function} asyncFunction  An (async) or async generator function to run in a Worker.
 *  @param {{useTransferables?: boolean}} options
 * 	useTransferables defaults to true.
 *  @public
 */
export default function greenlet(asyncFunction, options = {}) {
	const defaults = {
		useTransferables: true
	};
	const { useTransferables } = { ...defaults, ...options };
	// A simple counter is used to generate worker-global unique ID's for RPC:
	let promiseIds = 0;

	// A simple counter is use to generate worker-global generator ID's for RPC:
	let genIds = 0;

	// Outward-facing promises store their "controllers" (`[request, reject]`) here:
	const promises = {};

	// Use a data URI for the worker's src. It inlines the target function and an RPC handler:
	const script = `$$=${asyncFunction};USET=${useTransferables};GENS={};onmessage=` + (e => {
		/* global $$, GENS, USET */
		const getTransferables = d => !USET ? [] : d.filter(x => (
			(x instanceof ArrayBuffer) ||
			(x instanceof MessagePort) ||
			(self.ImageBitmap && x instanceof ImageBitmap)
		));
		const [promiseID, args, status, genID] = e.data;
		Promise.resolve(args).then(
			// either apply the async/generator/async generator function or use a generator function's iterator
			v => !GENS[genID] ? $$.apply($$, v) : GENS[genID][status](v[0])
		).then(
			// success handler - callback(id, SUCCESS(0))
			// if `d` is transferable transfer zero-copy
			d => {
				if ($$.constructor.name === 'AsyncGeneratorFunction' || $$.constructor.name === 'GeneratorFunction') {
					// setup the generator
					if (!GENS[genID]) {
						GENS[genID] = [d.next.bind(d), d.return.bind(d), d.throw.bind(d)];
						// return an initial message of success.
						return postMessage([promiseID, 0, { value: undefined, done: false }]);
					}
					// yield the value
					postMessage([promiseID, 0, d], getTransferables([d.value]));
					if (d.done) {
						GENS[genID] = null;
					}
				}
				else {
					// here we know it's just an async function that needs it's return value.
					postMessage([promiseID, 0, d], getTransferables([d]));
				}
			},
			// error handler - callback(id, ERROR(1), error)
			er => { postMessage([promiseID, 1, '' + er]); }
		);
	});
	const workerURL = URL.createObjectURL(new Blob([script]));
	// Create an "inline" worker (1:1 at definition time)
	const worker = new Worker(workerURL);

	/** Handle RPC results/errors coming back out of the worker.
	 *  Messages coming from the worker take the form `[id, status, result]`:
	 *    id     - counter-based unique ID for the RPC call
	 *    status - 0 for success, 1 for failure
	 *    result - the result or error, depending on `status`
	 */
	worker.onmessage = e => {
		// invoke the promise's resolve() or reject() depending on whether there was an error.
		promises[e.data[0]][e.data[1]](e.data[2]);

		// ... then delete the promise controller
		promises[e.data[0]] = null;
	};

	const passMessagePromise = (args, status, genID) => new Promise(function () {
		// Add the promise controller to the registry
		promises[++promiseIds] = arguments;

		// Send an RPC call to the worker - call(id, params)
		// The filter is to provide a list of transferables to send zero-copy
		worker.postMessage([promiseIds, args, status, genID], !useTransferables ? [] : args.filter(x => (
			(x instanceof ArrayBuffer) ||
			(x instanceof MessagePort) ||
			(self.ImageBitmap && x instanceof ImageBitmap)
		)));
	});
	// if it's a generator or async generator function return a async generator function.
	if (asyncFunction.constructor.name === 'AsyncGeneratorFunction' || asyncFunction.constructor.name === 'GeneratorFunction') {
		return function workerPassthrough () {
			const genID = ++genIds;
			const init = passMessagePromise([].slice.call(arguments), 0, genID);
			return {
				done: false,
				async next (value) {
					await init;
					if (this.done) { return { value: undefined, done: true }; }
					const result = await passMessagePromise([value], 0, genID);
					if (result.done) { return this.return(result.value); }
					return result;
				},
				async return (value) {
					await init;
					await passMessagePromise([undefined], 1, genID);
					this.done = true;
					return { value, done: true };
				},
				async throw (err) {
					await init;
					await passMessagePromise(['' + err], 2, genID);
					throw err;
				},
				[Symbol.asyncIterator] () {
					return this;
				}
			};
		};
	}

	// Return a proxy function that forwards calls to the worker & returns a promise for the result.
	return function () {
		const args = [].slice.call(arguments);
		return passMessagePromise(args);
	};
}
