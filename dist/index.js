"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPom = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@auto-it/core");
// import MavenPlugin from '@auto-it/maven';
const pom_parser_1 = require("pom-parser");
const util_1 = require("util");
const t = tslib_1.__importStar(require("io-ts"));
/** Parse the pom.xml file **/
const parsePom = util_1.promisify(pom_parser_1.parse);
/** Get the maven pom.xml for a project **/
const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });
exports.getPom = getPom;
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
;
/** A version bumping plugin for auto */
class AutoBumperPlugin {
    /** Initialize the plugin with it's options */
    constructor(options) {
        /** The name of the plugin */
        this.name = 'auto-bumper';
        /** Cached properties */
        this.properties = {};
        this.options = options;
        console.log('TESAIOJDFPOASUDFP8OAISUDFPOASIUJDFPOIASUDFPOIASJDFPOIAJSDPFOIJASDPFOJASDPOIJFJASDPOIFJASDPOIF');
    }
    async getProperties() {
        const pom = await exports.getPom();
        return {
            version: pom.pomObject?.project.version
        };
    }
    /** Tap into auto plugin points. */
    apply(auto) {
        auto.hooks.beforeRun.tapPromise(this.name, async () => {
            this.properties = await this.getProperties();
        });
        auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
            // If it's a string thats valid config
            if (name === this.name && typeof options !== "string") {
                return core_1.validatePluginConfiguration(this.name, pluginOptions, options);
            }
        });
        auto.hooks.version.tapPromise(this.name, async () => {
            const currentVersion = this.properties.version;
            console.log('Version-AUTO-BUMPER:' + currentVersion);
        });
    }
}
exports.default = AutoBumperPlugin;
//# sourceMappingURL=index.js.map