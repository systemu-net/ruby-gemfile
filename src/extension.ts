// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
'use strict';

import * as vscode from 'vscode';
import * as gemfile from 'gemfile';

let cache:Map<string, object> = new Map();

class GemfileProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    let range = document.getWordRangeAtPosition(position, /([a-zA-Z\/0-9_\-]+(\.[a-zA-Z0-9]+))*/);
    let gemName = document.getText(range);
    let lineText = document.lineAt(position.line).text.trim();

    if (['//', 'git_source', 'group', 'source'].some((element:string) => lineText.startsWith(element))) {
      return;
    }

    if (['require', 'true', 'false', 'group', 'development', 'test', 'production', 'do', 'gem'].indexOf(gemName) !== -1) {
      return;
    }

    if (/^\d/.test(gemName)) {
      return;
    }

    let endpoint;
    let specs = cache.get(document.uri.fsPath) || {};
    let str;
    if (gemName in specs) {
      let version = 1; //specs[gemName].version;
      endpoint = `${gemName}/version/${version}`;
    } else {
      let src = lineText.split(",")[1].replace(/["\s]/g, "").replace(":", ".com");
      let url = `https://${src}`;
      str = `View [${url}](${url})`;

      if (endpoint) {
        str = `View online RubyGems.org for [${endpoint}](https://rubygems.org/gems/${endpoint})`;
      }

      let doc = new vscode.MarkdownString(str);
      let link = new vscode.Hover(doc, range);
    }
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

  let allUris: Array<string> = [];
  vscode
    .workspace
    .findFiles('**/Gemfile.lock')
    .then(uris => {
      allUris = uris.map(uri => uri.fsPath.substring(0, uri.fsPath.length - 5));
      return Promise.all(uris.map(uri => gemfile.parse(uri.fsPath)));
    })
    .then(infos => {
      for (let i in allUris) {
        cache.set(allUris[i], infos[i].GEM.specs);
      }
    });

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
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
