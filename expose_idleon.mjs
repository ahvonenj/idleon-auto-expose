import fs from "fs/promises";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

let patchDevtools = false;

if(process.argv.indexOf('--devtools') > -1) {
	patchDevtools = true;
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const targetPattern = 'config_game_config_json';
const subPatternPatchLocation = /(var [a-zA-Z$]+={})/;
const subPatternEngineVariable = /([a-zA-Z$]+)\["tweenxcore.MatrixTools"\]/;
const subPatternMainVariable = /function\([a-zA-Z$]+,([a-zA-Z$]+)\){[a-zA-Z$]+\.lime=[a-zA-Z$]+\.lime\|\|\{\}/;

const indexFilePatternA = 'devTools: isDevelopment';
const indexFilePatternB = /\((isDevelopment)\)/g;
const indexFileSubPatternB = 'window.webContents.openDevTools()';

const NFileName = 'N.js';

function replaceSubstring(str, cutIndex, replacement, joinIndex) {
    const first = str.substring(0, cutIndex);
    const second = str.substring(joinIndex);
    return first + replacement + second;
}

(async () => {
	console.log(`Reading ${NFileName}`);

	let Nfile = null;

	try {
		Nfile = await fs.readFile(NFileName, { encoding: "utf-8" });
	} catch(err) {
		console.log(`${NFileName} not found, make sure to extract it from the app.asar to this directory first`);
		process.exit(0);
	}

	console.log(`Seeking patchable patterns`);
	
	const targetPatternIdx = Nfile.indexOf(targetPattern);
	const patternSubstr = Nfile.substring(targetPatternIdx - 1500, targetPatternIdx);

	const targetPatchLocationPatternMatch = subPatternPatchLocation.exec(patternSubstr);
	const engineVariableNameMatch = subPatternEngineVariable.exec(patternSubstr);
	const mainVariableMatch = subPatternMainVariable.exec(Nfile);

	if(targetPatchLocationPatternMatch === null) {
		console.log('Patch location pattern not found!');
		process.exit(0);
	}

	if(engineVariableNameMatch === null) {
		console.log('Engine variable name not found!');
		process.exit(0);
	}

	if(mainVariableMatch === null) {
		console.log('Main variable name not found!');
		process.exit(0);
	}

	const targetPatchLocationPattern = targetPatchLocationPatternMatch[0];
	const engineVariableName = engineVariableNameMatch[1];
	const mainVariableName = mainVariableMatch[1];

	console.log(`SUCCESS: Patterns found, game is patchable!`);
	console.log(`Patch target index: ${targetPatternIdx}`);
	console.log(`Patch target pattern: ${targetPatchLocationPattern}`);
	console.log(`Engine variable name: ${engineVariableName}`);
	console.log(`Main variable name: ${mainVariableName}`);

	console.log('Patching game');

	const NfilePatched = Nfile.replace(targetPatchLocationPattern, `${mainVariableName}.exposedGame=${engineVariableName};${targetPatchLocationPattern}`);
	const patchedPatternIdx = NfilePatched.indexOf(targetPattern);
	const patchedPatternSubstr = NfilePatched.substring(patchedPatternIdx - 250, patchedPatternIdx);

	console.log(`PATCHED, game engine is now exposed as: ${mainVariableName}.exposedGame=${engineVariableName};`);
	console.log(`Writing patched/${NFileName} - drop this into app.asar distBuild/static/game/`);

	const fileList = await fs.readdir(currentDirectory);
	const patchedFolderExists = fileList.indexOf('patched') > -1;

	if(!patchedFolderExists)
		await fs.mkdir('patched');

	await fs.writeFile(`patched/${NFileName}`, NfilePatched);

	if(patchDevtools) {
		console.log('--devtools argument given, patching index.js as well');

		let indexFile = null;

		try {
			indexFile = await fs.readFile('index.js', { encoding: "utf-8" });
		} catch(err) {
			console.log('index.js not found, make sure to extract it from the app.asar to this directory first');
			process.exit(0);
		}

		if(indexFile.indexOf(indexFilePatternA) === -1) {
			console.log(`Could not find primary pattern for index.js - patching index.js FAILED`);
			process.exit(0);
		}

		indexFile = indexFile.replace(indexFilePatternA, `devTools: true`);

		let indexPatternBIndex = null;
		let match;

		while (match = indexFilePatternB.exec(indexFile)) {
			const idx = match.index;
			const indexLocale = indexFile.substring(idx, idx + 65);
			
			if(indexLocale.indexOf(indexFileSubPatternB) > -1) {
				indexPatternBIndex = idx;
			}
		}

		if(indexPatternBIndex === null) {
			console.log(`Could not find secondary pattern for index.js - patching index.js FAILED`);
			process.exit(0);
		}

		indexFile = replaceSubstring(indexFile, indexPatternBIndex + 1, 'true', indexPatternBIndex + 'isDevelopment'.length + 1);

		console.log('PATCHED, devtools should now open when the game launches');
		console.log(`Writing patched/index.js - drop this into app.asar src/main/`);

		await fs.writeFile(`patched/index.js`, indexFile);
	}
})();