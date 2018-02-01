/** Move an async function into its own thread.
 *  @param {Function} asyncFunction  An (async) function to run in a Worker.
 *  @public
 */
export default function greenlet(asyncFunction) {
	// Create an "inline" worker (1:1 at definition time)
	const worker = new Worker(
			// The URL is a pointer to a stringified function (as a blob object)
			URL.createObjectURL(
				new Blob([
					// Register our wrapper function as the message handler
					'onmessage=(' + (
						// userFunc() is the user-supplied async function
						userFunc => e => {
							// Invoking within then() captures exceptions in userFunc() as rejections
							Promise.resolve(e.data[1]).then(
								userFunc.apply.bind(userFunc, userFunc)
							).then(
								// success handler - callback(id, SUCCESS(0), result)
								d => { postMessage([e.data[0], 0, d]); },
								// error handler - callback(id, ERROR(1), error)
								e => { postMessage([e.data[0], 1, ''+e]); }
							);
						}
					) + ')(' + asyncFunction + ')'  // pass user-supplied function to the closure
				])
			)
		),

		// A simple counter is used to generate worker-global unique ID's for RPC:
		currentId = 0,

		// Outward-facing promises store their "controllers" (`[request, reject]`) here:
		promises = {};

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

	// Return a proxy function that forwards calls to the worker & returns a promise for the result.
	return function(args) {
		args = [].slice.call(arguments);
		return new Promise(function() {
			// Add the promise controller to the registry
			promises[++currentId] = arguments;

			// Send an RPC call to the worker - call(id, params)
			worker.postMessage([currentId, args]);
		});
	};
}
