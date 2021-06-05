// Experimental parser

type TokenLex = Map<string, RegExp>;

const tokens: TokenLex = new Map(
	Object.entries({
		def: /#mddef<(.+)\=(.+)\>/g,
		ref: /<(.+)>/g,
	}),
);

type MDDef = Map<
	string,
	{
		value: string;
		string: string;
	}
>;

type MDRef = Map<
	string,
	{
		string: string;
	}
>;

export type Token = MDDef | MDRef;

export type AST = Map<string, Map<string, Token>>;

const parser = (text: string): AST => {
	let doc: AST = new Map();

	let str = text;

	for (let [token, match] of tokens) {
		let groups = [...str.matchAll(match)];

		str = str.replace(match, '');

		let entry = new Map();

		if (typeof groups[0][2] === 'string') {
			for (let x of groups) {
				entry.set(x[1], {
					value: x[2],
					string: x[0],
				});
			}

			doc.set(token, entry);
		} else {
			for (let x of groups) {
				entry.set(x[1], {
					string: x[0],
				});
			}

			doc.set(token, entry);
		}
	}

	return doc;
};

export default parser;
