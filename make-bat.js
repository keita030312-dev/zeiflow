const fs = require("fs");
const path = require("path");

// Shift-JIS bytes for デスクトップ
const sjisDesktop = Buffer.from([0x83,0x66,0x83,0x58,0x83,0x4e,0x83,0x67,0x83,0x62,0x83,0x76]);

const line1 = Buffer.from("@echo off\r\n", "ascii");
const line2a = Buffer.from('cd /d "C:\\Users\\keita\\OneDrive\\', "ascii");
const line2b = Buffer.from('\\zeiflow"\r\n', "ascii");
const line3 = Buffer.from('start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"\r\n', "ascii");
const line4 = Buffer.from('call "C:\\Program Files\\nodejs\\npm.cmd" run start\r\n', "ascii");
const line5 = Buffer.from("pause\r\n", "ascii");

const buf = Buffer.concat([line1, line2a, sjisDesktop, line2b, line3, line4, line5]);

const outDir = path.join("C:\\Users\\keita\\OneDrive", "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7");
const outPath = path.join(outDir, "ZeiFlow\u8D77\u52D5.bat");
fs.writeFileSync(outPath, buf);
console.log("OK:", outPath);
