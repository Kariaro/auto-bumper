import { Auto, IPlugin, validatePluginConfiguration } from '@auto-it/core';
import { parse } from 'pom-parser';
import { inc, ReleaseType } from 'semver';
import { promisify } from 'util';
import * as t from 'io-ts';

import { EOL } from 'os';
import fs from 'fs';

// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
const escapeStringRegexp = (str: string) => {
  // $& means the whole matched string
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Maven snapshot suffix */
const snapshotSuffix = "-SNAPSHOT";

/** Parse the pom.xml file **/
const parsePom = promisify(parse);

/** Get the maven pom.xml for a project **/
export const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });

const fileOptions = t.partial({
	/** The relative path of the file */
	path: t.string,

  /**
   * Default: `true`
   * If `true` will only replace literals on the same line as a comment
   * `// $auto-bumper`
   * 
   * If `false` will update all literals in the file containing the current
   * version.
   */
   safeMatching: t.boolean
});

const pluginOptions = t.partial({
  /** File that should be updated */
	files: t.array(fileOptions)
});

export type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;

export interface IAutoBumperProperties {
  /** Current version */
  version?: string;
};

export interface IAutoBumperFile {
  /**
   * The line ending of the file
   */
  lineEnding: string,

  /**
   * The lines inside the file
   */
  lines: string[],
}

/** A version bumping plugin for auto */
export default class AutoBumperPlugin implements IPlugin {
  /** The name of the plugin */
  name = 'auto-bumper';

  /** The options of the plugin */
  options: IAutoBumperPluginOptions;

  /** Cached properties */
  properties: IAutoBumperProperties = {};

  /** Initialize the plugin with it's options */
  constructor(options: IAutoBumperPluginOptions) {
    this.options = options;
  }

  async getProperties(): Promise<IAutoBumperProperties> {
    const pom = await getPom();
    
    return {
      version: pom.pomObject?.project.version
    };
  }


  async readFile(path: string): Promise<IAutoBumperFile> {
    const data = fs.readFileSync(path);
    const lines = data.toString().split(/\r?\n/);

    let idx_r = data.indexOf('\r');
    if(idx_r < 0) {
      return {
        lineEnding: EOL,
        lines: lines
      };
    }

    let idx_n = data.indexOf('\n');
    /** If the index of ('\r' + 1) == '\n' */
    if(idx_r + 1 === idx_n) {
      return {
        lineEnding: '\r\n',
        lines: lines
      };
    }

    return {
      lineEnding: '\r',
      lines: lines
    };
  }
  /**
   * Bump literals with version information inside the specified file
   */
  async bumpFile(auto: Auto, path: string, old_version: string, next_version: string, safeMatching: boolean) {
    auto.logger.verbose.log('File: "' + path + '", safeMatching=' + safeMatching);

    const old_version_escaped = escapeStringRegexp(old_version);
    const replaceRegex = (str: string) => {
      return str
        .replace(new RegExp(`"${old_version_escaped}"`), `"${next_version}"`)
        .replace(new RegExp(`'${old_version_escaped}'`), `'${next_version}'`)
        .replace(new RegExp(`\`${old_version_escaped}\``), `\`${next_version}\``);
    };

    const data = await this.readFile(path);
    auto.logger.veryVerbose.log('  lines: "' + (data.lines.length) + '"');
    auto.logger.veryVerbose.log('  lineEnding: "' + (data.lineEnding === '\r' ? '\\r':'\\r\\n') + '"');

    let modified = false;
    let content = [];
    for(const line of data.lines) {
      let replacedLine;
      if(safeMatching) {
        // Use a comment to make sure we have the correct literal
        // $auto-bumper
        if(/\/\/[ \t]*\$auto-bumper[ \t]*/.test(line)) {
          replacedLine = replaceRegex(line);
        } else {
          replacedLine = line;
        }
      } else {
        /** Escape all quote types */
        replacedLine = replaceRegex(line);
      }

      if(replacedLine !== line) {
        modified = true;
      }

      content.push(replacedLine);
    }

    auto.logger.veryVerbose.log('  modified: ' + modified);
    if(modified) {
      const joined_string = content.join(data.lineEnding);
      auto.logger.veryVerbose.log('  source: ' + joined_string);
      
      fs.writeFile(path, joined_string, (err) => {
        if(err) throw err;
        auto.logger.log.log('Successfully modified: "' + path + "'");
      });
    }
  }

  /** Tap into auto plugin points. */
  apply(auto: Auto) {
    auto.hooks.beforeRun.tapPromise(this.name, async () => {
      this.properties = await this.getProperties();
    });

    auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
      // If it's a string thats valid config
      if(name === this.name && typeof options !== "string") {
        return validatePluginConfiguration(this.name, pluginOptions, options);
      }
    });

    auto.hooks.version.tapPromise(this.name, async ({ bump }) => {
      const currentVersion = this.properties.version;
      if(!currentVersion) {
        auto.logger.log.info('Error reading current version');
        return;
      }

      const releaseVersion = inc(currentVersion, bump as ReleaseType);
      auto.logger.log.log('Version-AUTO-BUMPER: current=' + currentVersion + ', release=' + releaseVersion);

      if(releaseVersion) {
        /** Update files specified in the files argument and bump version */
        let files = this.options.files || [];
        for(let i = 0; i < files.length; i++) {
          let element = files[i];

          let path = element.path;
          let safeMatching = element.safeMatching == undefined ? true:element.safeMatching;

          if(path) {
            await this.bumpFile(auto, path, currentVersion, releaseVersion, safeMatching);
          }
        }
      }
    });
  }

  /** Get the version from the current pom.xml **/
  async getVersion(auto: Auto): Promise<string> {
    this.properties = await this.getProperties();
    const { version } = this.properties;

    if(version) {
      auto.logger.verbose.info(`Found version in pom.xml: ${version}`);
      return version.replace(snapshotSuffix, "");
    }

    return "0.0.0";
  }
}
