Dim objShell, strRuta
Set objShell = CreateObject("WScript.Shell")
strRuta = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
objShell.CurrentDirectory = strRuta
objShell.Run "py """ & strRuta & "app.py""", 0, False
WScript.Sleep 1800
objShell.Run "http://localhost:5000"
Set objShell = Nothing
