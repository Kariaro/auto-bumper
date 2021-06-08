import { execPromise, Auto, IPlugin, validatePluginConfiguration } from '@auto-it/core'; // , IExtendedCommit
import { parse } from 'pom-parser';
import { inc, ReleaseType } from 'semver';
import { promisify } from 'util';
import * as t from 'io-ts';

import { EOL } from 'os';
import fs from 'fs';

/** Regex esxape a string */
const escapeStringRegexp = (str: string) => {
  // $& means the whole matched string
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Maven snapshot suffix */
const snapshotSuffix = "-SNAPSHOT";

/** Scripted bumper file */
const scriptedBumperFile = ".autobumper.js";

/** Parse the pom.xml file **/
const parsePom = promisify(parse);

/** Get the maven pom.xml for a project **/
export const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });

const fileOptions = t.partial({
	/** The path of the file */
	path: t.string,

  /**
   * If this field is `true` then you need to add comments
   * to the lines that should be changed.
   * 
   * To replace the same line use: `// $auto-bumper`
   * To replace the next line use: `// $auto-bumper-line`
   * 
   * If `false`, all strings matching the version will
   * be replaced.
   */
   safeMatching: t.boolean
});

const pluginOptions = t.partial({
  /**
   * Default: `false`
   * 
   * When this field is `true` it will override `safeMatching`
   * and all replacements will be routed through `.autobumper.js`.
   */
  scripted: t.boolean,
  
  /** A list of files that should be updated */
	files: t.array(fileOptions)
});

export type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;
export type IFileOptions = t.TypeOf<typeof fileOptions>;

export interface IAutoBumperProperties {
  /** Current version */
  version?: string;
};

export interface IAutoBumperFile {
  /** The line ending type */
  lineEnding: string,

  /** The lines inside the file */
  lines: string[],
}

/** A version bumping plugin for auto */
export default class AutoBumperPlugin implements IPlugin {
  /** The name of the plugin */
  readonly name = 'auto-plugin-auto-bumper';

  /** The options of the plugin */
  private options: IAutoBumperPluginOptions;

  /** Cached properties */
  private properties: IAutoBumperProperties = {};

  /** If this is a snapshot release */
  private snapshotRelease: boolean = false;

  /** Initialize the plugin with it's options */
  constructor(options: IAutoBumperPluginOptions) {
    this.options = options;
  }

  private static async getProperties(): Promise<IAutoBumperProperties> {
    const pom = await getPom();
    
    return {
      version: pom.pomObject?.project.version
    };
  }

  /** Read a file and return the content of that file */
  private static async readFile(path: string): Promise<IAutoBumperFile> {
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
    return {
      /** If the index of ('\r' + 1) == '\n' */
      lineEnding: (idx_r + 1 === idx_n) ? '\r\n':'\r',
      lines: lines
    };
  }

  /**
   * Bump version information inside a file
   */
  private static async bumpFile(auto: Auto, path: string, previousVersion: string, releaseVersion: string, safeMatching: boolean): Promise<boolean> {
    if(!fs.existsSync(path)) {
      auto.logger.log.warn('The file: "' + path + '" does not exist!');
      return false;
    }

    auto.logger.verbose.log('File: "' + path + '", safeMatching=' + safeMatching);

    const previousVersion_escaped = escapeStringRegexp(previousVersion);
    const replaceRegex = (str: string) => {
      return str
        .replace(new RegExp(`"${previousVersion_escaped}"`), `"${releaseVersion}"`)
        .replace(new RegExp(`'${previousVersion_escaped}'`), `'${releaseVersion}'`)
        .replace(new RegExp(`\`${previousVersion_escaped}\``), `\`${releaseVersion}\``);
    };

    const data = await AutoBumperPlugin.readFile(path);
    auto.logger.veryVerbose.log('  lines: "' + (data.lines.length) + '"');
    auto.logger.veryVerbose.log('  lineEnding: "' + (data.lineEnding === '\r' ? '\\r':'\\r\\n') + '"');

    let modified = false;
    let content = [];
    let check_next_line = false;
    for(const line of data.lines) {
      let replacedLine;
      if(safeMatching) {
        if(/\/\/[ \t]*\$auto-bumper-line[ \t]*/.test(line)) {
          /* Check the next line for changes. */
          check_next_line = true;
          replacedLine = line;
        } else if(check_next_line) {
          check_next_line = false;
          replacedLine = replaceRegex(line);
        } else if(/\/\/[ \t]*\$auto-bumper[ \t]*/.test(line)) {
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
        auto.logger.log.info('Successfully modified: "' + path + "'");
      });
    }

    return modified;
  }

