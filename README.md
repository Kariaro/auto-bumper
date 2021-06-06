# Auto-Bumper Plugin

A version bumping plugin for auto.

This plugin only modifies versions inside strings like these:
`"string"`, `'string'`, `` `string` ``

**Important:** This plugin is dependant on `@auto-it/maven` and needs to be placed before `maven` inside the plugins list.

## Installation

This plugin is not included with the `auto` CLI installed via NPM. To install:

```bash
npm i --save-dev auto-plugin-auto-bumper
# or
yarn add -D auto-plugin-auto-bumper
```

## Usage

`safeMatching`: Default `true`

If this field is `true` then only lines that ends with `// $auto-bumper` will be changed.

If `false` all strings matching the version will be replaced in the specified files.


```json
{
  "plugins": [
    [
      "auto-plugin-auto-bumper",
      {
        "files": [
          {
            "path": "/path/to/resource",
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
