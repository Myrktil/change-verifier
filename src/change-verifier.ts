import { PatternParser } from "./pattern-parser";
import { FileStatus } from "./types";
import { getIgnored } from "./git-client";

type InvalidChange = [string, FileStatus];

/**
 * Compare a list of changes against a pattern of allowed changes and returns the invalid changes.
 * @param  changes  A list of paths to changed files sorted by the files status.
 * @param  pattern  The parsed pattern to compare the changes against.
 * @return  The filepath and status for each invalid change.
 */
export async function getInvalidChanges(
    changes: Record<FileStatus, string[]>, 
    pattern: PatternParser
): Promise<Array<InvalidChange>> {
    const promises = Object.keys(changes).map(async (status) => {
        const changesForStatus = changes[status] ?? [];
        // No changes for status.
        if (!changesForStatus || changesForStatus.length === 0) {
            return [] as InvalidChange[];
        }

        const patternForStatus = pattern.getGitignoreFor(status);
        // No allowed changes for status.
        if (patternForStatus === undefined) {
            return changesForStatus.map(change => [change, status]) as InvalidChange[];
        }

        try {
            const ignoredChanges = await getIgnored(changesForStatus, patternForStatus);

            return changesForStatus
                .filter(change => !ignoredChanges.has(change))
                .map(change => [change, status]) as InvalidChange[];
        }
        catch (e) {
            const error = e as Error;
            error.message = `Failed to validate changes for status "${status}".\n${error.message}`;
            throw error;
        }
    });

    const results = await Promise.all(promises);
    return results.flat();
}
