// The module 'vscode' contains the VS Code extensibility API
// 'use strict';

import * as vscode from 'vscode';
import * as gemfile from 'gemfile';
import { URI } from 'vscode-uri';

let cache:Map<string, object> = new Map();

class GemfileProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ) {
    let gemRange = document.getWordRangeAtPosition(position, /([A-Za-z\/0-9_-]+)(\.[A-Za-z0-9]+)*/);
    console.log(`gemRange${gemRange?.start?.line}:${gemRange?.end?.line}`);
    let gemName = document.getText(gemRange);
    let lineText = document.lineAt(position.line).text.trim();

    // if (['//', 'git_source', 'group', 'source'].some((element:string) => lineText.startsWith(element))) {
    //   return;
    // }

    if (
      lineText.startsWith("//") ||
      lineText.startsWith("#") ||
      lineText.startsWith("source")
    ) {
      return;
    }

    // if (['require', 'true', 'false', 'group', 'development', 'test', 'production', 'do', 'gem'].indexOf(gemName) !== -1) {
    //   return;
    // }

    if (!gemName || [
      "require",
      "true",
      "false",
      "group",
      "development",
      "test",
      "production",
      "do",
      "gem"
    ].indexOf(gemName) !== -1) {
      return;
    }

    // if (/^\d/.test(gemName)) {
    //   return;
    // }

    if (/^[^a-zA-Z]+$/.test(gemName)) {
      console.log("no alphabet");
      return;
    }

    let endpoint;
    let specs = cache.get(document.uri.fsPath) || {};
    let str;
    if (gemName in specs) {
      let version = specs[gemName].version;
      endpoint = `${gemName}/versions/${version}`;
    } else {
      let src = lineText.split(",")[1].replace(/["\s]/g, "").replace(":", ".com");
      let url = `https://${src}`;
      str = `View [${url}](${url})`;
    }

    if (endpoint) {
      str = `View online rubygems.org for [${endpoint}](https://rubygems.org/gems/${endpoint})`;
    }

    let doc = new vscode.MarkdownString(str);
    let link = new vscode.Hover(doc, gemRange);

    return link;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ruby-gemfile" is now active!');

  const gemFile:vscode.DocumentFilter = {
    // language: "ruby", may not identical as ruby file so commented this
    pattern: "**/Gemfile",
    scheme: "file"
  };

  var mineURIs: Array<string> = [];
  vscode.workspace
    .findFiles("**/Gemfile.lock")
    .then(uris => {
      mineURIs = uris.map(uri => uri.fsPath.substring(0, uri.fsPath.length - 5));
      return Promise.all(uris.map(uri => gemfile.parse(uri.fsPath)));
    })
    .then(infos => {
      for (let i in mineURIs) {
        cache.set(mineURIs[i], infos[i].GEM.specs);
      }
    });

	let disposable = vscode.languages.registerHoverProvider(gemFile, new GemfileProvider());
	let watcher = vscode.workspace.createFileSystemWatcher('**/Gemfile');
  watcher.onDidChange((uri: vscode.Uri) => {
    let specs = gemfile.parseSync(uri.fsPath).GEM.specs;
    cache.set(uri.fsPath.substring(0, uri.fsPath.length - 5), specs);
  });
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
  cache.clear();
}
