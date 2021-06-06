/// <reference path="../../../typings/node-pom-parser.d.ts" />
import { Auto, IPlugin } from '@auto-it/core';
import * as t from 'io-ts';
/** Get the maven pom.xml for a project **/
export declare const getPom: (filePath?: string) => Promise<import("pom-parser").IPom>;
declare const pluginOptions: t.PartialC<{
    /** File that should be updated */
    files: t.ArrayC<t.PartialC<{
        /** The relative path of the file */
        path: t.StringC;
        /**
         * Default: `true`
         * If `true` will only replace literals on the same line as a comment
         * `// $auto-bumper`
         *
         * If `false` will update all literals in the file containing the current
         * version.
         */
        safeMatching: t.BooleanC;
    }>>;
}>;
export declare type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;
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
    name: string;
    /** The options of the plugin */
    options: IAutoBumperPluginOptions;
    /** Cached properties */
    properties: IAutoBumperProperties;
    /** Initialize the plugin with it's options */
    constructor(options: IAutoBumperPluginOptions);
    private static getProperties;
    private static readFile;
    /**
     * Bump literals with version information inside the specified file
     */
    private static bumpFile;
    private snapshotRelease;
    /** Tap into auto plugin points. */
    apply(auto: Auto): void;
    /** Get the version from the current pom.xml **/
    private getVersion;
}
export {};
//# sourceMappingURL=index.d.ts.map