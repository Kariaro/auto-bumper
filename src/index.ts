import { Auto, IPlugin, validatePluginConfiguration } from '@auto-it/core';
// import MavenPlugin from '@auto-it/maven';
import { parse } from 'pom-parser';
import { inc, ReleaseType } from 'semver';
import { promisify } from 'util';
import * as t from 'io-ts';

import escapeStringRegexp from 'escape-string-regexp';
import fs from 'fs';
import readline from 'readline';


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

  /**
   * Bump literals with version information inside the specified file
   */
  async bumpFile(path: string, old_version: string, next_version: string, safeMatching: boolean) {
    console.log('File: "' + path + '", safeMatching=' + safeMatching);

    const fileStream = fs.createReadStream(path);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const old_version_escaped = escapeStringRegexp(old_version);
    const next_version_escaped = escapeStringRegexp(next_version);
    const replaceRegex = (str: string) => {
      return str
        .replace(`"${old_version_escaped}"`, `"${next_version_escaped}"`)
        .replace(`'${old_version_escaped}'`, `'${next_version_escaped}'`)
        .replace(`\`${old_version_escaped}\``, `\`${next_version_escaped}\``);
    };

    let modified = false;
    let content = [];
    for await(const line of rl) {
      let replacedLine;
      if(safeMatching) {
        // Use a comment to make sure we have the correct literal
        // $auto-bumper
        // TODO:

        if(/\/\/[ \t]*\$auto-bumper[ \t]*/.test(line)) {
          replacedLine = replaceRegex(line);
        }
      } else {
        /** Escape all quote types */
        replacedLine = replaceRegex(line);
      }

      if(replacedLine !== line) {
        console.log(`Replaced line in file: ${replacedLine}`);
        modified = true;
      }

      content.push(replacedLine);
    }

    if(modified) {
      console.log('Modifying file: "' + path + '"');

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
            await this.bumpFile(path, currentVersion, releaseVersion, safeMatching);
          }
        }
      }
    });

    /*
    auto.hooks.afterShipIt.tapPromise(this.name, async ({ dryRun }) => {
      // Update files
      for(let element in this.options.files) {
        console.log(element);
      }
    });
    */
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
