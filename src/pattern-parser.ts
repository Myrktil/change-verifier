import { FileStatus } from "./types";


const STATUS_ANNOTATION_SYNTAX = "$status:";
const FOLDER_WILDCARD_REGEX = /<[^>]*>/g;

export class PatternParser {
    private gitignores: Map<FileStatus, string>;

    constructor(pattern: string, folderWildcardReplacements: string[]) {
        this.gitignores = this.parsePattern(pattern, folderWildcardReplacements);
    }

    public getGitignoreFor(fileStatus: FileStatus): string | undefined {
        return this.gitignores.get(fileStatus);
    }

    /**
     * Parse a custom pattern file into it's .gitignore equivalent.
     * Each line of the custom syntax is one of the following:
     *     a comment (starting with '#')
     *     a .gitignore glob
     *     a status annotation ("$status:status1&status2&status3")
     *
     * In the globs a folder may be replaced with r"<[^>]*>". For each value in folder_wildcard_replacements
     * a new glob will be created where that pattern is replaced with the respective replacement.
     *
     * A status annotation can be followed by any number of values of the FileStatus enum. Multiple values need to be connected by '&'.
     * All globs following that annotation, until the next status annotation, will be sorted into each of the named status' .gitignore.
     */
    private parsePattern(pattern: string, folderWildcardReplacements: string[]): Map<FileStatus, string> {
        const parsedLines = new Map<FileStatus, string[]>();
        const lines = pattern
            .split(/\r?\n/)
            // Replace wildcards.
            .flatMap(line => {
                const regex = new RegExp(FOLDER_WILDCARD_REGEX.source, FOLDER_WILDCARD_REGEX.flags);

                if (!regex.test(line)) return [line];

                return folderWildcardReplacements.map(replacement =>
                    line.replace(regex, replacement)
                );
            })
            .map(line => {
                return line.trim();
            });

        let statusList: FileStatus[] = [];

        // Sort changes into categories.
        for (let i = 0; i < lines.length; i += 1) {
            let line = lines[i];

            // Ignore comments and empty lines.
            if (line.startsWith("#") || !line) {
                continue;
            }

            // Parse status annotations.
            if (line.startsWith(STATUS_ANNOTATION_SYNTAX)) {
                // Ignore any whitespaces for easier parsing.
                line = line.replace(/\s+/g, "");

                const annotationValue = line.slice(STATUS_ANNOTATION_SYNTAX.length);
                if (!annotationValue) {
                    throw new Error(`Failed to parse pattern. No file status provided after '${STATUS_ANNOTATION_SYNTAX}' in line ${i + 1}`);
                }

                const newStatuses: FileStatus[] = [];
                for (const value of annotationValue.split("&")) {
                    newStatuses.push(value as FileStatus);
                }

                statusList = newStatuses;
                continue;
            }

            if (statusList.length > 0) {
                for (const status of statusList) {
                    const existing = parsedLines.get(status) ?? [];
                    existing.push(line);
                    parsedLines.set(status, existing);
                }
            } 
            else {
                throw new Error(`Failed to parse pattern. No file status was provided for line ${i + 1}.`);
            }
        }

        const parsedGitignores = new Map<FileStatus, string>();
        for (const [key, value] of parsedLines.entries()) {
            parsedGitignores.set(key, value.join("\n"));
        }

        return parsedGitignores;
    }
}