import { spawn } from "child_process";
import { createInterface } from "readline";
import { once } from "events";
import { join } from "path";
import { tmpdir } from "os";
import { writeFileSync, unlinkSync } from "fs";

/**
 * Get the output of git --check-ignore.
 * @param  paths  A list of filepaths.
 * @param  gitignore  A string containing valid gitignore syntax to compare against.
 * @return  A list of the ignored filepaths.
 */
export async function getIgnored(paths: string[], gitignore: string): Promise<Set<string>> {
    const ignored = new Set<string>();
    await checkIgnore(paths, gitignore, (path) => {
        ignored.add(path);
    });
    return ignored;
}

async function checkIgnore(
    paths: string[], 
    gitignore: string,
    onIgnored: (path: string) => any, 
) {
    const tmpFile = join(tmpdir(), `pattern-${Date.now()}.gitignore`);
    writeFileSync(tmpFile, gitignore, "utf8");

    const git = spawn("git", 
        [
            "-c",
            `core.excludesFile=${tmpFile}`,
            "-c", 
            "core.attributesFile=/dev/null", // Ignore global gitattributes.
            "check-ignore",
            "--no-index",
            "--stdin",
        ]
    );

    const rl = createInterface({
        input: git.stdout,
        crlfDelay: Infinity,
    });

    rl.on("line", onIgnored);
    git.stderr.on("data", (chunk) => {
        throw Error("Failed to check ignore due to an error in the git subprocess.\nError: " + chunk.toString());
    });

    for (const path of paths) {
        if (!git.stdin.write(path + "\n")) {
            await once(git.stdin, "drain");
        }
    }

    const closePromise = once(git, "close");
    git.stdin.end();
    const [code] = await closePromise;

    rl.close();
    unlinkSync(tmpFile);

    // Only codes greater than 1 are errors for git --check-ignore.
    if (code > 1) {
        throw new Error(`Failed to check ignore. git exited with code ${code}`);
    }
}
