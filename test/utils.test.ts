import * as assert from 'assert';
import * as vs from 'vscode';
import * as utils from '../src/utils';

suite("utils", () => {
    test("TextDocumentImpl.positionAt", () => {
		let doc = new utils.TextDocumentImpl("temp.txt", "one\ntwo\nthree");
        
		assert.deepEqual(doc.positionAt(0), new vs.Position(0, 0));
		assert.deepEqual(doc.positionAt(1), new vs.Position(0, 1));
		assert.deepEqual(doc.positionAt(2), new vs.Position(0, 2));
		assert.deepEqual(doc.positionAt(3), new vs.Position(0, 3));
		assert.deepEqual(doc.positionAt(4), new vs.Position(1, 0));
		assert.deepEqual(doc.positionAt(5), new vs.Position(1, 1));
		assert.deepEqual(doc.positionAt(6), new vs.Position(1, 2));
		assert.deepEqual(doc.positionAt(7), new vs.Position(1, 3));
		assert.deepEqual(doc.positionAt(8), new vs.Position(2, 0));
		assert.deepEqual(doc.positionAt(9), new vs.Position(2, 1));
		assert.deepEqual(doc.positionAt(10), new vs.Position(2, 2));
		assert.deepEqual(doc.positionAt(11), new vs.Position(2, 3));
		assert.deepEqual(doc.positionAt(12), new vs.Position(2, 4));
    });

    test("TextDocumentImpl.offsetAt", () => {
		let doc = new utils.TextDocumentImpl("temp.txt", "one\ntwo\nthree");
        
		assert.equal(doc.offsetAt(new vs.Position(2, 0)), 8);
    });
});
