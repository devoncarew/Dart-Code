"use strict";

import * as as from "../analysis/analysis_server_types";
import * as fs from "fs";
import * as vs from "vscode";
import { Analyzer } from "../analysis/analyzer";
import * as util from "../utils";

export class DartRenameProvider implements vs.RenameProvider {
	private analyzer: Analyzer;
	constructor(analyzer: Analyzer) {
		this.analyzer = analyzer;
	}

	provideRenameEdits(
		document: vs.TextDocument, position: vs.Position, newName: string, token: vs.CancellationToken
	): Thenable<vs.WorkspaceEdit> {
		return new Promise<vs.WorkspaceEdit>((resolve, reject) => {
			this.analyzer.editGetRefactoring({
				kind: "RENAME",
				file: document.fileName,
				offset: document.offsetAt(position),
				length: 0,
				validateOnly: false,
				options: { newName: newName }
			}).then((resp: as.EditGetRefactoringResponse) => {
				if (resp.initialProblems.length > 0) {
					reject(resp.initialProblems[0].message);
					return;
				}

				if (resp.optionsProblems.length > 0) {
					reject(resp.optionsProblems[0].message);
					return;
				}

				let workspaceEdit: vs.WorkspaceEdit = new vs.WorkspaceEdit();
				let documentsResolver = new DocumentsResolver();

				for (let sourceFileEdit of resp.change.edits) {
					let uri = vs.Uri.file(sourceFileEdit.file);
					let resolver: DocumentOffsetResolver = documentsResolver.getResolver(sourceFileEdit.file);

					for (let sourceEdit of sourceFileEdit.edits) {
						let range = new vs.Range(
							resolver.positionAt(sourceEdit.offset),
							resolver.positionAt(sourceEdit.offset + sourceEdit.length)
						);
						workspaceEdit.replace(uri, range, sourceEdit.replacement);
					}
				}

				resolve(workspaceEdit);
			});
		});
	}
}

abstract class DocumentOffsetResolver {
	abstract positionAt(offset: number): vs.Position;
}

/**
 * This class returns DocumentOffsetResolvers for given file paths.
 * 
 * It will prefer to use TextDocuments that are open in the workspace already.
 * Otherwise it will return objects that parse the file from disk and convert
 * between offsets and line:col positions. 
 */
class DocumentsResolver {
	parsedDocs: Array<util.TextDocumentImpl> = [];

	getResolver(file: string): DocumentOffsetResolver {
		for (let document of vs.workspace.textDocuments)
			if (document.fileName == file)
				return document;

		for (let document of this.parsedDocs)
			if (document.fileName == file)
				return document;

		let document = new util.TextDocumentImpl(file, fs.readFileSync(file, "utf8"));
		this.parsedDocs.push(document);
		return document;
	}
}
