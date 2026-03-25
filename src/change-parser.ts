import { FileStatus } from "./types";

export function parseChanges(changesJson: string): Record<FileStatus, string[]> {
    const filesList = JSON.parse(changesJson)
    const parsed = {} as Record<FileStatus, string[]>;

    for (const file of filesList) {
            
        const statusVal = file["status"];
        const filenameVal = file["filename"];

        if (statusVal === undefined || filenameVal === undefined) {
            throw new Error("Unsupported JSON pattern for changes provided.");
        }

        if (!parsed[statusVal]) {
            parsed[statusVal] = [];
        }

        parsed[statusVal].push(filenameVal);
    }

    return parsed;
}