  /**
   * Bump verison using a script
   */
  private static async bumpFilesWithScript(auto: Auto, script: any, previousVersion: string, releaseVersion: string): Promise<boolean> {
    let bumpFiles = script.bumpFiles;
    if(!bumpFiles) return false;
    
    let modification = false;

    for(let i in bumpFiles) {
      let bump = bumpFiles[i];
      if(!bump || !bump.task) continue;
      let path = bump.path;

      if(!fs.existsSync(path)) {
        auto.logger.log.warn('The file: "' + path + '" does not exist!');
        continue;
      }
  
      auto.logger.verbose.log('File: "' + path + '", scripted=true');
      const data = fs.readFileSync(path).toString();

      const changed = bump.task(data, ''+previousVersion, ''+releaseVersion)
      let modified = (changed !== data);

      auto.logger.veryVerbose.log('  modified: ' + modified);
      if(modified) {
        auto.logger.veryVerbose.log('  source: ' + changed);

        fs.writeFile(path, changed, (err) => {
          if(err) throw err;
          auto.logger.log.info('Successfully modified: "' + path + "'");
        });

        modification = true;
      }
    }

    return modification;
  }

  /**
   * Load `.autobumper.js`
   */
  private static async loadScriptModule(auto: Auto, files: IFileOptions[]): Promise<any> {
    try {
      /**
       * TODO: Find an official way to do this
       * 
       * Using a relative path with `./../../` could fail if the "node_modules"
       * path is not inside the root of the project.
       */
      return await import(`${process.cwd()}/${scriptedBumperFile}`);
    } catch(error) {
      auto.logger.log.error(`Could not find "${scriptedBumperFile}" in root of project!`);
      throw error;
    }
  }
  
  /** Tap into auto plugin points. */
  apply(auto: Auto) {
    auto.hooks.beforeRun.tapPromise(this.name, async () => {
      this.properties = await AutoBumperPlugin.getProperties();
      const { version = "" } = this.properties;
      if(version?.endsWith(snapshotSuffix)) {
        this.snapshotRelease = true;
      }
    });

    auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
      if(name === this.name && typeof options !== "string") {
        return validatePluginConfiguration(this.name, pluginOptions, options);
      }
    });

    auto.hooks.getPreviousVersion.tapPromise(this.name, async () =>
      auto.prefixRelease(await this.getVersion(auto))
    );

    auto.hooks.version.tapPromise(this.name, async ({ bump, dryRun, quiet }) => {
      const previousVersion = await this.getVersion(auto);
      const releaseVersion = this.snapshotRelease && bump === "patch"
          ? previousVersion
          : inc(previousVersion, bump as ReleaseType);
      
      auto.logger.verbose.log('VERSION AUTO BUMPER: version ======================================================');
      auto.logger.verbose.log('Version-AUTO-BUMPER: previous=' + previousVersion + ', release=' + releaseVersion);

      if(releaseVersion) {
        let files = this.options.files || [];
        let modifications = false;
        let scripted_module = await AutoBumperPlugin.loadScriptModule(auto, files);

        for(let i = 0; i < files.length; i++) {
          let element = files[i];
          let path = element.path;
          if(path) {
            let safeMatching = element.safeMatching == undefined ? true:element.safeMatching;
            let result = await AutoBumperPlugin.bumpFile(auto, path, previousVersion, releaseVersion, safeMatching);
            modifications = modifications || result;
          }
        }

        if(this.options.scripted) {
          let result = await AutoBumperPlugin.bumpFilesWithScript(auto, scripted_module, previousVersion, releaseVersion);
          modifications = modifications || result;
        }

        if(modifications) {
          await execPromise("git", ["commit", "-am", `"Update @auto-bumper ${releaseVersion} [skip ci]"`, "--no-verify"]);
        }
      }
    });
  }

  /** Get the version from the current pom.xml **/
  private async getVersion(auto: Auto): Promise<string> {
    this.properties = await AutoBumperPlugin.getProperties();
    const { version } = this.properties;

    if(version) {
      auto.logger.verbose.info(`Found version in pom.xml: ${version}`);
      return version.replace(snapshotSuffix, "");
    }

    return "0.0.0";
  }
}
