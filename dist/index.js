"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const core_1 = require("@auto-it/core");
const t = tslib_1.__importStar(require("io-ts"));
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
/** A version bumping plugin for auto */
class AutoBumperPlugin {
    /** Initialize the plugin with it's options */
    constructor(options) {
        /** The name of the plugin */
        this.name = 'auto-bumper';
        this.options = options;
    }
    /** Tap into auto plugin points. */
    apply(auto) {
        auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
            // If it's a string thats valid config
            if (name === this.name && typeof options !== "string") {
                return core_1.validatePluginConfiguration(this.name, pluginOptions, options);
            }
        });
    }
}
exports.default = AutoBumperPlugin;
//# sourceMappingURL=index.js.map