"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPom = void 0;
const tslib_1 = require("tslib");
const core_1 = require("@auto-it/core"); // , IExtendedCommit
const pom_parser_1 = require("pom-parser");
const semver_1 = require("semver");
const util_1 = require("util");
const t = tslib_1.__importStar(require("io-ts"));
const os_1 = require("os");
const fs_1 = tslib_1.__importDefault(require("fs"));
/** Regex esxape a string */
const escapeStringRegexp = (str) => {
    // $& means the whole matched string
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};
/** Maven snapshot suffix */
const snapshotSuffix = "-SNAPSHOT";
/** Scripted bumper file */
const scriptedBumperFile = "./.autobumper.js";
/** Parse the pom.xml file **/
const parsePom = util_1.promisify(pom_parser_1.parse);
/** Get the maven pom.xml for a project **/
const getPom = async (filePath = "pom.xml") => parsePom({ filePath: filePath });
exports.getPom = getPom;
const fileOptions = t.partial({
    /** The relative path of the file */
    path: t.string,
    /**
     * If this field is `true` then you need to add comments
     * to the lines that should be changed.
     *
     * To replace the same line use: `// $auto-bumper`.
     * To replace the next line use: `// $auto-bumper-line`.
     *
     * If `false`, all strings matching the version will
     * be replaced.
     */
    safeMatching: t.boolean,
    /**
     * Default: `false`
     *
     * When this field is `true` it will override `safeMatching`
     * and all replacements will be routed through `.autobumper.js`.
     */
    scripted: t.boolean
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
        this.name = 'auto-plugin-auto-bumper';
        /** Cached properties */
        this.properties = {};
        /** If this is a snapshot release */
        this.snapshotRelease = false;
        this.options = options;
    }
    static async getProperties() {
        var _a;
        const pom = await exports.getPom();
        return {
            version: (_a = pom.pomObject) === null || _a === void 0 ? void 0 : _a.project.version
        };
    }
    /** Read a file and return the content of that file */
    static async readFile(path) {
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
        return {
            /** If the index of ('\r' + 1) == '\n' */
            lineEnding: (idx_r + 1 === idx_n) ? '\r\n' : '\r',
            lines: lines
        };
    }
    /**
     * Bump version information inside a file
     */
    static async bumpFile(auto, path, previousVersion, releaseVersion, safeMatching) {
        if (!fs_1.default.existsSync(path)) {
            auto.logger.log.warn('The file: "' + path + '" does not exist!');
            return false;
        }
        auto.logger.verbose.log('File: "' + path + '", safeMatching=' + safeMatching);
        const previousVersion_escaped = escapeStringRegexp(previousVersion);
        const replaceRegex = (str) => {
            return str
                .replace(new RegExp(`"${previousVersion_escaped}"`), `"${releaseVersion}"`)
                .replace(new RegExp(`'${previousVersion_escaped}'`), `'${releaseVersion}'`)
                .replace(new RegExp(`\`${previousVersion_escaped}\``), `\`${releaseVersion}\``);
        };
        const data = await AutoBumperPlugin.readFile(path);
        auto.logger.veryVerbose.log('  lines: "' + (data.lines.length) + '"');
        auto.logger.veryVerbose.log('  lineEnding: "' + (data.lineEnding === '\r' ? '\\r' : '\\r\\n') + '"');
        let modified = false;
        let content = [];
        let check_next_line = false;
        for (const line of data.lines) {
            let replacedLine;
            if (safeMatching) {
                if (/\/\/[ \t]*\$auto-bumper-line[ \t]*/.test(line)) {
                    /* Check the next line for changes. */
                    check_next_line = true;
                    replacedLine = line;
                }
                else if (check_next_line) {
                    check_next_line = false;
                    replacedLine = replaceRegex(line);
                }
                else if (/\/\/[ \t]*\$auto-bumper[ \t]*/.test(line)) {
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
        return modified;
    }
    /**
     * Bump verison using a script
     */
    static async bumpFileWithScript(auto, path, previousVersion, releaseVersion) {
        return false;
    }
    /** Tap into auto plugin points. */
    apply(auto) {
        auto.hooks.beforeRun.tapPromise(this.name, async () => {
            this.properties = await AutoBumperPlugin.getProperties();
            const { version = "" } = this.properties;
            if (version === null || version === void 0 ? void 0 : version.endsWith(snapshotSuffix)) {
                this.snapshotRelease = true;
            }
        });
        auto.hooks.validateConfig.tapPromise(this.name, async (name, options) => {
            if (name === this.name && typeof options !== "string") {
                return core_1.validatePluginConfiguration(this.name, pluginOptions, options);
            }
        });
        auto.hooks.getPreviousVersion.tapPromise(this.name, async () => auto.prefixRelease(await this.getVersion(auto)));
        auto.hooks.version.tapPromise(this.name, async ({ bump, dryRun, quiet }) => {
            const previousVersion = await this.getVersion(auto);
            const releaseVersion = this.snapshotRelease && bump === "patch"
                ? previousVersion
                : semver_1.inc(previousVersion, bump);
            auto.logger.verbose.log('VERSION AUTO BUMPER: version ======================================================');
            auto.logger.verbose.log('Version-AUTO-BUMPER: previous=' + previousVersion + ', release=' + releaseVersion);
            if (releaseVersion) {
                let files = this.options.files || [];
                let modifications = false;
                let scripted_module;
                try {
                    scripted_module = await Promise.resolve().then(() => tslib_1.__importStar(require(scriptedBumperFile)));
                }
                catch (error) {
                    throw error;
                }
                console.log(scripted_module);
                for (let i = 0; i < files.length; i++) {
                    let element = files[i];
                    let path = element.path;
                    if (path) {
                        if (element.scripted) {
                            let result = await AutoBumperPlugin.bumpFileWithScript(auto, path, previousVersion, releaseVersion);
                            modifications = modifications || result;
                        }
                        else {
                            let safeMatching = element.safeMatching == undefined ? true : element.safeMatching;
                            let result = await AutoBumperPlugin.bumpFile(auto, path, previousVersion, releaseVersion, safeMatching);
                            modifications = modifications || result;
                        }
                    }
                }
                if (modifications) {
                    await core_1.execPromise("git", ["commit", "-am", `"Update @auto-bumper ${releaseVersion} [skip ci]"`, "--no-verify"]);
                }
            }
        });
    }
    /** Get the version from the current pom.xml **/
    async getVersion(auto) {
        this.properties = await AutoBumperPlugin.getProperties();
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