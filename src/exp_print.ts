import marked from 'marked';
import fs from 'fs';
import path from 'path';

type OutputOptions = {
	html?: boolean;
	dir?: string;
	fileName?: string;
};

const mdPrinter = (
	text: string,
	{ dir = 'bundle', html = false, fileName = 'bundle' }: OutputOptions,
): void => {
	let outPath = path.resolve(dir);

	if (!fs.existsSync(outPath)) fs.mkdirSync(outPath);

	if (html) {
		let htmlOut = marked(text);

		fs.writeFileSync(path.join(outPath, `${fileName}.html`), htmlOut);
	}

	fs.writeFileSync(path.join(outPath, `${fileName}.md`), text);
};

export default mdPrinter;
