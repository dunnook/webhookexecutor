
const vscode = require('vscode')
const express = require("express")
const expressWs = require("express-ws")
const TIMEOUT = 10000
let clients = new Map()
let selectedClient = null
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const output = vscode.window.createOutputChannel("WebSocket Executor")
	output.show(true)
	const app = express()
	expressWs(app)

	class RobloxSessionsProvider {
		constructor() {
			this._onDidChangeTreeData = new vscode.EventEmitter()
			this.onDidChangeTreeData = this._onDidChangeTreeData.event 
		}

        getTreeItem(element) {
            return element
        }

        getChildren() {
			let items = []
			for (let [ws, username] of clients.entries()) {
				const item = new vscode.TreeItem(username, vscode.TreeItemCollapsibleState.None)
				item.command = {
					command: "websocket-executor.selectClient",
					title: "Select Client",
					arguments: [ws]
				}
				item.contextValue = "clientItem"
				item.wsItem = ws
				items.push(item)
			}
			return items
		}
		refresh() {
			this._onDidChangeTreeData.fire()
		}
    }
	const sessionsProvider = new RobloxSessionsProvider()
	const treeView = vscode.window.createTreeView("robloxSessions", {
		treeDataProvider: sessionsProvider
	})
	const selectClientCmd = vscode.commands.registerCommand("websocket-executor.selectClient", (ws) => {
		selectedClient = ws
		output.appendLine("Selected Client: " + clients.get(ws))
	})
	context.subscriptions.push(selectClientCmd)
	app.ws("/ws", (ws, req) => {
		output.appendLine("Client connected")

		clients.set(ws, "Unknown-" + Date.now().toString())
		sessionsProvider.refresh()

		let idleTimer = setTimeout(() => {
			output.appendLine("Client idle for too long, kicking...")
			ws.close(4000, "Idle timeout")
		}, TIMEOUT)

		const resetTimer = () => {
			clearTimeout(idleTimer)
			idleTimer = setTimeout(() => {
				output.appendLine("Client idle for too long, kicking...")
				ws.close(4000, "Idle timeout")
			}, TIMEOUT)
		}

		ws.on("message", (msg) => {
			resetTimer()
			const ParsedData = JSON.parse(msg)
			clients.set(ws, ParsedData.user)
			if (ParsedData.data.category == "showError") {
				output.appendLine("Error occured for " + ParsedData.user + ":\n" + ParsedData.data.content)
			} else if (ParsedData.data.category == "showPrint") {
				output.appendLine(ParsedData.user + " printed :\n" + ParsedData.data.content)
			} else if (ParsedData.data.category == "showWarn") {
				output.appendLine(ParsedData.user + " warned :\n" + ParsedData.data.content)
			}
			treeView.message = "Connected Clients: " + clients.size.toString()
			sessionsProvider.refresh()
		})

		ws.on("close", () => {
			clients.delete(ws)
			if (selectedClient === ws) selectedClient = null
			treeView.message = "Connected Clients: " + clients.size.toString()
			sessionsProvider.refresh()
			clearTimeout(idleTimer)
			output.appendLine("Client disconnected")
		})
	})

	app.listen(9000, () => console.log("Running on 9000"))

	output.appendLine("Console started")

	const runexecutorCmd = vscode.commands.registerCommand('websocket-executor.runexecutor', function () {
		const editor = vscode.window.activeTextEditor
		if(!editor) return vscode.window.showErrorMessage("No active window!")
		if (!selectedClient) return vscode.window.showErrorMessage("No session selected!")
		if (!editor.document.fileName.endsWith(".lua") && !editor.document.fileName.endsWith(".luau")) return vscode.window.showErrorMessage("Only .lua or .luau files can be executed!")
		const code = editor.document.getText()
		selectedClient.send(JSON.stringify({ action: "execute", content: code }))
		output.appendLine("Executing for " + clients.get(selectedClient))
	})

	context.subscriptions.push(runexecutorCmd)

	const runOnClientCmd = vscode.commands.registerCommand("websocket-executor.runOnClient", (ws) => {
		if (!ws) return vscode.window.showErrorMessage("No session selected!")
		const editor = vscode.window.activeTextEditor
		if (!editor) return vscode.window.showErrorMessage("No active editor!")
		if (!editor.document.fileName.endsWith(".lua") && !editor.document.fileName.endsWith(".luau")) return vscode.window.showErrorMessage("Only .lua or .luau files can be executed!")
		const code = editor.document.getText()	
		ws.wsItem.send(JSON.stringify({ action: "execute", content: code }))
		output.appendLine("Executing for " + clients.get(ws.wsItem) + "\n" + code)
	})

	context.subscriptions.push(runOnClientCmd)
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
