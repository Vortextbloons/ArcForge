# 24. Safety Rules

## 24.1 Forbidden by Default

```txt
Arbitrary shell execution
Writing outside project folder
Deleting project root
Editing generated output
Editing package lockfiles
Installing dependencies
Modifying engine internals
Uploading project data remotely
```

## 24.2 Require User Approval

```txt
Script write
Prefab write
Scene destructive edits
Asset imports from outside project
Exporting builds
Plugin creation
Dependency installation
Engine modifications
```

## 24.3 Allowed by Default

```txt
Read docs
Read component schemas
Read scene summaries
Read project metadata
Read script files
Run preview
Run validation
Run typecheck
```
