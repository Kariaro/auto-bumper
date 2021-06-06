import { Auto, IPlugin } from '@auto-it/core';
import * as t from "io-ts";
declare const pluginOptions: t.PartialC<{
    /** File that should be updated */
    files: t.ArrayC<t.PartialC<{
        /** The relative path of the file */
        path: t.StringC;
        /** Use regex to replace variables inside the file */
        unsafeReplace: t.BooleanC;
    }>>;
}>;
export declare type IAutoBumperPluginOptions = t.TypeOf<typeof pluginOptions>;
/** A version bumping plugin for auto */
export default class AutoBumperPlugin implements IPlugin {
    /** The name of the plugin */
    name: string;
    /** The options of the plugin */
    readonly options: IAutoBumperPluginOptions;
    /** Initialize the plugin with it's options */
    constructor(options: IAutoBumperPluginOptions);
    /** Tap into auto plugin points. */
    apply(auto: Auto): void;
}
export {};
//# sourceMappingURL=index.d.ts.map