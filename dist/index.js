"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPom = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@auto-it/core");
// import MavenPlugin from '@auto-it/maven';
const pom_parser_1 = require("pom-parser");
const semver_1 = require("semver");
const util_1 = require("util");
const t = tslib_1.__importStar(require("io-ts"));
const escape_string_regexp_1 = tslib_1.__importDefault(require("escape-string-regexp"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const readline_1 = tslib_1.__importDefault(require("readline"));
/** Maven snapshot suffix */
const snapshotSuffix = "-SNAPSHOT";
/** Parse the pom.xml file **/
const parsePom = util_1.promisify(pom_parser_1.parse);
/** Get the maven pom.xml for a project **/
const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });
exports.getPom = getPom;
const fileOptions = t.partial({
    /** The relative path of the file */
    path: t.string,
    /**
     * Default: `true`
     * Use comments to specify the location of the version variable.
     *
     * If `false` the auto bumper will update all literals in the file
     * containing the current version.
     */
    safeMatching: t.boolean
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
    }
    async getProperties() {
        const pom = await exports.getPom();
        return {
            version: pom.pomObject?.project.version
        };
    }
    /**
     * Bump literals with version information inside the specified file
     */
    async bumpFile(path, old_version, next_version, safeMatching) {
        console.log('File: "' + path + '", safeMatching=' + safeMatching);
        const fileStream = fs_1.default.createReadStream(path);
        const rl = readline_1.default.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });
        const old_version_escaped = escape_string_regexp_1.default(old_version);
        const next_version_escaped = escape_string_regexp_1.default(next_version);
        const replaceRegex = (str) => {
            return str
                .replace(`"${old_version_escaped}"`, `"${next_version_escaped}"`)
                .replace(`'${old_version_escaped}'`, `'${next_version_escaped}'`)
                .replace(`\`${old_version_escaped}\``, `\`${next_version_escaped}\``);
        };
        let modified = false;
        let content = [];
        for await (const line of rl) {
            let replacedLine;
            if (safeMatching) {
                // Use a comment to make sure we have the correct literal
                // $auto-bump
                // TODO:
                replacedLine = line;
            }
            else {
                /** Escape all quote types */
                replacedLine = replaceRegex(line);
            }
            if (replacedLine !== line) {
                console.log(`Replaced line in file: ${replacedLine}`);
                modified = true;
            }
            content.push(replacedLine);
        }
        if (modified) {
            console.log('Modifying file: "' + path + '"');
        }
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
        auto.hooks.version.tapPromise(this.name, async ({ bump }) => {
            const currentVersion = this.properties.version;
            if (!currentVersion) {
                auto.logger.log.info('Error reading current version');
                return;
            }
            const releaseVersion = semver_1.inc(currentVersion, bump);
            auto.logger.log.log('Version-AUTO-BUMPER: current=' + currentVersion + ', release=' + releaseVersion);
            if (releaseVersion) {
                /** Update files specified in the files argument and bump version */
                let files = this.options.files || [];
                for (let i = 0; i < files.length; i++) {
                    let element = files[i];
                    let path = element.path;
                    let safeMatching = element.safeMatching == undefined ? true : element.safeMatching;
                    if (path) {
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
    async getVersion(auto) {
        this.properties = await this.getProperties();
        const { version } = this.properties;
        if (version) {
            auto.logger.verbose.info(`Found version in pom.xml: ${version}`);
            return version.replace(snapshotSuffix, "");
        }
        return "0.0.0";
    }
}
exports.default = AutoBumperPlugin;
//# sourceMappingURL=index.js.map