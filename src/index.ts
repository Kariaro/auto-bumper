import { Auto, IPlugin, validatePluginConfiguration } from '@auto-it/core';
// import MavenPlugin from '@auto-it/maven';
import { parse } from "pom-parser";
import { promisify } from "util";
import * as t from "io-ts";

/** Parse the pom.xml file **/
const parsePom = promisify(parse);

/** Get the maven pom.xml for a project **/
export const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });

const fileOptions = t.partial({
	/** The relative path of the file */
	path: t.string,
	
	/** Use regex to replace variables inside the file */
	unsafeReplace: t.boolean,

  /** Use comments to specify the location of the version variable */
  guidedReplace: t.boolean
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
    console.log('TESAIOJDFPOASUDFP8OAISUDFPOASIUJDFPOIASUDFPOIASJDFPOIAJSDPFOIJASDPFOJASDPOIJFJASDPOIFJASDPOIF');
  }

  async getProperties(): Promise<IAutoBumperProperties> {
    const pom = await getPom();
    
    return {
      version: pom.pomObject?.project.version
    };
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

    auto.hooks.version.tapPromise(this.name, async () => {
      const currentVersion = this.properties.version;
      console.log('Version-AUTO-BUMPER:' + currentVersion);
    });
  }
}
