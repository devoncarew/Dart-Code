"use strict";

import * as path from "path";
import * as fs from "fs";
import * as vs from "vscode";
import * as as from "./analysis/analysis_server_types";
import { config } from "./config";

export const dartVMPath = "bin/dart";
export const analyzerPath = "bin/snapshots/analysis_server.dart.snapshot";

let isWin = /^win/.test(process.platform);
let dartExecutableName = isWin ? "dart.exe" : "dart";

export function findDartSdk(lastKnownPath: string): string {
	let paths = (<string>process.env.PATH).split(path.delimiter);

	// If we have a last-known path then push that onto the front of the list to search first.
	if (lastKnownPath)
		paths.unshift(path.join(lastKnownPath, "bin"));

	// We don't expect the user to add .\bin in config, but it would be in the PATHs
	let userDefinedSdkPath = config.userDefinedSdkPath;
	if (userDefinedSdkPath)
		paths.unshift(path.join(userDefinedSdkPath, "bin"));

	// Find which path has a Dart executable in it.
	let dartPath = paths.find(hasDartExecutable);
	if (!dartPath)
		return null;

	// To allow for symlinks, resolve the Dart executable to its real path.
	let realDartPath = fs.realpathSync(path.join(dartPath, dartExecutableName));

	// Return just the folder portion without the bin folder.
	return path.join(path.dirname(realDartPath), "..");
}

function hasDartExecutable(pathToTest: string): boolean {
	// Apparently this is the "correct" way to check files exist synchronously in Node :'(
	try {
		fs.accessSync(path.join(pathToTest, dartExecutableName), fs.X_OK);
		return true; // If no error, we found a match!
	}
	catch (e) { }

	return false; // Didn't find it, so must be an invalid path.
}

export interface Location {
	startLine: number;
	startColumn: number;
	length: number;
}

export function toPosition(location: Location): vs.Position {
	return new vs.Position(location.startLine - 1, location.startColumn - 1);
}

export function toRange(location: Location): vs.Range {
	let startPos = toPosition(location);
	return new vs.Range(startPos, startPos.translate(0, location.length));
}

export function getDartSdkVersion(sdkRoot: string): string {
	try {
		return fs.readFileSync(path.join(sdkRoot, "version"), "utf8").trim();
	}
	catch (e) {
		return null;
	}
}

export function isAnalyzable(document: vs.TextDocument): boolean {
	if (document.isUntitled || !document.fileName)
		return false;

	if (!isWithinRootPath(document.fileName))
		return false;

	const analyzableLanguages = ["dart", "html"];
	const analyzableFilenames = [".analysis_options", "analysis_options.yaml"];

	return analyzableLanguages.indexOf(document.languageId) >= 0
		|| analyzableFilenames.indexOf(path.basename(document.fileName)) >= 0;
}

export function isWithinRootPath(file: string) {
	// asRelativePath returns the input if it's outside of the rootPath.
	// Edit: Doesn't actually work properly:
	//   https://github.com/Microsoft/vscode/issues/10446
	//return workspace.asRelativePath(document.fileName) != document.fileName;

	return vs.workspace.rootPath != null && file.startsWith(vs.workspace.rootPath + path.sep);
}

/**
 * A class to parse the given text and convert between offset and line:col
 * coordinates.
 */
export class TextDocumentImpl {
	fileName: string;
	text: string;
	lineOffsets: Array<number>;

	constructor(fileName: string, text: string) {
		this.fileName = fileName;
		this.text = text;
	}

	positionAt(offset: number): vs.Position {
		offset = Math.max(Math.min(offset, this.text.length), 0);
		let lineOffsets = this.getLineOffsets();
		let low = 0, high = lineOffsets.length;
		if (high === 0)
			return new vs.Position(0, offset);
		while (low < high) {
			let mid = Math.floor((low + high) / 2);
			if (lineOffsets[mid] > offset)
				high = mid;
			else
				low = mid + 1;
		}

		let line = low - 1;
		return new vs.Position(line, offset - lineOffsets[line]);
	}

	offsetAt(position: vs.Position): number {
		let lineOffsets = this.getLineOffsets();
		if (position.line >= lineOffsets.length)
			return this.text.length;
		else if (position.line < 0)
			return 0;
		let lineOffset = lineOffsets[position.line];
		let nextLineOffset = (position.line + 1 < lineOffsets.length)
			? lineOffsets[position.line + 1]
			: this.text.length;
		return Math.max(Math.min(lineOffset + position.character, nextLineOffset), lineOffset);
	}

	private getLineOffsets(): Array<number> {
		if (this.lineOffsets == null) {
			let lineOffsets = [];
			let text = this.text;
			let isLineStart = true;
			for (let i = 0; i < text.length; i++) {
				if (isLineStart) {
					lineOffsets.push(i);
					isLineStart = false;
				}
				let ch = text.charAt(i);
				isLineStart = (ch === '\r' || ch === '\n');
				if (ch === '\r' && i + 1 < text.length && text.charAt(i + 1) === '\n')
					i++;
			}
			if (isLineStart && text.length > 0)
				lineOffsets.push(text.length);
			this.lineOffsets = lineOffsets;
		}
		return this.lineOffsets;
	}
}
