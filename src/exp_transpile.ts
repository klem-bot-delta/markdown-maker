// Transpiler entry
import parser from './exp_parser';
import mdPrinter from './exp_print';
import documentConstructor from './exp_constructor';
import fs from 'fs';
import path from 'path';

type Options = {
	html?: boolean; // Output HTML?
	src?: string; // Source path.
	entry?: string;
	outDir?: string; // Output directory.
	outFileName?: string; // Bundle name.
	// useUnderScore?: boolean;
	// watch?: boolean;
	// allowUndef?: boolean;
	// tocLevel?: number;
	// maxDepth?: number;
	// debug?: boolean;
};

const defaultOptions: Options = {
	html: false,
	src: '.',
	entry: 'main.md',
	outDir: 'bundle',
	outFileName: 'bundle',
};

const transpile = (opts: Options): void => {
	let { html, src, entry, outDir, outFileName } = {
		...defaultOptions,
		...opts,
	};

	/* in case source is a directory, look for entry in directory */
	if (fs.existsSync(src) && fs.lstatSync(src).isDirectory()) {
		src = path.join(src, entry);
	}

	let srcPath =
		fs.existsSync(src) && fs.lstatSync(src).isDirectory()
			? path.join(src, entry)
			: path.join(defaultOptions.src, entry);

	let text = fs.existsSync(srcPath)
		? fs.readFileSync(srcPath, 'utf-8') + '\n'
		: '';

	let ast = parser(text);

	let transpiled = documentConstructor(ast, text);

	mdPrinter(transpiled, { dir: outDir, html, fileName: outFileName });
};
