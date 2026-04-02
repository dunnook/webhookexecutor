# WebSocket Executor

A simple VS Code extension to run `.lua` and `.luau` scripts directly from the editor or file explorer using WebSockets. Inspired by Code Runner, but optimized for Lua/Luau workflows.

## Features

- Run `.lua` and `.luau` files directly from the editor.
- Run files from the Explorer context menu.
- Redirects print, warn, err to vsc
## Set this as autoexec
```
local HttpService = game:GetService("HttpService")
local LocalPlayer = game:GetService("Players").LocalPlayer
local ws = WebSocket.connect("ws://localhost:9000/ws")

local function send(category : string, content : string)
    local Payload = {
        user = LocalPlayer.Name.." ["..LocalPlayer.DisplayName.."]",
        timestamp = os.clock(),
        data = {
            category = category,
            content = content
        }
    }
    ws:Send(HttpService:JSONEncode(Payload))
end

ws.OnMessage:Connect(function(msg)
    local RecievedData = HttpService:JSONDecode(msg)
    if RecievedData.action == "execute" and RecievedData.content then
        local a, b = pcall(function()
            loadstring(RecievedData.content)()
        end)
        if not a then
            send("showError", "Script errored:\n"..b)
        end
    end
end)
local oldPrint = print
local oldWarn = warn
getgenv().print = function(...)
    send("showPrint", table.concat({...}, "\t"))
    return oldPrint(...)
end
getgenv().warn = function(...)
    send("showWarn", table.concat({...}, "\t"))
    return oldWarn(...)
end
while task.wait(2) do
    send("connect", "")
end
```
