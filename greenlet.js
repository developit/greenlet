/** Move an async function into its own thread.
 *  @param {Function} fn    The (async) function to run in a Worker.
 */
export default function greenlet(fn) {
	const onMessage = originalFn =>
		({ data }) =>
			// run it's original function f, with data[1] as arguments
			// postMessage with d as 3rd arg if promise is successful
			// otherwise post error as 2nd argument
			Promise.resolve()
				.then(
					() => originalFn.apply(originalFn, data[1]),
				).then(
					(childData) => { postMessage([data[0], null, childData]); },
					(error) => { postMessage([data[0], '' + error ]); }
				);
	const blob = new Blob([`onmessage =${onMessage}(${fn})`]);

	const worker = new Worker(URL.createObjectURL(blob));
	let counter = 0;
	const promise = {};

	worker.onmessage = ({ data: [callback, error, data] }) => {
		// promise callback for this message call
		// if error, takes first array entry, otherwise second
		// and passes error otherwise original data
		promise[callback][error ? 1 : 0](error || data);
		delete promise[callback];
	};

	return (...a) =>
		new Promise((resolver, rejector) => {
			promise[++counter] = [resolver, rejector];
			worker.postMessage([counter, a]);
		});
}