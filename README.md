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
            "unsafeReplace": true,
            "guidedReplace": false
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
