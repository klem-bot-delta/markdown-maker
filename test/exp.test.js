const util = require('./tester.test.js');
const parser = require('../build/exp_parser.js');

describe('Experimental features', () => {
	describe('Experimental parser', () => {
		let text = `#mddef<my_var=some_str>
        <my_var>`;

		it('should parse string to AST', () => {
			parser(text);
		});
	});
});
