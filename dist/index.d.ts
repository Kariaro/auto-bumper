/// <reference path="../../../typings/node-pom-parser.d.ts" />
import { Auto, IPlugin } from '@auto-it/core';
import * as t from 'io-ts';
/** Get the maven pom.xml for a project **/
export declare const getPom: (filePath?: string) => Promise<import("pom-parser").IPom>;
declare const fileOptions: t.PartialC<{
    /** The path of the file */
    path: t.StringC;
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
    safeMatching: t.BooleanC;
    /**
     * Default: `false`
     *
     * When this field is `true` it will override `safeMatching`
     * and all replacements will be routed through `.autobumper.js`.
     */
    scripted: t.BooleanC;
}>;
declare const pluginOptions: t.PartialC<{
    /** A list of files that should be updated */
    files: t.ArrayC<t.PartialC<{
        /** The path of the file */
        path: t.StringC;
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
        safeMatching: t.BooleanC;
        /**
         * Default: `false`
         *
         * When this field is `true` it will override `safeMatching`
         * and all replacements will be routed through `.autobumper.js`.
         */
        scripted: t.BooleanC;
    }>>;
}>;
export declare type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;
export declare type IFileOptions = t.TypeOf<typeof fileOptions>;
export interface IAutoBumperProperties {
    /** Current version */
    version?: string;
}
export interface IAutoBumperFile {
    /** The line ending type */
    lineEnding: string;
    /** The lines inside the file */
    lines: string[];
}
/** A version bumping plugin for auto */
export default class AutoBumperPlugin implements IPlugin {
    /** The name of the plugin */
    readonly name = "auto-plugin-auto-bumper";
    /** The options of the plugin */
    private options;
    /** Cached properties */
    private properties;
    /** If this is a snapshot release */
    private snapshotRelease;
    /** Initialize the plugin with it's options */
    constructor(options: IAutoBumperPluginOptions);
    private static getProperties;
    /** Read a file and return the content of that file */
    private static readFile;
    /**
     * Bump version information inside a file
     */
    private static bumpFile;
    /**
     * Bump verison using a script
     */
    private static bumpFileWithScript;
    /**
     * Load `.autobumper.js`
     */
    private static loadScriptModule;
    /** Tap into auto plugin points. */
    apply(auto: Auto): void;
    /** Get the version from the current pom.xml **/
    private getVersion;
}
export {};
//# sourceMappingURL=index.d.ts.map