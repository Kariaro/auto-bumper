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
             * If this field is true then you need to add comments to
             * the lines that will be changed.
             * 
             * To replace the same line use: // $auto-bumper
             * To replace the next line use: // $auto-bumper-line
             *
             * Otherwise all strings matching the version will be
             * replaced in the specified file.
             */
            "safeMatching": false,

            /** (Experimental) (Optional)
             * 
             * This field can only be used when "safeMatching" is true.
             * This stage will run after the versions has been replaced.
             * 
             * You have access to two variables ${previousVersion} and
             * ${releaseVersion}. You can include these in your regex string.
             */
            "regexReplace": [
              {
                "regex": "@since ${previousVersion}-SNAPSHOT",
                "value": "@since ${releaseVersion}-SNAPSHOT"
              }
            ]
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
