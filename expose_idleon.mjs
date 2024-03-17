import fs from "fs/promises";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

const targetPattern = 'config_game_config_json';
const subPatternPatchLocation = /(var [a-zA-Z$]+={})/;
const subPatternEngineVariable = /([a-zA-Z$]+)\["tweenxcore.MatrixTools"\]/;
const subPatternMainVariable = /function\([a-zA-Z$]+,([a-zA-Z$]+)\){[a-zA-Z$]+\.lime=[a-zA-Z$]+\.lime\|\|\{\}/;
const NFileName = 'N.js';

(async () => {
	console.log(`Reading ${NFileName}`);

	const Nfile = await fs.readFile(NFileName, { encoding: "utf-8" });

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
})();