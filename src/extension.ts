// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as readline from 'node:readline';
import { fetch } from 'undici';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProofStatePanel } from "./panels/ProofStatePanel";
import { readFileSync } from 'fs';
const fs = require('fs');
var coq: ChildProcessWithoutNullStreams;
var reader: readline.Interface;
var targetFilePath:string;
var currDirPath:string;


function findWorcshopDir(startPath: string) {
    let currentPath = startPath;
    while (currentPath !== path.dirname(currentPath)) { 
        if (path.basename(currentPath) === 'worcshop') {
            return currentPath;
        }
        currentPath = path.dirname(currentPath); 
    }
    throw new Error("Error: 'worcshop' directory was not found.");
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("activation");
    vscode.workspace.onDidSaveTextDocument((document) => {
        const startPath = __dirname;
        const worcshopDir = findWorcshopDir(startPath);
        const progs64DirPath = path.join(worcshopDir, 'src', 'proofgen.v');
        const filePath = path.dirname(document.uri.fsPath);
        targetFilePath = path.join(filePath, "proofgen.v");

        fs.copyFile(progs64DirPath, targetFilePath, (err: any) => {
            if (err) {
                console.error(`Failed to copy file: ${err}`);
                vscode.window.showErrorMessage('Error copying file to progs64 directory.');
            } else {
                vscode.window.showInformationMessage(`${filePath} file copied`);
            }
        });

        // Process C files: Generate and save .v files
        if (document.languageId === "c") {
            generateAndSaveVFile(document.fileName);
        }
    });

    console.log('Congratulations, your extension "worcshop" is now active!');
}

function generateAndSaveVFile(cFilePath: string) {
    let parsedPath = path.parse(cFilePath);
    const newFilePath = path.join(parsedPath.dir, parsedPath.name + '.v');
    const verifInputPath = path.join(parsedPath.dir, "verif_input.v");
    console.log("🔍 Expected output file:", targetFilePath);
    const worcshopDir = findWorcshopDir(__dirname);
    const vstPath = path.join(worcshopDir, "VST-A-artifact", "VST-patch");
    console.log("filepath is");   

    const flags = [
        `-Q ${worcshopDir} TOP`,
        `-Q ${path.join(vstPath, "msl")} VST.msl`,
        `-Q ${path.join(vstPath, "sepcomp")} VST.sepcomp`,
        `-Q ${path.join(vstPath, "veric")} VST.veric`,
        `-Q ${path.join(vstPath, "floyd")} VST.floyd`,
        `-R ${path.join(vstPath, "compcert")} compcert`,
        `-Q ${path.join(vstPath, "zlist")} VST.zlist`,
    //     `-Q /home/harsh/Desktop/BITSLAB/worcshop/examples VST.progs64 \
    //  /home/harsh/Desktop/BITSLAB/worcshop/test/proofgen.v`
    ].join(" ");

    const clightgenCommand = `clightgen -normalize ${cFilePath} && coqc ${flags} ${newFilePath} && coqc ${flags} ${targetFilePath} > ${verifInputPath}`;

    const { exec } = require("child_process");

    exec(clightgenCommand, (err: any, stdout: any, stderr: any) => {
        if (err) {
            console.error(`Error while executing clightgen: ${err}`);
            return;
        }
        if (stderr) {
            console.log(`clightgen stderr: ${stderr}`);
        } else {
            console.log(`${newFilePath} has been successfully generated.`);
        }
          const vFileUri = vscode.Uri.file(newFilePath);
          vscode.commands.executeCommand('vscode.open', vFileUri)
              .then(() => {
                setTimeout(() => {
                    vscode.commands.executeCommand('extension.coq.interpretToEnd');
                    // vscode.commands.executeCommand('vscoq.displayProofView');
                  }, 1000);
              });
    });
}

export function deactivate() {}