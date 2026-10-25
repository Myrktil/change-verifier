import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { PatternParser } from "./pattern-parser";
import { getInvalidChanges } from "./change-verifier";
import { parseChanges } from "./change-parser";

function setOutputs(
    exitStatus: number,
    invalidChangesPath = "",
    message = ""
) {
    console.log(`Exit status: ${exitStatus}`);
    console.log(`Invalid changes file: ${invalidChangesPath}`);
    console.log(`Message: ${message}`);

    core.setOutput("status", String(exitStatus));
    core.setOutput("invalid_changes", invalidChangesPath);
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

        const content = fs.readFileSync(changesPathInput, 'utf-8');
        const changes = parseChanges(content);
        const invalidChanges = await getInvalidChanges(changes, parsedPattern);
        const output = invalidChanges.map(([file, status]) => ({ file, status }));
        const outputDirectory = fs.mkdtempSync(
            path.join(process.env.RUNNER_TEMP || os.tmpdir(), "change-verifier-")
        );
        const invalidChangesPath = path.join(outputDirectory, "invalid-changes.json");
        fs.writeFileSync(invalidChangesPath, JSON.stringify(output, null, 2));

        if (invalidChanges.length > 0) {
            setOutputs(1, invalidChangesPath);
        } else {
            setOutputs(0, invalidChangesPath);
        }
    } catch (error) {
        if (error instanceof Error) {
            const message = `Test failed due to a runtime exception.\n${error.name}\n${error.message}\n${error.stack}`
            setOutputs(2, "", message);
            core.setFailed(error);
        }
    }
}
