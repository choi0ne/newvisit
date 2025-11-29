Set WshShell = CreateObject("WScript.Shell")
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set fso = CreateObject("Scripting.FileSystemObject")

' 경로 설정
strScriptPath = "C:\Oldvisit\watch_revisit_live.js"
strConfigPath = "C:\Oldvisit\config_view_mode.txt"

' 1. 현재 실행 중인 감시기(node.exe)가 있다면 끕니다 (재시작을 위해)
Set colItems = objWMIService.ExecQuery("Select * from Win32_Process Where Name = 'node.exe'")
For Each objItem in colItems
    If InStr(objItem.CommandLine, "watch_revisit_live.js") > 0 Then
        objItem.Terminate()
    End If
Next

' 2. 현재 모드를 확인하고 반대로 변경합니다
' (파일이 없으면 기본값인 '보이는 모드'에서 '유령 모드'로 가는 것으로 간주)
CurrentMode = "NORMAL"
If fso.FileExists(strConfigPath) Then
    Set file = fso.OpenTextFile(strConfigPath, 1)
    If Not file.AtEndOfStream Then CurrentMode = file.ReadLine
    file.Close
End If

' 모드 전환 로직
If CurrentMode = "GHOST" Then
    ' 유령 -> 정상 모드 (창 보임: 1)
    WshShell.Run "node " & strScriptPath, 1
    
    ' 상태 저장
    Set file = fso.CreateTextFile(strConfigPath, True)
    file.WriteLine "NORMAL"
    file.Close
    
    MsgBox "?? [정상 모드] 창이 보입니다.", 64, "Revisit System"
Else
    ' 정상 -> 유령 모드 (창 숨김: 0)
    WshShell.Run "node " & strScriptPath, 0
    
    ' 상태 저장
    Set file = fso.CreateTextFile(strConfigPath, True)
    file.WriteLine "GHOST"
    file.Close
    
    MsgBox "?? [유령 모드] 창이 숨겨졌습니다.", 64, "Revisit System"
End If

Set WshShell = Nothing
Set objWMIService = Nothing
Set fso = Nothing