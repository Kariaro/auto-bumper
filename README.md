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

```jsonc
{
  "plugins": [
    [
      "auto-plugin-auto-bumper",
      {
        "files": [
          {
            "path": "/path/to/resource",

            /** (Optional) Default: true
             *
             * If this field is true then you need to add comments
             * to the lines that should be changed.
             * 
             * To replace the same line use: // $auto-bumper
             * To replace the next line use: // $auto-bumper-line
             *
             * If false, all strings matching the version will
             * be replaced.
             */
            "safeMatching": false,

            /** (Experimental) (Optional) Default: false
             * 
             * When this field is true it will override "safeMatching"
             * and all replacements will be routed through ".autobumper.js".
             */
            "scripted": true
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

## Scriptable

Example of how to configure `.autobumper.js`.

```js
const tracker = {
  path: '/path/to/resource',
  task: (contents, previousVersion, releaseVersion) => {
    return contents.replace(
      new RegExp(`@since v${previousVersion}-SNAPSHOT`),
      `@since v${releaseVersion}-SNAPSHOT`
    );
  }
};

module.exports = {
  bumpFiles: [ tracker ]
};
```