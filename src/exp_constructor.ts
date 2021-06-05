// Experimental document constructor

import { AST } from './exp_parser';

const documentConstructor = (doc: AST, text: string): string => {
	let defs = doc.get('def'),
		refs = doc.get('ref');

	let out: string = text;

	// Remove variable definitions from output.
	for (let [_, token] of defs) {
		out = out.replace(token['string'] + '\n', '');
	}

	// Replace variables references with corresponding values.
	for (let [name, token] of refs) {
		let gr = [...out.matchAll(token['string'])];

		gr.forEach(() => {
			out = out.replace(token['string'], defs.get(name)['value']);
		});
	}

	return out;
};

export default documentConstructor;
