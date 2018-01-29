/** Move an async function into its own thread.
 *  @param {Function} fn	The (async) function to run in a Worker.
 */
export default function greenlet(fn) {
	let w = new Worker(URL.createObjectURL(new Blob([
			'onmessage=('+(
				f => ({ data }) => Promise.resolve().then(
					() => f.apply(f, data[1])
				).then(
					d => { postMessage([data[0], null, d]); },
					e => { postMessage([data[0], ''+e]); }
				)
			)+')('+fn+')'
		]))),
		c = 0,
		p = {};
	w.onmessage = ({ data: [c,e,d] }) => {
		p[c][e?1:0](e||d);
		delete p[c];
	};
	return (...a) => new Promise( (y, n) => {
		p[++c] = [y, n];
		w.postMessage([c, a]);
	});
}
