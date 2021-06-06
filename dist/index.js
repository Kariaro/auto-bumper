"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPom = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@auto-it/core");
const pom_parser_1 = require("pom-parser");
const semver_1 = require("semver");
const util_1 = require("util");
const t = tslib_1.__importStar(require("io-ts"));
const os_1 = require("os");
const fs_1 = tslib_1.__importDefault(require("fs"));
// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
const escapeStringRegexp = (str) => {
    // $& means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
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
    async readFile(path) {
        const data = fs_1.default.readFileSync(path);
        const lines = data.toString().split(/\r?\n/);
        let idx_r = data.indexOf('\r');
        if (idx_r < 0) {
            return {
                lineEnding: os_1.EOL,
                lines: lines
            };
        }
        let idx_n = data.indexOf('\n');
        /** If the index of ('\r' + 1) == '\n' */
        if (idx_r + 1 === idx_n) {
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
    async bumpFile(auto, path, old_version, next_version, safeMatching) {
        auto.logger.verbose.log('File: "' + path + '", safeMatching=' + safeMatching);
        const old_version_escaped = escapeStringRegexp(old_version);
        const replaceRegex = (str) => {
            return str
                .replace(new RegExp(`"${old_version_escaped}"`), `"${next_version}"`)
                .replace(new RegExp(`'${old_version_escaped}'`), `'${next_version}'`)
                .replace(new RegExp(`\`${old_version_escaped}\``), `\`${next_version}\``);
        };
        const data = await this.readFile(path);
        auto.logger.veryVerbose.log('  lines: "' + (data.lines.length) + '"');
        auto.logger.veryVerbose.log('  lineEnding: "' + (data.lineEnding === '\r' ? '\\r' : '\\r\\n') + '"');
        let modified = false;
        let content = [];
        for (const line of data.lines) {
            let replacedLine;
            if (safeMatching) {
                // Use a comment to make sure we have the correct literal
                // $auto-bumper
                if (/\/\/[ \t]*\$auto-bumper[ \t]*/.test(line)) {
                    replacedLine = replaceRegex(line);
                }
                else {
                    replacedLine = line;
                }
            }
            else {
                /** Escape all quote types */
                replacedLine = replaceRegex(line);
            }
            if (replacedLine !== line) {
                modified = true;
            }
            content.push(replacedLine);
        }
        auto.logger.veryVerbose.log('  modified: ' + modified);
        if (modified) {
            const joined_string = content.join(data.lineEnding);
            auto.logger.veryVerbose.log('  source: ' + joined_string);
            fs_1.default.writeFile(path, joined_string, (err) => {
                if (err)
                    throw err;
                auto.logger.log.log('Successfully modified: "' + path + "'");
            });
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
                        await this.bumpFile(auto, path, currentVersion, releaseVersion, safeMatching);
                    }
                }
            }
        });
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