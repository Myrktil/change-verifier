import * as core from "@actions/core";
import { PatternParser } from "./pattern-parser";
import { getInvalidChanges } from "./change-verifier";
import { parseChanges } from "./change-parser";

function setOutputs(
    exitStatus: number, 
    invalidChanges: Array<{ file: string; status: string }> = [], 
    message = ""
) {
    console.log("Script exited with the following outputs:");
    console.log(`Status: ${exitStatus}`);
    console.log(`Invalid changes (not pretty printed in output var): ${JSON.stringify(invalidChanges, null, 2)}`);
    console.log(`Message: ${message}`);

    core.setOutput("status", String(exitStatus));
    core.setOutput("invalid_changes", JSON.stringify(invalidChanges));
    core.setOutput("message", message);
}

export async function run() {
    try {
        const changesPathInput = core.getInput("changes_path", { required: true });
        const patternInput = core.getInput("pattern", { required: true });
        const wildcardReplacementsInput = core.getInput("wildcard_replacements", { required: false });

        const wildcardReplacements = JSON.parse(wildcardReplacementsInput);
        if (!Array.isArray(wildcardReplacements) || 
            !wildcardReplacements.every(item => typeof item === "string")
        ) {
            throw Error(`Invalid wildcard replacement syntax. Provided value:\n${wildcardReplacementsInput}`);
        }

        const parsedPattern = new PatternParser(patternInput, wildcardReplacements);

        const fs = require("fs")
        const content = fs.readFileSync(changesPathInput, 'utf-8');
        const changes = parseChanges(content);
        const invalidChanges = await getInvalidChanges(changes, parsedPattern);

        if (invalidChanges.length > 0) {
            const output = invalidChanges.map(([file, status]) => ({ file, status: status }));
            setOutputs(1, output);
        } else {
            setOutputs(0);
        }
    } catch (error) {
        if (error instanceof Error) {
            const message = `Test failed due to a runtime exception.\n${error.name}\n${error.message}\n${error.stack}`
            setOutputs(2, [], message);
            core.setFailed(error);
        }
    }
}
