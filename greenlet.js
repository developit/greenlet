/** Move an async function into its own thread.
 *  @param {Function} asyncFunction  An (async) function to run in a Worker.
 */
export default function greenlet(asyncFunction) {
	// Create an "inline" worker
	let worker = new Worker(
			// The URL is a pointer to a stringified function (as a blob object)
			URL.createObjectURL(
				new Blob([
					// Register our wrapper function as the message handler
					'onmessage=('+(
						// f() is the user-supplied async function
						userFunc => ({ data }) => Promise.resolve().then(
							// invoking within then() captures exceptions in f() as rejections
							() => userFunc.apply(userFunc, data[1])
						).then(
							d => {
								// success handler - callback(id, null, result)
								postMessage([data[0], null, d]);
							},
							e => {
								// error handler - callback(id, err)
								postMessage([data[0], ''+e]);
							}
						)
					)+')('+asyncFunction+')'  // pass user-supplied function to the closure
				])
			)
		),

		// A simple counter is used to generate worker-global unique ID's for RPC:
		currentId = 0,

		// Outward-facing promises store their "controllers" (`[request, reject]`) here:
		promises = {};

	// Handle RPC results/errors coming back out of the worker
	worker.onmessage = ({ data: [id, err, result] }) => {
		// invoke the promise's resolve() or reject() depending on whether there was an error.
		promises[id][err ? 1 : 0](err || result);
		// ... then delete the promise controller
		delete promises[id];
	};

	// Return a proxy function that forwards calls to the worker & returns a promise for the result.
	return (...args) => new Promise( (resolve, reject) => {
		promises[++currentId] = [resolve, reject];
		// Send an RPC call to the worker - call(id, params)
		worker.postMessage([currentId, args]);
	});
}
