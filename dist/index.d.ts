/// <reference path="../../../typings/node-pom-parser.d.ts" />
import { Auto, IPlugin } from '@auto-it/core';
import * as t from "io-ts";
/** Get the maven pom.xml for a project **/
export declare const getPom: (filePath?: string) => Promise<import("pom-parser").IPom>;
declare const pluginOptions: t.PartialC<{
    /** File that should be updated */
    files: t.ArrayC<t.PartialC<{
        /** The relative path of the file */
        path: t.StringC;
        /** Use regex to replace variables inside the file */
        unsafeReplace: t.BooleanC;
        /** Use comments to specify the location of the version variable */
        guidedReplace: t.BooleanC;
    }>>;
}>;
export declare type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;
export interface IAutoBumperProperties {
    /** Current version */
    version?: string;
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
    getProperties(): Promise<IAutoBumperProperties>;
    /** Tap into auto plugin points. */
    apply(auto: Auto): void;
}
export {};
//# sourceMappingURL=index.d.ts.map