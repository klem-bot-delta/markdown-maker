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
		pos: number;
	}
>;

type MDRef = Map<
	string,
	{
		pos: number;
	}
>;

type Token = MDDef | MDRef;

const parser = (text: string) => {
	let doc: Map<string, Map<string, Token>> = new Map();

	let str = text;

	for (let [token, match] of tokens) {
		let groups = [...str.matchAll(match)];

		str = str.replace(match, '');

		let entry = new Map();

		if (typeof groups[0][2] === 'string') {
			for (let x of groups) {
				entry.set(x[1], {
					value: x[2],
					pos: x['index'],
				});
			}

			doc.set(token, entry);
		} else {
			for (let x of groups) {
				entry.set(x[1], {
					pos: x['index'],
				});
			}

			doc.set(token, entry);
		}
	}

	return doc;
};
