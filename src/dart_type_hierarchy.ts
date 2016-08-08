"use strict";

import { window, commands, ExtensionContext, TextEditor, TextEditorEdit } from "vscode";
import { Analyzer } from "./analyzer";
import { SearchGetTypeHierarchyResponse } from "./analysis_server_types";

export class DartTypeHierarchy {
	private analyzer: Analyzer;

	constructor(context: ExtensionContext, analyzer: Analyzer) {
		this.analyzer = analyzer;

		context.subscriptions.push(
            commands.registerTextEditorCommand('dart.typeHierarchy', this.typeHierarchy, this)
        );
	}

    typeHierarchy(editor: TextEditor, editBuilder: TextEditorEdit) {
		// fire off a request for the type hierarchy
		let document = editor.document;
		let result = this.analyzer.searchGetTypeHierarchy({
			file: document.fileName,
			offset: document.offsetAt(editor.selection.start),
			superOnly: false
		});

		// open select dialog
		window.showQuickPick(result.then(searchResult => {
			let hierarchyItems = searchResult.hierarchyItems;
			// TODO:

			console.log(hierarchyItems.map(h => h.displayName));

			// TODO: render result
			return hierarchyItems.map(h => h.displayName).filter(n => n != null);
		})).then(result => {
			// TODO:
			console.log(result);
		});
    }
}
