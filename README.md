# Auto-Bumper Plugin

A version bumping plugin for auto

## Installation

This plugin is not included with the `auto` CLI installed via NPM. To install:

```bash
npm i --save-dev auto-plugin-auto-bumper
# or
yarn add -D auto-plugin-auto-bumper
```

## Usage

```json
{
  "plugins": [
    [
      "auto-plugin-auto-bumper",
      {
        "files": [
          {
            "path": "/path/to/resource",

            // True by default.
            // Add `// $auto-bumper` on the line that the version literal
            // is placed in.
            //
            // If false, auto-bumper will replace all instances of the
            // previous version with the new version inside the file.
            "safeMatching": false
          },
          {
            "path": "/another/resource"
          }
        ]
      }
    ]
    // other plugins
  ]
}
```
