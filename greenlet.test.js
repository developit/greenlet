import greenlet from './greenlet';

describe('greenlet', () => {
	it('should return an async function', () => {
		let g = greenlet( () => 'one' );
		expect(g).toEqual(jasmine.any(Function));
		expect(g()).toEqual(jasmine.any(Promise));
	});

	it('should return an async generator function', () => {
		let g = greenlet(function* () {
			yield 'one';
		});
		// expect that it has an iterator
		expect(!!g()[Symbol.asyncIterator]).toEqual(true);
	});

	it('should invoke sync functions', async () => {
		let foo = greenlet( a => 'foo: '+a );

		let ret = await foo('test');
		expect(ret).toEqual('foo: test');
	});

	it('should forward arguments', async () => {
		let foo = greenlet(function() {
			return {
				args: [].slice.call(arguments)
			};
		});

		let ret = await foo('a', 'b', 'c', { position: 4 });
		expect(ret).toEqual({
			args: ['a', 'b', 'c', { position: 4 }]
		});
	});

	it('should invoke async functions', async () => {
		let bar = greenlet(a => new Promise(resolve => {
			resolve('bar: ' + a);
		}));

		let ret = await bar('test');
		expect(ret).toEqual('bar: test');
	});

	it('should take values from next', async () => {
		let g = greenlet(function* () {
			const num2 = yield 1;
			yield 2 + num2;
		});

		const it = g();
		expect((await it.next()).value).toEqual(1);
		expect((await it.next(2)).value).toEqual(4);
	});

	it('should return both done as true and the value', async () => {
		// eslint-disable-next-line require-yield
		function* f (num1) {
			return num1;
		}
		let g = greenlet(f);

		const it = g(3);
		const it2 = f(3);
		const { done, value } = (await it.next());
		const { done: done2, value: value2 } = (await it2.next());

		expect(value).toEqual(value2);
		expect(done).toEqual(done2);
	});

	it('should only iterate yielded values with for await of', async () => {
		let g = greenlet(function* () {
			yield 3;
			yield 1;
			yield 4;
			return 1;
		});

		const arr = [];
		for await (const item of g()) {
			arr.push(item);
		}

		expect(arr[0]).toEqual(3);
		expect(arr[1]).toEqual(1);
		expect(arr[2]).toEqual(4);
		expect(arr[3]).toEqual(undefined);
	});

	it('should return early with return method of async iterator', async () => {
		let g = greenlet(function* () {
			yield 1;
			yield 2;
			yield 3;
			return 4;
		});


		const it = g();
		expect([
			await it.next(),
			await it.next(),
			await it.return(7),
			await it.next(),
			await it.next()
		]).toEqual([
			{ value: 1, done: false },
			{ value: 2, done: false },
			{ value: 7, done: true },
			{ value: undefined, done: true },
			{ value: undefined, done: true }
		]);
	});
	
	it('should throw early with return method of async iterator', async () => {
		let g = greenlet(function* () {
			yield 1;
			yield 2;
			yield 3;
			return 4;
		});


		const it = g();
		// expect this to reject!
		await (async () => ([
			await it.next(),
			await it.return(),
			await it.throw('foo'),
			await it.next(),
			await it.next()
		]))().then(() => {
			throw new Error('Promise should not have resolved');
		}, () => { /** since it should error, we recover and ignore the error */});
	});

	it('should act like an equivalent async iterator', async () => {
		async function* noG () {
			const num2 = yield 1;
			yield 2 + num2;
			yield 3;
			return 4;
		}
		
		let g = greenlet(noG);


		const it = g();
		const it2 = noG();
		expect([
			await it.next(),
			await it.next(2),
			await it.next(),
			await it.next(),
			await it.next()
		]).toEqual([
			await it2.next(),
			await it2.next(2),
			await it2.next(),
			await it2.next(),
			await it2.next()
		]);
	});

	it('should throw like an equivalent async iterator', async () => {
		async function* noG () {
			const num2 = yield 1;
			yield 2 + num2;
			yield 3;
			return 4;
		}
		
		let g = greenlet(noG);


		const it = g();
		const it2 = noG();
		expect([
			await it.next(),
			await it.next(2),
			await it.throw().catch(e => 2),
			await it.return(),
			await it.throw().catch(e => 3)
		]).toEqual([
			await it2.next(),
			await it2.next(2),
			await it2.throw().catch(e => 2),
			await it2.return(),
			await it2.throw().catch(e => 3)
		]);
	});

	it('should return like an equivalent async iterator', async () => {
		async function* noG () {
			const num2 = yield 1;
			yield 2 + num2;
			yield 3;
			return 4;
		}
		
		let g = greenlet(noG);


		const it = g();
		const it2 = noG();
		expect([
			await it.next(),
			await it.next(2),
			await it.return(),
			await it.return()
		]).toEqual([
			await it2.next(),
			await it2.next(2),
			await it2.return(),
			await it2.return()
		]);
	});
});
