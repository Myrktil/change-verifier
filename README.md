# Change Verifier

This GitHub action takes a list of changed files and a list of allowed changes and returns all unallowed changes.  

## Inputs and outputs
See action.yml for the version you want to use for a quick overview.

### Changes list syntax
The changes need to be passed as an array of json objects containg at least the following fields:

```
{
    "filename":
    "status":
}
```

Filename contains the changed file including it's path ( folder1/folder2/changed_file.txt ) and status the file's status.


### Pattern syntax
The pattern is a string where each line is one of the following:  
- a comment (starting with '#')
- a .gitignore glob
- a status annotation ("$status:status1&status2&status3")  

In the globs a folder may be replaced with a string that matches the following RegEx: "<[^>]*>". For each value in wildcard_replacements a new glob will be created where that pattern is replaced with the respective replacement.  
A status annotation can be followed by at least one file status. Multiple status values need to be connected by '&'.
All globs following that annotation, until the next status annotation, will allow changes whose filepath they cover and whose status matches at least one of the statuses in the annotation.

**Example**:
```
# In this folder, only changes with the status "added" are allowed.
$status: added
folder/*

# In the following folders, all changes that have either "added", "modified" or "deleted" as their status are allowed.
$status: added & modified & deleted
folder2/*.txt
folder2/<wildcard>/*
folder2/<also a wildcard, the text between the angle brackets does not matter and can be used for documentation>/*

# Negations are also supported.
# This overwrites the first rule.
# Rules are interpreted from top to bottom.
$status: added
!folder/*
```

### Folder wildcards
Folder wildcards allow dynamic rules in the pattern.  
**v1**: The wildcard_replacements input takes a whitespace seperated lists of values.
**v1.1**: The wildcard_replacements input takes json array of strings.  
For every glob in the provided pattern that contains the wildcard pattern, a new glob will be created for each replacement value where all occurences of that pattern are replaced by that replacement.

**Example**:

Wildcard replacements input: 
```
["folder1", "folder2"]
```
Pattern input:
```
$status: added
<wildcard>/another_folder/<wildcard>/*
```
Parsed pattern:
```
$status: added
folder1/another_folder/folder1/*
folder2/another_folder/folder2/*
```

### File status
A file status is a string that is used to classify what happened to a file. They are not hardcoded into the action so any string can be passed as a status in a change's status field.  
The comparison between a change's status and the status annotations in the allowed patterns file is **case sensitive**.

## Pass and failure behavior
The action passes only fails when a runtime error occurs. This means a passed task does not imply that the changes are valid. Information about the files' validity can be taken from the output's status field.

## Usage example
**v1**:
```
- name: Run review
  id: review
  uses: Myrktil/change-verifier@v1
  with:
    changes_path: full_changes.json
    pattern: |
      $status: added
      *.txt
      !new_file001.txt
    wildcard_replacements: replacement1 replacement2
```
**v1.1**:
```
- name: Run review
  id: review
  uses: Myrktil/change-verifier@v1.1
  with:
    changes_path: full_changes.json
    pattern: |
      $status: added
      *.txt
      !new_file001.txt
    wildcard_replacements: ["replacement1", "replacement2"]
```