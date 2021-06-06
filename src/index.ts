import { Auto, IPlugin, validatePluginConfiguration } from '@auto-it/core';
import * as t from "io-ts";

const fileOptions = t.partial({
	/** The relative path of the file */
	path: t.string,
	
	/** Use regex to replace variables inside the file */
	unsafeReplace: t.boolean
});

const pluginOptions = t.partial({
  /** File that should be updated */
	files: t.array(fileOptions)
});

export type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;

/** A version bumping plugin for auto */
export default class AutoBumperPlugin implements IPlugin {
  /** The name of the plugin */
  name = 'auto-bumper';

  /** The options of the plugin */
  readonly options: IAutoBumperPluginOptions;

  /** Initialize the plugin with it's options */
  constructor(options: IAutoBumperPluginOptions) {
    this.options = options;
  }

  /** Tap into auto plugin points. */
  apply(auto: Auto) {
    auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
      // If it's a string thats valid config
      if (name === this.name && typeof options !== "string") {
        return validatePluginConfiguration(this.name, pluginOptions, options);
      }
    });
  }
}
